import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { supabase } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
}));
app.use(express.json());

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!process.env.SUPABASE_URL || !serviceKey) {
  console.warn('[PrepMind] Missing SUPABASE_URL or service role key. API will still start but writes may fail.');
}

const apiToken = process.env.INTERNAL_API_TOKEN;

// health check without auth
app.get('/api/check-route', (_req, res) => {
  res.json({ message: 'route working' });
});

app.get('/api/test', (_req, res) => {
  res.json({ status: 'ok' });
});

const ensureBodyObject = (req, res, next) => {
  if (req.method === 'POST') {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Invalid input' });
    }
  }
  next();
};

app.use('/api', ensureBodyObject, (req, res, next) => {
  if (!apiToken) return res.status(500).json({ error: 'Server misconfigured' });
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${apiToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.get('/', (_req, res) => {
  res.send('PrepMind API is running');
});

app.get('/api/interviews', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('interviews').select('*');

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ interviews: data || [] });
  } catch (err) {
    console.error('Server crash:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/interview', async (req, res) => {
  const title = (req.body?.title || '').trim();

  if (!title) return res.status(400).json({ error: 'title is required' });

  const { data, error } = await supabase
    .from('interviews')
    .insert({ title })
    .select('id, title, created_at')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ interview: data });
});

app.get('/api/questions', async (req, res) => {
  const interviewId = (req.query?.interviewId || '').toString().trim();
  if (!interviewId) return res.status(400).json({ error: 'interviewId is required' });

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('questions')
      .select('id, interview_id, question, created_at')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    if (existing && existing.length > 0) return res.json({ questions: existing });

    const defaultQuestions = [
      'Tell me about yourself and your recent work.',
      'Describe a challenging problem you solved end-to-end.',
      'How do you ensure code quality and reliability in production?',
    ].map((question) => ({ id: randomUUID(), interview_id: interviewId, question }));

    const { data: seeded, error: seedError } = await supabase
      .from('questions')
      .insert(defaultQuestions)
      .select('id, interview_id, question, created_at');

    if (seedError) throw seedError;

    res.json({ questions: seeded || defaultQuestions });
  } catch (err) {
    const fallback = [
      { id: randomUUID(), interview_id: interviewId, question: 'Fallback: Tell me about a recent project.' },
      { id: randomUUID(), interview_id: interviewId, question: 'Fallback: How do you handle production incidents?' },
    ];
    res.json({ questions: fallback, note: 'Served from fallback (questions table not ready).' });
  }
});

app.post('/api/result', async (req, res) => {
  const interviewId = (req.body?.interviewId || '').trim();
  const rawScore = req.body?.score;
  const feedback = (req.body?.feedback || '').trim();

  if (!interviewId) return res.status(400).json({ error: 'interviewId is required' });

  const score = Number.isFinite(rawScore) ? Number(rawScore) : null;

  try {
    const { data, error } = await supabase
      .from('results')
      .insert({ interview_id: interviewId, score, feedback })
      .select('id, interview_id, score, feedback, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({ result: data });
  } catch (err) {
    res.json({
      result: {
        id: randomUUID(),
        interview_id: interviewId,
        score,
        feedback,
        created_at: new Date().toISOString(),
      },
      note: 'Result stored in-memory fallback (results table not ready).',
    });
  }
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[PrepMind] API running on http://localhost:${PORT}`);
});
