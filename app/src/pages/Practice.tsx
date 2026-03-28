import { useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchQuestions, listInterviews, type Interview, type QuestionRow } from '../api';
import { useAuth } from '../hooks/useAuth';

function Practice() {
  const { updateProgress } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selected, setSelected] = useState('');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listInterviews();
      setInterviews(data);
      if (!selected && data.length) setSelected(data[0].id);
    } catch (e: any) {
      setError(e.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    if (!selected) { setError('Pick an interview first'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await fetchQuestions(selected);
      setQuestions(data);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const mark = (correct: boolean) => {
    updateProgress(correct);
  };

  return (
    <section className="space-y-6 py-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-white">Practice</h2>
          <p className="text-gray-300 text-sm">Pull questions from your Supabase interviews.</p>
        </div>
        <div className="flex gap-2">
          <button className="soft-button px-4 py-2" onClick={loadQuestions} disabled={loading || !selected}>
            {loading ? 'Loading…' : 'Load questions'}
          </button>
          <button className="soft-button px-3 py-2" onClick={loadInterviews} disabled={loading}>Refresh</button>
        </div>
      </header>

      <div className="card-surface p-6 space-y-3">
        <label className="text-xs text-gray-300">Select interview</label>
        <select
          className="w-full px-3 py-3 rounded-xl border border-gray-800 bg-slate-800 text-white"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {interviews.map((i) => (
            <option key={i.id} value={i.id} className="bg-slate-900">
              {i.role}
            </option>
          ))}
          {!interviews.length && <option value="">No interviews yet</option>}
        </select>
        {error && <div className="text-sm text-red-300">{error}</div>}
      </div>

      <div className="card-surface p-6 space-y-3 min-h-[200px]">
        {loading && <div className="flex items-center justify-center py-6"><LoadingSpinner label="Loading" /></div>}
        {!loading && questions.length === 0 && <div className="text-gray-200 text-sm">Click "Load questions" to fetch seeded prompts.</div>}
        {!loading && questions.length > 0 && (
          <ol className="space-y-3 text-sm text-white">
            {questions.map((q, idx) => (
              <li key={q.id} className="card-surface bg-slate-900 text-white p-4 space-y-3 list-decimal list-inside">
                <div>{idx + 1}. {q.question}</div>
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
