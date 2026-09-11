'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

import { API_BASE } from '../lib/api';

/**
 * Global 401 interceptor.
 *
 * This patches window.fetch, which is a blunt instrument, so it is deliberately
 * narrow about what it acts on. Two problems with the original:
 *
 *  1. It signed the admin out on ANY 401 from ANY origin. A third-party widget,
 *    an analytics beacon, a Next.js asset probe or a CDN returning 401 logged
 *    the user out of the admin panel mid-edit. Only responses from our own API
 *    (API_BASE) should ever be treated as "your admin session ended".
 *
 *  2. It fired on every 401 in a burst. Ten tabs loading in parallel against an
 *     expired token each reassigned window.location, and it cleared storage and
 *     navigated while still returning the response to the caller, which then ran
 *     `await res.json()` against a document that was being torn down.
 *
 * It now matches on origin, fires once per page life, and lets the caller's own
 * error handling run: fetchJson in src/lib/api.js already turns a 401 into a
 * readable AdminApiError, and the redirect follows on the next tick.
 */
const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'X-CSRF-Token';

/**
 * Reads the CSRF value the server set at login.
 *
 * This cookie is intentionally NOT httpOnly -- the whole double-submit scheme
 * depends on our own page being able to read it and echo it back, while a page
 * on another origin cannot. The session token beside it stays httpOnly and is
 * never visible here.
 */
function readCsrfCookie() {
  try {
    const match = document.cookie.match(
      new RegExp('(?:^|;\\s*)' + CSRF_COOKIE + '=([^;]*)')
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function isOurApiRequest(input) {
  try {
    const url =
      typeof input === 'string' ? input
      : input instanceof Request ? input.url
      : input instanceof URL ? input.href
      : String(input ?? '');
    // API_BASE may be relative in some deployments; resolve both against the
    // current origin so the comparison is apples to apples.
    return new URL(url, window.location.origin).href.startsWith(
      new URL(API_BASE, window.location.origin).href
    );
  } catch {
    return false;
  }
}

if (typeof window !== 'undefined' && !window.__fetch_patched) {
  window.__fetch_patched = true;
  const originalFetch = window.fetch;
  let sessionEndHandled = false;

  window.fetch = async (...args) => {
    // Attach the session cookie and its CSRF partner to our own API calls.
    //
    // Doing it here rather than at ~38 call sites is deliberate: every admin
    // tab calls fetch directly with only `headers: authHeaders()`, and any tab
    // that forgot `credentials` would silently fall back to an unauthenticated
    // request. Third-party requests are left completely untouched -- sending
    // credentials to them is exactly what we do not want.
    if (isOurApiRequest(args[0])) {
      const init = { ...(args[1] || {}) };
      init.credentials = init.credentials || 'include';

      const csrf = readCsrfCookie();
      if (csrf) {
        // Headers may arrive as a plain object, a Headers instance, or an
        // array of pairs; normalise before adding so none of those are lost.
        const headers = new Headers(init.headers || {});
        if (!headers.has(CSRF_HEADER)) headers.set(CSRF_HEADER, csrf);
        init.headers = headers;
      }
      args[1] = init;
    }

    const response = await originalFetch(...args);

    if (response.status === 401 && !sessionEndHandled && isOurApiRequest(args[0])) {
      sessionEndHandled = true;
      try {
        // The session token itself is an httpOnly cookie that script cannot
        // clear; the server drops it on POST /admin-auth/logout, and an expired
        // one is harmless anyway. Only the cached display record lives here.
        localStorage.removeItem('admin_user');
      } catch {
        // Private mode / blocked storage: the redirect below still matters.
      }
      // Deferred so this call's caller can read the body and surface its own
      // message before the navigation replaces the document.
      setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }, 0);
    }

    return response;
  };
}

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  // No token state: it lives in an httpOnly cookie the browser sends for us and
  // this code is not able to read. Nothing consumed it from the context.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore the session on load.
  //
  // There is no longer a token in localStorage to check -- it is an httpOnly
  // cookie this code cannot see -- so the only way to know whether the session
  // is live is to ask the server. admin_user is read first purely so the shell
  // can render immediately instead of flashing the login page, and is then
  // confirmed or discarded by GET /admin-auth/me.
  useEffect(() => {
    let cancelled = false;

    try {
      const cachedAdmin = localStorage.getItem('admin_user');
      if (cachedAdmin) setAdmin(JSON.parse(cachedAdmin));
    } catch {
      // Unreadable cache is not an error; /me below is the real answer.
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/admin-auth/me`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const user = data.user || data;
          setAdmin(user);
          try {
            localStorage.setItem('admin_user', JSON.stringify(user));
          } catch { /* storage blocked; in-memory state is enough */ }
        } else {
          // A 401 is already being handled by the global interceptor above,
          // which clears the cache and redirects. Anything else (server down,
          // 500) should not throw the admin out of a session that may be fine.
          if (res.status === 401 || res.status === 403) setAdmin(null);
        }
      } catch {
        // Network failure: keep whatever the cache gave us rather than
        // bouncing a working session to /login because the API blipped.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const loginAdmin = async (phoneNumber, pin, otp) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, pin, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Admin login failed');
      
      if (data.success) {
        // data.accessToken is deliberately NOT persisted. The server set it as
        // an httpOnly cookie on this response, which the browser now sends
        // automatically and no script -- including an injected one -- can read.
        // Only the non-secret display record is cached.
        try {
          localStorage.setItem('admin_user', JSON.stringify(data.user));
        } catch { /* storage blocked; in-memory state is enough */ }
        setAdmin(data.user);
      }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Signing out is now a server round trip: an httpOnly cookie cannot be
  // deleted from here, so dropping local state alone would leave the session
  // fully valid and replayable.
  const logoutAdmin = async () => {
    try {
      await fetch(`${API_BASE}/admin-auth/logout`, { method: 'POST' });
    } catch {
      // Even if the call fails, clear local state so the UI does not claim to
      // still be signed in.
    }
    try {
      localStorage.removeItem('admin_user');
    } catch { /* ignore */ }
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, error, loginAdmin, logoutAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
