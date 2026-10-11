# PREPMIND AI — PRODUCTION READINESS PRD & AUDIT REPORT

**Date:** October 11, 2026<br>
**Auditor:** Senior Software Engineer, QA Lead, Application Security Reviewer & SEO Auditor<br>
**Repository:** `D:\PrepMind` (Destination / Sole Production Source of Truth)<br>
**Reference Clone:** `D:\clone-prepmind` (Google AI Studio Read-Only Frontend Reference)<br>
**Target Branch:** `ui-terminal-dark`<br>
**Live Production Host:** `https://prep-weblearning.vercel.app/`<br>
**Overall Readiness Status:** **CONDITIONAL GO (CODEBASE REMEDIATED & READY FOR DEPLOYMENT)**

---

## A. EXECUTIVE SUMMARY

Following the comprehensive audit of PrepMind AI across the two in-scope project folders (`D:\PrepMind` and `D:\clone-prepmind`), all safely remediable **P0 Critical Blockers**, **Vercel SPA routing rules**, **React Bits component integrations**, and **SEO technical requirements** have been implemented and verified in the repository without violating any protected boundaries.

### Remediation & Verification Summary:
1. **`ISSUE-P0-01` (Vercel Serverless Function Routing & SPA Fallback)**: **FIXED IN REPO**.
   - Created `app/api/ai.js` and hardened `app/vercel.json` and root `vercel.json` with explicit rewrite precedence: `/api/(.*) -> /api/$1` followed by `/(.*) -> /index.html`.
   - Resolves both serverless function bundling when Vercel root is `app/` and direct SPA URL refresh 404s.
2. **`ISSUE-P0-02` (Validation Order-of-Operations Bug)**: **FIXED & VERIFIED BY LOCAL AUTOMATED TEST**.
   - Reordered input payload validation in `api/ai.js` and `app/api/ai.js` before provider existence checks.
   - Malformed/empty payloads return HTTP 400 Bad Request immediately. All 6 test suites in `test/api-test.mjs` pass cleanly (`Exit code 0`).
3. **`ISSUE-P0-03` (Database Schema Discrepancy)**: **FIXED IN REPO (PENDING PRODUCTION APPLICATION)**.
   - Reconciled `supabase_schema.sql` and `server/supabase_schema.sql` with full DDL for `interviews` (including `role` and `user_id`), `questions`, `results`, relational indexes, and idempotent Row-Level Security (RLS) policies.
   - SQL is prepared and reviewed, but has **NOT been executed against the live production database**.
4. **`SEO-001` - `SEO-004` (SEO Technical Assets)**: **VERIFIED IN LOCAL PRODUCTION BUILD (PENDING LIVE HOST DEPLOYMENT)**.
   - Created `robots.txt` and `sitemap.xml` allowing public canonical routes (`/`, `/practice`, `/chat`) and disallowing private user routes (`/progress`, `/profile`, `/api/`).
   - Added canonical tags, Open Graph, Twitter cards, and Schema.org `WebApplication` structured data in `app/index.html`.
   - Verified present in `app/dist/` bundle. Live production host still serves older deployment until deployed.
5. **`ISSUE-P1-01` (Chat Context & Streaming)**: **OPEN (SPECIFIED PATCH PROPOSED)**.
   - Caller in protected `app/src/api.ts` transmits only the single latest prompt and buffers responses.
   - Due to strict protected boundaries preserving user changes, `app/src/api.ts` was kept untouched.
6. **`ISSUE-P1-02` (Authentication & Route Protection)**: **SPECIFICATION REQUIRED**.
   - PrepMind runs in a guest-first model with local storage caching. No registration UI or token session listeners exist.
   - Specification is required before building auth guards.
7. **`ISSUE-P1-03` (Backend Dependency & Startup)**: **BLOCKED BY DEPENDENCY RESTRICTIONS**.
   - `@supabase/supabase-js` is declared in `server/package.json` but absent from `server/package-lock.json` and `server/node_modules/`.
   - Package installation commands were prohibited in this run.

---

## B. ARCHITECTURE & DISCOVERED INVENTORY

### 1. Two-Project Architecture Scope
- **Primary Production Destination (`D:\PrepMind`)**: React 18.3.1, Vite 5.2.0, Tailwind CSS 3.4.13, Framer Motion 11.18.2, Lucide React, Express backend, Supabase client. Sole source of truth for production code, backend logic, and real APIs.
- **Read-Only Frontend Reference (`D:\clone-prepmind`)**: Google AI Studio clone containing luxury visual composition, screen layouts, and React Bits components. Kept strictly read-only.
- **Third Project Reference**: `D:\AIStudio-site` is excluded from scope.

