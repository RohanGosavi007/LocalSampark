'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Soup, Calendar, Clock, Star, Truck, Home, MapPin,
  CheckCircle, ChevronRight, Package, Leaf, Users
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// ENHANCED TIFFIN & CATERING VISITOR VIEW
// What visitors see: plans, daily menu, subscribe, review delivery modes
// ═══════════════════════════════════════════════════════════════════════

export default function EnhancedTiffinVisitorView({ shop, products = [], onSubscribe }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDiet, setSelectedDiet] = useState('all');
  const [deliveryMode, setDeliveryMode] = useState('delivery');

  const dietFilters = [
    { key: 'all', label: 'All', emoji: '🍽️' },
    { key: 'veg', label: 'Veg', emoji: '🟢' },
    { key: 'non_veg', label: 'Non-Veg', emoji: '🔴' },
    { key: 'jain', label: 'Jain', emoji: '🟡' },
    { key: 'vegan', label: 'Vegan', emoji: '🌱' },
  ];

  return (
    <div className="space-y-8">
      {/* Today's Menu Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🍱</span>
          <h2 className="text-xl font-bold text-text">Today's Menu</h2>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full ml-auto">
            LIVE
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-background rounded-xl border border-border">
            <p className="text-xs font-bold text-text-muted uppercase mb-2">🌤️ Lunch</p>
            <ul className="space-y-1 text-sm text-text">
              <li>• Dal Tadka + Rice</li>
              <li>• Aloo Gobi Sabzi</li>
              <li>• 3 Roti + Salad</li>
              <li>• Papad + Pickle</li>
            </ul>
          </div>
          <div className="p-4 bg-background rounded-xl border border-border">
            <p className="text-xs font-bold text-text-muted uppercase mb-2">🌙 Dinner</p>
            <ul className="space-y-1 text-sm text-text">
              <li>• Paneer Butter Masala</li>
              <li>• Jeera Rice</li>
              <li>• 3 Roti + Raita</li>
              <li>• Sweet (Gulab Jamun)</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Subscription Plans */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Package className="w-6 h-6 text-orange-500" /> Subscription Plans
        </h2>
        <p className="text-text-muted text-sm mb-6">Save more with weekly & monthly plans</p>

        {/* Diet Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {dietFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setSelectedDiet(f.key)}
              className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${
                selectedDiet === f.key
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-background border-border text-text-muted hover:border-orange-500/30'
              }`}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Daily', price: 80, per: '/meal', icon: '🍛', desc: 'Pay as you go', color: '#22c55e', savings: null },
            { name: 'Weekly', price: 520, per: '/week', icon: '📅', desc: '7 meals • Save ₹40', color: '#3b82f6', savings: '₹40 saved', popular: true },
            { name: 'Monthly', price: 2000, per: '/month', icon: '📦', desc: '30 meals • Save ₹400', color: '#f97316', savings: '₹400 saved' },
          ].map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelectedPlan(plan)}
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all relative ${
                selectedPlan?.name === plan.name
                  ? 'border-orange-500 bg-orange-500/5 shadow-lg'
                  : 'border-border hover:border-orange-500/30'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-3 py-0.5 rounded-full text-xs font-bold">
                  Most Popular
                </span>
              )}
              <span className="text-3xl">{plan.icon}</span>
              <h3 className="text-lg font-bold text-text mt-2">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-black" style={{ color: plan.color }}>₹{plan.price}</span>
                <span className="text-text-muted text-sm">{plan.per}</span>
              </div>
              <p className="text-xs text-text-muted mt-1">{plan.desc}</p>
              {plan.savings && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                  ✅ {plan.savings}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Delivery Mode Selection */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-500" /> How would you like to receive?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { key: 'delivery', icon: Truck, label: 'Home Delivery', desc: 'Delivered to your doorstep', color: '#22c55e' },
            { key: 'pickup', icon: Home, label: 'Self Pickup', desc: 'Pick up from shop', color: '#3b82f6' },
            { key: 'dinein', icon: Users, label: 'Dine-in', desc: 'Eat at the shop', color: '#8b5cf6' },
          ].map(mode => (
            <div
              key={mode.key}
              onClick={() => setDeliveryMode(mode.key)}
              className={`p-4 rounded-xl cursor-pointer transition-all border-2 flex items-center gap-3 ${
                deliveryMode === mode.key
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-border hover:border-blue-500/30'
              }`}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${mode.color}15` }}>
                <mode.icon className="w-5 h-5" style={{ color: mode.color }} />
              </div>
              <div>
                <p className="font-bold text-text text-sm">{mode.label}</p>
                <p className="text-xs text-text-muted">{mode.desc}</p>
              </div>
              {deliveryMode === mode.key && <CheckCircle className="w-5 h-5 text-blue-500 ml-auto" />}
            </div>
          ))}
        </div>
      </div>

      {/* Subscribe CTA */}
      <AnimatePresence>
        {selectedPlan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-orange-500 text-white rounded-2xl px-6 py-4 shadow-2xl shadow-orange-500/30 flex items-center gap-4 max-w-md w-[90%]"
          >
            <div className="flex-1">
              <p className="font-bold">{selectedPlan.name} Plan</p>
              <p className="text-orange-200 text-sm">₹{selectedPlan.price}{selectedPlan.per} • {deliveryMode === 'delivery' ? '🚴 Delivery' : deliveryMode === 'pickup' ? '🏠 Pickup' : '🍽️ Dine-in'}</p>
            </div>
            <button
              onClick={() => onSubscribe?.({ plan: selectedPlan, deliveryMode })}
              className="bg-white text-orange-500 font-bold px-5 py-2 rounded-xl text-sm flex items-center gap-1"
            >
              Subscribe <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
