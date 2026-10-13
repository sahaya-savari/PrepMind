# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Interactive exam practice countdown timer and mock exam mode.
- Enhanced analytics export with downloadable performance summaries.
- Advanced multi-turn conversation caching for extended study tutoring sessions.

---

## [1.1.0] - 2026-10-13

### Added
- **Private AI Notebook Workspace**: 3-column NotebookLM-style workspace at `/notebooks` featuring document uploads, grounded Q&A with interactive citation pills, and a 1-click Learning Studio (Summary, Notes, Flashcards, Quiz, Study Guide).
- **Document-Grounded RAG Engine (`/api/rag`)**: Boundary-aware document ingestion, 768-dimensional Gemini `text-embedding-004` vector embeddings, owner-filtered semantic retrieval, and anti-hallucination refusal grounding.
- **Node 20+ PDF Parsing Compatibility**: Persistent `scripts/patch-pdf-parse.js` postinstall patch resolving shared buffer pool offsets in `pdf-parse` / `pdf.worker.js`.
- **Supabase Migrations Standardized**: Timestamped forward-only migrations `20261012000000_rag_storage_schema.sql` and `20261012010000_private_notebooks_schema.sql` with pgvector, RLS, and secure `match_document_chunks` RPC.
- **Automated Test Suite Expansion**: 5 test suites (29 passing assertions) covering multi-tenant isolation, 768-dim vector math, notebook scoping, and binary PDF parsing.

### Fixed
- **Dual Serverless Parity**: Reconciled `app/api/ai.js` with root `api/ai.js` via forwarding re-export to eliminate code drift.
- **Client Security Hardening**: Added explicit service-role key detection in `app/src/lib/supabase.js` to prevent privileged keys from ever initializing in browser clients.
- **Environment Template Parity**: Reconciled `server/.env.example` with `GEMINI_MODEL` for complete provider configuration consistency.
- **Upload Size Limits**: Enforced 10MB document buffer limit in `/api/rag` returning HTTP 413 when exceeded, and expanded Express parser body limits in `server/server.js` to 15MB to prevent upload truncation.
- **Extraction Validation**: Rejection of empty and whitespace-only text payloads in `/api/rag` with explicit automated test assertions.
- **Tenant Scoping Alignment**: Bound authenticated `userId` to semantic retrieval requests in `app/src/lib/rag.ts`.

---

## [1.0.0] - 2026-10-11

### Added
- **API Resilience & Retry Policy**: Unified 15-second request timeouts, automatic 400ms retry on transient 429 and 500 responses, and custom `HttpError` status handler in [`app/src/api.ts`](app/src/api.ts).
- **Dual Serverless Discovery**: Parity between [`api/ai.js`](api/ai.js) and [`app/api/ai.js`](app/api/ai.js) to support Vercel deployments whether root directory is configured as `.` or `app/`.
- **Three-Tier AI Provider Cascade**: Seamless failover orchestration in `/api/ai` (Groq Cloud `openai/gpt-oss-120b` → NVIDIA NIM `nvidia/nemotron-3.5-lightning-30b-a3b` → Google Gemini `gemini-2.5-flash`).
- **Midnight / Terminal-Dark Design System**: Deep slate/ink surfaces, amber/emerald accent highlights, `Inter` and `JetBrains Mono` font typography, and high-contrast accessibility compliance.
- **Rich AI Chat & Socratic Tutoring**: Integrated [`MarkdownView`](app/src/components/shared/MarkdownView.tsx) with syntax highlighting, syllabus-aware tutoring prompts, and step-by-step mathematical reasoning.
- **React Bits Component Suite**: Ported and adapted 20 interactive UI components including `TechText`, `SpecularButton`, `ScrollExpand`, `ClickSpark`, `ThoughtLine`, `CodeBlock`, and `LatticeLoader`.
- **Deterministic Offline Question Bank**: Built-in fallback questions in [`fallbackQuestions.ts`](app/src/data/fallbackQuestions.ts) and persistent `localStorage` cache ensuring zero user lockout during quota exhaustion.
- **Reconciled Supabase Schema**: Comprehensive PostgreSQL schema with Row-Level Security (RLS) policies for `interviews`, `questions`, and `results` in [`supabase_schema.sql`](supabase_schema.sql) and [`server/supabase_schema.sql`](server/supabase_schema.sql).
- **Technical SEO Assets**: Validated canonical [`sitemap.xml`](sitemap.xml), [`robots.txt`](robots.txt), high-resolution 1200x630 [`og-image.png`](og-image.png), and Schema.org `WebApplication` JSON-LD structured data.
- **Automated Test Harness**: Node.js test suite in [`test/api-test.mjs`](test/api-test.mjs) verifying offline questions, payload validation, score calculation math, and provider status enumeration.
- **Unified Root Package Scripts**: Added `npm test`, `npm run typecheck`, `npm run build`, and `npm run server:dev` to root [`package.json`](package.json).

### Fixed
- **Order-of-Operations Validation Bug**: Fixed serverless handler so empty or malformed payloads reject with `400 Bad Request` prior to upstream provider lookups.
- **Vercel SPA Deep-Link Refresh**: Added explicit rewrite rules in root and app [`vercel.json`](vercel.json) ensuring `/practice`, `/chat`, `/progress`, and `/profile` routes do not 404 on hard refresh.
- **Server Entrypoint Reference**: Corrected root `package.json` `"server"` script to target [`server/server.js`](server/server.js).
- **Git Hygiene**: Cleaned compiled Python cache artifacts from git tracking and synchronized `.gitignore` rules.
