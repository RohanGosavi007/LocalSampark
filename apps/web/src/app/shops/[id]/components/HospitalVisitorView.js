'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Stethoscope, Calendar, Clock, Star, Users, Phone,
  MapPin, CheckCircle, Activity, Shield, FileText,
  ChevronRight, AlertCircle
} from 'lucide-react';
import TokenTrackerBar from '@/components/ui/TokenTrackerBar';
import SlotMatrixGrid from '@/components/ui/SlotMatrixGrid';
import { API_URL } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// ENHANCED HOSPITAL / HEALTHCARE VISITOR VIEW
// What visitors see: OPD queue, doctors, services, book appointment
// For: Pharmacy, Dentist, Pathology, Physio, Ayurvedic, Dietician
// ═══════════════════════════════════════════════════════════════════════

export default function EnhancedHospitalVisitorView({ shop, services = [], staff = [], onBookAppointment }) {
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  React.useEffect(() => {
    if (selectedDoctor && appointmentDate && shop?.id) {
      setLoadingSlots(true);
      fetch(`${API_URL}/api/v1/shops/${shop.id}/staff/${selectedDoctor.id}/slots?date=${appointmentDate}`)
        .then(r => r.json())
        .then(data => {
          setAvailableSlots(data.slots || []);
          setLoadingSlots(false);
        })
        .catch(() => setLoadingSlots(false));
    } else {
        setAvailableSlots([]);
    }
  }, [selectedDoctor, appointmentDate, shop?.id]);

  const formattedSlots = {
    morning: availableSlots.filter(s => s.time.includes('AM')),
    afternoon: availableSlots.filter(s => s.time.includes('PM') && parseInt(s.time.split(':')[0]) < 5 && parseInt(s.time.split(':')[0]) !== 12),
    evening: availableSlots.filter(s => s.time.includes('PM') && (parseInt(s.time.split(':')[0]) >= 5 || parseInt(s.time.split(':')[0]) === 12))
  };

  return (
    <div className="space-y-8">
      {/* Live OPD Queue Banner */}
      <div className="mb-6">
        <h3 className="font-heading font-bold text-text mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-cat-booking" /> Live OPD Status
        </h3>
        <TokenTrackerBar shopId={shop?.id} userToken={22} />
      </div>

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
        
        {/* Slot Picker for Selected Doctor */}
        {selectedDoctor && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 pt-6 border-t border-border"
          >
            <h3 className="font-heading font-bold text-text mb-4">Book Appointment with {selectedDoctor.name}</h3>
            
            <div className="mb-4">
                <p className="text-sm font-bold text-text mb-2">Select Date</p>
                <input 
                    type="date" 
                    value={appointmentDate} 
                    onChange={e => setAppointmentDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-border bg-background text-text focus:ring-2 focus:ring-cyan-500"
                    min={new Date().toISOString().split('T')[0]}
                />
            </div>

            {loadingSlots ? (
                <div className="text-center py-8 text-text-muted animate-pulse">Loading slots...</div>
            ) : availableSlots.length > 0 ? (
                <SlotMatrixGrid 
                  slots={formattedSlots}
                  onSelectSlot={(slot) => onBookAppointment?.({ staff: selectedDoctor, slot, metadata: { date: appointmentDate } })}
                />
            ) : (
                <div className="text-center py-8 text-text-muted">No slots available. Please select a date.</div>
            )}
          </motion.div>
        )}
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
