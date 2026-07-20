import React from 'react';

export function Badge({ children, className = '', variant = 'primary' }) {
  const base = "px-2 py-0.5 rounded-full text-[10px] font-bold";
  const variants = {
    primary: "bg-primary/10 text-primary border border-primary/20",
    success: "bg-green-100 text-green-700 border border-green-200",
    warning: "bg-amber-100 text-amber-700 border border-amber-200",
    danger: "bg-red-100 text-red-700 border border-red-200"
  };
  
  return (
    <span className={`${base} ${variants[variant] || variants.primary} ${className}`}>
      {children}
    </span>
  );
}
