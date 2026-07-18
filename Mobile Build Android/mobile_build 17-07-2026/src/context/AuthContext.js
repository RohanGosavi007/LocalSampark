import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

// Use env variables for Supabase (fallback to placeholder for now if not set)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

  // Dynamic API URL from expo-constants
  const isDev = process.env.NODE_ENV === 'development';
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 
                  (isDev ? Constants.expoConfig?.extra?.API_URL_DEV : Constants.expoConfig?.extra?.API_URL_PROD) || 
                  'https://localsampark-api.onrender.com/api/v1';

  useEffect(() => {
    // Restore session on app load
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
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

    restoreSession();
  }, []);

  const fetchWallet = async (token) => {
    try {
      const res = await fetch(`${API_URL}/wallet/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance || 0.00);
        setWalletTransactions(data.transactions || []);
      }
    } catch (e) {
      console.warn("Failed to fetch wallet, using mock fallback for demo");
      setWalletBalance(750.00);
      setWalletTransactions([
        { id: 1, amount: '120.00', type: 'debit', purpose: 'Paid at Sharma Grocery', time: 'Today, 11:30 AM' },
        { id: 2, amount: '500.00', type: 'credit', purpose: 'Loaded via Razorpay', time: 'Yesterday, 4:15 PM' }
      ]);
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
        
        // RBAC Integration
        const userData = verifyData.user;
        setUser(userData);
        
        // Setup Roles
        const roles = userData.roles || [userData.role || 'user'];
        setAssignedRoles(roles);
        
        const finalActiveRole = (role && roles.includes(role)) ? role : roles[0];
        setActiveRole(finalActiveRole);
        setPermissionOverrides(userData.permission_overrides || {});

        // Save to AsyncStorage
        await AsyncStorage.setItem('authToken', token);
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
      console.warn('Backend unreachable or error, using MOCK data for trial!', err.message);
      
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
      
      await AsyncStorage.setItem('authToken', token);
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
      await AsyncStorage.multiRemove([
        'authToken', 'user', 'activeRole', 'assignedRoles'
      ]);
    } catch (e) {
      console.error('Error clearing AsyncStorage during logout', e);
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
      console.warn('Failed to load pending applications, using MOCK data', err);
      setPendingShops([
          { id: 991, name: 'Mock Grocery Mart', owner_name: 'Amit Kumar', phone_number: '+919999911111', address: 'Block A, Market', status: 'pending' },
          { id: 992, name: 'Mock Beauty Salon', owner_name: 'Priya Singh', phone_number: '+919999922222', address: 'Sector 4, Main Road', status: 'pending' }
      ]);
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
      console.warn('sendOtp error (using mock OTP 123456)', err.message);
      return { success: true, otp: '123456', mock: true };
    }
  };

  const initSupabaseRealtime = (userId) => {
    // Basic example of joining a user-specific room/channel
    const channel = supabase.channel(`user:${userId}`)
      .on('broadcast', { event: '*' }, payload => {
        console.log('Received real-time event:', payload);
        // Dispatch event globally or handle within specific context
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Connected to Supabase Realtime');
        }
      });
      
    setSupabaseRealtime(channel);
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
        
        const userData = data.user;
        setUser(userData);
        
        const roles = userData.roles || [userData.role || 'user'];
        setAssignedRoles(roles);
        
        const finalActiveRole = roles[0];
        setActiveRole(finalActiveRole);
        setPermissionOverrides(userData.permission_overrides || {});

        await AsyncStorage.setItem('authToken', token);
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
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
