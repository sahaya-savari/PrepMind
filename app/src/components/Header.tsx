import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Brain, BarChart3, Home, User, Sun, Moon, Sparkles, LogIn, BookOpen } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useExam } from '../context/ExamContext';
import { useAuth } from '../hooks/useAuth';
import { PillNav, NavItem } from './reactbits/PillNav';

const navItems: NavItem[] = [
  { id: '/', path: '/', label: 'Overview', icon: <Home size={13} /> },
  { id: '/practice', path: '/practice', label: 'Practice', icon: <Brain size={13} /> },
  { id: '/chat', path: '/chat', label: 'AI Tutor', icon: <MessageCircle size={13} /> },
  { id: '/materials', path: '/materials', label: 'Materials', icon: <BookOpen size={13} /> },
  { id: '/progress', path: '/progress', label: 'Progress', icon: <BarChart3 size={13} /> },
  { id: '/profile', path: '/profile', label: 'Profile', icon: <User size={13} /> },
];

function Header() {
  const { theme, toggleTheme } = useTheme();
  const { exam } = useExam();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Normalize current path for active pill matching
  const currentPath = location.pathname === '' ? '/' : location.pathname;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-6 px-3 sm:px-6 py-3">
        {/* Brand Link with verified brand mark */}
        <Link
          to="/"
          className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg cursor-pointer shrink-0 group"
          aria-label="PrepMind AI - Home"
        >
          <div className="w-8 h-8 rounded-md bg-[var(--surface)] border border-[var(--border-strong)] flex items-center justify-center overflow-hidden shadow-sm transition-colors group-hover:border-[var(--accent)] shrink-0">
            <img
              src="/assets/brand/prep-mind-mark.svg"
              alt="PrepMind AI Brand Mark"
              className="w-full h-full object-contain p-0.5"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] leading-tight">
              PrepMind <span className="text-[var(--accent)] text-xs font-mono tracking-wider">AI</span>
            </span>
            <span className="text-[10px] font-mono tracking-wider uppercase text-[var(--text-muted)] -mt-0.5 hidden sm:inline">
              Terminal Drills
            </span>
          </div>
        </Link>

        {/* Center: Desktop Navigation Bar with PillNav */}
        <div className="hidden md:flex items-center justify-center flex-1">
          <PillNav
            items={navItems}
            activeId={currentPath}
            onSelect={(item) => navigate(item.path)}
          />
        </div>

        {/* Right: Selected Exam, User Status, Theme Switch & Quick Practice */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {user ? (
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-mono bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors focus-visible:ring-1 focus-visible:ring-[var(--accent)] outline-none max-w-[105px] sm:max-w-[140px]"
              title={`Logged in as ${user.name}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${user.isGuest ? 'bg-[var(--accent)]' : 'bg-[var(--positive)]'} animate-pulse shrink-0`} aria-hidden />
              <span className="truncate">{user.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--accent)] hover:border-[var(--accent)] transition-colors focus-visible:ring-1 focus-visible:ring-[var(--accent)] outline-none"
              title="Candidate Sign In"
            >
              <LogIn size={13} />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}

          {exam && (
            <Link
              to="/profile"
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors focus-visible:ring-1 focus-visible:ring-[var(--accent)] outline-none max-w-[160px]"
              title="Target exam profile"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" aria-hidden />
              <span className="truncate">{exam}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition focus-visible:ring-1 focus-visible:ring-[var(--accent)] outline-none cursor-pointer"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? (
              <Sun size={15} className="text-[var(--warning)]" />
            ) : (
              <Moon size={15} className="text-[var(--accent)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/practice')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap shadow-sm min-h-[32px] sm:min-h-[36px]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Drill</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
