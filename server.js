import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import ragService from './server/services/ragService.js';
import memoryService from './server/services/memoryService.js';
import examService from './server/services/examService.js';

dotenv.config();

console.log("==== ENV CHECK START ====");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_KEY:", process.env.SUPABASE_KEY);
console.log("==== ENV CHECK END ====");
console.log("USING KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20));

const app = express();
const PORT = process.env.PORT || 4000;
const MODEL = 'models/gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const DEBUG_LOG = process.env.NODE_ENV !== 'production';
const GEMINI_TIMEOUT_MS = 7500; // 6-8s range
const FALLBACK_DELAY_MS = 2500; // trigger Ollama prep after short delay
const OLLAMA_MAX_TOKENS = 600;
const CACHE_MAX_ENTRIES = 5; // keep cache light
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

if (!GEMINI_API_KEY) {
  console.warn('[server] Warning: GEMINI_API_KEY is not set. API routes will fail until provided.');
}

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => {
  if (DEBUG_LOG) console.log('Incoming request:', req.method, req.url, req.body);
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const pdfIndex = new Map(); // id -> { sourceId, pages, chars, title }
const linkIndex = new Map(); // id -> { sourceId, title, chars }
const INDEX_MAX = 200;

// simple personal rate limit: 20 req/min
const calls = [];
function rateLimit(req, res, next) {
  const now = Date.now();
  while (calls.length && now - calls[0] > 60_000) calls.shift();
  if (calls.length >= 20) {
    return res.status(429).json({ error: 'Too many requests, slow down' });
  }
  calls.push(now);
  next();
}

// lightweight response cache to avoid duplicate prompts within a short window
const responseCache = new Map();
const CACHE_TTL = 1000 * 120;

function setCache(key, value) {
  responseCache.set(key, { value, ts: Date.now() });
  while (responseCache.size > CACHE_MAX_ENTRIES) {
    const oldest = responseCache.keys().next().value;
    responseCache.delete(oldest);
  }
}

function getCache(key) {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL) {
    responseCache.delete(key);
    return null;
  }
  return hit.value;
}

function trimIndex(map, max = INDEX_MAX) {
  while (map.size > max) {
    const oldest = map.keys().next().value;
    map.delete(oldest);
  }
}

async function fetchWithTimeout(url, options = {}, timeout = GEMINI_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

function shrinkPrompt(prompt, limit = 1200) {
  return (prompt || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

let ollamaQueue = Promise.resolve();
function enqueueOllama(task) {
  const next = ollamaQueue.then(task, task);
  // swallow errors to keep chain alive
  ollamaQueue = next.catch(() => {});
  return next;
}

// removed old supabaseFetch helper; using supabase client directly

function isPrivateHost(hostname) {
  const lower = (hostname || '').toLowerCase();
  if (!lower) return true;
  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1') return true;
  // Basic RFC1918 checks
  if (lower.startsWith('10.')) return true;
  if (lower.startsWith('192.168.')) return true;
  const parts = lower.split('.').map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

async function callGemini(prompt, maxTokens = 700) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  const cacheKey = `g_${maxTokens}_${prompt.slice(0, 4000)}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }]}],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8, topP: 0.9 }
    })
  }, GEMINI_TIMEOUT_MS);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 120)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  if (!text) throw new Error('Empty response from Gemini');
  const trimmed = text.trim();
  setCache(cacheKey, trimmed);
  return trimmed;
}

async function callOllama(prompt, maxTokens = 700) {
  const boundedTokens = Math.min(maxTokens, OLLAMA_MAX_TOKENS);
  const concisePrompt = shrinkPrompt(prompt);
  const cacheKey = `o_${boundedTokens}_${concisePrompt.slice(0, 4000)}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  return enqueueOllama(async () => {
    const res = await fetchWithTimeout(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: concisePrompt,
        stream: false,
        options: { num_predict: boundedTokens }
      })
    }, 12000);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama error ${res.status}: ${text.slice(0, 120)}`);
    }

    const data = await res.json();
    const text = data?.response || '';
    if (!text) throw new Error('Empty response from Ollama');
    const trimmed = text.trim();
    setCache(cacheKey, trimmed);
    return trimmed;
  });
}

async function callAI(prompt, maxTokens = 700) {
  const shortPrompt = shrinkPrompt(prompt);
  if (GEMINI_API_KEY) {
    try {
      return await callGemini(prompt, maxTokens);
    } catch (e) {
      if (DEBUG_LOG) console.log('[ai] Gemini failed, try Ollama', e.message || e);
    }
  }
  try {
    return await callOllama(shortPrompt, maxTokens);
  } catch (e) {
    if (DEBUG_LOG) console.log('[ai] Ollama failed, using safe fallback', e.message || e);
    return 'Answer currently unavailable. Please try again.';
  }
}

function sanitizeText(text = '', limit = 12000) {
  return text.replace(/\s+/g, ' ').trim().slice(0, limit);
}

function enforceFormat(mode, answer) {
  const titleLabel = 'Title:';
  const defLabel = mode === 'notes' ? 'Definition:' : 'Explanation:';
  const keyLabel = 'Key Points:';
  const exLabel = 'Example:';
  const sumLabel = 'Summary:';

  const hasAll = [titleLabel, defLabel, keyLabel, exLabel, sumLabel].every((h) => answer.includes(h));
  if (hasAll) return answer.trim();

  const fallback = (label) => `${label} TBD`;
  return [
    `${titleLabel} ${(answer.split('\n')[0] || '').trim() || 'Untitled'}`,
    `${defLabel} ${(answer || '').slice(0, 240)}`,
    `${keyLabel}\n- ${(answer || '').slice(0, 80)}`,
    `${exLabel} ${(answer || '').slice(0, 120)}`,
    `${sumLabel} ${(answer || '').slice(-140)}`
  ].join('\n');
}

app.post('/api/generate', rateLimit, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.INTERNAL_API_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const prompt = (req.body?.prompt || '').toString();
  if (!prompt.trim()) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const answer = await callAI(prompt, 700);
    res.json({ result: answer });
  } catch (err) {
    console.error('generate error', err?.message || err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.post('/api/ask', rateLimit, async (req, res) => {
  const question = (req.body?.question || '').trim();
  if (!question) return res.status(400).json({ error: 'Question is required' });
  const sessionId = req.body?.sessionId || 'default';

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const prompt = `You are an academic tutor. Respond concisely with the exact sections below:
Title: <short title>
Explanation: <2-4 sentences>
Key Points:
- bullet 1
- bullet 2
- bullet 3
Example: <1 short, concrete example>
Summary: <1-2 sentences>

Question: ${question}`;

  const streamText = async (text) => {
    const parts = text.split(/(\s+)/).filter(Boolean);
    for (const part of parts) {
      if (res.writableEnded) return;
      res.write(part);
      // micro delay to emulate progressive tokens when upstream not streaming
      await new Promise((r) => setTimeout(r, 10));
    }
    if (!res.writableEnded) res.end();
  };

  try {
    memoryService.push(sessionId, 'user', question);
    const history = memoryService.get(sessionId).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const answer = await callAI(`${history}\n\nCurrent question: ${question}\n\n${prompt}`, 650);
    memoryService.push(sessionId, 'assistant', answer);
    await streamText(enforceFormat('qa', answer));
  } catch (err) {
    console.error('ask error', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Something went wrong' });
    } else if (!res.writableEnded) {
      await streamText('Sorry, something went wrong.');
    }
  }
});

app.post('/api/notes', rateLimit, async (req, res) => {
  const topic = (req.body?.topic || '').trim();
  if (!topic) return res.status(400).json({ error: 'Topic is required' });

  const prompt = `Generate structured study notes with the exact headings below. Keep it tight and clear.
Title: <topic title>
Definition: <2-3 sentences>
Key Points:
- bullet 1
- bullet 2
- bullet 3
Example: <1 practical example>
Summary: <1-2 sentences>

Topic: ${topic}`;

  try {
    const answer = await callAI(prompt, 650);
    const formatted = enforceFormat('notes', answer);
    if (supabase) {
      await supabase.from('notes').insert({ title: topic, content: formatted }).throwOnError();
    }
    res.json({ id: randomUUID(), content: formatted });
  } catch (err) {
    console.error('notes error', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.post('/api/pdf/upload', rateLimit, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (req.file.size > 5 * 1024 * 1024) return res.status(400).json({ error: 'File too large (max 5MB)' });

  try {
    const parsed = await pdfParse(req.file.buffer);
    const text = ragService.cleanText(parsed?.text || '');
    if (!text) return res.status(400).json({ error: 'Could not extract text from PDF' });

    const title = (parsed?.info?.Title || req.file.originalname || 'Untitled').toString();
    const stored = ragService.storeSource(text, { kind: 'pdf', title });
    pdfIndex.set(stored.id, { sourceId: stored.id, pages: parsed?.numpages || 0, chars: text.length, title });
    trimIndex(pdfIndex);

    if (supabase) {
      await supabase.from('pdf_docs').insert({ title, content: text.slice(0, 12000) }).throwOnError();
    }

    res.json({ id: stored.id, title, pages: parsed?.numpages || 0, chars: text.length, chunks: stored.chunkCount });
  } catch (err) {
    console.error('pdf upload error', err);
    res.status(500).json({ error: 'Failed to parse PDF' });
  }
});

app.post('/api/pdf/ask', rateLimit, async (req, res) => {
  const id = (req.body?.id || '').trim();
  const question = (req.body?.question || '').trim();
  if (!id) return res.status(400).json({ error: 'PDF id is required' });
  if (!question) return res.status(400).json({ error: 'Question is required' });

  const meta = pdfIndex.get(id);
  const source = ragService.getSource(meta?.sourceId);
  if (!meta || !source) return res.status(400).json({ error: 'PDF source not found. Upload again.' });

  const chunks = ragService.retrieve(source.id, question, 3);
  if (!chunks.length) return res.json({ answer: 'Not found in provided source' });

  const context = chunks.map((c, i) => `[Chunk ${i + 1}] ${c.text}`).join('\n');
  const prompt = `Answer using ONLY this context. If not found, say "Not found in provided source".

Context:
${context}

Question: ${question}`;

  try {
    const answer = await callAI(prompt, 550);
    res.json({ answer: enforceFormat('qa', answer) });
  } catch (err) {
    console.error('pdf ask error', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.post('/api/link/fetch', rateLimit, async (req, res) => {
  const urlRaw = (req.body?.url || '').trim();
  if (!urlRaw) return res.status(400).json({ error: 'URL is required' });

  let parsedUrl;
  try {
    parsedUrl = new URL(urlRaw);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const protocol = parsedUrl.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return res.status(400).json({ error: 'Only http/https URLs are allowed' });
  }
  if (isPrivateHost(parsedUrl.hostname)) {
    return res.status(400).json({ error: 'URL not allowed' });
  }

  try {
    const response = await axios.get(parsedUrl.toString(), { timeout: 12000 });
    const $ = cheerio.load(response.data || '');
    $('script, style, noscript, iframe').remove();
    const title = ($('title').text() || 'Untitled').trim();
    const text = ragService.cleanText($('body').text() || '');
    if (!text) return res.status(400).json({ error: 'No readable content found at URL' });

    const stored = ragService.storeSource(text, { kind: 'link', title, url: parsedUrl.toString() });
    linkIndex.set(stored.id, { sourceId: stored.id, title, chars: text.length });
    trimIndex(linkIndex);

    if (supabase) {
      await supabase.from('links').insert({ title, url: parsedUrl.toString(), content: text.slice(0, 12000) }).throwOnError();
    }

    res.json({ id: stored.id, title, chars: text.length, chunks: stored.chunkCount });
  } catch (err) {
    console.error('link fetch error', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch link' });
  }
});

app.post('/api/link/ask', rateLimit, async (req, res) => {
  const id = (req.body?.id || '').trim();
  const question = (req.body?.question || '').trim();
  if (!id) return res.status(400).json({ error: 'Link id is required' });
  if (!question) return res.status(400).json({ error: 'Question is required' });

  const meta = linkIndex.get(id);
  const source = ragService.getSource(meta?.sourceId);
  if (!meta || !source) return res.status(400).json({ error: 'Link content not found. Fetch again.' });

  const chunks = ragService.retrieve(source.id, question, 3);
  if (!chunks.length) return res.json({ answer: 'Not found in provided source' });

  const context = chunks.map((c, i) => `[Chunk ${i + 1}] ${c.text}`).join('\n');
  const prompt = `Answer using ONLY this context. If not found, say "Not found in provided source".

Page title: ${meta.title}
Context:
${context}

Question: ${question}`;

  try {
    const answer = await callAI(prompt, 550);
    res.json({ answer: enforceFormat('qa', answer) });
  } catch (err) {
    console.error('link ask error', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Generic RAG ask for any stored source
app.post('/api/rag/ask', rateLimit, async (req, res) => {
  const sourceId = (req.body?.sourceId || '').trim();
  const question = (req.body?.question || '').trim();
  if (!sourceId) return res.status(400).json({ error: 'Source id is required' });
  if (!question) return res.status(400).json({ error: 'Question is required' });

  const source = ragService.getSource(sourceId);
  if (!source) return res.status(400).json({ error: 'Source not found' });

  const chunks = ragService.retrieve(source.id, question, 3);
  if (!chunks.length) return res.json({ answer: 'Not found in provided source' });

  const context = chunks.map((c, i) => `[Chunk ${i + 1}] ${c.text}`).join('\n');
  const prompt = `Answer using ONLY this context. If not found, say "Not found in provided source".
Context:\n${context}\nQuestion: ${question}`;

  try {
    const answer = await callAI(prompt, 550);
    res.json({ answer: enforceFormat('qa', answer) });
  } catch (err) {
    console.error('rag ask error', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Exam generation
app.post('/api/exam/generate', rateLimit, async (req, res) => {
  const topic = (req.body?.topic || '').trim();
  if (!topic) return res.status(400).json({ error: 'Topic is required' });
  const prompt = examService.buildExamPrompt(topic);
  try {
    const raw = await callAI(prompt, 900);
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = []; }
    const questions = examService.normalizeQuestions(parsed);
    if (!questions.length) return res.status(500).json({ error: 'Could not generate questions' });
    questions.sort(() => Math.random() - 0.5);
    const examId = randomUUID();
    if (supabase) {
      await supabase.from('exams').insert({ id: examId, topic, questions }).throwOnError();
    }
    res.json({ examId, questions });
  } catch (err) {
    console.error('exam generate error', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Exam evaluation
app.post('/api/exam/evaluate', rateLimit, async (req, res) => {
  const examId = (req.body?.examId || '').trim();
  const question = req.body?.question;
  const userAnswer = (req.body?.answer || '').trim();
  if (!examId || !question || !userAnswer) return res.status(400).json({ error: 'Exam, question, answer required' });
  const prompt = examService.buildEvalPrompt(question, userAnswer);
  try {
    const raw = await callAI(prompt, 400);
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
    if (!parsed || typeof parsed.score !== 'number') return res.status(500).json({ error: 'Evaluation failed' });

    if (supabase) {
      await supabase.from('progress').insert({ exam_id: examId, topic: question.question, correct: parsed.score, total: 1, answer: userAnswer, expected: question.answer }).throwOnError();
    }

    res.json({ result: parsed });
  } catch (err) {
    console.error('exam eval error', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/api/progress', rateLimit, async (_req, res) => {
  try {
    if (!supabase) {
      return res.json({ accuracy: 0, totalExams: 0, weakTopic: 'N/A', mostStudied: 'N/A', trend: [] });
    }

    const { data: rows, error } = await supabase
      .from('progress')
      .select('topic, correct, total, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;

    const totalExams = rows?.length || 0;
    const sum = rows?.reduce((acc, r) => {
      acc.correct += Number(r.correct) || 0;
      acc.total += Number(r.total) || 0;
      return acc;
    }, { correct: 0, total: 0 }) || { correct: 0, total: 0 };

    const accuracy = sum.total ? Math.round((sum.correct / sum.total) * 100) : 0;
    const trend = (rows || []).slice(0, 8).map((r) => ({
      topic: r.topic || 'general',
      accuracy: (Number(r.correct) && Number(r.total)) ? Math.round((Number(r.correct) / Math.max(1, Number(r.total))) * 100) : 0,
      at: r.created_at,
    }));

    const weakCount = new Map();
    const studied = new Map();
    (rows || []).forEach((r) => {
      const topic = r.topic || 'general';
      studied.set(topic, (studied.get(topic) || 0) + 1);
      if (!r.correct) weakCount.set(topic, (weakCount.get(topic) || 0) + 1);
    });

    const weakTopic = Array.from(weakCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const mostStudied = Array.from(studied.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    res.json({ accuracy, totalExams, weakTopic, mostStudied, trend });
  } catch (err) {
    console.error('progress insights error', err?.message || err);
    res.status(500).json({ error: 'Failed to load progress insights' });
  }
});

// Notebook
app.get('/api/notebook', rateLimit, async (_req, res) => {
  if (!supabase) return res.json([]);
  try {
    const { data, error } = await supabase.from('notebook').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('notebook fetch error', err?.message || err);
    res.status(500).json({ error: 'Failed to load notebook' });
  }
});

app.post('/api/notebook', rateLimit, async (req, res) => {
  if (!supabase) return res.status(200).json({ id: randomUUID(), ...req.body });
  const type = (req.body?.type || '').trim();
  const title = (req.body?.title || '').trim();
  const content = (req.body?.content || '').trim();
  const url = (req.body?.url || '').trim();
  if (!type || !title || !content) return res.status(400).json({ error: 'type, title, content required' });
  try {
    const { data, error } = await supabase.from('notebook').insert({ type, title, content, url }).select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('notebook save error', err?.message || err);
    res.status(500).json({ error: 'Failed to save notebook item' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`PrepMind server running on http://localhost:${PORT}`);
});
