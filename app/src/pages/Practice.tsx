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
  const [mcqTopic, setMcqTopic] = useState('Loops and Arrays');
  const [mcqDifficulty, setMcqDifficulty] = useState('Intermediate');
  const [mcqLoading, setMcqLoading] = useState(false);
  const [mcqError, setMcqError] = useState('');
  const [mcqQuestion, setMcqQuestion] = useState<{ question: string; options: string[]; correct_answer?: string; explanation?: string } | null>(null);
  const [mcqChoice, setMcqChoice] = useState('');
  const [mcqResult, setMcqResult] = useState<{ score?: number; correct?: string; explanation?: string } | null>(null);
  const [attempts, setAttempts] = useState<{ topic: string; score: number; at: string }[]>(() => {
    try {
      const raw = localStorage.getItem('mcq_attempts');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Failed to load attempts', e);
      return [];
    }
  });

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

  const apiBase = (import.meta.env.VITE_API_BASE || 'http://localhost:5000').replace(/\/$/, '');
  const apiToken = import.meta.env.VITE_API_TOKEN || '';

  const safeJsonFetch = async (path: string, body: any, retry = true) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (err) {
        if (retry) return safeJsonFetch(path, body, false);
        throw err;
      }

      if (!res.ok) {
        const message = data?.error || 'Request failed';
        throw new Error(message);
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  };

  const handleGenerateMcq = async () => {
    if (!mcqTopic.trim()) { setMcqError('Topic is required'); return; }
    setMcqLoading(true);
    setMcqError('');
    setMcqResult(null);
    setMcqChoice('');
    try {
      const payload = { topic: mcqTopic.trim(), difficulty: mcqDifficulty };
      const data = await safeJsonFetch('/api/generate', payload, true);
      const question = Array.isArray(data?.questions) && data.questions[0] ? data.questions[0] : null;
      if (!question || !Array.isArray(question.options)) {
        throw new Error('Invalid question payload');
      }
      setMcqQuestion({
        question: question.question || mcqTopic,
        options: question.options.slice(0, 4).filter(Boolean),
        correct_answer: question.answer,
        explanation: question.explanation,
      });
    } catch (e: any) {
      setMcqQuestion(null);
      setMcqError(e?.message || 'Failed to generate question');
    } finally {
      setMcqLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!mcqQuestion || !mcqChoice) { setMcqError('Select an option first'); return; }
    setMcqLoading(true);
    setMcqError('');
    try {
      const payload = {
        answers: [
          {
            answer: mcqChoice,
            correct_answer: mcqQuestion.correct_answer,
            explanation: mcqQuestion.explanation,
          },
        ],
      };
      const data = await safeJsonFetch('/api/evaluate', payload, true);
      const score = typeof data?.score === 'number' ? data.score : 0;
      const explanation = Array.isArray(data?.explanations) && data.explanations.length
        ? data.explanations[0]
        : mcqQuestion.explanation || 'No explanation provided.';
      setMcqResult({
        score,
        correct: mcqQuestion.correct_answer || mcqChoice,
        explanation,
      });
      const next = [
        { topic: mcqTopic.trim(), score, at: new Date().toISOString() },
        ...attempts,
      ].slice(0, 10);
      setAttempts(next);
      localStorage.setItem('mcq_attempts', JSON.stringify(next));
    } catch (e: any) {
      setMcqError(e?.message || 'Failed to evaluate');
    } finally {
      setMcqLoading(false);
    }
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

      <div className="card-surface p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-white">MCQ generator (Phase 3)</h3>
            <p className="text-sm text-gray-300">Generate a quick MCQ, then evaluate safely.</p>
          </div>
          {mcqLoading && <LoadingSpinner label="Working" />}
        </div>

        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-2">
                <label className="text-xs text-white/70">Topic</label>
                <input
                  value={mcqTopic}
                  onChange={(e) => setMcqTopic(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-gray-800 bg-slate-800 text-white"
                  placeholder="Data structures"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-white/70">Difficulty</label>
                <select
                  value={mcqDifficulty}
                  onChange={(e) => setMcqDifficulty(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-gray-800 bg-slate-800 text-white"
                >
                  <option value="Beginner" className="bg-slate-900">Beginner</option>
                  <option value="Intermediate" className="bg-slate-900">Intermediate</option>
                  <option value="Advanced" className="bg-slate-900">Advanced</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="soft-button px-4 py-3" onClick={handleGenerateMcq} disabled={mcqLoading}>Generate MCQ</button>
              <button className="soft-button px-4 py-3" onClick={() => { setMcqQuestion(null); setMcqResult(null); setMcqChoice(''); setMcqError(''); }} disabled={mcqLoading}>Clear</button>
            </div>

            {mcqError && <div className="text-sm text-amber-300">{mcqError}</div>}

            {!mcqLoading && !mcqQuestion && !mcqError && (
              <div className="text-sm text-gray-300">Generate to start an MCQ. Safe even if Supabase is unavailable.</div>
            )}

            {mcqQuestion && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-900 border border-gray-800">
                <div className="text-white font-semibold">{mcqQuestion.question}</div>
                <div className="space-y-2">
                  {mcqQuestion.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setMcqChoice(opt)}
                      className={`w-full text-left px-3 py-3 rounded-lg border transition ${
                        mcqChoice === opt ? 'border-cyan-400 bg-slate-800' : 'border-gray-800 bg-slate-900 hover:border-gray-700'
                      }`}
                      disabled={mcqLoading}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <button className="soft-button px-4 py-3" onClick={handleEvaluate} disabled={mcqLoading || !mcqChoice}>Evaluate</button>
                {mcqResult && (
                  <div className="rounded-lg border border-gray-800 bg-slate-800 px-3 py-2 text-sm text-gray-100 space-y-1">
                    <div className="flex items-center justify-between"><span>Score</span><span className="font-semibold">{mcqResult.score ?? 0}%</span></div>
                    <div className="text-xs text-gray-300">Answer: {mcqResult.correct || 'N/A'}</div>
                    <div className="text-xs text-gray-400">{mcqResult.explanation}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-gray-800">
              <div className="text-sm font-semibold text-white">Recent attempts (local)</div>
              {attempts.length === 0 && <div className="text-xs text-gray-400">No attempts yet.</div>}
              {attempts.length > 0 && (
                <ul className="divide-y divide-gray-800 text-sm text-gray-100">
                  {attempts.map((a, idx) => (
                    <li key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{a.topic}</div>
                        <div className="text-[11px] text-gray-400">{new Date(a.at).toLocaleString()}</div>
                      </div>
                      <span className="text-cyan-300 font-semibold">{a.score}%</span>
                    </li>
                  ))}
                </ul>
              )}
              <button className="soft-button mt-3 px-3 py-2" onClick={() => { localStorage.removeItem('mcq_attempts'); setAttempts([]); }} disabled={mcqLoading}>Clear history</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Practice;
