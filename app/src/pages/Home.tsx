import React, { useEffect, useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExam } from '../context/ExamContext';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  MessageCircle,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Sparkles,
  Layers,
  Database,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { TextType } from '../components/reactbits/TextType';
import { RotatingText } from '../components/reactbits/RotatingText';
import { StarBorder } from '../components/reactbits/StarBorder';
import { PixelCard } from '../components/reactbits/PixelCard';
import { Stepper, StepItem } from '../components/reactbits/Stepper';
import { GlideSelect, GlideOption } from '../components/reactbits/GlideSelect';
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

const LazyHyperspeed = React.lazy(() =>
  import('../components/reactbits/Hyperspeed').then((m) => ({ default: m.Hyperspeed }))
);

type Status = 'idle' | 'ok' | 'error';

const EXAM_OPTIONS: GlideOption[] = [
  { value: 'GATE CSE', label: 'GATE CSE', badge: 'Tech' },
  { value: 'CAT 2025', label: 'CAT 2025', badge: 'Aptitude' },
  { value: 'TCS NQT', label: 'TCS NQT', badge: 'Placement' },
  { value: 'UPSC CSE', label: 'UPSC CSE', badge: 'Govt' },
  { value: 'JEE Advanced', label: 'JEE Adv', badge: 'Eng' },
  { value: 'SBI PO', label: 'SBI PO', badge: 'Banking' },
];

const CORE_PILLARS = [
  {
    title: 'Adaptive Practice Drills',
    description: 'Precision multiple-choice scenarios with instant algorithmic evaluation, solution breakdowns, and feedback.',
    tag: 'Active Recall',
    icon: Brain,
    variant: 'lilac' as const,
  },
  {
    title: 'Interactive AI Tutor',
    description: 'Context-aware conversational mentor equipped to debug algorithms, explain proofs, and analyze problem formulations.',
    tag: 'Live Dialogue',
    icon: MessageCircle,
    variant: 'positive' as const,
  },
  {
    title: 'Performance Diagnostics',
    description: 'Comprehensive historical evaluation tracking, mastery scoring across tracks, and persistent session records.',
    tag: 'Mastery Curves',
    icon: TrendingUp,
    variant: 'neutral' as const,
  },
  {
    title: 'Curriculum Alignment',
    description: 'Customizable target benchmarks for engineering competitive exams, placements, and systems architecture.',
    tag: 'Syllabus Focus',
    icon: Layers,
    variant: 'lilac' as const,
  },
];

