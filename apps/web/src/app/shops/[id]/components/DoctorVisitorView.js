import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, Video, FileText, ChevronRight, MapPin, Star, Clock, CheckCircle } from 'lucide-react';
import TokenTrackerBar from '@/components/ui/TokenTrackerBar';
import SlotMatrixGrid from '@/components/ui/SlotMatrixGrid';
import { API_URL } from '@/lib/api';

export default function DoctorVisitorView({ shop, services = [], staff = [], onBookAppointment }) {
  const [activeTab, setActiveTab] = useState('book');
  const [selectedStaff, setSelectedStaff] = useState(staff[0] || null);
  const [selectedService, setSelectedService] = useState(services[0] || null);
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  React.useEffect(() => {
    if (selectedStaff && appointmentDate && shop?.id) {
      setLoadingSlots(true);
      fetch(`${API_URL}/api/v1/shops/${shop.id}/staff/${selectedStaff.id}/slots?date=${appointmentDate}`)
        .then(r => r.json())
        .then(data => {
          setAvailableSlots(data.slots || []);
          setLoadingSlots(false);
        })
        .catch(() => setLoadingSlots(false));
    } else {
        setAvailableSlots([]);
    }
  }, [selectedStaff, appointmentDate, shop?.id]);

  const formattedSlots = {
    morning: availableSlots.filter(s => s.time.includes('AM')),
    evening: availableSlots.filter(s => s.time.includes('PM'))
  };

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
            <p className="text-sm text-text-muted mb-4">Choose a doctor, date, and an available slot to visit the clinic.</p>

            {/* Date Selection */}
            <div className="mb-6">
                <input 
                    type="date" 
                    value={appointmentDate} 
                    onChange={e => setAppointmentDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-border bg-background text-text focus:ring-2 focus:ring-cat-booking"
                    min={new Date().toISOString().split('T')[0]}
                />
            </div>

            {/* Doctor Selection */}
            {staff.length > 0 && (
              <div className="mb-6 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {staff.map(st => (
                  <button 
                    key={st.id} 
                    onClick={() => setSelectedStaff(st)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all shrink-0 ${selectedStaff?.id === st.id ? 'border-cat-booking bg-cat-booking/10' : 'border-border hover:border-cat-booking/50'}`}
                  >
                    <img src={st.image_url || 'https://placehold.co/150'} alt={st.name} className="w-10 h-10 rounded-full" />
                    <div className="text-left">
                      <p className="font-bold text-sm text-text">{st.name}</p>
                      <p className="text-xs text-text-muted">{st.specialization}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Service Selection */}
            {services.length > 0 && (
              <div className="mb-6 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {services.map(srv => (
                  <button 
                    key={srv.id} 
                    onClick={() => setSelectedService(srv)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all shrink-0 ${selectedService?.id === srv.id ? 'border-cat-booking bg-cat-booking text-white' : 'border-border text-text hover:border-cat-booking'}`}
                  >
                    {srv.name}
                  </button>
                ))}
              </div>
            )}
            
            {loadingSlots ? (
                <div className="text-center py-8 text-text-muted animate-pulse">Loading available slots...</div>
            ) : availableSlots.length > 0 ? (
                <SlotMatrixGrid 
                  slots={formattedSlots}
                  onSelectSlot={(slot) => {
                    onBookAppointment?.({ service: selectedService, staff: selectedStaff, slot, metadata: { date: appointmentDate } });
                  }}
                />
            ) : (
                <div className="text-center py-8 text-text-muted">No slots available for this date.</div>
            )}
          </motion.div>
        )}

        {activeTab === 'video' && (
          <motion.div key="video" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-background-alt p-8 rounded-2xl border border-border text-center">
            <div className="w-16 h-16 rounded-full bg-cat-booking-light text-cat-booking mx-auto flex items-center justify-center mb-4">
              <Video className="w-8 h-8" />
            </div>
            <h3 className="font-heading font-bold text-xl text-text mb-2">Online Video Consultation</h3>
            <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">Consult the doctor from the comfort of your home. Get digital prescriptions instantly.</p>
            <button 
              className="bg-cat-booking text-white font-bold px-6 py-3 rounded-xl shadow-md hover:bg-cat-booking-dark transition-all"
              onClick={() => onBookAppointment?.({ service: { name: 'Video Consultation', price: 300 }, metadata: { type: 'video' } })}
            >
              Start Instant Consult (₹300)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

