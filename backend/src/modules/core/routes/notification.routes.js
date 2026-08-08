const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middleware/auth.middleware');
const { query, queryOne } = require('../../../../config/database');
const { sendPushNotification, sendTopicPush } = require('../../../../config/firebase');
const { v4: uuidv4 } = require('uuid');

// Get user's notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const notifications = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    ).catch(() => []);
    res.json(notifications || []);
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    await query(
      'UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    ).catch(() => {});
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    await query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = $1',
      [userId]
    ).catch(() => {});
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
      await query(
        `INSERT INTO user_fcm_tokens (id, user_id, fcm_token, platform, updated_at) 
         VALUES ($1, $2, $3, $4, datetime('now'))
         ON CONFLICT(user_id, fcm_token) DO UPDATE SET updated_at = datetime('now')`,
        [uuidv4(), userId, fcmToken, platform || 'android']
      );
    } catch (e) {
      // Table might not exist yet — create it
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
      await query(
        `INSERT OR REPLACE INTO user_fcm_tokens (id, user_id, fcm_token, platform, updated_at) 
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
      const tokens = await query(
        'SELECT fcm_token FROM user_fcm_tokens WHERE user_id = $1',
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

    const tokens = await query(
      'SELECT fcm_token FROM user_fcm_tokens WHERE user_id = $1',
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
