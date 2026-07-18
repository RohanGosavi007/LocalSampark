'use client';
import React from 'react';
import { cn } from './Button';

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function Avatar({ 
  src, 
  alt = '', 
  name = '', 
  size = 'md', 
  status, // 'online' | 'offline' | 'away' | 'busy'
  verified = false, 
  className,
  ...props 
}) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-amber-500',
    busy: 'bg-red-500',
  };

  return (
    <div className={cn('relative inline-flex shrink-0', className)} {...props}>
      {src ? (
        <img
          src={src}
          alt={alt || name}
          className={cn(
            'rounded-full object-cover border-2 border-background-alt shadow-sm',
            sizeMap[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-heading font-bold bg-gradient-to-br from-primary to-secondary text-white shadow-sm',
            sizeMap[size]
          )}
        >
          {initials}
        </div>
      )}

      {/* Online Status Dot */}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-background-alt',
            statusColors[status] || statusColors.offline,
            size === 'xs' || size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'
          )}
        />
      )}

      {/* Verified Badge */}
      {verified && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background-alt">
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </span>
      )}
    </div>
  );
}
