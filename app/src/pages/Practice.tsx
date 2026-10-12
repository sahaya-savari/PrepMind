import React, { useEffect, useState } from 'react';
import { useExam } from '../context/ExamContext';
import { useAuth } from '../hooks/useAuth';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  AlertCircle,
  HelpCircle,
  Layers,
  Database,
  RefreshCw,
} from 'lucide-react';
import { GlideSelect, GlideOption } from '../components/reactbits/GlideSelect';
import { LatticeLoader } from '../components/reactbits/LatticeLoader';
import { ThoughtLine } from '../components/reactbits/ThoughtLine';
import { CodeBlock } from '../components/shared/CodeBlock';
import {
  fetchQuestions,
  listInterviews,
  generateQuestions,
  evaluateAnswers,
  saveResult,
  type Interview,
  type QuestionRow,
} from '../api';
import { getFallbackQuestions } from '../data/fallbackQuestions';

const POPULAR_TOPICS = [
  'Loops & Arrays',
  'Data Structures',
  'System Design',
  'SQL & Indexing',
  'JavaScript Async',
  'Algorithms & Trees',
];

const DIFFICULTY_OPTIONS: GlideOption<string>[] = [
  { value: 'Beginner', label: 'Beginner', badge: 'Basic' },
  { value: 'Intermediate', label: 'Intermediate', badge: 'Standard' },
  { value: 'Advanced', label: 'Advanced', badge: 'Rigor' },
];

