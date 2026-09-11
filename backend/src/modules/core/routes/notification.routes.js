const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const { query, queryOne } = require('../../../config/database');
const { sendPushNotification, sendTopicPush } = require('../../../config/firebase');
const { v4: uuidv4 } = require('uuid');

/**
 * The signed-in user's notifications.
 *
 * This returned the driver's raw result object — {rows: [...]} on Postgres, a
 * bare array on SQLite — with no success flag. The mobile NotificationContext
 * checks `data.success` before accepting the response, so the check never
 * passed and the app fell back to three hard-coded notifications on every
 * launch, for every user, including one that said their grocery order had been
 * delivered and one announcing a water shut-off the next morning.
 *
 * The shape is now stable and the field names match what the client renders.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const result = await query(
      'SELECT * FROM shop_notifications WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    const rows = result?.rows || result || [];

    res.json({
      success: true,
      data: rows.map((n) => ({
        id: String(n.id),
        title: n.title,
        message: n.body || '',
        type: n.type,
        isRead: Boolean(Number(n.is_read)),
        actionUrl: n.action_url || null,
        createdAt: n.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    await query('UPDATE shop_notifications SET is_read = 1 WHERE id = $1 AND recipient_id = $2',
      [req.params.id, userId]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    await query('UPDATE shop_notifications SET is_read = 1 WHERE recipient_id = $1',
      [userId]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Register FCM token for push notifications
router.post('/register-token', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { fcmToken, platform } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    // Store/update FCM token
    try {
      await query(`INSERT INTO user_fcm_tokens (id, user_id, fcm_token, platform, updated_at) 
         VALUES ($1, $2, $3, $4, datetime('now'))
         ON CONFLICT(user_id, fcm_token) DO UPDATE SET updated_at = datetime('now')`,
        [uuidv4(), userId, fcmToken, platform || 'android']
      );
    } catch (e) {
      // Table might not exist yet â€” create it
      await query(`
        CREATE TABLE IF NOT EXISTS user_fcm_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          fcm_token TEXT NOT NULL,
          platform TEXT DEFAULT 'android',
          created_at DATETIME DEFAULT (datetime('now')),
          updated_at DATETIME DEFAULT (datetime('now')),
          UNIQUE(user_id, fcm_token)
        )
      `);
      await query(`INSERT OR REPLACE INTO user_fcm_tokens (id, user_id, fcm_token, platform, updated_at) 
         VALUES ($1, $2, $3, $4, datetime('now'))`,
        [uuidv4(), userId, fcmToken, platform || 'android']
      );
    }

    res.json({ success: true, message: 'FCM token registered' });
  } catch (error) {
    next(error);
  }
});

// Send push notification (admin only)
router.post('/send', authenticate, async (req, res, next) => {
  try {
    const { targetUserId, topic, title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    if (topic) {
      // Send to topic (e.g., all users in a region)
      const result = await sendTopicPush(topic, title, body, data || {});
      return res.json(result);
    }

    if (targetUserId) {
      // Send to specific user
      const tokens = await query('SELECT fcm_token FROM user_fcm_tokens WHERE user_id = $1',
        [targetUserId]
      ).catch(() => []);

      if (!tokens || tokens.length === 0) {
        return res.json({ success: false, message: 'No FCM tokens found for user' });
      }

      const results = [];
      for (const t of tokens) {
        const result = await sendPushNotification(t.fcm_token, title, body, data || {});
        results.push(result);
      }
      return res.json({ success: true, results });
    }

    res.status(400).json({ error: 'Provide targetUserId or topic' });
  } catch (error) {
    next(error);
  }
});

// Trigger push notification for token queue update
router.post('/trigger-token-queue-update', authenticate, async (req, res, next) => {
  try {
    const { targetUserId, shopName, currentToken, estimatedWait } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }

    const title = `${shopName} Queue Update`;
    const body = `They are currently serving Token #${currentToken}. Your estimated wait is ${estimatedWait} mins.`;

    const tokens = await query('SELECT fcm_token FROM user_fcm_tokens WHERE user_id = $1',
      [targetUserId]
    ).catch(() => []);

    if (!tokens || tokens.length === 0) {
      return res.json({ success: false, message: 'No FCM tokens found for user' });
    }

    const results = [];
    for (const t of tokens) {
      const result = await sendPushNotification(t.fcm_token, title, body, { type: 'token_queue' });
      results.push(result);
    }

    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
