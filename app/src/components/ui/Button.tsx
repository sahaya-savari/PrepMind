import { ComponentProps, forwardRef } from 'react';
import { cn } from '../../lib/utils';

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    const base = 'inline-flex items-center gap-2 rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent';
    const variants: Record<typeof variant, string> = {
      primary: 'bg-accent text-white hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed',
      ghost: 'text-muted hover:text-primary bg-transparent',
      outline: 'border border-border text-primary hover:border-accent/70 hover:text-accent',
    };
    return (
      <button
        ref={ref}
        className={cn(base, sizeMap[size], variants[variant], className)}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';