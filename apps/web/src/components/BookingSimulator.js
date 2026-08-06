'use client';
import React from 'react';
import { Calendar, User, Clock, CheckCircle2 } from 'lucide-react';

export default function BookingSimulator({ bookingState, setBookingState }) {
  const statusSteps = ['REQUESTED', 'CONFIRMED', 'IN_SERVICE', 'COMPLETED'];

  const advanceBooking = () => {
    const idx = statusSteps.indexOf(bookingState);
    if (idx >= 0 && idx < statusSteps.length - 1) {
      setBookingState(statusSteps[idx + 1]);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-2xl h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <span>Service Booking Simulator</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Provider Console — Manage appointments & queues</p>
        </div>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex-1 flex flex-col">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <span className="text-xs font-mono text-blue-400 font-bold">APPT #LS-BK-9921</span>
            <h3 className="text-sm font-semibold text-white mt-1">Dr. Sharma Dental Clinic</h3>
            <p className="text-xs text-slate-400">Patient: Rahul Verma (Root Canal Consultation)</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-blue-400">10:30 AM</span>
            <span className="text-xs text-slate-500 flex items-center justify-end gap-1"><Clock className="w-3 h-3"/> Today</span>
          </div>
        </div>

        <div className="my-6 grid grid-cols-4 gap-2 text-center flex-1">
          {statusSteps.map((step, idx) => {
            const activeIdx = statusSteps.indexOf(bookingState);
            const isPassed = idx <= activeIdx;
            return (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isPassed ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-500'
                }`}>
                  {isPassed ? <CheckCircle2 className="w-4 h-4"/> : idx + 1}
                </div>
                <span className={`text-[10px] mt-2 font-medium uppercase tracking-tight ${
                  isPassed ? 'text-blue-400 font-semibold' : 'text-slate-500'
                }`}>
                  {step.replace(/_/g, ' ')}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/50 justify-end">
            <button
              onClick={advanceBooking}
              disabled={bookingState === 'COMPLETED'}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs rounded-lg transition-colors"
            >
              {bookingState === 'COMPLETED' ? 'Flow Complete' : 'Advance Status'}
            </button>
        </div>
      </div>
    </div>
  );
}
