const crypto = require('crypto');
const { query } = require('../../../config/database');

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_jobs (
      id VARCHAR(255) PRIMARY KEY,
      title VARCHAR(255),
      description TEXT,
      salary VARCHAR(100),
      shop_name VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active',
      admin_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

exports.getJobs = async (req, res, next) => {
  try {
    let jobs = [];
    try {
      const result = await query("SELECT * FROM admin_jobs ORDER BY created_at DESC");
      jobs = result.rows || result;
    } catch (e) {
      if (e.message.includes('relation "admin_jobs" does not exist') || e.message.includes('no such table')) {
        await ensureTable();
        // Return empty since it was just created
      } else {
        throw e;
      }
    }
    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

exports.createJob = async (req, res, next) => {
  try {
    await ensureTable();
    const { title, description, salary, shop_name } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Job title is required' });
    }

    const adminId = req.user.id || req.user.userId;
    const newId = crypto.randomUUID();

    await query(`INSERT INTO admin_jobs (id, title, description, salary, shop_name, admin_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [newId, title, description || null, salary || null, shop_name || null, adminId]
    );

    res.json({ success: true, id: newId, message: 'Job listing published successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID = ['active', 'paused', 'closed'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VALID.join(', ')}` });
    }

    await query('UPDATE admin_jobs SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: `Job status updated to ${status}` });
  } catch (error) {
    next(error);
  }
};
