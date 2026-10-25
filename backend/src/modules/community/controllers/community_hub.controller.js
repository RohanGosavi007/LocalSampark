const crypto = require('crypto');
const { query, queryOne, withTransaction } = require('../../../config/database');
const coins = require('../../../services/coins.service');

let IS_WEEKEND_GARAGE_SALE_ACTIVE = false;

/**
 * Lost & found bounties and the coins-only garage sale.
 *
 * These spent and paid SamparkCoins from loyalty_wallets, a table nothing ever
 * credited, so every bounty and every purchase failed for want of coins — and
 * the bounty was never checked, so a negative bounty added coins instead of
 * holding them. They now use the one coin balance (services/coins.service.js):
 * a bounty is held from the poster when the alert goes up and paid to the
 * finder when it is resolved; a purchase moves the price from buyer to seller
 * in one transaction.
 */

class HubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const sendHubError = (res, error) => {
  if (error instanceof HubError) return res.status(error.status).json({ success: false, error: error.message });
  if (coins.sendCoinError(res, error)) return true;
  return false;
};

const text = (value, max) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);

// ---------------------------------------------------------
// LOST & FOUND
// ---------------------------------------------------------

/**
 * POST /community-hub/lost/post { itemName, description, pincode, bountyCoins }
 * The bounty (0 for none) is taken from the poster now and held until the
 * item is found.
 */
