import { NavLink } from 'react-router-dom';
import { Home, MessageSquare, Brain, BarChart3 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

function TabNavigation() {
  const tabs = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/practice', label: 'Practice', icon: Brain },
    { path: '/chat', label: 'Chat', icon: MessageSquare },
    { path: '/progress', label: 'Progress', icon: BarChart3 },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 h-16 bg-gradient-to-t from-black/70 via-slate-950/70 to-slate-900/40 backdrop-blur-xl border-t border-white/10"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-around h-full px-3">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/'}
              tabIndex={0}
              aria-label={tab.label}
              className={({ isActive, isPending }) =>
                cn(
                  'flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all outline-none',
                  'text-slate-300 hover:text-white hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-400',
                  isActive && 'text-white bg-white/10 border border-white/10 shadow-lg shadow-indigo-500/20',
                  isPending && 'opacity-60'
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  (e.target as HTMLElement).click();
                }
                // Keyboard arrow navigation
                if (e.key === 'ArrowRight') {
                  const next = (e.currentTarget.parentElement?.children?.[idx + 1] as HTMLElement) || e.currentTarget.parentElement?.children?.[0];
                  next?.focus();
                }
                if (e.key === 'ArrowLeft') {
                  const prev = (e.currentTarget.parentElement?.children?.[idx - 1] as HTMLElement) || e.currentTarget.parentElement?.children?.[tabs.length - 1];
                  prev?.focus();
                }
              }}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default TabNavigation;
