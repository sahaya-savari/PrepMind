import { randomUUID } from 'crypto';

const sources = new Map();
const MAX_SOURCES = 40;
const DEFAULT_CHUNK_WORDS = 360; // keep chunks ~300-400 words
const DEFAULT_OVERLAP = 60;

function cleanText(text = '') {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();
}

function chunkText(rawText, chunkWords = DEFAULT_CHUNK_WORDS, overlapWords = DEFAULT_OVERLAP) {
  const text = cleanText(rawText);
  if (!text) return [];
  const words = text.split(' ');
  const chunks = [];
  let start = 0;
  let idx = 0;

  while (start < words.length) {
    const end = Math.min(words.length, start + chunkWords);
    const slice = words.slice(start, end).join(' ').trim();
    if (slice) {
      const tokens = tokenize(slice);
      chunks.push({ id: `c${idx}`, text: slice, tokens });
      idx++;
    }
    if (end >= words.length) break;
    start = Math.max(end - overlapWords, start + 1);
  }
  return chunks;
}

function tokenize(str = '') {
  return cleanText(str)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(' ')
    .filter(Boolean);
}

function scoreChunk(queryTokens, chunkTokens) {
  if (!queryTokens.length || !chunkTokens?.length) return 0;
  const tokenSet = new Set(chunkTokens);
  let matches = 0;
  for (const t of queryTokens) {
    if (tokenSet.has(t)) matches++;
  }
  const coverage = matches / Math.max(1, queryTokens.length);
  const density = matches / Math.max(1, chunkTokens.length);
  return matches + coverage * 0.5 + density * 0.5;
}

function retrieve(sourceId, question, topK = 3) {
  const source = sources.get(sourceId);
  if (!source) return [];
  const qTokens = tokenize(question).slice(0, 60);
  const scored = source.chunks
    .map((c) => ({ score: scoreChunk(qTokens, c.tokens), text: c.text }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(3, topK))
    .filter((c) => c.text && c.text.trim());
  return scored;
}

function storeSource(rawText, meta = {}) {
  const id = randomUUID();
  const chunks = chunkText(rawText);
  sources.set(id, { id, chunks, meta, createdAt: Date.now() });
  // trim store
  if (sources.size > MAX_SOURCES) {
    const keys = Array.from(sources.keys());
    const excess = sources.size - MAX_SOURCES;
    for (let i = 0; i < excess; i++) sources.delete(keys[i]);
  }
  return { id, chunkCount: chunks.length, meta };
}

function getSource(id) {
  return sources.get(id);
}

export default {
  storeSource,
  retrieve,
  getSource,
  chunkText,
  cleanText,
};
