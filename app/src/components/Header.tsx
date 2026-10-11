import { Link, NavLink } from 'react-router-dom';
import { MessageCircle, Brain, BarChart3, Home, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useExam } from '../context/ExamContext';

const navItems = [
  { to: '/', label: 'Home', icon: <Home size={16} /> },
  { to: '/practice', label: 'Practice', icon: <Brain size={16} /> },
  { to: '/chat', label: 'AI Tutor', icon: <MessageCircle size={16} /> },
  { to: '/progress', label: 'Progress', icon: <BarChart3 size={16} /> },
];

function Header() {
  const { theme, toggleTheme } = useTheme();
  const { exam } = useExam();

  return (
    <header className="sticky top-0 z-40 border-b border-midnight-border bg-midnight-surface/90 backdrop-blur-md transition-colors">
      <div className="container-shell flex items-center justify-between gap-4 py-3 sm:py-3.5">
        {/* Brand link */}
        <Link
          to="/"
          className="flex items-center gap-3 text-lg font-bold font-display text-ink-primary group outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-bg rounded-lg"
          aria-label="PrepMind AI - Home"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-midnight-accentSoft border border-midnight-accent/40 text-midnight-accent font-bold text-sm shadow-sm group-hover:bg-midnight-accent/25 transition-colors">
            PM
          </span>
          <div className="leading-tight">
            <div className="font-display font-extrabold tracking-tight text-base sm:text-lg text-ink-primary group-hover:text-midnight-accent transition-colors">
              PrepMind AI
            </div>
            <div className="text-ink-muted text-[11px] font-sans font-normal hidden sm:block">
              Exam Preparation Platform
            </div>
          </div>
        </Link>

        {/* Center: Desktop Navigation Bar */}
        <nav
          className="hidden md:flex items-center gap-1 rounded-xl border border-midnight-border bg-midnight-subtle/80 p-1 shadow-sm"
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent ${
                  isActive
                    ? 'bg-midnight-accent text-[#0B0D12] shadow-sm font-bold'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-midnight-elevated'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right: Selected Exam & Theme Controls */}
        <div className="flex items-center gap-2.5">
          {exam && (
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-midnight-subtle border border-midnight-border text-ink-primary hover:border-midnight-accent/50 transition-colors focus-visible:ring-2 focus-visible:ring-midnight-accent outline-none max-w-[180px]"
              title="Current selected exam target (click to switch)"
            >
              <span className="h-2 w-2 rounded-full bg-midnight-positive animate-pulse shrink-0" aria-hidden />
              <span className="text-ink-muted text-[11px] hidden sm:inline">Exam:</span>
              <span className="truncate font-semibold text-xs">{exam}</span>
            </Link>
          )}

          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-midnight-border bg-midnight-subtle text-ink-secondary hover:text-ink-primary hover:bg-midnight-elevated transition focus-visible:ring-2 focus-visible:ring-midnight-accent outline-none"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? (
              <Sun size={17} className="text-midnight-warning" />
            ) : (
              <Moon size={17} className="text-midnight-accent" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
