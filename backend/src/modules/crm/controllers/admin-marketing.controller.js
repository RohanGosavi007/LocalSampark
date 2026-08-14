const { query } = require('../../../config/database');
const crypto = require('crypto');
const { sendTopicPush } = require('../../../config/firebase');

// Audience keys map to the FCM topics devices subscribe to on login.
// The marketing and campaigns dashboards use different vocabularies for the
// same segments, so both are accepted here.
const AUDIENCE_TOPICS = {
  all_users: 'all_users',
  only_shops: 'shop_owners',
  all_shops: 'shop_owners',
  only_riders: 'delivery_agents',
  all_agents: 'delivery_agents',
};

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

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }
    const topic = AUDIENCE_TOPICS[target_audience || 'all_users'];
    if (!topic) {
      return res.status(400).json({
        success: false,
        message: `target_audience must be one of: ${Object.keys(AUDIENCE_TOPICS).join(', ')}`,
      });
    }

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
        [crypto.randomUUID(), adminId, 'CREATE_BROADCAST', 'marketing', newId, `Sent push notification: ${title}`]
      );
    } catch (e) {
      if (e.message.includes('relation "admin_broadcasts" does not exist') || e.message.includes('no such table')) {
        await query(`
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
        `);
        await query(`INSERT INTO admin_broadcasts (id, title, body, target_audience, deep_link, admin_id, sender_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [newId, title, body, target_audience, deep_link, adminId, adminName]
        );
      } else {
        throw e;
      }
    }

    // Dispatch the actual push. A delivery failure must not lose the broadcast
    // record, so the status is persisted rather than thrown.
    const push = await sendTopicPush(topic, title, body, deep_link ? { deep_link } : {});
    const status = push.success ? 'sent' : 'failed';

    try {
      await query('UPDATE admin_broadcasts SET status = $1 WHERE id = $2', [status, newId]);
    } catch (e) {
      console.error('[BROADCAST] Could not persist delivery status:', e.message);
    }

    res.json({
      success: true,
      status,
      messageId: push.messageId || null,
      message: push.success
        ? 'Broadcast dispatched to FCM successfully'
        : 'Broadcast saved, but push delivery failed. Check Firebase credentials.',
    });
  } catch (error) {
    next(error);
  }
};
