// Vercel Serverless Function: /api/rag
// End-to-end RAG Engine: Text Extraction (PDF/TXT/MD), Boundary-Aware Chunking,
// Gemini text-embedding-004 Vector Generation, Owner-Filtered Retrieval, and Grounded Citations.

import crypto from 'node:crypto';

const GEMINI_EMBEDDING_MODEL = 'models/text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;
const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 120;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function sendJson(res, status, payload) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.status(status).json(payload);
}

// ----------------------------------------------------------------------------
// 1. TEXT EXTRACTION & NORMALIZATION
// ----------------------------------------------------------------------------
export async function extractTextFromContent({ buffer, text, mimeType, filename }) {
  if (text && typeof text === 'string') {
    return {
      text: cleanRawText(text),
      pageCount: 1,
    };
  }

  const isPdf =
    (mimeType && mimeType.includes('pdf')) ||
    (filename && filename.toLowerCase().endsWith('.pdf'));

  if (isPdf && buffer) {
    try {
      // Dynamic import of pdf-parse
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = pdfParseModule.default || pdfParseModule;

      try {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const workerPath = path.resolve('node_modules/pdf-parse/lib/pdf.js/v1.10.100/build/pdf.worker.js');
        if (fs.existsSync(workerPath)) {
          let src = fs.readFileSync(workerPath, 'utf8');
          if (src.includes('return new Stream(this.bytes.buffer, start, length, dict);')) {
            src = src.replace(
              'makeSubStream: function Stream_makeSubStream(start, length, dict) {\n      return new Stream(this.bytes.buffer, start, length, dict);\n    }',
              'makeSubStream: function Stream_makeSubStream(start, length, dict) {\n      var baseOffset = this.bytes.byteOffset || 0;\n      return new Stream(this.bytes.buffer, baseOffset + start, length, dict);\n    }'
            );
            fs.writeFileSync(workerPath, src, 'utf8');
          }
        }
      } catch (_) {
        // Read-only environment, ignore
      }

      const parsed = await pdfParse(buffer);


      const cleaned = cleanRawText(parsed.text || '');
      if (!cleaned || cleaned.length < 10) {
        throw new Error(
          'The document contains no extractable text. Scanned or image-only PDFs require OCR, which is currently not supported.'
        );
      }

      return {
        text: cleaned,
        pageCount: parsed.numpages || 1,
      };
    } catch (err) {
      if (err.message?.includes('no extractable text')) throw err;
      throw new Error(`Failed to parse PDF document: ${err.message || 'Corrupted or unsupported format'}`);
    }
  }

  // Fallback for TXT/MD buffers
  if (buffer) {
    const raw = buffer.toString('utf-8');
    const cleaned = cleanRawText(raw);
    if (!cleaned || cleaned.length < 5) {
      throw new Error('Document is empty or contains unreadable text.');
    }
    return { text: cleaned, pageCount: 1 };
  }

  throw new Error('No readable content provided for extraction.');
}

function cleanRawText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// ----------------------------------------------------------------------------
// 2. BOUNDARY-AWARE SEMANTIC CHUNKING
// ----------------------------------------------------------------------------
export function chunkDocumentText(
  text,
  {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    pageCount = 1,
  } = {}
) {
  if (!text || typeof text !== 'string') return [];

  const cleaned = cleanRawText(text);
  if (!cleaned) return [];

  // If text has form-feed page markers (\f), split by pages first
  const pageSections = cleaned.split(/\f|\n(?=Page \d+)/i);
  const chunks = [];
  let globalChunkIndex = 0;

  const totalChars = cleaned.length;
  const charsPerPage = Math.max(1, Math.round(totalChars / Math.max(1, pageCount)));

  let currentOffset = 0;
  let start = 0;

  while (start < cleaned.length) {
    let end = start + chunkSize;

    if (end < cleaned.length) {
      // Look for natural boundary: paragraph -> sentence -> word
      const paragraphBreak = cleaned.lastIndexOf('\n\n', end);
      if (paragraphBreak > start + chunkSize * 0.5) {
        end = paragraphBreak;
      } else {
        const sentenceBreak = cleaned.slice(start, end).search(/[.!?]\s+(?=[A-Z0-9])/);
        if (sentenceBreak > chunkSize * 0.5) {
          end = start + sentenceBreak + 1;
        } else {
          const spaceBreak = cleaned.lastIndexOf(' ', end);
          if (spaceBreak > start + chunkSize * 0.6) {
            end = spaceBreak;
          }
        }
      }
    } else {
      end = cleaned.length;
    }

    const chunkContent = cleaned.slice(start, end).trim();
    if (chunkContent.length >= 20) {
      const estimatedPage = Math.min(pageCount, Math.floor(start / charsPerPage) + 1);
      chunks.push({
        chunkIndex: globalChunkIndex,
        pageNumber: estimatedPage,
        chunkText: chunkContent,
      });
      globalChunkIndex++;
    }

    if (end >= cleaned.length) break;
    start = Math.max(start + 1, end - chunkOverlap);
  }

  return chunks;
}

