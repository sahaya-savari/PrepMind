// Vercel Serverless Function: /api/ai
// Unified Multi-Provider Orchestrator: Groq Cloud (Primary), NVIDIA NIM (High Performance), Google Gemini (Fallback)

const GROQ_DEFAULT_MODEL = 'openai/gpt-oss-120b';
const NVIDIA_DEFAULT_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const GEMINI_DEFAULT_MODEL = 'models/gemini-2.5-flash';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function sendJson(res, status, payload) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.status(status).json(payload);
}

function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.replace(/```json\s*|```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    return null;
  }
}

function validateMcqQuestions(parsed) {
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return null;
  }
  const valid = [];
  for (const q of parsed.questions) {
    if (!q || typeof q.question !== 'string' || !q.question.trim()) continue;
    if (!Array.isArray(q.options) || q.options.length < 2) continue;
    const cleanOptions = q.options.map((o) => String(o || '').trim()).filter(Boolean);
    if (cleanOptions.length < 2) continue;
    const expected = String(q.answer || q.correct_answer || cleanOptions[0]).trim();
    const answer = cleanOptions.includes(expected) ? expected : cleanOptions[0];
    const explanation = String(q.explanation || 'Review the correct option and conceptual reasoning.').trim();
    valid.push({
      question: q.question.trim(),
      options: cleanOptions.slice(0, 4),
      answer,
      correct_answer: answer,
      explanation,
    });
  }
  return valid.length > 0 ? { questions: valid } : null;
}

// --- PROVIDER ADAPTERS ---