### 2. Discovered Routes & Access Control
| Route | Component | Audience | Intended Auth | Actual Enforcement |
|---|---|---|---|---|
| `/` | `Home.tsx` | Public | None | Public (Unrestricted) |
| `/practice` | `Practice.tsx` | Public | Guest / Auth | Public (Unrestricted, guest localStorage cache) |
| `/chat` | `Chat.tsx` | Public | Guest / Auth | Public (Unrestricted, guest localStorage cache) |
| `/progress` | `Progress.tsx` | Private | Auth User | Public with Guest Mode fallback |
| `/profile` | `Profile.tsx` | Private | Auth User | Public with Guest Mode fallback |

### 3. Discovered Backend Endpoints
- **Serverless API (`/api/ai.js` and `/app/api/ai.js`)**:
  - `GET /api/ai`: Health check and provider cascade status (`groq` -> `nvidia` -> `gemini`).
  - `POST /api/ai` (`action: 'generate_mcq'`): Generates 1 structured MCQ via JSON schema enforcement.
  - `POST /api/ai` (`action: 'chat'`): Multi-turn or single-turn chat completion.
  - `POST /api/ai` (`action: 'evaluate'`): Deterministic answer comparison and score calculation (no upstream LLM call required).
- **Express Backend (`/server/server.js`)**:
  - `GET /api/health`: Health & Supabase ping.
  - `POST /api/ask`: Echo mock (`Echo: ${message}`).
  - `POST /api/generate`: Deprecated generator.
  - `POST /api/evaluate`: Deprecated evaluation handler.

---

## C. COMPREHENSIVE PRODUCTION CHECKLIST

| ID | Category | Requirement | Test / Audit Step | Expected Result | Actual Result | Status | Severity |
|---|---|---|---|---|---|---|---|
| `DEP-001` | Deployment | `/api/ai` routes to serverless function and SPA fallback active | Created `app/api/ai.js`, `app/vercel.json`, `vercel.json` | Vercel bundles Serverless Function and routes SPA | Configured in repo; pending Vercel deployment | **FIXED IN REPO** | **P0** |
| `API-001` | Backend | Input validation returns 400 before provider check | `POST /api/ai` with `{ action: 'generate_mcq', topic: '' }` | HTTP 400 Bad Request | Returns HTTP 400 (`node test/api-test.mjs` pass) | **FIXED & VERIFIED** | **P0** |
| `DATA-001`| Database | Schema matches all frontend queries | Inspect `supabase_schema.sql` vs `app/src/api.ts` | Tables `interviews`, `questions`, `results` defined | All 3 tables, `role` column, indexes, RLS added | **PREPARED (NOT APPLIED)** | **P0** |
| `CHAT-001`| AI / Chat | Chat maintains conversation history | Inspect payload in `askStream()` | Transmits previous message context | Truncates to latest message in protected `api.ts` | **OPEN (PATCH READY)** | **P1** |
| `CHAT-002`| AI / Chat | Chat streaming delivers progressive chunks | Inspect `askStream()` in `app/src/api.ts` | HTTP SSE / ReadableStream chunks delivered | Single buffered POST in protected `api.ts` | **OPEN (PATCH READY)** | **P1** |
| `AUTH-001`| Security | Protected routes block unauthenticated access | Direct URL access to `/progress` & `/profile` | Redirect to login if unauthenticated | Guest fallback active; Auth spec required | **SPEC REQUIRED** | **P1** |
| `SRV-001` | Backend | Express backend starts cleanly | `node server/server.js` | Starts on port 5000 | Requires `npm install` in `server/` | **BLOCKED (DEP RULE)** | **P1** |
| `BLD-001` | Build | TypeScript compiles with zero errors | `npx tsc --noEmit` in `app/` | Exit code 0 | Exit code 0 | **PASS (VERIFIED)** | P3 |
| `BLD-002` | Build | Vite builds production bundle cleanly | `npm run build` in `app/` | Exit code 0, bundled assets | Exit code 0, bundled in 4.72s | **PASS (VERIFIED)** | P3 |
| `SEO-001` | SEO | Robots.txt exists and configures crawling | Request `/robots.txt` | Valid robots directives | Verified in `app/dist/robots.txt` | **FIXED (LOCAL BUILD)** | P1 |
| `SEO-002` | SEO | XML Sitemap exists with canonical URLs | Request `/sitemap.xml` | Valid XML sitemap | Verified in `app/dist/sitemap.xml` | **FIXED (LOCAL BUILD)** | P1 |
| `SEO-003` | SEO | JSON-LD Structured data on homepage | Inspect `<head>` of `index.html` | Valid WebApplication schema | Verified in `app/dist/index.html` | **FIXED (LOCAL BUILD)** | P2 |
| `ACC-001` | A11y | Keyboard focus skip link present | Inspect DOM for skip to `#main-content` | Accessible skip link in header | Skip link present & verified | **PASS (VERIFIED)** | P3 |
| `A11-002` | A11y | `prefers-reduced-motion` honored | Inspect Canvas & Motion components | Animations paused / suppressed | Suppressed across all components | **PASS (VERIFIED)** | P2 |

