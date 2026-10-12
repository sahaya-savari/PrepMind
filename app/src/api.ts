import { supabase } from './lib/supabase';
import {
  getLocalInterviews,
  createLocalInterview,
  getLocalQuestions,
  saveLocalResult,
  getLocalResults,
  getLocalProgressInsights,
} from './lib/localDb';

export type AIMessage = { role: 'user' | 'assistant' | 'system'; content: string };
export type ChatMessage = AIMessage;
export type Interview = { id: string | number; title?: string; role?: string; created_at?: string | null; name?: string | null };
export type QuestionRow = { id: string; interview_id: string; question: string; created_at?: string | null };
export type ResultRow = { id: string; interview_id: string; score: number | null; feedback: string; created_at?: string | null };
export type ProgressInsights = {
  accuracy: number;
  totalExams: number;
  weakTopic: string;
  mostStudied: string;
  trend: { topic: string; accuracy: number; at: string }[];
};

export type McqQuestionItem = {
  question: string;
  options: string[];
  correct_answer?: string;
  answer?: string;
  explanation?: string;
  is_offline_fallback?: boolean;
};

// --- URL RESOLUTION & FETCH HELPERS ---
function resolveApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const customBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE;

  if (customBase && typeof customBase === 'string' && customBase.trim()) {
    const isBrowser = typeof window !== 'undefined';
    const isLocalhost = customBase.includes('localhost') || customBase.includes('127.0.0.1');
    const isProductionHost = isBrowser && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

    // In production browsers, do not redirect requests to localhost
    if (!isProductionHost || !isLocalhost) {
      return `${customBase.replace(/\/$/, '')}${cleanPath}`;
    }
  }

  return cleanPath;
}

// Unified request timeout (Phase 1 target: 10–15s).
const REQUEST_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 400;
const MAX_ATTEMPTS = 2; // 1 retry on transient failures

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

function messageForStatus(status: number, fallback: string): string {
  if (status === 401) return 'Unauthorized (401) — check your API token.';
  if (status === 429) return 'Too many requests (429) — please slow down and try again.';
  if (status === 500) return 'Server error (500) — the AI service failed to respond.';
  return fallback;
}

async function readErrorMessage(res: Response): Promise<string> {
  const errText = await res.text().catch(() => '');
  let errMsg = `Request failed (${res.status})`;
  try {
    const parsed = JSON.parse(errText);
    if (parsed?.error) errMsg = typeof parsed.error === 'string' ? parsed.error : parsed.error.message || errMsg;
  } catch {
    if (errText) errMsg = errText;
  }
  return messageForStatus(res.status, errMsg);
}

export interface RequestOptions extends RequestInit {
  retry?: boolean | number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestJSON<T>(
  method: 'GET' | 'POST',
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = resolveApiUrl(path);
  const token = import.meta.env.VITE_API_TOKEN;

  const customHeaders: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        customHeaders[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        customHeaders[key] = value;
      });
    } else {
      Object.assign(customHeaders, options.headers);
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  };
  if (method === 'POST' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const callerSignal = options.signal;
  const isIdempotent = method === 'GET';
  const maxAttempts =
    typeof options.retry === 'number'
      ? Math.max(1, options.retry)
      : typeof options.retry === 'boolean'
      ? (options.retry ? MAX_ATTEMPTS : 1)
      : (isIdempotent ? MAX_ATTEMPTS : 1);

  const requestBody =
    body === undefined
      ? undefined
      : typeof body === 'string'
      ? body
      : JSON.stringify(body);

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (callerSignal?.aborted) {
      throw callerSignal.reason ?? new DOMException('This operation was aborted', 'AbortError');
    }

    const controller = new AbortController();
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort(new DOMException('Request timed out', 'TimeoutError'));
    }, REQUEST_TIMEOUT_MS);

    let onCallerAbort: (() => void) | undefined;
    if (callerSignal) {
      onCallerAbort = () => {
        controller.abort(callerSignal.reason);
      };
      callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }

    try {
      const res = await fetch(url, {
        ...options,
        method,
        headers,
        ...(method === 'POST' && requestBody !== undefined ? { body: requestBody } : {}),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errMsg = await readErrorMessage(res);
        const retryable = res.status === 429 || res.status >= 500;
        if (retryable && attempt < maxAttempts) {
          lastError = new HttpError(errMsg, res.status);
          clearTimeout(timeoutId);
          if (callerSignal && onCallerAbort) {
            callerSignal.removeEventListener('abort', onCallerAbort);
          }
          await delay(RETRY_DELAY_MS);
          continue;
        }
        throw new HttpError(errMsg, res.status);
      }

      return (await res.json()) as T;
    } catch (err) {
      const finalErr =
        timedOut && !(err instanceof HttpError)
          ? (err instanceof Error && err.name === 'TimeoutError'
              ? err
              : new DOMException('Request timed out', 'TimeoutError'))
          : err;

      lastError = finalErr;

      // Never retry HTTP errors we already decided on, user-initiated aborts, or timeouts.
      if (finalErr instanceof HttpError || callerSignal?.aborted || timedOut) {
        throw finalErr;
      }

      if (attempt < maxAttempts) {
        clearTimeout(timeoutId);
        if (callerSignal && onCallerAbort) {
          callerSignal.removeEventListener('abort', onCallerAbort);
        }
        await delay(RETRY_DELAY_MS);
        continue;
      }
      throw finalErr;
    } finally {
      clearTimeout(timeoutId);
      if (callerSignal && onCallerAbort) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

export function getJSON<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestJSON<T>('GET', path, undefined, options);
}

export function postJSON<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
  return requestJSON<T>('POST', path, body, options);
}

