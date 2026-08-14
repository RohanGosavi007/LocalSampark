const crypto = require('crypto');
const { query } = require('../../../config/database');

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_animal_rescue (
      id VARCHAR(255) PRIMARY KEY,
      reporter_name VARCHAR(255),
      phone VARCHAR(50),
      animal_type VARCHAR(100),
      severity VARCHAR(50),
      location TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      dispatched BOOLEAN DEFAULT false,
      admin_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

exports.getRequests = async (req, res, next) => {
  try {
    let requests = [];
    try {
      const result = await query("SELECT * FROM admin_animal_rescue ORDER BY CASE WHEN status = 'pending' THEN 1 ELSE 2 END, created_at DESC");
      requests = result.rows || result;
    } catch (e) {
      if (e.message.includes('relation "admin_animal_rescue" does not exist') || e.message.includes('no such table')) {
        await ensureTable();
        // Returns empty on first load since it was just created
      } else {
        throw e;
      }
    }
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

exports.createRequest = async (req, res, next) => {
  try {
    await ensureTable();
    const { reporter_name, phone, animal_type, severity, location } = req.body;
    const adminId = req.user.id || req.user.userId;
    const newId = crypto.randomUUID();

    await query(`INSERT INTO admin_animal_rescue (id, reporter_name, phone, animal_type, severity, location, admin_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newId, reporter_name, phone, animal_type, severity, location, adminId]
    );

    res.json({ success: true, message: 'Rescue request logged successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await query('UPDATE admin_animal_rescue SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: `Rescue status updated to ${status}` });
  } catch (error) {
    next(error);
  }
};

exports.toggleDispatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dispatched } = req.body;
    await query('UPDATE admin_animal_rescue SET dispatched = $1 WHERE id = $2', [dispatched, id]);
    res.json({ success: true, message: dispatched ? 'NGO Rescue Team Dispatched' : 'Dispatch Cancelled' });
  } catch (error) {
    next(error);
  }
};