async function callGroq({ apiKey, model, messages, jsonMode = false, maxTokens = 1200 }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const payload = {
      model: model || GROQ_DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    };

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Groq API error (${res.status}): ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callNvidia({ apiKey, model, messages, maxTokens = 1200 }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18000);

  try {
    const payload = {
      model: model || process.env.NVIDIA_MODEL || NVIDIA_DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
      chat_template_kwargs: { enable_thinking: false },
    };

    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`NVIDIA API error (${res.status}): ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGemini({ apiKey, messages, systemInstruction, maxTokens = 1200 }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body = {
      contents,
      systemInstruction: systemInstruction ? { role: 'user', parts: [{ text: systemInstruction }] } : undefined,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: maxTokens,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  } finally {
    clearTimeout(timeoutId);
  }
}

// --- MAIN HANDLER ---

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.status(200).end();
    return;
  }

  const groqKey = process.env.GROQ_API_KEY || '';
  const nvidiaKey = process.env.NVIDIA_API_KEY || '';
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const hasProvider = Boolean(groqKey || nvidiaKey || geminiKey);

  const groqModel = process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL;
  const nvidiaModel = process.env.NVIDIA_MODEL || NVIDIA_DEFAULT_MODEL;
  const geminiModel = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;

  if (req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ok',
      providers: {
        groq: { configured: Boolean(groqKey), model: groqModel },
        nvidia: { configured: Boolean(nvidiaKey), model: nvidiaModel },
        gemini: { configured: Boolean(geminiKey), model: geminiModel },
      },
      primaryProvider: groqKey ? 'groq' : nvidiaKey ? 'nvidia' : geminiKey ? 'gemini' : 'none',
      cascadeOrder: ['groq', 'nvidia', 'gemini'].filter((p) => (p === 'groq' && groqKey) || (p === 'nvidia' && nvidiaKey) || (p === 'gemini' && geminiKey)),
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = req.body || {};
  const action = body.action || (body.topic ? 'generate_mcq' : 'chat');

  // Fast check: Evaluation action doesn't require upstream LLM
  if (action === 'evaluate') {
    const answers = Array.isArray(body.answers) ? body.answers : [];
    if (!answers.length) {
      return sendJson(res, 400, { error: 'Answers array required for evaluation' });
    }

    const scored = answers.map((a) => {
      const expected = (a?.correct_answer || a?.expected || a?.answer || '').toString().trim();
      const user = (a?.answer || '').toString().trim();
      const isCorrect = Boolean(expected && user && expected.toLowerCase() === user.toLowerCase());
      return {
        correct: isCorrect,
        userAnswer: user,
        expectedAnswer: expected,
        explanation: a?.explanation || 'Review the correct option and concept explanation.',
      };
    });

    const total = scored.length;
    const correctCount = scored.filter((s) => s.correct).length;
    const score = total ? Math.round((correctCount / total) * 100) : 0;
    return sendJson(res, 200, {
      score,
      explanations: scored.map((s) => s.explanation),
      results: scored,
    });
  }

  // Pre-validate input payload before checking provider configuration
  let topic = '';
  let difficulty = 'Intermediate';
  let sanitizedMessages = [];

  if (action === 'generate_mcq') {
    topic = (body.topic || '').toString().trim().slice(0, 200);
    difficulty = (body.difficulty || 'Intermediate').toString().trim().slice(0, 50);
    if (!topic) {
      return sendJson(res, 400, { error: 'Topic is required for MCQ generation' });
    }
  } else if (action === 'chat') {
    const rawMessages = Array.isArray(body.messages)
      ? body.messages
      : body.message
      ? [{ role: 'user', content: String(body.message) }]
      : [];

    sanitizedMessages = rawMessages
      .filter((m) => m && typeof m.role === 'string' && typeof m.content === 'string')
      .map((m) => ({
        role: ['user', 'assistant', 'system'].includes(m.role) ? m.role : 'user',
        content: m.content.trim().slice(0, 4000),
      }))
      .filter((m) => m.content.length > 0)
      .slice(-20);

    if (!sanitizedMessages.length) {
      return sendJson(res, 400, { error: 'Invalid request: messages array or message string required' });
    }
  } else {
    return sendJson(res, 400, { error: `Unsupported action: ${action}` });
  }

  if (!hasProvider) {
    return sendJson(res, 503, {
      error: 'AI service unconfigured: Neither GROQ_API_KEY, NVIDIA_API_KEY, nor GEMINI_API_KEY is configured in environment.',
      provider: 'none',
    });
  }

  // Resilient cascade execution helper
  const runWithCascade = async ({ messages, systemPrompt, jsonMode = false, maxTokens = 1200, validate = null }) => {
    const attempts = [];
    if (groqKey) {
      attempts.push(async () => {
        const full = systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages;
        const text = await callGroq({
          apiKey: groqKey,
          model: groqModel,
          messages: full,
          jsonMode,
          maxTokens,
        });
        if (validate) {
          const validated = validate(text);
          if (!validated) throw new Error('Groq output failed validation schema');
          return { text, validated, provider: 'groq', model: groqModel };
        }
        return { text, provider: 'groq', model: groqModel };
      });
    }

    if (nvidiaKey) {
      attempts.push(async () => {
        const full = systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages;
        const text = await callNvidia({
          apiKey: nvidiaKey,
          model: nvidiaModel,
          messages: full,
          maxTokens,
        });
        if (validate) {
          const validated = validate(text);
          if (!validated) throw new Error('NVIDIA output failed validation schema');
          return { text, validated, provider: 'nvidia', model: nvidiaModel };
        }
        return { text, provider: 'nvidia', model: nvidiaModel };
      });
    }

    if (geminiKey) {
      attempts.push(async () => {
        const text = await callGemini({
          apiKey: geminiKey,
          messages,
          systemInstruction: systemPrompt,
          maxTokens,
        });
        if (validate) {
          const validated = validate(text);
          if (!validated) throw new Error('Gemini output failed validation schema');
          return { text, validated, provider: 'gemini', model: geminiModel };
        }
        return { text, provider: 'gemini', model: geminiModel };
      });
    }

    let lastErr = null;
    for (const fn of attempts) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        console.warn('[api/ai] Provider attempt failed, cascading:', e?.message || e);
      }
    }

    throw lastErr || new Error('No AI provider succeeded');
  };

  try {
    // 1. MCQ GENERATION
    if (action === 'generate_mcq') {
      const ragPassages = Array.isArray(body.passages) ? body.passages : [];
      let systemPrompt =
        'You are an expert exam question creator. Output ONLY a valid JSON object matching this schema: {"questions": [{"question": "string", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": "Option A", "explanation": "string"}]}. Do not include markdown code ticks, conversational text, or preamble.';

      let userPrompt = `Create exactly one ${difficulty} multiple-choice question on the topic "${topic}". Include 4 distinct, plausible options. Set the "answer" field to the exact string matching the correct option. Provide a clear, educational explanation.`;

      if (ragPassages.length > 0) {
        const materialContext = ragPassages
          .slice(0, 3)
          .map((p, i) => {
            const title = p.document_title || p.document_name || p.documentName || p.name || p.title || 'Notes';
            const page = p.page_number || p.pageNumber || 1;
            const text = p.chunk_text || p.chunkText || p.text || '';
            return `[Material ${i + 1}: ${title}, p.${page}]:\n${text}`;
          })
          .join('\n\n');
        userPrompt = `Based strictly on the following uploaded study material passages:\n\n${materialContext}\n\nCreate exactly one ${difficulty} multiple-choice question testing understanding of these notes. Include 4 distinct plausible options, set the "answer" field to the exact string matching the correct option, and explain the correct solution referencing the source document.`;
      }

      const result = await runWithCascade({
        messages: [{ role: 'user', content: userPrompt }],
        systemPrompt,
        jsonMode: true,
        validate: (rawText) => {
          const parsed = extractJson(rawText);
          return validateMcqQuestions(parsed);
        },
      });

      if (result.validated) {
        return sendJson(res, 200, {
          ...result.validated,
          provider: result.provider,
          model: result.model,
          isGroundedInRag: ragPassages.length > 0,
        });
      }

      return sendJson(res, 502, {
        error: 'Failed to parse AI response into questions structure',
        raw: result.text.slice(0, 300),
      });
    }

    // 2. STUDY CHAT / CONVERSATION (WITH OPTIONAL RAG GROUNDING & CITATIONS)
    const ragPassages = Array.isArray(body.passages) ? body.passages : [];
    let citations = [];
    let ragGroundingPrompt = '';

    if (body.useRag && ragPassages.length > 0) {
      citations = ragPassages.slice(0, 4).map((p) => {
        const title = p.document_title || p.document_name || p.documentName || p.name || p.title || 'Study Document';
        const page = p.page_number || p.pageNumber || 1;
        const snippet = (p.chunk_text || p.chunkText || p.text || '').slice(0, 220).trim();
        return {
          document_title: title,
          documentName: title,
          page_number: page,
          pageNumber: page,
          snippet,
          textSnippet: snippet,
        };
      });

      const contextText = ragPassages
        .slice(0, 4)
        .map((p, idx) => {
          const title = p.document_title || p.document_name || p.documentName || p.name || p.title || 'Study Notes';
          const page = p.page_number || p.pageNumber || 1;
          const text = p.chunk_text || p.chunkText || p.text || '';
          return `[Source ${idx + 1}: "${title}", Page ${page}]\n${text}`;
        })
        .join('\n\n');

      ragGroundingPrompt = `\n\n[VERIFIED USER STUDY MATERIAL CONTEXT]\n${contextText}\n\n[INSTRUCTIONS FOR GROUNDED RESPONSE]\n1. Base your answer primarily on the verified study material passages above.\n2. When stating facts from the material, cite the document name and page number.\n3. If the provided study material does not contain enough information to answer the question, state: "The uploaded study materials do not contain sufficient information to answer this question." You may then provide general knowledge only if explicitly helpful, noting it is from general training data.`;
    }

    const defaultSystem =
      "You are PrepMind AI, an elite technical exam coach and personalized AI study tutor. Your mission is to help students master concepts and ace their target technical exams (TCS NQT, GATE, JEE, CAT, technical coding and system design interviews). When the student specifies or references a target exam, tailor your guidance directly to that exam's specific syllabus, question patterns, and rigor. Format your answers clearly with concise bullet points, bold key terms, clean tables, and code snippets where relevant. Avoid asking generic questions about unrelated non-technical high-school subjects.";

    const systemMessage = sanitizedMessages.find((m) => m.role === 'system');
    const finalSystem = (systemMessage?.content || defaultSystem) + ragGroundingPrompt;
    const conversation = sanitizedMessages.filter((m) => m.role !== 'system');

    const result = await runWithCascade({
      messages: conversation,
      systemPrompt: finalSystem,
    });

    return sendJson(res, 200, {
      response: result.text,
      choices: [{ message: { content: result.text } }],
      provider: result.provider,
      model: result.model,
      citations,
      isGroundedInRag: Boolean(body.useRag && citations.length > 0),
    });
  } catch (err) {
    console.error('[api/ai] error:', err?.message || err);
    return sendJson(res, 500, {
      error: err?.message || 'Upstream AI provider error',
    });
  }
}
