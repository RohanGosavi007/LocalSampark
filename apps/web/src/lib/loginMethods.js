/**
 * Which ways of signing in to offer (C1, Decision D3), free of React so it can
 * be tested with node --test.
 *
 * Launch sign-in is by an emailed code or Google. Phone OTP is offered only
 * when the server says it is on (ENABLE_PHONE_OTP, after DLT registration):
 * before, the page always showed a phone tab, which in production could only
 * fail. Password sign-in stays for accounts that were made with a password.
 */

/** What /auth/methods reports, assumed until it answers (or if it cannot). */
export const DEFAULT_METHODS = Object.freeze({ emailOtp: true, google: false, phoneOtp: false });

export function readMethods(body) {
  const m = (body && body.methods) || {};
  return {
    emailOtp: m.emailOtp !== false,
    google: m.google === true,
    phoneOtp: m.phoneOtp === true,
  };
}

/** The tabs on the sign-in page, in order; the first is the default. */
export function loginTabs(methods = DEFAULT_METHODS) {
  const tabs = [];
  if (methods.emailOtp !== false) tabs.push({ id: 'emailOtp', label: 'Email code' });
  tabs.push({ id: 'password', label: 'Password' });
  if (methods.phoneOtp === true) tabs.push({ id: 'phone', label: 'Phone OTP' });
  return tabs;
}

/** Google needs the server to accept it and this site to have Firebase set up. */
export function offerGoogle(methods = DEFAULT_METHODS, firebaseConfigured = false) {
  return methods.google === true && Boolean(firebaseConfigured);
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export function normaliseEmail(value) {
  const v = typeof value === 'string' ? value.trim() : '';
  return EMAIL.test(v) && v.length <= 254 ? v.toLowerCase() : null;
}

/** A code is 4 to 8 digits; spaces typed or pasted in are ignored. */
export function cleanCode(value) {
  const v = String(value || '').replace(/\s+/g, '');
  return /^\d{4,8}$/.test(v) ? v : null;
}
