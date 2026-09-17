/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Order attribution — who earns the commission on an order
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * An order is picked up somewhere and delivered somewhere else. When those two
 * places fall in different franchise territories, the commission has to be
 * divided, and how it divides is a commercial agreement rather than a technical
 * fact. This service applies whatever agreement is currently in force and
 * writes down what it did.
 *
 * ── Three rules the code here exists to enforce ────────────────────────────
 *
 * **The split comes from policy data, never from a constant.** A ratio baked
 * into this file means every renegotiation is a deploy, and — worse — it means
 * the ratio in force when an old order was placed becomes unrecoverable the
 * moment the constant changes. Policies carry effective_from, so history stays
 * reconstructible.
 *
 * **The ledger is written once and not re-derived.** Recomputing an old order's
 * split against today's policy would silently restate last quarter's earnings
 * every time the agreement changed. `attributeOrder` records the policy it
 * used; reads go to the ledger.
 *
 * **An unsigned policy cannot be paid against.** The policy seeded by migration
 * 103 is a placeholder — 100% to pickup — chosen because it is the most
 * conservative default available, not because anyone agreed it. It carries
 * requires_signoff, and `assertPayable` refuses it. A payout run that ignores
 * that flag is paying real money against a number the business never chose.
 *
 * ── Hierarchy ──────────────────────────────────────────────────────────────
 *
 * Territories can be held at two tiers: a MASTER city franchise and a SUB
 * neighbourhood franchise beneath it. When an order crosses between two subs of
 * the same master, the master may take a cut off the top — that is the
 * master_override_percent, and it is zero unless a policy says otherwise.
 */

const crypto = require('crypto');
const { query, queryOne } = require('../config/database');
const territoryService = require('./territoryResolution.service');
const logger = require('../config/logger');

/** Currency is stored to the paisa; splits must not invent fractions below it. */
function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/**
 * The policy in force for a territory at a moment in time.
 *
 * A row naming the territory wins over the platform default, which is how one
 * renegotiated city is handled without touching everyone else. Among equals the
 * most recently effective row wins, so inserting a new policy supersedes the
 * old one without anyone having to expire it by hand.
 */
async function policyFor(territoryId = null, at = null) {
  const when = at ? new Date(at).toISOString() : new Date().toISOString();

  const specific = territoryId
    ? await queryOne(
      `SELECT * FROM attribution_policies
        WHERE territory_id = $1
          AND effective_from <= $2
          AND (effective_to IS NULL OR effective_to > $2)
        ORDER BY effective_from DESC
        LIMIT 1`,
      [territoryId, when]
    )
    : null;

  if (specific) return specific;

  return queryOne(
    `SELECT * FROM attribution_policies
      WHERE territory_id IS NULL
        AND effective_from <= $1
        AND (effective_to IS NULL OR effective_to > $1)
      ORDER BY effective_from DESC
      LIMIT 1`,
    [when]
  );
}

/**
 * Throws unless the policy has been signed off.
 *
 * Called by anything that moves money. Reporting and previewing may read an
 * unsigned policy — seeing what the placeholder would do is useful — but paying
 * against it is not allowed.
 */
function assertPayable(policy) {
  if (!policy) {
    const err = new Error('No attribution policy is in force; commission cannot be computed.');
    err.status = 409;
    throw err;
  }

  // SQLite stores the flag as 0/1 and Postgres as a boolean, so both shapes
  // have to read as true here. Treating the string '0' as truthy would defeat
  // the entire guard, which is the kind of thing that only surfaces in
  // production on the first real payout run.
  const requires = policy.requires_signoff === true
    || policy.requires_signoff === 1
    || policy.requires_signoff === '1'
    || policy.requires_signoff === 't';

  if (requires && !policy.signed_off_at) {
    const err = new Error(
      'The attribution policy in force is an unsigned placeholder. '
      + 'Supply the agreed commercial split and sign it off before running a payout.'
    );
    err.status = 409;
    err.code = 'POLICY_REQUIRES_SIGNOFF';
    throw err;
  }
}

/**
 * The active assignments covering a territory, one per tier.
 *
 * Returns `{ master, sub }`, either of which may be null — an area may have a
 * city franchise and no neighbourhood one, or the reverse during a handover.
 */
