const { query, queryOne } = require('../../../config/database');

/**
 * Trigger an SOS Event
 */
const triggerSOS = async (req, res, next) => {
  try {
    const { type, latitude, longitude, pincode } = req.body;
    const userId = req.user.id;

    // 1. Log the SOS event
    const newAlert = await query(
      `INSERT INTO sos_alerts (user_id, type, latitude, longitude, pincode, status) 
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
      [userId, type, latitude, longitude, pincode]
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
        alert: newAlert.rows[0],
        emergencyContacts: contacts.rows.map(r => r.contact_user_id)
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
      SELECT s.*, u.full_name, u.phone 
      FROM sos_alerts s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
    `);
    
    res.json({
      success: true,
      data: alerts.rows
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

    const alert = await queryOne(`UPDATE sos_alerts SET status = $1 WHERE id = $2 RETURNING *`, [resolution, id]);
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
    const contactUser = await queryOne(`SELECT id FROM users WHERE phone = $1`, [contactPhone]);
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
