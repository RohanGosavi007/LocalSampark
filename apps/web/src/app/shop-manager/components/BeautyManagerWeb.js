'use client';
import React from 'react';
import { Scissors, Clock } from 'lucide-react';

export default function BeautyManagerWeb() {
  return (
    <div className="bg-background-alt p-6 rounded-2xl border border-border shadow-sm">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Scissors className="text-pink-500"/> Upcoming Bookings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { time: '02:00 PM', client: 'Neha Patel', service: 'Bridal Makeup • 2 Hrs', stylist: 'Ritu' },
          { time: '04:30 PM', client: 'Anjali Desai', service: 'Hair Spa + Cut • 1.5 Hrs', stylist: 'Any Available' }
        ].map((apt, idx) => (
          <div key={idx} className="bg-background border border-pink-200 border-l-4 border-l-pink-500 rounded-xl p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-text">{apt.client}</h3>
                <p className="text-sm text-text-muted mt-1">{apt.service}</p>
              </div>
              <div className="text-right">
                <span className="font-black text-text block mb-2">{apt.time}</span>
                <button className="bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200 px-3 py-1 rounded text-xs font-bold transition-colors">
                  Assign Stylist
                </button>
              </div>
            </div>
            <div className="text-xs font-bold text-pink-600 bg-pink-50 inline-block px-2 py-1 rounded">
              Requested: {apt.stylist}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
