const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');

// NOW() is PostgreSQL-only.
const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

/**
 * Trigger an SOS Event
 */
const triggerSOS = async (req, res, next) => {
  try {
    const { type, latitude, longitude, pincode } = req.body;
    const userId = req.user.id;

    // 1. Log the SOS event.
    //
    // sos_alerts.id is a TEXT primary key with no default (migration 092), so the
    // id is generated here — the insert previously omitted it entirely.
    const alertId = crypto.randomUUID();
    const newAlert = await query(
      `INSERT INTO sos_alerts (id, user_id, type, latitude, longitude, pincode, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING *`,
      [alertId, userId, type || null, latitude ?? null, longitude ?? null, pincode || null]
    );

    // 2. Fetch emergency contacts for the loud alarm routing
    const contacts = await query(
      `SELECT contact_user_id FROM emergency_contacts WHERE user_id = $1`,
      [userId]
    );

    res.status(201).json({
      success: true,
      message: 'SOS Alert triggered successfully.',
      data: {
        // The SQLite driver returns rows directly rather than under .rows.
        alert: (newAlert.rows && newAlert.rows[0]) || { id: alertId, user_id: userId, type, status: 'active' },
        emergencyContacts: (contacts.rows || contacts || []).map(r => r.contact_user_id)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active SOS alerts in a zone (Admin/Dashboard)
 */
const getActiveSOS = async (req, res, next) => {
  try {
    const alerts = await query(`
      SELECT s.*, u.full_name, u.phone_number 
      FROM sos_alerts s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
    `);
    
    res.json({
      success: true,
      data: alerts.rows || alerts || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve or Penalize an SOS (Admin Action)
 */
const resolveSOS = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution, penalize } = req.body; // resolution: 'resolved', 'false_alarm'

    // Only the two statuses the admin action is defined for; anything else would
    // silently park an alert in an unknown state.
    if (!['resolved', 'false_alarm'].includes(resolution)) {
      return res.status(400).json({ error: "resolution must be 'resolved' or 'false_alarm'" });
    }

    const alert = await queryOne(
      `UPDATE sos_alerts SET status = $1, updated_at = ${NOW} WHERE id = $2 RETURNING *`,
      [resolution, id]
    );
    if (!alert) return res.status(404).json({ error: 'SOS Alert not found' });

    if (penalize && resolution === 'false_alarm') {
      // Deduct 200 SamparkCoins for a false alarm
      await query(
        `UPDATE loyalty_wallets SET total_coins = GREATEST(0, total_coins - 200) WHERE user_id = $1`,
        [alert.user_id]
      );
      // Optional: Log transaction
      await query(
        `INSERT INTO loyalty_transactions (user_id, amount, type, source) VALUES ($1, 200, 'spent', 'False SOS Penalty')`,
        [alert.user_id]
      );
    }

    res.json({
      success: true,
      message: `SOS marked as ${resolution}. ${penalize ? 'User penalized.' : ''}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add an emergency contact
 */
const addContact = async (req, res, next) => {
  try {
    const { contactPhone } = req.body;
    const userId = req.user.id;

    // Find the contact user
    // The users table has phone_number; there is no `phone` column, so this
    // raised "no such column" and adding an emergency contact always failed.
    const contactUser = await queryOne('SELECT id FROM users WHERE phone_number = $1', [contactPhone]);
    if (!contactUser) {
      return res.status(404).json({ error: 'Contact not found on LocalSampark.' });
    }

    await query(
      `INSERT INTO emergency_contacts (user_id, contact_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, contactUser.id]
    );

    res.json({ success: true, message: 'Emergency contact added.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  triggerSOS,
  getActiveSOS,
  resolveSOS,
  addContact
};
