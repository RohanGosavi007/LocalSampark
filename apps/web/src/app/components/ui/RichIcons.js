'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Store, Users, Truck, Leaf, Home, HandCoins } from 'lucide-react';

const iconConfigs = {
  store: { Icon: Store, gradient: 'from-orange-500 to-amber-500', glow: 'shadow-amber-glow', label: 'Store' },
  community: { Icon: Users, gradient: 'from-rose-500 to-pink-500', glow: 'shadow-rose-glow', label: 'Community' },
  delivery: { Icon: Truck, gradient: 'from-violet-500 to-purple-500', glow: 'shadow-violet-glow', label: 'Delivery' },
  produce: { Icon: Leaf, gradient: 'from-emerald-500 to-teal-500', glow: 'shadow-emerald-glow', label: 'Produce' },
  society: { Icon: Home, gradient: 'from-indigo-500 to-blue-500', glow: 'shadow-violet-glow', label: 'Society' },
  earn: { Icon: HandCoins, gradient: 'from-green-500 to-emerald-500', glow: 'shadow-emerald-glow', label: 'Earn' },
};

function Icon3D({ type = 'store', size = 48 }) {
  const config = iconConfigs[type] || iconConfigs.store;
  const { Icon, gradient, glow } = config;

  return (
    <motion.div
      initial={{ opacity: 0, rotateY: 90, scale: 0.5 }}
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.15, rotateY: 10, rotateX: -5 }}
      className={`relative icon-3d glow-ring w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center ${glow}`}
      style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
    >
      {/* Inner glass shine */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 via-transparent to-transparent pointer-events-none" />
      <Icon className="w-8 h-8 text-white drop-shadow-lg relative z-10" strokeWidth={2} />
    </motion.div>
  );
}

// Named exports matching existing API for backward compatibility
export const StoreIcon = ({ size = 24 }) => <Icon3D type="store" size={size} />;
export const CommunityIcon = ({ size = 24 }) => <Icon3D type="community" size={size} />;
export const DeliveryIcon = ({ size = 24 }) => <Icon3D type="delivery" size={size} />;
export const ProduceIcon = ({ size = 24 }) => <Icon3D type="produce" size={size} />;
export const SocietyIcon = ({ size = 24 }) => <Icon3D type="society" size={size} />;
export const EarnIcon = ({ size = 24 }) => <Icon3D type="earn" size={size} />;

export { Icon3D };
export default Icon3D;
