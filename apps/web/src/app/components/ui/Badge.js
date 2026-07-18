import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Badge = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  pulse = false,
  icon: Icon,
  children, 
  ...props 
}, ref) => {
  
  const variants = {
    primary: "badge-primary",
    secondary: "badge-secondary",
    success: "badge-success",
    danger: "badge-danger",
    outline: "bg-transparent border border-border text-text-muted",
  };

  return (
    <span
      ref={ref}
      className={cn("badge", variants[variant], className)}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-2 w-2 mr-1">
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", 
            variant === 'danger' ? 'bg-red-400' : 
            variant === 'success' ? 'bg-green-400' : 
            variant === 'secondary' ? 'bg-orange-400' : 'bg-indigo-400'
          )}></span>
          <span className={cn("relative inline-flex rounded-full h-2 w-2", 
            variant === 'danger' ? 'bg-red-500' : 
            variant === 'success' ? 'bg-green-500' : 
            variant === 'secondary' ? 'bg-orange-500' : 'bg-indigo-500'
          )}></span>
        </span>
      )}
      {Icon && !pulse && <Icon className="w-3 h-3 mr-1" />}
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

export { Badge };
