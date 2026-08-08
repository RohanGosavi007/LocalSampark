'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';

import { sendFirebasePhoneOtp, verifyFirebasePhoneOtp } from '@/lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [assignedRoles, setAssignedRoles] = useState([]);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('auth_token');
      const storedUserStr = localStorage.getItem('auth_user');
      const storedActiveRole = localStorage.getItem('active_role');
      
      if (storedToken && storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        setToken(storedToken);
        setUser(storedUser);
        
        const roles = storedUser.roles || [storedUser.role || 'user'];
        setAssignedRoles(roles);
        
        if (storedActiveRole && roles.includes(storedActiveRole)) {
          setActiveRole(storedActiveRole);
        } else {
          setActiveRole(roles[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load auth session:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAuthSession = (data) => {
    localStorage.setItem('auth_token', data.accessToken);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    
    const roles = data.user.roles || [data.user.role || 'user'];
    const defaultRole = roles[0];
    localStorage.setItem('active_role', defaultRole);
    
    setToken(data.accessToken);
    setUser(data.user);
    setAssignedRoles(roles);
    setActiveRole(defaultRole);
  };

  const switchRole = (newRole) => {
    if (assignedRoles.includes(newRole)) {
      setActiveRole(newRole);
      localStorage.setItem('active_role', newRole);
      
      if (user) {
        setUser({ ...user, role: newRole });
      }
      return true;
    }
    return false;
  };

  const sendOtp = async (phoneNumber, method = 'phone') => {
    setError(null);
    try {
      if (method === 'firebase') {
        const result = await sendFirebasePhoneOtp(phoneNumber, 'recaptcha-container');
        return { success: true, message: 'OTP sent via Firebase', otp: '' }; // No dev OTP for firebase
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

      // Traditional OTP Verification (MSG91 / Console)
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
      
      if (data.accessToken) {
        localStorage.setItem('auth_token', data.accessToken);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        
        const roles = data.user.roles || [data.user.role || 'user'];
        const defaultRole = roles[0];
        localStorage.setItem('active_role', defaultRole);
        
        setToken(data.accessToken);
        setUser(data.user);
        setAssignedRoles(roles);
        setActiveRole(defaultRole);
      }
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
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${storedToken}`, 'Content-Type': 'application/json' }
        });
      }
    } catch (e) {
      console.warn('Backend logout notification failed (non-critical):', e.message);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('active_role');
      setToken(null);
      setUser(null);
      setActiveRole(null);
      setAssignedRoles([]);
    }
  };

  // Mock login for development testing only — disabled in production
  const mockLogin = (role) => {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Mock login is disabled in production');
      return false;
    }
    
    const mockUser = {
      id: 1,
      name: `Test ${role}`,
      phone: '+919999999999',
      role: role,
      roles: [role, 'user'] // Give everyone user role as well to test switching
    };
    
    localStorage.setItem('auth_token', 'mock_token');
    localStorage.setItem('auth_user', JSON.stringify(mockUser));
    localStorage.setItem('active_role', role);
    
    setToken('mock_token');
    setUser(mockUser);
    setAssignedRoles(mockUser.roles);
    setActiveRole(role);
    
    return true;
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
      logout,
      mockLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
