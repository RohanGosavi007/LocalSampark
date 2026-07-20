import React, { useState } from 'react';
import { Sun, Sunset, Moon } from 'lucide-react';

export default function SlotMatrixGrid({ slots = {}, onSelectSlot }) {
  const [selected, setSelected] = useState(null);

  const renderSection = (title, icon, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-6 last:mb-0">
        <h4 className="text-sm font-bold text-text-muted flex items-center gap-2 mb-3">
          {icon} {title}
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {items.map((slot) => {
            const isSelected = selected === slot.id;
            const isBooked = slot.status === 'booked';
            const isFillingFast = slot.status === 'filling_fast';

            return (
              <button
                key={slot.id}
                disabled={isBooked}
                onClick={() => {
                  setSelected(slot.id);
                  onSelectSlot?.(slot);
                }}
                className={`py-2 px-1 rounded-xl text-center border-2 transition-all flex flex-col items-center justify-center ${
                  isBooked 
                    ? 'opacity-40 bg-background-alt border-border cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-500 border-blue-500 shadow-md text-white'
                    : isFillingFast
                    ? 'border-amber-400 bg-amber-500/5 text-amber-600 hover:border-amber-500'
                    : 'border-border bg-background hover:border-blue-500/30 text-text'
                }`}
              >
                <span className="font-bold text-sm">{slot.time}</span>
                {isFillingFast && !isSelected && <span className="text-[9px] font-bold">Filling Fast</span>}
                {isBooked && <span className="text-[9px] font-bold">Booked</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="slot-matrix-grid">
      {renderSection('Morning', <Sun className="w-4 h-4 text-amber-500" />, slots.morning)}
      {renderSection('Afternoon', <Sunset className="w-4 h-4 text-orange-500" />, slots.afternoon)}
      {renderSection('Evening', <Moon className="w-4 h-4 text-indigo-500" />, slots.evening)}
    </div>
  );
}
