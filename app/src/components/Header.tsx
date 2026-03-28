import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Header() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { user } = useAuth();

  return (
    <header className="w-full backdrop-blur-md border-b border-ink-800/80 bg-ink-900/60">
      <div className="container-shell flex items-center justify-between gap-3 py-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-white">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 text-ink-50 font-bold">PM</span>
          <div className="leading-tight">
            <div>PrepMind AI</div>
            <div className="text-ink-300 text-xs">Exam prep, done right</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="text-sm text-white/80">Welcome, {user.name}</div>
          ) : (
            <Link to="/login" className="soft-button">Login</Link>
          )}
          {!isHome && (
            <Link to="/" className="soft-button">Start</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
