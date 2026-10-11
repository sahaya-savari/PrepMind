import { PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant = 'accent' | 'positive' | 'warning' | 'error' | 'neutral' | 'info';

type BadgeProps = PropsWithChildren<{
  className?: string;
  variant?: BadgeVariant;
  dot?: boolean;
}>;

export function Badge({ children, variant = 'accent', dot = false, className }: BadgeProps) {
  const variants: Record<BadgeVariant, { container: string; dot: string }> = {
    accent: {
      container: 'bg-midnight-accentSoft text-midnight-accent border-midnight-accent/30',
      dot: 'bg-midnight-accent',
    },
    positive: {
      container: 'bg-midnight-positive/10 text-midnight-positive border-midnight-positive/25',
      dot: 'bg-midnight-positive',
    },
    warning: {
      container: 'bg-midnight-warning/10 text-midnight-warning border-midnight-warning/25',
      dot: 'bg-midnight-warning',
    },
    error: {
      container: 'bg-midnight-error/10 text-midnight-error border-midnight-error/25',
      dot: 'bg-midnight-error',
    },
    neutral: {
      container: 'bg-midnight-subtle text-ink-secondary border-midnight-border',
      dot: 'bg-ink-muted',
    },
    info: {
      container: 'bg-midnight-info/10 text-midnight-info border-midnight-info/25',
      dot: 'bg-midnight-info',
    },
  };

  const current = variants[variant] || variants.accent;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold border transition-colors',
        current.container,
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', current.dot)} aria-hidden />}
      {children}
    </span>
  );
}