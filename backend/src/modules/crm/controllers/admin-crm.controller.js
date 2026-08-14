const { query, withTransaction } = require('../../../config/database');

exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // In PostgreSQL, full_name is 'name', phone_number is 'phone' based on Prisma schema.
    const usersResult = await query(`SELECT id, name AS full_name, phone AS phone_number, role, loyalty_points, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    res.json({ success: true, data: usersResult.rows || usersResult });
  } catch (error) {
    next(error);
  }
};

exports.adjustLoyalty = async (req, res, next) => {
  try {
    const { user_id, points, reason } = req.body;
    
    if (!user_id || points === undefined) {
      return res.status(400).json({ success: false, error: 'user_id and points are required' });
    }

    await withTransaction(async (client) => {
      // Ensure user exists
      const userResult = await client.query('SELECT id, loyalty_points FROM users WHERE id = $1', [user_id]);
      const user = userResult.rows ? userResult.rows[0] : userResult[0];
      
      if (!user) {
        throw new Error('User not found');
      }

      // Update points
      await client.query('UPDATE users SET loyalty_points = COALESCE(loyalty_points, 0) + $1 WHERE id = $2',
        [points, user_id]
      );

      // Audit log (using admin_audit_log with safe fallback)
      try {
        const crypto = require('crypto');
        await client.query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            crypto.randomUUID(), 
            req.user.id || req.user.userId, 
            'LOYALTY_ADJUSTMENT', 
            'user', 
            user_id, 
            `Adjusted ${points} points. Reason: ${reason || 'N/A'}`
          ]
        );
      } catch (logErr) {
        // Safe pass if audit log table not yet migrated
      }
    });

    res.json({ success: true, message: 'Loyalty points adjusted successfully' });
  } catch (error) {
    next(error);
  }
};
