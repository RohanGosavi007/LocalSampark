'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Stethoscope, Calendar, Clock, Star, Users, Phone,
  MapPin, CheckCircle, Activity, Shield, FileText,
  ChevronRight, AlertCircle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// ENHANCED HOSPITAL / HEALTHCARE VISITOR VIEW
// What visitors see: OPD queue, doctors, services, book appointment
// For: Pharmacy, Dentist, Pathology, Physio, Ayurvedic, Dietician
// ═══════════════════════════════════════════════════════════════════════

export default function EnhancedHospitalVisitorView({ shop, services = [], staff = [], onBookAppointment }) {
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  return (
    <div className="space-y-8">
      {/* Live OPD Queue Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <p className="text-text font-bold">Live OPD Status</p>
              <p className="text-text-muted text-sm">Real-time queue information</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-black text-amber-500">5</p>
              <p className="text-[10px] text-text-muted font-bold uppercase">Waiting</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-cyan-500">~25</p>
              <p className="text-[10px] text-text-muted font-bold uppercase">Min Wait</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-green-500">Open</p>
              <p className="text-[10px] text-text-muted font-bold uppercase">Status</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Doctors / Practitioners */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Stethoscope className="w-6 h-6 text-cyan-500" /> Our Doctors
        </h2>
        <div className="space-y-4">
          {(staff.length > 0 ? staff : [
            { id: 1, name: 'Dr. Sharma', specialization: 'General Medicine', experience_years: 15, avg_rating: 4.8, fee: 500, available: true },
            { id: 2, name: 'Dr. Patel', specialization: 'Pediatrics', experience_years: 10, avg_rating: 4.6, fee: 600, available: true },
            { id: 3, name: 'Dr. Gupta', specialization: 'Orthopedics', experience_years: 20, avg_rating: 4.9, fee: 800, available: false },
          ]).map((doc, i) => (
            <motion.div
              key={doc.id || i}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setSelectedDoctor(doc)}
              className={`p-5 rounded-xl cursor-pointer transition-all border-2 flex items-center gap-4 ${
                selectedDoctor?.id === doc.id
                  ? 'border-cyan-500 bg-cyan-500/5 shadow-lg'
                  : 'border-border hover:border-cyan-500/30'
              }`}
            >
              <div className="w-16 h-16 rounded-xl bg-background flex items-center justify-center text-3xl border border-border shrink-0">
                🩺
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-text">{doc.name}</h3>
                  {doc.available !== false && (
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                  {doc.available === false && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">On Leave</span>
                  )}
                </div>
                <p className="text-sm text-text-muted">{doc.specialization || doc.role}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {doc.avg_rating || '4.5'}
                  </span>
                  <span className="text-xs text-text-muted">{doc.experience_years || '—'}y experience</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-lg text-cyan-500">₹{doc.fee || doc.price || 500}</p>
                <p className="text-[10px] text-text-muted">Consultation</p>
                {doc.available !== false && (
                  <button className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 text-white">
                    Book <ChevronRight className="w-3 h-3 inline" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-500" /> Available Services
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {(services.length > 0 ? services : [
            { name: 'General Checkup', price: 500, icon: '🩺' },
            { name: 'Blood Test', price: 300, icon: '🩸' },
            { name: 'X-Ray', price: 800, icon: '📋' },
            { name: 'ECG', price: 400, icon: '💓' },
            { name: 'Vaccination', price: 200, icon: '💉' },
            { name: 'Dental Cleaning', price: 1000, icon: '🦷' },
          ]).map((s, i) => (
            <div key={i} className="p-4 rounded-xl border border-border hover:border-cyan-500/30 cursor-pointer transition-all text-center">
              <span className="text-2xl">{s.icon || '🏥'}</span>
              <p className="font-bold text-sm text-text mt-2">{s.name}</p>
              <p className="text-cyan-500 font-black mt-1">₹{s.price}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Shield, label: 'HIPAA Compliant', color: '#22c55e' },
          { icon: FileText, label: 'Digital Reports', color: '#3b82f6' },
          { icon: Clock, label: 'Same Day Reports', color: '#f97316' },
          { icon: Phone, label: '24/7 Emergency', color: '#ef4444' },
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
