import { PropsWithChildren, ReactNode } from 'react';
import { cn } from '../../lib/utils';

type CardProps = PropsWithChildren<{
  className?: string;
  elevated?: boolean;
}>;

export function Card({ className, elevated = false, children }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-midnight-border transition-colors duration-150',
        elevated ? 'bg-midnight-elevated' : 'bg-midnight-surface',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 p-5 border-b border-midnight-border', className)}>
      <div className="space-y-1 min-w-0">
        {subtitle && (
          <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            {icon} <span>{subtitle}</span>
          </div>
        )}
        <h3 className="text-base sm:text-lg font-semibold font-display text-ink-primary tracking-tight truncate">
          {title}
        </h3>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('p-5 space-y-4', className)}>{children}</div>;
}

export function CardFooter({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn('px-5 py-4 border-t border-midnight-border bg-midnight-subtle/40 rounded-b-xl', className)}>
      {children}
    </div>
  );
}