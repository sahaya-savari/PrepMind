import { useEffect, useState } from 'react';
import { useExam } from '../context/ExamContext';
import { Check, X, ArrowRight, RotateCcw, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  fetchQuestions,
  listInterviews,
  generateQuestions,
  evaluateAnswers,
  type Interview,
  type QuestionRow,
} from '../api';
import { getFallbackQuestions } from '../data/fallbackQuestions';
import { useAuth } from '../hooks/useAuth';

const POPULAR_TOPICS = [
  'Loops & Arrays',
  'Data Structures',
  'System Design',
  'SQL & Indexing',
  'JavaScript Async',
  'Algorithms & Trees',
];

function Practice() {
  const { updateProgress } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const { exam, setExam } = useExam();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mcqTopic, setMcqTopic] = useState('Loops & Arrays');
  const [mcqDifficulty, setMcqDifficulty] = useState('Intermediate');
  const [mcqLoading, setMcqLoading] = useState(false);
  const [mcqError, setMcqError] = useState('');
  const [mcqQuestion, setMcqQuestion] = useState<{
    question: string;
    options: string[];
    correct_answer?: string;
    explanation?: string;
    is_offline_fallback?: boolean;
  } | null>(null);
  const [mcqChoice, setMcqChoice] = useState('');
  const [mcqResult, setMcqResult] = useState<{
    score?: number;
    correct?: string;
    explanation?: string;
  } | null>(null);
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
      if (!exam && data.length) setExam(String(data[0].id));
    } catch (e: any) {
      setError(e.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    if (!exam) {
      setError('Select an interview target first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchQuestions(exam);
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

  const handleGenerateMcq = async () => {
    if (!mcqTopic.trim()) {
      setMcqError('Topic is required');
      return;
    }
    setMcqLoading(true);
    setMcqError('');
    setMcqResult(null);
    setMcqChoice('');

    try {
      const data = await generateQuestions(mcqTopic.trim(), mcqDifficulty);
      const question =
        Array.isArray(data?.questions) && data.questions[0] ? data.questions[0] : null;
      if (!question || !Array.isArray(question.options) || question.options.length < 2) {
        throw new Error('AI returned an incomplete question format');
      }

      setMcqQuestion({
        question: question.question || mcqTopic,
        options: question.options.slice(0, 4).filter(Boolean),
        correct_answer: question.correct_answer || question.answer || question.options[0],
        explanation: question.explanation || 'No explanation provided.',
        is_offline_fallback: false,
      });
    } catch (e: any) {
      const fallback = getFallbackQuestions(mcqTopic.trim(), mcqDifficulty);
      setMcqQuestion(fallback);
      setMcqError(`AI engine offline or rate limited. Loaded verified practice drill.`);
    } finally {
      setMcqLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!mcqQuestion || !mcqChoice) {
      setMcqError('Please select an option first');
      return;
    }
    setMcqLoading(true);
    setMcqError('');

    try {
      const expectedAnswer = mcqQuestion.correct_answer || '';
      const isCorrect = expectedAnswer
        ? mcqChoice.trim().toLowerCase() === expectedAnswer.trim().toLowerCase()
        : true;
      let score = isCorrect ? 100 : 0;
      let explanation = mcqQuestion.explanation || 'Review the correct choice above.';

      try {
        const payload = [
          {
            answer: mcqChoice,
            correct_answer: expectedAnswer,
            explanation: mcqQuestion.explanation,
          },
        ];
        const data = await evaluateAnswers(payload);
        if (typeof data?.score === 'number') {
          score = data.score;
        }
        if (Array.isArray(data?.explanations) && data.explanations.length) {
          explanation = data.explanations[0];
        }
      } catch {
        // Local evaluation fallback succeeded
      }

      setMcqResult({
        score,
        correct: expectedAnswer || mcqChoice,
        explanation,
      });

      mark(score > 0);

      const next = [
        { topic: mcqTopic.trim(), score, at: new Date().toISOString() },
        ...attempts,
      ].slice(0, 10);
      setAttempts(next);
      localStorage.setItem('mcq_attempts', JSON.stringify(next));
    } catch (e: any) {
      setMcqError(e?.message || 'Failed to evaluate answer');
    } finally {
      setMcqLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="space-y-2 border-b border-midnight-border pb-5">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-midnight-accentSoft border border-midnight-accent/30 text-midnight-accent">
          <BookOpen size={12} />
          <span>Interactive Practice Module</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-ink-primary">
          Exam Practice & MCQs
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary max-w-2xl">
          Strengthen concept retention through adaptive multiple-choice drills with immediate step-by-step reasoning.
        </p>
      </header>

      {/* Main MCQ Practice Card */}
      <div className="rounded-xl border border-midnight-border bg-midnight-surface p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-midnight-border pb-4">
          <div>
            <h2 className="text-lg font-bold font-display text-ink-primary">
              Adaptive Practice Drill
            </h2>
            <p className="text-xs text-ink-secondary">
              Select or type a topic to generate an evaluated question.
            </p>
          </div>
          {mcqLoading && <LoadingSpinner label="Processing" />}
        </div>

        {/* Quick Topic Chips */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Recommended Topics
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_TOPICS.map((topic) => {
              const isSelected = mcqTopic === topic;
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setMcqTopic(topic)}
                  disabled={mcqLoading}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent ${
                    isSelected
                      ? 'border-midnight-accent bg-midnight-accentSoft text-midnight-accent font-semibold'
                      : 'border-midnight-border bg-midnight-subtle text-ink-secondary hover:border-midnight-accent/40 hover:text-ink-primary'
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </div>

        {/* Topic Input & Difficulty Controls */}
        <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-secondary">Topic or Subject</label>
            <input
              value={mcqTopic}
              onChange={(e) => setMcqTopic(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-midnight-border bg-midnight-subtle text-ink-primary placeholder:text-ink-muted focus:border-midnight-accent focus:outline-none focus:ring-1 focus:ring-midnight-accent text-sm"
              placeholder="e.g. Dynamic Programming, SQL Indexing"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-secondary">Difficulty Level</label>
            <select
              value={mcqDifficulty}
              onChange={(e) => setMcqDifficulty(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-midnight-border bg-midnight-subtle text-ink-primary focus:border-midnight-accent focus:outline-none focus:ring-1 focus:ring-midnight-accent text-sm"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateMcq}
            disabled={mcqLoading}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold bg-midnight-accent text-[#0B0D12] hover:bg-midnight-accentHover transition-colors disabled:opacity-50 min-h-[40px]"
          >
            <Sparkles size={14} />
            <span>Generate Question</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMcqQuestion(null);
              setMcqResult(null);
              setMcqChoice('');
              setMcqError('');
            }}
            disabled={mcqLoading}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-xs font-medium border border-midnight-border bg-midnight-subtle text-ink-secondary hover:text-ink-primary hover:bg-midnight-elevated transition-colors min-h-[40px]"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>

        {/* Notices */}
        {mcqError && (
          <div className="text-xs p-3 rounded-lg bg-midnight-warning/10 border border-midnight-warning/30 text-midnight-warning flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{mcqError}</span>
          </div>
        )}

        {/* Empty Question Prompt */}
        {!mcqLoading && !mcqQuestion && !mcqError && (
          <div className="text-xs text-ink-muted p-6 rounded-xl border border-dashed border-midnight-border text-center">
            Click <strong>Generate Question</strong> to load an adaptive multiple-choice question.
          </div>
        )}

        {/* Rendered Question & Choices */}
        {mcqQuestion && (
          <div className="space-y-4 p-5 rounded-xl border border-midnight-border bg-midnight-elevated">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm sm:text-base font-semibold text-ink-primary leading-relaxed">
                {mcqQuestion.question}
              </h3>
              {mcqQuestion.is_offline_fallback && (
                <span className="shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-midnight-warning/15 text-midnight-warning border border-midnight-warning/30">
                  Verified Drill
                </span>
              )}
            </div>

            {/* Answer Choices (A, B, C, D) */}
            <div className="space-y-2.5 pt-1">
              {mcqQuestion.options.map((opt, idx) => {
                const letter = ['A', 'B', 'C', 'D'][idx] || String(idx + 1);
                const isSelected = mcqChoice === opt;
                const isEvaluated = !!mcqResult;
                const isCorrect =
                  isEvaluated &&
                  (opt === mcqResult.correct ||
                    (mcqQuestion.correct_answer && opt === mcqQuestion.correct_answer));
                const isWrongSelection = isEvaluated && isSelected && !isCorrect;

                let optionStyles =
                  'border-midnight-border bg-midnight-surface hover:border-midnight-accent/40 text-ink-primary';
                let badgeStyles = 'bg-midnight-subtle text-ink-secondary border-midnight-border';

                if (isEvaluated) {
                  if (isCorrect) {
                    optionStyles =
                      'border-midnight-positive bg-midnight-positive/10 text-ink-primary ring-1 ring-midnight-positive/40';
                    badgeStyles =
                      'bg-midnight-positive text-[#0B0D12] font-bold border-midnight-positive';
                  } else if (isWrongSelection) {
                    optionStyles =
                      'border-midnight-error bg-midnight-error/10 text-ink-primary ring-1 ring-midnight-error/40';
                    badgeStyles =
                      'bg-midnight-error text-white font-bold border-midnight-error';
                  } else {
                    optionStyles =
                      'border-midnight-border/50 bg-midnight-surface/50 text-ink-muted opacity-60';
                    badgeStyles = 'bg-midnight-subtle text-ink-muted border-midnight-border/50';
                  }
                } else if (isSelected) {
                  optionStyles =
                    'border-midnight-accent bg-midnight-accentSoft text-ink-primary ring-1 ring-midnight-accent';
                  badgeStyles =
                    'bg-midnight-accent text-[#0B0D12] font-bold border-midnight-accent';
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => !isEvaluated && setMcqChoice(opt)}
                    disabled={mcqLoading || isEvaluated}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-start gap-3 outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent ${optionStyles}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-semibold shrink-0 border ${badgeStyles}`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1 text-xs sm:text-sm leading-relaxed">{opt}</span>
                    {isEvaluated && isCorrect && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-midnight-positive bg-midnight-positive/15 px-2 py-0.5 rounded border border-midnight-positive/30 shrink-0">
                        <Check size={12} />
                        <span>Correct</span>
                      </span>
                    )}
                    {isEvaluated && isWrongSelection && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-midnight-error bg-midnight-error/15 px-2 py-0.5 rounded border border-midnight-error/30 shrink-0">
                        <X size={12} />
                        <span>Your Choice</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Evaluation Actions & Result Callout */}
            {!mcqResult ? (
              <button
                type="button"
                onClick={handleEvaluate}
                disabled={mcqLoading || !mcqChoice}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold bg-midnight-accent text-[#0B0D12] hover:bg-midnight-accentHover transition-colors disabled:opacity-50"
              >
                <span>Evaluate Answer</span>
              </button>
            ) : (
              <div
                className={`rounded-lg border p-4 space-y-2.5 text-xs sm:text-sm ${
                  mcqResult.score && mcqResult.score > 0
                    ? 'border-midnight-positive/40 bg-midnight-positive/10 text-ink-primary'
                    : 'border-midnight-error/40 bg-midnight-error/10 text-ink-primary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      mcqResult.score && mcqResult.score > 0
                        ? 'bg-midnight-positive/20 text-midnight-positive border border-midnight-positive/40'
                        : 'bg-midnight-error/20 text-midnight-error border border-midnight-error/40'
                    }`}
                  >
                    {mcqResult.score && mcqResult.score > 0
                      ? '✓ Answer Verified (+100%)'
                      : '✕ Incorrect Selection (0%)'}
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateMcq}
                    disabled={mcqLoading}
                    className="inline-flex items-center gap-1 text-xs text-midnight-accent hover:underline font-bold"
                  >
                    <span>Next Question</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <div className="text-xs text-ink-secondary pt-2 border-t border-midnight-border leading-relaxed">
                  <strong className="text-ink-primary">Explanation: </strong>
                  {mcqResult.explanation}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Attempts History Card */}
      <div className="rounded-xl border border-midnight-border bg-midnight-surface p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-midnight-border pb-3">
          <div>
            <h3 className="text-base font-bold font-display text-ink-primary">
              Recent Practice History
            </h3>
            <p className="text-xs text-ink-secondary">
              Logged performance across practice attempts
            </p>
          </div>
          {attempts.length > 0 && (
            <span className="text-xs text-midnight-accent font-semibold font-mono">
              {attempts.length} attempts
            </span>
          )}
        </div>

        {attempts.length === 0 ? (
          <div className="text-xs text-ink-muted py-6 text-center">
            No practice attempts recorded yet. Answer a question above to log performance.
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {attempts.map((a, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-midnight-border bg-midnight-subtle flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-ink-primary truncate">{a.topic}</div>
                  <div className="text-[10px] text-ink-muted">
                    {new Date(a.at).toLocaleDateString()}{' '}
                    {new Date(a.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded font-mono shrink-0 ${
                    a.score > 0
                      ? 'bg-midnight-positive/15 text-midnight-positive border border-midnight-positive/30'
                      : 'bg-midnight-error/15 text-midnight-error border border-midnight-error/30'
                  }`}
                >
                  {a.score}%
                </span>
              </div>
            ))}
          </div>
        )}

        {attempts.length > 0 && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('mcq_attempts');
                setAttempts([]);
              }}
              className="text-xs text-ink-muted hover:text-midnight-error transition-colors"
            >
              Clear attempt history
            </button>
          </div>
        )}
      </div>

      {/* Preserved Supabase Interview Prompts */}
      <div className="rounded-xl border border-midnight-border bg-midnight-surface p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-midnight-border pb-3">
          <div>
            <h3 className="text-base font-bold font-display text-ink-primary">
              Seeded Prompts & Interview Questions
            </h3>
            <p className="text-xs text-ink-secondary">
              Review and practice prompts stored in your database session.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadQuestions}
              disabled={loading || !exam}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-midnight-subtle border border-midnight-border text-ink-primary hover:border-midnight-accent/40 transition-colors"
            >
              {loading ? 'Loading…' : 'Load Questions'}
            </button>
            <button
              type="button"
              onClick={loadInterviews}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-midnight-subtle border border-midnight-border text-ink-secondary hover:text-ink-primary transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink-secondary">Active Interview</label>
          <select
            className="w-full px-3 py-2 text-sm rounded-lg border border-midnight-border bg-midnight-subtle text-ink-primary focus:border-midnight-accent focus:outline-none"
            value={exam}
            onChange={(e) => setExam(e.target.value)}
          >
            {interviews.map((i) => (
              <option key={i.id} value={i.id}>
                {i.role}
              </option>
            ))}
            {!interviews.length && <option value="">No sessions available</option>}
          </select>
          {error && <div className="text-xs text-midnight-error">{error}</div>}
        </div>

        {questions.length > 0 && (
          <ol className="space-y-2.5 pt-2">
            {questions.map((q, idx) => (
              <li
                key={q.id}
                className="p-3.5 rounded-lg border border-midnight-border bg-midnight-subtle text-xs text-ink-primary space-y-2"
              >
                <div className="font-medium leading-relaxed">
                  {idx + 1}. {q.question}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => mark(true)}
                    className="px-2.5 py-1 rounded bg-midnight-positive/10 border border-midnight-positive/25 text-midnight-positive hover:bg-midnight-positive/20 text-[11px] font-semibold"
                  >
                    Mark Correct
                  </button>
                  <button
                    type="button"
                    onClick={() => mark(false)}
                    className="px-2.5 py-1 rounded bg-midnight-error/10 border border-midnight-error/25 text-midnight-error hover:bg-midnight-error/20 text-[11px] font-semibold"
                  >
                    Mark Incorrect
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export default Practice;
