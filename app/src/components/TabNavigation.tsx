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
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900 border-t border-gray-700 h-16">
      <div className="mx-auto flex max-w-3xl items-center justify-around h-full px-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                isActive ? 'text-white' : 'text-gray-400 hover:text-white'
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
