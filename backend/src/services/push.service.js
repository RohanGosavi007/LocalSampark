/**
 * Push notifications to a user's phones.
 *
 * The mobile app is built with Expo, whose push tokens look like
 * "ExponentPushToken[…]" and are delivered through Expo's push service. A
 * native FCM token (from a build that registers one) is delivered through
 * Firebase, when Firebase is configured (config/firebase.js).
 *
 * Before this, nothing reached a phone: the app never registered a token, the
 * server would have handed an Expo token to Firebase (which rejects it), and
 * in-app notifications (notification.service.js) were never pushed at all.
 *
 *   EXPO_ACCESS_TOKEN   optional; required only if "enhanced push security"
 *                       is switched on for the Expo project. Environment only.
 *
 * Tokens Expo reports as no longer registered (the app was uninstalled) are
 * removed, so they are not tried again.
 */

const { query, queryMany } = require('../config/database');
const firebase = require('../config/firebase');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH = 100;
const PUSH_TIMEOUT_MS = Number(process.env.PUSH_TIMEOUT_MS) || 10000;

const isExpoToken = (token) => /^Expo(nent)?PushToken\[[^\]]+\]$/.test(String(token || ''));

/** Whether a token is one we know how to deliver to. */
function validToken(token) {
  const t = String(token || '');
  return t.length >= 20 && t.length <= 4096 && (isExpoToken(t) || /^[\w:.-]+$/.test(t));
}

let transport = null;

/** Sends a batch of Expo messages; returns Expo's tickets. */
async function postToExpo(messages) {
  if (transport) return transport(messages);
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  // A bounded wait. sendToUser is awaited in request paths (an order status
  // change, an admin refund), so an Expo endpoint that never answers used to
  // hold that request open indefinitely. On timeout fetch rejects, and
  // sendToUser counts the batch as failed without failing the action.
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Expo push answered ${response.status}`);
  return Array.isArray(body.data) ? body.data : [];
}

async function forget(token) {
  await query('DELETE FROM user_fcm_tokens WHERE fcm_token = $1', [token]);
}

/**
 * Sends { title, body, data } to every device registered to `userId`.
 * Never throws: a push that cannot be delivered must not fail the action that
 * caused it. Returns { sent, failed }.
 */
async function sendToUser(userId, { title, body, data = {} }) {
  let sent = 0;
  let failed = 0;
  try {
    const rows = await queryMany('SELECT fcm_token FROM user_fcm_tokens WHERE user_id = $1', [String(userId)]);
    const tokens = rows.map((r) => r.fcm_token).filter(validToken);
    const expo = tokens.filter(isExpoToken);
    const native = tokens.filter((t) => !isExpoToken(t));

    for (let i = 0; i < expo.length; i += EXPO_BATCH) {
      const batch = expo.slice(i, i + EXPO_BATCH);
      try {
        const tickets = await postToExpo(batch.map((to) => ({ to, title, body, data, sound: 'default', channelId: 'default' })));
        for (let j = 0; j < batch.length; j += 1) {
          const ticket = tickets[j] || {};
          if (ticket.status === 'ok') {
            sent += 1;
          } else {
            failed += 1;
            if (ticket.details && ticket.details.error === 'DeviceNotRegistered') await forget(batch[j]);
          }
        }
      } catch (error) {
        failed += batch.length;
        console.error(`[push] Expo delivery failed: ${error.message}`);
      }
    }

    if (native.length) {
      if (firebase.isFirebaseInitialized()) {
        const result = await firebase.sendMulticastPush(native, title, body, data);
        sent += result.successCount || 0;
        failed += result.failureCount || 0;
      } else {
        failed += native.length;
      }
    }
  } catch (error) {
    console.error(`[push] could not push to ${userId}: ${error.message}`);
  }
  return { sent, failed };
}

/** Tests replace the network call to Expo; passing null restores it. */
function _setTransportForTests(fn) {
  transport = fn;
}

module.exports = { sendToUser, validToken, isExpoToken, _setTransportForTests };
