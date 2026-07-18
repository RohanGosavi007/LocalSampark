'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

import { API_BASE } from '../lib/api';

// Global interceptor for 401 Unauthorized errors
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return response;
  };
}

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('admin_token');
      const storedAdmin = localStorage.getItem('admin_user');
      if (storedToken && storedAdmin) {
        setToken(storedToken);
        setAdmin(JSON.parse(storedAdmin));
      }
    } catch (e) {
      console.error('Failed to load admin session:', e);
    } finally {
      setLoading(false);
    }
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
      
      if (data.success && data.accessToken) {
        localStorage.setItem('admin_token', data.accessToken);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        setToken(data.accessToken);
        setAdmin(data.user);
      }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, token, loading, error, loginAdmin, logoutAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
