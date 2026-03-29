import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedCard from '../components/AnimatedCard';
import LoadingSpinner from '../components/LoadingSpinner';
import SectionContainer from '../components/SectionContainer';
import { supabase } from '../lib/supabase';
import {
  createInterview,
  fetchHealth,
  fetchQuestions,
  listInterviews,
  saveResult,
  type Interview,
  type QuestionRow,
} from '../api';

type Status = 'idle' | 'ok' | 'error';
const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

function Home() {
  const [apiStatus, setApiStatus] = useState<Status>('idle');
  const [supabaseStatus, setSupabaseStatus] = useState<Status>('idle');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selected, setSelected] = useState('');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [form, setForm] = useState({ name: '', role: '', difficulty: 'Intermediate' });
  const [resultForm, setResultForm] = useState({ score: '', feedback: '' });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    healthCheck();
    loadInterviews();
  }, []);

  const setBusy = (key: string, value: boolean) => setLoading((prev) => ({ ...prev, [key]: value }));

  const healthCheck = async () => {
    setBusy('health', true);
    setError('');
    try {
      const health = await fetchHealth();
      setApiStatus(health.status === 'ok' ? 'ok' : 'error');
      if (!supabase) {
        setSupabaseStatus('error');
      } else {
        const { error: supaError } = await supabase.from('interviews').select('*').limit(1);
        setSupabaseStatus(supaError ? 'error' : 'ok');
      }
    } catch (e: any) {
      setApiStatus('error');
      setSupabaseStatus('error');
      setError(e.message || 'Health check failed');
    } finally {
      setBusy('health', false);
    }
  };

  const loadInterviews = async () => {
    setBusy('interviews', true);
    setError('');
    try {
      const data = await listInterviews();
      setInterviews(data);
      if (!selected && data.length) setSelected(String(data[0].id));
    } catch (e: any) {
      setError(e.message || 'Failed to load interviews');
    } finally {
      setBusy('interviews', false);
    }
  };

  const onCreateInterview = async () => {
    const role = form.role.trim();
    if (!role) { setError('Role is required'); return; }
    setBusy('create', true);
    setError('');
    try {
      const titleLabel = form.difficulty ? `${role} • ${form.difficulty}` : role;
      const { interview } = await createInterview({ title: titleLabel });
      setToast('Interview created');
      setForm({ name: '', role: '', difficulty: 'Intermediate' });
      setSelected(interview.id.toString());
      await loadInterviews();
    } catch (e: any) {
      setError(e.message || 'Failed to create interview');
    } finally {
      setBusy('create', false);
    }
  };

  const onFetchQuestions = async () => {
    if (!selected) { setError('Pick an interview'); return; }
    setBusy('questions', true);
    setError('');
    try {
      const data = await fetchQuestions(selected);
      setQuestions(data);
      setToast('Questions loaded');
    } catch (e: any) {
      setError(e.message || 'Failed to fetch questions');
    } finally {
      setBusy('questions', false);
    }
  };

  const onStartInterview = async () => {
    if (!selected) { setError('Pick an interview'); return; }
    if (!questions.length) {
      await onFetchQuestions();
      return;
    }
    setToast('Ready to start — questions loaded');
  };

  const onSaveResult = async () => {
    if (!selected) { setError('Pick an interview'); return; }
    setBusy('result', true);
    setError('');
    try {
      await saveResult({ interviewId: selected, score: Number(resultForm.score), feedback: resultForm.feedback });
      setResultForm({ score: '', feedback: '' });
      setToast('Result saved');
    } catch (e: any) {
      setError(e.message || 'Failed to save result');
    } finally {
      setBusy('result', false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const currentInterview = useMemo(() => interviews.find((i) => String(i.id) === String(selected)), [interviews, selected]);

  const statusTone = (status: Status) =>
    status === 'ok'
      ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10'
      : status === 'error'
        ? 'border-amber-400/50 text-amber-200 bg-amber-500/10'
        : 'border-white/15 text-white/70 bg-white/5';

  return (
    <main className="bg-slate-950">
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-10">
        <div className="text-center space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">PrepMind Interview Copilot</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Premium AI interview lane</h1>
          <p className="text-sm text-gray-300">Connected to Supabase, Express API, and Vite — end-to-end flow for setup, generation, and results.</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <span className={`px-3 py-2 rounded-full text-xs font-semibold border ${statusTone(apiStatus)}`}>API {apiStatus}</span>
            <span className={`px-3 py-2 rounded-full text-xs font-semibold border ${statusTone(supabaseStatus)}`}>Supabase {supabaseStatus}</span>
            <AnimatedButton onClick={healthCheck} disabled={loading.health} className="min-w-[180px]">
              {loading.health ? 'Checking…' : 'Re-run health check'}
            </AnimatedButton>
          </div>
          {toast && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-emerald-300">{toast}</motion.div>}
          {error && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-amber-300">{error}</motion.div>}
        </div>

        <SectionContainer
          badge="Phase 1"
          title="Setup Interview"
          description="Create interview records with Supabase and keep the runway clear with live health checks."
        >
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <AnimatedCard className="rounded-xl border border-gray-800 bg-slate-900 shadow-lg space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm text-gray-300">Use role + difficulty to seed Supabase via Express.</p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                    <span className="px-2 py-1 rounded-lg bg-slate-800 border border-gray-800">API: {import.meta.env.VITE_API_BASE || 'http://localhost:5000'}</span>
                    <span className="px-2 py-1 rounded-lg bg-slate-800 border border-gray-800">Supabase: {import.meta.env.VITE_SUPABASE_URL ? 'Configured' : 'Missing URL'}</span>
                  </div>
                </div>
                {loading.create && <LoadingSpinner label="Saving" />}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-white/70">Candidate name (optional)</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border border-gray-800 bg-slate-800 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                    placeholder="Alex Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/70">Role / Title *</label>
                  <input
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border border-gray-800 bg-slate-800 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                    placeholder="Senior Full-stack"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/70">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border border-gray-800 bg-slate-800 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                  >
                    <option value="Beginner" className="bg-slate-900">Beginner</option>
                    <option value="Intermediate" className="bg-slate-900">Intermediate</option>
                    <option value="Advanced" className="bg-slate-900">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <AnimatedButton onClick={onCreateInterview} disabled={loading.create} className="min-w-[160px]">
                  {loading.create ? 'Creating…' : 'Create interview'}
                </AnimatedButton>
                <AnimatedButton
                  glow={false}
                  onClick={loadInterviews}
                  disabled={loading.interviews}
                  className="bg-slate-800 border border-gray-800 hover:border-cyan-500/50"
                >
                  {loading.interviews ? 'Refreshing…' : 'Refresh list'}
                </AnimatedButton>
              </div>
            </AnimatedCard>

            <AnimatedCard className="rounded-xl border border-gray-800 bg-slate-900 shadow-lg space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-cyan-300 font-semibold">Supabase live</p>
                  <h3 className="text-xl font-semibold text-white">Recent interviews</h3>
                  <p className="text-sm text-gray-300">Select one to drive questions and results.</p>
                </div>
                {loading.interviews && <LoadingSpinner label="Loading" />}
              </div>

              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3 max-h-[320px] overflow-y-auto pr-1"
              >
                {interviews.map((item) => (
                  <motion.li key={item.id} variants={itemVariants}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      className={`w-full text-left p-4 rounded-xl border transition ${
                        selected === String(item.id)
                          ? 'border-cyan-500 bg-slate-800 shadow-lg'
                          : 'border-gray-800 bg-slate-900 hover:border-gray-700'
                      }`}
                      onClick={() => setSelected(String(item.id))}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-white">{item.title}</div>
                        <span className="text-[11px] px-2 py-1 rounded-full bg-slate-800 border border-gray-800 text-gray-200">{item.name || 'Candidate'}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(item.created_at || '').toLocaleString()}</div>
                    </motion.button>
                  </motion.li>
                ))}
                {!interviews.length && (
                  <motion.li variants={itemVariants} className="text-sm text-gray-400">No interviews yet. Create one to begin.</motion.li>
                )}
              </motion.ul>
            </AnimatedCard>
          </div>
        </SectionContainer>

        <SectionContainer
          badge="Phase 2"
          title="Generate Questions"
          description="Pull tailored prompts from Supabase and seed defaults when empty."
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] items-start">
            <AnimatedCard className="rounded-xl border border-gray-800 bg-slate-900 shadow-lg space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-white">Question pipeline</h3>
                  <p className="text-sm text-gray-300">Loads stored questions and seeds defaults for a clean start.</p>
                </div>
                {loading.questions && <LoadingSpinner label="Preparing" />}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <AnimatedButton
                  onClick={onFetchQuestions}
                  disabled={loading.questions || !selected}
                  className="min-w-[170px]"
                >
                  {loading.questions ? 'Fetching…' : 'Generate / Load questions'}
                </AnimatedButton>
                <span className="text-xs text-white/60">Target: {currentInterview?.title || 'Select an interview'}</span>
              </div>

              {loading.questions && (
                <div className="rounded-xl border border-gray-800 bg-slate-800 px-4 py-3 text-sm text-gray-200">
                  Streaming questions from Supabase…
                </div>
              )}

              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {questions.map((q, idx) => (
                  <motion.li
                    key={q.id}
                    variants={itemVariants}
                    className="p-4 rounded-xl bg-slate-800 border border-gray-800 text-sm text-gray-100 shadow-inner shadow-black/20"
                  >
                    <div className="text-xs text-gray-400 mb-1">Question {idx + 1}</div>
                    <div className="font-semibold leading-relaxed text-gray-100">{q.question}</div>
                  </motion.li>
                ))}
              </motion.ul>

              {!questions.length && !loading.questions && (
                <div className="text-sm text-white/60">No questions yet — generate to seed defaults.</div>
              )}
            </AnimatedCard>

            <AnimatedCard className="rounded-xl border border-gray-800 bg-slate-900 shadow-lg space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-cyan-300 font-semibold">Context</p>
                <h3 className="text-xl font-semibold text-white">Interview snapshot</h3>
                <p className="text-sm text-gray-300">Live Supabase-backed details for the active interview.</p>
              </div>
              <div className="grid gap-3 text-sm text-white/80">
                <div className="rounded-xl border border-gray-800 bg-slate-800 px-4 py-3">
                  <div className="text-xs text-gray-400">Selected interview</div>
                  <div className="font-semibold">{currentInterview?.title || 'None selected'}</div>
                  <div className="text-xs text-gray-400">ID: {selected || '—'}</div>
                </div>
                <div className="rounded-xl border border-gray-800 bg-slate-800 px-4 py-3 space-y-1">
                  <div className="text-xs text-gray-400">Supabase URL</div>
                  <div className="truncate text-gray-200">{import.meta.env.VITE_SUPABASE_URL || 'Not set'}</div>
                  <div className="text-xs text-gray-400">API base</div>
                  <div className="text-gray-200">{(import.meta.env.VITE_API_BASE || 'http://localhost:5000').replace(/\/$/, '')}</div>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </SectionContainer>

        <SectionContainer
          badge="Phase 3"
          title="Start Interview / Results"
          description="Run the session, then persist scores + feedback back to Supabase."
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] items-start">
            <AnimatedCard className="rounded-xl border border-gray-800 bg-slate-900 shadow-lg space-y-5">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-white">Interview runway</h3>
                <p className="text-sm text-gray-300">Kick off with the selected interview and questions you just generated.</p>
              </div>
              <AnimatedButton onClick={onStartInterview} disabled={!selected} className="min-w-[180px]">
                {questions.length ? 'Start interview now' : 'Load questions and start'}
              </AnimatedButton>
              <div className="rounded-xl border border-gray-800 bg-slate-800 px-4 py-3 text-sm text-gray-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Active interview</span>
                  <span className={`px-2 py-1 rounded-full text-[11px] border ${statusTone(apiStatus)}`}>API {apiStatus}</span>
                </div>
                <div className="font-semibold text-white">{currentInterview?.title || 'Select an interview to start'}</div>
                <div className="text-xs text-white/50">Questions ready: {questions.length}</div>
              </div>
            </AnimatedCard>

            <AnimatedCard className="rounded-xl border border-gray-800 bg-slate-900 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-cyan-300 font-semibold">Persist results</p>
                  <h3 className="text-xl font-semibold text-white">Save score + feedback</h3>
                </div>
                {loading.result && <LoadingSpinner label="Saving" />}
              </div>
              <div className="space-y-2">
                <label className="text-xs text-white/70">Score (0-100)</label>
                <input
                  value={resultForm.score}
                  onChange={(e) => setResultForm((p) => ({ ...p, score: e.target.value }))}
                  className="w-full px-3 py-3 rounded-xl border border-gray-800 bg-slate-800 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                  placeholder="85"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-white/70">Feedback</label>
                <textarea
                  value={resultForm.feedback}
                  onChange={(e) => setResultForm((p) => ({ ...p, feedback: e.target.value }))}
                  className="w-full min-h-[140px] px-3 py-3 rounded-xl border border-gray-800 bg-slate-800 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                  placeholder="Great systems depth, tighten API design examples."
                />
              </div>
              <AnimatedButton onClick={onSaveResult} disabled={loading.result || !selected} className="w-full">
                {loading.result ? 'Saving…' : 'Save result to Supabase'}
              </AnimatedButton>
              {currentInterview && (
                <div className="text-xs text-white/60">Target interview: {currentInterview.title}</div>
              )}
            </AnimatedCard>
          </div>
        </SectionContainer>
      </section>
    </main>
  );
}

export default Home;
