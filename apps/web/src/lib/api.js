'use client';

/**
 * Shared API configuration for LocalSampark Web Frontend.
 * All pages and components should import from here instead of hardcoding URLs.
 */

// Where the API is lives in ./apiUrl.js, which has no 'use client' directive so that
// server components can import it too (a plain value imported from a client module
// reaches a server component as a client reference, not as the string).
import { API_URL, API_BASE } from './apiUrl.js';
export { API_URL, API_BASE };

/**
 * Get auth headers with bearer token from localStorage.
 * @returns {Object} Headers object with Authorization and Content-Type
 */
export function getAuthHeaders() {
  const token = typeof window !== 'undefined' 
    ? (localStorage.getItem('auth_token') || localStorage.getItem('admin_token') || '')
    : '';
  const territoryId = typeof window !== 'undefined' ? localStorage.getItem('territoryId') : '';
  const headers = {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  };
  // Territory-scoped routing: inject on every request
  if (territoryId) {
    headers['X-Territory-ID'] = territoryId;
  }
  return headers;
}

// ─── SESSION ────────────────────────────────────────────────────────────
//
// The access token is short-lived next to the refresh token, and nothing on
// the web ever used the refresh token — it was not even kept. A session simply
// stopped working when the access token expired, and every page then failed
// one request at a time. Requests made through apiFetch now refresh the
// session once on a 401 and retry; if the refresh is refused (signed out
// elsewhere, account disabled) the session is cleared and AuthContext is told.

export const SESSION_KEYS = {
  token: 'auth_token',
  refreshToken: 'auth_refresh_token',
  user: 'auth_user',
  role: 'active_role',
};

const storage = () => (typeof window === 'undefined' ? null : window.localStorage);

export function clearSession() {
  const ls = storage();
  if (!ls) return;
  Object.values(SESSION_KEYS).forEach((key) => ls.removeItem(key));
  ls.removeItem('token');
  window.dispatchEvent(new Event('auth:expired'));
}

let refreshing = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nativeFetch = (...args) => (typeof window !== 'undefined' && window.__nativeFetch ? window.__nativeFetch : fetch)(...args);

/**
 * Exchanges the refresh token for a new pair. One request at a time per tab.
 *
 * Resolves to:
 *   a string     the new access token
 *   null         the server REFUSED the refresh: signed out elsewhere, account
 *                disabled, token replayed. The session is over.
 *   undefined    could not tell (offline, server down, or a tab race that did not
 *                resolve). The session is NOT over; try again later.
 *
 * The distinction matters: this used to return null for all of them, and the
 * caller cleared the session, so a train tunnel signed people out.
 *
 * Refresh tokens are single-use. Two tabs refreshing in the same moment present
 * the same one; the server answers the second REFRESH_RACE, and the first tab has
 * by then stored a new pair, which this tab simply adopts.
 */
