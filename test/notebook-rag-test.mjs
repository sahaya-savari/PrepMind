// Comprehensive Automated Test Suite for PrepMind Private Notebooks & Grounded Learning Tools
import assert from 'node:assert';
process.env.NODE_ENV = 'test';

import ragHandler from '../api/rag.js';

console.log('====================================================');
console.log('   PrepMind Private Notebooks & Grounding Test Suite');
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
// Test 1: Document Ingestion with Notebook Scoping
// ----------------------------------------------------------------------------
console.log('[Test 1] Verifying document processing with notebookId scoping...');

const userA = '00000000-0000-4000-8000-000000000001';
const notebookA1 = 'nb_aws_solutions_architect';
const notebookA2 = 'nb_gate_algorithms';

const awsNotes = `AWS DynamoDB is a fully managed NoSQL key-value and document database.
DynamoDB provides single-digit millisecond latency at any scale.
Global Tables replicate your DynamoDB tables automatically across your choice of AWS Regions.
Partition keys determine the partition on which items are stored using an internal hash function.`;

const gateNotes = `Dijkstra algorithm finds the shortest path from a single source node in a directed graph with non-negative edge weights.
The time complexity of Dijkstra using a binary min-heap is O((V + E) log V).
Bellman-Ford algorithm handles graphs with negative edge weights in O(V * E) time complexity.`;

// Ingest doc into notebook A1
const req1 = {
  method: 'POST',
  body: {
    action: 'process_document',
    documentId: 'doc_aws_01',
    name: 'AWS_DynamoDB_Core.txt',
    mimeType: 'text/plain',
    text: awsNotes,
    userId: userA,
    notebookId: notebookA1,
  },
};
const res1 = createMockRes();
await ragHandler(req1, res1);

assert.strictEqual(mockStatus, 200, 'Ingestion should succeed with status 200');
assert(mockResponse.success, 'Response must indicate success');
assert.strictEqual(mockResponse.notebookId, notebookA1, 'Response must retain notebookId');
assert(Array.isArray(mockResponse.chunks) && mockResponse.chunks.length > 0, 'Must produce chunks');

const awsChunks = mockResponse.chunks.map((c) => ({
  id: c.id,
  document_id: 'doc_aws_01',
  document_name: 'AWS_DynamoDB_Core.txt',
  chunk_text: c.chunkText,
  chunk_index: c.chunkIndex,
  page_number: c.pageNumber,
  embedding: c.embedding,
  notebook_id: notebookA1,
  user_id: userA,
}));

// Ingest doc into notebook A2
const req2 = {
  method: 'POST',
  body: {
    action: 'process_document',
    documentId: 'doc_gate_01',
    name: 'GATE_Graph_Algorithms.txt',
    mimeType: 'text/plain',
    text: gateNotes,
    userId: userA,
    notebookId: notebookA2,
  },
};
const res2 = createMockRes();
await ragHandler(req2, res2);

assert.strictEqual(mockStatus, 200, 'Ingestion should succeed with status 200');
assert.strictEqual(mockResponse.notebookId, notebookA2, 'Response must retain notebookId');

const gateChunks = mockResponse.chunks.map((c) => ({
  id: c.id,
  document_id: 'doc_gate_01',
  document_name: 'GATE_Graph_Algorithms.txt',
  chunk_text: c.chunkText,
  chunk_index: c.chunkIndex,
  page_number: c.pageNumber,
  embedding: c.embedding,
  notebook_id: notebookA2,
  user_id: userA,
}));

console.log('✓ Test 1 Passed: Ingestion correctly scoped to notebook IDs.\n');

// ----------------------------------------------------------------------------
// Test 2: Semantic Retrieval Filtered Strictly by Notebook ID
// ----------------------------------------------------------------------------
console.log('[Test 2] Verifying vector retrieval filtered strictly by notebookId...');

const combinedChunks = [...awsChunks, ...gateChunks];

// Query with notebookA1 filter
const retrieveReq1 = {
  method: 'POST',
  body: {
    action: 'retrieve',
    query: 'What algorithm handles graph shortest paths?',
    chunks: combinedChunks,
    notebookId: notebookA1, // Asking a graph question inside the AWS notebook
    threshold: 0.1,
  },
};
const retrieveRes1 = createMockRes();
await ragHandler(retrieveReq1, retrieveRes1);

assert.strictEqual(mockStatus, 200);
// Crucial: All results MUST belong to notebookA1 only!
for (const item of mockResponse.results || []) {
  assert.strictEqual(item.notebookId, notebookA1, 'Result must match notebookId filter');
  const match = combinedChunks.find((c) => c.id === item.id);
  assert(match, 'Must find matching chunk');
  assert.strictEqual(match.notebook_id, notebookA1, 'Matched chunk must belong to notebookA1');
}

// Query with notebookA2 filter
const retrieveReq2 = {
  method: 'POST',
  body: {
    action: 'retrieve',
    query: 'What algorithm handles graph shortest paths?',
    chunks: combinedChunks,
    notebookId: notebookA2,
    threshold: 0.1,
  },
};
const retrieveRes2 = createMockRes();
await ragHandler(retrieveReq2, retrieveRes2);

