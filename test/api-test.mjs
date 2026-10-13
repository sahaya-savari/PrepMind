// Comprehensive Node test suite for PrepMind AI Provider Orchestration
import assert from 'node:assert';
import { getFallbackQuestions } from '../app/src/data/fallbackQuestions.ts';
import handler from '../api/ai.js';

console.log('====================================================');
console.log('   PrepMind AI Provider & Orchestration Test Suite  ');
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

// ----------------------------------------------------
// Test 1: Fallback Questions Determinism & Integrity
// ----------------------------------------------------
console.log('[Test 1] Verifying offline fallback question bank structure...');
const testTopics = ['Data Structures', 'Quantitative Aptitude', 'Algorithms', 'General', 'Python'];

for (const t of testTopics) {
  const q = getFallbackQuestions(t, 'Intermediate');
  assert(q.question && typeof q.question === 'string', `Question should have valid text for ${t}`);
  assert(Array.isArray(q.options) && q.options.length >= 4, `Question should have at least 4 options for ${t}`);
  assert(q.correct_answer && typeof q.correct_answer === 'string', `Question should have a correct answer for ${t}`);
  assert(q.options.includes(q.correct_answer), `Correct answer should be present in options for ${t}`);
  assert(q.explanation && typeof q.explanation === 'string', `Question should have an explanation for ${t}`);
  assert.strictEqual(q.is_offline_fallback, true, 'Question must be explicitly flagged as offline fallback');
}
console.log('✓ Test 1 Passed: Offline fallback question bank is structurally sound.\n');

// ----------------------------------------------------
// Test 2: Input Validation & Malformed Payload Rejection
// ----------------------------------------------------
console.log('[Test 2] Verifying robust input validation & rejection of malformed requests...');

// 2a: Empty topic for MCQ
await handler({ method: 'POST', body: { action: 'generate_mcq', topic: '' } }, createMockRes());
assert.strictEqual(mockStatus, 400, 'Empty topic should yield 400');
assert(mockResponse?.error?.includes('Topic is required'), 'Should return clear error for missing topic');

// 2a-ii: Whitespace-only topic for MCQ
await handler({ method: 'POST', body: { action: 'generate_mcq', topic: '     ' } }, createMockRes());
assert.strictEqual(mockStatus, 400, 'Whitespace-only topic should yield 400');

// 2b: Empty messages for Chat
await handler({ method: 'POST', body: { action: 'chat', messages: [] } }, createMockRes());
assert.strictEqual(mockStatus, 400, 'Empty messages should yield 400');

// 2b-ii: Messages with only empty/whitespace content
await handler({ method: 'POST', body: { action: 'chat', messages: [{ role: 'user', content: '   ' }] } }, createMockRes());
assert.strictEqual(mockStatus, 400, 'Whitespace-only chat message should yield 400');

// 2c: Empty answers for Evaluation
await handler({ method: 'POST', body: { action: 'evaluate', answers: [] } }, createMockRes());
assert.strictEqual(mockStatus, 400, 'Empty answers should yield 400');

// 2c-ii: Non-array answers for Evaluation
await handler({ method: 'POST', body: { action: 'evaluate', answers: 'invalid' } }, createMockRes());
assert.strictEqual(mockStatus, 400, 'Non-array answers should yield 400');

// 2d: Unsupported action
await handler({ method: 'POST', body: { action: 'unsupported_test_action' } }, createMockRes());
assert.strictEqual(mockStatus, 400, 'Unsupported action should yield 400');

// 2e: Unsupported HTTP method
await handler({ method: 'PUT', body: {} }, createMockRes());
assert.strictEqual(mockStatus, 405, 'Non-GET/POST/OPTIONS should yield 405');

console.log('✓ Test 2 Passed: Malformed, whitespace-only, and invalid requests safely rejected with 400/405.\n');

// ----------------------------------------------------
// Test 3: Deterministic Answer Evaluation & Scoring
// ----------------------------------------------------
console.log('[Test 3] Verifying answer evaluation mathematics & detail schema...');
await handler({
  method: 'POST',
  body: {
    action: 'evaluate',
    answers: [
      { answer: 'Queue', correct_answer: 'Queue', explanation: 'FIFO' },
      { answer: 'Stack', correct_answer: 'Queue', explanation: 'FIFO' },
      { answer: 'Graph', correct_answer: 'Graph', explanation: 'Nodes and edges' },
    ],
  },
}, createMockRes());

assert.strictEqual(mockStatus, 200, 'Evaluation should return status 200');
assert.strictEqual(mockResponse.score, 67, 'Evaluation score should be 67% (2 out of 3)');
assert.strictEqual(mockResponse.explanations.length, 3, 'Should return 3 explanations');
assert(Array.isArray(mockResponse.results) && mockResponse.results.length === 3, 'Should return structured results array');
assert.strictEqual(mockResponse.results[0].correct, true, 'Result 1 should be correct');
assert.strictEqual(mockResponse.results[1].correct, false, 'Result 2 should be incorrect');
console.log('✓ Test 3 Passed: Evaluation accurately computes scores and returns rich details.\n');

