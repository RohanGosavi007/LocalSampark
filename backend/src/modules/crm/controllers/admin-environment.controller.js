const { query } = require('../../../../config/database');
const crypto = require('crypto');

exports.getRequests = async (req, res, next) => {
  try {
    let requests;
    try {
      const result = await query("SELECT * FROM environment_scrap ORDER BY CASE WHEN status = 'pending' THEN 1 ELSE 2 END, created_at DESC");
      requests = result.rows || result;
    } catch (e) {
      requests = [];
    }
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

exports.createRequest = async (req, res, next) => {
  try {
    const { user_name, phone, scrap_type, estimated_weight, address } = req.body;
    const adminId = req.user.id || req.user.userId;
    const newId = crypto.randomUUID();

    try {
      await query(`INSERT INTO environment_scrap (id, user_name, phone, scrap_type, estimated_weight, address, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newId, user_name, phone, scrap_type, estimated_weight, address, adminId]
      );
      
      await query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), adminId, 'LOG_SCRAP_REQUEST', 'environment', newId, \`Scheduled scrap pickup for \${user_name}\`]
      );
    } catch (e) {
      if (e.message.includes('relation "environment_scrap" does not exist') || e.message.includes('no such table')) {
        await query(\`
          CREATE TABLE environment_scrap (
            id VARCHAR(255) PRIMARY KEY,
            user_name VARCHAR(255),
            phone VARCHAR(50),
            scrap_type VARCHAR(255),
            estimated_weight VARCHAR(100),
            address TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            dispatched BOOLEAN DEFAULT false,
            created_by VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        \`);
        await query(`INSERT INTO environment_scrap (id, user_name, phone, scrap_type, estimated_weight, address, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [newId, user_name, phone, scrap_type, estimated_weight, address, adminId]
        );
      } else {
        throw e;
      }
    }

    res.json({ success: true, message: 'Pickup scheduled successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await query('UPDATE environment_scrap SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: \`Status updated to \${status}\` });
  } catch (error) {
    next(error);
  }
};

exports.toggleDispatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dispatched } = req.body;
    await query('UPDATE environment_scrap SET dispatched = $1 WHERE id = $2', [dispatched, id]);
    res.json({ success: true, message: dispatched ? 'Collector dispatched' : 'Dispatch cancelled' });
  } catch (error) {
    next(error);
  }
};
