import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';
    const currentType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full space-y-1 sm:space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-xs sm:text-[13px] font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            type={currentType}
            className={cn(
              'flex h-10 w-full rounded-xl border border-foreground/10 bg-foreground/5 px-3.5 py-1.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
              isPassword && 'pr-12',
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            ref={ref}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md flex items-center justify-center h-full"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-[18px] h-[18px] shrink-0" /> : <Eye className="w-[18px] h-[18px] shrink-0" />}
            </button>
          )}
        </div>
        {error && <p className="text-xs font-medium text-destructive mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
