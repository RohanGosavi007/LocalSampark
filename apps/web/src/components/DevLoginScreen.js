'use client';
import React from 'react';
import { useAuth } from '../context/AuthContext';

// Canonical role IDs must match AuthContext.mockLogin() and the RBAC checks
// in each dashboard's layout.js (e.g. admin-dashboard/layout.js checks 'super_admin').
const ROLE_ROUTES = {
  user: '/resident',
  shop_owner: '/shop-dashboard',
  service_provider: '/shop-dashboard',
  delivery_agent: '/delivery-dashboard',
  super_admin: '/admin-dashboard',
};

export default function DevLoginScreen() {
  const { mockLogin } = useAuth();

  if (process.env.NODE_ENV !== 'development') return null;

  const handleMockLogin = (role) => {
    mockLogin(role);
    // Full reload so the guarded destination route picks up the freshly-written
    // AuthContext/localStorage state immediately instead of racing React state.
    window.location.href = ROLE_ROUTES[role] || '/';
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-slate-950/90 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl">
      <h3 className="text-white text-xs font-bold mb-3 uppercase tracking-wider">Dev Quick Login</h3>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => handleMockLogin('user')} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">Customer</button>
        <button onClick={() => handleMockLogin('shop_owner')} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">V: Owner</button>
        <button onClick={() => handleMockLogin('service_provider')} className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">V: Staff</button>
        <button onClick={() => handleMockLogin('delivery_agent')} className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">Delivery</button>
        <button onClick={() => handleMockLogin('super_admin')} className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors col-span-2">Admin</button>
      </div>
    </div>
  );
}
