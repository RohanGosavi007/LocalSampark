import React from 'react';

export default function SalesChart({ data }) {
  // data should be an array of objects: { label: 'Mon', value: 1200 }
  const maxVal = Math.max(...data.map(d => d.value));
  const height = 200;
  
  return (
    <div className="w-full h-full min-h-[250px] flex flex-col justify-end">
      <div className="flex-1 flex items-end justify-between gap-2 px-2 relative">
        
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-full border-b border-slate-500"></div>
          ))}
        </div>

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.value / maxVal) * 100;
          return (
            <div key={i} className="flex flex-col items-center flex-1 group">
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-card-bg text-white text-xs py-1 px-2 rounded mb-2 whitespace-nowrap z-10 pointer-events-none">
                ₹{d.value}
              </div>
              
              {/* Bar */}
              <div className="w-full max-w-[40px] bg-blue-900/50 hover:bg-blue-600 border border-blue-500/30 rounded-t-sm transition-all duration-500 relative overflow-hidden group-hover:shadow-[0_0_15px_rgba(37,99,235,0.5)]" style={{ height: `${barHeight}%` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-blue-400/20"></div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Labels */}
      <div className="flex justify-between gap-2 px-2 mt-4 border-t border-border pt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-xs text-text-muted font-bold uppercase tracking-wider">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
