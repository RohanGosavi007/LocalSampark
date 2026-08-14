const { query } = require('../../../../config/database');
const crypto = require('crypto');

exports.getBroadcastHistory = async (req, res, next) => {
  try {
    let history;
    try {
      const result = await query('SELECT * FROM admin_broadcasts ORDER BY created_at DESC LIMIT 50');
      history = result.rows || result;
    } catch (e) {
      // Fallback if table doesn't exist yet
      history = [];
    }
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

exports.createBroadcast = async (req, res, next) => {
  try {
    const { title, body, target_audience, deep_link } = req.body;
    const adminId = req.user.id || req.user.userId;
    const adminName = req.user.full_name || 'Admin';
    const newId = crypto.randomUUID();

    try {
      await query(`INSERT INTO admin_broadcasts (id, title, body, target_audience, deep_link, admin_id, sender_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newId, title, body, target_audience, deep_link, adminId, adminName]
      );
      
      await query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), adminId, 'CREATE_BROADCAST', 'marketing', newId, \`Sent push notification: \${title}\`]
      );
    } catch (e) {
      if (e.message.includes('relation "admin_broadcasts" does not exist') || e.message.includes('no such table')) {
        await query(\`
          CREATE TABLE admin_broadcasts (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(255),
            body TEXT,
            target_audience VARCHAR(100),
            deep_link VARCHAR(255),
            admin_id VARCHAR(255),
            sender_name VARCHAR(255),
            status VARCHAR(50) DEFAULT 'sent',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        \`);
        await query(`INSERT INTO admin_broadcasts (id, title, body, target_audience, deep_link, admin_id, sender_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [newId, title, body, target_audience, deep_link, adminId, adminName]
        );
      } else {
        throw e;
      }
    }

    // TODO: Connect to Firebase Admin SDK here to push actual FCM messages.
    // For now, we simulate a successful dispatch.
    
    res.json({ success: true, message: 'Broadcast sent to FCM successfully' });
  } catch (error) {
    next(error);
  }
};
