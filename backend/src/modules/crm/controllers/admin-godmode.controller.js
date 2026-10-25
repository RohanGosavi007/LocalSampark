const { query, queryOne, withTransaction } = require('../../../config/database');
const { cacheDel } = require('../../../config/redis');

// ─── USER MANAGEMENT ────────────────────────────────────────

// Paged user directory. The console reads `users` and `total`; this answered only with `data`
// and `pagination`, so the Users tab and the dashboard's user table were always empty. Search
// covers name, phone and email (the tab filtered on phone_number/email, which were not selected),
// treats % and _ literally, and the page size is capped.
exports.getUsers = async (req, res, next) => {
  try {
    const { pageParams, likePattern } = require('../../../utils/paging');
    const { page, limit, offset } = pageParams(req.query);
    const params = [];
    let whereClause = '';
    if (req.query.search) {
      params.push(likePattern(req.query.search));
      whereClause = `WHERE LOWER(COALESCE(phone_number, '')) LIKE LOWER($1) ESCAPE '\\'
                      OR LOWER(COALESCE(full_name, '')) LIKE LOWER($1) ESCAPE '\\'
                      OR LOWER(COALESCE(email, '')) LIKE LOWER($1) ESCAPE '\\'`;
    }

    const countRes = await query(`SELECT COUNT(*) as count FROM users ${whereClause}`, params);
    const total = parseInt(countRes.rows ? countRes.rows[0].count : countRes[0].count, 10);

    params.push(limit, offset);
    const users = await query(`
      SELECT id, phone_number, phone_number AS phone, full_name, email, is_verified, is_banned, created_at, role, is_active
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    const rows = users.rows || users;

    res.json({
      success: true,
      users: rows,
      data: rows,
      total,
      page,
      limit,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
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
      await query(`INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.full_name || 'Admin', 'update_user_status', 'user', id, JSON.stringify({ is_active })]
      );
    } catch (e) {
      // The audited change has already been committed, so failing the request
      // here would report an error for work that actually succeeded. This
      // previously called next(e), which sent an error response and then fell
      // through to res.json below -- a double response. Because the insert
      // targeted a table that never existed, that happened on every single call.
      console.error('Audit log write failed:', e.message);
    }

    res.json({ success: true, message: 'User status updated successfully' });
  } catch (error) {
    next(error);
  }
};

// The roles users.role may hold. STAFF_ROLES are the ones that open the admin
// console; only a super administrator hands those out.
const STAFF_ROLES = ['admin', 'super_admin', 'territory_admin', 'area_agent', 'moderator', 'support_admin', 'marketing_admin', 'district_manager'];
const ASSIGNABLE_ROLES = ['user', 'shop_owner', 'delivery_agent', 'service_provider', 'field_agent', 'franchise_owner', 'society_admin', 'society_guard', ...STAFF_ROLES];

exports.updateUserRole = async (req, res, next) => {
  try {
        const { id } = req.params;
    const role = String((req.body || {}).role || '').trim().toLowerCase();

    // This wrote any string into users.role for any admin-tier caller. A
    // territory administrator or a moderator could make themselves — or
    // anyone — a super administrator, and a typo became a role nobody holds.
    if (!ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}` });
    }
    if (String(id) === String(req.user.id)) {
      return res.status(400).json({ success: false, error: 'You cannot change your own role.' });
    }
    const target = await queryOne('SELECT id, role FROM users WHERE id = $1', [id]);
    if (!target) return res.status(404).json({ success: false, error: 'User not found' });

    // Granting an administrative role, or changing someone who holds one, is
    // for a super administrator.
    const actorIsSuper = String(req.adminRole?.role || req.user.role || '').toLowerCase() === 'super_admin';
    const touchesStaff = STAFF_ROLES.includes(role) || STAFF_ROLES.includes(String(target.role || '').toLowerCase());
    if (touchesStaff && !actorIsSuper) {
      return res.status(403).json({ success: false, error: 'Only a super administrator can grant or change an administrative role.' });
    }

    await query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);

    
    try {
      await query(`INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.full_name || 'Admin', 'update_user_role', 'user', id, JSON.stringify({ role })]
      );
    } catch (e) {
      // The audited change has already been committed, so failing the request
      // here would report an error for work that actually succeeded. This
      // previously called next(e), which sent an error response and then fell
      // through to res.json below -- a double response. Because the insert
      // targeted a table that never existed, that happened on every single call.
      console.error('Audit log write failed:', e.message);
    }

    res.json({ success: true, message: 'User role updated successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── USER EXPORT ──────────────────────────────────────────
exports.exportUsers = async (req, res, next) => {
  try {
    const users = await query('SELECT id, full_name, phone, role, is_active, created_at FROM users ORDER BY created_at DESC');
    const rows = users.rows || users;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
    
    // CSV Header
    res.write('ID,Name,Phone,Role,Status,Joined Date\n');
    
    // CSV Rows
    rows.forEach(user => {
      const name = user.full_name ? `"${user.full_name.replace(/"/g, '""')}"` : 'Anonymous';
      const status = user.is_active !== false ? 'Active' : 'Blocked';
      const date = new Date(user.created_at).toISOString();
      res.write(`${user.id},${name},${user.phone},${user.role || 'user'},${status},${date}\n`);
    });
    
    res.end();
  } catch (error) {
    next(error);
  }
};

// ─── ROLE MANAGEMENT ────────────────────────────────────────

exports.getRoles = async (req, res, next) => {
  try {
    // admin_roles_config holds role definitions (role_name, description,
    // permissions). admin_roles is a different table: the per-user grant that
    // auth.middleware.js reads by user_id. This queried the latter for the
    // former's columns, so role management never worked.
    const roles = await query('SELECT * FROM admin_roles_config ORDER BY created_at DESC');
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
    const existing = await queryOne('SELECT * FROM admin_roles_config WHERE role_name = $1', [role_name]);
    let role;
    if (existing) {
        role = await queryOne(`UPDATE admin_roles_config SET permissions = $1, description = $2 WHERE role_name = $3 RETURNING *`, [JSON.stringify(permissions), description, role_name]);
    } else {
        role = await queryOne(`INSERT INTO admin_roles_config (role_name, permissions, description) VALUES ($1, $2, $3) RETURNING *`, [role_name, JSON.stringify(permissions), description]);
    }
    
    try {
      await query(`INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, req.user.full_name || 'Admin', 'upsert_role', 'role', role ? role.id : null, JSON.stringify({ role_name })]
      );
    } catch (e) {
      // The audited change has already been committed, so failing the request
      // here would report an error for work that actually succeeded. This
      // previously called next(e), which sent an error response and then fell
      // through to res.json below -- a double response. Because the insert
      // targeted a table that never existed, that happened on every single call.
      console.error('Audit log write failed:', e.message);
    }

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
