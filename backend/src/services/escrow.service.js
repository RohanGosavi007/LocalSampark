/**
 * Marketplace escrow: a buyer's money, held until the item changes hands.
 *
 * The escrow endpoints kept a ledger of promises. "Create" wrote a row with
 * status 'held' and told the buyer "Payment held safely" — nothing had been
 * paid, by anyone. "Release" told the seller "Payment released to seller!" and
 * paid nothing. An administrator "resolving" a dispute changed a word in a
 * column. A seller who handed over a phone on the strength of that screen had
 * given it away.
 *
 * It now holds real money, from the buyer's wallet (which is topped up through
 * Razorpay):
 *
 *   hold      the buyer's wallet is debited for the amount; no balance, no
 *             escrow.
 *   release   the seller's wallet is credited the amount less the platform
 *             fee, and the listing is marked sold.
 *   refund    the buyer's wallet is credited the full amount.
 *
 * Each step is one transaction, and each is gated on the escrow's status by
 * the UPDATE itself, so a button pressed twice — or a buyer releasing while an
 * administrator refunds — moves the money once.
 */

const crypto = require('crypto');
const { queryOne, withTransaction } = require('../config/database');
const payments = require('./payments.service');

const PLATFORM_FEE_RATE = 0.02;

class EscrowError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'EscrowError';
    this.status = status;
    this.code = code;
  }
}

const round = (value) => Math.round(Number(value) * 100) / 100;

/**
 * Opens an escrow for a listing and takes the money from the buyer's wallet.
 * `amount` defaults to the listing's price and may differ from it only when
 * the listing is negotiable.
 */
async function hold({ buyerId, listingId, amount }) {
  const listing = await queryOne('SELECT id, seller_id, price, is_negotiable, status FROM marketplace_listings WHERE id = $1', [listingId]);
  if (!listing) throw new EscrowError(404, 'NOT_FOUND', 'Listing not found');
  if (String(listing.seller_id) === String(buyerId)) throw new EscrowError(400, 'OWN_LISTING', 'Cannot buy your own listing');
  if (listing.status && !['active', 'available'].includes(String(listing.status).toLowerCase())) {
    throw new EscrowError(409, 'NOT_AVAILABLE', 'This listing is no longer available');
  }

  const price = round(listing.price);
  const negotiable = listing.is_negotiable === 1 || listing.is_negotiable === true || listing.is_negotiable === '1';
  const agreed = amount === undefined || amount === null || amount === '' ? price : round(amount);
  if (!Number.isFinite(agreed) || agreed < 1) throw new EscrowError(400, 'INVALID_AMOUNT', 'The amount must be at least ₹1');
  if (!negotiable && agreed !== price) {
    throw new EscrowError(400, 'PRICE_MISMATCH', `This listing is sold at its listed price of ₹${price}`);
  }

  const open = await queryOne(
    "SELECT id FROM marketplace_escrow WHERE listing_id = $1 AND status IN ('held', 'disputed') LIMIT 1",
    [listingId]
  );
  if (open) throw new EscrowError(409, 'ALREADY_HELD', 'A payment is already being held for this listing');

  const id = crypto.randomUUID();
  const platformFee = round(agreed * PLATFORM_FEE_RATE);

  try {
    await withTransaction(async (client) => {
      await payments.debitWallet({ userId: buyerId, amount: agreed, purpose: 'marketplace_escrow_hold', referenceId: id, client });
      await client.query(
        `INSERT INTO marketplace_escrow (id, listing_id, buyer_id, seller_id, amount, platform_fee, status, payment_method, held_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'held', 'wallet', CURRENT_TIMESTAMP)`,
        [id, listingId, buyerId, listing.seller_id, agreed, platformFee]
      );
    });
  } catch (err) {
    if (err instanceof payments.PaymentError && err.code === 'INSUFFICIENT_BALANCE') {
      throw new EscrowError(402, 'INSUFFICIENT_BALANCE', `Add ₹${agreed} to your wallet to pay for this item.`);
    }
    throw err;
  }

  return { id, listing_id: listingId, amount: agreed, platform_fee: platformFee, net_to_seller: round(agreed - platformFee), status: 'held' };
}