export function refreshSession() {
  const ls = storage();
  if (!ls) return Promise.resolve(undefined);
  if (refreshing) return refreshing;
  if (!ls.getItem(SESSION_KEYS.refreshToken)) return Promise.resolve(null);

  refreshing = (async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const sent = ls.getItem(SESSION_KEYS.refreshToken);
      if (!sent) return null;
      let res;
      try {
        res = await nativeFetch(`${API_BASE}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: sent }),
        });
      } catch (e) {
        return undefined;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.accessToken) {
        ls.setItem(SESSION_KEYS.token, data.accessToken);
        if (data.refreshToken) ls.setItem(SESSION_KEYS.refreshToken, data.refreshToken);
        window.dispatchEvent(new Event('auth:refreshed'));
        return data.accessToken;
      }
      if (data.code === 'REFRESH_RACE') {
        await sleep(400);
        // Another tab won and stored the new pair: use it.
        if (ls.getItem(SESSION_KEYS.refreshToken) !== sent) return ls.getItem(SESSION_KEYS.token);
        continue;
      }
      if (res.status >= 500 || res.status === 429) return undefined;
      return null; // 400/401/403: refused
    }
    return undefined;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

/** The expiry (ms since epoch) of a JWT, or null if it cannot be read. */
export function tokenExpiryMs(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    return exp ? exp * 1000 : null;
  } catch (e) {
    return null;
  }
}

const AUTH_ENDPOINTS = /\/auth\/(refresh-token|login|login-email|verify-otp|send-otp|send-whatsapp-otp|firebase-login|register|register-email|logout|forgot-password|reset-password|verify-email)/;

function headerOf(init, name) {
  const h = init && init.headers;
  if (!h) return null;
  if (typeof Headers !== 'undefined' && h instanceof Headers) return h.get(name);
  if (Array.isArray(h)) return (h.find(([k]) => String(k).toLowerCase() === name) || [])[1] || null;
  const key = Object.keys(h).find((k) => k.toLowerCase() === name);
  return key ? h[key] : null;
}

function withAuthorization(init, value) {
  const h = (init && init.headers) || {};
  const base = (typeof Headers !== 'undefined' && h instanceof Headers) ? Object.fromEntries(h.entries())
    : Array.isArray(h) ? Object.fromEntries(h) : { ...h };
  for (const k of Object.keys(base)) if (k.toLowerCase() === 'authorization') delete base[k];
  return { ...init, headers: { ...base, Authorization: value } };
}

/**
 * Makes every page's own fetch() survive a short-lived access token.
 *
 * Access tokens last an hour. Only 11 files go through apiFetch; 110 call fetch()
 * directly with the token they read from storage, so without this each would
 * start failing an hour after sign-in. Installed once: when a request to our API
 * that carried the user's session token comes back 401, the session is renewed
 * and the request is sent again with the new token (a 401 means nothing was
 * done, so repeating a write is safe). Requests that did not carry the user's
 * token (admin sessions, cookie sessions, sign-in itself) are left alone.
 * A refresh the server refuses ends the session; one that merely could not be
 * completed does not.
 */
export function installAuthFetch() {
  if (typeof window === 'undefined' || window.__authFetchInstalled) return;
  window.__authFetchInstalled = true;
  window.__nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const res = await window.__nativeFetch(input, init);
    if (res.status !== 401) return res;
    if (typeof input !== 'string' && !(typeof URL !== 'undefined' && input instanceof URL)) return res;

    const url = String(input);
    if (!url.startsWith(API_URL) || AUTH_ENDPOINTS.test(url)) return res;

    const sent = headerOf(init, 'authorization');
    const ls = storage();
    const current = ls && ls.getItem(SESSION_KEYS.token);
    if (!sent || !current || !ls.getItem(SESSION_KEYS.refreshToken)) return res;

    // Rotated by another request while this one was in flight: just use the new one.
    if (sent !== `Bearer ${current}`) return window.__nativeFetch(input, withAuthorization(init, `Bearer ${current}`));

    const next = await refreshSession();
    if (next) return window.__nativeFetch(input, withAuthorization(init, `Bearer ${next}`));
    if (next === null) clearSession();
    return res;
  };
}

const KEEP_ALIVE_EARLY_MS = 5 * 60 * 1000;

/**
 * Renews the session shortly before its access token expires, and when a hidden
 * tab becomes visible, so a signed-in person is never handed a 401 to recover
 * from. Returns a function that stops it.
 */
export function startSessionKeepAlive() {
  const ls = storage();
  if (!ls) return () => {};
  const tick = async () => {
    const token = ls.getItem(SESSION_KEYS.token);
    if (!token || !ls.getItem(SESSION_KEYS.refreshToken)) return;
    const exp = tokenExpiryMs(token);
    if (exp && exp - Date.now() > KEEP_ALIVE_EARLY_MS) return;
    if ((await refreshSession()) === null) clearSession();
  };
  const timer = setInterval(tick, 60 * 1000);
  const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
  document.addEventListener('visibilitychange', onVisible);
  tick();
  return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
}

/** An error from the API, with its status and body. */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = data && data.code;
    this.data = data;
  }
}

/**
 * fetch against the API with the session's token, refreshing it once on a 401.
 * `endpoint` is a path under /api/v1. Resolves to the parsed JSON body;
 * rejects with ApiError.
 */
export async function apiFetch(endpoint, init = {}) {
  const send = () => fetch(`${API_BASE}${endpoint}`, { ...init, headers: { ...getAuthHeaders(), ...(init.headers || {}) } });
  let res = await send();
  if (res.status === 401 && storage() && storage().getItem(SESSION_KEYS.refreshToken)) {
    const next = await refreshSession();
    if (next) res = await send();
    else if (next === null) clearSession();
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || data.message || `Request failed: ${res.status}`, res.status, data);
  }
  return data;
}

/** Authenticated GET under /api/v1. */
export function apiGet(endpoint) {
  return apiFetch(endpoint);
}

/** Authenticated POST under /api/v1. */
export function apiPost(endpoint, body) {
  return apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body ?? {}) });
}

/** Authenticated PUT under /api/v1. */
export function apiPut(endpoint, body) {
  return apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(body ?? {}) });
}

/** Authenticated DELETE under /api/v1. */
export function apiDelete(endpoint) {
  return apiFetch(endpoint, { method: 'DELETE' });
}

// ─── ADMIN-SPECIFIC HELPERS ─────────────────────────────────
// Admin dashboard pages store tokens under 'admin_token' key.

/**
 * Get admin auth headers with bearer token from localStorage.
 * @returns {Object} Headers object with Authorization and Content-Type
 */
export function getAdminAuthHeaders() {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('auth_token')) : '';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Make an admin-authenticated GET request.
 * @param {string} endpoint - API endpoint path (e.g., '/admin/users')
 * @returns {Promise<any>} Parsed JSON response
 */
export async function adminGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Make an admin-authenticated POST request.
 */
export async function adminPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Make an admin-authenticated PUT request.
 */
export async function adminPut(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}
