import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureTokenStorage } from '../lib/secureStorage';
import { API_URL, apiPost } from '../lib/api';
// One shared client. This module used to construct a second one from its own
// copy of the URL and anon key, so the app held two clients pointed at a project
// configured in two places. src/lib/supabase owns that config now.
import { supabase } from '../lib/supabase';

/**
 * Re-exported so the many modules that already import SecureTokenStorage from
 * this file keep working. The implementation now lives in src/lib/secureStorage
 * so that src/lib/api.js can own it without importing a React context module.
 */
export { SecureTokenStorage };

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [assignedRoles, setAssignedRoles] = useState([]);
  const [permissionOverrides, setPermissionOverrides] = useState({});
  const [walletBalance, setWalletBalance] = useState(0.00);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [pendingShops, setPendingShops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseRealtime, setSupabaseRealtime] = useState(null);

  // API_URL is imported from src/lib/api rather than re-derived here.
  //
  // This module used to compute its own base URL keyed on
  // `process.env.NODE_ENV === 'development'`, while src/lib/api.js keys on
  // `__DEV__` and falls back to the emulator loopback (10.0.2.2) instead of the
  // LAN address in app.json's extra.API_URL_DEV. The two disagreed, so the auth
  // and wallet calls made here went to a different host than every other
  // request in the app — on a device (not an emulator) that meant login worked
  // against 192.168.1.7 while the rest of the app failed, or the reverse.

  useEffect(() => {
    // Restore session on app load
    const restoreSession = async () => {
      try {
        // Sensitive token from encrypted storage, display data from AsyncStorage
        const storedToken = await SecureTokenStorage.getToken('authToken');
        const storedUser = await AsyncStorage.getItem('user');
        const storedActiveRole = await AsyncStorage.getItem('activeRole');
        const storedAssignedRoles = await AsyncStorage.getItem('assignedRoles');

        if (storedToken && storedUser) {
          setAuthToken(storedToken);
          setUser(JSON.parse(storedUser));
          if (storedActiveRole) setActiveRole(storedActiveRole);
          if (storedAssignedRoles) setAssignedRoles(JSON.parse(storedAssignedRoles));
          
          // Fetch wallet and pending approvals
          fetchWallet(storedToken);
          const userData = JSON.parse(storedUser);
          const adminRoles = ['super_admin', 'territory_admin', 'area_agent', 'moderator'];
          if (adminRoles.includes(userData.role) || adminRoles.includes(storedActiveRole)) {
            fetchPendingApprovals(storedToken);
          }
          
          initSupabaseRealtime(userData.id);
        }
      } catch (e) {
        console.error("Failed to restore session from AsyncStorage", e);
      } finally {
        setIsLoading(false);
      }
    };

    // Safety timeout: if restoreSession hangs (e.g. native module issue),
    // still allow app to render after 5 seconds
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    restoreSession().finally(() => clearTimeout(safetyTimer));
  }, []);

  const fetchWallet = async (token) => {
    try {
      // /wallet/history returns { balance, transactions }; /wallet/balance has
      // never existed, so this always fell through to the mock below.
      const res = await fetch(`${API_URL}/wallet/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance || 0.00);
        setWalletTransactions(data.transactions || []);
      }
    } catch (e) {
      // A fabricated ₹750 balance must never reach a real user: it is a
      // spendable-looking number that no ledger backs, and it silently hid
      // every wallet outage behind a plausible screen. Demo data stays in dev.
      if (__DEV__) {
        console.warn('Failed to fetch wallet, using mock fallback for demo');
        setWalletBalance(750.00);
        setWalletTransactions([
          { id: 1, amount: '120.00', type: 'debit', purpose: 'Paid at Sharma Grocery', time: 'Today, 11:30 AM' },
          { id: 2, amount: '500.00', type: 'credit', purpose: 'Loaded via Razorpay', time: 'Yesterday, 4:15 PM' }
        ]);
        return;
      }
      console.warn('Failed to fetch wallet:', e?.message);
      setWalletBalance(0.00);
      setWalletTransactions([]);
    }
  };

  const loginWithDevPreset = async (role, phoneNumber = null, mockOtp = null) => {
    const rolePhones = {
      'user': '+919000000001',
      'resident_member': '+919000000002',
      'society_admin': '+919000000003',
      'security_guard': '+919000000004',
      'shop_owner': '+919000000005',
      'service_provider': '+919000000006',
      'delivery_agent': '+919000000007',
      'field_agent': '+919000000008',
      'area_agent': '+919000000009',
      'territory_admin': '+919000000010',
      'moderator': '+919000000011',
      'super_admin': '+919000000012'
    };
    
    const phone = phoneNumber || (rolePhones[role] || '+919000000001');
    
    try {
      let finalOtp = mockOtp;
      if (!finalOtp) {
        const sendRes = await fetch(`${API_URL}/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone })
        });
        
        if (sendRes.ok) {
           const sendData = await sendRes.json();
           finalOtp = sendData.otp || '123456';
        } else {
           finalOtp = '123456';
        }
      }

      const verifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otp: finalOtp })
      });
      
      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.registered) {
        const token = verifyData.accessToken;
        setAuthToken(token);
        // Persisted so src/lib/api.js can silently refresh on 401 instead of
        // logging the user out; previously this value was discarded.
        if (verifyData.refreshToken) {
          await SecureTokenStorage.setToken('refreshToken', verifyData.refreshToken);
        }
        
        // RBAC Integration
        const userData = verifyData.user;
        setUser(userData);
        
        // Setup Roles
        const roles = userData.roles || [userData.role || 'user'];
        setAssignedRoles(roles);
        
        const finalActiveRole = (role && roles.includes(role)) ? role : roles[0];
        setActiveRole(finalActiveRole);
        setPermissionOverrides(userData.permission_overrides || {});

        // Save sensitive token to encrypted storage, display data to AsyncStorage
        await SecureTokenStorage.setToken('authToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('activeRole', finalActiveRole);
        await AsyncStorage.setItem('assignedRoles', JSON.stringify(roles));
        
        fetchWallet(token);

        const adminRoles = ['super_admin', 'territory_admin', 'area_agent', 'moderator'];
        if (adminRoles.includes(userData.role) || adminRoles.includes(finalActiveRole)) {
          fetchPendingApprovals(token);
        }
        return true;
      } else {
        if (verifyData.registered === false) {
           Alert.alert('Register Required', 'Profile registration is needed on the website first.');
           return false;
        }
        throw new Error(verifyData.message || 'OTP verification failed');
      }
    } catch (err) {
      // ── Production auth bypass, closed ──────────────────────────────────
      // This catch used to run in release builds too. Because it is reached
      // whenever the backend is unreachable OR returns any error — including a
      // rejected OTP — it meant: enter any phone number, submit any OTP, and
      // the app minted a local session with `mock-jwt-token-123` and whatever
      // role was asked for. app/login.js calls this on the real OTP path
      // (handleVerifyOtp's catch) and from a role picker that offered
      // "Super Admin", so a released APK granted anyone a local super-admin
      // session with the admin UI unlocked. Server calls would 401, but every
      // client-evaluated role check passed.
      //
      // The trial/offline convenience is worth keeping for development only.
      if (!__DEV__) {
        console.warn('Login failed:', err?.message);
        throw err;
      }
      console.warn('[DEV ONLY] Backend unreachable or error, using MOCK data for trial!', err.message);

      const mockRole = role || 'user';
      const mockUser = {
        id: Math.floor(Math.random() * 1000),
        phone_number: phone,
        role: mockRole,
        name: `Trial ${mockRole.replace('_', ' ').toUpperCase()}`,
        status: 'approved',
      };
      
      const token = 'mock-jwt-token-123';
      setAuthToken(token);
      setUser(mockUser);
      
      const mockRoles = [mockRole];
      if (mockRole !== 'user') mockRoles.push('user');
      if (mockRole === 'shop_owner') mockRoles.push('delivery_agent');
      
      setAssignedRoles(mockRoles);
      setActiveRole(mockRole);
      setPermissionOverrides({});
      
      await SecureTokenStorage.setToken('authToken', token);
      await AsyncStorage.setItem('user', JSON.stringify(mockUser));
      await AsyncStorage.setItem('activeRole', mockRole);
      await AsyncStorage.setItem('assignedRoles', JSON.stringify(mockRoles));

      setWalletBalance(750.00);
      setWalletTransactions([
        { id: 1, amount: '120.00', type: 'debit', purpose: 'Paid at Sharma Grocery', time: 'Today, 11:30 AM' }
      ]);
      
      const adminRoles = ['super_admin', 'territory_admin', 'area_agent', 'moderator'];
      if (adminRoles.includes(mockRole)) {
        setPendingShops([
          { id: 991, name: 'Mock Grocery Mart', owner_name: 'Amit Kumar', phone_number: '+919999911111', address: 'Block A, Market', status: 'pending' }
        ]);
      }
      return true;
    }
  };

  /**
   * Admin sign-in against the real backend contract.
   *
   * The mobile admin portal previously collected an email and a password,
   * discarded both, and called loginWithDevPreset('admin') — a role that is not
   * even a key in the rolePhones map above, so it fell through to the default
   * resident number. It authenticated nothing.
   *
   * POST /admin-auth/login is what apps/web already uses. It requires phone +
   * PIN + OTP, verifies the caller holds an active admin_roles row, enforces an
   * IP allowlist and a PIN lockout, and writes an admin_audit_log entry.
   *
   * Note it returns no refresh token, unlike /auth/verify-otp — admin sessions
   * end when the access token expires rather than refreshing silently. That is
   * the backend's existing behaviour, not something introduced here.
   */
  const adminLogin = async (phoneNumber, pin, otp) => {
    const data = await apiPost('/admin-auth/login', { phoneNumber, pin, otp });

    const token = data?.accessToken;
    if (!token || !data?.user) {
      throw new Error(data?.error || 'Admin login failed.');
    }

    const adminUser = {
      id: data.user.id,
      name: data.user.fullName,
      phone_number: phoneNumber,
      role: String(data.user.role || '').toLowerCase(),
      regionId: data.user.regionId ?? null,
    };
    const roles = [adminUser.role];

    setAuthToken(token);
    setUser(adminUser);
    setAssignedRoles(roles);
    setActiveRole(adminUser.role);
    setPermissionOverrides({});

    await SecureTokenStorage.setToken('authToken', token);
    await AsyncStorage.setItem('user', JSON.stringify(adminUser));
    await AsyncStorage.setItem('activeRole', adminUser.role);
    await AsyncStorage.setItem('assignedRoles', JSON.stringify(roles));

    fetchPendingApprovals(token);
    return adminUser;
  };

  const switchRole = async (newRole) => {
    if (assignedRoles.includes(newRole)) {
      setActiveRole(newRole);
      await AsyncStorage.setItem('activeRole', newRole);
      
      if (user) {
        const updatedUser = { ...user, role: newRole };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      return true;
    }
    return false;
  };

  const logout = async () => {
    setUser(null);
    setAuthToken(null);
    setActiveRole(null);
    setAssignedRoles([]);
    if (supabaseRealtime) {
      supabase.removeChannel(supabaseRealtime);
      setSupabaseRealtime(null);
    }
    setPermissionOverrides({});
    setWalletBalance(0.00);
    setWalletTransactions([]);
    
    try {
      // Delete sensitive token from encrypted storage
      await SecureTokenStorage.deleteToken('authToken');
      await SecureTokenStorage.deleteToken('refreshToken');
      // Clear non-sensitive display data from AsyncStorage
      await AsyncStorage.multiRemove([
        'user', 'activeRole', 'assignedRoles'
      ]);
    } catch (e) {
      console.error('Error clearing storage during logout', e);
    }
  };

  const fetchPendingApprovals = async (token) => {
    try {
      const res = await fetch(`${API_URL}/territory/pending-approvals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPendingShops(Array.isArray(data) ? data : (data.rows || []));
    } catch (err) {
      // Fabricated shop applications are actionable in the approvals UI: an
      // agent could "approve" Mock Grocery Mart and the write would fail or,
      // worse, land against id 991. Keep the sample data in dev only.
      if (__DEV__) {
        console.warn('Failed to load pending applications, using MOCK data', err);
        setPendingShops([
          { id: 991, name: 'Mock Grocery Mart', owner_name: 'Amit Kumar', phone_number: '+919999911111', address: 'Block A, Market', status: 'pending' },
          { id: 992, name: 'Mock Beauty Salon', owner_name: 'Priya Singh', phone_number: '+919999922222', address: 'Sector 4, Main Road', status: 'pending' }
        ]);
        return;
      }
      console.warn('Failed to load pending applications:', err?.message);
      setPendingShops([]);
    }
  };

  const chargeWallet = (amount, purpose) => {
    setWalletBalance(prev => prev - amount);
    setWalletTransactions(prev => [{ id: Date.now(), amount: amount.toFixed(2), type: 'debit', purpose, time: 'Just now' }, ...prev]);
  };

  const sendOtp = async (phone) => {
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      return data;
    } catch (err) {
      // Returning a fixed OTP on failure told the user "Test OTP sent: 123456"
      // in production (app/login.js reads data.mock) and paired with the
      // bypass in loginWithDevPreset to complete a login that never touched
      // the server. Surface the failure instead.
      if (!__DEV__) {
        console.warn('sendOtp failed:', err?.message);
        throw err;
      }
      console.warn('[DEV ONLY] sendOtp error (using mock OTP 123456)', err.message);
      return { success: true, otp: '123456', mock: true };
    }
  };

  const initSupabaseRealtime = (userId) => {
    if (!supabase) {
      console.warn('Supabase not initialized, skipping realtime');
      return;
    }
    try {
      const channel = supabase.channel(`user:${userId}`)
        .on('broadcast', { event: '*' }, payload => {
          console.log('Received real-time event:', payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Connected to Supabase Realtime');
          }
        });
      setSupabaseRealtime(channel);
    } catch (e) {
      console.warn('Supabase realtime init failed (non-fatal):', e.message);
    }
  };

  const verifyOtp = async (phone, otp) => {
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otp })
      });
      const data = await res.json();
      
      if (res.ok && data.registered) {
        const token = data.accessToken;
        setAuthToken(token);
        // See above - required for silent refresh on 401.
        if (data.refreshToken) {
          await SecureTokenStorage.setToken('refreshToken', data.refreshToken);
        }
        
        const userData = data.user;
        setUser(userData);
        
        const roles = userData.roles || [userData.role || 'user'];
        setAssignedRoles(roles);
        
        const finalActiveRole = roles[0];
        setActiveRole(finalActiveRole);
        setPermissionOverrides(userData.permission_overrides || {});

        await SecureTokenStorage.setToken('authToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('activeRole', finalActiveRole);
        await AsyncStorage.setItem('assignedRoles', JSON.stringify(roles));
        
        fetchWallet(token);

        const adminRoles = ['super_admin', 'territory_admin', 'area_agent', 'moderator'];
        if (adminRoles.includes(userData.role) || adminRoles.includes(finalActiveRole)) {
          fetchPendingApprovals(token);
        }
        
        initSupabaseRealtime(userData.id);
        return true;
      } else {
        if (data.registered === false) {
           Alert.alert('Register Required', 'Profile registration is needed on the website first.');
           return false;
        }
        throw new Error(data.message || 'OTP verification failed');
      }
    } catch (err) {
      console.warn('verifyOtp error', err.message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{
      user: user ? { ...user, role: activeRole } : null,
      activeRole, 
      assignedRoles, 
      permissionOverrides,
      switchRole,
      authToken, 
      API_URL, 
      loginWithDevPreset,
      adminLogin, 
      logout, 
      walletBalance, 
      walletTransactions, 
      chargeWallet,
      pendingShops, 
      fetchPendingApprovals,
      isLoading,
      sendOtp,
      verifyOtp,
      supabaseRealtime,
      supabase
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
