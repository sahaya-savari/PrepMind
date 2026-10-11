import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'accent' | 'positive' | 'warning' | 'error' | 'info';
  className?: string;
}

/**
 * Clean metadata indicator respecting the Zero-Pill discipline.
 * Avoids garish pill enclosures; renders subtle, structured typographic tags.
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const variantStyles = {
    neutral: 'text-[var(--text-secondary)] border-[var(--border)] bg-[var(--surface-elevated)]',
    accent: 'text-[var(--accent)] border-[var(--accent)]/30 bg-[var(--surface-elevated)]',
    positive: 'text-[var(--positive)] border-[var(--positive)]/30 bg-[var(--surface-elevated)]',
    warning: 'text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--surface-elevated)]',
    error: 'text-[var(--error)] border-[var(--error)]/30 bg-[var(--surface-elevated)]',
    info: 'text-[var(--info)] border-[var(--info)]/30 bg-[var(--surface-elevated)]',
  }[variant];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-mono rounded border ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
};