---

## D. FACTUAL REACT BITS COMPONENT INVENTORY

| Component | In Reference Clone | In Prompt Appendix | In Production App | Classification Status | Integration Location |
|---|---|---|---|---|---|
| `AnimatedList` | Yes | No | Yes | **Ported & Integrated** | `app/src/pages/Progress.tsx` (drills history list) |
| `ClickSpark` | Yes | Yes (user snippet) | Yes | **Ported & Integrated** | `app/src/components/Layout.tsx` (global interactive micro-spark) |
| `DodgeField` | Yes | Yes | Yes | **Ported & Integrated** | `app/src/pages/Progress.tsx` (empty state only, disabled on reduced motion) |
| `GlideSelect` | Yes | No | Yes | **Ported & Integrated** | `app/src/pages/Home.tsx`, `Practice.tsx` (exam & difficulty picker) |
| `Hyperspeed` | Yes | Yes | Yes | **Ported & Integrated** | `app/src/pages/Home.tsx` (lazy loaded, desktop only, non-blocking) |
| `LatticeLoader` | Yes | No | Yes | **Ported & Integrated** | `app/src/pages/Practice.tsx` (bound to real question generation state) |
| `PillNav` | Yes | No | Yes | **Ported & Integrated** | `app/src/components/Header.tsx` (main SPA navigation) |
| `PixelCard` | Yes | No | Yes | **Ported & Integrated** | `app/src/pages/Home.tsx` (core feature cards) |
| `RotatingText` | Yes | No | Yes | **Ported & Integrated** | `app/src/pages/Home.tsx` (dynamic headline keyword cycling) |
| `ScrollExpand` | Yes | Yes (handover) | Yes | **Ported & Tested** | `app/src/components/reactbits/ScrollExpand.tsx` (standalone/available) |
| `SlingButton` | Yes | No | Yes | **Ported & Integrated** | `app/src/pages/Chat.tsx` (chat submission button) |
| `StarBorder` | Yes | No | Yes | **Ported & Integrated** | `app/src/pages/Home.tsx` (primary CTA border glow) |
| `Stepper` | Yes | No | Yes | **Ported & Integrated** | `app/src/pages/Home.tsx` (study workflow phase progression) |
| `SwipeToast` | Yes | Yes | Yes | **Ported & Tested** | `app/src/components/reactbits/SwipeToast.tsx` (standalone/available) |
| `TextType` | Yes | No | Yes | **Ported & Integrated** | `app/src/pages/Home.tsx` (typewriter hero title effect) |
| `ThoughtLine` | Yes | Yes | Yes | **Ported & Integrated** | `app/src/pages/Chat.tsx`, `Practice.tsx` (bound to real AI loading state) |
| `WarmTooltip` | Yes | No | Yes | **Ported & Tested** | `app/src/components/reactbits/WarmTooltip.tsx` (standalone/available) |
| `TechText` | No | Yes | Yes | **Ported & Available** | `app/src/components/reactbits/TechText.jsx` + `.css` (standalone) |
| `SpecularButton` | No | Yes | Yes | **Ported & Available** | `app/src/components/reactbits/SpecularButton.jsx` + `.css` (standalone) |
| `LetterGlitch` | No | Mentioned | No | **Source File Required** | Not present in reference clone or prompt appendix |

---

## E. AI PROVIDERS & STREAMING AUDIT

### 1. Cascade Execution Path
$$\text{Groq (Primary)} \longrightarrow \text{NVIDIA NIM (Secondary)} \longrightarrow \text{Google Gemini (Tertiary)}$$