async function holdersFor(territoryId) {
  if (!territoryId) return { master: null, sub: null };

  const rows = await query(
    `SELECT ft.*, fp.user_id, fp.status AS partner_status
       FROM franchise_territories ft
       JOIN franchise_partners fp ON fp.id = ft.franchise_partner_id
      WHERE ft.territory_id = $1 AND ft.status = 'ACTIVE'`,
    [territoryId]
  );

  const list = rows.rows || rows;
  return {
    master: list.find((r) => r.tier === 'MASTER') || null,
    sub: list.find((r) => r.tier === 'SUB') || null,
  };
}

/**
 * The partner who should be credited for one side of an order.
 *
 * The sub-franchise is closest to the ground and is credited first; the master
 * earns where no sub has been appointed. That ordering is the whole point of
 * the hierarchy — appointing a neighbourhood franchise moves the commission to
 * them rather than adding a second claim on it.
 */
function earnerOf(holders) {
  return holders.sub || holders.master || null;
}

/**
 * Computes the split for an order without writing anything.
 *
 * Exposed separately so an operator can see what a policy would do — and so the
 * tests can assert the arithmetic — without touching the ledger.
 */
async function computeSplit({ pickup, delivery, commissionBase, at = null }) {
  const base = Number(commissionBase);
  if (!Number.isFinite(base) || base < 0) {
    const err = new Error('commissionBase must be a non-negative number.');
    err.status = 400;
    throw err;
  }

  const pickupTerritoryId = pickup ? pickup.territory_id : null;
  const deliveryTerritoryId = delivery ? delivery.territory_id : null;

  const policy = await policyFor(pickupTerritoryId, at);
  if (!policy) {
    return { policy: null, lines: [], reason: 'no_policy_in_force' };
  }

  const pickupHolders = await holdersFor(pickupTerritoryId);
  const deliveryHolders = await holdersFor(deliveryTerritoryId);

  const pickupEarner = earnerOf(pickupHolders);
  const deliveryEarner = earnerOf(deliveryHolders);

  // Same territory, or the same partner on both sides: there is nothing to
  // split, and producing two half-rows for one partner would make every
  // downstream sum look like a cross-boundary order that it is not.
  const sameEarner = pickupEarner && deliveryEarner
    && pickupEarner.franchise_partner_id === deliveryEarner.franchise_partner_id;

  if (!deliveryEarner || sameEarner || pickupTerritoryId === deliveryTerritoryId) {
    if (!pickupEarner) return { policy, lines: [], reason: 'no_franchise_for_pickup' };

    return {
      policy,
      reason: 'single_territory',
      lines: [{
        role: 'PICKUP',
        territory_id: pickupTerritoryId,
        franchise_partner_id: pickupEarner.franchise_partner_id,
        share_percent: 100,
        commission_amount: round2(base),
      }],
    };
  }

  // Cross-boundary from here on — but only if there is someone to credit at
  // the pickup end. Without this guard the split below dereferences a null
  // earner; recording nothing is the right answer, because the alternative is
  // crediting an arbitrary partner for an area nobody holds.
  if (!pickupEarner) {
    return { policy, lines: [], reason: 'no_franchise_for_pickup' };
  }

  const pickupShare = Number(policy.pickup_share_percent);
  const deliveryShare = Number(policy.delivery_share_percent);
  let masterShare = Number(policy.master_override_percent) || 0;

  // The master override only applies where a common master actually exists. If
  // the two sides sit under different masters — or under none — that share has
  // no recipient, and silently keeping it would lose money out of the split.
  const commonMaster =
    pickupHolders.master && deliveryHolders.master
    && pickupHolders.master.franchise_partner_id === deliveryHolders.master.franchise_partner_id
      ? pickupHolders.master
      : null;

  const lines = [];

  if (masterShare > 0 && !commonMaster) {
    // Redistribute proportionally rather than dropping it, so the split still
    // accounts for the whole commission.
    const remainder = pickupShare + deliveryShare;
    const scale = remainder > 0 ? (remainder + masterShare) / remainder : 0;
    masterShare = 0;

    lines.push({
      role: 'PICKUP',
      territory_id: pickupTerritoryId,
      franchise_partner_id: pickupEarner.franchise_partner_id,
      share_percent: round2(pickupShare * scale),
      commission_amount: round2((base * pickupShare * scale) / 100),
    });
    lines.push({
      role: 'DELIVERY',
      territory_id: deliveryTerritoryId,
      franchise_partner_id: deliveryEarner.franchise_partner_id,
      share_percent: round2(deliveryShare * scale),
      commission_amount: round2((base * deliveryShare * scale) / 100),
    });
  } else {
    if (pickupShare > 0) {
      lines.push({
        role: 'PICKUP',
        territory_id: pickupTerritoryId,
        franchise_partner_id: pickupEarner.franchise_partner_id,
        share_percent: pickupShare,
        commission_amount: round2((base * pickupShare) / 100),
      });
    }
    if (deliveryShare > 0) {
      lines.push({
        role: 'DELIVERY',
        territory_id: deliveryTerritoryId,
        franchise_partner_id: deliveryEarner.franchise_partner_id,
        share_percent: deliveryShare,
        commission_amount: round2((base * deliveryShare) / 100),
      });
    }
    if (masterShare > 0 && commonMaster) {
      lines.push({
        role: 'MASTER_OVERRIDE',
        territory_id: pickupTerritoryId,
        franchise_partner_id: commonMaster.franchise_partner_id,
        share_percent: masterShare,
        commission_amount: round2((base * masterShare) / 100),
      });
    }
  }

  // Rounding each line independently can leave the sum a paisa off the base.
  // The difference goes to the largest line, which is the convention that keeps
  // the ledger summing exactly to what was charged.
  const total = lines.reduce((acc, l) => acc + l.commission_amount, 0);
  const drift = round2(base - total);
  if (drift !== 0 && lines.length > 0) {
    const largest = lines.reduce((a, b) => (b.commission_amount > a.commission_amount ? b : a));
    largest.commission_amount = round2(largest.commission_amount + drift);
  }

  return { policy, lines, reason: 'cross_territory' };
}

