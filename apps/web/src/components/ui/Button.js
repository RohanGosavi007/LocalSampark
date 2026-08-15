import React from 'react';

export function Button({ children, className = '', variant = 'primary', size = 'md', asChild, ...props }) {
  const base = "font-bold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none inline-flex justify-center items-center gap-2 cursor-pointer select-none";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-5 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3.5 text-base rounded-2xl",
    icon: "p-2.5 rounded-xl aspect-square"
  };

  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:-translate-y-0.5",
    secondary: "bg-card-bg/80 hover:bg-slate-700/80 border border-border/80 text-text backdrop-blur-md hover:border-slate-600",
    gradient: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-xl shadow-emerald-500/20 hover:-translate-y-0.5",
    glass: "bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-xl shadow-lg hover:border-white/30",
    outline: "border-2 border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400",
    destructive: "bg-red-600/90 hover:bg-red-500 text-white shadow-lg shadow-red-600/25 hover:-translate-y-0.5",
    ghost: "text-text-muted hover:text-text hover:bg-white/5"
  };
  
  const combinedClassName = `${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`.trim();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: `${combinedClassName} ${children.props.className || ''}`.trim(),
      ...props
    });
  }
  
  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
}
