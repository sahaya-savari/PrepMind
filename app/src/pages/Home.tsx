import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { aiAPI } from '../api';
import { useAuth } from '../hooks/useAuth';

const sampleExams = ['CAT 2025', 'GATE CSE', 'SBI PO', 'JEE Advanced', 'TCS NQT'];
const STORAGE_KEY = 'prepmind_state';

type AppState = {
  exam: string;
  overview: string;
};

function Home() {
  const navigate = useNavigate();
  const { user, setExamOverview, data } = useAuth();
  const [exam, setExam] = useState('');
  const [overview, setOverview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: AppState = JSON.parse(saved);
        setExam(parsed.exam || '');
        setOverview(parsed.overview || '');
      } catch (e) {
        console.warn('Failed to load stored state', e);
      }
    }
  }, []);

  useEffect(() => {
    if (user && data.exam) {
      setExam(data.exam);
      setOverview(data.overview);
    }
  }, [user, data.exam, data.overview]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!exam.trim()) return;
    setError('');
    setLoading(true);
    try {
      const resp = await aiAPI([
        { role: 'system', content: 'You are an exam prep assistant. Be concise.' },
        { role: 'user', content: `Exam: ${exam}. Give a brief overview (4 sentences) and 6 key syllabus topics as bullets.` },
      ]);
      setOverview(resp);
      const nextState: AppState = { exam: exam.trim(), overview: resp };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      if (user) {
        setExamOverview(exam.trim(), resp);
      }
      navigate('/practice', { state: nextState });
    } catch (err: any) {
      setError(err?.message || 'Failed to start.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-10 max-w-3xl mx-auto text-center px-2 sm:px-0">
      <div className="card-surface p-6 sm:p-8 space-y-4 shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs text-white/90">
          <span className="text-base">🧭</span>
          Mobile-first prep shell
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">Your AI Exam Companion</h1>
        <p className="text-white/80 max-w-2xl mx-auto">
          Enter your exam, fetch an instant overview, and jump into practice and chat.
        </p>

        {user && (
          <div className="card-surface bg-white/20 p-4 text-left flex items-center justify-between">
            <div className="text-white text-sm">
              <div className="text-white/80">Welcome back</div>
              <div className="text-lg font-semibold">{user.name}</div>
              {data.exam && <div className="text-white/70 text-xs mt-1">Last exam: {data.exam}</div>}
            </div>
            <div className="text-right text-white text-sm">
              <div>Accuracy</div>
              <div className="text-xl font-bold">
                {data.progress.total > 0
                  ? Math.round((data.progress.correct / Math.max(1, data.progress.total)) * 100)
                  : 0}
                %
              </div>
              <div className="text-white/70">{data.progress.total} qs</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <label className="block text-sm text-white/80">Which exam are you preparing for?</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="w-full px-4 py-3 text-base rounded-xl bg-white/80 text-gray-900 placeholder:text-gray-500 shadow-lg focus:ring-4 focus:ring-blue-300 focus:outline-none"
              placeholder="e.g. GATE CSE, CAT, SBI PO"
              value={exam}
              onChange={(e) => setExam(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="w-full sm:w-44 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg hover:scale-105 transition-all"
              disabled={loading}
            >
              {loading ? <LoadingSpinner label="Starting" /> : 'Start Prep'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {sampleExams.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setExam(item)}
                className="soft-button px-3 py-2 text-white/90"
                disabled={loading}
              >
                {item}
              </button>
            ))}
          </div>
          {user && data.recentExams.length > 0 && (
            <div className="space-y-2">
              <div className="text-white/70 text-sm">Recent exams</div>
              <div className="flex flex-wrap gap-2 text-sm">
                {data.recentExams.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setExam(item)}
                    className="soft-button px-3 py-2 text-white/90"
                    disabled={loading}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        {error && <div className="text-sm text-red-200">{error}</div>}

        {overview && (
          <div className="card-surface p-4 text-left">
            <div className="text-sm text-white/70 mb-2">Last overview</div>
            <div className="whitespace-pre-wrap text-white text-sm leading-relaxed">{overview}</div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FeatureCard title="Practice" icon="⚡" desc="Generate MCQs quickly." />
        <FeatureCard title="Chat" icon="💬" desc="Ask AI doubts instantly." />
        <FeatureCard title="Progress" icon="📊" desc="Track accuracy and streaks." />
        <FeatureCard title="Mobile-first" icon="📱" desc="Bottom nav, touch targets, fast loads." />
      </div>
    </section>
  );
}

type FeatureCardProps = {
  title: string;
  icon: string;
  desc: string;
};

function FeatureCard({ title, icon, desc }: FeatureCardProps) {
  return (
    <div className="card-surface p-5 flex items-start gap-3">
      <div className="text-xl">{icon}</div>
      <div>
        <div className="text-lg font-semibold text-white">{title}</div>
        <p className="text-ink-300 text-sm mt-1">{desc}</p>
      </div>
    </div>
  );
}

export default Home;