// ----------------------------------------------------
// Test 4: Health Check & Provider Status Inspection
// ----------------------------------------------------
console.log('[Test 4] Verifying GET /api/ai health check and provider enumeration...');
await handler({ method: 'GET' }, createMockRes());
assert.strictEqual(mockStatus, 200, 'Health check should return status 200');
assert.strictEqual(mockResponse.status, 'ok', 'Status should be ok');
assert(typeof mockResponse.providers === 'object', 'Providers mapping should be returned');
assert(Array.isArray(mockResponse.cascadeOrder), 'Cascade order list should be returned');
console.log(`✓ Test 4 Passed: Health check returns status ok (Primary: ${mockResponse.primaryProvider}, Active: ${mockResponse.cascadeOrder.join(' -> ')}).\n`);

// ----------------------------------------------------
// Test 5: Live Provider Execution (Groq / NVIDIA / Gemini)
// ----------------------------------------------------
console.log('[Test 5] Verifying live provider request execution...');

const hasAnyKey = Boolean(process.env.GROQ_API_KEY || process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY);

if (hasAnyKey) {
  // Test live Chat
  await handler({
    method: 'POST',
    body: {
      action: 'chat',
      messages: [{ role: 'user', content: 'Say "PrepMind verified" in 3 words or fewer' }],
    },
  }, createMockRes());

  assert.strictEqual(mockStatus, 200, 'Live chat request should succeed with 200');
  assert(mockResponse.response && typeof mockResponse.response === 'string', 'Should return response string');
  assert(mockResponse.provider, 'Should return provider identifier');
  console.log(`✓ Test 5a Passed: Live chat succeeded via provider [${mockResponse.provider}] (${mockResponse.model}).`);

  // Test live MCQ generation with schema validation
  await handler({
    method: 'POST',
    body: {
      action: 'generate_mcq',
      topic: 'Binary Search',
      difficulty: 'Beginner',
    },
  }, createMockRes());

  assert.strictEqual(mockStatus, 200, 'Live MCQ request should succeed with 200');
  assert(Array.isArray(mockResponse.questions) && mockResponse.questions.length >= 1, 'Should return validated questions array');
  const generatedQ = mockResponse.questions[0];
  assert(generatedQ.question, 'Question must have non-empty prompt');
  assert(Array.isArray(generatedQ.options) && generatedQ.options.length >= 2, 'Question must have valid options');
  assert(generatedQ.answer, 'Question must have an answer');
  console.log(`✓ Test 5b Passed: Live MCQ generation validated via provider [${mockResponse.provider}] (${mockResponse.model}).\n`);
} else {
  console.log('Skipping live provider tests (no keys present in current execution environment).\n');
}

// ----------------------------------------------------
// Test 6: Graceful 503 Handling When Keys Are Unset
// ----------------------------------------------------
console.log('[Test 6] Verifying graceful 503 response when all provider credentials are absent...');
const savedGroq = process.env.GROQ_API_KEY;
const savedNvidia = process.env.NVIDIA_API_KEY;
const savedGemini = process.env.GEMINI_API_KEY;

delete process.env.GROQ_API_KEY;
delete process.env.NVIDIA_API_KEY;
delete process.env.GEMINI_API_KEY;

await handler({
  method: 'POST',
  body: { action: 'chat', messages: [{ role: 'user', content: 'Hello' }] },
}, createMockRes());

assert.strictEqual(mockStatus, 503, 'Should return 503 when no AI providers are configured');
assert(mockResponse?.error?.includes('unconfigured'), 'Error message should clearly state unconfigured');
console.log('✓ Test 6 Passed: Unconfigured credentials gracefully yield clean 503 response.\n');

// ----------------------------------------------------
// Test 7: Bring Your Own Key (BYOK) Validation & Safety
// ----------------------------------------------------
console.log('[Test 7] Verifying Bring Your Own Key (BYOK) validation & safety...');

// 7a: Missing BYOK credentials for test_connection
await handler({
  method: 'POST',
  body: { action: 'test_connection' },
}, createMockRes());
assert.strictEqual(mockStatus, 400, 'test_connection without BYOK credentials must yield 400');
assert(mockResponse?.error?.includes('Missing BYOK'), 'Should return clear error for missing BYOK credentials');

// 7b: Unsupported BYOK provider
await handler({
  method: 'POST',
  headers: {
    'x-byok-provider': 'unsupported_provider',
    'x-byok-api-key': 'test-key',
  },
  body: { action: 'test_connection' },
}, createMockRes());
assert.strictEqual(mockStatus, 400, 'Unsupported BYOK provider must yield 400');
assert(mockResponse?.error?.includes('Unsupported BYOK provider'), 'Should list supported providers');

// 7c: BYOK simulated invalid credentials rejection (does not leak key in response)
await handler({
  method: 'POST',
  headers: {
    'x-byok-provider': 'groq',
    'x-byok-api-key': 'invalid_secret_key_12345',
  },
  body: { action: 'test_connection' },
}, createMockRes());
assert.strictEqual(mockStatus, 400, 'Invalid credentials must return 400');
assert(!JSON.stringify(mockResponse).includes('invalid_secret_key_12345'), 'Response must never leak raw API key');

console.log('✓ Test 7 Passed: BYOK credentials validation and leak-prevention verified.\n');

// Restore keys for subsequent operations
if (savedGroq) process.env.GROQ_API_KEY = savedGroq;
if (savedNvidia) process.env.NVIDIA_API_KEY = savedNvidia;
if (savedGemini) process.env.GEMINI_API_KEY = savedGemini;

console.log('====================================================');
console.log('     All 7 Test Suites Passed Successfully!         ');
console.log('====================================================\n');
