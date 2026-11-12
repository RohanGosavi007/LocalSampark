import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'mock-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mock.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mock-project-id',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'mock.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'mock-sender-id',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'mock-app-id',
};

/**
 * Whether a real Firebase project is configured. Without one the client is
 * still initialised on the placeholders above (other modules import `auth`),
 * but phone sign-in must not be attempted: it called Google with
 * "mock-api-key", put up a reCAPTCHA, and only fell back to the server's OTP
 * after that failed, if the customer got that far.
 */
export const firebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

// Initialize Firebase client
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * Setup Invisible reCAPTCHA on a given button/container ID
 * @param {string} containerId - Element ID for reCAPTCHA widget
 */
export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (typeof window === 'undefined') return null;

  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {}
    window.recaptchaVerifier = null;
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: (response) => {
      // reCAPTCHA solved - allow signInWithPhoneNumber
    },
    'expired-callback': () => {
      // Response expired. Ask user to solve reCAPTCHA again.
    }
  });

  return window.recaptchaVerifier;
}

/**
 * Send Phone OTP via Firebase
 * @param {string} phoneNumber - Standard E.164 phone number (+919876543210)
 * @param {string} containerId - reCAPTCHA container ID
 */
export async function sendFirebasePhoneOtp(phoneNumber, containerId = 'recaptcha-container') {
  if (!firebaseConfigured) {
    // The caller falls back to the server's OTP.
    throw new Error('Firebase phone sign-in is not configured');
  }
  try {
    const appVerifier = setupRecaptcha(containerId);
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    window.confirmationResult = confirmationResult;
    return { success: true, confirmationResult };
  } catch (error) {
    console.error('Firebase Phone OTP Error:', error);
    throw error;
  }
}

/**
 * Verify Phone OTP code and get Firebase ID Token
 * @param {string} code - 6-digit OTP code entered by user
 */
export async function verifyFirebasePhoneOtp(code) {
  try {
    if (!window.confirmationResult) {
      throw new Error('No pending OTP verification found. Please request OTP again.');
    }
    const result = await window.confirmationResult.confirm(code);
    const user = result.user;
    const idToken = await user.getIdToken();
    return { user, idToken };
  } catch (error) {
    console.error('Firebase OTP Verification Error:', error);
    throw error;
  }
}

/**
 * Google Sign-In (C1, Decision D3): a Google pop-up through Firebase. Resolves
 * to the Firebase ID token, which the server checks (POST /auth/google).
 */
export async function signInWithGoogle() {
  if (!firebaseConfigured) throw new Error('Google sign-in is not available on this site yet.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}
