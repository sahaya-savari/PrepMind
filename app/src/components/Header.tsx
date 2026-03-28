import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="w-full border-b border-gray-800 bg-gray-900">
      <div className="container-shell flex items-center justify-between gap-3 py-4">
        <Link to="/" className="flex items-center gap-3 text-lg font-semibold text-white">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white font-bold shadow-sm">PM</span>
          <div className="leading-tight">
            <div className="text-white">PrepMind AI</div>
            <div className="text-gray-400 text-xs">Interview copilot • Supabase</div>
          </div>
        </Link>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
          <span className="hidden sm:inline">Phase 1 – 3 ready</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
