# PrepMind AI — API Reference & Schema Documentation

This document describes all API endpoints, request schemas, response formats, and error codes across the PrepMind AI platform.

---

## 📑 Overview

PrepMind AI exposes two primary API interfaces:
1. **Serverless API (`/api/ai.js` / `/app/api/ai.js`)**: Production proxy handling AI generation, Socratic tutoring chat, and deterministic answer scoring.
2. **Express REST API (`/server/server.js`)**: Standalone backend providing authenticated endpoints, rate-limiting, and Supabase database proxies.

---

## 1. Serverless API (`/api/ai`)

### Base URL
- Production: `https://prep-weblearning.vercel.app/api/ai`
- Local Development: `http://localhost:5000/api/ai` *(via `npm run server:dev` or `npm run server`)*

---

### Endpoint: Health Check
Checks provider availability, health status, and configured fallback cascades.

- **Method**: `GET`
- **Path**: `/api/ai`
- **Headers**: None required

#### Success Response (`200 OK`)
```json
{
  "status": "ok",
  "providers": {
    "primary": "groq",
    "active": ["groq", "nvidia", "gemini"]
  },
  "timestamp": "2026-10-12T00:00:00.000Z"
}
```

---

### Endpoint: Generate Practice MCQ
Generates an exam-ready multiple-choice question tailored to a topic and difficulty level.

- **Method**: `POST`
- **Path**: `/api/ai`
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "action": "generate_mcq",
  "topic": "Process Scheduling",
  "difficulty": "Intermediate"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `action` | `string` | **Yes** | Must be `"generate_mcq"` |
| `topic` | `string` | **Yes** | The exam subject or syllabus subtopic |
| `difficulty` | `string` | No | `"Beginner"`, `"Intermediate"`, or `"Advanced"` (default: `"Intermediate"`) |

#### Success Response (`200 OK`)
```json
{
  "question": "Which of the following scheduling algorithms is strictly non-preemptive?",
  "options": [
    "Round Robin",
    "Shortest Remaining Time First",
    "First-Come, First-Served",
    "Priority Scheduling with Preemption"
  ],
  "answer": "First-Come, First-Served",
  "explanation": "First-Come, First-Served (FCFS) executes processes in the exact order they arrive without interrupting running tasks."
}
```

---

### Endpoint: AI Study Tutor (Chat)
Sends user doubts or conceptual questions to the Socratic study tutor.

- **Method**: `POST`
- **Path**: `/api/ai`
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "action": "chat",
  "message": "Can you explain the difference between a process and a thread in simple terms?",
  "history": [
    { "role": "user", "content": "What is multitasking?" },
    { "role": "assistant", "content": "Multitasking is the ability of an OS to execute multiple tasks concurrently." }
  ]
}
```

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `action` | `string` | **Yes** | Must be `"chat"` |
| `message` | `string` | **Yes** | The user's query or doubt |
| `history` | `array` | No | List of prior message turns `[{ role, content }]` |

#### Success Response (`200 OK`)
```json
{
  "response": "A **process** is an independent executing program with its own memory space...\n\nA **thread** is a lightweight unit of execution within that process sharing the same address space.",
  "provider": "groq"
}
```

---

### Endpoint: Evaluate Answers
Computes scores and returns detailed solution analysis without invoking upstream LLM quotas.

- **Method**: `POST`
- **Path**: `/api/ai`
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "action": "evaluate",
  "answers": [
    {
      "question": "What is 2 + 2?",
      "selected": "4",
      "correct": "4",
      "explanation": "2 + 2 equals 4."
    }
  ]
}
```

#### Success Response (`200 OK`)
```json
{
  "score": 100,
  "total": 1,
  "correct": 1,
  "details": [
    {
      "question": "What is 2 + 2?",
      "is_correct": true,
      "explanation": "2 + 2 equals 4."
    }
  ]
}
```

---

## 2. Serverless RAG Engine (`/api/rag`)

### Base URL
- Production: `https://prep-weblearning.vercel.app/api/rag`
- Local Development: `http://localhost:5000/api/rag`

---

### Endpoint: RAG Health & Service Info
- **Method**: `GET`
- **Path**: `/api/rag`

#### Success Response (`200 OK`)
```json
{
  "status": "ok",
  "service": "PrepMind RAG Pipeline",
  "embeddingModel": "models/text-embedding-004",
  "dimensions": 768,
  "supportedMimeTypes": ["application/pdf", "text/plain", "text/markdown"],
  "timestamp": "2026-10-13T12:00:00.000Z"
}
```

---

### Endpoint: Process & Ingest Document
Extracts text from PDF/TXT/MD, generates boundary-aware chunks, and computes 768-dimensional vector embeddings via Gemini `text-embedding-004`.

- **Method**: `POST`
- **Path**: `/api/rag`
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "action": "process_document",
  "documentId": "doc_123",
  "name": "Operating_Systems.pdf",
  "mimeType": "application/pdf",
  "fileBase64": "<base64_encoded_pdf>",
  "userId": "usr_uuid",
  "notebookId": "nb_uuid"
}
```

---

### Endpoint: Vector Semantic Retrieval
Performs 768-dim cosine similarity ranking against candidate chunks with strict owner and notebook scoping.

- **Method**: `POST`
- **Path**: `/api/rag`
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "action": "retrieve",
  "query": "Explain virtual memory paging",
  "chunks": [],
  "threshold": 0.15,
  "limit": 4,
  "notebookId": "nb_uuid"
}
```

---

## 3. Express Server Endpoints (`/server`)

The standalone backend provides protected administrative and storage endpoints:

| Endpoint | Method | Auth Required | Description |
| :--- | :---: | :---: | :--- |
| `/api/health` | `GET` | No | Server uptime and Supabase connectivity ping |
| `/api/ask` | `POST` | `Bearer <API_TOKEN>` | Echo service with 15s timeout protection |
| `/api/generate` | `POST` | `Bearer <API_TOKEN>` | Direct Gemini question generator |
| `/api/evaluate` | `POST` | `Bearer <API_TOKEN>` | Batch answer score evaluator |
| `/api/store` | `POST` | `Bearer <API_TOKEN>` | Inserts note/context into Supabase `notes` |
| `/api/query-context` | `POST` | `Bearer <API_TOKEN>` | Retrieves recent notes and generates contextual answer |

---

## 3. Error Status Codes

| Code | Status | Meaning | Recovery Action |
| :---: | :--- | :--- | :--- |
| **`400`** | Bad Request | Missing required fields, invalid action, or empty body | Check payload structure and JSON formatting |
| **`401`** | Unauthorized | Invalid or missing `Bearer` token on protected route | Set `API_TOKEN` in headers |
| **`405`** | Method Not Allowed | Called with invalid HTTP method (e.g. `DELETE`) | Use `GET` or `POST` |
| **`429`** | Too Many Requests | Rate limit exceeded (60 req / min) | Slow down requests; client retries after 400ms |
| **`500`** | Internal Error | Upstream provider unexpected failure | Client retries or falls back to offline bank |
| **`503`** | Service Unavailable | All configured AI providers failed or credentials absent | Offline question bank activates automatically |