function Home() {
  const navigate = useNavigate();
  const { exam, setExam } = useExam();

  const [apiStatus, setApiStatus] = useState<Status>('idle');
  const [supabaseStatus, setSupabaseStatus] = useState<Status>('idle');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [form, setForm] = useState({ name: '', role: 'Software Engineer', difficulty: 'Intermediate' });
  const [resultForm, setResultForm] = useState({ score: '', feedback: '' });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    checkHealth();
    loadInterviews();
  }, []);

  const setBusy = (key: string, val: boolean) =>
    setLoading((prev) => ({ ...prev, [key]: val }));

  const checkHealth = async () => {
    setBusy('health', true);
    setErrorMessage('');
    try {
      const health = await fetchHealth();
      setApiStatus(health.status === 'ok' ? 'ok' : 'error');
      if (!supabase) {
        setSupabaseStatus('error');
      } else {
        const { error: supaErr } = await supabase.from('interviews').select('*').limit(1);
        setSupabaseStatus(supaErr ? 'error' : 'ok');
      }
    } catch {
      setApiStatus('error');
    } finally {
      setBusy('health', false);
    }
  };

  const loadInterviews = async () => {
    setBusy('interviews', true);
    try {
      const data = await listInterviews();
      setInterviews(data);
      if (data.length && !exam) {
        setExam(String(data[0].id));
      }
    } catch (err: any) {
      setErrorMessage('Could not load sessions: ' + (err?.message || 'unknown error'));
    } finally {
      setBusy('interviews', false);
    }
  };

  const handleCreateSession = async () => {
    if (!form.name.trim()) {
      setErrorMessage('Please enter a candidate name.');
      return;
    }
    setBusy('create', true);
    setErrorMessage('');
    try {
      const targetTitle = `${exam || 'Target'} - ${form.role || 'General'}`;
      const res = await createInterview({ title: targetTitle });
      setStatusMessage(`Session "${res.interview.title}" initialized.`);
      await loadInterviews();
      setExam(String(res.interview.id));
      setStepIndex(2);
    } catch (err: any) {
      setErrorMessage('Failed to initialize session: ' + (err?.message || 'unknown error'));
    } finally {
      setBusy('create', false);
    }
  };

  const handleLoadQuestions = async () => {
    if (!exam) return;
    setBusy('questions', true);
    setErrorMessage('');
    try {
      const data = await fetchQuestions(exam);
      setQuestions(data);
      if (data.length) {
        setStatusMessage(`Loaded ${data.length} prompts for this session.`);
      } else {
        setStatusMessage('No pre-saved prompts found for this session.');
      }
    } catch (err: any) {
      setErrorMessage('Failed to load prompts: ' + (err?.message || 'unknown error'));
    } finally {
      setBusy('questions', false);
    }
  };

  const handleSaveResult = async () => {
    if (!exam) return;
    const scoreNum = Number(resultForm.score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setErrorMessage('Score must be a number between 0 and 100.');
      return;
    }
    setBusy('saveResult', true);
    setErrorMessage('');
    try {
      await saveResult({
        interviewId: exam,
        score: scoreNum,
        feedback: resultForm.feedback,
      });
      setStatusMessage('Performance evaluation successfully persisted.');
      setResultForm({ score: '', feedback: '' });
    } catch (err: any) {
      setErrorMessage('Failed to persist evaluation: ' + (err?.message || 'unknown error'));
    } finally {
      setBusy('saveResult', false);
    }
  };

  const activeInterview = interviews.find((i) => String(i.id) === exam);

  const stepperItems: StepItem[] = [
    {
      id: 'step-target',
      title: 'Target Exam',
      description: 'Select your examination focus',
      content: (
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)]">
            Choose a benchmark syllabus to calibrate your practice questions and AI tutor context:
          </p>
          <div className="overflow-x-auto pb-1">
            <GlideSelect
              options={EXAM_OPTIONS}
              value={exam || 'GATE CSE'}
              onChange={(val) => setExam(val)}
              size="md"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-mono text-[var(--accent)]">
              Active Focus: {exam || 'GATE CSE'}
            </span>
            <button
              type="button"
              onClick={() => setStepIndex(1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-strong)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
            >
              <span>Next: Candidate Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'step-profile',
      title: 'Session Profile',
      description: 'Configure target discipline & level',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Candidate Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Alex Chen"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Discipline / Role
              </label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                placeholder="e.g. Systems Engineer"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Target Difficulty
              </label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="Beginner">Beginner (Foundational)</option>
                <option value="Intermediate">Intermediate (Standard)</option>
                <option value="Advanced">Advanced (High-Rigor)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStepIndex(0)}
              className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCreateSession}
              disabled={loading.create || !form.name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-sm"
            >
              {loading.create ? 'Initializing...' : 'Initialize Session'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'step-launch',
      title: 'Ready for Drills',
      description: 'Active session ready to practice',
      content: (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                {activeInterview?.title || `${exam || 'Target'} - ${form.role}`}
              </div>
              <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                Session ID: {exam || 'Active'} · {activeInterview?.name || form.name || 'Candidate'}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--positive)]">
              <CheckCircle2 className="w-3 h-3" />
              <span>Ready</span>
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStepIndex(1)}
              className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Reconfigure
            </button>
            <StarBorder onClick={() => navigate('/practice')} className="cursor-pointer">
              <span className="flex items-center gap-1.5 font-semibold text-xs text-[var(--btn-primary-text)]">
                <span>Start Practice Drill</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </StarBorder>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* 1. HERO SECTION WITH HYPERSPEED (MD+ ONLY, RESPECTS REDUCED MOTION) */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10 md:p-12 transition-colors">
        {!prefersReducedMotion && (
          <div className="hidden md:block absolute inset-0 pointer-events-none opacity-30">
            <Suspense fallback={<div className="absolute inset-0 bg-transparent" />}>
              <LazyHyperspeed speed={0.8} streakCount={55} />
            </Suspense>
          </div>
        )}

        <div className="relative z-10 max-w-3xl space-y-6">
          {/* Target Exam Benchmark via GlideSelect */}
          <div className="space-y-1.5">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-[var(--accent)]">
              Target Examination Syllabus
            </span>
            <div className="overflow-x-auto pb-1">
              <GlideSelect
                options={EXAM_OPTIONS}
                value={exam || 'GATE CSE'}
                onChange={(val) => setExam(val)}
                size="sm"
              />
            </div>
          </div>

          {/* Headline with RotatingText */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.12]">
              Deliberate practice for{' '}
              <RotatingText
                texts={['Interviews.', 'Competitive Exams.', 'Core Concepts.', 'Placements.']}
                className="font-mono text-[var(--accent)]"
              />
            </h1>
          </div>

          {/* Tagline via TextType */}
          <div className="text-sm sm:text-base md:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            <TextType
              text={[
                'Study smarter with AI-driven diagnostics.',
                'Target high-stakes competitive examinations.',
                'Active recall drills with algorithmic precision.',
              ]}
              typingSpeed={40}
              pauseDuration={1800}
              className="font-medium text-[var(--text-primary)]"
            />
            <span className="block text-xs sm:text-sm text-[var(--text-muted)] mt-1.5 font-normal">
              High-contrast diagnostic clarity, automated question evaluation, and persistent session history for focused mastery.
            </span>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <StarBorder onClick={() => navigate('/practice')} className="cursor-pointer shadow-sm">
              <span className="flex items-center gap-2 font-medium text-xs sm:text-sm tracking-wide">
                <span>Start Practice</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </StarBorder>

            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[var(--accent)]" />
              <span>Ask AI Tutor</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/progress')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-transparent text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-[var(--positive)]" />
              <span>Review Progress</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. REAL METRIC & SYSTEM STATUS RIBBON */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-colors">
          <div className="flex items-center gap-2 text-[var(--accent)] mb-1">
            <Database className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Saved Sessions</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
            {interviews.length}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">Database interview records</div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-colors">
          <div className="flex items-center gap-2 text-[var(--positive)] mb-1">
            <Brain className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Active Syllabus</span>
          </div>
          <div className="text-xl font-bold truncate text-[var(--text-primary)]">
            {exam || 'GATE CSE'}
          </div>
          <div className="text-[11px] text-[var(--positive)] mt-0.5">Benchmarked discipline</div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-colors">
          <div className="flex items-center gap-2 text-[var(--accent)] mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Backend API</span>
          </div>
          <div className="text-sm font-semibold font-mono text-[var(--text-primary)] flex items-center gap-1.5 mt-1">
            <span
              className={`w-2 h-2 rounded-full ${
                apiStatus === 'ok' ? 'bg-[var(--positive)]' : apiStatus === 'error' ? 'bg-[var(--error)]' : 'bg-[var(--warning)]'
              }`}
            />
            <span>{apiStatus === 'ok' ? 'Connected' : apiStatus === 'error' ? 'Degraded' : 'Checking...'}</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">FastAPI gateway health</div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-colors">
          <div className="flex items-center gap-2 text-[var(--accent)] mb-1">
            <Database className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Database Store</span>
          </div>
          <div className="text-sm font-semibold font-mono text-[var(--text-primary)] flex items-center gap-1.5 mt-1">
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseStatus === 'ok' ? 'bg-[var(--positive)]' : supabaseStatus === 'error' ? 'bg-[var(--error)]' : 'bg-[var(--warning)]'
              }`}
            />
            <span>{supabaseStatus === 'ok' ? 'Connected' : supabaseStatus === 'error' ? 'Unavailable' : 'Checking...'}</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">Supabase storage sync</div>
        </div>
      </section>

      {/* 3. CORE STUDY PILLARS (PIXELCARD GRID) */}
      <section className="space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-[var(--accent)] mb-1">
            <Terminal className="w-3.5 h-3.5" />
            <span>Platform Capabilities</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Core Study Pillars
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CORE_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <PixelCard key={pillar.title} variant={pillar.variant} className="h-full">
                <div className="p-5 flex flex-col justify-between h-full space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-secondary)]">
                        {pillar.tag}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      {pillar.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              </PixelCard>
            );
          })}
        </div>
      </section>

      {/* 4. INTERACTIVE SESSION SETUP STEPPER */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 space-y-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-[var(--accent)] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Structured Drill Setup</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
            Configure New Practice Session
          </h2>
        </div>

        <Stepper
          steps={stepperItems}
          currentStep={stepIndex}
          onStepChange={setStepIndex}
        />

        {statusMessage && (
          <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--positive)]/40 text-xs text-[var(--positive)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--error)]/40 text-xs text-[var(--error)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </section>

      {/* 5. DATABASE RECENT SESSIONS & PERSISTENCE SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Recent Database Sessions */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Recent Saved Sessions
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Select a session to drive questions and evaluations
              </p>
            </div>
            <button
              type="button"
              onClick={loadInterviews}
              disabled={loading.interviews}
              className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Refresh sessions list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading.interviews ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {interviews.map((item) => {
              const isSelected = exam === String(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setExam(String(item.id))}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs cursor-pointer ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--surface-elevated)] ring-1 ring-[var(--accent)]/40'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--text-primary)] truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-secondary)]">
                      {item.name || 'Candidate'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
                    {new Date(item.created_at || '').toLocaleDateString()}{' '}
                    {new Date(item.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </button>
              );
            })}

            {!interviews.length && !loading.interviews && (
              <div className="text-xs text-[var(--text-muted)] py-6 text-center border border-dashed border-[var(--border)] rounded-lg">
                No recorded sessions yet. Use the setup stepper above to create one.
              </div>
            )}
          </div>
        </div>

        {/* Persist Evaluation Score Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Persist Performance Evaluation
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Log score and commentary to database for active session
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Score (0 - 100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={resultForm.score}
                onChange={(e) => setResultForm((p) => ({ ...p, score: e.target.value }))}
                placeholder="85"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Evaluation Notes
              </label>
              <textarea
                value={resultForm.feedback}
                onChange={(e) => setResultForm((p) => ({ ...p, feedback: e.target.value }))}
                rows={3}
                placeholder="Strong analytical formulation; focus on edge-case complexity."
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveResult}
              disabled={loading.saveResult || !exam}
              className="w-full py-2 px-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading.saveResult ? 'Saving...' : 'Save Evaluation to Database'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