assert.strictEqual(mockStatus, 200);
assert(mockResponse.results.length > 0, 'Should find graph matches in notebookA2');
for (const item of mockResponse.results) {
  assert.strictEqual(item.notebookId, notebookA2, 'Result must match notebookId filter');
  const match = combinedChunks.find((c) => c.id === item.id);
  assert(match, 'Must find matching chunk');
  assert.strictEqual(match.notebook_id, notebookA2, 'Matched chunk must belong to notebookA2');
}

console.log('✓ Test 2 Passed: Semantic retrieval strictly isolates chunks by notebookId.\n');

// ----------------------------------------------------------------------------
// Test 3: Multi-Tenant Cross-User Isolation in Notebook Chunks
// ----------------------------------------------------------------------------
console.log('[Test 3] Verifying multi-tenant isolation across different users in notebooks...');

const userB = '00000000-0000-4000-8000-000000000002';
const userBChunks = [
  {
    id: 'user_b_chunk_01',
    user_id: userB,
    notebook_id: 'nb_user_b',
    document_id: 'doc_user_b',
    document_name: 'Confidential_UserB.txt',
    chunk_text: 'Confidential engineering patent secrets belonging to user B.',
    embedding: awsChunks[0].embedding,
  },
];

const crossTenantReq = {
  method: 'POST',
  body: {
    action: 'retrieve',
    query: 'patent secrets',
    chunks: userBChunks,
    userId: userA, // User A querying User B's chunks
  },
};
const crossTenantRes = createMockRes();
await ragHandler(crossTenantReq, crossTenantRes);

assert.strictEqual(mockStatus, 200);
assert.strictEqual(mockResponse.results.length, 0, 'User A must NEVER retrieve User B chunks');

console.log('✓ Test 3 Passed: Zero cross-tenant data leakage between users.\n');

// ----------------------------------------------------------------------------
// Test 4: Notebook Learning Studio Grounded Synthesis Tools
// ----------------------------------------------------------------------------
console.log('[Test 4] Verifying 1-click grounded learning tools synthesis...');

const samplePassages = [
  {
    id: 'p1',
    document_name: 'Database_Internals.pdf',
    page_number: 14,
    chunk_text: 'WAL (Write-Ahead Logging) enforces that changes are recorded in stable storage before being applied to the database pages.',
  },
  {
    id: 'p2',
    document_name: 'Database_Internals.pdf',
    page_number: 22,
    chunk_text: 'ACID guarantees Atomicity, Consistency, Isolation, and Durability across distributed transaction commits.',
  },
];

const tools = ['summary', 'notes', 'flashcards', 'quiz', 'guide'];

for (const tool of tools) {
  const toolReq = {
    method: 'POST',
    body: {
      action: 'notebook_tool',
      tool,
      notebookTitle: 'Distributed Systems & Databases',
      passages: samplePassages,
    },
  };
  const toolRes = createMockRes();
  await ragHandler(toolReq, toolRes);

  assert.strictEqual(mockStatus, 200, `Tool ${tool} must succeed with status 200`);
  assert.strictEqual(mockResponse.tool, tool, `Response must match tool ${tool}`);
  assert(mockResponse.systemPrompt.includes('anti-hallucination') || mockResponse.systemPrompt.includes('PrepMind'), 'Must include grounded system prompt');
  assert(mockResponse.instructions.length > 20, 'Must provide structured generation instructions');
  assert(mockResponse.contextText.includes('Write-Ahead Logging'), 'Context must include study passages');
  assert.strictEqual(mockResponse.citations.length, 2, 'Must extract verified citations from passages');
  assert.strictEqual(mockResponse.citations[0].document_title, 'Database_Internals.pdf');
}

console.log('✓ Test 4 Passed: All 5 Studio tools generate grounded synthesis contexts & citations.\n');

// ----------------------------------------------------------------------------
// Test 5: Rejection of Invalid / Empty Tool Requests
// ----------------------------------------------------------------------------
console.log('[Test 5] Verifying error handling for empty/invalid tool requests...');

const emptyToolReq = {
  method: 'POST',
  body: {
    action: 'notebook_tool',
    tool: 'quiz',
    notebookTitle: 'Empty Notebook',
    passages: [], // Empty passages!
  },
};
const emptyToolRes = createMockRes();
await ragHandler(emptyToolReq, emptyToolRes);

assert.strictEqual(mockStatus, 400, 'Must reject tool generation when passages are empty');
assert(mockResponse.error.toLowerCase().includes('passages'), 'Must indicate missing passages');

console.log('✓ Test 5 Passed: Empty/invalid tool requests safely rejected with 400.\n');

// ----------------------------------------------------------------------------
// Test 6: Backward Compatibility without notebookId
// ----------------------------------------------------------------------------
console.log('[Test 6] Verifying backward compatibility for retrieval without notebookId...');

const legacyReq = {
  method: 'POST',
  body: {
    action: 'retrieve',
    query: 'DynamoDB',
    chunks: awsChunks,
    // No notebookId provided
  },
};
const legacyRes = createMockRes();
await ragHandler(legacyReq, legacyRes);

assert.strictEqual(mockStatus, 200);
assert(mockResponse.results.length > 0, 'Retrieval without notebookId must succeed');

console.log('✓ Test 6 Passed: Full backwards compatibility maintained.\n');

console.log('====================================================');
console.log('    ALL 6 NOTEBOOK & GROUNDING TESTS PASSED!        ');
console.log('====================================================\n');
