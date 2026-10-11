import { PropsWithChildren, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type TabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number | string;
};

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border border-midnight-border bg-midnight-subtle/70 p-1',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent focus-visible:ring-offset-1 focus-visible:ring-offset-midnight-bg min-h-[36px]',
              isActive
                ? 'bg-ink-primary text-midnight-bg shadow-sm font-bold'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-midnight-elevated/60'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                  isActive ? 'bg-midnight-bg/20 text-midnight-bg' : 'bg-midnight-border text-ink-muted'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  hidden,
  children,
  className,
}: PropsWithChildren<{ id: string; hidden?: boolean; className?: string }>) {
  if (hidden) return null;
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={cn('mt-4 space-y-4 focus-visible:outline-none', className)}
    >
      {children}
    </div>
  );
}