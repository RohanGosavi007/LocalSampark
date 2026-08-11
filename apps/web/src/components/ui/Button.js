import React from 'react';

export function Button({ children, className = '', variant = 'primary', asChild, ...props }) {
  const base = "px-4 py-2 rounded-xl font-bold transition-all disabled:opacity-50 inline-flex justify-center items-center";
  const variants = {
    primary: "bg-primary text-white hover:shadow-lg",
    secondary: "bg-background-alt border border-border text-text hover:border-primary",
    outline: "border-2 border-primary text-primary hover:bg-primary/10"
  };
  
  const combinedClassName = `${base} ${variants[variant] || variants.primary} ${className}`.trim();

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
