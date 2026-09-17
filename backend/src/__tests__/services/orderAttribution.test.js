/**
 * Sub-franchise hierarchy and the revenue split.
 *
 * This is the money path, so the tests are written around the ways it can be
 * wrong while still looking right:
 *
 *  - **Tiered exclusivity.** A master and a sub may share a territory — that
 *    containment is the whole point — but two masters may not, and two subs may
 *    not. The old flat index forbade all three; a naive fix permits all three,
 *    and permitting two masters is double commission on every order.
 *
 *  - **The split sums to the base.** Rounding each line independently leaves the
 *    ledger a paisa short of what was charged, every time, forever.
 *
 *  - **An unsigned policy cannot pay.** The seeded policy is a placeholder
 *    nobody agreed to. Paying against it would move real money on a number the
 *    business never chose.
 */

process.env.USE_SQLITE = 'true';

const crypto = require('crypto');
const { query, queryOne } = require('../../config/database');
const svc = require('../../services/territoryResolution.service');
const attribution = require('../../services/orderAttribution.service');

const T_A = 'oa-territory-a';
const T_B = 'oa-territory-b';
const MASTER = 'oa-partner-master';
const SUB_A = 'oa-partner-sub-a';
const SUB_B = 'oa-partner-sub-b';

let talukaId;
let masterAssignmentA;
let masterAssignmentB;

async function cleanup() {
  await query("DELETE FROM order_territory_attribution WHERE order_id LIKE 'oa-order-%'");
  await query("DELETE FROM attribution_policies WHERE id LIKE 'oa-policy-%'");
  await query("DELETE FROM orders WHERE id LIKE 'oa-order-%'");
  await query("DELETE FROM territory_assignment_log WHERE territory_id LIKE 'oa-territory-%'");
  await query("DELETE FROM franchise_territories WHERE territory_id LIKE 'oa-territory-%'");
  await query("DELETE FROM franchise_partners WHERE id LIKE 'oa-partner-%'");
  await query("DELETE FROM territories WHERE id LIKE 'oa-territory-%'");
  await query("DELETE FROM users WHERE id LIKE 'oa-user-%'");
  await query("DELETE FROM location_talukas WHERE id LIKE 'oa-%'");
  await query("DELETE FROM location_districts WHERE id LIKE 'oa-%'");
  await query("DELETE FROM location_states WHERE id LIKE 'oa-%'");
}

