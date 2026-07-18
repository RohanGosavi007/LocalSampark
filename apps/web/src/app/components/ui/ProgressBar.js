'use client';
import React from 'react';
import { cn } from './Button';

export function ProgressBar({
  value = 0,        // 0-100
  max = 100,
  size = 'md',      // 'sm' | 'md' | 'lg'
  variant = 'primary', // 'primary' | 'secondary' | 'success' | 'danger' | 'gradient'
  showLabel = false,
  label,
  milestones = [],  // [{ at: 50, label: 'Halfway' }]
  animated = true,
  className,
  ...props
}) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const barColors = {
    primary: 'bg-gradient-to-r from-primary to-indigo-400',
    secondary: 'bg-gradient-to-r from-secondary to-amber-400',
    success: 'bg-gradient-to-r from-accent to-emerald-400',
    danger: 'bg-gradient-to-r from-red-500 to-rose-400',
    gradient: 'bg-gradient-to-r from-primary via-secondary to-accent',
  };

  return (
    <div className={cn('w-full', className)} {...props}>
      {/* Label */}
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-semibold text-text-muted">{label || ''}</span>
          {showLabel && (
            <span className="text-xs font-bold font-heading text-text">{Math.round(pct)}%</span>
          )}
        </div>
      )}

      {/* Track */}
      <div className={cn('w-full rounded-full bg-border/50 overflow-hidden relative', sizeClasses[size])}>
        {/* Fill */}
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out relative',
            barColors[variant],
            animated && 'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:animate-shimmer after:bg-[length:200%_100%]'
          )}
          style={{ width: `${pct}%` }}
        />

        {/* Milestones */}
        {milestones.map((m, i) => {
          const mPct = (m.at / max) * 100;
          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-1 h-full bg-background/50"
              style={{ left: `${mPct}%` }}
              title={m.label}
            />
          );
        })}
      </div>
    </div>
  );
}
