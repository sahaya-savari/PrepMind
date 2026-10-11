# PREPMIND AI — PRODUCTION READINESS ACTIONABLE CHECKLIST

**Last Updated:** October 11, 2026  
**Companion Document:** [`PRODUCTION_READINESS_PRD.md`](./PRODUCTION_READINESS_PRD.md)  
**Target Release Decision:** **CONDITIONAL GO** (Codebase Remediated & Verified; Pending Vercel Deployment & Supabase SQL Application)

---

## 1. Release Gating Checklist

### P0 Critical Blockers
- [x] `DEP-001` | **Vercel Serverless Function Routing** | `/api/ai` must be bundled by Vercel rather than falling back to SPA HTML shell. | *Status: **FIXED IN REPO** (`app/api/ai.js` and `app/vercel.json` created)*
- [x] `API-001` | **Validation Order in `api/ai.js`** | Empty topic/message must return HTTP 400 Bad Request before checking API provider existence. | *Status: **FIXED & VERIFIED** (`node test/api-test.mjs` PASS, exit 0)*
- [x] `DATA-001`| **Supabase Schema Completeness** | Add `questions`, `results` tables, `role` and `user_id` columns, indexes, and RLS to `supabase_schema.sql`. | *Status: **FIXED IN REPO** (Ready for Supabase application)*

### P1 High Priority
- [ ] `CHAT-001`| **Multi-Turn Chat Context** | Update `askStream()` in `app/src/api.ts` to forward full conversation context. | *Status: **OPEN** (Detailed patch proposed in PRD; `app/src/api.ts` preserved untouched)*
- [ ] `CHAT-002`| **True Streaming Protocol** | Implement SSE / ReadableStream in `/api/ai.js` and `app/src/api.ts` instead of buffered single POST. | *Status: **OPEN** (Detailed patch proposed in PRD)*
- [ ] `AUTH-001`| **Real Authentication Enforcement** | Wire Supabase Auth into `AuthContext.tsx` and activate `ProtectedRoute.tsx`. | *Status: **SPEC REQUIRED** (Guest-first mode active; requires full auth specification)*
- [ ] `SRV-001` | **Server Dependency Fix** | Add `@supabase/supabase-js` to `server/node_modules`. | *Status: **BLOCKED** (Requires `npm install` in `server/`, restricted by rules)*
- [x] `SEO-001` | **Robots.txt Configuration** | Create `robots.txt` allowing public routes, disallowing private, and linking sitemap. | *Status: **FIXED & VERIFIED** in `app/public/robots.txt`*
- [x] `SEO-002` | **XML Sitemap** | Create canonical `sitemap.xml` with indexable routes. | *Status: **FIXED & VERIFIED** in `app/public/sitemap.xml`*

### P2 Medium Priority
- [x] `SEO-003` | **JSON-LD Schema Markup** | Add Schema.org `WebApplication` structured data and theme color to `index.html`. | *Status: **FIXED & VERIFIED** in `app/index.html`*
- [x] `SEO-004` | **Private Route Noindex** | Disallow `/progress` and `/profile` in `robots.txt` and exclude from sitemap. | *Status: **FIXED & VERIFIED***
- [ ] `DATA-002`| **Local Storage Key Standardization** | Unify local storage keys across Practice, Progress, Chat, and Profile. | *Status: **OPEN** (Guest session keys functional)*
- [ ] `SEC-001` | **CORS Origin Restriction** | Restrict `Access-Control-Allow-Origin` from `*` to verified production domain in `api/ai.js`. | *Status: **OPEN***

### P3 Low Priority (Polish & Maintainability)
- [x] `BLD-001` | **TypeScript Type Checking** | Zero TypeScript compilation errors in frontend. | *Status: **PASS** (`npx tsc --noEmit` exit 0)*
- [x] `BLD-002` | **Production Bundle Compilation** | Vite production bundle builds without errors. | *Status: **PASS** (`npm run build` exit 0)*
- [x] `A11-001` | **Keyboard Navigation & Skip Link** | Accessible skip link to `#main-content` and visible focus states. | *Status: **PASS***
- [x] `A11-002` | **Reduced Motion Safety** | Honors `prefers-reduced-motion` in all 7 animated components. | *Status: **PASS***

---

## 2. Test Execution Summary

| Test Suite | Target | Result | Failure Summary / Root Cause |
|---|---|---|---|
| `npx tsc --noEmit` | `app/` | **PASS** | 0 compilation errors. |
| `npm run build` | `app/` | **PASS** | Succeeded in 3.17s; bundles `dist/`. |
| `node test/api-test.mjs` | Root | **PASS** | All 6 test suites passed. Validation rejects malformed inputs with 400. |
| `node server/server.js` | Root | **BLOCKED** | Missing `node_modules` in `server/` (requires `npm install` in `server/`). |
| Vercel Deployment Check | Vercel | **PENDING** | `app/api/ai.js` and `app/vercel.json` committed; requires Git push to trigger Vercel build. |

---

## 3. SEO Verification Table

| Route | Status Code | Crawl Directive | Canonical URL | Schema | Verification |
|---|---|---|---|---|---|
| `/` | 200 OK | `index, follow` | `https://prep-weblearning.vercel.app/` | WebApplication | Verified in built HTML |
| `/practice` | 200 OK | `index, follow` | `https://prep-weblearning.vercel.app/practice` | N/A | In Sitemap |
| `/chat` | 200 OK | `index, follow` | `https://prep-weblearning.vercel.app/chat` | N/A | In Sitemap |
| `/progress` | 200 OK | `noindex, nofollow` | `https://prep-weblearning.vercel.app/progress` | N/A | Blocked in `robots.txt` |
| `/profile` | 200 OK | `noindex, nofollow` | `https://prep-weblearning.vercel.app/profile` | N/A | Blocked in `robots.txt` |