/** Replaces the platform default policy for the duration of one test. */
async function setPolicy({ pickup, delivery, master = 0, signedOff = true, territoryId = null }) {
  const id = `oa-policy-${crypto.randomUUID()}`;
  await query(
    `INSERT INTO attribution_policies
       (id, territory_id, pickup_share_percent, delivery_share_percent, master_override_percent,
        requires_signoff, signed_off_at, effective_from)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id, territoryId, pickup, delivery, master,
      signedOff ? 0 : 1,
      signedOff ? new Date().toISOString() : null,
      // Now, not the future. policyFor only considers rows whose effective_from
      // has already passed, so a policy dated ahead is never in force — and the
      // seeded placeholder answers instead, which is exactly the failure this
      // helper is meant to avoid. "Now" still beats the migration's timestamp
      // on the most-recently-effective ordering.
      new Date().toISOString(),
    ]
  );
  return id;
}

beforeAll(async () => {
  await cleanup();
  svc.invalidate();

  const existing = await queryOne('SELECT id FROM location_talukas LIMIT 1');
  if (existing) {
    talukaId = existing.id;
  } else {
    talukaId = 'oa-taluka';
    await query('INSERT INTO location_states (id, name, code) VALUES ($1, $2, $3)',
      ['oa-state', 'OA State', 'OAS']);
    await query('INSERT INTO location_districts (id, state_id, name) VALUES ($1, $2, $3)',
      ['oa-district', 'oa-state', 'OA District']);
    await query('INSERT INTO location_talukas (id, district_id, name) VALUES ($1, $2, $3)',
      [talukaId, 'oa-district', 'OA Taluka']);
  }

  for (const [tid, pin] of [[T_A, '414001'], [T_B, '414002']]) {
    await query(
      `INSERT INTO territories (id, taluka_id, name, pincode, centroid_lat, centroid_lng, is_active)
       VALUES ($1, $2, $3, $4, 18.53, 73.87, 1)`,
      [tid, talukaId, `OA ${pin}`, pin]
    );
  }

  const partners = [
    [MASTER, 'oa-user-master', 'OA Master', '9822000001'],
    [SUB_A, 'oa-user-sub-a', 'OA Sub A', '9822000002'],
    [SUB_B, 'oa-user-sub-b', 'OA Sub B', '9822000003'],
  ];
  for (const [pid, uid, name, phone] of partners) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)',
      [uid, name, phone, 'franchise_owner']);
    await query(
      `INSERT INTO franchise_partners (id, user_id, territory_name, territory_pincode, status, commission_rate)
       VALUES ($1, $2, $3, '414001', 'active', 10)`,
      [pid, uid, name]
    );
  }
});

afterAll(async () => {
  await cleanup();
});

beforeEach(async () => {
  await query("DELETE FROM order_territory_attribution WHERE order_id LIKE 'oa-order-%'");
  await query("DELETE FROM attribution_policies WHERE id LIKE 'oa-policy-%'");
  await query("DELETE FROM franchise_territories WHERE territory_id LIKE 'oa-territory-%'");
  svc.invalidate();

  // A master over each territory, which the sub-franchise tests then nest under.
  masterAssignmentA = (await svc.assignTerritory({
    franchisePartnerId: MASTER, territoryId: T_A, tier: 'MASTER',
  })).assignment_id;
  masterAssignmentB = (await svc.assignTerritory({
    franchisePartnerId: MASTER, territoryId: T_B, tier: 'MASTER',
  })).assignment_id;
});

describe('tiered exclusivity', () => {
  test('a master and a sub may hold the same territory', async () => {
    // The containment the hierarchy exists for. Migration 101's flat index made
    // this impossible, which is what 103 changes.
    const sub = await svc.assignTerritory({
      franchisePartnerId: SUB_A,
      territoryId: T_A,
      tier: 'SUB',
      parentAssignmentId: masterAssignmentA,
    });

    expect(sub.assigned).toBe(true);
    expect(sub.tier).toBe('SUB');
    expect(sub.parent_assignment_id).toBe(masterAssignmentA);
  });

  test('two masters cannot hold one territory', async () => {
    // Still the original protection: two masters is double commission on every
    // order in the area.
    await expect(
      svc.assignTerritory({ franchisePartnerId: SUB_A, territoryId: T_A, tier: 'MASTER' })
    ).rejects.toThrow(/already has an active MASTER/i);
  });

  test('two subs cannot hold one territory', async () => {
    await svc.assignTerritory({
      franchisePartnerId: SUB_A, territoryId: T_A, tier: 'SUB', parentAssignmentId: masterAssignmentA,
    });

    await expect(
      svc.assignTerritory({
        franchisePartnerId: SUB_B, territoryId: T_A, tier: 'SUB', parentAssignmentId: masterAssignmentA,
      })
    ).rejects.toThrow(/already has an active SUB/i);
  });

  test('the database enforces per-tier exclusivity even without the service check', async () => {
    // The service check loses a race; the index does not. This is the one that
    // actually prevents a split commission under concurrency.
    await expect(
      query(
        `INSERT INTO franchise_territories
           (id, franchise_partner_id, territory_id, pincode, status, tier)
         VALUES ($1, $2, $3, '414001', 'ACTIVE', 'MASTER')`,
        [crypto.randomUUID(), SUB_A, T_A]
      )
    ).rejects.toThrow(/unique/i);
  });

  test('a sub cannot be created without a parent', async () => {
    await expect(
      svc.assignTerritory({ franchisePartnerId: SUB_A, territoryId: T_A, tier: 'SUB' })
    ).rejects.toThrow(/requires parentAssignmentId/i);
  });

  test("a sub cannot nest under a master holding somewhere else", async () => {
    // Otherwise the master override pays a partner for ground they do not hold.
    await expect(
      svc.assignTerritory({
        franchisePartnerId: SUB_A,
        territoryId: T_A,
        tier: 'SUB',
        parentAssignmentId: masterAssignmentB,
      })
    ).rejects.toThrow(/same territory/i);
  });

  test('an unknown tier is refused rather than defaulted', async () => {
    await expect(
      svc.assignTerritory({ franchisePartnerId: SUB_A, territoryId: T_A, tier: 'REGIONAL' })
    ).rejects.toThrow(/tier must be MASTER or SUB/i);
  });

  test('the sub-franchise is the one credited, not the master', async () => {
    await svc.assignTerritory({
      franchisePartnerId: SUB_A, territoryId: T_A, tier: 'SUB', parentAssignmentId: masterAssignmentA,
    });

    // Appointing a neighbourhood franchise moves the commission to them rather
    // than adding a second claim on it.
    const holders = await attribution.holdersFor(T_A);
    expect(attribution.earnerOf(holders).franchise_partner_id).toBe(SUB_A);
  });

  test('the master earns where no sub has been appointed', async () => {
    const holders = await attribution.holdersFor(T_B);
    expect(attribution.earnerOf(holders).franchise_partner_id).toBe(MASTER);
  });
});

describe('the split', () => {
  const pickupIn = (territoryId) => ({ territory_id: territoryId });

  beforeEach(async () => {
    await svc.assignTerritory({
      franchisePartnerId: SUB_A, territoryId: T_A, tier: 'SUB', parentAssignmentId: masterAssignmentA,
    });
    await svc.assignTerritory({
      franchisePartnerId: SUB_B, territoryId: T_B, tier: 'SUB', parentAssignmentId: masterAssignmentB,
    });
  });

  test('an order within one territory is not split', async () => {
    await setPolicy({ pickup: 70, delivery: 30 });

    const split = await attribution.computeSplit({
      pickup: pickupIn(T_A), delivery: pickupIn(T_A), commissionBase: 100,
    });

    // Two half-rows for one partner would make every downstream sum look like a
    // cross-boundary order that it is not.
    expect(split.reason).toBe('single_territory');
    expect(split.lines).toHaveLength(1);
    expect(split.lines[0].commission_amount).toBe(100);
  });

  test('a cross-boundary order divides by the policy in force', async () => {
    await setPolicy({ pickup: 70, delivery: 30 });

    const split = await attribution.computeSplit({
      pickup: pickupIn(T_A), delivery: pickupIn(T_B), commissionBase: 100,
    });

    expect(split.reason).toBe('cross_territory');
    const pickup = split.lines.find((l) => l.role === 'PICKUP');
    const delivery = split.lines.find((l) => l.role === 'DELIVERY');

    expect(pickup.franchise_partner_id).toBe(SUB_A);
    expect(pickup.commission_amount).toBe(70);
    expect(delivery.franchise_partner_id).toBe(SUB_B);
    expect(delivery.commission_amount).toBe(30);
  });

  test('the split always sums to the commission base, including on awkward amounts', async () => {
    await setPolicy({ pickup: 70, delivery: 30 });

    // 33.33 split three ways at these percentages does not divide cleanly; each
    // line rounds and the total drifts. The drift goes to the largest line.
    for (const base of [33.33, 0.01, 99.99, 1234.56, 7.77]) {
      const split = await attribution.computeSplit({
        pickup: pickupIn(T_A), delivery: pickupIn(T_B), commissionBase: base,
      });

      const total = split.lines.reduce((acc, l) => acc + l.commission_amount, 0);
      expect(attribution.round2(total)).toBe(attribution.round2(base));
    }
  });

  test('a master override is taken only where both sides share a master', async () => {
    await setPolicy({ pickup: 60, delivery: 30, master: 10 });

    const split = await attribution.computeSplit({
      pickup: pickupIn(T_A), delivery: pickupIn(T_B), commissionBase: 100,
    });

    const override = split.lines.find((l) => l.role === 'MASTER_OVERRIDE');
    expect(override).toBeDefined();
    expect(override.franchise_partner_id).toBe(MASTER);
    expect(override.commission_amount).toBe(10);
  });

  test('an override with no common master is redistributed, not quietly lost', async () => {
    // Give T_B a different master, so the two sides no longer share one.
    await query("DELETE FROM franchise_territories WHERE territory_id = $1", [T_B]);
    const otherMaster = (await svc.assignTerritory({
      franchisePartnerId: SUB_B, territoryId: T_B, tier: 'MASTER',
    })).assignment_id;
    expect(otherMaster).toBeTruthy();

    await setPolicy({ pickup: 60, delivery: 30, master: 10 });

    const split = await attribution.computeSplit({
      pickup: pickupIn(T_A), delivery: pickupIn(T_B), commissionBase: 100,
    });

    expect(split.lines.find((l) => l.role === 'MASTER_OVERRIDE')).toBeUndefined();
    // The 10% has no recipient; keeping it would lose money out of the split.
    const total = split.lines.reduce((acc, l) => acc + l.commission_amount, 0);
    expect(attribution.round2(total)).toBe(100);
  });

  test('a territory-specific policy overrides the platform default', async () => {
    await setPolicy({ pickup: 70, delivery: 30 });
    await setPolicy({ pickup: 50, delivery: 50, territoryId: T_A });

    const split = await attribution.computeSplit({
      pickup: pickupIn(T_A), delivery: pickupIn(T_B), commissionBase: 100,
    });

    // One renegotiated city, without touching everyone else.
    expect(split.lines.find((l) => l.role === 'PICKUP').commission_amount).toBe(50);
  });

  test('an order with no franchise at the pickup end produces no lines', async () => {
    await setPolicy({ pickup: 70, delivery: 30 });

    const split = await attribution.computeSplit({
      pickup: { territory_id: null }, delivery: pickupIn(T_B), commissionBase: 100,
    });

    // Better to record nothing than to credit an arbitrary partner.
    expect(split.lines).toHaveLength(0);
  });

  test('a negative commission base is refused', async () => {
    await setPolicy({ pickup: 70, delivery: 30 });
    await expect(
      attribution.computeSplit({ pickup: pickupIn(T_A), delivery: pickupIn(T_B), commissionBase: -5 })
    ).rejects.toThrow(/non-negative/i);
  });
});

describe('policy sign-off', () => {
  test('the seeded placeholder cannot be paid against', async () => {
    // Migration 103 seeds 100%-to-pickup as a safe stand-in for a decision the
    // business has not made. A payout run must refuse it.
    const seeded = await queryOne(
      'SELECT * FROM attribution_policies WHERE territory_id IS NULL ORDER BY effective_from ASC LIMIT 1'
    );

    expect(seeded).toBeTruthy();
    expect(() => attribution.assertPayable(seeded)).toThrow(/unsigned placeholder/i);
  });

  test('a signed policy is payable', async () => {
    await setPolicy({ pickup: 70, delivery: 30, signedOff: true });
    const policy = await attribution.policyFor(null);
    expect(() => attribution.assertPayable(policy)).not.toThrow();
  });

  test('a missing policy is refused rather than treated as zero commission', async () => {
    expect(() => attribution.assertPayable(null)).toThrow(/No attribution policy/i);
  });

  test('the signoff flag is read correctly whichever way the driver returns it', () => {
    // SQLite gives 0/1, Postgres gives a boolean, and some drivers give 't'.
    // Treating the string '0' as truthy would defeat the guard entirely, and it
    // would only show up on the first real payout run.
    for (const flag of [1, '1', true, 't']) {
      expect(() => attribution.assertPayable({ requires_signoff: flag })).toThrow(/unsigned/i);
    }
    for (const flag of [0, '0', false, null, undefined]) {
      expect(() => attribution.assertPayable({ requires_signoff: flag })).not.toThrow();
    }
  });
});

describe('the ledger', () => {
  beforeEach(async () => {
    await svc.assignTerritory({
      franchisePartnerId: SUB_A, territoryId: T_A, tier: 'SUB', parentAssignmentId: masterAssignmentA,
    });
    await svc.assignTerritory({
      franchisePartnerId: SUB_B, territoryId: T_B, tier: 'SUB', parentAssignmentId: masterAssignmentB,
    });
    await setPolicy({ pickup: 70, delivery: 30 });
  });

  async function makeOrder(id) {
    await query(
      `INSERT INTO orders (id, total_amount, delivery_fee, payment_method, delivery_address, delivery_coordinate)
       VALUES ($1, 500, 30, 'cod', 'Test address', '18.53,73.87')`,
      [id]
    );
  }

  test('records one row per side, naming the policy applied', async () => {
    await makeOrder('oa-order-1');

    const result = await attribution.attributeOrder({
      orderId: 'oa-order-1',
      pickupPoint: { pincode: '414001' },
      deliveryPoint: { pincode: '414002' },
      commissionBase: 100,
    });

    expect(result.recorded).toBe(true);

    const rows = await attribution.attributionFor('oa-order-1');
    expect(rows).toHaveLength(2);
    // The policy is recorded so "why was this split like that" has an answer
    // that does not depend on today's policy.
    expect(rows.every((r) => r.policy_id)).toBe(true);
  });

  test('recomputing corrects the ledger rather than appending a second split', async () => {
    await makeOrder('oa-order-2');

    const args = {
      orderId: 'oa-order-2',
      pickupPoint: { pincode: '414001' },
      deliveryPoint: { pincode: '414002' },
      commissionBase: 100,
    };

    await attribution.attributeOrder(args);
    await attribution.attributeOrder({ ...args, commissionBase: 200 });

    const rows = await attribution.attributionFor('oa-order-2');
    expect(rows).toHaveLength(2);

    const total = rows.reduce((acc, r) => acc + Number(r.commission_amount), 0);
    expect(attribution.round2(total)).toBe(200);
  });

  test('earnings read from the ledger, so a policy change does not restate history', async () => {
    await makeOrder('oa-order-3');
    await attribution.attributeOrder({
      orderId: 'oa-order-3',
      pickupPoint: { pincode: '414001' },
      deliveryPoint: { pincode: '414002' },
      commissionBase: 100,
    });

    const before = await attribution.earningsForPartner(SUB_A);
    expect(before.total).toBe(70);

    // Renegotiate. Last month's earnings must not move.
    await setPolicy({ pickup: 10, delivery: 90 });

    const after = await attribution.earningsForPartner(SUB_A);
    expect(after.total).toBe(70);
  });
});
