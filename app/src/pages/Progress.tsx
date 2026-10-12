import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Target,
  Award,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Filter,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { AnimatedList } from '../components/reactbits/AnimatedList';
import { DodgeField } from '../components/reactbits/DodgeField';
import { type ProgressInsights, getLocalProgressInsights } from '../api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const defaultInsights: ProgressInsights = {
  accuracy: 0,
  totalExams: 0,
  weakTopic: 'None',
  mostStudied: 'None',
  trend: [],
};

const CACHE_KEY = 'prepmind_progress_cache';

const loadCache = (): ProgressInsights | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ProgressInsights) : null;
  } catch {
    return null;
  }
};

const saveCache = (data: ProgressInsights) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore cache errors
  }
};

function Progress() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<ProgressInsights>(defaultInsights);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [filterTopic, setFilterTopic] = useState<string>('all');

  const hydrate = (next: ProgressInsights) => {
    setInsights(next);
    setLastUpdated(new Date().toISOString());
    saveCache(next);
  };

  const load = async () => {
    setLoading(true);
    setError('');

    // If Supabase is configured, attempt remote query first
    if (isSupabaseConfigured() && supabase) {
      try {
        let q = supabase
          .from('results')
          .select('score, feedback, created_at, interview_id, interviews ( role )');

        if (user?.id) {
          q = q.eq('user_id', user.id);
        }

        const { data, error: supaError } = await q
          .order('created_at', { ascending: false })
          .limit(20);

        if (supaError) throw supaError;

        if (data && data.length > 0) {
          const trend = (data as any[]).map((row: any) => ({
            topic: row.interviews?.role || 'Drill Session',
            accuracy: Number.isFinite(row.score) ? Number(row.score) : 0,
            at: row.created_at || new Date().toISOString(),
          }));

          const validScores = trend
            .map((t: any) => t.accuracy)
            .filter((n: number) => Number.isFinite(n));
          const accuracy =
            validScores.length === 0
              ? 0
              : Math.round(
                  validScores.reduce((sum: number, item: number) => sum + item, 0) / validScores.length
                );

          const weakTopic = trend.reduce(
            (worst: any, curr: any) => (curr.accuracy < worst.accuracy ? curr : worst),
            trend[0]
          );

          const topicCounts: Record<string, number> = {};
          trend.forEach((t) => {
            topicCounts[t.topic] = (topicCounts[t.topic] || 0) + 1;
          });
          let mostStudied = 'General';
          let maxCount = 0;
          Object.entries(topicCounts).forEach(([top, count]) => {
            if (count > maxCount) {
              maxCount = count;
              mostStudied = top;
            }
          });

          hydrate({
            accuracy,
            totalExams: trend.length,
            weakTopic: weakTopic ? weakTopic.topic : 'None',
            mostStudied,
            trend,
          });
          setLoading(false);
          return;
        }
      } catch (err: any) {
        console.warn('[PrepMind] Remote database fetch failed, falling back to local database:', err?.message || err);
      }
    }

    // Resilient local database fallback (uses both local results and mcq attempts scoped to user)
    const localInsights = getLocalProgressInsights(user?.id);
    hydrate(localInsights);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const uniqueTopics = Array.from(new Set(insights.trend.map((t) => t.topic)));
  const filteredTrend = insights.trend.filter(
    (t) => filterTopic === 'all' || t.topic === filterTopic
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 1. TOP HEADER & METRIC CONTROLS */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Performance & Mastery Overview
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                isSupabaseConfigured()
                  ? 'bg-[var(--positive)]/15 text-[var(--positive)] border border-[var(--positive)]/30'
                  : 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30'
              }`}
            >
              {isSupabaseConfigured() ? 'Cloud Synced (Supabase)' : 'Local Storage DB (Offline Safe)'}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Verified performance history, evaluation accuracy trends, and weak area diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs font-mono text-[var(--text-muted)] hidden sm:inline">
              Updated{' '}
              {new Date(lastUpdated).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Notice / Warning if any */}
      {error && (
        <div className="text-xs p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--warning)]/40 text-[var(--warning)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 2. REAL METRIC KPI CARDS (DERIVED FROM APPLICATION STATE ONLY) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            <span className="truncate">Accuracy</span>
            <Target className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] font-mono tabular-nums">
            {loading ? '...' : `${insights.accuracy}%`}
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, insights.accuracy))}%` }}
            />
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] font-mono truncate">
            {insights.totalExams} recorded evaluations
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            <span className="truncate">Priority Focus</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-[var(--warning)] truncate">
            {loading ? '...' : insights.weakTopic}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] truncate">
            Lowest scoring discipline
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            <span className="truncate">Primary Focus</span>
            <Layers className="w-3.5 h-3.5 text-[var(--positive)] shrink-0" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-[var(--text-primary)] truncate">
            {loading ? '...' : insights.mostStudied}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] truncate">
            Most frequent drill topic
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            <span className="truncate">Logged Drills</span>
            <Award className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] font-mono tabular-nums">
            {loading ? '...' : insights.trend.length}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] font-mono truncate">
            Persistent database records
          </div>
        </div>
      </div>

      {/* 3. RECENT SESSION RECORDS OR DODGEFIELD EMPTY STATE */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Historical Session Records
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Evaluation scores across saved interview drills and practice sets.
            </p>
          </div>

          {uniqueTopics.length > 1 && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] font-mono focus:outline-none"
              >
                <option value="all">All Topics ({insights.trend.length})</option>
                {uniqueTopics.map((top) => (
                  <option key={top} value={top}>
                    {top}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Empty State with DodgeField Component (Strictly empty state) */}
        {insights.trend.length === 0 ? (
          <DodgeField onReset={load} />
        ) : (
          <AnimatedList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTrend.map((t, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                    {t.topic}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded font-mono shrink-0 ${
                      t.accuracy >= 70
                        ? 'bg-[var(--positive)]/15 text-[var(--positive)] border border-[var(--positive)]/30'
                        : t.accuracy >= 40
                        ? 'bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30'
                        : 'bg-[var(--error)]/15 text-[var(--error)] border border-[var(--error)]/30'
                    }`}
                  >
                    {t.accuracy}%
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      t.accuracy >= 70
                        ? 'bg-[var(--positive)]'
                        : t.accuracy >= 40
                        ? 'bg-[var(--warning)]'
                        : 'bg-[var(--error)]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, t.accuracy))}%` }}
                  />
                </div>

                <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                  <span>{new Date(t.at).toLocaleDateString()}</span>
                  <span>
                    {new Date(t.at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </AnimatedList>
        )}
      </div>
    </div>
  );
}

export default Progress;
