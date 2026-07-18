'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Star, MapPin, Phone, Calendar, CheckCircle, Users,
  Heart, Timer, Scissors, Award, Sparkles, ChevronRight
} from 'lucide-react';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// ENHANCED SALON VISITOR VIEW
// What visitors see: services, staff, live wait time, membership plans, book
// ═══════════════════════════════════════════════════════════════════════

export default function EnhancedSalonVisitorView({ shop, services = [], staff = [], onBookAppointment }) {
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Group services by category
  const serviceCategories = {};
  services.forEach(s => {
    const cat = s.category || 'General';
    if (!serviceCategories[cat]) serviceCategories[cat] = [];
    serviceCategories[cat].push(s);
  });

  return (
    <div className="space-y-8">
      {/* Live Waitlist Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-2xl p-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
            <Timer className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <p className="text-text font-bold">Current Wait Time</p>
            <p className="text-text-muted text-sm">Walk-in availability</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-pink-500">~15 min</p>
          <p className="text-xs text-text-muted">2 ahead of you</p>
        </div>
      </motion.div>

      {/* Service Catalog */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Scissors className="w-6 h-6 text-pink-500" /> Our Services
        </h2>

        {Object.entries(serviceCategories).length > 0 ? (
          Object.entries(serviceCategories).map(([cat, catServices]) => (
            <div key={cat} className="mb-6 last:mb-0">
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">{cat}</h3>
              <div className="space-y-3">
                {catServices.map(service => {
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <motion.div
                      key={service.id}
                      onClick={() => setSelectedService(isSelected ? null : service)}
                      whileHover={{ scale: 1.01 }}
                      className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                        isSelected ? 'border-pink-500 bg-pink-500/5' : 'border-border hover:border-pink-500/30'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-text">{service.name}</h4>
                            {service.is_popular && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full">🔥 Popular</span>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-xs text-text-muted mt-1">{service.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-xs font-medium text-text-muted">
                              <Clock className="w-3 h-3" /> {service.duration_minutes || 30} min
                            </span>
                            {service.gender && (
                              <span className="text-xs text-text-muted">{service.gender === 'M' ? '👨 Men' : service.gender === 'F' ? '👩 Women' : '👥 Unisex'}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-lg text-pink-500">₹{service.price}</span>
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-1">
                              <CheckCircle className="w-5 h-5 text-pink-500" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: 'Haircut & Styling', price: 300, time: '30 min', gender: '👥 Unisex' },
              { name: 'Hair Spa + Keratin', price: 1500, time: '90 min', gender: '👩 Women', popular: true },
              { name: 'Beard Trim & Shape', price: 150, time: '15 min', gender: '👨 Men' },
              { name: 'Bridal Makeup', price: 5000, time: '120 min', gender: '👩 Women', popular: true },
              { name: 'Facial (Gold)', price: 800, time: '45 min', gender: '👥 Unisex' },
              { name: 'Manicure + Pedicure', price: 600, time: '60 min', gender: '👩 Women' },
            ].map((s, i) => (
              <div key={i} className="p-4 rounded-xl border border-border hover:border-pink-500/30 cursor-pointer transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-text text-sm">{s.name}</h4>
                      {s.popular && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded-full">🔥</span>}
                    </div>
                    <p className="text-xs text-text-muted mt-1">{s.time} • {s.gender}</p>
                  </div>
                  <span className="font-black text-pink-500">₹{s.price}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff / Stylists */}
      {staff.length > 0 && (
        <div className="bg-background-alt p-6 rounded-2xl border border-border">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" /> Our Stylists
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {staff.map(s => (
              <div
                key={s.id}
                onClick={() => setSelectedStaff(s)}
                className={`min-w-[140px] p-4 rounded-xl border-2 text-center cursor-pointer transition-all ${
                  selectedStaff?.id === s.id ? 'border-pink-500 bg-pink-500/5' : 'border-border hover:border-pink-500/30'
                }`}
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-background-alt border border-border flex items-center justify-center text-xl mb-2">
                  {s.profile_image ? <img src={s.profile_image} className="w-full h-full rounded-full object-cover" /> : '💇'}
                </div>
                <p className="font-bold text-sm text-text">{s.name}</p>
                <p className="text-xs text-text-muted">{s.specialization || 'Stylist'}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-amber-600">{s.avg_rating || '4.5'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Membership Plans */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" /> Membership Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Silver', price: '₹999/mo', discount: '10% off', color: '#94a3b8', benefits: ['10% off all services', 'Priority booking'] },
            { name: 'Gold', price: '₹2,499/3mo', discount: '20% off', color: '#eab308', benefits: ['20% off all services', 'Free hair wash', 'Priority booking'] },
            { name: 'Platinum', price: '₹4,999/6mo', discount: '30% off', color: '#a855f7', benefits: ['30% off all services', 'Free hair wash + styling', 'VIP priority', '1 free facial/month'] },
          ].map((plan, i) => (
            <div key={i} className="p-5 rounded-xl border-2 text-center hover:shadow-lg transition-all cursor-pointer"
              style={{ borderColor: `${plan.color}40` }}>
              <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-3"
                style={{ background: `${plan.color}20` }}>
                <Award className="w-5 h-5" style={{ color: plan.color }} />
              </div>
              <h3 className="font-bold text-lg" style={{ color: plan.color }}>{plan.name}</h3>
              <p className="font-black text-xl text-text mt-1">{plan.price}</p>
              <ul className="text-xs text-text-muted mt-3 space-y-1 text-left">
                {plan.benefits.map((b, j) => (
                  <li key={j} className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" /> {b}
                  </li>
                ))}
              </ul>
              <button className="mt-4 w-full py-2 rounded-lg text-sm font-bold transition-all"
                style={{ background: `${plan.color}15`, color: plan.color, border: `1px solid ${plan.color}30` }}>
                Join {plan.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Book CTA */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-pink-500 text-white rounded-2xl px-6 py-4 shadow-2xl shadow-pink-500/30 flex items-center gap-4 max-w-md w-[90%]"
          >
            <div className="flex-1">
              <p className="font-bold">{selectedService.name || 'Service Selected'}</p>
              <p className="text-pink-200 text-sm">₹{selectedService.price} • {selectedService.duration_minutes || 30} min</p>
            </div>
            <button
              onClick={() => onBookAppointment?.({ service: selectedService, staff: selectedStaff })}
              className="bg-white text-pink-500 font-bold px-5 py-2 rounded-xl text-sm flex items-center gap-1"
            >
              Book Now <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
