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

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:5000').replace(/\/$/, '');

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as any));
    throw new Error(err?.error || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({} as any));
    const msg = err?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

export async function fetchHealth(): Promise<{ status: string; supabaseUrl?: string; hasServiceKey?: boolean }> {
  return await getJSON('/api/test');
}

export async function listInterviews(): Promise<Interview[]> {
  const data = await getJSON<{ interviews: Interview[] }>('/api/interviews');
  return data.interviews || [];
}

export async function createInterview(payload: { title: string }): Promise<{ interview: Interview }> {
  if (!payload || typeof payload.title !== 'string' || !payload.title.trim()) throw new Error('Title is required');
  return await postJSON('/api/interview', payload);
}

export async function fetchQuestions(interviewId: string): Promise<QuestionRow[]> {
  if (typeof interviewId !== 'string' || !interviewId.trim()) throw new Error('Interview id is required');
  const data = await getJSON<{ questions: QuestionRow[] }>(`/api/questions?interviewId=${encodeURIComponent(interviewId)}`);
  return data.questions || [];
}

export async function saveResult(payload: { interviewId: string; score: number | null; feedback: string }): Promise<ResultRow> {
  if (!payload || typeof payload.interviewId !== 'string' || !payload.interviewId.trim()) throw new Error('Interview id is required');
  if (payload.score !== null && !Number.isFinite(payload.score)) throw new Error('Score must be a number or null');
  if (payload.feedback && typeof payload.feedback !== 'string') throw new Error('Feedback must be a string');
  const data = await postJSON<{ result: ResultRow }>('/api/result', payload);
  return data.result;
}

function streamLocal(text: string, onToken: (chunk: string) => void): Promise<string> {
  return new Promise((resolve) => {
    const parts = text.split(' ');
    parts.forEach((word, idx) => {
      setTimeout(() => {
        const chunk = idx === 0 ? word : ` ${word}`;
        onToken(chunk);
        if (idx === parts.length - 1) resolve(text);
      }, idx * 20);
    });
  });
}

export async function askStream(question: string, sessionId: string, onToken: (chunk: string) => void): Promise<string> {
  if (!question.trim()) throw new Error('Question is required');
  const health = await fetchHealth().catch(() => ({ status: 'offline' } as any));
  const reply = `API ${health.status}. Session ${sessionId}. Prompt: ${question}`;
  return streamLocal(reply, onToken);
}

export async function aiAPI(messages: AIMessage[]): Promise<string> {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const health = await fetchHealth().catch(() => ({ status: 'offline' } as any));
  return `PrepMind (${health.status}) • ${lastUser?.content || 'No prompt provided.'}`;
}
