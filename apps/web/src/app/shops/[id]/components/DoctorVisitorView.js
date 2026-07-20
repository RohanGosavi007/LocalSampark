import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, Video, FileText, ChevronRight, MapPin, Star, Clock } from 'lucide-react';
import TokenTrackerBar from '@/components/ui/TokenTrackerBar';
import SlotMatrixGrid from '@/components/ui/SlotMatrixGrid';

export default function DoctorVisitorView({ shop }) {
  const [activeTab, setActiveTab] = useState('book');

  return (
    <div className="space-y-8" data-category="booking">
      {/* Live OPD Queue Banner */}
      <div className="mb-6">
        <h3 className="font-heading font-bold text-text mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-cat-booking" /> Live Clinic Queue
        </h3>
        <TokenTrackerBar shopId={shop?.id} userToken={8} />
      </div>

      <div className="flex bg-background-alt p-1 rounded-xl border border-border w-fit mx-auto mb-6">
        <button className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'book' ? 'bg-cat-booking text-white shadow-md' : 'text-text-muted hover:text-text'}`} onClick={() => setActiveTab('book')}>
          <Calendar className="w-4 h-4" /> Clinic Visit
        </button>
        <button className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'video' ? 'bg-cat-booking text-white shadow-md' : 'text-text-muted hover:text-text'}`} onClick={() => setActiveTab('video')}>
          <Video className="w-4 h-4" /> Telemedicine
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'book' && (
          <motion.div key="book" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-background-alt p-6 rounded-2xl border border-border">
            <h3 className="font-heading font-bold text-lg text-text mb-2">Book In-Clinic Appointment</h3>
            <p className="text-sm text-text-muted mb-6">Choose an available slot to visit the clinic.</p>
            
            <SlotMatrixGrid 
              slots={{
                morning: [
                  { id: 'm1', time: '10:00', status: 'available' },
                  { id: 'm2', time: '10:30', status: 'booked' },
                  { id: 'm3', time: '11:00', status: 'filling_fast', remaining: 1 },
                ],
                evening: [
                  { id: 'e1', time: '17:00', status: 'available' },
                  { id: 'e2', time: '17:30', status: 'available' },
                ]
              }}
              onSelectSlot={(slot) => alert(`Selected slot: ${slot.time}`)}
            />
          </motion.div>
        )}

        {activeTab === 'video' && (
          <motion.div key="video" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-background-alt p-8 rounded-2xl border border-border text-center">
            <div className="w-16 h-16 rounded-full bg-cat-booking-light text-cat-booking mx-auto flex items-center justify-center mb-4">
              <Video className="w-8 h-8" />
            </div>
            <h3 className="font-heading font-bold text-xl text-text mb-2">Online Video Consultation</h3>
            <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">Consult the doctor from the comfort of your home. Get digital prescriptions instantly.</p>
            <button className="bg-cat-booking text-white font-bold px-6 py-3 rounded-xl shadow-md hover:bg-cat-booking-dark transition-all">
              Start Instant Consult (₹300)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
