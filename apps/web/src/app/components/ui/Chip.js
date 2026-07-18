'use client';
import React from 'react';
import { X } from 'lucide-react';
import { cn } from './Button';

const variants = {
  default: 'bg-background-alt border border-border text-text hover:bg-primary-light hover:border-primary hover:text-primary',
  primary: 'bg-primary-light border border-primary/30 text-primary',
  secondary: 'bg-secondary-light border border-secondary/30 text-secondary',
  success: 'bg-accent-light border border-accent/30 text-accent',
  danger: 'bg-red-500/10 border border-red-500/30 text-red-500',
  outline: 'bg-transparent border border-border text-text-muted hover:border-primary hover:text-primary',
};

export function Chip({
  children,
  variant = 'default',
  selected = false,
  removable = false,
  icon: Icon,
  onRemove,
  onClick,
  className,
  ...props
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-heading transition-all duration-200 cursor-pointer select-none',
        selected
          ? 'bg-primary text-white border border-primary shadow-md shadow-primary/20 scale-105'
          : variants[variant],
        className
      )}
      {...props}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
      {removable && (
        <X
          className="w-3 h-3 ml-0.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
        />
      )}
    </button>
  );
}
