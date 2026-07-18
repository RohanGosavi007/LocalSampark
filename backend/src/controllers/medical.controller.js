const { query, queryOne } = require('../config/database');
const crypto = require('crypto');

// For simplicity in this mockup, we'll store the "reward toggle" in a global or just mock it.
// In a real app, it would be in a settings table like: SELECT value FROM app_settings WHERE key = 'blood_donor_reward_enabled'
let IS_DONOR_REWARD_ENABLED = false; // Disabled for MVP

/**
 * Register as Blood Donor
 */
const registerDonor = async (req, res, next) => {
  try {
    const { bloodGroup, pincode, location } = req.body;
    const userId = req.user.id;

    // Check if already registered
    const existing = await queryOne(`SELECT id FROM medical_donors WHERE user_id = $1`, [userId]);
    if (existing) {
      return res.status(400).json({ error: 'You are already registered as a donor.' });
    }

    const donorId = crypto.randomUUID();
    const newDonor = await query(
      `INSERT INTO medical_donors (id, user_id, blood_group, pincode, location, is_active) VALUES ($1, $2, $3, $4, $5, 1) RETURNING *`,
      [donorId, userId, bloodGroup, pincode, location || '']
    );

    // Wallet logic decoupled for MVP (IS_DONOR_REWARD_ENABLED is false)

    res.status(201).json({
      success: true,
      message: 'Successfully registered as a blood donor!',
      data: { donor: newDonor.rows[0], rewarded: false, rewardAmount: 0 }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active blood donors in a location/pincode
 */
const getDonors = async (req, res, next) => {
  try {
    const { pincode, bloodGroup, location } = req.query;
    let sql = `
      SELECT d.*, u.full_name, u.phone 
      FROM medical_donors d
      JOIN users u ON d.user_id = u.id
      WHERE d.is_active = 1
    `;
    const params = [];
    if (pincode) {
      params.push(pincode);
      sql += ` AND d.pincode = $${params.length}`;
    }
    if (bloodGroup) {
      params.push(bloodGroup);
      sql += ` AND d.blood_group = $${params.length}`;
    }
    if (location && location !== 'Choose Location' && location !== '') {
      params.push(`%${location}%`);
      sql += ` AND LOWER(d.location) LIKE LOWER($${params.length})`;
    }

    const donors = await query(sql, params);
    res.json({ success: true, data: donors.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Post a Medical Request (Blood or Equipment)
 */
const createRequest = async (req, res, next) => {
  try {
    const { requestType, requiredItem, description, location, urgency } = req.body;
    const userId = req.user.id;
    const reqId = crypto.randomUUID();

    const newReq = await query(
      `INSERT INTO medical_requests (id, requester_id, request_type, required_item, description, location, urgency, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active') RETURNING *`,
      [reqId, userId, requestType, requiredItem, description, location, urgency]
    );

    res.status(201).json({
      success: true,
      message: 'Medical request broadcasted.',
      data: newReq.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active medical requests
 */
const getRequests = async (req, res, next) => {
  try {
    const { location } = req.query;
    let sql = `
      SELECT r.*, u.full_name as requester_name, u.phone
      FROM medical_requests r
      JOIN users u ON r.requester_id = u.id
      WHERE r.status = 'active'
    `;
    const params = [];
    
    if (location && location !== 'Choose Location' && location !== '') {
      params.push(`%${location}%`);
      sql += ` AND LOWER(r.location) LIKE LOWER($${params.length})`;
    }

    sql += ` ORDER BY r.created_at DESC`;

    const requests = await query(sql, params);
    res.json({ success: true, data: requests.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN ONLY: Toggle Gamification Reward
 */
const toggleReward = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    IS_DONOR_REWARD_ENABLED = enabled;
    res.json({ success: true, message: `Donor Reward is now ${enabled ? 'ENABLED' : 'DISABLED'}` });
  } catch (error) {
    next(error);
  }
};
const getRewardStatus = (req, res) => {
  res.json({ success: true, data: { enabled: IS_DONOR_REWARD_ENABLED } });
};

module.exports = {
  registerDonor,
  getDonors,
  createRequest,
  getRequests,
  toggleReward,
  getRewardStatus
};
