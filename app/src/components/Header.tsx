import { Link, NavLink } from 'react-router-dom';
import { MessageCircle, Brain, BookOpen, Sun, Moon, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const tabs = [
  { to: '/chat', label: 'General', icon: <MessageCircle size={18} /> },
  { to: '/practice', label: 'Exam', icon: <Brain size={18} /> },
  { to: '/notebook', label: 'Notebook', icon: <BookOpen size={18} /> },
];

function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-xl">
      <div className="container-shell flex items-center justify-between gap-4 py-4">
        <Link to="/" className="flex items-center gap-3 text-lg font-semibold text-primary">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white font-bold shadow-sm">PM</span>
          <div className="leading-tight">
            <div className="text-primary">PrepMind AI</div>
            <div className="text-muted text-xs">Context • Exam • Notebook</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="hidden md:flex items-center gap-2 rounded-2xl border border-border bg-surface px-2 py-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition ${
                    isActive ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-primary'
                  }`
                }
              >
                {tab.icon}
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </nav>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-primary hover:text-accent transition"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            to="/settings"
            className="hidden md:inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-muted hover:text-primary transition"
          >
            <Settings size={18} />
            Settings
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
