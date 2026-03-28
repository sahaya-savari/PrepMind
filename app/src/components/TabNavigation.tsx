import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function TabNavigation() {
  const { user } = useAuth();
  const tabs = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/practice', label: 'Practice', icon: '⚡' },
    { path: '/chat', label: 'Chat', icon: '💬' },
    { path: '/progress', label: 'Progress', icon: '📊' },
    user ? { path: '/profile', label: 'Profile', icon: '👤' } : { path: '/login', label: 'Login', icon: '🔑' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/20 bg-white/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-stretch justify-between px-2 py-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                isActive ? 'bg-white/30 text-gray-900 shadow-lg' : 'text-gray-800 hover:scale-105'
              }`
            }
            end={tab.path === '/'}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default TabNavigation;
