'use client';
import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function DevLoginScreen() {
  const { login } = useAuthStore();
  const router = useRouter();

  if (process.env.NODE_ENV !== 'development') return null;

  const handleMockLogin = (role) => {
    // Inject mock user state and valid fake JWT for frontend testing
    const mockUser = {
      id: `demo-${role.toLowerCase()}-123`,
      name: `Demo ${role}`,
      role: role,
      shop_id: role.startsWith('VENDOR') ? 'shop-777' : null,
      shop_category_slug: role.startsWith('VENDOR') ? 'grocery-supermarkets' : null
    };
    const payload = btoa(JSON.stringify({ userId: '123', role: role, tokenVersion: 0 }));
    const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.mockSignature`;
    
    login(mockUser, mockToken);
    
    // Trigger navigation based on role
    if (role.startsWith('VENDOR')) router.push('/shop-dashboard');
    else if (role === 'DELIVERY') router.push('/delivery-dashboard');
    else if (role === 'ADMIN') router.push('/admin-dashboard');
    else router.push('/');
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-slate-950/90 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl">
      <h3 className="text-white text-xs font-bold mb-3 uppercase tracking-wider">Dev Quick Login</h3>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => handleMockLogin('CUSTOMER')} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">Customer</button>
        <button onClick={() => handleMockLogin('VENDOR_OWNER')} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">V: Owner</button>
        <button onClick={() => handleMockLogin('VENDOR_STAFF')} className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">V: Staff</button>
        <button onClick={() => handleMockLogin('DELIVERY')} className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">Delivery</button>
        <button onClick={() => handleMockLogin('ADMIN')} className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors col-span-2">Admin</button>
      </div>
    </div>
  );
}
