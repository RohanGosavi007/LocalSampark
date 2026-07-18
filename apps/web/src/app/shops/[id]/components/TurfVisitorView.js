'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, MapPin, CalendarDays, Dribbble, Target } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export default function TurfVisitorView({ shop, services = [], staff = [], onBookAppointment }) {
  const [selectedService, setSelectedService] = useState(null);
  const [selectedGround, setSelectedGround] = useState(null);

  return (
    <div className="space-y-8">
      {/* Turf Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Dribbble className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-text font-bold">Turf & Grounds Booking</p>
            <p className="text-text-muted text-sm">Select a ground and time slot</p>
          </div>
        </div>
      </motion.div>

      {/* Available Grounds (Mapped from Staff) */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Target className="w-6 h-6 text-emerald-600" /> Choose a Ground
        </h2>
        {staff.length === 0 ? (
          <p className="text-text-muted">No grounds available for booking right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staff.map(ground => {
              const isSelected = selectedGround?.id === ground.id;
              return (
                <motion.div
                  key={ground.id}
                  onClick={() => setSelectedGround(isSelected ? null : ground)}
                  whileHover={{ scale: 1.02 }}
                  className={`p-4 rounded-xl cursor-pointer transition-all border-2 flex items-center gap-4 ${
                    isSelected ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-emerald-500/30'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-text">{ground.name}</h4>
                    <p className="text-xs text-text-muted capitalize">{ground.role}</p>
                  </div>
                  {isSelected && <CheckCircle className="w-6 h-6 text-emerald-500" />}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Services / Time Durations */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Clock className="w-6 h-6 text-emerald-600" /> Playing Duration
        </h2>
        
        {services.length === 0 ? (
          <p className="text-text-muted">No duration packages found.</p>
        ) : (
          <div className="space-y-3">
            {services.map(service => {
              const isSelected = selectedService?.id === service.id;
              return (
                <motion.div
                  key={service.id}
                  onClick={() => setSelectedService(isSelected ? null : service)}
                  whileHover={{ scale: 1.01 }}
                  className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                    isSelected ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-emerald-500/30'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-text">{service.name}</h4>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs font-medium text-text-muted">
                          <Clock className="w-3 h-3" /> {service.duration_minutes || 60} mins
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-lg text-emerald-600">₹{service.price}</span>
                      {isSelected && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-1">
                          <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Book Button */}
      <AnimatePresence>
        {(selectedService && selectedGround) && (
          <motion.div
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-0 right-0 z-40 px-4 md:static md:bottom-auto md:px-0 md:mt-8"
          >
            <div className="container md:px-0 max-w-4xl mx-auto">
              <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">{selectedGround.name}</p>
                  <p className="font-bold">{selectedService.name} - ₹{selectedService.price}</p>
                </div>
                <Button 
                  onClick={() => onBookAppointment && onBookAppointment(selectedService, selectedGround)}
                  className="bg-white text-emerald-600 hover:bg-emerald-50 px-6 py-2 rounded-xl font-bold flex items-center gap-2"
                >
                  <CalendarDays className="w-4 h-4" /> Book Slot
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
