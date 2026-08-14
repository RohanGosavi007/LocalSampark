'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { API_BASE, getAdminAuthHeaders } from '@/lib/api';

/**
 * AdminAuthContext
 *
 * Eight admin-dashboard pages imported this module and it did not exist, which
 * was one of the three unresolved imports failing the production build.
 *
 * Admin credentials already live under the `admin_token` localStorage key and
 * are read by getAdminAuthHeaders in lib/api.js, so this wraps that existing
 * convention rather than introducing a second source of truth.
 */

const AdminAuthContext = createContext(null);

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

export function AdminAuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from storage first so a refresh does not flash a signed-out shell,
  // then confirm against the server.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cached = window.localStorage.getItem(USER_KEY);
    if (cached) {
      try {
        setAdminUser(JSON.parse(cached));
      } catch {
        window.localStorage.removeItem(USER_KEY);
      }
    }

    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/admin-auth/me`, { headers: getAdminAuthHeaders() });
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          const user = data.user || data.data || data;
          setAdminUser(user);
          window.localStorage.setItem(USER_KEY, JSON.stringify(user));
        } else if (res.status === 401 || res.status === 403) {
          // Only clear on an explicit rejection. A 500 or a network fault must
          // not sign an admin out mid-session.
          window.localStorage.removeItem(TOKEN_KEY);
          window.localStorage.removeItem(USER_KEY);
          setAdminUser(null);
        }
      } catch {
        // Offline or unreachable: keep the cached identity.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((token, user) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, token);
      if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    setAdminUser(user || null);
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    }
    setAdminUser(null);
  }, []);

  // Roles are stored inconsistently across the codebase, so normalise on read
  // rather than making every caller remember to.
  const role = useMemo(
    () => String(adminUser?.role || '').toUpperCase(),
    [adminUser]
  );

  const value = useMemo(
    () => ({
      adminUser,
      role,
      loading,
      isAuthenticated: Boolean(adminUser),
      isSuperAdmin: role === 'SUPER_ADMIN',
      login,
      logout,
    }),
    [adminUser, role, loading, login, logout]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);

  // Returning a safe shape rather than throwing keeps a page that renders
  // outside the provider from taking the whole dashboard down.
  if (!ctx) {
    return {
      adminUser: null,
      role: '',
      loading: false,
      isAuthenticated: false,
      isSuperAdmin: false,
      login: () => {},
      logout: () => {},
    };
  }

  return ctx;
}

export default AdminAuthContext;
