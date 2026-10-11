import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { type ProgressInsights } from '../api';
import { supabase } from '../lib/supabase';

const defaultInsights: ProgressInsights = {
  accuracy: 0,
  totalExams: 0,
  weakTopic: 'N/A',
  mostStudied: 'N/A',
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
  const [insights, setInsights] = useState<ProgressInsights>(defaultInsights);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const hydrate = (next: ProgressInsights) => {
    setInsights(next);
    setLastUpdated(new Date().toISOString());
    saveCache(next);
  };

  const load = async () => {
    setLoading(true);
    setError('');

    if (!supabase) {
      const cached = loadCache();
      if (cached) {
        hydrate(cached);
        setError('Database in guest session mode (showing cached metrics)');
      } else {
        setError('Database offline / guest session');
        setInsights(defaultInsights);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error: supaError } = await supabase
        .from('results')
        .select('score, feedback, created_at, interview_id, interviews ( role )')
        .order('created_at', { ascending: false })
        .limit(10);

      if (supaError) throw supaError;

      if (!data || data.length === 0) {
        hydrate(defaultInsights);
        return;
      }

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

      hydrate({
        accuracy,
        totalExams: trend.length,
        weakTopic: weakTopic?.topic || 'N/A',
        mostStudied: trend[0]?.topic || 'N/A',
        trend,
      });
    } catch (e: any) {
      const cached = loadCache();
      if (cached) {
        hydrate(cached);
      } else {
        setInsights(defaultInsights);
      }
      setError(e?.message || 'Failed to load progress metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-midnight-border pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-midnight-accentSoft border border-midnight-accent/30 text-midnight-accent mb-1.5">
            <BarChart3 size={12} />
            <span>Mastery & Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-ink-primary">
            Learning Progress
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary">
            Verified performance history, accuracy trends, and weak area insights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-ink-muted">
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
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-midnight-subtle border border-midnight-border text-ink-primary hover:bg-midnight-elevated hover:border-midnight-accent/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Notice */}
      {error && (
        <div className="text-xs p-3 rounded-lg bg-midnight-subtle border border-midnight-border text-ink-secondary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-midnight-warning" />
            <span>{error}</span>
          </div>
          <span className="text-[10px] text-midnight-accent font-semibold uppercase tracking-wider">
            Cached Data Available
          </span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InsightCard
          title="Overall Accuracy"
          value={`${insights.accuracy}%`}
          hint={`${insights.totalExams} recorded sessions`}
          loading={loading}
          progress={insights.accuracy}
        />
        <InsightCard
          title="Focus Area Needed"
          value={insights.weakTopic}
          hint="Lowest scoring domain"
          loading={loading}
          tone="warning"
        />
        <InsightCard
          title="Most Studied Subject"
          value={insights.mostStudied}
          hint="Most frequent drill subject"
          loading={loading}
        />
        <InsightCard
          title="Total Logged Drills"
          value={`${insights.trend.length}`}
          hint="Recent session records"
          loading={loading}
        />
      </div>

      {/* Recent Session History Card */}
      <div className="rounded-xl border border-midnight-border bg-midnight-surface p-5 sm:p-6 space-y-5 shadow-card">
        <div className="flex items-center justify-between border-b border-midnight-border pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold font-display text-ink-primary">
              Recent Session Records
            </h2>
            <p className="text-xs text-ink-secondary">
              Score distribution across practice sets and evaluations
            </p>
          </div>
          {insights.trend.length > 0 && (
            <span className="text-xs font-mono font-semibold text-midnight-accent">
              {insights.trend.length} records
            </span>
          )}
        </div>

        {insights.trend.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-midnight-subtle border border-midnight-border flex items-center justify-center text-ink-muted">
              <TrendingUp size={20} />
            </div>
            <div className="text-sm font-semibold text-ink-primary">
              No session records logged yet
            </div>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto leading-relaxed">
              Complete practice drills or mock evaluations to track your accuracy and identify priority topics.
            </p>
            <div className="pt-2">
              <Link
                to="/practice"
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold bg-midnight-accent text-[#0B0D12] hover:bg-midnight-accentHover transition-colors"
              >
                <span>Start Practice Drill</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {insights.trend.map((t, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-midnight-border bg-midnight-subtle space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-xs sm:text-sm text-ink-primary truncate">
                    {t.topic}
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded font-mono shrink-0 ${
                      t.accuracy >= 70
                        ? 'bg-midnight-positive/15 text-midnight-positive border border-midnight-positive/30'
                        : t.accuracy >= 40
                        ? 'bg-midnight-warning/15 text-midnight-warning border border-midnight-warning/30'
                        : 'bg-midnight-error/15 text-midnight-error border border-midnight-error/30'
                    }`}
                  >
                    {t.accuracy}%
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="w-full h-1.5 rounded-full bg-midnight-surface overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        t.accuracy >= 70
                          ? 'bg-midnight-positive'
                          : t.accuracy >= 40
                          ? 'bg-midnight-warning'
                          : 'bg-midnight-error'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, t.accuracy))}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-ink-muted flex items-center justify-between font-mono">
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
          </div>
        )}
      </div>
    </div>
  );
}

function InsightCard({
  title,
  value,
  hint,
  loading,
  progress,
  tone,
}: {
  title: string;
  value: string;
  hint?: string;
  loading?: boolean;
  progress?: number;
  tone?: 'positive' | 'warning' | 'error';
}) {
  return (
    <div className="rounded-xl border border-midnight-border bg-midnight-surface p-4 sm:p-5 flex flex-col justify-between space-y-3">
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          {title}
        </div>
        <div
          className={`text-2xl font-bold font-display tracking-tight tabular-nums truncate ${
            tone === 'warning' ? 'text-midnight-warning' : 'text-ink-primary'
          }`}
        >
          {loading ? '…' : value}
        </div>
      </div>

      {typeof progress === 'number' && (
        <div className="w-full h-1.5 rounded-full bg-midnight-subtle overflow-hidden">
          <div
            className="h-full rounded-full bg-midnight-accent transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {hint && <div className="text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}

export default Progress;