export async function safeJsonFetch(url: string, options: RequestOptions = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (method === 'POST') {
    let body = options.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { /* keep raw */ }
    }
    return postJSON(url, body, options);
  }
  return getJSON(url, options);
}

// --- HEALTH & STATUS ---
export async function fetchHealth(): Promise<{ status: string; provider?: string }> {
  try {
    return await getJSON('/api/ai');
  } catch {
    return { status: 'degraded' };
  }
}


// --- DATABASE HANDLERS (SUPABASE WITH RESILIENT LOCAL FALLBACK) ---
export async function listInterviews(): Promise<Interview[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select('id, title, role, created_at')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((i: any) => ({ ...i, role: i.role || i.title }));
      }
    } catch (err) {
      console.warn('[PrepMind] listInterviews remote fallback to local DB', err);
    }
  }
  return getLocalInterviews();
}

export async function createInterview(payload: { title: string; role?: string }): Promise<{ interview: Interview }> {
  if (!payload || typeof payload.title !== 'string' || !payload.title.trim()) throw new Error('Title is required');
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .insert({ title: payload.title.trim(), role: (payload.role || payload.title).trim() })
        .select('id, title, role, created_at')
        .single();
      if (!error && data) {
        return { interview: { ...data, role: data.role || data.title } as Interview };
      }
    } catch (err: any) {
      console.warn('[PrepMind] createInterview remote failed, persisting locally', err);
    }
  }
  const local = createLocalInterview(payload.title.trim(), payload.role);
  return { interview: local };
}

export async function fetchQuestions(interviewId: string | number): Promise<QuestionRow[]> {
  const idStr = String(interviewId || '').trim();
  if (!idStr) throw new Error('Interview id is required');
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('id, interview_id, question, created_at')
        .eq('interview_id', idStr)
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data as QuestionRow[];
      }
    } catch (err) {
      console.warn('[PrepMind] fetchQuestions remote fallback to local DB', err);
    }
  }
  return getLocalQuestions(idStr);
}

export async function saveResult(payload: { interviewId: string | number; score: number | null; feedback: string }): Promise<ResultRow> {
  const idStr = String(payload?.interviewId || '').trim();
  if (!idStr) throw new Error('Interview id is required');
  if (payload.score !== null && !Number.isFinite(payload.score)) throw new Error('Score must be a number or null');
  if (payload.feedback && typeof payload.feedback !== 'string') throw new Error('Feedback must be a string');

  // Always mirror to local DB so offline metrics and instant feedback work
  const localRow = saveLocalResult(idStr, payload.score, payload.feedback);

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('results')
        .insert({ interview_id: idStr, score: payload.score, feedback: payload.feedback })
        .select('id, interview_id, score, feedback, created_at')
        .single();
      if (!error && data) {
        return data as ResultRow;
      }
    } catch (err: any) {
      console.warn('[PrepMind] saveResult remote failed, stored in local database', err);
    }
  }
  return localRow;
}

