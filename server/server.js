import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const API_TOKEN = process.env.API_TOKEN || '';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!API_TOKEN) {
  console.warn('[PrepMind] Missing API_TOKEN; protected routes will reject requests.');
}

const isSupabaseMissing = !SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL === 'your_supabase_url' || SUPABASE_KEY === 'your_anon_key' || SUPABASE_URL === 'placeholder' || SUPABASE_KEY === 'placeholder';
if (isSupabaseMissing) {
  console.warn('[PrepMind] Supabase disabled, running in fallback mode');
}

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));

const recentCalls = new Map();
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;
app.use((req, res, next) => {
  if (req.path === '/api/health') return next();
  const ip = req.ip || req.headers['x-forwarded-for'] || 'anon';
  const now = Date.now();
  const bucket = recentCalls.get(ip) || [];
  const fresh = bucket.filter((t) => now - t < WINDOW_MS);
  fresh.push(now);
  recentCalls.set(ip, fresh);
  if (fresh.length > RATE_LIMIT) return res.status(429).json({ error: 'Too many requests, slow down' });
  next();
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.slice('Bearer '.length);
  if (token !== API_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

const ensureBodyObject = (req, res, next) => {
  if (req.method === 'POST' && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  next();
};

const withTimeout = async (task, timeoutMs = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(id);
  }
};

const supabaseHealth = async () => {
  if (isSupabaseMissing || !supabase) return { ok: false, degraded: true, error: 'supabase disabled' };
  try {
    const { error } = await supabase.from('health').select('*').limit(1);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'unknown supabase error' };
  }
};

app.get('/api/health', async (_req, res) => {
  const supa = await supabaseHealth();
  if (supa.degraded) {
    res.json({ status: 'degraded', supabase: supa, timestamp: new Date().toISOString(), uptime: process.uptime() });
  } else {
    res.json({ status: 'ok', supabase: supa, timestamp: new Date().toISOString(), uptime: process.uptime() });
  }
});

app.post('/api/ask', ensureBodyObject, authMiddleware, async (req, res) => {
  const message = (req.body?.message || '').toString().trim();
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    const data = await withTimeout(async () => ({ response: `Echo: ${message}` }));
    return res.json(data);
  } catch (err) {
    if (err?.name === 'AbortError') return res.status(504).json({ response: 'Request timed out' });
    return res.status(500).json({ response: 'Service temporarily unavailable' });
  }
});

const generateAIResponse = async (prompt) => {
  const safeEcho = prompt || 'No prompt provided';
  if (!GEMINI_API_KEY) return safeEcho;
  try {
    const text = await withTimeout(async () => {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      if (!r.ok) throw new Error(`Gemini error ${r.status}`);
      const data = await r.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || safeEcho;
    });
    return text || safeEcho;
  } catch (_err) {
    return safeEcho;
  }
};

app.post('/api/generate', ensureBodyObject, authMiddleware, async (req, res) => {
  const topic = (req.body?.topic || '').toString().trim();
  const difficulty = (req.body?.difficulty || '').toString().trim();
  if (!topic || !difficulty) return res.status(400).json({ error: 'Missing topic or difficulty' });

  const fallback = {
    questions: [
      {
        question: `Fallback ${topic} question (${difficulty})`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 'Option A',
        explanation: 'Fallback response used.',
      },
    ],
  };

  const cleanJson = (text) => {
    if (!text) return null;
    const trimmed = text.trim();
    const withoutTicks = trimmed.replace(/```json\s*|```/g, '').trim();
    const firstBrace = withoutTicks.indexOf('{');
    const lastBrace = withoutTicks.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
    return withoutTicks.slice(firstBrace, lastBrace + 1);
  };

  const parseQuestions = (raw) => {
    try {
      const cleaned = cleanJson(raw);
      const parsed = cleaned ? JSON.parse(cleaned) : JSON.parse(raw);
      if (parsed && Array.isArray(parsed.questions)) return parsed;
    } catch (_) {
      return null;
    }
    return null;
  };

  const prompt = [
    'You are an exam MCQ generator. Output only JSON. No markdown, no prose.',
    'Format strictly as: {"questions":[{"question":"...","options":["A","B","C","D"],"answer":"...","explanation":"..."}]}.',
    `Topic: ${topic}. Difficulty: ${difficulty}. Provide exactly one question.`,
  ].join('\n');

  if (!GEMINI_API_KEY) {
    return res.json(fallback);
  }

  try {
    const response = await withTimeout(async () => {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      if (!r.ok) throw new Error(`Gemini error ${r.status}`);
      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseQuestions(text);
      if (parsed) return parsed;
      throw new Error('Invalid AI JSON');
    });

    return res.json(response || fallback);
  } catch (_err) {
    return res.json(fallback);
  }
});

app.post('/api/evaluate', ensureBodyObject, authMiddleware, async (req, res) => {
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : null;
  if (!answers || !answers.length) return res.status(400).json({ error: 'Answers array required' });

  try {
    const scored = answers.map((a) => {
      const expected = (a?.correct_answer || a?.expected || a?.answer || '').toString();
      const user = (a?.answer || '').toString();
      const correct = expected && user && expected === user;
      return {
        correct,
        explanation: a?.explanation || 'Review the correct option and reasoning.',
      };
    });

    const total = scored.length;
    const correctCount = scored.filter((s) => s.correct).length;
    const score = total ? Math.round((correctCount / total) * 100) : 0;
    const explanations = scored.map((s) => s.explanation || '');

    res.json({ score, explanations });
  } catch (_err) {
    res.status(500).json({ score: 0, explanations: ['Evaluation failed'] });
  }
});

app.post('/api/store', ensureBodyObject, authMiddleware, async (req, res) => {
  try {
    const content = (req.body?.content || '').toString();
    if (!content.trim()) return res.status(400).json({ error: 'Content required' });

    const { data, error } = supabase
      ? await supabase.from('notes').insert([{ content }]).select().single()
      : { data: null, error: new Error('Supabase unavailable') };

    if (error) throw error;
    return res.json({ note: data });
  } catch (_err) {
    return res.json({
      note: { content: req.body?.content, created_at: new Date().toISOString() },
      warning: 'Supabase failed → fallback used',
    });
  }
});

app.post('/api/query-context', ensureBodyObject, authMiddleware, async (req, res) => {
  try {
    const message = (req.body?.message || '').toString().trim();
    if (!message) return res.status(400).json({ response: 'Message required' });

    let context = '';
    try {
      if (supabase) {
        const { data } = await supabase
          .from('notes')
          .select('content')
          .order('created_at', { ascending: false })
          .limit(5);
        context = data?.map((n) => n.content).filter(Boolean).join('\n---\n') || '';
      }
    } catch (_err) {
      context = '';
    }

    const prompt = context
      ? `Answer ONLY using this context:\n${context}\n\nQuestion: ${message}`
      : message;

    const aiText = await generateAIResponse(prompt);

    return res.json({ response: aiText, usedContext: Boolean(context) });
  } catch (_err) {
    return res.json({ response: 'Something went wrong' });
  }
});

app.use((err, _req, res, _next) => {
  console.error('[PrepMind] Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[PrepMind] API running on http://localhost:${PORT}`);
});
