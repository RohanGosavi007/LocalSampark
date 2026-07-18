import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Card = React.forwardRef(({ 
  className, 
  variant = 'default',
  hover = false,
  children, 
  ...props 
}, ref) => {
  
  const variants = {
    default: "glass-card",
    panel: "glass-panel",
    solid: "bg-card-bg border border-card-border rounded-[var(--radius)] shadow-md",
  };
  
  const hoverEffect = hover ? "hover:-translate-y-1 hover:shadow-lg hover:border-primary/50 transition-all duration-300" : "";

  return (
    <div
      ref={ref}
      className={cn(variants[variant], hoverEffect, className)}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 mb-4", className)} {...props}>
    {children}
  </div>
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-xl font-heading font-semibold leading-none tracking-tight text-text", className)} {...props}>
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, children, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-text-muted", className)} {...props}>
    {children}
  </p>
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props}>
    {children}
  </div>
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center mt-6 pt-4 border-t border-border", className)} {...props}>
    {children}
  </div>
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