// ----------------------------------------------------------------------------
// 3. 768-DIMENSION EMBEDDING GENERATOR (Gemini text-embedding-004)
// ----------------------------------------------------------------------------
export async function generateSingleEmbedding(text, apiKey, { allowSyntheticFallback = false } = {}) {
  const clean = text.slice(0, 2048).trim();

  // If Gemini API key is provided, generate real vector via Google Generative AI
  if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${encodeURIComponent(apiKey.trim())}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GEMINI_EMBEDDING_MODEL,
        content: { parts: [{ text: clean }] },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const vector = data?.embedding?.values;
      if (Array.isArray(vector) && vector.length === EMBEDDING_DIMENSIONS) {
        return vector;
      }
      throw new Error(`Embedding model returned invalid dimensions: expected ${EMBEDDING_DIMENSIONS}`);
    } else {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini embedding API error (${res.status}): ${errText.slice(0, 300) || 'Upstream generation failure'}`);
    }
  }

  // Production requirement: NEVER use synthetic vectors in production.
  // Synthetic vectors are ONLY permitted when allowSyntheticFallback is explicitly true (in isolated unit tests).
  if (allowSyntheticFallback) {
    return createDeterministicVector(clean, EMBEDDING_DIMENSIONS);
  }

  throw new Error('Embedding service unconfigured: GEMINI_API_KEY is required for production RAG. Synthetic fallback vectors are strictly disabled in production.');
}

export async function generateBatchEmbeddings(texts, apiKey, { allowSyntheticFallback = false } = {}) {
  const vectors = [];
  for (const t of texts) {
    const vec = await generateSingleEmbedding(t, apiKey, { allowSyntheticFallback });
    vectors.push(vec);
  }
  return vectors;
}

// High-dimensional deterministic vector generator for reproducible offline embeddings
// Uses token projection + character hashing to ensure semantic keyword overlap yields positive cosine similarity
export function createDeterministicVector(input, dimensions = EMBEDDING_DIMENSIONS) {
  const vector = new Float32Array(dimensions);
  const text = (input || '').toLowerCase();

  // 1. Baseline pseudo-noise for baseline density
  const overallHash = crypto.createHash('sha256').update(text).digest();
  for (let i = 0; i < dimensions; i++) {
    const byte = overallHash[i % overallHash.length];
    vector[i] = (byte / 255.0) * 0.05;
  }

  // 2. Token-projected features for semantic overlap
  const tokens = text.match(/[a-z0-9_]{3,}/g) || [];
  for (const token of tokens) {
    const tokenHash = crypto.createHash('md5').update(token).digest();
    const idx1 = tokenHash.readUInt16BE(0) % dimensions;
    const idx2 = tokenHash.readUInt16BE(2) % dimensions;
    const idx3 = tokenHash.readUInt16BE(4) % dimensions;
    vector[idx1] += 1.0;
    vector[idx2] += 0.8;
    vector[idx3] += 0.6;
  }

  // 3. Normalize to unit vector (L2 norm = 1.0)
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm) || 1;

  const normalized = Array.from(vector).map((v) => Number((v / norm).toFixed(6)));
  return normalized;
}

// Cosine similarity computation for client or local database matching
export function computeCosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag ? dot / mag : 0;
}

// ----------------------------------------------------------------------------
// 4. MAIN SERVERLESS HANDLER
// ----------------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'PrepMind RAG Pipeline',
      embeddingModel: GEMINI_EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      supportedMimeTypes: ['application/pdf', 'text/plain', 'text/markdown'],
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const body = req.body || {};
  const action = body.action || 'retrieve';
  const geminiKey = process.env.GEMINI_API_KEY || '';

  const isTestEnvironment = process.env.NODE_ENV === 'test' || Boolean(req.headers?.['x-prepmind-test-mode']);
  const allowSyntheticFallback = isTestEnvironment && !process.env.VERCEL && !process.env.PRODUCTION;

  // Production security & integrity requirement: NEVER allow synthetic vectors in production
  if (!geminiKey && !allowSyntheticFallback) {
    return sendJson(res, 503, {
      error: 'Embedding service unconfigured: GEMINI_API_KEY is required for production RAG. Synthetic or fallback embeddings are strictly disabled in production.',
      model: GEMINI_EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
    });
  }

  try {
    // ------------------------------------------------------------------------
    // Action A: Ingest & Process Document into Vector Chunks
    // ------------------------------------------------------------------------
    if (action === 'process_document') {
      const { documentId, name, mimeType, text, fileBase64, notebookId } = body;

      if (!documentId) {
        return sendJson(res, 400, { error: 'documentId is required for processing' });
      }

      let buffer = null;
      if (fileBase64 && typeof fileBase64 === 'string') {
        buffer = Buffer.from(fileBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
      }

      const extracted = await extractTextFromContent({
        buffer,
        text,
        mimeType: mimeType || 'text/plain',
        filename: name || 'document',
      });

      const chunks = chunkDocumentText(extracted.text, {
        pageCount: extracted.pageCount,
        chunkSize: DEFAULT_CHUNK_SIZE,
        chunkOverlap: DEFAULT_CHUNK_OVERLAP,
      });

      if (!chunks.length) {
        return sendJson(res, 422, { error: 'Could not extract any valid semantic chunks from document.' });
      }

      // Generate 768-dim embeddings for all chunks (real Gemini API in production)
      const texts = chunks.map((c) => c.chunkText);
      const embeddings = await generateBatchEmbeddings(texts, geminiKey, { allowSyntheticFallback });

      const processedChunks = chunks.map((c, idx) => ({
        id: c.id || `${documentId}_${idx}`,
        ...c,
        documentId,
        documentName: name || 'Study Document',
        notebookId: notebookId || null,
        embedding: embeddings[idx],
      }));

      const contentHash = crypto.createHash('sha256').update(extracted.text).digest('hex').slice(0, 16);

      return sendJson(res, 200, {
        success: true,
        documentId,
        notebookId: notebookId || null,
        chunkCount: processedChunks.length,
        pageCount: extracted.pageCount,
        characterCount: extracted.text.length,
        contentHash,
        chunks: processedChunks,
      });
    }

    // ------------------------------------------------------------------------
    // Action B: Retrieve Relevant Passages
    // ------------------------------------------------------------------------
    if (action === 'retrieve') {
      const question = (body.question || body.query || '').trim();
      const localChunks = Array.isArray(body.chunks) ? body.chunks : [];
      const threshold = typeof body.threshold === 'number' ? body.threshold : 0.2;
      const limit = typeof body.limit === 'number' ? Math.min(10, body.limit) : 4;
      const notebookId = body.notebookId || null;

      if (!question) {
        return sendJson(res, 400, { error: 'Question is required for retrieval' });
      }

      const queryVector = await generateSingleEmbedding(question, geminiKey, { allowSyntheticFallback });

      // Perform local ranking if chunks array provided in payload, respecting notebook & tenant boundaries
      const reqUserId = body.userId || body.user_id;
      const scopedChunks = localChunks.filter((c) => {
        const chunkUserId = c.userId || c.user_id;
        if (reqUserId && chunkUserId && chunkUserId !== reqUserId) return false;
        const chunkNb = c.notebookId || c.notebook_id;
        if (notebookId && chunkNb !== notebookId) return false;
        return true;
      });

      const scored = scopedChunks
        .map((c) => {
          const sim = c.embedding
            ? computeCosineSimilarity(queryVector, c.embedding)
            : 0;
          return {
            id: c.id,
            documentId: c.documentId || c.document_id,
            documentName: c.documentName || c.document_name || 'Document',
            notebookId: c.notebookId || c.notebook_id || null,
            chunkText: c.chunkText || c.chunk_text || c.text || '',
            pageNumber: c.pageNumber || c.page_number || 1,
            similarity: Number(sim.toFixed(4)),
          };
        })
        .filter((c) => c.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return sendJson(res, 200, {
        question,
        queryVector,
        results: scored,
        matchCount: scored.length,
        notebookId,
      });
    }

    // ------------------------------------------------------------------------
    // Action C: Generate MCQ Drills from Document Passages
    // ------------------------------------------------------------------------
    if (action === 'generate_rag_practice') {
      const passages = Array.isArray(body.passages) ? body.passages : [];
      const topic = (body.topic || 'Study Notes').trim();

      if (!passages.length) {
        return sendJson(res, 400, { error: 'Context passages required to generate grounded practice drills.' });
      }

      const combinedContext = passages
        .slice(0, 3)
        .map((p, i) => `[Passage ${i + 1} (${p.documentName || 'Notes'}, p.${p.pageNumber || 1})]:\n${p.chunkText}`)
        .join('\n\n');

      return sendJson(res, 200, {
        topic,
        contextLength: combinedContext.length,
        promptTemplate: `Based strictly on the following study material:\n\n${combinedContext}\n\nGenerate exactly 1 calibrated technical question.`,
      });
    }

    // ------------------------------------------------------------------------
    // Action D: NotebookLM Learning Tools (Summary, Notes, Flashcards, Quiz, Guide)
    // ------------------------------------------------------------------------
    if (action === 'notebook_tool') {
      const toolType = body.tool || 'summary';
      const passages = Array.isArray(body.passages) ? body.passages : [];
      const notebookTitle = (body.notebookTitle || 'Study Notebook').trim();

      if (!passages.length) {
        return sendJson(res, 400, { error: 'Passages from notebook documents are required to generate learning materials.' });
      }

      const citations = passages.slice(0, 6).map((p) => ({
        document_title: p.documentName || p.document_name || p.document_title || 'Document',
        page_number: p.pageNumber || p.page_number || 1,
        snippet: (p.chunkText || p.chunk_text || '').slice(0, 200).trim(),
      }));

      const contextText = passages
        .slice(0, 6)
        .map((p, i) => `[Source ${i + 1}: ${p.documentName || 'Document'}, p.${p.pageNumber || 1}]\n${p.chunkText || p.chunk_text || ''}`)
        .join('\n\n---\n\n');

      let instructions = '';
      if (toolType === 'summary') {
        instructions = 'Generate an Executive Summary of this notebook. Include: 1) High-level overview, 2) Key Pillars/Concepts, 3) Critical Takeaways. Preserve document citations where appropriate.';
      } else if (toolType === 'notes') {
        instructions = 'Generate structured Revision Notes for this notebook. Include concise bullet points, bold key terms, definitions, and technical formulas/tradeoffs with source references.';
      } else if (toolType === 'flashcards') {
        instructions = 'Generate 5 high-yield study flashcards based strictly on the material. Format strictly as JSON array of objects: [{"question": "...", "answer": "...", "topic": "...", "source": "..."}]. No markdown or preamble.';
      } else if (toolType === 'quiz') {
        instructions = 'Generate 3 challenging multiple choice questions based strictly on the material. Format strictly as JSON array of objects: [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "exact correct option string", "explanation": "detailed explanation", "source": "..."}]. No markdown or preamble.';
      } else if (toolType === 'guide') {
        instructions = 'Generate a Comprehensive Study Guide for this notebook. Include: 1) Learning Objectives, 2) Detailed Concept Breakdown, 3) Common Pitfalls & Exam Traps, 4) Quick Review Checklist.';
      }

      return sendJson(res, 200, {
        tool: toolType,
        notebookTitle,
        contextLength: contextText.length,
        contextText,
        citations,
        instructions,
        systemPrompt: `You are PrepMind Notebook AI, an elite technical tutor. You are analyzing documents in the notebook "${notebookTitle}". Base your output strictly on the provided context. If the material does not cover a topic, do not fabricate facts.`,
      });
    }

    return sendJson(res, 400, { error: `Unsupported RAG action: ${action}` });
  } catch (err) {
    console.error('[api/rag] error:', err?.message || err);
    return sendJson(res, 500, { error: err?.message || 'RAG engine error' });
  }
}
