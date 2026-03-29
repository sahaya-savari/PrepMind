import { PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';

type Tab = { id: string; label: string; icon?: React.ReactNode };

export function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface/60 p-1">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition',
              isActive ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-primary'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ hidden, children }: PropsWithChildren<{ hidden?: boolean }>) {
  if (hidden) return null;
  return <div className="mt-4 space-y-4">{children}</div>;
}