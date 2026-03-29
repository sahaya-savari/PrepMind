import { useEffect, useState } from 'react';
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
        setError('Supabase unavailable (using cached)');
      } else {
        setError('Supabase unavailable');
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

      const trend = data.map((row) => ({
        topic: row.interviews?.role || 'Interview',
        accuracy: Number.isFinite(row.score) ? Number(row.score) : 0,
        at: row.created_at || new Date().toISOString(),
      }));

      const validScores = trend.map((t) => t.accuracy).filter((n) => Number.isFinite(n));
      const accuracy = validScores.length === 0 ? 0 : Math.round(validScores.reduce((sum, item) => sum + item, 0) / validScores.length);

      const weakTopic = trend.reduce((worst, curr) => (curr.accuracy < worst.accuracy ? curr : worst), trend[0]);

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
      setError(e?.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="space-y-6 py-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-white">Progress</h2>
          <p className="text-gray-300 text-sm">Latest scores stored in Supabase with offline cache.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-gray-400">Updated {new Date(lastUpdated).toLocaleString()}</span>}
          <button className="soft-button px-3 py-2" onClick={load} disabled={loading}>Refresh</button>
        </div>
      </header>

      {error && <div className="text-sm text-red-200">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InsightCard title="Accuracy" value={`${insights.accuracy}%`} hint={`${insights.totalExams} results`} loading={loading} />
        <InsightCard title="Weak Topic" value={insights.weakTopic} hint="Lowest recent" loading={loading} />
        <InsightCard title="Most Recent" value={insights.mostStudied} hint="Latest interview" loading={loading} />
        <InsightCard title="Recent Saved" value={`${insights.trend.length}`} hint="Last 10" loading={loading} />
      </div>

      <div className="card-surface p-6 space-y-3">
        <div className="text-white font-semibold text-lg">Recent performance</div>
        {insights.trend.length === 0 && <div className="text-gray-300 text-sm">No data yet.</div>}
        {insights.trend.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {insights.trend.map((t, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-gray-800 text-sm text-white">
                <div className="text-white font-semibold">{t.topic}</div>
                <div className="text-cyan-300 text-lg font-bold">{t.accuracy}%</div>
                <div className="text-xs text-gray-400">{new Date(t.at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function InsightCard({ title, value, hint, loading }: { title: string; value: string; hint?: string; loading?: boolean }) {
  return (
    <div className="card-surface p-4 space-y-1">
      <div className="text-gray-400 text-xs uppercase tracking-wide">{title}</div>
      <div className="text-white text-2xl font-bold">{loading ? '…' : value}</div>
      {hint && <div className="text-gray-400 text-xs">{hint}</div>}
    </div>
  );
}

export default Progress;
