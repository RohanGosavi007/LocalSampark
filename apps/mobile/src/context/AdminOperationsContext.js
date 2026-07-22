import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Constants from 'expo-constants';

const AdminOperationsContext = createContext();

export function AdminOperationsProvider({ children }) {
  const { authToken, user, activeRole } = useAuth();
  const [pendingShops, setPendingShops] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const isDev = process.env.NODE_ENV === 'development';
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 
                  (isDev ? Constants.expoConfig?.extra?.API_URL_DEV : Constants.expoConfig?.extra?.API_URL_PROD) || 
                  'https://localsampark-api.onrender.com/api/v1';

  const fetchPendingApprovals = async () => {
    if (!authToken || !user) return;
    
    const adminRoles = ['super_admin', 'territory_admin', 'area_agent', 'moderator'];
    if (!adminRoles.includes(user.role) && !adminRoles.includes(activeRole)) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/shops/pending`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingShops(data.shops || []);
      }
    } catch (e) {
      console.warn("Failed to fetch pending approvals, using mock fallback for demo");
      setPendingShops([
        { id: 991, name: 'Mock Grocery Mart', owner_name: 'Amit Kumar', phone_number: '+919999911111', address: 'Block A, Market', status: 'pending' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingApprovals();
  }, [authToken, user, activeRole]);

  return (
    <AdminOperationsContext.Provider value={{ pendingShops, fetchPendingApprovals, isLoading }}>
      {children}
    </AdminOperationsContext.Provider>
  );
}

export function useAdminOperations() {
  return useContext(AdminOperationsContext);
}