- **Groq Cloud (Primary)**: Model `openai/gpt-oss-120b`, endpoint `https://api.groq.com/openai/v1/chat/completions`, 15s timeout.
- **NVIDIA NIM (Secondary)**: Model `nvidia/nemotron-3.5-lightning-30b-a3b`, endpoint `https://integrate.api.nvidia.com/v1/chat/completions`, 18s timeout.
- **Google Gemini (Tertiary)**: Model `models/gemini-2.5-flash`, endpoint `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, 15s timeout.

### 2. Validation & Resilience
- Health check `GET /api/ai` returns `200 OK` with JSON enumeration of configured providers.
- Evaluation `action: 'evaluate'` executes deterministically without making billable external LLM calls.
- Fallback question bank in `app/src/data/fallbackQuestions.ts` provides structured offline questions across 5 core topics when providers are unconfigured.

---

## F. SECURITY, PRIVACY & DATA INTEGRITY

1. **CORS Configuration**: `Access-Control-Allow-Origin: *` is currently active on serverless endpoints. This is standard for public APIs but should be restricted to the verified production origin once multi-origin access is finalized.
2. **XSS Protection**: Code blocks and user prompts in `Chat.tsx` and `Practice.tsx` undergo regex parsing and entity escaping before rendering.
3. **Database Ownership**: Idempotent RLS policies in `supabase_schema.sql` allow anonymous guest reads/inserts while supporting `user_id uuid references auth.users(id)` for authenticated user isolation once Supabase Auth is enabled.

---

## G. AUTOMATED TEST REPORT

| Test Suite / Command | Execution Directory | Exit Code | Result | Key Observations |
|---|---|---|---|---|
| `node test/api-test.mjs` | `D:\PrepMind` | `0` | **PASS** | All 6 test suites passed. Input validation rejects empty/whitespace payloads with 400. |
| `npx tsc --noEmit` | `D:\PrepMind\app` | `0` | **PASS** | 0 TypeScript compilation errors. |
| `npm run build` | `D:\PrepMind\app` | `0` | **PASS** | Vite production build succeeded in 4.72s. Verified assets and PWA service worker. |

---

## H. POST-PUSH VERIFICATION & TWO-PROJECT RECONCILIATION

**Audit Timestamp:** October 11, 2026<br>
**Verified Commits:** `730b6e7` and `e47e9b9`<br>
**Verified Branch:** `ui-terminal-dark`

### 1. Git State & Remote Synchronization
- **Branch**: `ui-terminal-dark` (Tracking `origin/ui-terminal-dark`).
- **Remote**: `https://github.com/sahaya-savari/PrepMind.git`.
- **Working Tree**: Clean. Unstaged user modifications in protected `app/src/api.ts` and untracked `.agents/skills/terminal-dark/`, `api-review.txt` strictly preserved untouched.

### 2. Live Production Endpoint Probe (`https://prep-weblearning.vercel.app/`)
Probed live endpoints via non-billable HTTP requests:
- `GET /api/ai`: HTTP 200, `Content-Type: text/html; charset=utf-8` (SPA HTML shell).
- `GET /robots.txt`: HTTP 200, `Content-Type: text/plain; charset=utf-8` (Legacy robots file).
- `GET /sitemap.xml`: HTTP 200, `Content-Type: text/html; charset=utf-8` (SPA HTML fallback).
- `HEAD /`: `last-modified: Sun, 11 Oct 2026 04:00:27 GMT`, `age: 41085` seconds (~11.4 hours old).
- **Finding**: The production domain `prep-weblearning.vercel.app` is currently serving an 11-hour-old deployment built from branch `main` (commit `03ba926`). Commits on `ui-terminal-dark` have not yet been deployed to the live domain. Merging `ui-terminal-dark` into `main` or setting `ui-terminal-dark` as the production branch in Vercel will promote the remediated build.

### 3. Supabase Database Schema Verification
- `supabase_schema.sql` and `server/supabase_schema.sql` are 100% byte-for-byte identical (`git diff` clean).
- Foreign keys (`references public.interviews(id) on delete cascade`) and indexes on `interview_id` and `created_at` are verified.
- Idempotent `ADD COLUMN IF NOT EXISTS` and `DROP POLICY IF EXISTS ... CREATE POLICY ...` ensure non-destructive execution.
- **Status:** Prepared and reviewed; pending user execution in Supabase Dashboard.

### 4. Backend Server Dependency Verification
- `@supabase/supabase-js` is declared in `server/package.json` line 11.
- In `server/package-lock.json`, the dependency is NOT resolved, and `server/node_modules/` does not exist.
- Root cause: `npm install` has not been executed in `server/` since the dependency was added to `package.json`.
- Required action: Run `npm --prefix server install` when package modifications are authorized.

---

## I. FINAL GO / NO-GO RECOMMENDATION

### **VERDICT: CONDITIONAL GO FOR PRODUCTION DEPLOYMENT**

**Justification**:
All code-level P0 blockers, Vercel routing rules, and React Bits components within repository scope have been remediated, verified, and bundled. The application is ready for production deployment.

**Pending External Administrative Actions**:
1. Apply the updated `supabase_schema.sql` migration in the Supabase project dashboard.
2. Configure AI provider API keys (`GROQ_API_KEY`, `NVIDIA_API_KEY`, `GEMINI_API_KEY`) in Vercel environment variables.
3. Merge `ui-terminal-dark` into `main` (or configure Vercel production branch) to promote the changes to `https://prep-weblearning.vercel.app/`.
