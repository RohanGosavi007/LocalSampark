'use client';
import React from 'react';
import { Calendar, User, Clock, CheckCircle } from 'lucide-react';

export default function DoctorManagerWeb() {
  return (
    <div className="bg-background-alt p-6 rounded-2xl border border-border shadow-sm">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Calendar className="text-blue-500"/> Today's Appointments</h2>
      
      <div className="space-y-4">
        {[
          { time: '10:00 AM', patient: 'Amit Sharma', issue: 'General Checkup', status: 'pending' },
          { time: '10:30 AM', patient: 'Sunita Verma', issue: 'Fever & Cold', status: 'completed' }
        ].map((apt, idx) => (
          <div key={idx} className="flex items-center bg-background border border-border rounded-xl p-4 hover:border-blue-200 transition-colors">
            <div className="w-24 border-r border-border pr-4 mr-4 text-center">
              <span className="font-black text-blue-600">{apt.time}</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-text flex items-center gap-2"><User className="w-4 h-4 text-text-muted"/> {apt.patient}</h3>
              <p className="text-sm text-text-muted mt-1">{apt.issue}</p>
            </div>
            <div>
              {apt.status === 'pending' ? (
                <button className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                  <Clock className="w-4 h-4"/> Check-In
                </button>
              ) : (
                <button className="flex items-center gap-1 bg-green-50 text-green-600 border border-green-200 px-4 py-2 rounded-lg font-bold text-sm" disabled>
                  <CheckCircle className="w-4 h-4"/> Completed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
