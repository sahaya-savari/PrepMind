import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const API_TOKEN = process.env.API_TOKEN || '';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!API_TOKEN) {
  console.warn('[PrepMind] Missing API_TOKEN; protected routes will reject requests.');
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[PrepMind] Missing Supabase credentials; health checks will degrade and DB calls are skipped.');
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
  if (!SUPABASE_URL || !SUPABASE_KEY || !supabase) return { ok: false, error: 'supabase disabled' };
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
  res.json({ status: 'ok', supabase: supa, timestamp: new Date().toISOString(), uptime: process.uptime() });
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

app.post('/api/generate', ensureBodyObject, authMiddleware, async (req, res) => {
  const topic = (req.body?.topic || '').toString().trim();
  const difficulty = (req.body?.difficulty || '').toString().trim();
  if (!topic || !difficulty) return res.status(400).json({ error: 'Missing topic or difficulty' });

  try {
    const question = {
      question: `Basic ${topic} question (${difficulty})`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 'Option A',
      explanation: 'This is a sample explanation',
    };
    return res.json({ questions: [question] });
  } catch (_err) {
    return res.status(500).json({
      questions: [
        {
          question: 'Fallback question',
          options: ['A', 'B', 'C', 'D'],
          answer: 'A',
          explanation: 'Server error handled',
        },
      ],
    });
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

app.use((err, _req, res, _next) => {
  console.error('[PrepMind] Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[PrepMind] API running on http://localhost:${PORT}`);
});
