'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, Clock, Star, Phone, Camera, Shield, MapPin,
  CheckCircle, ChevronRight, Users, FileText, Calendar,
  Image, Award, ThumbsUp
} from 'lucide-react';
import SlotMatrixGrid from '@/components/ui/SlotMatrixGrid';

// ═══════════════════════════════════════════════════════════════════════
// ENHANCED HOME SERVICE VISITOR VIEW
// What visitors see: services, technician profiles, work gallery, request quote
// For: Plumber, Electrician, Pest Control, Cleaning, Painting, CCTV, Locksmith
// ═══════════════════════════════════════════════════════════════════════

export default function EnhancedHomeServiceVisitorView({ shop, services = [], staff = [], onRequestQuote }) {
  const [selectedService, setSelectedService] = useState(null);
  const [urgency, setUrgency] = useState('normal');

  return (
    <div className="space-y-8">
      {/* Quick Request Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-text flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-500" /> Need Help Right Now?
            </h2>
            <p className="text-text-muted text-sm mt-1">Get a professional at your doorstep</p>
          </div>
          <div className="flex gap-2">
            {[
              { key: 'normal', label: 'Schedule', time: 'Within 24h', color: '#22c55e' },
              { key: 'urgent', label: 'Urgent', time: 'Within 2h', color: '#f59e0b' },
              { key: 'emergency', label: 'Emergency', time: 'Within 30 min', color: '#ef4444' },
            ].map(u => (
              <button
                key={u.key}
                onClick={() => setUrgency(u.key)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  urgency === u.key
                    ? `text-white shadow-lg`
                    : 'bg-background border-border text-text-muted hover:border-blue-500/30'
                }`}
                style={urgency === u.key ? { background: u.color, borderColor: u.color } : {}}
              >
                {u.label}
                <span className="block text-[10px] font-normal opacity-75">{u.time}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Services */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Wrench className="w-6 h-6 text-blue-500" /> Our Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(services.length > 0 ? services : [
            { name: 'Tap / Faucet Repair', price: 199, icon: '🔧', visit: true },
            { name: 'Pipe Leakage Fix', price: 349, icon: '🚰', visit: true },
            { name: 'Drain Unclogging', price: 499, icon: '🪠', visit: true },
            { name: 'Full Bathroom Renovation', price: 0, icon: '🏗️', quote: true },
            { name: 'Water Tank Cleaning', price: 799, icon: '🧹' },
            { name: 'Motor / Pump Repair', price: 599, icon: '⚡' },
          ]).map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedService(s)}
              className={`p-4 rounded-xl cursor-pointer transition-all border-2 flex items-center gap-3 ${
                selectedService?.name === s.name
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-border hover:border-blue-500/30'
              }`}
            >
              <span className="text-2xl shrink-0">{s.icon || '🔧'}</span>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-text">{s.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {s.visit && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Visit Charge Included</span>}
                  {s.quote && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Get Quote</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                {s.quote ? (
                  <span className="font-bold text-amber-500 text-sm">Request Quote</span>
                ) : (
                  <span className="font-black text-blue-500">₹{s.price}+</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Technician Profiles */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" /> Our Technicians
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {(staff.length > 0 ? staff : [
            { id: 1, name: 'Rajesh K.', specialization: 'Plumbing Expert', experience_years: 12, avg_rating: 4.7, jobs_completed: 850 },
            { id: 2, name: 'Sunil M.', specialization: 'Electrical', experience_years: 8, avg_rating: 4.5, jobs_completed: 620 },
            { id: 3, name: 'Amit P.', specialization: 'AC Specialist', experience_years: 10, avg_rating: 4.8, jobs_completed: 730 },
          ]).map((tech, i) => (
            <div key={tech.id || i} className="min-w-[180px] p-4 rounded-xl border border-border text-center hover:shadow-md transition-all">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center text-xl mb-2">👷</div>
              <p className="font-bold text-sm text-text">{tech.name}</p>
              <p className="text-xs text-text-muted">{tech.specialization}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="flex items-center gap-0.5 text-xs text-amber-600">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {tech.avg_rating}
                </span>
                <span className="text-xs text-text-muted">{tech.experience_years}y</span>
              </div>
              {tech.jobs_completed && (
                <p className="text-[10px] text-text-muted mt-1 flex items-center justify-center gap-1">
                  <ThumbsUp className="w-3 h-3" /> {tech.jobs_completed} jobs done
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Work Gallery */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-purple-500" /> Work Gallery
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square bg-background rounded-lg border border-border flex items-center justify-center">
              <Image className="w-6 h-6 text-text-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Shield, label: '30 Day Warranty', color: '#22c55e' },
          { icon: CheckCircle, label: 'Background Verified', color: '#3b82f6' },
          { icon: Award, label: 'Trained Professionals', color: '#f97316' },
          { icon: FileText, label: 'Transparent Pricing', color: '#8b5cf6' },
        ].map((badge, i) => (
          <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-background-alt border border-border">
            <badge.icon className="w-4 h-4 shrink-0" style={{ color: badge.color }} />
            <span className="text-xs font-bold text-text">{badge.label}</span>
          </div>
        ))}
      </div>

      {/* Book / Request Quote CTA */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-background-alt p-6 rounded-2xl border border-cat-services/30"
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-heading font-bold text-lg text-text">Service: {selectedService.name}</h3>
                <p className="text-sm text-text-muted">
                  {selectedService.quote ? 'Custom quote' : `₹${selectedService.price}+`}
                  {' • '}
                  {urgency === 'emergency' ? '🔴 Emergency' : urgency === 'urgent' ? '🟡 Urgent' : '🟢 Scheduled'}
                </p>
              </div>
              <button onClick={() => setSelectedService(null)} className="text-xs text-text-muted hover:text-text">Cancel</button>
            </div>

            {selectedService.quote ? (
              <button
                onClick={() => onRequestQuote?.({ service: selectedService, urgency })}
                className="w-full bg-cat-services text-white font-bold px-5 py-3 rounded-xl text-sm shadow-md hover:bg-cat-services-dark transition-all"
              >
                Request Free Quote
              </button>
            ) : (
              <SlotMatrixGrid 
                slots={{
                  morning: [
                    { id: 'm1', time: '09:00', status: 'available' },
                    { id: 'm2', time: '11:00', status: 'available' },
                  ],
                  afternoon: [
                    { id: 'a1', time: '14:00', status: 'booked' },
                    { id: 'a2', time: '16:00', status: 'filling_fast', remaining: 1 },
                  ],
                }}
                onSelectSlot={(slot) => onRequestQuote?.({ service: selectedService, urgency, slot })}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
