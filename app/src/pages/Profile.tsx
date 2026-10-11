import React, { useState } from 'react';
import { useExam } from '../context/ExamContext';
import { useTheme } from '../context/ThemeContext';
import {
  User,
  Award,
  Target,
  BookOpen,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  Layers,
  Save,
} from 'lucide-react';

const CANDIDATE_KEY = 'prepmind_candidate_profile';

function Profile() {
  const { exam, setExam } = useExam();
  const { theme, toggleTheme } = useTheme();

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(CANDIDATE_KEY);
      return saved ? JSON.parse(saved) : { name: 'PrepMind Scholar', role: 'Software Engineer' };
    } catch {
      return { name: 'PrepMind Scholar', role: 'Software Engineer' };
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* 1. TOP HEADER */}
      <header className="pb-4 border-b border-[var(--border)]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Candidate Profile & System Preferences
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Active target examination, verified practice summary, and interface preferences.
        </p>
      </header>

      {/* 2. PROFILE IDENTITY & TARGET CONFIGURATION */}
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

        {/* 3. INTERFACE THEME PREFERENCES (DARK / LIGHT TERMINAL THEME) */}
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

      {/* 4. VERIFIED DRILL PERFORMANCE SUMMARY */}
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
