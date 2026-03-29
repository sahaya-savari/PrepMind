import { PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('glass-card rounded-2xl border border-border/60 shadow-lg', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted">{icon} <span>{subtitle}</span></div>
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
      </div>
    </div>
  );
}

export function CardBody({ children }: PropsWithChildren) {
  return <div className="space-y-3">{children}</div>;
}