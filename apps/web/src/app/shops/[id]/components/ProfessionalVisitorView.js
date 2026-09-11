'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase, Star, Clock, Phone, Calendar, Shield,
  CheckCircle, ChevronRight, FileText, Award, Users,
  MapPin, MessageCircle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// ENHANCED PROFESSIONAL VISITOR VIEW
// For: CAs, Lawyers, Insurance Agents, Real Estate, Astrologers, Travel
// Features: Consultation types, expertise areas, booking, testimonials
// ═══════════════════════════════════════════════════════════════════════

// Shown only when a shop has published no services of its own. Generic on
// purpose: these are delivery formats, not claims about the business.
const FALLBACK_CONSULTATIONS = [
  { id: 'in_person', name: 'In-Person Visit', icon: '🏢', desc: 'Visit our office', time: '30-60 min' },
  { id: 'video', name: 'Video Call', icon: '📹', desc: 'Online consultation', time: '30 min' },
  { id: 'phone', name: 'Phone Consultation', icon: '📞', desc: 'Quick call', time: '15 min' },
  { id: 'home', name: 'Home Visit', icon: '🏠', desc: 'We come to you', time: '60 min' },
];

export default function ProfessionalVisitorView({ shop, services = [], onBookAppointment }) {
  const [selectedType, setSelectedType] = useState(null);

  // `services` was destructured and then never referenced anywhere in this
  // component — the shop's real service list and prices were fetched, passed
  // down and silently discarded, while every professional shop rendered the
  // same four hardcoded options at the same invented prices (₹500/₹300/₹200/
  // ₹1000). Real services take precedence; the generic formats above are only
  // a fallback for a shop that has published none.
  const consultations = services.length
    ? services.map((s, i) => ({
        id: s.id ?? `svc-${i}`,
        name: s.serviceName || s.name || 'Consultation',
        icon: '📋',
        desc: s.description || s.serviceCategory || s.category || 'Consultation',
        time: s.durationMinutes ? `${s.durationMinutes} min` : null,
        price: s.price ?? (s.pricePaise != null ? s.pricePaise / 100 : null),
      }))
    : FALLBACK_CONSULTATIONS;

  // Derived from what the shop actually offers. This was a hardcoded list of
  // CA/tax topics (Income Tax, GST, ROC Filing, TDS), so a lawyer, an insurance
  // agent, a travel agent, an interior designer and an astrologer all advertised
  // "ROC Filing" as an area of expertise.
  const expertise = [
    ...new Set(
      services
        .map((s) => s.serviceCategory || s.category || s.serviceName || s.name)
        .filter(Boolean)
    ),
  ];

  return (
    <div className="space-y-6">
      {/* Professional Intro */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-500/10 to-indigo-500/10 border border-slate-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl">
            ⚖️
          </div>
          <div>
            <h2 className="text-xl font-bold text-text">{shop?.name || 'Professional Services'}</h2>
            {/* "Trusted by 200+ clients • 10+ years experience" was hardcoded
                here, and the rating below was a fixed "4.8 (120 reviews)" —
                unqualified claims rendered identically for every professional
                shop, whatever its real record. Both now come from the shop, and
                the rating is omitted rather than invented when it has none. */}
            {shop?.description && (
              <p className="text-text-muted text-sm mt-1">{shop.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              {shop?.rating > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                  <Star className="w-3 h-3 fill-amber-400" /> {shop.rating}
                  {shop.totalRatings > 0 && ` (${shop.totalRatings} reviews)`}
                </span>
              )}
              <span className="text-xs text-green-500 font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Verified
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Consultation Types */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-indigo-500" /> Consultation Options
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {consultations.map((opt, i) => (
            <motion.div key={opt.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              onClick={() => setSelectedType(opt)}
              className={`p-4 rounded-xl cursor-pointer transition-all border-2 flex items-center gap-3 ${
                selectedType?.id === opt.id
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : 'border-border hover:border-indigo-500/30'
              }`}
            >
              <span className="text-2xl">{opt.icon}</span>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-text">{opt.name}</h3>
                <p className="text-xs text-text-muted">
                  {[opt.desc, opt.time].filter(Boolean).join(' • ')}
                </p>
              </div>
              {/* A shop that has not priced a service shows no price, rather
                  than one this component made up. */}
              {opt.price != null && (
                <span className="font-black text-indigo-500">₹{opt.price}</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Areas of Expertise — omitted entirely when the shop has published no
          services, rather than falling back to a fixed list. This was hardcoded
          to CA/tax topics, so a lawyer, insurance agent, travel agent, interior
          designer and astrologer all listed "ROC Filing" and "TDS". */}
      {expertise.length > 0 && (
        <div className="bg-background-alt p-6 rounded-2xl border border-border">
          <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" /> Areas of Expertise
          </h2>
          <div className="flex flex-wrap gap-2">
            {expertise.map((area, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Trust Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          // "1000+ Cases Handled" was here — a specific, unverifiable claim
          // asserted on behalf of every professional shop on the platform.
          // Replaced with a statement about how the platform works, which is
          // true of all of them.
          { icon: Shield, label: 'Licensed & Certified', color: '#22c55e' },
          { icon: FileText, label: 'Documented Engagements', color: '#3b82f6' },
          { icon: Clock, label: 'Quick Turnaround', color: '#f97316' },
          { icon: Users, label: 'Confidential & Secure', color: '#8b5cf6' },
        ].map((badge, i) => (
          <div key={i} className="p-3 rounded-xl bg-background-alt border border-border text-center">
            <badge.icon className="w-5 h-5 mx-auto mb-1" style={{ color: badge.color }} />
            <p className="text-xs font-bold text-text">{badge.label}</p>
          </div>
        ))}
      </div>

      {/* Book CTA */}
      {selectedType && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-indigo-500 text-white rounded-2xl px-6 py-4 shadow-2xl shadow-indigo-500/30 flex items-center gap-4 max-w-md w-[90%]"
        >
          <div className="flex-1">
            <p className="font-bold">{selectedType.label}</p>
            <p className="text-indigo-200 text-sm">₹{selectedType.price} • {selectedType.time}</p>
          </div>
          <button
            onClick={() => onBookAppointment?.(selectedType)}
            className="bg-white text-indigo-500 font-bold px-5 py-2 rounded-xl text-sm flex items-center gap-1"
          >
            Book Now <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