/**
 * Ends an escrow in `to` ('released' pays the seller, 'refunded' returns the
 * money to the buyer) if it is currently in one of `from`. Returns false if it
 * was not, having moved nothing.
 */
async function settle(escrow, to, from) {
  const stamp = to === 'released' ? 'released_at' : 'refunded_at';
  return withTransaction(async (client) => {
    const placeholders = from.map((_, i) => `$${i + 2}`).join(', ');
    const claimed = await client.query(
      `UPDATE marketplace_escrow SET status = '${to}', ${stamp} = CURRENT_TIMESTAMP, resolved_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status IN (${placeholders})`,
      [escrow.id, ...from]
    );
    if (!claimed.rowCount) return false;

    if (to === 'released') {
      const net = round(Number(escrow.amount) - Number(escrow.platform_fee || 0));
      await payments.creditWallet({ userId: escrow.seller_id, amount: net, purpose: 'marketplace_sale', referenceId: escrow.id, client });
      await client.query("UPDATE marketplace_listings SET status = 'sold' WHERE id = $1", [escrow.listing_id]);
    } else {
      await payments.creditWallet({ userId: escrow.buyer_id, amount: escrow.amount, purpose: 'marketplace_escrow_refund', referenceId: escrow.id, client });
    }
    return true;
  });
}

/** The buyer confirms they have the item: the seller is paid. */
async function releaseByBuyer({ buyerId, escrowId }) {
  const escrow = await queryOne('SELECT * FROM marketplace_escrow WHERE id = $1 AND buyer_id = $2', [escrowId, buyerId]);
  if (!escrow) throw new EscrowError(404, 'NOT_FOUND', 'Escrow not found');
  if (!(await settle(escrow, 'released', ['held']))) {
    throw new EscrowError(400, 'NOT_HELD', 'Escrow not in held status');
  }
  return escrow;
}

/** The buyer says something is wrong: the money stays held until an administrator decides. */
async function dispute({ buyerId, escrowId, reason }) {
  const escrow = await queryOne('SELECT * FROM marketplace_escrow WHERE id = $1 AND buyer_id = $2', [escrowId, buyerId]);
  if (!escrow) throw new EscrowError(404, 'NOT_FOUND', 'Escrow not found');
  const text = String(reason || '').trim().slice(0, 1000);
  if (!text) throw new EscrowError(400, 'REASON_REQUIRED', 'Tell us what went wrong');

  const { query } = require('../config/database');
  const changed = await query(
    "UPDATE marketplace_escrow SET status = 'disputed', dispute_reason = $1, dispute_at = CURRENT_TIMESTAMP WHERE id = $2 AND status = 'held'",
    [text, escrowId]
  );
  if (!changed.rowCount) throw new EscrowError(400, 'NOT_HELD', 'Only a held payment can be disputed');
  return escrow;
}

/** An administrator ends a held or disputed escrow, one way or the other. */
async function resolveByAdmin({ escrowId, resolution }) {
  const to = { release_to_seller: 'released', refund_to_buyer: 'refunded' }[resolution];
  if (!to) throw new EscrowError(400, 'INVALID_RESOLUTION', 'resolution must be release_to_seller or refund_to_buyer');
  const escrow = await queryOne('SELECT * FROM marketplace_escrow WHERE id = $1', [escrowId]);
  if (!escrow) throw new EscrowError(404, 'NOT_FOUND', 'Escrow not found');
  if (!(await settle(escrow, to, ['held', 'disputed']))) {
    throw new EscrowError(409, 'ALREADY_SETTLED', `This escrow is already ${escrow.status}`);
  }
  return { ...escrow, status: to };
}

module.exports = { EscrowError, PLATFORM_FEE_RATE, hold, releaseByBuyer, dispute, resolveByAdmin };
