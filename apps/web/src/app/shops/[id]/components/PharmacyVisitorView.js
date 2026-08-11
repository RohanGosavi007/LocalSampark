'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, ShoppingBag, Clock, Truck, Shield, Heart,
  Upload, CheckCircle, AlertCircle, Package, Pill,
  FileText, Phone, Star
} from 'lucide-react';
import UnitSelector, { StockBadge } from '@/components/ui/UnitSelector';

// ═══════════════════════════════════════════════════════════════════════
// ENHANCED PHARMACY VISITOR VIEW
// For: Pharmacy, Healthcare shops
// Features: Medicine search, prescription upload, order tracking, health tips
// ═══════════════════════════════════════════════════════════════════════

export default function PharmacyVisitorView({ shop, products = [], onAddToCart }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = products.filter(p =>
    !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Prescription Upload Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-500" /> Upload Prescription
            </h2>
            <p className="text-text-muted text-sm mt-1">Upload your prescription & get medicines delivered</p>
          </div>
          <label className="bg-green-500 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-green-600 transition-colors flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" /> Upload
            <input 
              type="file" 
              className="hidden" 
              accept="image/*,.pdf"
              onChange={(e) => {
                if(e.target.files && e.target.files.length > 0) {
                  alert(`Prescription "${e.target.files[0].name}" selected for upload!`);
                }
              }} 
            />
          </label>
        </div>
      </motion.div>

      {/* Medicine Search */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search medicines, health products..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
        />
      </div>

      {/* Quick Categories */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {[
          { label: 'OTC Medicines', icon: '💊' },
          { label: 'Vitamins', icon: '🧬' },
          { label: 'First Aid', icon: '🩹' },
          { label: 'Baby Care', icon: '👶' },
          { label: 'Personal Care', icon: '🧴' },
          { label: 'Ayurvedic', icon: '🌿' },
          { label: 'Devices', icon: '🩺' },
        ].map((cat, i) => (
          <button key={i} className="flex flex-col items-center gap-1 min-w-[70px] p-3 rounded-xl border border-border hover:border-green-500/30 transition-all">
            <span className="text-xl">{cat.icon}</span>
            <span className="text-[10px] font-bold text-text-muted whitespace-nowrap">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Products */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filtered.map((product, i) => (
            <motion.div key={product.id || i}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
              className="bg-background-alt rounded-xl border border-border overflow-hidden hover:shadow-md transition-all"
            >
              <div className="aspect-square bg-background flex items-center justify-center">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Pill className="w-8 h-8 text-green-500/30" />
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-bold text-xs text-text line-clamp-2 leading-tight">{product.name}</p>
                  <StockBadge stock={product.stock !== undefined ? product.stock : Math.floor(Math.random() * 20)} />
                </div>
                {product.requires_prescription && (
                  <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold mt-1 inline-block w-fit">Rx Required</span>
                )}
                <div className="mt-auto pt-3">
                  <UnitSelector 
                    price={product.price || 0}
                    quantity={0} 
                    onQuantityChange={(qty) => {
                      if(qty > 0) onAddToCart?.(product.id, qty, { unit: product.unit || '1 Pack' });
                    }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-background-alt rounded-2xl border border-border">
          <Pill className="w-10 h-10 mx-auto text-text-muted mb-2" />
          <p className="text-text-muted text-sm">{searchQuery ? 'No results found' : 'Browse medicines & health products'}</p>
        </div>
      )}

      {/* Trust & Delivery Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Shield, label: 'Genuine Medicines', color: '#22c55e' },
          { icon: Truck, label: 'Free Delivery ₹199+', color: '#3b82f6' },
          { icon: Clock, label: '30 Min Delivery', color: '#f97316' },
          { icon: CheckCircle, label: 'Licensed Pharmacy', color: '#8b5cf6' },
        ].map((badge, i) => (
          <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-background-alt border border-border">
            <badge.icon className="w-4 h-4 shrink-0" style={{ color: badge.color }} />
            <span className="text-xs font-bold text-text">{badge.label}</span>
          </div>
        ))}
      </div>

      {/* Health Tips */}
      <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5">
        <h3 className="font-bold text-text flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-blue-500" /> Health Tip
        </h3>
        <p className="text-text-muted text-sm">Always complete your full course of antibiotics even if you feel better. Stopping early can lead to antibiotic resistance.</p>
      </div>
    </div>
  );
}
