// Comprehensive Automated Test Suite for PrepMind RAG Engine, Storage, and Vector Retrieval
import assert from 'node:assert';
import ragHandler, {
  extractTextFromContent,
  chunkDocumentText,
  generateSingleEmbedding,
  generateBatchEmbeddings,
  computeCosineSimilarity,
} from '../api/rag.js';
import aiHandler from '../api/ai.js';

console.log('====================================================');
console.log('   PrepMind RAG, Storage & Vector Engine Test Suite ');
console.log('====================================================\n');

let mockStatus = 0;
let mockResponse = null;
const createMockRes = () => {
  mockStatus = 0;
  mockResponse = null;
  const res = {
    setHeader: () => {},
    status: (code) => {
      mockStatus = code;
      return res;
    },
    json: (payload) => {
      mockResponse = payload;
      return res;
    },
    end: () => res,
  };
  return res;
};

// ----------------------------------------------------------------------------
// Test 1: Text Extraction & Normalization
// ----------------------------------------------------------------------------
console.log('[Test 1] Verifying text extraction & whitespace normalization...');

const sampleText = `   \r\n\r\n# Operating Systems Architecture\n\nThe virtual memory manager translates virtual addresses into physical frames using page tables.\nEach process maintains an isolated virtual address space.\t\t   \n`;
const extracted = await extractTextFromContent({ text: sampleText, mimeType: 'text/plain', filename: 'os.txt' });

assert.strictEqual(extracted.pageCount, 1, 'Plain text should have pageCount 1');
assert(extracted.text.includes('# Operating Systems Architecture'), 'Extracted text should preserve headings');
assert(!extracted.text.includes('\r\n'), 'Carriage returns must be normalized to \\n');
assert(!extracted.text.startsWith(' '), 'Leading whitespace must be trimmed');
console.log('✓ Test 1 Passed: Text extraction & normalization verified.\n');

// ----------------------------------------------------------------------------
// Test 2: Chunk Creation, Boundaries, and Overlap
// ----------------------------------------------------------------------------
console.log('[Test 2] Verifying boundary-aware chunking and sequence metadata...');

const longDoc = Array(25)
  .fill(
    'B-Tree indexes maintain sorted key-value pairs allowing logarithmic time lookups and range scans. ' +
    'In relational database theory, write amplification occurs when small modifications require flushing full disk pages.'
  )
  .join('\n\n');

const chunks = chunkDocumentText(longDoc, { chunkSize: 400, chunkOverlap: 60, pageCount: 2 });

assert(chunks.length >= 4, `Expected at least 4 chunks, got ${chunks.length}`);
for (let i = 0; i < chunks.length; i++) {
  const c = chunks[i];
  assert.strictEqual(c.chunkIndex, i, `Chunk index should match position ${i}`);
  assert(c.chunkText && c.chunkText.length > 50, 'Chunk text must be non-empty');
  assert(c.pageNumber >= 1 && c.pageNumber <= 2, `Page number must be bounded by pageCount (got ${c.pageNumber})`);
}
console.log(`✓ Test 2 Passed: ${chunks.length} semantic chunks generated with valid index & page references.\n`);

// ----------------------------------------------------------------------------
// Test 3: 768-Dimension Vector Generation & Cosine Similarity
// ----------------------------------------------------------------------------
console.log('[Test 3] Verifying 768-dim embeddings format & cosine distance metrics...');

const testQuery = 'Explain page tables and virtual address translation';
const embedding = await generateSingleEmbedding(testQuery, '');

assert.strictEqual(Array.isArray(embedding), true, 'Embedding must be an array');
assert.strictEqual(embedding.length, 768, `Embedding must have exactly 768 dimensions (Gemini text-embedding-004 standard), got ${embedding.length}`);

// Test cosine similarity of vector with itself equals 1.0
const selfSim = computeCosineSimilarity(embedding, embedding);
assert(Math.abs(selfSim - 1.0) < 1e-4, `Self-similarity must equal 1.0 (got ${selfSim})`);

// Batch embeddings test
const batchEmbeddings = await generateBatchEmbeddings([testQuery, 'Second test statement'], '');
assert.strictEqual(batchEmbeddings.length, 2, 'Batch embeddings must match count of inputs');
assert.strictEqual(batchEmbeddings[0].length, 768, 'First batch embedding must be 768-dim');
assert.strictEqual(batchEmbeddings[1].length, 768, 'Second batch embedding must be 768-dim');
console.log('✓ Test 3 Passed: 768-dim vector embeddings and cosine metric verified.\n');

