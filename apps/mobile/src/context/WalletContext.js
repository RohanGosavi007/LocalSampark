import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Constants from 'expo-constants';

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const { authToken, user } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0.00);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isDev = process.env.NODE_ENV === 'development';
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 
                  (isDev ? Constants.expoConfig?.extra?.API_URL_DEV : Constants.expoConfig?.extra?.API_URL_PROD) || 
                  'https://localsampark-api.onrender.com/api/v1';

  const fetchWallet = async () => {
    if (!authToken || !user) return;
    setIsLoading(true);
    setError(null);
    try {
      // /wallet/history returns { balance, transactions }; /wallet/balance has
      // never existed, so this always fell through to the mock below.
      const res = await fetch(`${API_URL}/wallet/history`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) {
        // A non-2xx response fell through silently: the old code only handled
        // res.ok, so a 401 or 500 left the previous balance on screen unchanged.
        throw new Error(`Wallet request failed (${res.status})`);
      }
      const data = await res.json();
      setWalletBalance(data.balance || 0.00);
      setWalletTransactions(data.transactions || []);
    } catch (e) {
      // This used to fall back to a ₹750 balance and two invented ledger
      // entries — "Paid at Sharma Grocery ₹120" and "Loaded via Razorpay ₹500".
      // A wallet is a financial record: showing a spendable balance the user
      // does not have, and payments they never made, is the worst place in the
      // app to guess. The balance stays at zero and the error is surfaced so
      // screens can say the wallet could not be loaded rather than quietly
      // showing a number.
      console.warn('[Wallet] Failed to fetch wallet:', e?.message);
      setWalletBalance(0);
      setWalletTransactions([]);
      setError(e?.message || 'Could not load your wallet.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [authToken, user]);

  return (
    <WalletContext.Provider value={{ walletBalance, walletTransactions, fetchWallet, isLoading, error }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
