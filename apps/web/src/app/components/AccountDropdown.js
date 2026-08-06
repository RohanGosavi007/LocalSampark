'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Wallet, Gift, Crown, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const getRoleRoute = (r) => {
  switch (r) {
    case 'super_admin':
    case 'admin': return '/admin-dashboard';
    case 'territory_admin': return '/franchise-dashboard';
    case 'area_agent':
    case 'field_agent': return '/field-dashboard';
    case 'shop_owner': return '/shop-dashboard';
    case 'delivery_agent': return '/delivery-dashboard';
    case 'service_provider': return '/service-dashboard';
    default: return '/dashboard';
  }
};

const formatRole = (r) => {
  if (!r) return '';
  return r.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function AccountDropdown() {
  const { user, activeRole, assignedRoles, switchRole, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-border/40 hover:bg-border transition-colors border border-border">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center text-xs font-bold">
          {user.name ? user.name[0].toUpperCase() : 'U'}
        </div>
        <ChevronDown className="w-3 h-3 text-text-muted" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute top-full right-0 mt-2 w-56 glass-card p-2 rounded-xl shadow-2xl z-50"
          >
            <div className="p-3 border-b border-border mb-2">
              <p className="text-sm font-semibold truncate">{user.name || 'User'}</p>
              <p className="text-xs text-text-muted truncate">{user.phone || user.email}</p>
            </div>
            
            {assignedRoles.map((role, index) => (
              <button 
                key={`${role}-${index}`}
                onClick={() => { switchRole(role); setIsOpen(false); window.location.href = getRoleRoute(role); }}
                className={`w-full text-left p-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${activeRole === role ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-border/40'}`}
              >
                {activeRole === role && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
                {formatRole(role)}
              </button>
            ))}
            
            <div className="h-px bg-border my-2" />
            <a href="/wallet" className="w-full text-left p-2 rounded-lg text-sm flex items-center gap-2 hover:bg-border/40 transition-colors text-text-muted"><Wallet className="w-4 h-4"/> Wallet</a>
            <a href="/rewards" className="w-full text-left p-2 rounded-lg text-sm flex items-center gap-2 hover:bg-border/40 transition-colors text-text-muted"><Gift className="w-4 h-4"/> Rewards</a>
            <a href="/premium" className="w-full text-left p-2 rounded-lg text-sm flex items-center gap-2 hover:bg-border/40 transition-colors text-yellow-500 font-medium"><Crown className="w-4 h-4"/> Premium</a>
            <a href="/profile" className="w-full text-left p-2 rounded-lg text-sm flex items-center gap-2 hover:bg-border/40 transition-colors text-text-muted mt-1"><Settings className="w-4 h-4"/> Settings</a>
            <button 
              onClick={async () => { await logout(); window.location.href = '/'; }}
              className="w-full text-left p-2 rounded-lg text-sm flex items-center gap-2 hover:bg-red-500/10 text-red-500 transition-colors mt-1"
            >
              <LogOut className="w-4 h-4"/> Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
