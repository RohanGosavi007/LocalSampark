// Crash-safe import of API_URL from the correct module path
import { API_URL } from '../lib/api';

/**
 * Mobile Firebase Phone Authentication Service
 * 
 * Usage with React Native Firebase:
 * Requires @react-native-firebase/app and @react-native-firebase/auth
 */

/**
 * Sends Firebase ID token obtained on mobile client to LocalSampark backend for login/signup
 * 
 * @param {string} idToken - Firebase ID Token
 * @param {Object} extraData - { fullName, regionId, pincode }
 */
export async function loginWithFirebaseToken(idToken, extraData = {}) {
  try {
    const response = await fetch(`${API_URL}/auth/firebase-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken,
        ...extraData
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Firebase backend authentication failed');
    }

    return data;
  } catch (error) {
    console.error('[FirebaseAuthService] Login Error:', error);
    throw error;
  }
}
