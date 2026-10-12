import { NavLink } from 'react-router-dom';
import { Home, Brain, MessageCircle, Library, BookOpen, User } from 'lucide-react';
import { cn } from '../lib/utils';

const tabs = [
  { path: '/', label: 'Overview', icon: Home },
  { path: '/practice', label: 'Practice', icon: Brain },
  { path: '/chat', label: 'Tutor', icon: MessageCircle },
  { path: '/notebooks', label: 'Notebooks', icon: Library },
  { path: '/materials', label: 'Materials', icon: BookOpen },
  { path: '/profile', label: 'Profile', icon: User },
];

function TabNavigation() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]"
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
                  'flex flex-col items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] min-h-[44px] min-w-[50px]',
                  isActive
                    ? 'text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                )
              }
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
