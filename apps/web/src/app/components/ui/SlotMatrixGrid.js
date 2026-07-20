'use client';
import React from 'react';
import { motion } from 'framer-motion';

/**
 * SlotMatrixGrid — Interactive time slot picker for appointments/bookings
 * Shows Morning/Afternoon/Evening slots with live availability status
 * Colors: Available (Green), Filling Fast (Orange), Booked (Grey)
 */
export default function SlotMatrixGrid({ slots = {}, selectedSlot, onSelectSlot, date, loading = false }) {
  const periods = [
    { key: 'morning', label: '🌅 Morning', range: '8:00 AM - 12:00 PM', icon: '☀️' },
    { key: 'afternoon', label: '🌤️ Afternoon', range: '12:00 PM - 5:00 PM', icon: '🌤️' },
    { key: 'evening', label: '🌆 Evening', range: '5:00 PM - 9:00 PM', icon: '🌙' },
  ];

  const getSlotStyle = (slot) => {
    if (slot.status === 'booked' || slot.status === 'unavailable') {
      return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700';
    }
    if (slot.status === 'filling_fast' || (slot.remaining && slot.remaining <= 3)) {
      return 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400 hover:bg-orange-100 cursor-pointer dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
    }
    if (selectedSlot?.id === slot.id) {
      return 'bg-cat-primary-light border-2 font-bold cursor-pointer shadow-sm';
    }
    return 'bg-green-50 text-green-700 border-green-200 hover:border-green-400 hover:bg-green-100 cursor-pointer dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
  };

  const getStatusDot = (slot) => {
    if (slot.status === 'booked' || slot.status === 'unavailable') return 'bg-gray-400';
    if (slot.status === 'filling_fast' || (slot.remaining && slot.remaining <= 3)) return 'bg-orange-500 animate-pulse';
    return 'bg-green-500';
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-5 w-32 bg-border rounded mb-3" />
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="h-14 bg-background-alt rounded-xl border border-border" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const hasSlots = periods.some(p => (slots[p.key] || []).length > 0);

  if (!hasSlots) {
    return (
      <div className="text-center py-12 bg-background-alt rounded-2xl border border-dashed border-border">
        <p className="text-3xl mb-3">📅</p>
        <h4 className="font-heading font-bold text-text mb-1">No Slots Available</h4>
        <p className="text-sm text-text-muted">Try selecting a different date</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-text-muted">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-text-muted">Filling Fast</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          <span className="text-text-muted">Booked</span>
        </div>
      </div>

      {/* Periods */}
      {periods.map(period => {
        const periodSlots = slots[period.key] || [];
        if (periodSlots.length === 0) return null;

        const availableCount = periodSlots.filter(s => s.status !== 'booked' && s.status !== 'unavailable').length;

        return (
          <div key={period.key}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-heading font-bold text-text flex items-center gap-2">
                {period.label}
                <span className="text-xs font-normal text-text-muted">{period.range}</span>
              </h4>
              <span className="text-xs font-bold px-2 py-1 rounded-full cat-badge">
                {availableCount} available
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {periodSlots.map((slot, idx) => {
                const isDisabled = slot.status === 'booked' || slot.status === 'unavailable';
                const isActive = selectedSlot?.id === slot.id;

                return (
                  <motion.button
                    key={slot.id || idx}
                    whileHover={!isDisabled ? { scale: 1.03 } : {}}
                    whileTap={!isDisabled ? { scale: 0.97 } : {}}
                    onClick={() => !isDisabled && onSelectSlot?.(slot)}
                    disabled={isDisabled}
                    className={`relative p-3 rounded-xl border transition-all duration-200 text-center ${getSlotStyle(slot)}`}
                    style={isActive ? { borderColor: 'var(--cat-primary)', backgroundColor: 'var(--cat-primary-light)' } : {}}
                  >
                    {/* Status dot */}
                    <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${getStatusDot(slot)}`} />

                    <p className="text-sm font-bold">{formatTime(slot.start_time || slot.time)}</p>
                    {slot.doctor_name && (
                      <p className="text-[10px] text-text-muted truncate mt-0.5">{slot.doctor_name}</p>
                    )}
                    {slot.remaining && slot.remaining <= 5 && !isDisabled && (
                      <p className="text-[10px] font-semibold text-orange-600 mt-0.5">{slot.remaining} left</p>
                    )}
                    {slot.fee && (
                      <p className="text-[10px] font-bold mt-0.5">₹{slot.fee}</p>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
