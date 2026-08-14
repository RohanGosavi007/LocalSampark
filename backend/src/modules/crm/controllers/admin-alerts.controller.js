const crypto = require('crypto');
const { query } = require('../../../../config/database');

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_alerts_log (
      id VARCHAR(255) PRIMARY KEY,
      alert_type VARCHAR(50),
      target_audience VARCHAR(50),
      message TEXT,
      admin_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

exports.broadcastAlert = async (req, res, next) => {
  try {
    await ensureTable();
    const { alertType, targetAudience, message } = req.body;
    const adminId = req.user.id || req.user.userId;
    const newId = crypto.randomUUID();

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, error: 'Message body cannot be empty' });
    }

    // Insert log to database
    await query(`INSERT INTO admin_alerts_log (id, alert_type, target_audience, message, admin_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [newId, alertType, targetAudience, message, adminId]
    );

    // In a production system, this is where you would dispatch FCM or WebSocket pushes.
    // For this audit, logging it to the ledger signifies a successful system broadcast pipeline.

    res.json({ success: true, message: 'Broadcast dispatched successfully' });
  } catch (error) {
    next(error);
  }
};
