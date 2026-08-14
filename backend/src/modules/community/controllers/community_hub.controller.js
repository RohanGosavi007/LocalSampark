const { query, queryOne, withTransaction } = require('../../../config/database');

let IS_WEEKEND_GARAGE_SALE_ACTIVE = false;

// ---------------------------------------------------------
// LOST & FOUND (Part 1)
// ---------------------------------------------------------

/**
 * Report a Lost Pet/Item
 */
const postLostItem = async (req, res, next) => {
  try {
    const { itemName, description, pincode, bountyCoins } = req.body;
    const userId = req.user.id;

    await withTransaction(async (client) => {
      // Check if user has enough coins to fund the bounty they set, locking wallet
      const walletResult = await client.query(`SELECT total_coins FROM loyalty_wallets WHERE user_id = $1 FOR UPDATE`, 
        [userId]
      );
      const wallet = walletResult.rows[0];

      if (!wallet || wallet.total_coins < bountyCoins) {
        throw new Error(`You do not have enough SamparkCoins to fund a ${bountyCoins} 🪙 bounty.`);
      }

      // Deduct coins immediately and hold them in escrow
      await client.query(`UPDATE loyalty_wallets SET total_coins = total_coins - $1 WHERE user_id = $2`, [bountyCoins, userId]);
      await client.query(`INSERT INTO loyalty_transactions (user_id, amount, type, source) VALUES ($1, $2, 'spent', 'Lost & Found Bounty Escrow')`,
        [userId, bountyCoins]
      );

      const alert = await client.query(`INSERT INTO lost_found_alerts (user_id, item_name, description, pincode, bounty_coins, status) 
         VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
        [userId, itemName, description, pincode, bountyCoins]
      );

      res.status(201).json({
        success: true,
        message: 'Amber Alert Broadcasted to Pincode!',
        data: alert.rows[0]
      });
    });
  } catch (error) {
    if (error.message.includes('not have enough SamparkCoins')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Get active alerts
 */
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
 * Mark as Found (Pay the Finder)
 */
const resolveLostItem = async (req, res, next) => {
  try {
    const { alertId } = req.params;
    const { finderId } = req.body; 
    const ownerId = req.user.id; 

    await withTransaction(async (client) => {
      // Lock alert to prevent double resolution
      const alertResult = await client.query(`SELECT * FROM lost_found_alerts WHERE id = $1 AND user_id = $2 FOR UPDATE`, 
        [alertId, ownerId]
      );
      const alert = alertResult.rows[0];

      if (!alert || alert.status !== 'active') {
        throw new Error('Invalid alert or already resolved.');
      }

      // Transfer bounty to Finder
      await client.query(`UPDATE loyalty_wallets SET total_coins = total_coins + $1 WHERE user_id = $2`, [alert.bounty_coins, finderId]);
      await client.query(`INSERT INTO loyalty_transactions (user_id, amount, type, source) VALUES ($1, $2, 'earned', 'Lost & Found Hero Bounty')`,
        [finderId, alert.bounty_coins]
      );

      await client.query(`UPDATE lost_found_alerts SET status = 'resolved', finder_id = $1 WHERE id = $2`, [finderId, alertId]);

      res.json({ success: true, message: `Bounty of ${alert.bounty_coins} 🪙 transferred to the Finder!` });
    });
  } catch (error) {
    if (error.message === 'Invalid alert or already resolved.') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

// ---------------------------------------------------------
// GARAGE SALE (Part 2) - 100% COIN ECONOMY
// ---------------------------------------------------------

/**
 * Post an item for sale (Coins only)
 */
const postGarageItem = async (req, res, next) => {
  try {
    // If Admin hasn't turned on Weekend mode, and we don't have 24/7 mode fallback... wait, User requested BOTH. 
    // Let's assume the frontend will show a banner if Weekend mode is ON, but it's always allowed 24/7 unless explicitly blocked.
    // For now, we always allow it, but we expose the Weekend flag to UI for urgency.

    const { itemName, description, priceCoins } = req.body;
    const userId = req.user.id;

    const item = await query(`INSERT INTO garage_sale_items (seller_id, item_name, description, price_coins, status) 
       VALUES ($1, $2, $3, $4, 'available') RETURNING *`,
      [userId, itemName, description, priceCoins]
    );

    res.status(201).json({ success: true, message: 'Item posted to the Garage Sale!', data: item.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available garage sale items
 */
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
 * Buy an item using Coins
 */
const buyGarageItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { deliveryRequested, dropoffLocation } = req.body;
    const buyerId = req.user.id;

    await withTransaction(async (client) => {
      // Lock garage sale item to prevent race condition (double purchase)
      const itemResult = await client.query(`SELECT * FROM garage_sale_items WHERE id = $1 AND status = 'available' FOR UPDATE`, 
        [itemId]
      );
      const item = itemResult.rows[0];

      if (!item) throw new Error('Item not available.');
      if (item.seller_id === buyerId) throw new Error('Cannot buy your own item.');

      // Check Buyer Wallet, lock it
      const buyerWalletResult = await client.query(`SELECT total_coins FROM loyalty_wallets WHERE user_id = $1 FOR UPDATE`, 
        [buyerId]
      );
      const buyerWallet = buyerWalletResult.rows[0];

      if (!buyerWallet || buyerWallet.total_coins < item.price_coins) {
        throw new Error(`Not enough coins. Item costs ${item.price_coins} 🪙.`);
      }

      // 1. Deduct from Buyer
      await client.query(`UPDATE loyalty_wallets SET total_coins = total_coins - $1 WHERE user_id = $2`, [item.price_coins, buyerId]);
      await client.query(`INSERT INTO loyalty_transactions (user_id, amount, type, source) VALUES ($1, $2, 'spent', 'Garage Sale Purchase')`, [buyerId, item.price_coins]);

      // 2. Add to Seller
      await client.query(`UPDATE loyalty_wallets SET total_coins = total_coins + $1 WHERE user_id = $2`, [item.price_coins, item.seller_id]);
      await client.query(`INSERT INTO loyalty_transactions (user_id, amount, type, source) VALUES ($1, $2, 'earned', 'Garage Sale Sale')`, [item.seller_id, item.price_coins]);

      // 3. Update Item
      await client.query(`UPDATE garage_sale_items SET status = 'sold', buyer_id = $1 WHERE id = $2`, [buyerId, itemId]);

      // 4. (Optional) Ping Delivery Agent Network
      let deliveryJobId = null;
      if (deliveryRequested) {
         const newJob = await client.query(`INSERT INTO delivery_jobs (requester_id, pickup_location, dropoff_location, item_details, delivery_type, payment_pref, price_fiat, price_coins, pincode, status) 
           VALUES ($1, 'Seller Address', $2, $3, 'walker', 'fiat', 30, 0, '400001', 'pending') RETURNING *`,
          [buyerId, dropoffLocation, `Garage Sale: ${item.item_name}`]
        );
        deliveryJobId = newJob.rows[0].id;
      }

      res.json({ 
        success: true, 
        message: 'Item purchased successfully!', 
        data: { deliveryJobId }
      });
    });
  } catch (error) {
    if (error.message === 'Item not available.' || 
        error.message === 'Cannot buy your own item.' || 
        error.message.includes('Not enough coins')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * ADMIN ONLY: Toggle Weekend Mode
 */
const toggleWeekendMode = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    IS_WEEKEND_GARAGE_SALE_ACTIVE = enabled;
    res.json({ success: true, message: `Weekend Garage Sale Mode is now ${enabled ? 'ACTIVE' : 'INACTIVE'}` });
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
