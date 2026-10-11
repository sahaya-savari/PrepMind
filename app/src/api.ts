import { supabase } from './lib/supabase';

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

export async function getJSON<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = resolveApiUrl(path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const token = import.meta.env.VITE_API_TOKEN;
    const res = await fetch(url, {
      ...options,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      signal: options.signal || controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errMsg = `Request failed (${res.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed?.error) errMsg = typeof parsed.error === 'string' ? parsed.error : parsed.error.message || errMsg;
      } catch {
        if (errText) errMsg = errText;
      }
      throw new Error(errMsg);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function postJSON<T>(path: string, body: unknown, options: RequestInit = {}): Promise<T> {
  const url = resolveApiUrl(path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const token = import.meta.env.VITE_API_TOKEN;
    const res = await fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      body: JSON.stringify(body),
      signal: options.signal || controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errMsg = `Request failed (${res.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed?.error) errMsg = typeof parsed.error === 'string' ? parsed.error : parsed.error.message || errMsg;
      } catch {
        if (errText) errMsg = errText;
      }
      throw new Error(errMsg);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function safeJsonFetch(url: string, options: RequestInit = {}) {
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

// --- SUPABASE DATA HANDLERS ---
export async function listInterviews(): Promise<Interview[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('interviews')
      .select('id, title, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((i: any) => ({ ...i, role: i.title }));
  } catch (err) {
    console.warn('[PrepMind] listInterviews fallback', err);
    return [];
  }
}

export async function createInterview(payload: { title: string }): Promise<{ interview: Interview }> {
  if (!payload || typeof payload.title !== 'string' || !payload.title.trim()) throw new Error('Title is required');
  if (!supabase) throw new Error('Supabase not configured');
  try {
    const { data, error } = await supabase
      .from('interviews')
      .insert({ title: payload.title.trim() })
      .select('id, title, created_at')
      .single();
    if (error) throw error;
    return { interview: { ...data, role: data.title } as Interview };
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to create interview');
  }
}

export async function fetchQuestions(interviewId: string | number): Promise<QuestionRow[]> {
  const idStr = String(interviewId || '').trim();
  if (!idStr) throw new Error('Interview id is required');
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('id, interview_id, question, created_at')
      .eq('interview_id', idStr)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as QuestionRow[];
  } catch (err) {
    console.warn('[PrepMind] fetchQuestions fallback', err);
    return [];
  }
}

export async function saveResult(payload: { interviewId: string | number; score: number | null; feedback: string }): Promise<ResultRow> {
  const idStr = String(payload?.interviewId || '').trim();
  if (!idStr) throw new Error('Interview id is required');
  if (payload.score !== null && !Number.isFinite(payload.score)) throw new Error('Score must be a number or null');
  if (payload.feedback && typeof payload.feedback !== 'string') throw new Error('Feedback must be a string');
  if (!supabase) throw new Error('Supabase not configured');
  try {
    const { data, error } = await supabase
      .from('results')
      .insert({ interview_id: idStr, score: payload.score, feedback: payload.feedback })
      .select('id, interview_id, score, feedback, created_at')
      .single();
    if (error) throw error;
    return data as ResultRow;
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to save result');
  }
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
  difficulty: string
): Promise<{ questions: McqQuestionItem[] }> {
  if (!topic || !difficulty) throw new Error('Topic and difficulty are required');

  return await postJSON<{ questions: McqQuestionItem[] }>(
    '/api/ai',
    {
      action: 'generate_mcq',
      topic: topic.trim(),
      difficulty: difficulty.trim(),
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
