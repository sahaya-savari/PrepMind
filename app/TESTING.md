# PrepMind Smoke Tests (Phase 8)

## Backend quick checks (requires API_TOKEN)

Set env: `API_TOKEN=<your_token>`.

- Health:
  - `curl -s http://localhost:5000/api/health`
- Generate:
  - `curl -s -X POST http://localhost:5000/api/generate -H "Content-Type: application/json" -H "Authorization: Bearer $API_TOKEN" -d '{"topic":"testing","difficulty":"Beginner"}'`
- Ask:
  - `curl -s -X POST http://localhost:5000/api/ask -H "Content-Type: application/json" -H "Authorization: Bearer $API_TOKEN" -d '{"message":"hello"}'`

## Frontend manual checks

- Chat: see loading state, successful reply, error retry.
- Practice: generate MCQ (topic+difficulty), select option, evaluate, show answer/explanation; error state when API fails.
- Progress: refresh button works; cached data used if Supabase unavailable; empty state shows when no data.

## Deployment sanity

- Run `npm run dev` in `server/` and `app/` separately.
- Confirm no console errors in browser on `/chat`, `/practice`, `/progress`.
