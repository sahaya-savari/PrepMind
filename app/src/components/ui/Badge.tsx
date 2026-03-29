import { PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';

export function Badge({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold bg-accent/10 text-accent border border-accent/20', className)}>
      {children}
    </span>
  );
}