function Practice() {
  const { updateProgress } = useAuth();
  const { exam, setExam } = useExam();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptError, setPromptError] = useState('');

  const [mcqTopic, setMcqTopic] = useState('Loops & Arrays');
  const [mcqDifficulty, setMcqDifficulty] = useState('Intermediate');
  const [mcqLoading, setMcqLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
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
    } catch {
      return [];
    }
  });

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    setLoadingPrompts(true);
    setPromptError('');
    try {
      const data = await listInterviews();
      setInterviews(data);
      if (!exam && data.length) setExam(String(data[0].id));
    } catch (e: any) {
      setPromptError(e.message || 'Failed to load interviews');
    } finally {
      setLoadingPrompts(false);
    }
  };

  const loadQuestions = async () => {
    if (!exam) {
      setPromptError('Select an interview target first');
      return;
    }
    setLoadingPrompts(true);
    setPromptError('');
    try {
      const data = await fetchQuestions(exam);
      setQuestions(data);
    } catch (e: any) {
      setPromptError(e.message || 'Failed to fetch questions');
    } finally {
      setLoadingPrompts(false);
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
    } catch {
      const fallback = getFallbackQuestions(mcqTopic.trim(), mcqDifficulty);
      setMcqQuestion(fallback);
      setMcqError('AI engine rate-limited or offline. Loaded verified curriculum scenario.');
    } finally {
      setMcqLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!mcqQuestion || !mcqChoice) {
      setMcqError('Please select an answer choice first');
      return;
    }
    setIsEvaluating(true);
    setMcqError('');

    try {
      const expectedAnswer = mcqQuestion.correct_answer || '';
      const isCorrect = expectedAnswer
        ? mcqChoice.trim().toLowerCase() === expectedAnswer.trim().toLowerCase()
        : true;
      let score = isCorrect ? 100 : 0;
      let explanation = mcqQuestion.explanation || 'Review the correct selection above.';

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
        // Local evaluation fallback
      }

      setMcqResult({
        score,
        correct: expectedAnswer || mcqChoice,
        explanation,
      });

      mark(score > 0);

      // Persist attempt to database (Supabase Cloud + Local Database mirror)
      try {
        saveResult({
          interviewId: exam || '1',
          score,
          feedback: `Drill on ${mcqTopic.trim()} (${mcqDifficulty}): ${isCorrect ? 'Correct (+100%)' : 'Incorrect (0%)'}. ${explanation}`,
        }).catch((err) => {
          console.warn('[PrepMind] saveResult background error:', err);
        });
      } catch {
        // Safe catch
      }

      const next = [
        { topic: mcqTopic.trim(), score, at: new Date().toISOString() },
        ...attempts,
      ].slice(0, 10);
      setAttempts(next);
      localStorage.setItem('mcq_attempts', JSON.stringify(next));
    } catch (err: any) {
      setMcqError('Evaluation failed: ' + (err?.message || 'unknown error'));
    } finally {
      setIsEvaluating(false);
    }
  };

  // Helper to extract code fences from question text if present
  const parseQuestionText = (text: string) => {
    const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/;
    const match = text.match(codeBlockRegex);
    if (match) {
      const beforeCode = text.slice(0, match.index).trim();
      const lang = match[1] || 'typescript';
      const code = match[2];
      const afterCode = text.slice((match.index || 0) + match[0].length).trim();
      return { beforeCode, lang, code, afterCode };
    }
    return { beforeCode: text, lang: '', code: '', afterCode: '' };
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. TOP HEADER & DIFFICULTY SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Technical Practice Drills
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Calibrated multiple-choice drills with automated validation and deep solution breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--text-muted)] mr-1">Rigor:</span>
          <GlideSelect
            options={DIFFICULTY_OPTIONS}
            value={mcqDifficulty}
            onChange={(val) => setMcqDifficulty(val)}
            size="sm"
          />
        </div>
      </div>

      {/* 2. TOPIC QUICK SELECTOR RIBBON */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0">Topics:</span>
        {POPULAR_TOPICS.map((topic) => {
          const isActive = mcqTopic === topic;
          return (
            <button
              key={topic}
              type="button"
              onClick={() => {
                setMcqTopic(topic);
                setMcqResult(null);
                setMcqChoice('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap border transition-colors cursor-pointer ${
                isActive
                  ? 'border-[var(--accent)] bg-[var(--surface-elevated)] text-[var(--accent)] font-semibold'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {topic}
            </button>
          );
        })}
      </div>

      {/* 3. MAIN PRACTICE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Active Question Drill Card (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {mcqLoading ? (
            <div className="p-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] min-h-[380px] flex items-center justify-center">
              <LatticeLoader
                size={3}
                label={`Generating calibrated ${mcqDifficulty.toLowerCase()} technical scenario for ${mcqTopic}...`}
              />
            </div>
          ) : !mcqQuestion ? (
            <div className="p-8 sm:p-12 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-center flex flex-col items-center">
              <img
                src="/assets/illustrations/empty-practice.svg"
                alt="No Technical Drills Available"
                className="w-48 sm:w-56 h-auto mb-4"
              />
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                Ready for Practice Drills
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-5">
                Generate a targeted scenario for <strong className="text-[var(--accent)] font-mono">{mcqTopic}</strong> at <strong className="text-[var(--text-primary)]">{mcqDifficulty}</strong> level.
              </p>
              <button
                type="button"
                onClick={handleGenerateMcq}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Synthesize Practice Drill</span>
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 space-y-6">
              {/* Question Meta Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[var(--accent)] font-semibold">{mcqTopic}</span>
                  <span aria-hidden="true" className="text-[var(--border-strong)]">·</span>
                  <span className="text-[var(--text-secondary)]">{mcqDifficulty}</span>
                  {mcqQuestion.is_offline_fallback && (
                    <>
                      <span aria-hidden="true" className="text-[var(--border-strong)]">·</span>
                      <span className="text-[10px] text-[var(--warning)]">Offline Verified Drill</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGenerateMcq}
                  disabled={mcqLoading}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Generate a new question"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>New Drill</span>
                </button>
              </div>

              {/* Question Prompt Body */}
              <div className="space-y-3">
                {(() => {
                  const parsed = parseQuestionText(mcqQuestion.question);
                  return (
                    <>
                      {parsed.beforeCode && (
                        <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                          {parsed.beforeCode}
                        </p>
                      )}
                      {parsed.code && (
                        <CodeBlock
                          code={parsed.code}
                          language={parsed.lang || 'typescript'}
                        />
                      )}
                      {parsed.afterCode && (
                        <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                          {parsed.afterCode}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-2.5 pt-2">
                {mcqQuestion.options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = mcqChoice === opt;
                  const isCorrectAnswer =
                    mcqResult &&
                    opt.trim().toLowerCase() === (mcqQuestion.correct_answer || '').trim().toLowerCase();
                  const isWrongSelected =
                    mcqResult && isSelected && !isCorrectAnswer;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!!mcqResult || isEvaluating}
                      onClick={() => setMcqChoice(opt)}
                      className={`w-full text-left p-3.5 rounded-lg border text-xs transition-all flex items-start gap-3 cursor-pointer disabled:cursor-default ${
                        isCorrectAnswer
                          ? 'border-[var(--positive)] bg-[var(--surface-elevated)] ring-1 ring-[var(--positive)]/40 font-medium'
                          : isWrongSelected
                          ? 'border-[var(--error)] bg-[var(--surface-elevated)] ring-1 ring-[var(--error)]/40 font-medium'
                          : isSelected
                          ? 'border-[var(--accent)] bg-[var(--surface-elevated)] ring-1 ring-[var(--accent)]/40 font-medium'
                          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded font-mono text-[11px] font-bold shrink-0 mt-0.5 ${
                          isCorrectAnswer
                            ? 'bg-[var(--positive)]/20 text-[var(--positive)]'
                            : isWrongSelected
                            ? 'bg-[var(--error)]/20 text-[var(--error)]'
                            : isSelected
                            ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                            : 'bg-[var(--surface-elevated)] text-[var(--text-muted)]'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="flex-1 text-[var(--text-primary)] leading-relaxed">
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Evaluation and Next Controls */}
              <div className="pt-2">
                {isEvaluating && (
                  <ThoughtLine
                    working={true}
                    label="Analyzing submission against invariant proofs..."
                    steps={[
                      'Tokenizing solution option',
                      'Cross-referencing algorithmic proof',
                      'Formulating diagnostic explanation',
                    ]}
                  />
                )}

                {!mcqResult && !isEvaluating && (
                  <button
                    type="button"
                    onClick={handleEvaluate}
                    disabled={!mcqChoice}
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-sm min-h-[40px]"
                  >
                    Validate Solution
                  </button>
                )}

                {mcqResult && (
                  <div
                    className={`rounded-lg border p-4 space-y-3 text-xs ${
                      mcqResult.score && mcqResult.score > 0
                        ? 'border-[var(--positive)]/40 bg-[var(--surface-elevated)]'
                        : 'border-[var(--error)]/40 bg-[var(--surface-elevated)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold font-mono ${
                          mcqResult.score && mcqResult.score > 0
                            ? 'bg-[var(--positive)]/15 text-[var(--positive)] border border-[var(--positive)]/30'
                            : 'bg-[var(--error)]/15 text-[var(--error)] border border-[var(--error)]/30'
                        }`}
                      >
                        {mcqResult.score && mcqResult.score > 0 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Answer Verified (+100%)</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Incorrect Selection (0%)</span>
                          </>
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={handleGenerateMcq}
                        disabled={mcqLoading}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                      >
                        <span>Next Scenario</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border)] leading-relaxed">
                      <strong className="text-[var(--text-primary)]">Explanation: </strong>
                      {mcqResult.explanation}
                    </div>
                  </div>
                )}
              </div>

              {mcqError && (
                <div className="p-3 rounded-lg border border-[var(--error)]/40 bg-[var(--surface-elevated)] text-xs text-[var(--error)] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{mcqError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Recent Attempts History (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Recent Drill Logs
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Performance across attempts
                </p>
              </div>
              {attempts.length > 0 && (
                <span className="text-xs font-mono font-semibold text-[var(--accent)]">
                  {attempts.length} attempts
                </span>
              )}
            </div>

            {attempts.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] py-6 text-center border border-dashed border-[var(--border)] rounded-lg">
                No drill attempts recorded yet. Answer a question to log performance.
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {attempts.map((a, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--text-primary)] truncate">
                        {a.topic}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                        {new Date(a.at).toLocaleDateString()}{' '}
                        {new Date(a.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded font-mono shrink-0 ${
                        a.score > 0
                          ? 'bg-[var(--positive)]/15 text-[var(--positive)] border border-[var(--positive)]/30'
                          : 'bg-[var(--error)]/15 text-[var(--error)] border border-[var(--error)]/30'
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
                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors cursor-pointer"
                >
                  Clear drill logs
                </button>
              </div>
            )}
          </div>

          {/* Database Seeded Prompts Card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Session Prompts
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Database interview prompts
                </p>
              </div>
              <button
                type="button"
                onClick={loadQuestions}
                disabled={loadingPrompts || !exam}
                className="px-2.5 py-1 rounded text-xs font-mono border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50"
              >
                {loadingPrompts ? 'Loading...' : 'Load'}
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Active Interview Session
              </label>
              <select
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                value={exam}
                onChange={(e) => setExam(e.target.value)}
              >
                {interviews.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.role || i.title || `Session #${i.id}`}
                  </option>
                ))}
                {!interviews.length && <option value="">No sessions available</option>}
              </select>
              {promptError && <div className="text-xs text-[var(--error)]">{promptError}</div>}
            </div>

            {questions.length > 0 && (
              <ol className="space-y-2 pt-2 max-h-[220px] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <li
                    key={q.id}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-xs space-y-2"
                  >
                    <div className="font-medium text-[var(--text-primary)] leading-relaxed">
                      {idx + 1}. {q.question}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => mark(true)}
                        className="px-2 py-0.5 rounded bg-[var(--positive)]/10 border border-[var(--positive)]/30 text-[var(--positive)] text-[10px] font-bold cursor-pointer"
                      >
                        Pass (+1)
                      </button>
                      <button
                        type="button"
                        onClick={() => mark(false)}
                        className="px-2 py-0.5 rounded bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-[10px] font-bold cursor-pointer"
                      >
                        Fail (-1)
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Practice;
