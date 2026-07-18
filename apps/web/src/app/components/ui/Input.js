import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Input = React.forwardRef(({ 
  className, 
  type = "text",
  label,
  error,
  icon: Icon,
  ...props 
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="form-group w-full relative">
      {label && <label className="form-label">{label}</label>}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-text-muted">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          type={inputType}
          className={cn(
            "form-input",
            Icon && "pl-10",
            isPassword && "pr-10",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute right-3 text-text-muted hover:text-text transition-colors"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
