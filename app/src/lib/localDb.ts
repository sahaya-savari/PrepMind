import { type Interview, type QuestionRow, type ResultRow, type ProgressInsights } from '../api';

const DB_INTERVIEWS_KEY = 'prepmind_db_interviews';
const DB_QUESTIONS_KEY = 'prepmind_db_questions';
const DB_RESULTS_KEY = 'prepmind_db_results';

// Initial Seed Data aligned with supabase_schema.sql and curriculum benchmarks
const SEED_INTERVIEWS: Interview[] = [
  { id: '1', title: 'AI Technical Drill', role: 'Full Stack Engineer', created_at: new Date('2026-03-01').toISOString() },
  { id: '2', title: 'GATE Computer Science & IT', role: 'Algorithms & Systems', created_at: new Date('2026-03-05').toISOString() },
  { id: '3', title: 'Distributed Systems & Architecture', role: 'System Design Lead', created_at: new Date('2026-03-10').toISOString() },
  { id: '4', title: 'Python & Machine Learning Foundations', role: 'AI / Data Engineer', created_at: new Date('2026-03-15').toISOString() },
];

const SEED_QUESTIONS: Record<string, QuestionRow[]> = {
  '1': [
    { id: 'q1-1', interview_id: '1', question: 'Explain how Node.js event loop handles Microtasks vs Macrotasks.', created_at: new Date('2026-03-01').toISOString() },
    { id: 'q1-2', interview_id: '1', question: 'How do React 18 concurrent transitions prevent long render UI deadlocks?', created_at: new Date('2026-03-01').toISOString() },
    { id: 'q1-3', interview_id: '1', question: 'What are the trade-offs between B-Tree and Hash indexing in PostgreSQL?', created_at: new Date('2026-03-01').toISOString() },
  ],
  '2': [
    { id: 'q2-1', interview_id: '2', question: 'What is the tight asymptotic bound of Dijkstra\'s algorithm using a Fibonacci heap?', created_at: new Date('2026-03-05').toISOString() },
    { id: 'q2-2', interview_id: '2', question: 'In relational database theory, define the conditions required for Boyce-Codd Normal Form (BCNF).', created_at: new Date('2026-03-05').toISOString() },
    { id: 'q2-3', interview_id: '2', question: 'Explain how TLB hit ratio impacts effective memory access time (EMAT) in virtual memory.', created_at: new Date('2026-03-05').toISOString() },
  ],
  '3': [
    { id: 'q3-1', interview_id: '3', question: 'How does Raft consensus elect a leader in the presence of split votes?', created_at: new Date('2026-03-10').toISOString() },
    { id: 'q3-2', interview_id: '3', question: 'Explain the difference between Strong Consistency and Eventual Consistency in distributed stores.', created_at: new Date('2026-03-10').toISOString() },
    { id: 'q3-3', interview_id: '3', question: 'How do distributed token buckets prevent burst attacks without Redis bottlenecking?', created_at: new Date('2026-03-10').toISOString() },
  ],
  '4': [
    { id: 'q4-1', interview_id: '4', question: 'What is the primary difference between L1 (Lasso) and L2 (Ridge) regularization?', created_at: new Date('2026-03-15').toISOString() },
    { id: 'q4-2', interview_id: '4', question: 'How does Scaled Dot-Product Attention compute context weights in Transformers?', created_at: new Date('2026-03-15').toISOString() },
    { id: 'q4-3', interview_id: '4', question: 'Explain the vanishing gradient problem in deep networks and how Residual connections mitigate it.', created_at: new Date('2026-03-15').toISOString() },
  ],
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Storage quota or privacy restriction safeguard
  }
}

export function initLocalDatabase(): void {
  if (typeof window === 'undefined') return;
  const existingInterviews = localStorage.getItem(DB_INTERVIEWS_KEY);
  if (!existingInterviews) {
    safeSet(DB_INTERVIEWS_KEY, SEED_INTERVIEWS);
  }
  const existingQuestions = localStorage.getItem(DB_QUESTIONS_KEY);
  if (!existingQuestions) {
    safeSet(DB_QUESTIONS_KEY, SEED_QUESTIONS);
  }
}

