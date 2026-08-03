import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase client
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * Setup Invisible reCAPTCHA on a given button/container ID
 * @param {string} containerId - Element ID for reCAPTCHA widget
 */
export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (typeof window === 'undefined') return null;

  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response) => {
        // reCAPTCHA solved - allow signInWithPhoneNumber
      },
      'expired-callback': () => {
        // Response expired. Ask user to solve reCAPTCHA again.
      }
    });
  }

  return window.recaptchaVerifier;
}

/**
 * Send Phone OTP via Firebase
 * @param {string} phoneNumber - Standard E.164 phone number (+919876543210)
 * @param {string} containerId - reCAPTCHA container ID
 */
export async function sendFirebasePhoneOtp(phoneNumber, containerId = 'recaptcha-container') {
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
