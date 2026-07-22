const { query, queryOne } = require('../../../config/database');

/**
 * Resident Requests a Scrap Pickup
 */
const requestPickup = async (req, res, next) => {
  try {
    const { scrapType, approxWeight, address, pincode, payoutPreference } = req.body;
    const userId = req.user.id;

    // Define Coin Reward if Donating to Old Age Fund
    // Flat 500 Coins for doing a good deed, regardless of weight for simplicity in demo
    const coinReward = payoutPreference === 'donate' ? 500 : 0;

    const newRequest = await query(
      `INSERT INTO scrap_requests (resident_id, scrap_type, approx_weight, address, pincode, payout_preference, coin_reward, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
      [userId, scrapType, approxWeight, address, pincode, payoutPreference, coinReward]
    );

    res.status(201).json({
      success: true,
      message: 'Scrap Dealer Pinged! A local RaddiWala will be there soon.',
      data: newRequest.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Dealer fetches active pings in their pincode
 */
const getActivePings = async (req, res, next) => {
  try {
    const { pincode } = req.query;
    let sql = `
      SELECT s.*, u.full_name as resident_name 
      FROM scrap_requests s
      JOIN users u ON s.resident_id = u.id
      WHERE s.status = 'pending'
    `;
    const params = [];
    if (pincode) {
      params.push(pincode);
      sql += ` AND s.pincode = $${params.length}`;
    }

    const requests = await query(sql, params);
    res.json({ success: true, data: requests.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Dealer Accepts the Job (First Come, First Serve)
 */
const acceptPickup = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const dealerId = req.user.id;

    const reqData = await queryOne(`SELECT status FROM scrap_requests WHERE id = $1`, [requestId]);
    if (!reqData || reqData.status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been accepted by another dealer.' });
    }

    const updated = await query(
      `UPDATE scrap_requests SET status = 'accepted', dealer_id = $1 WHERE id = $2 RETURNING *`,
      [dealerId, requestId]
    );

    res.json({ success: true, message: 'Pickup Accepted! Head to the address.', data: updated.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Dealer Completes Pickup & Pays/Donates
 */
const completePickup = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const dealerId = req.user.id;

    const reqData = await queryOne(`SELECT * FROM scrap_requests WHERE id = $1 AND dealer_id = $2`, [requestId, dealerId]);
    if (!reqData || reqData.status !== 'accepted') {
      return res.status(400).json({ error: 'Invalid request or already completed.' });
    }

    // Process Payout
    if (reqData.payout_preference === 'donate') {
      // Resident chose to Donate to Old Age Fund
      // Reward Resident with Gamification Coins
      await query(`UPDATE loyalty_wallets SET total_coins = total_coins + $1 WHERE user_id = $2`, [reqData.coin_reward, reqData.resident_id]);
      await query(
        `INSERT INTO loyalty_transactions (user_id, amount, type, source) VALUES ($1, $2, 'earned', 'Scrap Donation - Old Age Fund')`,
        [reqData.resident_id, reqData.coin_reward]
      );
    } else {
      // Resident chose Fiat. Dealer pays them directly in cash/UPI. No digital wallet deduction required for demo.
    }

    const updated = await query(`UPDATE scrap_requests SET status = 'completed' WHERE id = $1 RETURNING *`, [requestId]);

    res.json({
      success: true,
      message: `Pickup Complete! ${reqData.payout_preference === 'donate' ? `Resident donated scrap. They earned ${reqData.coin_reward} Coins.` : 'Paid resident in cash.'}`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestPickup,
  getActivePings,
  acceptPickup,
  completePickup
};
