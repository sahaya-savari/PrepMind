import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'flat' | 'elevated';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  elevation = 'flat',
  className = '',
  children,
  ...props
}) => {
  const bgClass =
    elevation === 'elevated' ? 'bg-[var(--surface-elevated)]' : 'bg-[var(--surface)]';

  return (
    <div
      className={`rounded-xl border border-[var(--border)] ${bgClass} p-5 sm:p-6 transition-colors duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
