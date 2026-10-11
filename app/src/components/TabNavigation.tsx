import { NavLink } from 'react-router-dom';
import { Home, Brain, MessageCircle, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';

const tabs = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/practice', label: 'Practice', icon: Brain },
  { path: '/chat', label: 'AI Tutor', icon: MessageCircle },
  { path: '/progress', label: 'Progress', icon: BarChart3 },
];

function TabNavigation() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-midnight-surface/95 backdrop-blur-md border-t border-midnight-border pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around h-full px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/'}
              aria-label={tab.label}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-[11px] font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent min-h-[44px] min-w-[56px]',
                  isActive
                    ? 'text-midnight-accent font-bold'
                    : 'text-ink-muted hover:text-ink-primary'
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default TabNavigation;
