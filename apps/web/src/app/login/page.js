'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, ShieldCheck, User, Bike, Key, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'consumer', label: 'Resident / Consumer', icon: User, path: '/resident', desc: 'Shop locally & manage society' },
    { id: 'shop', label: 'Shop Owner', icon: Store, path: '/shop-manager', desc: 'Manage your local store' },
    { id: 'rider', label: 'Delivery Partner', icon: Bike, path: '/rider', desc: 'Deliver local orders' },
    { id: 'gatekeeper', label: 'Gatekeeper', icon: Key, path: '/gatekeeper', desc: 'Society visitor management' },
    { id: 'admin', label: 'Franchise Admin', icon: ShieldCheck, path: '/admin', desc: 'Super admin dashboard' },
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true);
    // Mock login delay for staging environment
    setTimeout(() => {
      const role = roles.find(r => r.id === selectedRole);
      router.push(role.path);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Logo Area */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">LocalSampark</h1>
          <p className="text-slate-400 mt-2 font-bold">The Hyper-Local Super App</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle gradient blob */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>

          <h2 className="text-xl font-bold text-white mb-6">Select your portal</h2>
          
          <form onSubmit={handleLogin}>
            <div className="space-y-3 mb-8">
              {roles.map(role => (
                <div 
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${
                    selectedRole === role.id 
                      ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    selectedRole === role.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <role.icon size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold ${selectedRole === role.id ? 'text-white' : ''}`}>{role.label}</h3>
                    <p className={`text-xs ${selectedRole === role.id ? 'text-blue-200' : 'text-slate-500'}`}>{role.desc}</p>
                  </div>
                  {selectedRole === role.id && (
                    <ChevronRight size={20} className="text-blue-500" />
                  )}
                </div>
              ))}
            </div>

            <button 
              type="submit" 
              disabled={!selectedRole || loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Enter Portal'
              )}
            </button>
          </form>
          
          <p className="text-center text-slate-500 text-xs mt-6">
            Authentication is currently bypassed for Staging Mode. Select a role to proceed.
          </p>
        </div>

      </div>
    </div>
  );
}
