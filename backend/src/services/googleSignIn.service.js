/**
 * Google Sign-In (Decision D3: with email OTP, the launch sign-in methods).
 *
 * Two kinds of proof are accepted, each checked by Google's own libraries:
 *   - the website signs in with Google through Firebase and sends the Firebase
 *     ID token; it must say the sign-in was by Google (sign_in_provider
 *     google.com) and carry a verified email;
 *   - the app signs in with Google directly and sends Google's ID token; its
 *     audience must be one of GOOGLE_OAUTH_CLIENT_IDS.
 * Either way the account is the one with that email.
 */
const { verifyFirebaseToken, firebaseReady } = require('../modules/core/services/firebase.service');

const clientIds = (env = { GOOGLE_OAUTH_CLIENT_IDS: process.env.GOOGLE_OAUTH_CLIENT_IDS }) => String(env.GOOGLE_OAUTH_CLIENT_IDS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

/** Whether either path is configured, so the clients offer the button. */
function enabled() {
  return firebaseReady() || clientIds().length > 0;
}

class GoogleSignInError extends Error {
  constructor(message, status = 401) { super(message); this.status = status; }
}

function identity({ email, email_verified: verified, name }) {
  if (!email || verified !== true) throw new GoogleSignInError('Google did not confirm an email address for this account.');
  return { email: String(email).trim().toLowerCase(), name: name ? String(name).slice(0, 100) : null };
}

async function verify({ firebaseIdToken, googleIdToken } = {}) {
  if (firebaseIdToken) {
    if (!firebaseReady()) throw new GoogleSignInError('Google sign-in is not available right now.', 503);
    let decoded;
    try { decoded = await verifyFirebaseToken(firebaseIdToken); } catch { throw new GoogleSignInError('Google sign-in could not be confirmed.'); }
    if (!decoded || !decoded.firebase || decoded.firebase.sign_in_provider !== 'google.com') {
      throw new GoogleSignInError('That sign-in was not made with Google.');
    }
    return identity(decoded);
  }
  if (googleIdToken) {
    const audience = clientIds();
    if (!audience.length) throw new GoogleSignInError('Google sign-in is not available right now.', 503);
    const { OAuth2Client } = require('google-auth-library');
    let payload;
    try {
      const ticket = await new OAuth2Client().verifyIdToken({ idToken: String(googleIdToken), audience });
      payload = ticket.getPayload();
    } catch {
      throw new GoogleSignInError('Google sign-in could not be confirmed.');
    }
    return identity(payload || {});
  }
  throw new GoogleSignInError('A Google sign-in token is required.', 400);
}

module.exports = { verify, enabled, clientIds, GoogleSignInError };
