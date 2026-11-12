/**
 * Signing in and out (C1, Decision D3), kept apart from React so it can be
 * tested with fetch stubbed.
 *
 * Launch sign-in is by an emailed code or Google; phone OTP only when the
 * server reports it on (ENABLE_PHONE_OTP, after DLT registration). Signing
 * out tells the server: the app used to delete its tokens and nothing else,
 * so a token copied off the phone went on working for its whole life.
 */
import * as apiLib from '../lib/api';

export const DEFAULT_METHODS = Object.freeze({ emailOtp: true, google: false, phoneOtp: false });

export function readMethods(body) {
  const m = (body && body.methods) || {};
  return { emailOtp: m.emailOtp !== false, google: m.google === true, phoneOtp: m.phoneOtp === true };
}

/** The tabs on the sign-in screen, in order; the first is the default. */
export function loginTabs(methods = DEFAULT_METHODS) {
  const tabs = [];
  if (methods.emailOtp !== false) tabs.push({ id: 'emailOtp', label: 'Email code' });
  tabs.push({ id: 'password', label: 'Password' });
  if (methods.phoneOtp === true) tabs.push({ id: 'phone', label: 'Phone OTP' });
  return tabs;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
export function normaliseEmail(value) {
  const v = typeof value === 'string' ? value.trim() : '';
  return EMAIL.test(v) && v.length <= 254 ? v.toLowerCase() : null;
}
export function cleanCode(value) {
  const v = String(value || '').replace(/\s+/g, '');
  return /^\d{4,8}$/.test(v) ? v : null;
}

const deps = (d = {}) => ({ fetch: d.fetch || global.fetch, apiUrl: d.apiUrl || apiLib.API_URL });

async function post(path, body, d, headers = {}) {
  const { fetch, apiUrl } = deps(d);
  const res = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

/** What the server has open; the launch default if it cannot be asked. */
export async function fetchLoginMethods(d) {
  const { fetch, apiUrl } = deps(d);
  try {
    const res = await fetch(`${apiUrl}/auth/methods`);
    return res.ok ? readMethods(await res.json()) : { ...DEFAULT_METHODS };
  } catch {
    return { ...DEFAULT_METHODS };
  }
}

export async function sendEmailCode(email, d) {
  const address = normaliseEmail(email);
  if (!address) throw new Error('Please enter a valid email address.');
  return post('/auth/email/send-otp', { email: address }, d);
}

/**
 * { registered: false } means a new address: ask for a name and call again
 * with it. Otherwise the session ({ user, accessToken, refreshToken }).
 */
export async function verifyEmailCode(email, code, fullName, d) {
  const address = normaliseEmail(email);
  const otp = cleanCode(code);
  if (!address || !otp) throw new Error('Enter the code from the email.');
  const name = typeof fullName === 'string' ? fullName.trim() : '';
  return post('/auth/email/verify-otp', { email: address, otp, ...(name ? { fullName: name } : {}) }, d);
}

/**
 * The app's Google OAuth client ids (Google Cloud console; owner action).
 * Each is read by its full literal name so Expo inlines it into the bundle. The server must list the same ids in GOOGLE_OAUTH_CLIENT_IDS.
 */
export function googleClientIds() {
  return {
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
  };
}

/** Whether to offer Google: the server accepts it and this build has a client id. */
export function offerGoogle(methods, ids = googleClientIds()) {
  return Boolean(methods && methods.google === true && ids.androidClientId);
}

/** Google Sign-In from the app: Google's ID token, checked by the server. */
export async function googleSignIn(googleIdToken, d) {
  if (!googleIdToken) throw new Error('Google sign-in was cancelled.');
  return post('/auth/google', { googleIdToken }, d);
}

/**
 * Ends this session on the server, or every session with allDevices. Through
 * apiPost, so an expired access token is refreshed first: a bare request
 * would get a 401 and leave the refresh token alive. Resolves to whether the
 * server confirmed; the caller clears the phone either way.
 */
export async function signOutOnServer({ allDevices = false } = {}, d = {}) {
  const api = d.api || apiLib;
  try {
    await api.apiPost('/auth/logout', { allDevices: Boolean(allDevices) });
    return true;
  } catch (e) {
    // Signed out there already (401 even after a refresh) is what was wanted.
    return Boolean(e && e.status === 401);
  }
}