export function getLocalInterviews(): Interview[] {
  initLocalDatabase();
  return safeGet<Interview[]>(DB_INTERVIEWS_KEY, SEED_INTERVIEWS);
}

export function createLocalInterview(title: string, role?: string): Interview {
  const current = getLocalInterviews();
  const nextId = String(Date.now());
  const newInterview: Interview = {
    id: nextId,
    title,
    role: role || title,
    created_at: new Date().toISOString(),
  };
  safeSet(DB_INTERVIEWS_KEY, [newInterview, ...current]);
  return newInterview;
}

export function getLocalQuestions(interviewId: string | number): QuestionRow[] {
  initLocalDatabase();
  const questionsMap = safeGet<Record<string, QuestionRow[]>>(DB_QUESTIONS_KEY, SEED_QUESTIONS);
  const idStr = String(interviewId || '').trim();
  if (questionsMap[idStr] && questionsMap[idStr].length > 0) {
    return questionsMap[idStr];
  }
  // Fallback to first available category if specific id not mapped
  return questionsMap['1'] || [];
}

export function saveLocalResult(
  interviewId: string | number,
  score: number | null,
  feedback: string,
  userId?: string
): ResultRow {
  const idStr = String(interviewId || '1');
  const current = safeGet<ResultRow[]>(DB_RESULTS_KEY, []);
  const newRow: ResultRow = {
    id: 'res_' + Date.now(),
    interview_id: idStr,
    score,
    feedback: feedback || '',
    user_id: userId || null,
    created_at: new Date().toISOString(),
  };
  const updated = [newRow, ...current].slice(0, 50);
  safeSet(DB_RESULTS_KEY, updated);
  return newRow;
}

export function getLocalResults(limit = 20, userId?: string): (ResultRow & { role?: string })[] {
  let results = safeGet<ResultRow[]>(DB_RESULTS_KEY, []);
  if (userId) {
    results = results.filter((r) => !r.user_id || r.user_id === userId);
  }
  const interviews = getLocalInterviews();
  const interviewMap = new Map(interviews.map((i) => [String(i.id), i.role || i.title || 'Technical Drill']));

  return results.slice(0, limit).map((r) => ({
    ...r,
    role: interviewMap.get(String(r.interview_id)) || 'Drill Session',
  }));
}

export function getLocalProgressInsights(userId?: string): ProgressInsights {
  const results = getLocalResults(20, userId);
  if (!results.length) {
    // Check if there are attempts stored in mcq_attempts
    const attempts = safeGet<{ topic: string; score: number; at: string }[]>('mcq_attempts', []);
    if (!attempts.length) {
      return { accuracy: 0, totalExams: 0, weakTopic: 'None', mostStudied: 'None', trend: [] };
    }
    const validScores = attempts.map((a) => a.score).filter((s) => Number.isFinite(s));
    const accuracy = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
    const topicCounts: Record<string, number> = {};
    attempts.forEach((a) => { topicCounts[a.topic] = (topicCounts[a.topic] || 0) + 1; });
    const mostStudied = Object.keys(topicCounts).sort((a, b) => topicCounts[b] - topicCounts[a])[0] || 'None';

    return {
      accuracy,
      totalExams: attempts.length,
      weakTopic: accuracy < 70 ? mostStudied : 'None',
      mostStudied,
      trend: attempts.slice(0, 10).map((a) => ({ topic: a.topic, accuracy: a.score, at: a.at })),
    };
  }

  const validScores = results.map((r) => r.score ?? 0).filter((s) => Number.isFinite(s));
  const accuracy = validScores.length ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
  const topicCounts: Record<string, number> = {};
  results.forEach((r) => {
    const topic = r.role || 'General';
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  });
  const mostStudied = Object.keys(topicCounts).sort((a, b) => topicCounts[b] - topicCounts[a])[0] || 'None';

  return {
    accuracy,
    totalExams: results.length,
    weakTopic: accuracy < 70 ? mostStudied : 'None',
    mostStudied,
    trend: results.slice(0, 10).map((r) => ({
      topic: r.role || 'Drill Session',
      accuracy: r.score ?? 0,
      at: r.created_at || new Date().toISOString(),
    })),
  };
}