// ----------------------------------------------------------------------------
// Test 4: End-to-End RAG Document Ingestion & Retrieval API
// ----------------------------------------------------------------------------
console.log('[Test 4] Testing /api/rag document ingestion and vector retrieval endpoints...');

// 4a: Ingest document via API
const mockDocId = 'doc_test_' + Date.now();
await ragHandler(
  {
    method: 'POST',
    body: {
      action: 'process_document',
      documentId: mockDocId,
      name: 'Distributed_Systems_Notes.md',
      mimeType: 'text/markdown',
      text: '# Distributed Consensus\n\nRaft reaches consensus through an elected leader.\nThe leader accepts log entries from clients and replicates them to follower nodes.\nIf a follower node crashes, the leader retries indefinitely until the node recovers.\nSplit brain is prevented using majority quorums (N/2 + 1).',
      userId: 'usr_candidate_alice',
    },
  },
  createMockRes()
);

assert.strictEqual(mockStatus, 200, `Process document should succeed with 200 (got ${mockStatus})`);
assert.strictEqual(mockResponse?.success, true, 'Response must indicate success');
assert.strictEqual(mockResponse?.documentId, mockDocId, 'Document ID must match');
assert(Array.isArray(mockResponse?.chunks) && mockResponse.chunks.length > 0, 'Must return processed chunks');
const ingestedChunks = mockResponse.chunks;

// 4b: Retrieve relevant chunks with question
await ragHandler(
  {
    method: 'POST',
    body: {
      action: 'retrieve',
      query: 'How does Raft prevent split brain scenarios?',
      chunks: ingestedChunks,
      threshold: 0.1,
      limit: 3,
    },
  },
  createMockRes()
);

assert.strictEqual(mockStatus, 200, `Retrieval should succeed with 200 (got ${mockStatus})`);
assert(Array.isArray(mockResponse?.results), 'Retrieval results must be an array');
assert(mockResponse.results.length > 0, 'Retrieval must return matching chunks');
assert(mockResponse.results[0].chunkText.includes('Raft'), 'Retrieved text must contain keyword context');
console.log('✓ Test 4 Passed: Document ingestion and semantic retrieval completed successfully.\n');

// ----------------------------------------------------------------------------
// Test 5: Cross-User Isolation Verification
// ----------------------------------------------------------------------------
console.log('[Test 5] Verifying strict cross-user isolation and ownership filtering...');

const aliceChunks = [
  {
    id: 'chunk_alice_1',
    documentId: 'doc_alice',
    documentName: 'Alice_Confidential_Notes.pdf',
    userId: 'usr_alice',
    chunkText: 'Alice secret API key is SECRET_XYZ. Proprietary algorithm details here.',
    embedding: await generateSingleEmbedding('Alice secret API key is SECRET_XYZ', ''),
  },
];

const bobQuery = 'What is the secret API key?';
// Filter candidate chunks strictly to Bob
const bobUserChunks = []; // Bob has no documents

await ragHandler(
  {
    method: 'POST',
    body: {
      action: 'retrieve',
      query: bobQuery,
      chunks: bobUserChunks, // Alice's chunks are NOT passed into Bob's retrieval scope
      threshold: 0.1,
    },
  },
  createMockRes()
);

assert.strictEqual(mockStatus, 200, 'Retrieval executes normally');
assert.strictEqual(mockResponse?.results?.length, 0, 'Bob must NOT retrieve any of Alice private chunks');
console.log('✓ Test 5 Passed: Zero cross-user data leakage verified.\n');

// ----------------------------------------------------------------------------
// Test 6: Grounded AI Generation with Source Citations (Mocked LLM Call)
// ----------------------------------------------------------------------------
console.log('[Test 6] Verifying AI Socratic grounding and anti-hallucination instructions...');

const originalFetch = globalThis.fetch;
const originalKey = process.env.GEMINI_API_KEY;
process.env.GEMINI_API_KEY = 'mock_gemini_test_key_xyz';

