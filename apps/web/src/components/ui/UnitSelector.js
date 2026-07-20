import React from 'react';
import { Minus, Plus } from 'lucide-react';

export default function UnitSelector({ price, quantity = 0, onQuantityChange }) {
  return (
    <div className="flex items-center justify-between w-full">
      <span className="font-black text-text">₹{price}</span>
      
      {quantity === 0 ? (
        <button 
          onClick={() => onQuantityChange(1)}
          className="bg-green-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:shadow-md transition-all"
        >
          ADD
        </button>
      ) : (
        <div className="flex items-center bg-green-500/10 border border-green-500/30 rounded-lg overflow-hidden">
          <button 
            onClick={() => onQuantityChange(quantity - 1)}
            className="px-3 py-1.5 text-green-600 hover:bg-green-500/20 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="px-2 font-bold text-sm text-green-700 min-w-[20px] text-center">
            {quantity}
          </span>
          <button 
            onClick={() => onQuantityChange(quantity + 1)}
            className="px-3 py-1.5 text-green-600 hover:bg-green-500/20 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export function StockBadge({ stock }) {
  if (stock === 0) return <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">Out of Stock</span>;
  if (stock < 5) return <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">Only {stock} left</span>;
  return null; // Don't show anything if stock is plenty
}

export function KitchenStatusPill({ stage }) {
  // Stage 1: Received, Stage 2: Preparing, Stage 3: Ready
  const config = {
    1: { label: 'Received', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-500' },
    2: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500 animate-pulse' },
    3: { label: 'Ready', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' }
  };
  
  const current = config[stage] || config[1];

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit ${current.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`}></span>
      <span className="text-[10px] font-black uppercase tracking-wide">{current.label}</span>
    </div>
  );
}
