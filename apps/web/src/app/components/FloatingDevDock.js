'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { 
  ChevronUp, ChevronDown, User, Store, Truck, ShieldAlert, 
  Building2, Wrench, Crown, Users
} from 'lucide-react';

const DOCK_ROLES = [
  { role: 'user', label: 'User', icon: User, color: '#6366F1' },
  { role: 'shop_owner', label: 'Shop', icon: Store, color: '#F59E0B' },
  { role: 'delivery_agent', label: 'Delivery', icon: Truck, color: '#10B981' },
  { role: 'service_provider', label: 'Service', icon: Wrench, color: '#EC4899' },
  { role: 'territory_admin', label: 'Franchise', icon: Building2, color: '#8B5CF6' },
  { role: 'resident_member', label: 'Resident', icon: Users, color: '#06B6D4' },
  { role: 'super_admin', label: 'Admin', icon: ShieldAlert, color: '#EF4444' },
  { role: 'admin', label: 'S.Admin', icon: Crown, color: '#F97316' },
];

export default function FloatingDevDock() {
  const { mockLogin, user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(-1);

  if (process.env.NODE_ENV === 'production') return null;

  const handleLogin = (role) => {
    mockLogin(role);
  };

  // Calculate magnification scale based on distance from hovered item
  const getScale = (index) => {
    if (hoveredIndex === -1) return 1;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return 1.4;
    if (distance === 1) return 1.15;
    return 1;
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="floating-dock px-4 py-3 flex items-end gap-1"
          >
            {DOCK_ROLES.map((item, index) => (
              <motion.button
                key={item.role}
                onClick={() => handleLogin(item.role)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(-1)}
                animate={{ scale: getScale(index) }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="floating-dock-item flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-white/10 cursor-pointer group"
                title={`Login as ${item.label}`}
                style={{ transformOrigin: 'bottom center' }}
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-shadow duration-200"
                  style={{ 
                    backgroundColor: `${item.color}20`,
                    boxShadow: hoveredIndex === index ? `0 0 20px ${item.color}40` : 'none'
                  }}
                >
                  <item.icon 
                    className="w-5 h-5 transition-colors" 
                    style={{ color: item.color }} 
                  />
                </div>
                <span className="text-[9px] font-bold text-white/60 group-hover:text-white/90 transition-colors whitespace-nowrap">
                  {item.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`floating-dock px-4 py-2 flex items-center gap-2 cursor-pointer ${
          user ? 'ring-2 ring-green-500/50' : ''
        }`}
      >
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-xs font-bold text-white/80">
          {user ? `DEV: ${user.name?.split(' ')[0]}` : 'DEV LOGIN'}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-white/60" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-white/60" />
        )}
      </motion.button>
    </div>
  );
}
