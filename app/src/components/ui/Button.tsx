import { ComponentProps, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const sizeMap: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg min-h-[36px]',
  md: 'px-4 py-2.5 text-sm rounded-xl min-h-[42px]',
  lg: 'px-5 py-3 text-base rounded-xl min-h-[48px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-bg disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants: Record<ButtonVariant, string> = {
      primary:
        'bg-ink-primary text-midnight-bg hover:bg-[#d1d4d9] shadow-sm',
      secondary:
        'bg-midnight-subtle border border-midnight-border text-ink-primary hover:bg-midnight-elevated hover:border-midnight-accent/60',
      outline:
        'bg-transparent border border-midnight-border text-ink-secondary hover:text-ink-primary hover:border-midnight-accent/60 hover:bg-midnight-subtle/50',
      ghost:
        'bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-midnight-subtle',
      destructive:
        'bg-midnight-error/15 border border-midnight-error/30 text-midnight-error hover:bg-midnight-error/25',
    };

    return (
      <button
        ref={ref}
        className={cn(base, sizeMap[size], variants[variant], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';