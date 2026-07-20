'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed, Star, Clock, Flame, Heart, Leaf,
  Truck, Shield, Award, Percent, Search
} from 'lucide-react';
import ModifierDrawer from '@/components/ui/ModifierDrawer';
import { KitchenStatusPill } from '@/components/ui/UnitSelector';

// ═══════════════════════════════════════════════════════════════════════
// ENHANCED RESTAURANT VISITOR VIEW
// For: Restaurants, Cafes
// Features: Menu with categories, veg/non-veg filters, popular items, order
// ═══════════════════════════════════════════════════════════════════════

export default function RestaurantVisitorView({ shop, products = [], onAddToCart }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [vegFilter, setVegFilter] = useState('all'); // all | veg | nonveg
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modifier Drawer State
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const categories = ['all', ...new Set(products.map(p => p.category || 'Main Course'))];
  const filtered = products
    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
    .filter(p => {
      if (vegFilter === 'veg') return p.is_veg;
      if (vegFilter === 'nonveg') return !p.is_veg;
      return true;
    })
    .filter(p => !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Restaurant Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🍽️</span>
              <h2 className="text-xl font-bold text-text">{shop?.name || 'Restaurant'}</h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                <Star className="w-3 h-3 fill-amber-400" /> 4.5
              </span>
              <span className="text-xs text-text-muted">• 30-40 min delivery</span>
              <span className="text-xs text-text-muted">• ₹200 for two</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 font-bold border border-green-500/20">
              🟢 Open Now
            </span>
          </div>
        </div>
        
        {/* Live Kitchen Status (Demo) */}
        <div className="mt-4 pt-4 border-t border-orange-500/10">
          <p className="text-xs font-bold text-text-muted mb-2">Live Kitchen Status</p>
          <KitchenStatusPill stage={1} />
        </div>
      </motion.div>

      {/* Search + Veg/Non-veg Filter */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search menu..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-background-alt border border-border">
          <button onClick={() => setVegFilter('all')}
            className={`px-3 py-2 rounded-lg text-xs font-bold ${vegFilter === 'all' ? 'bg-primary text-white' : 'text-text-muted'}`}>
            All
          </button>
          <button onClick={() => setVegFilter('veg')}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 ${vegFilter === 'veg' ? 'bg-green-500 text-white' : 'text-text-muted'}`}>
            <Leaf className="w-3 h-3" /> Veg
          </button>
          <button onClick={() => setVegFilter('nonveg')}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 ${vegFilter === 'nonveg' ? 'bg-red-500 text-white' : 'text-text-muted'}`}>
            🔴 Non-veg
          </button>
        </div>
      </div>

      {/* Category Chips */}
      {categories.length > 2 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-transparent border-border text-text-muted hover:border-orange-500/30'
              }`}>
              {cat === 'all' ? '🍽️ Full Menu' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Menu Items */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item, i) => (
            <motion.div key={item.id || i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 bg-background-alt rounded-xl border border-border hover:shadow-md transition-all"
            >
              {/* Veg/Non-veg indicator */}
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                item.is_veg ? 'border-green-500' : 'border-red-500'
              }`}>
                <div className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>

              {/* Item Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-text text-sm">{item.name}</p>
                  {item.is_bestseller && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">⭐ Bestseller</span>}
                  {item.is_spicy && <Flame className="w-3 h-3 text-red-500" />}
                </div>
                {item.description && <p className="text-xs text-text-muted line-clamp-1 mt-0.5">{item.description}</p>}
                <p className="font-black text-orange-500 mt-1">₹{item.price}</p>
              </div>

              {/* Image + Add */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-xl bg-background border border-border overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {item.is_veg ? '🥗' : '🍖'}
                    </div>
                  )}
                </div>
                <button onClick={() => { setSelectedItem(item); setIsDrawerOpen(true); }}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white border-2 border-green-500 text-green-500 font-bold text-xs px-4 py-1 rounded-lg shadow-md hover:bg-green-500 hover:text-white transition-all">
                  ADD
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-background-alt rounded-2xl border border-border">
          <UtensilsCrossed className="w-10 h-10 mx-auto text-text-muted mb-2" />
          <p className="text-text-muted text-sm">{searchQuery ? 'No dishes match your search' : 'Menu coming soon!'}</p>
        </div>
      )}

      {/* Info Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Truck, label: 'Free Delivery ₹299+', color: '#22c55e' },
          { icon: Clock, label: '30-40 min', color: '#3b82f6' },
          { icon: Shield, label: 'FSSAI Licensed', color: '#f97316' },
          { icon: Percent, label: '10% Off First Order', color: '#8b5cf6' },
        ].map((badge, i) => (
          <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-background-alt border border-border">
            <badge.icon className="w-4 h-4 shrink-0" style={{ color: badge.color }} />
            <span className="text-xs font-bold text-text">{badge.label}</span>
          </div>
        ))}
      </div>

      <ModifierDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        item={selectedItem}
        onConfirm={(itemData) => {
          onAddToCart?.(itemData.id, itemData.quantity, itemData.options);
        }}
      />
    </div>
  );
}
