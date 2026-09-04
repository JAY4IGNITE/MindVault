import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          className={cn(
            'flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs font-medium text-destructive mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