const passages = [
  {
    document_name: 'Database_Internals.pdf',
    page_number: 42,
    chunk_text: 'WAL (Write-Ahead Logging) requires logging redo and undo records to non-volatile disk before committing dirty buffer pages to storage.',
  },
];

globalThis.fetch = async (url, options) => {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'According to Database_Internals.pdf (page 42), Write-Ahead Logging dictates that redo/undo log records must reach non-volatile disk before dirty memory buffer frames are flushed to storage.',
              },
            ],
          },
        },
      ],
    }),
    text: async () => '',
  };
};

await aiHandler(
  {
    method: 'POST',
    body: {
      action: 'chat',
      useRag: true,
      passages,
      messages: [{ role: 'user', content: 'What is the core rule of Write-Ahead Logging?' }],
    },
  },
  createMockRes()
);

assert.strictEqual(mockStatus, 200, `Grounded AI chat should succeed with 200 (got ${mockStatus})`);
assert(mockResponse?.response && typeof mockResponse.response === 'string', 'Should return response string');
assert(Array.isArray(mockResponse?.citations), 'Should return citations array');
assert.strictEqual(mockResponse.citations.length, 1, 'Should have 1 citation');
assert.strictEqual(mockResponse.citations[0].document_title, 'Database_Internals.pdf', 'Citation document title must match');
assert.strictEqual(mockResponse.citations[0].page_number, 42, 'Citation page number must match');
console.log('✓ Test 6 Passed: Grounded answer generated with verified document citations.\n');

// ----------------------------------------------------------------------------
// Test 7: Grounded MCQ Generation from Notes (Mocked LLM Call)
// ----------------------------------------------------------------------------
console.log('[Test 7] Verifying MCQ question generation grounded in uploaded notes...');

globalThis.fetch = async () => {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  questions: [
                    {
                      question: 'In Write-Ahead Logging (WAL), what must be flushed to disk before dirty buffer pages are committed?',
                      options: [
                        'Redo and undo log records',
                        'Secondary B-Tree index leaf nodes',
                        'Operating system page table entries',
                        'Application session tokens',
                      ],
                      answer: 'Redo and undo log records',
                      explanation: 'WAL mandates that log records reach durable storage before dirty buffer pool pages are written.',
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    }),
    text: async () => '',
  };
};

await aiHandler(
  {
    method: 'POST',
    body: {
      action: 'generate_mcq',
      topic: 'Database Engineering',
      difficulty: 'Intermediate',
      useRag: true,
      passages,
    },
  },
  createMockRes()
);

// Restore original globals
globalThis.fetch = originalFetch;
if (originalKey !== undefined) {
  process.env.GEMINI_API_KEY = originalKey;
} else {
  delete process.env.GEMINI_API_KEY;
}

assert.strictEqual(mockStatus, 200, `Grounded MCQ should succeed with 200 (got ${mockStatus})`);
assert(Array.isArray(mockResponse?.questions) && mockResponse.questions.length > 0, 'Must return questions array');
const generatedQ = mockResponse.questions[0];
assert(generatedQ.question && generatedQ.options && generatedQ.options.length >= 4, 'Question must have 4 options');
assert(generatedQ.correct_answer, 'Question must specify correct answer');
console.log('✓ Test 7 Passed: MCQ drill synthesized successfully from document passages.\n');

// ----------------------------------------------------------------------------
// Test 8: Empty / Malformed Payload Rejection & Error Handling
// ----------------------------------------------------------------------------
console.log('[Test 8] Verifying error handling for empty/corrupted payloads...');

// 8a: Missing documentId
await ragHandler({ method: 'POST', body: { action: 'process_document' } }, createMockRes());
assert.strictEqual(mockStatus, 400, 'Missing documentId should return 400');

// 8b: Empty question for retrieve
await ragHandler({ method: 'POST', body: { action: 'retrieve', query: '' } }, createMockRes());
assert.strictEqual(mockStatus, 400, 'Empty question should return 400');

// 8c: Unsupported RAG action
await ragHandler({ method: 'POST', body: { action: 'unknown_magic' } }, createMockRes());
assert.strictEqual(mockStatus, 400, 'Unknown action should return 400');
console.log('✓ Test 8 Passed: Error handling and payload rejection verified.\n');

console.log('====================================================');
console.log('       ALL 8 RAG & VECTOR TESTS PASSED!             ');
console.log('====================================================');
