import { useEffect, useMemo, useState } from 'react';
import { useExam } from '../context/ExamContext';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Brain, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
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
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
};

const POPULAR_EXAMS = [
  'GATE CSE',
  'CAT 2025',
  'TCS NQT',
  'UPSC CSE',
  'JEE Advanced',
  'NEET UG',
  'SBI PO',
];

function Home() {
  const [apiStatus, setApiStatus] = useState<Status>('idle');
  const [supabaseStatus, setSupabaseStatus] = useState<Status>('idle');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [form, setForm] = useState({ name: '', role: '', difficulty: 'Intermediate' });
  const [resultForm, setResultForm] = useState({ score: '', feedback: '' });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const { exam, setExam } = useExam();

  useEffect(() => {
    healthCheck();
    loadInterviews();
  }, []);

  const setBusy = (key: string, value: boolean) =>
    setLoading((prev) => ({ ...prev, [key]: value }));

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
      if (!exam && data.length) setExam(String(data[0].id));
    } catch (e: any) {
      setError(e.message || 'Failed to load interviews');
    } finally {
      setBusy('interviews', false);
    }
  };

  const onCreateInterview = async () => {
    const role = form.role.trim();
    if (!role) {
      setError('Role or Subject is required');
      return;
    }
    setBusy('create', true);
    setError('');
    try {
      const titleLabel = form.difficulty ? `${role} • ${form.difficulty}` : role;
      const { interview } = await createInterview({ title: titleLabel });
      setToast('Interview session initialized');
      setForm({ name: '', role: '', difficulty: 'Intermediate' });
      setExam(interview.id.toString());
      await loadInterviews();
    } catch (e: any) {
      setError(e.message || 'Failed to create interview');
    } finally {
      setBusy('create', false);
    }
  };

  const onFetchQuestions = async () => {
    if (!exam) {
      setError('Select an interview target first');
      return;
    }
    setBusy('questions', true);
    setError('');
    try {
      const data = await fetchQuestions(exam);
      setQuestions(data);
      setToast('Questions loaded');
    } catch (e: any) {
      setError(e.message || 'Failed to fetch questions');
    } finally {
      setBusy('questions', false);
    }
  };

  const onStartInterview = async () => {
    if (!exam) {
      setError('Pick an interview session');
      return;
    }
    if (!questions.length) {
      await onFetchQuestions();
      return;
    }
    setToast('Ready to start — questions prepared');
  };

  const onSaveResult = async () => {
    if (!exam) {
      setError('Pick an interview first');
      return;
    }
    setBusy('result', true);
    setError('');
    try {
      await saveResult({
        interviewId: exam,
        score: Number(resultForm.score),
        feedback: resultForm.feedback,
      });
      setResultForm({ score: '', feedback: '' });
      setToast('Result logged successfully');
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

  const currentInterview = useMemo(
    () => interviews.find((i) => String(i.id) === String(exam)),
    [interviews, exam]
  );

  return (
    <div className="space-y-12">
      {/* Editorial Overview Section */}
      <section className="space-y-6 pt-2">
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-midnight-accentSoft border border-midnight-accent/30 text-midnight-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-midnight-accent animate-pulse" />
            PrepMind Midnight Learning Engine
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-ink-primary leading-tight">
            Distraction-free preparation for high-stakes examinations.
          </h1>

          <p className="text-sm sm:text-base text-ink-secondary leading-relaxed">
            Personalized practice drills, adaptive multiple-choice evaluations, and structured AI tutoring calibrated to your curriculum and weak areas.
          </p>
        </div>

        {/* Target Exam Switcher */}
        <div className="p-4 sm:p-5 rounded-xl border border-midnight-border bg-midnight-surface space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Select Examination Target
            </span>
            {exam && (
              <span className="text-xs text-midnight-accent font-medium">
                Active: <strong className="text-ink-primary">{exam}</strong>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {POPULAR_EXAMS.map((ex) => {
              const isSelected = exam === ex;
              return (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setExam(ex);
                    setToast(`Target set to ${ex}`);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent ${
                    isSelected
                      ? 'bg-midnight-accent text-[#0B0D12] shadow-sm font-bold'
                      : 'bg-midnight-subtle border border-midnight-border text-ink-secondary hover:text-ink-primary hover:border-midnight-accent/50'
                  }`}
                >
                  {ex}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Learning Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Practice */}
          <div className="p-5 rounded-xl border border-midnight-border bg-midnight-surface hover:border-midnight-accent/50 transition-all flex flex-col justify-between group space-y-4">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-lg bg-midnight-accentSoft border border-midnight-accent/30 flex items-center justify-center text-midnight-accent">
                <Brain size={20} />
              </div>
              <h2 className="text-lg font-bold font-display text-ink-primary group-hover:text-midnight-accent transition-colors">
                Adaptive MCQ Practice
              </h2>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Subject-specific multiple-choice drills with instant Socratic reasoning and verified offline question fallback.
              </p>
            </div>
            <a
              href="/practice"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-midnight-accent text-[#0B0D12] hover:bg-midnight-accentHover transition-colors text-center"
            >
              <span>Start Practice Session</span>
              <ArrowRight size={14} />
            </a>
          </div>

          {/* Card 2: AI Tutor */}
          <div className="p-5 rounded-xl border border-midnight-border bg-midnight-surface hover:border-midnight-accent/50 transition-all flex flex-col justify-between group space-y-4">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-lg bg-midnight-subtle border border-midnight-border flex items-center justify-center text-ink-primary">
                <BookOpen size={20} />
              </div>
              <h2 className="text-lg font-bold font-display text-ink-primary group-hover:text-midnight-accent transition-colors">
                Socratic AI Study Tutor
              </h2>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Step-by-step guidance on complex formulas, algorithmic proofs, and conceptual bottlenecks with multi-provider cascade.
              </p>
            </div>
            <a
              href="/chat"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-midnight-subtle border border-midnight-border text-ink-primary hover:bg-midnight-elevated hover:border-midnight-accent/60 transition-colors text-center"
            >
              <span>Launch AI Tutor</span>
              <ArrowRight size={14} />
            </a>
          </div>

          {/* Card 3: Performance Tracking */}
          <div className="p-5 rounded-xl border border-midnight-border bg-midnight-surface hover:border-midnight-accent/50 transition-all flex flex-col justify-between group space-y-4">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-lg bg-midnight-positive/10 border border-midnight-positive/30 flex items-center justify-center text-midnight-positive">
                <CheckCircle2 size={20} />
              </div>
              <h2 className="text-lg font-bold font-display text-ink-primary group-hover:text-midnight-positive transition-colors">
                Performance Analytics
              </h2>
              <p className="text-xs text-ink-secondary leading-relaxed">
                Transparent accuracy trends, score distributions, and domain-level weak spots without arbitrary filler statistics.
              </p>
            </div>
            <a
              href="/progress"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-midnight-subtle border border-midnight-border text-ink-primary hover:bg-midnight-elevated hover:border-midnight-accent/60 transition-colors text-center"
            >
              <span>View Progress</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </div>

        {/* System Diagnostics Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-midnight-border bg-midnight-subtle/50 text-xs text-ink-secondary">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  apiStatus === 'ok' ? 'bg-midnight-positive' : 'bg-midnight-warning'
                }`}
              />
              <span>
                AI Engine:{' '}
                <strong className="text-ink-primary">
                  {apiStatus === 'ok' ? 'Online (Groq + NIM + Gemini)' : 'Local Fallback Ready'}
                </strong>
              </span>
            </span>
            <span className="text-midnight-border">|</span>
            <span className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  supabaseStatus === 'ok' ? 'bg-midnight-positive' : 'bg-ink-muted'
                }`}
              />
              <span>
                Cloud Sync:{' '}
                <strong className="text-ink-primary">
                  {supabaseStatus === 'ok' ? 'Connected' : 'Offline / Guest Session'}
                </strong>
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={healthCheck}
            disabled={loading.health}
            className="inline-flex items-center gap-1 text-ink-muted hover:text-midnight-accent transition-colors underline outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent"
          >
            <RefreshCw size={12} className={loading.health ? 'animate-spin' : ''} />
            <span>{loading.health ? 'Diagnosing…' : 'Check status'}</span>
          </button>
        </div>

        {/* Toast / Notification Feed */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-midnight-positive bg-midnight-positive/10 border border-midnight-positive/30 py-2 px-3.5 rounded-lg flex items-center gap-2"
          >
            <CheckCircle2 size={14} />
            <span>{toast}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-midnight-warning bg-midnight-warning/10 border border-midnight-warning/30 py-2 px-3.5 rounded-lg flex items-center gap-2"
          >
            <AlertTriangle size={14} />
            <span>{error}</span>
          </motion.div>
        )}
      </section>

      {/* Preserved Workspace & Session Management */}
      <SectionContainer
        badge="Session Seed"
        title="Interview & Topic Session Configuration"
        description="Configure structured exam subjects, seed questions, and persist scores."
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
          {/* Creation form */}
          <AnimatedCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display text-ink-primary">
                  Create Preparation Session
                </h3>
                <p className="text-xs text-ink-secondary">
                  Specify topic domain and difficulty level.
                </p>
              </div>
              {loading.create && <LoadingSpinner label="Saving" />}
            </div>

            <div className="grid sm:grid-cols-2 gap-3.5 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-secondary">
                  Candidate / Student ID
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-midnight-border bg-midnight-subtle text-ink-primary placeholder:text-ink-muted focus:border-midnight-accent focus:outline-none focus:ring-1 focus:ring-midnight-accent"
                  placeholder="e.g. Scholar"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-secondary">
                  Role / Target Domain *
                </label>
                <input
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-midnight-border bg-midnight-subtle text-ink-primary placeholder:text-ink-muted focus:border-midnight-accent focus:outline-none focus:ring-1 focus:ring-midnight-accent"
                  placeholder="e.g. Algorithms & Complexity"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-ink-secondary">Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-midnight-border bg-midnight-subtle text-ink-primary focus:border-midnight-accent focus:outline-none focus:ring-1 focus:ring-midnight-accent"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <AnimatedButton
                onClick={onCreateInterview}
                disabled={loading.create}
                className="min-w-[140px]"
              >
                {loading.create ? 'Creating…' : 'Create Session'}
              </AnimatedButton>
              <AnimatedButton
                variant="secondary"
                onClick={loadInterviews}
                disabled={loading.interviews}
              >
                {loading.interviews ? 'Refreshing…' : 'Refresh Sessions'}
              </AnimatedButton>
            </div>
          </AnimatedCard>

          {/* Active interview picker */}
          <AnimatedCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display text-ink-primary">
                  Recent Sessions
                </h3>
                <p className="text-xs text-ink-secondary">
                  Choose a session to drive questions and evaluations.
                </p>
              </div>
              {loading.interviews && <LoadingSpinner label="Loading" />}
            </div>

            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2 max-h-[280px] overflow-y-auto pr-1"
            >
              {interviews.map((item) => {
                const isActive = exam === String(item.id);
                return (
                  <motion.li key={item.id} variants={itemVariants}>
                    <button
                      type="button"
                      onClick={() => setExam(String(item.id))}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-xs outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent ${
                        isActive
                          ? 'border-midnight-accent bg-midnight-subtle shadow-sm'
                          : 'border-midnight-border bg-midnight-surface hover:border-midnight-accent/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-ink-primary text-sm truncate">
                          {item.title}
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-midnight-subtle border border-midnight-border text-ink-secondary">
                          {item.name || 'Candidate'}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-muted mt-1">
                        {new Date(item.created_at || '').toLocaleDateString()}{' '}
                        {new Date(item.created_at || '').toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </button>
                  </motion.li>
                );
              })}
              {!interviews.length && (
                <li className="text-xs text-ink-muted py-6 text-center">
                  No sessions recorded yet. Create one above to begin.
                </li>
              )}
            </motion.ul>
          </AnimatedCard>
        </div>
      </SectionContainer>

      {/* Question Pipeline & Results Saving */}
      <SectionContainer
        badge="Question Engine"
        title="Drill Runway & Evaluation Records"
        description="Stream prompts and persist test feedback to your database."
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] items-start">
          {/* Question Generator Card */}
          <AnimatedCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display text-ink-primary">
                  Question Runway
                </h3>
                <p className="text-xs text-ink-secondary">
                  Active target: {currentInterview?.title || 'Select session'}
                </p>
              </div>
              {loading.questions && <LoadingSpinner label="Loading" />}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <AnimatedButton
                onClick={onStartInterview}
                disabled={!exam}
                className="min-w-[150px]"
              >
                {questions.length ? 'Start Drill Now' : 'Load Questions'}
              </AnimatedButton>
              <span className="text-xs text-ink-muted">
                {questions.length} questions ready
              </span>
            </div>

            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1"
            >
              {questions.map((q, idx) => (
                <motion.li
                  key={q.id}
                  variants={itemVariants}
                  className="p-3 rounded-lg bg-midnight-subtle border border-midnight-border text-xs text-ink-primary space-y-1"
                >
                  <span className="text-[10px] font-bold text-midnight-accent uppercase tracking-wider">
                    Question {idx + 1}
                  </span>
                  <div className="font-medium leading-relaxed">{q.question}</div>
                </motion.li>
              ))}
            </motion.ul>

            {!questions.length && !loading.questions && (
              <div className="text-xs text-ink-muted p-4 rounded-lg border border-dashed border-midnight-border text-center">
                Click <strong>Load Questions</strong> to stream stored prompts.
              </div>
            )}
          </AnimatedCard>

          {/* Persist Score & Feedback Card */}
          <AnimatedCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display text-ink-primary">
                  Persist Performance
                </h3>
                <p className="text-xs text-ink-secondary">
                  Log evaluation scores and feedback comments.
                </p>
              </div>
              {loading.result && <LoadingSpinner label="Saving" />}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-secondary">Score (0–100)</label>
                <input
                  value={resultForm.score}
                  onChange={(e) => setResultForm((p) => ({ ...p, score: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-midnight-border bg-midnight-subtle text-ink-primary placeholder:text-ink-muted focus:border-midnight-accent focus:outline-none focus:ring-1 focus:ring-midnight-accent tabular-nums"
                  placeholder="85"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-secondary">Feedback Notes</label>
                <textarea
                  value={resultForm.feedback}
                  onChange={(e) => setResultForm((p) => ({ ...p, feedback: e.target.value }))}
                  className="w-full min-h-[90px] px-3 py-2 text-sm rounded-lg border border-midnight-border bg-midnight-subtle text-ink-primary placeholder:text-ink-muted focus:border-midnight-accent focus:outline-none focus:ring-1 focus:ring-midnight-accent"
                  placeholder="Strong problem formulation; tighten recursion complexity analysis."
                />
              </div>

              <AnimatedButton
                onClick={onSaveResult}
                disabled={loading.result || !exam}
                className="w-full"
              >
                {loading.result ? 'Saving…' : 'Save Result to Database'}
              </AnimatedButton>
            </div>
          </AnimatedCard>
        </div>
      </SectionContainer>
    </div>
  );
}

export default Home;
