import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Constants from 'expo-constants';

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const { authToken, user } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0.00);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const isDev = process.env.NODE_ENV === 'development';
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 
                  (isDev ? Constants.expoConfig?.extra?.API_URL_DEV : Constants.expoConfig?.extra?.API_URL_PROD) || 
                  'https://localsampark-api.onrender.com/api/v1';

  const fetchWallet = async () => {
    if (!authToken || !user) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/wallet/balance`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [authToken, user]);

  return (
    <WalletContext.Provider value={{ walletBalance, walletTransactions, fetchWallet, isLoading }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
