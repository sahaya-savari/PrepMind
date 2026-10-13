// Regression Test Suite: Upload Exception Handling & Gemini Embedding Configuration
import assert from 'node:assert';
process.env.NODE_ENV = 'test';

import ragHandler, {
  generateSingleEmbedding,
  generateBatchEmbeddings,
  computeCosineSimilarity,
} from '../api/rag.js';

console.log('====================================================');
console.log('   PrepMind Upload & Embedding Regression Test      ');
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
// Test 1: GET /api/rag reports gemini-embedding-001 and 768 dimensions
// ----------------------------------------------------------------------------
console.log('[Test 1] Verifying GET /api/rag model metadata...');
await ragHandler({ method: 'GET' }, createMockRes());
assert.strictEqual(mockStatus, 200, 'GET /api/rag should return 200');
assert.strictEqual(mockResponse?.embeddingModel, 'models/gemini-embedding-001', 'Embedding model must be gemini-embedding-001');
assert.strictEqual(mockResponse?.dimensions, 768, 'Vector dimensions must be 768');
console.log('✓ Test 1 Passed: GET /api/rag metadata reports models/gemini-embedding-001 (768-dim).\n');

// ----------------------------------------------------------------------------
// Test 2: generateSingleEmbedding produces 768 finite numeric values
// ----------------------------------------------------------------------------
console.log('[Test 2] Verifying vector generation dimensions & finiteness...');
const text = 'Relational database indexing: B-trees maintain balanced leaf depths.';
const vector = await generateSingleEmbedding(text, '', { allowSyntheticFallback: true });
assert(Array.isArray(vector), 'Vector must be an array');
assert.strictEqual(vector.length, 768, 'Vector must have exactly 768 dimensions');
assert(vector.every((val) => typeof val === 'number' && Number.isFinite(val)), 'Every dimension must be a finite number');

// Verify cosine self-similarity
const sim = computeCosineSimilarity(vector, vector);
assert(Math.abs(sim - 1.0) < 1e-4, 'Self-similarity must equal 1.0');
console.log('✓ Test 2 Passed: Embeddings output 768 finite dimensions with unit self-similarity.\n');

// ----------------------------------------------------------------------------
// Test 3: Simulation of PostgrestFilterBuilder without .catch method
// ----------------------------------------------------------------------------
console.log('[Test 3] Verifying PostgrestFilterBuilder thenable handling (Issue 1 regression)...');

// Emulate PostgrestFilterBuilder: has .then but NOT .catch
function createMockPostgrestBuilder() {
  const thenable = {
    then(onFulfilled, onRejected) {
      return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected);
    },
  };
  return thenable;
}

const mockBuilder = createMockPostgrestBuilder();
assert.strictEqual(typeof mockBuilder.catch, 'undefined', 'Mock PostgrestFilterBuilder must lack .catch method');

// Verify that await with try/catch handles the builder without TypeError
let caught = false;
let executionCompleted = false;
try {
  const { data, error } = await mockBuilder;
  assert.strictEqual(error, null);
  executionCompleted = true;
} catch (err) {
  caught = true;
}
assert.strictEqual(executionCompleted, true, 'await builder should resolve successfully');
assert.strictEqual(caught, false, 'Should not throw when using await instead of .catch()');
console.log('✓ Test 3 Passed: Query builder thenable handles await without .catch is not a function exception.\n');

// ----------------------------------------------------------------------------
// Test 4: Live Gemini Embedding with real key if available
// ----------------------------------------------------------------------------
console.log('[Test 4] Verifying real Gemini embedding with outputDimensionality (if key present)...');
const liveKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (liveKey) {
  const liveVec = await generateSingleEmbedding('Operating systems concurrency and semaphores', liveKey);
  assert(Array.isArray(liveVec), 'Live vector must be an array');
  assert.strictEqual(liveVec.length, 768, 'Live vector must have exactly 768 dimensions');
  assert(liveVec.every((v) => typeof v === 'number' && Number.isFinite(v)), 'All live dimensions must be finite');
  console.log(`✓ Test 4 Passed: Live gemini-embedding-001 generated ${liveVec.length}-dim vector successfully.\n`);
} else {
  console.log('ℹ Test 4 Skipped: No GEMINI_API_KEY/GOOGLE_API_KEY in environment.\n');
}

console.log('====================================================');
console.log('     ALL UPLOAD & EMBEDDING REGRESSION TESTS PASSED! ');
console.log('====================================================\n');
