import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home, Brain, BookOpen } from 'lucide-react';

function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-strong)] text-[var(--warning)] mx-auto shadow-md">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[var(--accent)] font-semibold">
            Error 404 — Route Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Terminal Target Missing
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
            The requested technical route or study resource does not exist in the PrepMind runtime registry.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm min-h-[40px]"
          >
            <Home className="w-4 h-4" />
            <span>Return to Overview</span>
          </Link>

          <Link
            to="/practice"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] text-xs font-mono transition-colors min-h-[40px]"
          >
            <Brain className="w-4 h-4 text-[var(--accent)]" />
            <span>Start Practice Drill</span>
          </Link>

          <Link
            to="/materials"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] text-xs font-mono transition-colors min-h-[40px]"
          >
            <BookOpen className="w-4 h-4 text-[var(--positive)]" />
            <span>Study Materials</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
