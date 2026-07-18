'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag, Search, Filter, Star, Heart, Tag,
  Truck, Shield, Clock, ChevronRight, Grid, List,
  Percent, Award, Package
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// ENHANCED RETAIL VISITOR VIEW
// What visitors see: product catalog, deals, search, trust badges
// For: Grocery, Clothing, Stationery, Hardware, Jewellery, etc.
// ═══════════════════════════════════════════════════════════════════════

export default function RetailVisitorView({ shop, products = [], onAddToCart }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', ...new Set(products.map(p => p.category || 'General'))];
  const filtered = products
    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
    .filter(p => !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Deals Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <Tag className="w-5 h-5 text-orange-500" /> Today's Deals
            </h2>
            <p className="text-text-muted text-sm mt-1">Save up to 20% on select items</p>
          </div>
          <span className="text-3xl">🔥</span>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-1 bg-background-alt rounded-xl p-1 border border-border">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-text-muted'}`}>
            <Grid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary text-white' : 'text-text-muted'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Chips */}
      {categories.length > 2 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? 'bg-primary text-white border-primary'
                  : 'bg-transparent border-border text-text-muted hover:border-primary/30'
              }`}>
              {cat === 'all' ? '🛒 All' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {filtered.length > 0 ? (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
          : 'space-y-3'
        }>
          {filtered.map((product, i) => (
            <motion.div
              key={product.id || i}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`bg-background-alt rounded-xl border border-border overflow-hidden hover:shadow-md hover:border-primary/20 transition-all cursor-pointer ${
                viewMode === 'list' ? 'flex items-center gap-4 p-3' : ''
              }`}
            >
              {/* Product Image */}
              <div className={`bg-background flex items-center justify-center ${viewMode === 'grid' ? 'aspect-square' : 'w-20 h-20 shrink-0 rounded-lg'}`}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-8 h-8 text-text-muted" />
                )}
              </div>
              {/* Product Info */}
              <div className={viewMode === 'grid' ? 'p-3' : 'flex-1'}>
                <p className="font-bold text-sm text-text line-clamp-2">{product.name || 'Product'}</p>
                {product.unit && <p className="text-[10px] text-text-muted mt-0.5">{product.unit}</p>}
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <span className="font-black text-primary">₹{product.price || '—'}</span>
                    {product.mrp && product.mrp > product.price && (
                      <span className="text-xs text-text-muted line-through ml-1">₹{product.mrp}</span>
                    )}
                  </div>
                  <button
                    onClick={() => onAddToCart?.(product)}
                    className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:shadow-md transition-all"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-background-alt rounded-2xl border border-border">
          <ShoppingBag className="w-12 h-12 mx-auto text-text-muted mb-3" />
          <p className="text-text-muted font-medium">
            {searchQuery ? 'No products match your search' : 'Products coming soon'}
          </p>
        </div>
      )}

      {/* Trust Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Shield, label: 'Quality Assured', color: '#22c55e' },
          { icon: Truck, label: 'Fast Delivery', color: '#3b82f6' },
          { icon: Percent, label: 'Best Prices', color: '#f97316' },
          { icon: Award, label: 'Trusted by 500+', color: '#8b5cf6' },
        ].map((badge, i) => (
          <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-background-alt border border-border">
            <badge.icon className="w-4 h-4 shrink-0" style={{ color: badge.color }} />
            <span className="text-xs font-bold text-text">{badge.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
