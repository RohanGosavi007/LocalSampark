'use client';
import React, { useState } from 'react';
import { ChevronDown, Scale } from 'lucide-react';

/**
 * UnitSelector — Weight/size dropdown with quantity conversion
 * For retail/grocery: 250g, 500g, 1kg, 1 Pack, Per Piece, etc.
 */
export default function UnitSelector({ units = [], selectedUnit, onUnitChange, price, onQuantityChange, quantity = 1 }) {
  const [isOpen, setIsOpen] = useState(false);

  const defaultUnits = units.length > 0 ? units : [
    { id: '250g', label: '250g', multiplier: 0.25, priceMultiplier: 0.25 },
    { id: '500g', label: '500g', multiplier: 0.5, priceMultiplier: 0.5 },
    { id: '1kg', label: '1 Kg', multiplier: 1, priceMultiplier: 1 },
    { id: '2kg', label: '2 Kg', multiplier: 2, priceMultiplier: 2 },
    { id: '5kg', label: '5 Kg', multiplier: 5, priceMultiplier: 5 },
    { id: 'pack', label: 'Pack', multiplier: 1, priceMultiplier: 1 },
  ];

  const current = defaultUnits.find(u => u.id === (selectedUnit || defaultUnits[0]?.id)) || defaultUnits[0];
  const unitPrice = price ? (price * (current?.priceMultiplier || 1)).toFixed(0) : '—';

  return (
    <div className="flex items-center gap-2">
      {/* Unit Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:border-cat-primary/50 transition-all text-sm font-semibold text-text min-w-[80px]"
        >
          <Scale className="w-3.5 h-3.5 text-text-muted" />
          <span>{current?.label || '1 Kg'}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 mt-1 z-50 bg-card-bg backdrop-blur-xl border border-border rounded-xl shadow-xl overflow-hidden min-w-[140px]">
              {defaultUnits.map(unit => (
                <button
                  key={unit.id}
                  onClick={() => {
                    onUnitChange?.(unit);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-cat-primary-light transition-colors ${
                    current?.id === unit.id ? 'bg-cat-primary-light font-bold' : ''
                  }`}
                >
                  <span className="text-text">{unit.label}</span>
                  {price && (
                    <span className="text-xs text-text-muted font-medium">₹{(price * unit.priceMultiplier).toFixed(0)}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Rapid Quantity Controls */}
      <div className="flex items-center gap-0.5 bg-background-alt rounded-xl border border-border">
        <button
          onClick={() => onQuantityChange?.(Math.max(0, quantity - 1))}
          className="w-8 h-8 rounded-l-xl flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors text-lg font-bold"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-bold text-text">{quantity}</span>
        <button
          onClick={() => onQuantityChange?.(quantity + 1)}
          className="w-8 h-8 rounded-r-xl flex items-center justify-center text-text-muted hover:text-cat-primary hover:bg-cat-primary-light transition-colors text-lg font-bold"
        >
          +
        </button>
      </div>

      {/* Unit Price Display */}
      {price && quantity > 0 && (
        <span className="text-sm font-bold text-text whitespace-nowrap">₹{(unitPrice * quantity).toFixed ? (unitPrice * quantity).toFixed(0) : unitPrice}</span>
      )}
    </div>
  );
}

/**
 * StockBadge — Real-time stock status indicator
 * "Only 3 left" / "Fresh batch 1h ago" / "In Stock" / "Out of Stock"
 */
export function StockBadge({ stock, freshBatchTime = null }) {
  if (stock === 0 || stock === undefined) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Out of Stock
      </span>
    );
  }

  if (stock <= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600 animate-pulse dark:bg-orange-900/30 dark:text-orange-400">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        Only {stock} left!
      </span>
    );
  }

  if (freshBatchTime) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Fresh batch {freshBatchTime}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      In Stock
    </span>
  );
}

/**
 * KitchenStatusPill — Animated 4-stage tracking for food orders
 * Order Placed → In Kitchen → Out for Delivery → Delivered
 */
export function KitchenStatusPill({ stage = 0 }) {
  const stages = [
    { label: 'Placed', icon: '📝', color: 'bg-blue-500' },
    { label: 'In Kitchen', icon: '🍳', color: 'bg-orange-500' },
    { label: 'Out for Delivery', icon: '🚴', color: 'bg-purple-500' },
    { label: 'Delivered', icon: '✅', color: 'bg-green-500' },
  ];

  return (
    <div className="flex items-center gap-1 w-full">
      {stages.map((s, idx) => (
        <React.Fragment key={s.label}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-500 ${
              idx <= stage ? s.color + ' text-white shadow-sm' : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              {idx <= stage ? s.icon : <span className="w-2 h-2 rounded-full bg-gray-400" />}
            </div>
            <span className={`text-[9px] font-semibold text-center leading-tight ${
              idx <= stage ? 'text-text' : 'text-text-muted'
            }`}>{s.label}</span>
          </div>
          {idx < stages.length - 1 && (
            <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${
              idx < stage ? s.color : 'bg-gray-200 dark:bg-gray-700'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
