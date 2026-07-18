/**
 * Firebase Admin SDK Configuration
 * Handles initialization for Auth (SMS OTP) and Cloud Messaging (Push Notifications)
 * 
 * Setup Steps:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project "LocalSampark"
 * 3. Go to Project Settings > Service Accounts > Generate New Private Key
 * 4. Copy the values into your .env file
 */

let admin = null;
let messaging = null;
let isInitialized = false;

try {
  admin = require('firebase-admin');

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (projectId && privateKey && clientEmail) {
    // Parse the private key (it comes as escaped string from env)
    const parsedKey = privateKey.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey: parsedKey,
        clientEmail,
      }),
    });

    messaging = admin.messaging();
    isInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    console.warn('⚠️ Firebase credentials not configured — SMS OTP and Push will use fallback mode');
  }
} catch (error) {
  console.warn('⚠️ firebase-admin not installed. Run: npm install firebase-admin');
  console.warn('   Continuing without Firebase — SMS OTP and Push will use fallback mode');
}

/**
 * Send push notification to a single device
 * @param {string} fcmToken - Device FCM token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Optional data payload
 */
async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!isInitialized || !messaging) {
    console.log(`[PUSH STUB] To: ${fcmToken?.slice(0, 20)}... | ${title}: ${body}`);
    return { success: false, reason: 'Firebase not configured' };
  }

  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: {
          channelId: 'localsampark_default',
          sound: 'default',
          icon: 'ic_notification',
        },
      },
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1 },
        },
      },
    };

    const response = await messaging.send(message);
    console.log(`[PUSH] Sent to ${fcmToken?.slice(0, 20)}...: ${title}`);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('[PUSH ERROR]', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to multiple devices
 * @param {string[]} fcmTokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Optional data payload
 */
async function sendMulticastPush(fcmTokens, title, body, data = {}) {
  if (!isInitialized || !messaging || !fcmTokens?.length) {
    console.log(`[PUSH STUB] Multicast to ${fcmTokens?.length || 0} devices: ${title}`);
    return { successCount: 0, failureCount: fcmTokens?.length || 0 };
  }

  try {
    const message = {
      tokens: fcmTokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`[PUSH] Multicast: ${response.successCount} sent, ${response.failureCount} failed`);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('[PUSH MULTICAST ERROR]', error.message);
    return { successCount: 0, failureCount: fcmTokens.length };
  }
}

/**
 * Send push to a topic (e.g., all users in a region)
 * @param {string} topic - Topic name (e.g., 'region_pune_dhanori')
 * @param {string} title
 * @param {string} body
 * @param {Object} data
 */
async function sendTopicPush(topic, title, body, data = {}) {
  if (!isInitialized || !messaging) {
    console.log(`[PUSH STUB] Topic "${topic}": ${title}`);
    return { success: false };
  }

  try {
    const response = await messaging.send({
      topic,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    });
    return { success: true, messageId: response };
  } catch (error) {
    console.error('[TOPIC PUSH ERROR]', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  firebaseAdmin: admin,
  messaging,
  isFirebaseInitialized: () => isInitialized,
  sendPushNotification,
  sendMulticastPush,
  sendTopicPush,
};
