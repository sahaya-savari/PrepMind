import { supabase } from './lib/supabase';

export type AIMessage = { role: 'user' | 'assistant'; content: string };
export type ChatMessage = AIMessage;
export type Interview = { id: string | number; title: string; created_at?: string | null; name?: string | null };
export type QuestionRow = { id: string; interview_id: string; question: string; created_at?: string | null };
export type ResultRow = { id: string; interview_id: string; score: number | null; feedback: string; created_at?: string | null };
export type ProgressInsights = {
  accuracy: number;
  totalExams: number;
  weakTopic: string;
  mostStudied: string;
  trend: { topic: string; accuracy: number; at: string }[];
};

const IS_PROD = import.meta.env.PROD;
const RAW_API_BASE = import.meta.env.VITE_API_BASE;
const API_BASE = (RAW_API_BASE || 'http://localhost:5000').replace(/\/$/, '');
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';
const REQUEST_TIMEOUT_MS = 15000;
const RETRY_COUNT = 1;

const authHeaders = API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};

const ensureEnv = () => {
  if (!API_BASE) throw new Error('API base URL is not configured');
  if (!API_TOKEN) {
    const msg = '[PrepMind] Missing VITE_API_TOKEN; requests will fail with 401.';
    if (IS_PROD) throw new Error(msg);
    console.warn(msg);
  }
  if (IS_PROD && !RAW_API_BASE) throw new Error('VITE_API_BASE is required in production');
};

ensureEnv();

const withTimeout = async <T>(task: () => Promise<T>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await task();
  } finally {
    clearTimeout(timeout);
  }
};

const shouldRetry = (status?: number) => {
  if (!status) return true;
  if (status === 401 || status === 429) return false;
  return status >= 500;
};

async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit & { expectJson?: boolean } = {}) {
  let attempt = 0;
  let lastError: any;
  while (attempt <= RETRY_COUNT) {
    try {
      const res = await withTimeout(async () => await fetch(input, { ...init, signal: init.signal }));
      if (!res.ok) {
        const text = await res.text();
        const status = res.status;
        const message = (text && text.slice(0, 300)) || `Request failed (${status})`;
        const err = new Error(message) as any;
        err.status = status;
        throw err;
      }

      if (init.expectJson) {
        return res.json();
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (err?.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      if (!shouldRetry(err?.status) || attempt === RETRY_COUNT) {
        throw err;
      }
      attempt += 1;
    }
  }
  throw lastError;
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetchWithRetry(`${API_BASE}${path}`, { headers: { ...authHeaders }, expectJson: true });
  return res as T;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithRetry(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
    expectJson: true,
  });

  return res as T;
}

export async function fetchHealth(): Promise<{ status: string; supabaseUrl?: string; hasServiceKey?: boolean }> {
  try {
    return await getJSON('/api/health');
  } catch (e) {
    return { status: 'degraded' } as any;
  }
}

export async function listInterviews(): Promise<Interview[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('interviews').select('id, title, created_at, name').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[PrepMind] listInterviews fallback', err);
    return [];
  }
}

export async function createInterview(payload: { title: string }): Promise<{ interview: Interview }> {
  if (!payload || typeof payload.title !== 'string' || !payload.title.trim()) throw new Error('Title is required');
  if (!supabase) throw new Error('Supabase not configured');
  try {
    const { data, error } = await supabase.from('interviews').insert({ title: payload.title.trim() }).select('id, title, created_at, name').single();
    if (error) throw error;
    return { interview: data as Interview };
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to create interview');
  }
}

export async function fetchQuestions(interviewId: string): Promise<QuestionRow[]> {
  if (typeof interviewId !== 'string' || !interviewId.trim()) throw new Error('Interview id is required');
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('id, interview_id, question, created_at')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[PrepMind] fetchQuestions fallback', err);
    return [];
  }
}

export async function saveResult(payload: { interviewId: string; score: number | null; feedback: string }): Promise<ResultRow> {
  if (!payload || typeof payload.interviewId !== 'string' || !payload.interviewId.trim()) throw new Error('Interview id is required');
  if (payload.score !== null && !Number.isFinite(payload.score)) throw new Error('Score must be a number or null');
  if (payload.feedback && typeof payload.feedback !== 'string') throw new Error('Feedback must be a string');
  if (!supabase) throw new Error('Supabase not configured');
  try {
    const { data, error } = await supabase
      .from('results')
      .insert({ interview_id: payload.interviewId, score: payload.score, feedback: payload.feedback })
      .select('id, interview_id, score, feedback, created_at')
      .single();
    if (error) throw error;
    return data as ResultRow;
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to save result');
  }
}

export async function askStream(question: string, sessionId: string, onToken: (chunk: string) => void): Promise<string> {
  if (!question.trim()) throw new Error('Question is required');
  if (!API_TOKEN) throw new Error('Missing API token');

  const res = await postJSON<{ response?: string }>(
    '/api/ask',
    { message: question, sessionId }
  );

  const text = res.response || '';
  if (!text) throw new Error('Empty response');
  onToken(text);
  return text;
}

export async function aiAPI(messages: AIMessage[]): Promise<string> {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!API_TOKEN) throw new Error('Missing API token');

  const prompt = lastUser?.content || '';
  const res = await postJSON<{ response?: string }>('/api/ask', { message: prompt });
  if (!res?.response) throw new Error('Empty response');
  return res.response;
}
