const { query, queryOne, withTransaction } = require('../../../config/database');
const { cacheDel } = require('../../../config/redis');

// ─── USER MANAGEMENT ────────────────────────────────────────

exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = '';
    const params = [];

    if (search) {
      whereClause = 'WHERE phone_number LIKE $1 OR full_name ILIKE $2';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countRes = await query(`SELECT COUNT(*) as count FROM users ${whereClause}`, params);
    const total = parseInt(countRes.rows ? countRes.rows[0].count : countRes[0].count);

    const queryStr = `
      SELECT id, phone, full_name, profile_status, created_at, role, is_active
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const users = await query(queryStr, params);

    res.json({
      success: true,
      data: users.rows || users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    await query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, id]);
    
    try {
      await query(
        `INSERT INTO admin_audit_logs (admin_id, admin_name, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.full_name || 'Admin', 'update_user_status', 'user', id, JSON.stringify({ is_active })]
      );
    } catch(e) {}

    res.json({ success: true, message: 'User status updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    await query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    
    try {
      await query(
        `INSERT INTO admin_audit_logs (admin_id, admin_name, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.full_name || 'Admin', 'update_user_role', 'user', id, JSON.stringify({ role })]
      );
    } catch(e) {}

    res.json({ success: true, message: 'User role updated successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── ROLE MANAGEMENT ────────────────────────────────────────

exports.getRoles = async (req, res, next) => {
  try {
    const roles = await query('SELECT * FROM admin_roles ORDER BY created_at DESC');
    res.json({ success: true, data: roles.rows || roles });
  } catch (error) {
    console.warn('Roles query failed:', error.message);
    res.json({ success: true, data: [] });
  }
};

exports.createOrUpdateRole = async (req, res, next) => {
  try {
    const { role_name, permissions, description } = req.body;
    
    // Fallback if ON CONFLICT doesn't work for sqlite if no unique constraint exists
    const existing = await queryOne('SELECT * FROM admin_roles WHERE role_name = $1', [role_name]);
    let role;
    if (existing) {
        role = await queryOne(`UPDATE admin_roles SET permissions = $1, description = $2 WHERE role_name = $3 RETURNING *`, [JSON.stringify(permissions), description, role_name]);
    } else {
        role = await queryOne(`INSERT INTO admin_roles (role_name, permissions, description) VALUES ($1, $2, $3) RETURNING *`, [role_name, JSON.stringify(permissions), description]);
    }
    
    try {
      await query(
        `INSERT INTO admin_audit_logs (admin_id, admin_name, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.full_name || 'Admin', 'upsert_role', 'role', role ? role.id : null, JSON.stringify({ role_name })]
      );
    } catch(e) {}

    res.json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
};

// ─── REGIONS MANAGEMENT ─────────────────────────────────────

exports.getRegions = async (req, res, next) => {
  try {
    const regions = await query('SELECT * FROM zones ORDER BY created_at DESC');
    res.json({ success: true, data: regions.rows || regions });
  } catch (error) {
    console.warn('Regions query failed:', error.message);
    res.json({ success: true, data: [] });
  }
};
