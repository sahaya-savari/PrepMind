function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function extractJSON(str) {
  try {
    const match = str.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(str);
  } catch (e) {
    throw new Error('Failed to parse JSON response: ' + e.message);
  }
}

const APICache = JSON.parse(localStorage.getItem('ai_cache')) || {};

async function fetchFromGemini(messages, systemPrompt = '', maxTokens = 1200) {
  const msgs = [];
  if (systemPrompt) {
    msgs.push({ role: 'system', content: systemPrompt });
  }
  msgs.push(...messages);

  const body = {
    model: MODEL,
    messages: msgs,
    temperature: 1,
    max_tokens: maxTokens,
    top_p: 1
  };

  try {
    console.log('api.js → calling backend', { endpoint: API_BASE, model: MODEL, messages: msgs.length });
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error (${res.status})`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  } catch(e) {
    console.error('api.js → backend call failed', e);
    throw new Error(e.message || 'Failed to connect to AI API. Check your connection and token.');
  }
}

async function aiAPI(messages, systemPrompt = '', maxTokens = 1200) {
  const payloadStr = systemPrompt + JSON.stringify(messages);
  const cacheKey = 'c_' + payloadStr.length + '_' + payloadStr.replace(/[^a-zA-Z0-9]/g, '').slice(-50);

  if (APICache[cacheKey]) {
    console.log('⚡ Using cached AI response');
    return APICache[cacheKey];
  }

  const response = await fetchFromGemini(messages, systemPrompt, maxTokens);
  
  APICache[cacheKey] = response;
  try {
    localStorage.setItem('ai_cache', JSON.stringify(APICache));
  } catch (e) {
    console.warn('Cache quota exceeded, ignoring cache save.');
  }
  
  return response;
}

const RAG_STOPWORDS = new Set([
  'a','an','and','are','as','at','be','been','being','but','by','can','could','did','do','does','for','from','had',
  'has','have','he','her','his','how','i','if','in','into','is','it','its','me','more','most','my','of','on','or',
  'our','ours','she','so','than','that','the','their','them','there','these','they','this','to','too','up','us',
  'was','we','were','what','when','where','which','who','why','will','with','you','your'
]);

function normalizeText(input) {
  return (input || '')
    .toLowerCase()
    .replace(/\r\n?/g, '\n')
    .replace(/[^a-z0-9\s\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeForRetrieval(input) {
  const norm = normalizeText(input);
  if (!norm) return [];
  return norm
    .split(' ')
    .filter(t => t.length > 2 && !RAG_STOPWORDS.has(t));
}

function chunkText(text, chunkSize = 500, overlap = 120) {
  const safeText = (text || '').replace(/\r\n?/g, '\n').trim();
  if (!safeText) return [];

  const chunks = [];
  let start = 0;
  let idx = 0;
  const step = Math.max(80, chunkSize - overlap);

  while (start < safeText.length) {
    const end = Math.min(safeText.length, start + chunkSize);
    const textSlice = safeText.slice(start, end).trim();

    if (textSlice) {
      const tokens = Array.from(new Set(tokenizeForRetrieval(textSlice))).slice(0, 140);
      chunks.push({
        id: 'chunk_' + idx,
        text: textSlice,
        normText: normalizeText(textSlice),
        tokens,
        start,
        end,
        length: textSlice.length
      });
      idx++;
    }

    if (end >= safeText.length) break;
    start += step;
  }

  return chunks;
}

function scoreChunk(queryNorm, queryTokensSet, chunk) {
  if (!chunk || !chunk.tokens || !chunk.tokens.length || !queryTokensSet.size) return 0;

  let overlap = 0;
  for (const token of chunk.tokens) {
    if (queryTokensSet.has(token)) overlap++;
  }

  if (overlap === 0) return 0;

  const coverage = overlap / Math.max(1, queryTokensSet.size);
  const density = overlap / Math.max(1, chunk.tokens.length);
  const phraseBonus = queryNorm && chunk.normText.includes(queryNorm) ? 0.15 : 0;

  return (coverage * 0.7) + (density * 0.3) + phraseBonus;
}

function retrieveRelevantChunks(question, chunks, options = {}) {
  const topK = Math.max(1, options.topK || 3);
  const minScore = typeof options.minScore === 'number' ? options.minScore : 0.25;

  const queryNorm = normalizeText(question);
  const queryTokens = tokenizeForRetrieval(question);
  const queryTokenSet = new Set(queryTokens);

  if (!queryNorm || !queryTokenSet.size || !Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const ranked = [];
  for (const chunk of chunks) {
    const score = scoreChunk(queryNorm, queryTokenSet, chunk);
    if (score >= minScore) ranked.push({ chunk, score });
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.chunk.id.localeCompare(b.chunk.id);
  });

  return ranked.slice(0, topK);
}

function buildRagContext(question) {
  if (!STATE.rag.enabled || !STATE.notesChunks.length) {
    return { contextText: '', matches: [], topScore: 0 };
  }

  const matches = retrieveRelevantChunks(question, STATE.notesChunks, STATE.rag);
  if (!matches.length) {
    return { contextText: '', matches: [], topScore: 0 };
  }

  const maxChars = Math.max(400, STATE.rag.maxContextChars || 1800);
  let used = 0;
  const selected = [];

  for (const item of matches) {
    if (used >= maxChars) break;
    const room = maxChars - used;
    const text = room >= item.chunk.text.length ? item.chunk.text : item.chunk.text.slice(0, room);
    if (!text.trim()) continue;
    selected.push({ score: item.score, text });
    used += text.length;
  }

  if (!selected.length) {
    return { contextText: '', matches: [], topScore: 0 };
  }

  const contextText = selected
    .map((s, i) => `[Note Chunk ${i + 1} | score ${s.score.toFixed(2)}]\n${s.text}`)
    .join('\n\n');

  return {
    contextText,
    matches: selected,
    topScore: selected[0].score
  };
}