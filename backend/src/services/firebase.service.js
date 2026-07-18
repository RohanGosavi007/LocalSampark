const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// This requires a service account JSON file. In production, this should be parsed from an env var.
// For example: FIREBASE_SERVICE_ACCOUNT_JSON
let initialized = false;

function initFirebase() {
  if (initialized) return;
  
  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (serviceAccountStr) {
      const serviceAccount = JSON.parse(serviceAccountStr);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      initialized = true;
      console.log('[Firebase] Admin SDK initialized successfully');
    } else {
      console.warn('[Firebase] Warning: FIREBASE_SERVICE_ACCOUNT_JSON not set. Firebase Auth verification will be mocked.');
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
