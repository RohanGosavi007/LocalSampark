'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL, apiFetch, clearSession, SESSION_KEYS, installAuthFetch, startSessionKeepAlive } from '@/lib/api';

import { sendFirebasePhoneOtp, verifyFirebasePhoneOtp, signInWithGoogle } from '@/lib/firebase';
import { DEFAULT_METHODS, readMethods } from '@/lib/loginMethods';

const AuthContext = createContext(null);

/**
 * The seeded demo accounts (backend/src/seeds/seed-investor-demo.js), by the
 * role names the developer sign-in screens use. In development the backend
 * accepts the fixed code 123456 for these numbers; in production it does not,
 * so this is a development convenience only.
 *
 * This replaced mockLogin(), which wrote a fake session ("mock_token", any
 * role including admin) into localStorage. The pages then rendered as that
 * role while every API call was rejected — so developer testing exercised
 * screens against nothing.
 */
const DEMO_PHONES = {
  user: '+919000000001',
  resident_member: '+919000000002',
  society_admin: '+919000000003',
  security_guard: '+919000000004',
  shop_owner: '+919000000005',
  service_provider: '+919000000006',
  delivery_agent: '+919000000007',
  field_agent: '+919000000008',
  area_agent: '+919000000009',
  territory_admin: '+919000000010',
  moderator: '+919000000011',
  super_admin: '+919000000012',
  admin: '+919000000012',
};
const DEMO_OTP = '123456';

