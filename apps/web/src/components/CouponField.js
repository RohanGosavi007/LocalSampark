'use client';
import React, { useState } from 'react';
import { Tag, X } from 'lucide-react';

import { couponSummary, cleanCouponCode } from '../lib/coupon';

/**
 * C7: a coupon at checkout. The server prices it: the code goes into the quote
 * and the order, and the bill comes back with what it took off
 * (`bill.coupon`), or why it does not apply (`bill.couponError`).
 */
export default function CouponField({ code, onApply, onRemove, bill, disabled = false }) {
  const [input, setInput] = useState('');
  const summary = couponSummary(bill);

  if (code) {
    return (
      <div data-testid="coupon-applied" className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-sm ${summary && !summary.ok ? 'border-red-500/40 bg-red-500/5' : 'border-primary/40 bg-primary/5'}`}>
        <span className={`flex items-start gap-2 ${summary && !summary.ok ? 'text-red-400' : 'text-text'}`} role="status">
          <Tag className="w-4 h-4 shrink-0 mt-0.5" />
          {summary ? summary.text : `Checking ${code}…`}
        </span>
        <button type="button" disabled={disabled} onClick={() => { setInput(''); onRemove(); }} className="text-text-muted hover:text-text shrink-0 flex items-center gap-1 font-semibold disabled:opacity-50" aria-label={`Remove coupon ${code}`}>
          <X className="w-4 h-4" /> Remove
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const next = cleanCouponCode(input);
        if (next) onApply(next);
      }}
    >
      <label htmlFor="coupon-code" className="sr-only">Coupon code</label>
      <input
        id="coupon-code"
        name="coupon"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Coupon code"
        autoComplete="off"
        maxLength={40}
        disabled={disabled}
        className="flex-1 min-w-0 bg-background border border-border rounded-xl px-3 py-2 text-sm uppercase focus:outline-none focus:border-primary"
      />
      <button type="submit" disabled={disabled || !input.trim()} className="px-4 py-2 rounded-xl border border-primary text-primary font-bold text-sm disabled:opacity-50">
        Apply
      </button>
    </form>
  );
}
