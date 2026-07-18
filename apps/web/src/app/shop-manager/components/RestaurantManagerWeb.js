'use client';
import React from 'react';

export default function RestaurantManagerWeb() {
  return (
    <div className="bg-background-alt p-6 rounded-2xl border border-border shadow-sm">
      <h2 className="text-xl font-bold mb-6">Dine-in Table Layout</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { id: 'T1', status: 'Occupied', seats: 4 },
          { id: 'T2', status: 'Available', seats: 2 },
          { id: 'T3', status: 'Available', seats: 4 },
          { id: 'T4', status: 'Reserved', seats: 6 }
        ].map(table => (
          <div key={table.id} className={`p-6 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:shadow-md
            ${table.status === 'Occupied' ? 'bg-red-50 border-red-200 text-red-600' : ''}
            ${table.status === 'Available' ? 'bg-white border-border text-text' : ''}
            ${table.status === 'Reserved' ? 'bg-amber-50 border-amber-200 text-amber-600' : ''}
          `}>
            <span className="text-3xl font-black mb-1">{table.id}</span>
            <span className="text-sm font-bold uppercase tracking-wider mb-2">{table.status}</span>
            <span className="text-xs opacity-70">{table.seats} Seats</span>
          </div>
        ))}
      </div>
    </div>
  );
}
