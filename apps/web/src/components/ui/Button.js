import React from 'react';

export function Button({ children, className = '', variant = 'primary', ...props }) {
  const base = "px-4 py-2 rounded-xl font-bold transition-all disabled:opacity-50";
  const variants = {
    primary: "bg-primary text-white hover:shadow-lg",
    secondary: "bg-background-alt border border-border text-text hover:border-primary",
    outline: "border-2 border-primary text-primary hover:bg-primary/10"
  };
  
  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