const rolesOf = (user) => (user && Array.isArray(user.roles) && user.roles.length ? user.roles : [String((user && user.role) || 'user').toLowerCase()]);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [assignedRoles, setAssignedRoles] = useState([]);
  const [loginMethods, setLoginMethods] = useState(DEFAULT_METHODS);

  // Which ways of signing in the server has open (C1, Decision D3).
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/v1/auth/methods`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => { if (!cancelled && body) setLoginMethods(readMethods(body)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const forget = useCallback(() => {
    setToken(null);
    setUser(null);
    setActiveRole(null);
    setAssignedRoles([]);
  }, []);

  // Restore the session, then confirm it with the server: a token revoked
  // elsewhere (sign-out on another device, account disabled) used to leave the
  // web signed in on stale data until some page failed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        localStorage.removeItem('token'); // Purge legacy token key
        const storedToken = localStorage.getItem(SESSION_KEYS.token);
        const storedUserStr = localStorage.getItem(SESSION_KEYS.user);
        const storedActiveRole = localStorage.getItem(SESSION_KEYS.role);
        if (!storedToken || !storedUserStr) return;

        const storedUser = JSON.parse(storedUserStr);
        const roles = rolesOf(storedUser);
        setToken(storedToken);
        setUser(storedUser);
        setAssignedRoles(roles);
        setActiveRole(storedActiveRole && roles.includes(storedActiveRole) ? storedActiveRole : roles[0]);

        try {
          const fresh = await apiFetch('/users/me');
          if (cancelled || !fresh || !fresh.id) return;
          const merged = { ...storedUser, ...fresh, roles: storedUser.roles || fresh.roles };
          localStorage.setItem(SESSION_KEYS.user, JSON.stringify(merged));
          setUser(merged);
          setToken(localStorage.getItem(SESSION_KEYS.token));
        } catch (e) {
          // apiFetch has already tried a refresh; a 401 here means the session is over.
          if (e.status === 401) clearSession();
        }
      } catch (e) {
        console.error('Failed to load auth session:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Keep the session alive: pages that call fetch() themselves get their token
  // renewed on a 401, and it is renewed before it expires rather than after.
  useEffect(() => {
    installAuthFetch();
    return startSessionKeepAlive();
  }, []);

  // apiFetch refreshes the token or ends the session from any page.
  useEffect(() => {
    const onRefreshed = () => setToken(localStorage.getItem(SESSION_KEYS.token));
    const onExpired = () => forget();
    window.addEventListener('auth:refreshed', onRefreshed);
    window.addEventListener('auth:expired', onExpired);
    return () => {
      window.removeEventListener('auth:refreshed', onRefreshed);
      window.removeEventListener('auth:expired', onExpired);
    };
  }, [forget]);

  const saveAuthSession = (data) => {
    localStorage.setItem(SESSION_KEYS.token, data.accessToken);
    if (data.user && (String(data.user.role).toLowerCase() === 'super_admin' || String(data.user.role).toLowerCase() === 'admin')) {
      localStorage.setItem('admin_token', data.accessToken);
    }
    if (data.refreshToken) localStorage.setItem(SESSION_KEYS.refreshToken, data.refreshToken);
    localStorage.setItem(SESSION_KEYS.user, JSON.stringify(data.user));

    const roles = rolesOf(data.user);
    const defaultRole = roles[0];
    localStorage.setItem(SESSION_KEYS.role, defaultRole);

    setToken(data.accessToken);
    setUser(data.user);
    setAssignedRoles(roles);
    setActiveRole(defaultRole);
  };

  /**
   * Switches the account's active role on the server (PUT /auth/switch-role),
   * which issues a token for it. Switching only in the browser left the token
   * — and so every API call — on the old role. Resolves to true on success.
   */
  const switchRole = async (newRole) => {
    if (!assignedRoles.includes(newRole)) return false;
    try {
      const data = await apiFetch('/auth/switch-role', { method: 'PUT', body: JSON.stringify({ targetRole: newRole }) });
      if (data.accessToken) {
        localStorage.setItem(SESSION_KEYS.token, data.accessToken);
    if (data.user && (String(data.user.role).toLowerCase() === 'super_admin' || String(data.user.role).toLowerCase() === 'admin')) {
      localStorage.setItem('admin_token', data.accessToken);
    }
        setToken(data.accessToken);
      }
      localStorage.setItem(SESSION_KEYS.role, newRole);
      setActiveRole(newRole);
      if (user) {
        const next = { ...user, role: newRole };
        localStorage.setItem(SESSION_KEYS.user, JSON.stringify(next));
        setUser(next);
      }
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const sendOtp = async (phoneNumber, method = 'phone') => {
    setError(null);
    try {
      if (method === 'firebase') {
        await sendFirebasePhoneOtp(phoneNumber, 'recaptcha-container');
        return { success: true, message: 'OTP sent via Firebase', otp: '' };
      }

      const endpoint = method === 'whatsapp' ? '/api/v1/auth/send-whatsapp-otp' : '/api/v1/auth/send-otp';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const verifyOtp = async (phoneNumber, otp, fullName = '', regionId = '', method = 'phone') => {
    setError(null);
    try {
      if (method === 'firebase') {
        const { idToken } = await verifyFirebasePhoneOtp(otp);
        const res = await fetch(`${API_URL}/api/v1/auth/firebase-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, fullName, regionId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Firebase verification failed');

        if (data.registered && data.accessToken) {
          saveAuthSession(data);
        }
        return data;
      }

      // Traditional OTP Verification (MSG91 / WhatsApp)
      const res = await fetch(`${API_URL}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp, fullName, regionId, method })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      if (data.registered && data.accessToken) {
        saveAuthSession(data);
      }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const postAuth = async (path, body) => {
    const res = await fetch(`${API_URL}/api/v1/auth${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  };

  /** Emails a sign-in code (C1, Decision D3). */
  const sendEmailOtp = async (email) => {
    setError(null);
    try {
      return await postAuth('/email/send-otp', { email });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Checks the emailed code. A new address answers { registered: false } until
   * it is sent again with the customer's name.
   */
  const verifyEmailOtp = async (email, otp, fullName = '') => {
    setError(null);
    try {
      const data = await postAuth('/email/verify-otp', { email, otp, ...(fullName ? { fullName } : {}) });
      if (data.registered && data.accessToken) saveAuthSession(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /** Google pop-up, then the server (C1, Decision D3). */
  const googleLogin = async () => {
    setError(null);
    try {
      const firebaseIdToken = await signInWithGoogle();
      const data = await postAuth('/google', { firebaseIdToken });
      if (data.accessToken) saveAuthSession(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const loginEmail = async (email, password) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.accessToken) saveAuthSession(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const registerEmail = async (email, password, fullName, regionId = '') => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, regionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      if (data.accessToken && data.user) { saveAuthSession(data); }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Signs out of this browser, or with { allDevices: true } of every device
   * (C1). Resolves to whether the server confirmed it; the browser's session
   * is cleared either way.
   */
  const logout = async ({ allDevices = false } = {}) => {
    let confirmed = false;
    try {
      const storedToken = localStorage.getItem(SESSION_KEYS.token);
      if (storedToken) {
        const res = await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${storedToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ allDevices: Boolean(allDevices) }),
        });
        confirmed = res.ok;
      }
    } catch (e) {
      console.warn('Backend logout notification failed (non-critical):', e.message);
    } finally {
      Object.values(SESSION_KEYS).forEach((key) => localStorage.removeItem(key));
      localStorage.removeItem('admin_token');
      forget();
    }
    return confirmed;
  };

  /**
   * Development only: sign in as the seeded demo account for `role`, through
   * the real OTP endpoints. Resolves to true when signed in.
   */
  const demoLogin = async (role) => {
    if (process.env.NODE_ENV !== 'development') return false;
    const phoneNumber = DEMO_PHONES[role];
    if (!phoneNumber) {
      setError(`No demo account for role "${role}"`);
      return false;
    }
    try {
      await sendOtp(phoneNumber);
      const data = await verifyOtp(phoneNumber, DEMO_OTP);
      return Boolean(data && data.accessToken);
    } catch (e) {
      setError(`${e.message} — is the demo data seeded? Run: npm run seed:demo --workspace=backend`);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user: user ? { ...user, role: activeRole } : null,
      activeRole,
      assignedRoles,
      switchRole,
      token,
      loading,
      error,
      sendOtp,
      verifyOtp,
      loginEmail,
      registerEmail,
      loginMethods,
      sendEmailOtp,
      verifyEmailOtp,
      googleLogin,
      logout,
      demoLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