const postLostItem = async (req, res, next) => {
  try {
    const { description, pincode } = req.body || {};
    const itemName = text((req.body || {}).itemName, 120);
    if (!itemName) return res.status(400).json({ success: false, error: 'itemName is required' });

    const rawBounty = (req.body || {}).bountyCoins;
    const bounty = rawBounty === undefined || rawBounty === null || rawBounty === '' ? 0 : Number(rawBounty);
    if (!Number.isInteger(bounty) || bounty < 0 || bounty > coins.MAX_AMOUNT) {
      return res.status(400).json({ success: false, error: 'bountyCoins must be a whole number of coins, 0 or more' });
    }

    const id = crypto.randomUUID();
    const alert = await withTransaction(async (client) => {
      if (bounty > 0) {
        await coins.debit({ userId: req.user.id, amount: bounty, reason: 'Lost & Found bounty held', referenceId: `lost:${id}`, client });
      }
      await client.query(
        `INSERT INTO lost_found_alerts (id, user_id, item_name, description, pincode, bounty_coins, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [id, req.user.id, itemName, text(description, 1000), text(pincode, 10), bounty]
      );
      return (await client.query('SELECT * FROM lost_found_alerts WHERE id = $1', [id])).rows[0];
    });

    res.status(201).json({ success: true, message: 'Alert broadcast to your pincode.', data: alert });
  } catch (error) {
    if (!sendHubError(res, error)) next(error);
  }
};

const getLostItems = async (req, res, next) => {
  try {
    const { pincode } = req.query;
    let sql = `
      SELECT l.*, u.full_name as poster_name
      FROM lost_found_alerts l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active'
    `;
    const params = [];
    if (pincode) {
      params.push(pincode);
      sql += ` AND l.pincode = $${params.length}`;
    }

    const alerts = await query(sql, params);
    res.json({ success: true, data: alerts.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /community-hub/lost/:alertId/resolve { finderId }
 * The poster marks their item found and names who found it; the held bounty
 * goes to that person. The finder must be a real account other than the
 * poster. The UPDATE is the gate, so an alert is paid out once.
 */
const resolveLostItem = async (req, res, next) => {
  try {
    const { alertId } = req.params;
    const finderId = (req.body || {}).finderId;
    const ownerId = req.user.id;

    const result = await withTransaction(async (client) => {
      const alert = (await client.query('SELECT * FROM lost_found_alerts WHERE id = $1 AND user_id = $2', [alertId, ownerId])).rows[0];
      if (!alert) throw new HubError(404, 'Alert not found.');
      if (alert.status !== 'active') throw new HubError(409, 'This alert has already been resolved.');

      const bounty = Number(alert.bounty_coins) || 0;
      if (bounty > 0) {
        if (!finderId) throw new HubError(400, 'finderId is required to pay the bounty.');
        if (String(finderId) === String(ownerId)) throw new HubError(400, 'The finder must be someone else.');
        const finder = (await client.query('SELECT id FROM users WHERE id = $1', [finderId])).rows[0];
        if (!finder) throw new HubError(404, 'Finder not found.');
      }

      const closed = await client.query(
        "UPDATE lost_found_alerts SET status = 'resolved', finder_id = $1 WHERE id = $2 AND status = 'active'",
        [finderId || null, alertId]
      );
      if (!closed.rowCount) throw new HubError(409, 'This alert has already been resolved.');

      if (bounty > 0) {
        await coins.credit({ userId: finderId, amount: bounty, reason: 'Lost & Found bounty', referenceId: `lost:${alertId}`, client });
      }
      return { bounty };
    });

    res.json({
      success: true,
      message: result.bounty > 0 ? `Bounty of ${result.bounty} coins paid to the finder.` : 'Marked as found.',
    });
  } catch (error) {
    if (!sendHubError(res, error)) next(error);
  }
};

// ---------------------------------------------------------
// GARAGE SALE — paid in coins
// ---------------------------------------------------------

const postGarageItem = async (req, res, next) => {
  try {
    const itemName = text((req.body || {}).itemName, 120);
    const priceCoins = Number((req.body || {}).priceCoins);
    if (!itemName) return res.status(400).json({ success: false, error: 'itemName is required' });
    if (!Number.isInteger(priceCoins) || priceCoins < 1 || priceCoins > coins.MAX_AMOUNT) {
      return res.status(400).json({ success: false, error: 'priceCoins must be a whole number of coins, at least 1' });
    }

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO garage_sale_items (id, seller_id, item_name, description, price_coins, status)
       VALUES ($1, $2, $3, $4, $5, 'available')`,
      [id, req.user.id, itemName, text((req.body || {}).description, 1000), priceCoins]
    );
    const item = await queryOne('SELECT * FROM garage_sale_items WHERE id = $1', [id]);

    res.status(201).json({ success: true, message: 'Item posted to the Garage Sale!', data: item });
  } catch (error) {
    next(error);
  }
};

const getGarageItems = async (req, res, next) => {
  try {
    const items = await query(`
      SELECT g.*, u.full_name as seller_name
      FROM garage_sale_items g
      JOIN users u ON g.seller_id = u.id
      WHERE g.status = 'available'
    `);
    res.json({ success: true, data: items.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /community-hub/garage/:itemId/buy
 *
 * The item is claimed and the coins move in one transaction: the conditional
 * UPDATE takes the item only while it is still available, so two buyers
 * cannot both have it.
 *
 * This used to accept `deliveryRequested` and write a row to delivery_jobs —
 * a table no rider screen reads, with a fixed ₹30 fee and a Mumbai pincode.
 * Nobody would have come. Buyer and seller arrange the handover; a delivery
 * can be booked as a parcel (POST /delivery/request).
 */
const buyGarageItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const buyerId = req.user.id;

    const item = await withTransaction(async (client) => {
      const found = (await client.query('SELECT * FROM garage_sale_items WHERE id = $1', [itemId])).rows[0];
      if (!found || found.status !== 'available') throw new HubError(404, 'Item not available.');
      if (String(found.seller_id) === String(buyerId)) throw new HubError(400, 'Cannot buy your own item.');

      const taken = await client.query(
        "UPDATE garage_sale_items SET status = 'sold', buyer_id = $1 WHERE id = $2 AND status = 'available'",
        [buyerId, itemId]
      );
      if (!taken.rowCount) throw new HubError(409, 'Someone has just bought this item.');

      await coins.transfer({
        fromUserId: buyerId, toUserId: found.seller_id, amount: Number(found.price_coins),
        reason: 'Garage sale', referenceId: `garage:${itemId}`, client,
      });
      return found;
    });

    res.json({
      success: true,
      message: 'Item purchased. Contact the seller to arrange the handover.',
      data: { itemId: item.id, priceCoins: Number(item.price_coins), sellerId: item.seller_id },
    });
  } catch (error) {
    if (!sendHubError(res, error)) next(error);
  }
};

/**
 * ADMIN ONLY: Toggle Weekend Mode
 */
const toggleWeekendMode = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    IS_WEEKEND_GARAGE_SALE_ACTIVE = Boolean(enabled);
    res.json({ success: true, message: `Weekend Garage Sale Mode is now ${IS_WEEKEND_GARAGE_SALE_ACTIVE ? 'ACTIVE' : 'INACTIVE'}` });
  } catch (error) {
    next(error);
  }
};
const getWeekendMode = (req, res) => {
  res.json({ success: true, data: { enabled: IS_WEEKEND_GARAGE_SALE_ACTIVE } });
};

module.exports = {
  postLostItem,
  getLostItems,
  resolveLostItem,
  postGarageItem,
  getGarageItems,
  buyGarageItem,
  toggleWeekendMode,
  getWeekendMode
};