/**
 * Computes and records an order's attribution.
 *
 * `pickup` and `delivery` are resolutions — whatever `territoryService.resolve`
 * returned for each end of the order. Resolving happens here rather than being
 * passed in as ids, so the caller cannot name the franchise that gets paid.
 */
async function attributeOrder({ orderId, pickupPoint, deliveryPoint, commissionBase, at = null }) {
  if (!orderId) {
    const err = new Error('orderId is required.');
    err.status = 400;
    throw err;
  }

  const pickup = pickupPoint ? await territoryService.attributionFor(pickupPoint) : null;
  const delivery = deliveryPoint ? await territoryService.attributionFor(deliveryPoint) : null;

  const split = await computeSplit({ pickup, delivery, commissionBase, at });

  if (split.lines.length === 0) {
    logger.warn(`Order ${orderId} produced no attribution: ${split.reason}`);
    return { recorded: false, reason: split.reason, lines: [] };
  }

  for (const line of split.lines) {
    // Upsert on (order_id, role): recomputing must correct the ledger rather
    // than append a second, contradictory split alongside the first.
    await query('DELETE FROM order_territory_attribution WHERE order_id = $1 AND role = $2',
      [orderId, line.role]);

    await query(
      `INSERT INTO order_territory_attribution
         (id, order_id, role, territory_id, franchise_partner_id,
          share_percent, commission_amount, policy_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(), orderId, line.role, line.territory_id,
        line.franchise_partner_id, line.share_percent, line.commission_amount,
        split.policy ? split.policy.id : null,
      ]
    );
  }

  return { recorded: true, reason: split.reason, lines: split.lines, policyId: split.policy.id };
}

/** The recorded split for an order, as it was computed at the time. */
async function attributionFor(orderId) {
  const rows = await query(
    'SELECT * FROM order_territory_attribution WHERE order_id = $1 ORDER BY role',
    [orderId]
  );
  return rows.rows || rows;
}

/**
 * What a partner earned over a period, from the ledger.
 *
 * Reads recorded rows rather than recomputing, so a policy change does not
 * restate history.
 */
async function earningsForPartner(franchisePartnerId, { from = null, to = null } = {}) {
  const params = [franchisePartnerId];
  let clause = 'franchise_partner_id = $1';

  if (from) {
    params.push(new Date(from).toISOString());
    clause += ` AND computed_at >= $${params.length}`;
  }
  if (to) {
    params.push(new Date(to).toISOString());
    clause += ` AND computed_at < $${params.length}`;
  }

  const row = await queryOne(
    `SELECT COALESCE(SUM(commission_amount), 0) AS total, COUNT(*) AS lines
       FROM order_territory_attribution WHERE ${clause}`,
    params
  );

  return { total: Number(row?.total || 0), lines: Number(row?.lines || 0) };
}

module.exports = {
  policyFor,
  assertPayable,
  holdersFor,
  earnerOf,
  computeSplit,
  attributeOrder,
  attributionFor,
  earningsForPartner,
  round2,
};
