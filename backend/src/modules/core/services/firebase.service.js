const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// This requires a service account JSON file. In production, this should be parsed from an env var.
// For example: FIREBASE_SERVICE_ACCOUNT_JSON
let initialized = false;

function initFirebase() {
  if (initialized) return;
  
  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (serviceAccountStr && serviceAccountStr.trim().startsWith('{')) {
      const serviceAccount = JSON.parse(serviceAccountStr);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      admin.initializeApp({
        credential: admin.cert(serviceAccount)
      });
      initialized = true;
      console.log('[Firebase] Admin SDK initialized successfully');
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && !process.env.FIREBASE_PRIVATE_KEY.includes('REDACTED')) {
      admin.initializeApp({
        credential: admin.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
      initialized = true;
      console.log('[Firebase] Admin SDK initialized via individual env vars');
    } else {
      console.warn('[Firebase] Warning: Valid Firebase credentials not configured. Firebase Auth verification will be mocked (development mode).');
    }
  } catch (error) {
    console.error('[Firebase] Failed to initialize Admin SDK:', error.message);
  }
}

/**
 * Verify a Firebase ID token sent from the client
 * @param {string} idToken - The Firebase ID Token
 * @returns {Promise<Object|null>} - The decoded token containing phone_number or uid
 */
async function verifyFirebaseToken(idToken) {
  if (!initialized) {
    // Development fallback mock
    console.warn('[Firebase] Verifying mocked token (DEV ONLY)');
    if (idToken === 'mock_firebase_token') {
      return {
        uid: 'mock_uid_123',
        phone_number: '+919999999999',
        email: null
      };
    }
    throw new Error('Firebase Admin SDK not initialized');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('[Firebase] Token verification failed:', error.message);
    throw error;
  }
}

initFirebase();

module.exports = {
  admin,
  verifyFirebaseToken
};
