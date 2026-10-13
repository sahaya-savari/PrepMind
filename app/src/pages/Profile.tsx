import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useExam } from '../context/ExamContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import ByokSettings from '../components/ByokSettings';
import {
  User,
  Award,
  Target,
  BookOpen,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  Database,
  Save,
  LogOut,
  LogIn,
  ShieldCheck,
  HardDrive,
  Cloud,
} from 'lucide-react';

const CANDIDATE_KEY = 'prepmind_candidate_profile';

function Profile() {
  const { exam, setExam } = useExam();
  const { theme, toggleTheme } = useTheme();
  const { user, logout, exitGuestMode, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(CANDIDATE_KEY);
      if (saved) return JSON.parse(saved);
      return {
        name: user?.name || 'PrepMind Scholar',
        role: 'Software Engineer',
      };
    } catch {
      return { name: user?.name || 'PrepMind Scholar', role: 'Software Engineer' };
    }
  });

  const [isSaved, setIsSaved] = useState(false);

  const [attempts] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('mcq_attempts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const correctAttempts = attempts.filter((a) => a.score > 0).length;
  const accuracy =
    attempts.length > 0 ? Math.round((correctAttempts / attempts.length) * 100) : 0;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(CANDIDATE_KEY, JSON.stringify(profile));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2400);
    } catch {
      // ignore storage errors
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    setAuthActionLoading(true);
    try {
      const res = await logout();
      if (!res.success) {
        setAuthError(res.error || 'Failed to sign out from Supabase.');
        setAuthActionLoading(false);
        return;
      }
      navigate('/login');
    } catch (err: any) {
      setAuthError(err?.message || 'Network error occurred while signing out.');
      setAuthActionLoading(false);
    }
  };

  const handleExitGuest = () => {
    setAuthError(null);
    exitGuestMode();
    navigate('/login');
  };

  const hasCloudAuth = isSupabaseConfigured() && user && !user.isGuest;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* 1. TOP HEADER */}
      <header className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Candidate Profile & System Preferences
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Active target examination, authentication credentials, and database synchronization.
          </p>
        </div>

        {user ? (
          user.isGuest ? (
            <button
              type="button"
              onClick={handleExitGuest}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 text-xs font-mono font-medium transition-colors cursor-pointer self-start sm:self-auto"
              title="Exit guest mode and return to sign in"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Guest Mode</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={authActionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--error)]/40 bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 text-xs font-mono font-medium transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
              title="Sign out of your account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{authActionLoading ? 'Signing Out...' : 'Sign Out'}</span>
            </button>
          )
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        )}
      </header>

      {/* ERROR ALERT IF SIGN OUT FAILS */}
      {authError && (
        <div className="p-3.5 rounded-xl border border-[var(--error)]/40 bg-[var(--error)]/10 text-[var(--error)] text-xs font-mono flex items-center justify-between gap-3 shadow-sm">
          <span>Authentication Error: {authError}</span>
          <button
            type="button"
            onClick={() => setAuthError(null)}
            className="text-[var(--error)] underline text-xs cursor-pointer hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. AUTHENTICATION & DATABASE ENGINE STATUS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Authentication Card */}
        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Authentication Status</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                hasCloudAuth
                  ? 'bg-[var(--positive)]/15 text-[var(--positive)] border border-[var(--positive)]/30'
                  : user?.isGuest
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-muted)] border border-[var(--border)]'
              }`}
            >
              {hasCloudAuth ? 'Cloud Account' : user?.isGuest ? 'Guest Session' : user ? 'Local Account' : 'Not Signed In'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {user?.name || 'Guest Scholar'}
            </div>
            <div className="text-xs font-mono text-[var(--text-secondary)] truncate">
              {user?.email || 'No email associated (guest mode)'}
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
            {user ? (
              <span className="text-[11px] text-[var(--text-muted)]">
                {user.isGuest ? 'Guest session active' : 'Session verified & active'}
              </span>
            ) : (
              <span className="text-[11px] text-[var(--text-muted)]">Operating in unauthenticated state</span>
            )}

            {!hasCloudAuth && (
              <Link to="/login" className="text-xs text-[var(--accent)] hover:underline font-mono">
                Connect Cloud Account →
              </Link>
            )}
          </div>

          {user && (
            <div className="pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-xs font-semibold text-[var(--text-primary)] block">
                  {user.isGuest ? 'Guest Mode Session' : 'Account Security'}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {user.isGuest
                    ? 'Clear temporary guest session and return to sign in.'
                    : 'Safely terminate Supabase cloud session.'}
                </span>
              </div>

              {user.isGuest ? (
                <button
                  type="button"
                  onClick={handleExitGuest}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 text-xs font-mono font-medium transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit Guest Mode</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={authActionLoading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--error)]/40 bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20 text-xs font-mono font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{authActionLoading ? 'Signing Out...' : 'Sign Out'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Database Engine Card */}
        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Database Engine</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                isConfigured
                  ? 'bg-[var(--positive)]/15 text-[var(--positive)] border border-[var(--positive)]/30'
                  : 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30'
              }`}
            >
              {isConfigured ? <Cloud className="w-3 h-3" /> : <HardDrive className="w-3 h-3" />}
              <span>{isConfigured ? 'Supabase Connected' : 'Local Storage DB'}</span>
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {isConfigured ? 'PostgreSQL Cloud Storage (RLS Enabled)' : 'Resilient Client Database (Offline Safe)'}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {isConfigured
                ? 'Syncing interviews, questions, and evaluated results with Supabase.'
                : 'Auto-seeded interview curriculum, question bank, and metrics persist locally.'}
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
            <span>Logged Attempts: {attempts.length}</span>
            <span>Accuracy: {accuracy}%</span>
          </div>
        </div>
      </div>

      {/* 3. PROFILE IDENTITY & TARGET CONFIGURATION */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="p-5 sm:p-7 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--accent)] shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Candidate Identity
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Calibrates interview prompts, drill difficulty, and local performance tracking.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((p: any) => ({ ...p, name: e.target.value }))}
                className="w-full text-xs sm:text-sm bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Target Discipline / Role
              </label>
              <input
                type="text"
                value={profile.role}
                onChange={(e) => setProfile((p: any) => ({ ...p, role: e.target.value }))}
                className="w-full text-xs sm:text-sm bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Active Benchmark Exam Target
              </label>
              <input
                type="text"
                value={exam || ''}
                onChange={(e) => setExam(e.target.value)}
                placeholder="e.g. GATE CSE, CAT 2025, TCS NQT"
                className="w-full text-xs sm:text-sm font-mono bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <span className="block text-[11px] text-[var(--text-muted)]">
                Used across Home, Practice drills, and AI Tutor to contextualize study sessions.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {isSaved ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--positive)] font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>Profile preferences updated</span>
              </span>
            ) : (
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Persistent across browser sessions
              </span>
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* 4. INTERFACE THEME PREFERENCES (DARK / LIGHT TERMINAL THEME) */}
        <div className="p-5 sm:p-7 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <span>Appearance Mode</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                High-contrast terminal-dark palette calibrated for long focused study sessions.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--border-strong)] text-xs font-mono text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-[var(--warning)]" />
                  <span>Switch to Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-[var(--accent)]" />
                  <span>Switch to Dark</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className={`p-3.5 rounded-lg border ${theme === 'dark' ? 'border-[var(--accent)] bg-[var(--surface-elevated)] ring-1 ring-[var(--accent)]/40' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
              <div className="font-semibold text-[var(--text-primary)]">Terminal Dark Mode</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">Obsidian #0A0B0D canvas with Lilac #C792EA accent</div>
            </div>
            <div className={`p-3.5 rounded-lg border ${theme === 'light' ? 'border-[var(--accent)] bg-[var(--surface-elevated)] ring-1 ring-[var(--accent)]/40' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
              <div className="font-semibold text-[var(--text-primary)]">High-Contrast Light Mode</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">Off-white surface with deep ink tokens and WCAG AAA contrast</div>
            </div>
          </div>
        </div>
      </form>

      {/* 4. AI PROVIDER & BRING YOUR OWN KEY (BYOK) */}
      <ByokSettings />

      {/* 5. VERIFIED DRILL PERFORMANCE SUMMARY */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            <span>Practice Accuracy</span>
            <Award className="w-4 h-4 text-[var(--positive)]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)] tabular-nums">
            {accuracy}%
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {attempts.length} logged drill attempts
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            <span>Target Benchmark</span>
            <Target className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)] truncate">
            {exam || 'GATE CSE'}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            Configured target syllabus
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            <span>Latest Drill Domain</span>
            <BookOpen className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="text-lg font-bold text-[var(--text-primary)] truncate">
            {attempts[0]?.topic || 'None'}
          </div>
          <div className="text-[11px] font-mono text-[var(--text-muted)]">
            {attempts[0] ? new Date(attempts[0].at).toLocaleDateString() : 'No recorded drills'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
