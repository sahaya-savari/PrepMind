# 🚀 PrepMind AI — Production Upgrade Plan (Phase 1–10)

## 🎯 Goal
Upgrade the existing app to production-grade quality WITHOUT:
- breaking APIs
- changing architecture
- modifying working backend logic

---

# ⚠️ GLOBAL SAFETY RULES (MANDATORY)

- Do NOT change:
  - API endpoints (/api/ask, /api/generate)
  - request/response format
  - tokens or headers
  - backend logic

- Do NOT:
  - rewrite working code
  - introduce paid services
  - break existing features

- Always:
  - add error handling
  - use safe fallbacks
  - keep changes minimal

---

# ✅ PHASE 1 — API STABILITY & DATA

## Implementation
- Validate required environment variables

Frontend:
- VITE_API_BASE
- VITE_API_TOKEN

Backend:
- API_TOKEN
- GEMINI_API_KEY
- SUPABASE_URL
- SUPABASE_KEY

- Add `/api/health` endpoint returning:
{
  "status": "ok",
  "uptime": "...",
  "timestamp": "..."
}

- Ensure correct wiring:
  - askStream → /api/ask (stream)
  - aiAPI → /api/generate

- Add:
  - timeout (10–15s)
  - retry (1 attempt)
  - error handling (401, 429, 500)

## Result
- Stable API communication
- No silent failures
- Clear debugging

---

# ✅ PHASE 2 — CHAT & UI RENDERING

## Markdown Rendering
- Support:
  - headings (#, ##)
  - bullet lists
  - numbered lists
  - inline code
  - fenced code blocks
  - links (open in new tab)

- Code block styling:
  - padding
  - rounded corners
  - horizontal scroll

## Chat UX
- Limit history to last 12–15 messages
- Show: "Context trimmed"

- Add:
  - Clear Chat
  - Export Chat (JSON)

## Streaming UX
- Typing indicator before response
- Progressive rendering
- Auto-scroll to bottom
- Cancel support (keep partial response)

## Error & Empty States
- Retry button on failure
- Never show blank screen
- Empty state:
  "Ask anything to get started"

## Critical Rule
- Do NOT modify AI response content
- Only render safely

---

# ✅ PHASE 3 — PRACTICE SYSTEM

## APIs
- POST /api/generate
- POST /api/evaluate

## Features
- Generate MCQs (topic + difficulty)
- Validate JSON before use

## Flow
- Select answer
- Submit
- Show:
  - correct answer
  - explanation

## Data
Store:
- attempts
- score
- topic

## UX
- Skeleton loaders
- Retry on failure

---

# ✅ PHASE 4 — DATA & PERSISTENCE

## Supabase Storage
- chat summaries
- notes
- progress
- exam attempts

## UI
- Weak topics
- Most studied
- Progress trends

## Offline Support
- Local cache fallback
- "Refresh from server" option

---

# ✅ PHASE 5 — UX POLISH & PERFORMANCE

## UI
- Sticky navigation tabs
- Improved spacing
- Clean typography

## Mobile
- Fixed chat input
- No overflow

## Performance
- Lazy loading
- Debounce inputs
- Reduce bundle size

---

# ✅ PHASE 6 — SECURITY HARDENING

- Enforce INTERNAL_API_TOKEN on all backend routes
- Reject unauthorized requests (401)

## Input Safety
- Trim inputs
- Reject unsafe patterns

## Rate Limiting
- ~60 requests/min per IP

## Secrets
- Never expose API keys or service role keys

---

# ✅ PHASE 7 — CONFIG & FEATURE FLAGS

## Central Config
- API base URL
- Feature toggles

## Flags
- ENABLE_STREAMING
- ENABLE_RAG
- ENABLE_PRACTICE_MODE
- DEBUG_MODE

## Rule
- Features must be safely toggleable

---

# ✅ PHASE 8 — TESTING

## Backend
Test:
- /api/health
- /api/ask
- /api/generate

## Frontend
Test:
- success case
- error case
- loading state

## Manual Checklist
- Chat works
- Retry works
- No blank screen
- Notes indicator works

---

# ✅ PHASE 9 — DEPLOYMENT SAFETY

- Fail startup if env missing
- No undefined env usage
- No console errors

## Versioning
- Use semantic versioning (v1.x.x)

## Rule
- Never deploy untested changes

---

# ✅ PHASE 10 — FINAL PRODUCTION POLISH

- Add favicon
- Add app title
- Add meta description

## UX
- Improve empty states with guidance
- Add optional onboarding (skippable)

## Final Checks
- Smooth scrolling
- Consistent spacing
- Clean typography

## Ensure
- No console errors
- No broken routes
- No UI glitches

---

# 🧠 FINAL RULE

Phase 1–5 = App works  
Phase 6–10 = App is production-ready  

Do not skip validation between phases.

--------------------------------------------------
ADVANCED EXECUTION GUARD (MANDATORY)
--------------------------------------------------

You are executing changes in a production-grade codebase.

STRICT BEHAVIOR RULES:

1. ZERO BREAKAGE POLICY
- Do NOT modify working logic unless explicitly required
- Do NOT refactor unrelated code
- Do NOT rename variables, files, or functions unnecessarily

2. MINIMAL CHANGE PRINCIPLE
- Only change what is required for the task
- Prefer small, isolated edits over large rewrites

3. API PROTECTION LAYER
- Never touch:
  - api.ts request logic
  - askStream
  - aiAPI
  - headers / tokens

- If a change affects API behavior → STOP

4. UI SAFE MODE
- UI must never:
  - crash
  - go blank
  - freeze

- Always include:
  - loading state
  - error state
  - fallback UI

5. STRICT VALIDATION
- Do NOT assume data is valid
- Always:
  - check null/undefined
  - validate JSON before use

6. NO OVERENGINEERING
- Do NOT:
  - introduce new libraries unless necessary
  - create abstractions for small logic
  - optimize prematurely

7. CONSISTENCY RULE
- Follow existing code style
- Reuse existing helpers/components
- Do NOT create duplicate logic

8. FAIL-SAFE EXECUTION
- If unsure → do NOT implement
- If risky → provide safer alternative

9. OUTPUT RULE
- Provide:
  - file-by-file changes
  - clean, minimal code
- No long explanations

10. DEBUG AWARENESS
- Avoid console spam
- Log only useful debug info (if DEBUG_MODE)

--------------------------------------------------
OPTIONAL (ENABLE WHEN NEEDED)
--------------------------------------------------

DEBUG MODE:

If DEBUG_MODE = true:
- Log API requests (method, route, time)
- Log errors clearly

If false:
- No debug logs

--------------------------------------------------
FINAL RULE:

You are not allowed to "improve" things outside the task.
Only execute what is asked — safely and precisely.