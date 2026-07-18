import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  disabled, 
  children, 
  icon: Icon,
  iconPosition = 'left',
  asChild = false,
  ...props 
}, ref) => {
  
  const baseStyles = "inline-flex items-center justify-center font-heading font-semibold rounded-sm transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    accent: "btn-accent",
    danger: "btn-danger",
    ghost: "btn-ghost",
    outline: "bg-transparent border-2 border-border text-text hover:border-primary hover:text-primary",
    icon: "btn-icon"
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-6 py-3 text-base gap-2",
    lg: "px-8 py-4 text-lg gap-3",
    icon: "p-2",
  };

  const buttonClasses = cn(
    baseStyles,
    variants[variant],
    variant === 'icon' ? sizes['icon'] : sizes[size],
    className
  );

  // asChild mode: render the child element directly with button styles
  if (asChild && React.Children.count(children) === 1) {
    const child = React.Children.only(children);
    return React.cloneElement(child, {
      ref,
      className: cn(buttonClasses, child.props.className),
      ...props,
      children: (
        <>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {!isLoading && Icon && iconPosition === 'left' && <Icon className="w-5 h-5" />}
          {child.props.children}
          {!isLoading && Icon && iconPosition === 'right' && <Icon className="w-5 h-5" />}
        </>
      ),
    });
  }

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={buttonClasses}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!isLoading && Icon && iconPosition === 'left' && <Icon className="w-5 h-5" />}
      {children}
      {!isLoading && Icon && iconPosition === 'right' && <Icon className="w-5 h-5" />}
      
      {/* Glossy sheen effect overlay */}
      {variant !== 'ghost' && variant !== 'outline' && variant !== 'icon' && (
        <span className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
    </button>
  );
});

Button.displayName = 'Button';

export { Button };
