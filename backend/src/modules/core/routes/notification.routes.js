const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../../../middleware/auth.middleware');
const { query } = require('../../../config/database');
const { sendTopicPush } = require('../../../config/firebase');
const push = require('../../../services/push.service');
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

/**
 * POST /notifications/register-token { token, platform } — this device can
 * receive pushes for the signed-in user. Takes an Expo push token
 * (ExponentPushToken[…], what the app registers) or a native FCM token.
 * `fcmToken` is still read, for the old field name.
 *
 * The table is declared by migration 082 on both engines; if it is missing,
 * that is a migration problem and surfaces as one.
 */
router.post('/register-token', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const body = req.body || {};
    const token = body.token ?? body.fcmToken;
    const platform = ['ios', 'android', 'web'].includes(body.platform) ? body.platform : 'android';

    if (!push.validToken(token)) {
      return res.status(400).json({ error: 'A valid push token is required' });
    }

    // A token belongs to one device, and a device to whoever is signed in on
    // it now: the same phone signed in as someone else must stop receiving the
    // previous user's notifications.
    await query('DELETE FROM user_fcm_tokens WHERE fcm_token = $1 AND user_id <> $2', [token, userId]);
    await query(
      `INSERT INTO user_fcm_tokens (id, user_id, fcm_token, platform, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, fcm_token) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
      [uuidv4(), userId, token, platform]
    );

    res.json({ success: true, message: 'Push token registered' });
  } catch (error) {
    next(error);
  }
});

/** DELETE /notifications/register-token { token } — on sign-out, stop pushing to this device. */
router.delete('/register-token', authenticate, async (req, res, next) => {
  try {
    const body = req.body || {};
    const token = body.token ?? body.fcmToken;
    if (!token) return res.status(400).json({ error: 'token is required' });
    await query('DELETE FROM user_fcm_tokens WHERE fcm_token = $1 AND user_id = $2', [token, req.user.userId || req.user.id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /notifications/send — an administrator pushes a message to one user or
 * a Firebase topic.
 *
 * It was commented "admin only" and guarded by nothing but sign-in, so any
 * account could push any text to any user: a ready-made phishing channel.
 */
router.post('/send', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { targetUserId, topic, title, body, data } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }
    const message = { title: String(title).slice(0, 120), body: String(body).slice(0, 500), data: data || {} };

    if (topic) {
      return res.json(await sendTopicPush(String(topic), message.title, message.body, message.data));
    }
    if (targetUserId) {
      const result = await push.sendToUser(targetUserId, message);
      return res.json({ success: result.sent > 0, ...result });
    }

    res.status(400).json({ error: 'Provide targetUserId or topic' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /notifications/trigger-token-queue-update — for administrators.
 *
 * It let any signed-in account push "queue update" text of its own choosing to
 * any user. No app calls it; queue notifications belong to the token-queue
 * routes, which know who is actually waiting.
 */
router.post('/trigger-token-queue-update', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { targetUserId, shopName, currentToken, estimatedWait } = req.body || {};

    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }

    const result = await push.sendToUser(targetUserId, {
      title: `${String(shopName || 'Shop').slice(0, 60)} Queue Update`,
      body: `They are currently serving Token #${Number(currentToken) || 0}. Your estimated wait is ${Number(estimatedWait) || 0} mins.`,
      data: { type: 'token_queue' },
    });
    res.json({ success: result.sent > 0, ...result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
