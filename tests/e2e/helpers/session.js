// @ts-check
/**
 * Signs a customer in through the real OTP API and hands the session to the
 * web app the way its own login does (localStorage keys from
 * apps/web/src/lib/api.js SESSION_KEYS).
 *
 * +91 9000… numbers are the backend's development test numbers: send-otp
 * stores a fixed code for them only when demo login is allowed, which the
 * E2E backend (NODE_ENV=development) permits and production never does.
 */
const { expect } = require('@playwright/test');

const API = 'http://localhost:5000/api/v1';
const SHOPPER_PHONE = '+919000000001';
const DEV_OTP = '123456';

/**
 * A code is consumed when verified, so two specs signing in as the same
 * number at once can take each other's code; such a refusal is retried with
 * a fresh code. `fullName` registers a number that has no account yet.
 */
async function apiSession(request, phone = SHOPPER_PHONE, fullName) {
  let last = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const sent = await request.post(`${API}/auth/send-otp`, { data: { phoneNumber: phone } });
    expect(sent.ok(), `send-otp ${sent.status()} ${await sent.text()}`).toBeTruthy();
    // The E2E backend runs with ALLOW_FREE_OTP_MODE (development only), so
    // send-otp returns the code it issued; +91 9000… numbers get a fixed one.
    const code = (await sent.json()).otp || DEV_OTP;
    const verified = await request.post(`${API}/auth/verify-otp`, {
      data: { phoneNumber: phone, otp: code, ...(fullName ? { fullName } : {}) },
    });
    if (verified.ok()) {
      const body = await verified.json();
      expect(body.accessToken, `verify-otp returned a session: ${JSON.stringify(body)}`).toBeTruthy();
      return body;
    }
    last = `${verified.status()} ${await verified.text()}`;
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 400));
  }
  throw new Error(`could not sign in ${phone}: ${last}`);
}

/**
 * A number with no account yet, for a spec that needs a customer of its own.
 * Not a +91 9000… number: those are demo logins that never create an account.
 * Registered through the real verify-otp path when signed in with a fullName.
 */
function freshPhone() {
  return `+9198${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
}

/** Installs an existing session before any page script runs (no new OTP is requested). */
async function installSession(page, session) {
  await page.addInitScript((s) => {
    try {
      localStorage.setItem('auth_token', s.accessToken);
      if (s.refreshToken) localStorage.setItem('auth_refresh_token', s.refreshToken);
      localStorage.setItem('auth_user', JSON.stringify(s.user));
      localStorage.setItem('localsampark_tour_seen', 'true');
      localStorage.setItem('localsampark_consent', 'accepted');
    } catch { /* storage blocked */ }
  }, session);
}

/** Signs in and installs the session before any page script runs. */
async function signInCustomer(page, phone = SHOPPER_PHONE, fullName) {
  const session = await apiSession(page.request, phone, fullName);
  await installSession(page, session);
  return session;
}

module.exports = { API, SHOPPER_PHONE, apiSession, signInCustomer, installSession, freshPhone };
