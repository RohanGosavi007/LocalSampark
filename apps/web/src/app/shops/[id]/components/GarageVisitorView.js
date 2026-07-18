'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench, Clock, Star, Phone, Camera, Shield, FileText,
  CheckCircle, ChevronRight, Car, Search, MapPin, AlertTriangle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// ENHANCED GARAGE / REPAIR VISITOR VIEW
// What visitors see: services, job card status tracking, work gallery, warranty info
// For: Automotive, Mobile Repair, AC Repair, RO, Laundry
// ═══════════════════════════════════════════════════════════════════════

export default function EnhancedGarageVisitorView({ shop, services = [], onRequestService }) {
  const [trackingId, setTrackingId] = useState('');

  return (
    <div className="space-y-8">
      {/* Track Your Job Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-500/10 to-blue-500/10 border border-slate-500/20 rounded-2xl p-6"
      >
        <h2 className="text-xl font-bold text-text mb-3 flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-500" /> Track Your Job Card
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={trackingId}
            onChange={e => setTrackingId(e.target.value)}
            placeholder="Enter Job Card Number (e.g., JC-0042)"
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-blue-600 transition-colors">
            Track
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Track status: Received → Inspection → Estimate → Approved → In Repair → QC → Ready
        </p>
      </motion.div>

      {/* Services Offered */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Wrench className="w-6 h-6 text-slate-500" /> Services
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(services.length > 0 ? services : [
            { name: 'General Service', price: 2499, icon: '🔧', time: '3-4 hrs' },
            { name: 'Oil Change', price: 899, icon: '🛢️', time: '30 min' },
            { name: 'Brake Pad Replace', price: 1500, icon: '🛞', time: '1 hr' },
            { name: 'AC Service', price: 1999, icon: '❄️', time: '2 hrs' },
            { name: 'Battery Check', price: 199, icon: '🔋', time: '15 min', free: true },
            { name: 'Full Body Wash', price: 499, icon: '🚿', time: '45 min' },
            { name: 'Engine Tune-up', price: 3499, icon: '⚙️', time: '4-5 hrs' },
            { name: 'Denting & Painting', price: 5000, icon: '🎨', time: '2-3 days', estimate: true },
            { name: 'Insurance Claim', price: 0, icon: '📋', time: 'Varies', free: true },
          ]).map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl border border-border hover:border-blue-500/30 cursor-pointer transition-all hover:shadow-md"
            >
              <span className="text-2xl">{s.icon || '🔧'}</span>
              <h3 className="font-bold text-sm text-text mt-2">{s.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {s.free ? (
                  <span className="text-green-500 font-bold text-sm">FREE</span>
                ) : s.estimate ? (
                  <span className="text-amber-500 font-bold text-sm">Get Estimate</span>
                ) : (
                  <span className="text-blue-500 font-black">₹{s.price}</span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {s.time || s.duration_minutes + ' min'}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Work Gallery (Before & After) */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-purple-500" /> Our Work (Before & After)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-square bg-background rounded-xl border border-border flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-8 h-8 text-text-muted mx-auto mb-1" />
                <p className="text-xs text-text-muted">Photo {i}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust & Warranty */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Shield, label: '90 Day Warranty', desc: 'On all repairs', color: '#22c55e' },
          { icon: CheckCircle, label: 'Genuine Parts', desc: 'OEM & branded', color: '#3b82f6' },
          { icon: FileText, label: 'Free Estimate', desc: 'Before repair', color: '#f97316' },
          { icon: Phone, label: 'Roadside Help', desc: '24/7 support', color: '#ef4444' },
        ].map((badge, i) => (
          <div key={i} className="p-4 rounded-xl bg-background-alt border border-border text-center">
            <badge.icon className="w-6 h-6 mx-auto mb-2" style={{ color: badge.color }} />
            <p className="font-bold text-sm text-text">{badge.label}</p>
            <p className="text-xs text-text-muted">{badge.desc}</p>
          </div>
        ))}
      </div>

      {/* Request Service CTA */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white text-center">
        <h3 className="text-xl font-bold mb-2">Need a repair?</h3>
        <p className="text-blue-200 text-sm mb-4">Get a free estimate. Drop in or request a pickup.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => onRequestService?.('walkin')}
            className="bg-white text-blue-600 font-bold px-6 py-3 rounded-xl text-sm hover:shadow-lg transition-all"
          >
            🚗 Drop-in Now
          </button>
          <button
            onClick={() => onRequestService?.('pickup')}
            className="bg-blue-400/30 text-white font-bold px-6 py-3 rounded-xl text-sm border border-white/20 hover:bg-blue-400/50 transition-all"
          >
            🚚 Request Pickup
          </button>
        </div>
      </div>
    </div>
  );
}
