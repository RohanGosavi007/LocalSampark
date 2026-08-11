import React, { useState } from 'react';
import { Flame, Gift, CheckCircle } from 'lucide-react';

export default function DailyStreak() {
  const [claimed, setClaimed] = useState(false);
  const currentStreak = 4; // Mock data
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden mb-6">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="text-orange-500" fill="currentColor" />
            {currentStreak} Day Streak!
          </h3>
          <p className="text-slate-400 text-sm mt-1">Check in for 7 days to unlock a Mystery Box.</p>
        </div>
      </div>

      {/* Week Timeline */}
      <div className="flex justify-between items-center mb-6 relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -z-10 -translate-y-1/2 rounded-full"></div>
        <div className="absolute top-1/2 left-0 h-1 bg-orange-500 -z-10 -translate-y-1/2 rounded-full transition-all duration-1000" style={{ width: `${(currentStreak / 7) * 100}%` }}></div>
        
        {days.map((day, i) => {
          const isPast = i < currentStreak;
          const isToday = i === currentStreak;
          
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-lg ${
                isPast ? 'bg-orange-500 text-white shadow-orange-500/40' :
                isToday ? 'bg-slate-800 border-2 border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' :
                'bg-slate-800 text-slate-500 border border-slate-700'
              }`}>
                {isPast ? <CheckCircle size={18} /> : i === 6 ? <Gift size={18} /> : day}
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={() => setClaimed(true)}
        disabled={claimed}
        className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
          claimed 
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
            : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]'
        }\`}
      >
        {claimed ? 'Claimed for Today' : 'Claim Daily Bonus'}
      </button>

    </div>
  );
}