export { getLocalResults, getLocalProgressInsights };

// --- USER PROFILES & PRACTICE HISTORY (SUPABASE CLOUD SYNC) ---
export interface CloudProfile {
  id: string;
  selected_exam?: string | null;
  exam_history?: string[];
  completed_topics?: string[];
  practice_stats?: { total: number; correct: number; sessions?: number };
  chat_history?: any[];
  created_at?: string;
  updated_at?: string;
}

export interface PracticeHistoryRow {
  id: string;
  user_id: string;
  topic?: string;
  score?: number;
  created_at?: string;
}

export async function fetchUserProfile(userId: string): Promise<CloudProfile | null> {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, selected_exam, exam_history, completed_topics, practice_stats, chat_history')
      .eq('id', userId)
      .single();
    if (!error && data) return data as CloudProfile;
  } catch (err) {
    console.warn('[PrepMind] fetchUserProfile remote error:', err);
  }
  return null;
}

export async function syncUserProfile(profile: Partial<CloudProfile> & { id: string }): Promise<boolean> {
  if (!supabase || !profile.id) return false;
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: profile.id,
        selected_exam: profile.selected_exam || null,
        exam_history: profile.exam_history || [],
        completed_topics: profile.completed_topics || [],
        practice_stats: profile.practice_stats || { total: 0, correct: 0, sessions: 0 },
        chat_history: profile.chat_history || [],
        updated_at: new Date().toISOString(),
      });
    return !error;
  } catch (err) {
    console.warn('[PrepMind] syncUserProfile remote error:', err);
    return false;
  }
}

export async function recordPracticeHistory(payload: {
  userId: string;
  topic: string;
  score: number;
}): Promise<PracticeHistoryRow | null> {
  if (!payload.userId) return null;
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('practice_history')
        .insert({
          user_id: payload.userId,
          topic: payload.topic,
          score: payload.score,
        })
        .select('*')
        .single();
      if (!error && data) return data as PracticeHistoryRow;
    } catch (err) {
      console.warn('[PrepMind] recordPracticeHistory remote error:', err);
    }
  }
  return null;
}

export async function fetchPracticeHistory(userId: string): Promise<PracticeHistoryRow[]> {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('practice_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) return data as PracticeHistoryRow[];
  } catch (err) {
    console.warn('[PrepMind] fetchPracticeHistory remote error:', err);
  }
  return [];
}

// --- AI OPERATIONS ---
export async function askStream(
  question: string,
  _sessionId: string,
  onToken: (chunk: string) => void
): Promise<string> {
  if (!question.trim()) throw new Error('Question is required');

  const res = await postJSON<{ response?: string; choices?: { message?: { content?: string } }[] }>(
    '/api/ai',
    {
      action: 'chat',
      messages: [{ role: 'user', content: question.trim() }],
    }
  );

  const text = res.response || res.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Empty response from AI service');
  onToken(text);
  return text;
}

export async function aiAPI(messages: AIMessage[]): Promise<string> {
  if (!messages.length) throw new Error('Messages required');

  const res = await postJSON<{ response?: string; choices?: { message?: { content?: string } }[] }>(
    '/api/ai',
    { action: 'chat', messages }
  );

  const text = res.response || res.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Empty response from AI service');
  return text;
}

export async function generateQuestions(
  topic: string,
  difficulty: string,
  passages?: any[]
): Promise<{ questions: McqQuestionItem[] }> {
  if (!topic || !difficulty) throw new Error('Topic and difficulty are required');

  return await postJSON<{ questions: McqQuestionItem[] }>(
    '/api/ai',
    {
      action: 'generate_mcq',
      topic: topic.trim(),
      difficulty: difficulty.trim(),
      ...(Array.isArray(passages) && passages.length > 0 ? { passages, useRag: true } : {}),
    }
  );
}

export async function evaluateAnswers(
  answers: { answer: string; correct_answer?: string; explanation?: string }[]
): Promise<{ score: number; explanations: string[] }> {
  if (!answers.length) throw new Error('Answers required');

  return await postJSON<{ score: number; explanations: string[] }>(
    '/api/ai',
    { action: 'evaluate', answers }
  );
}
