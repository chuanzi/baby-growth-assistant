import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading, 
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children, 
    disabled, 
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={clsx(
          // Base styles
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          
          // Touch-friendly and accessibility
          'touch-manipulation select-none',
          'active:scale-95 disabled:active:scale-100',
          
          // Variants
          {
            // Primary
            'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600 shadow-sm hover:shadow-md active:shadow-sm': variant === 'primary',
            
            // Secondary  
            'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-600 shadow-sm hover:shadow-md active:shadow-sm': variant === 'secondary',
            
            // Outline
            'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-600 hover:border-gray-400': variant === 'outline',
            
            // Ghost
            'text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-600': variant === 'ghost',
            
            // Destructive
            'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 shadow-sm hover:shadow-md active:shadow-sm': variant === 'destructive',
          },
          
          // Sizes
          {
            'h-8 px-3 text-sm gap-1.5': size === 'sm',
            'h-10 px-4 text-sm gap-2': size === 'md',
            'h-12 px-6 text-base gap-2': size === 'lg',
            'h-14 px-8 text-lg gap-3': size === 'xl',
          },
          
          // Full width
          {
            'w-full': fullWidth,
          },
          
          // Loading state
          {
            'cursor-wait': loading,
          },
          
          className
        )}
        disabled={isDisabled}
        ref={ref}
        {...props}
      >
        {/* Left icon or loading spinner */}
        {loading ? (
          <LoadingSpinner 
            size={size === 'sm' ? 'sm' : 'md'} 
            className="text-current"
          />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        
        {/* Button content */}
        <span className={clsx(
          'truncate',
          loading && loadingText && 'animate-pulse'
        )}>
          {loading && loadingText ? loadingText : children}
        </span>
        
        {/* Right icon */}
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Specialized button variants
export const IconButton = forwardRef<HTMLButtonElement, ButtonProps & { icon: ReactNode; 'aria-label': string }>(
  ({ icon, className, size = 'md', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={clsx('aspect-square p-0', className)}
        size={size}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

export const FloatingActionButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={clsx(
          'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200',
          'z-50 lg:hidden',
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

FloatingActionButton.displayName = 'FloatingActionButton';