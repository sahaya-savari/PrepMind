import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 h-9 sm:h-10 gap-2',
    lg: 'text-sm sm:text-base px-5 py-2.5 h-11 gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold hover:opacity-90 shadow-sm',
    secondary:
      'bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]',
    outline:
      'bg-transparent text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]',
  }[variant];

  return (
    <button
      className={`${base} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
