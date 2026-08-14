const crypto = require('crypto');
const { query } = require('../../../../config/database');

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_roles_config (
      id VARCHAR(255) PRIMARY KEY,
      role_name VARCHAR(100) UNIQUE,
      description TEXT,
      permissions TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

exports.getRoles = async (req, res, next) => {
  try {
    let roles = [];
    try {
      const result = await query("SELECT * FROM admin_roles_config ORDER BY created_at ASC");
      roles = result.rows || result;
    } catch (e) {
      if (e.message.includes('relation "admin_roles_config" does not exist') || e.message.includes('no such table')) {
        await ensureTable();
        // Return empty since it was just created
      } else {
        throw e;
      }
    }
    res.json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
};

exports.upsertRole = async (req, res, next) => {
  try {
    await ensureTable();
    const { role_name, permissions, description } = req.body;
    
    if (!role_name) {
      return res.status(400).json({ success: false, error: 'role_name is required' });
    }

    const permsJson = JSON.stringify(permissions || {});

    // Check if role exists
    const existing = await query('SELECT id FROM admin_roles_config WHERE role_name = $1', [role_name]);
    const exists = (existing.rows && existing.rows.length > 0) || (Array.isArray(existing) && existing.length > 0);

    if (exists) {
      await query('UPDATE admin_roles_config SET permissions = $1, description = $2 WHERE role_name = $3',
        [permsJson, description || '', role_name]
      );
    } else {
      const newId = crypto.randomUUID();
      await query('INSERT INTO admin_roles_config (id, role_name, description, permissions) VALUES ($1, $2, $3, $4)',
        [newId, role_name, description || '', permsJson]
      );
    }

    res.json({ success: true, message: 'Role saved successfully' });
  } catch (error) {
    next(error);
  }
};
