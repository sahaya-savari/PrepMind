import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { aiAPI } from '../api';
import { useAuth } from '../hooks/useAuth';

type LocationState = {
  exam?: string;
  overview?: string;
};

type Question = {
  id: number;
  text: string;
};

const STORAGE_KEY = 'prepmind_state';

function Practice() {
  const location = useLocation();
  const locState = (location.state || {}) as LocationState;
  const { data, setExamOverview, updateProgress } = useAuth();

  const [exam, setExam] = useState(locState.exam || '');
  const [overview, setOverview] = useState(locState.overview || '');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (exam) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setExam(parsed.exam || '');
        setOverview(parsed.overview || '');
      } catch (e) {
        console.warn('Failed to parse stored state', e);
      }
    }
    if (data.exam) {
      setExam(data.exam);
      setOverview(data.overview);
    }
  }, [exam, data.exam, data.overview]);

  const parseQuestions = (text: string): Question[] => {
    return text
      .split(/\n+/)
      .map((line) => line.replace(/^[-*\d\.\s]+/, '').trim())
      .filter(Boolean)
      .map((q, idx) => ({ id: idx + 1, text: q }));
  };

  const generate = async () => {
    if (!exam) {
      setError('Set an exam on Home first.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const resp = await aiAPI([
        { role: 'system', content: 'You generate concise MCQs without answers unless asked. Provide 5 items.' },
        {
          role: 'user',
          content: `Exam: ${exam}. Create 5 short MCQs (question only) across varied topics. Keep each on one line without numbering details beyond a leading bullet.`,
        },
      ]);
      const parsed = parseQuestions(resp);
      setQuestions(parsed.length ? parsed : [{ id: 1, text: resp }]);
      setExamOverview(exam, overview);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate questions.');
    } finally {
      setLoading(false);
    }
  };

  const mark = (correct: boolean) => {
    updateProgress(correct);
  };

  const hasExam = Boolean(exam);

  return (
    <section className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Practice</h2>
          <p className="text-gray-600 text-sm">Generate quick MCQs for your chosen exam.</p>
        </div>
        <button className="soft-button" onClick={generate} disabled={!hasExam || loading}>
          {loading ? 'Working…' : 'Generate'}
        </button>
      </header>

      {!hasExam && (
        <div className="card-surface p-5 text-sm text-white">
          Please set an exam on <Link to="/" className="text-accent-400">Home</Link> first.
        </div>
      )}

      {hasExam && overview && (
        <div className="card-surface p-5">
          <div className="text-xs text-white/70">Overview</div>
          <div className="text-sm text-white whitespace-pre-wrap">{overview}</div>
        </div>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}

      <div className="card-surface p-5 space-y-3 min-h-[200px]">
        {loading && <div className="flex items-center justify-center py-6"><LoadingSpinner label="Generating" /></div>}
        {!loading && questions.length === 0 && (
          <div className="text-white/80 text-sm">Tap Generate to fetch MCQs.</div>
        )}
        {!loading && questions.length > 0 && (
          <ol className="space-y-3 text-sm text-gray-900">
            {questions.map((q) => (
              <li key={q.id} className="card-surface bg-white/70 text-gray-900 p-4 space-y-3 list-decimal list-inside">
                <div>{q.text}</div>
                <div className="flex gap-2 text-xs">
                  <button className="soft-button px-3 py-2" onClick={() => mark(true)}>Mark Correct</button>
                  <button className="soft-button px-3 py-2" onClick={() => mark(false)}>Mark Incorrect</button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

export default Practice;
