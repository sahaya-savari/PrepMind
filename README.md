# PrepMind AI 🧠

PrepMind AI is a production-ready, server-backed exam preparation companion. It builds a personalised dashboard with overview, practice MCQs, teaching notes, chat tutoring, and progress analytics for any exam (e.g., CAT, GATE, UPSC, JEE). No frontend keys, no prompts—works out of the box via a secure Vercel function proxying Gemini.

## ⚠️ Note
This project currently uses mock AI responses. Real AI (Gemini/Ollama) will be added in Phase 2.

## Features
- **Instant Exam Dashboard**: Auto-generates overview, syllabus chips, strategy, and study plan.
- **Smart Practice MCQs**: Topic + difficulty based MCQs with explanations and quick tricks.
- **Teach Me Mode**: Topic-wise theory, formulas, examples, traps, and shortcuts.
- **Notes-based Q&A (RAG-lite)**: Paste notes, get contextual answers with lightweight retrieval.
- **Chat Tutor**: Conversational Q&A tailored to the chosen exam.
- **Progress Analytics**: Accuracy ring, topic-wise stats, attempts tracking.

## Tech Stack
- HTML5, CSS3 (glassmorphism, responsive, dark theme)
- Vanilla JavaScript (state management, API orchestration)
- Vercel Serverless Functions (Node) as secure AI proxy
- Gemini API endpoint (no frontend key exposure)

## Live Demo
- **Vercel**: _add your deployed URL here_

## Screenshots
- `./screenshots/landing.png`
- `./screenshots/dashboard.png`
(Add images after capturing.)

## Project Structure
```
PrepMind/
├─ index.html
├─ css/
│  └─ styles.css
├─ js/
│  ├─ state.js
│  ├─ api.js
│  └─ ui.js
└─ api/
   └─ ai.js
```

## How It Works
- Frontend sends all AI requests to `/api/ai` (no Authorization header client-side).
- The Vercel function `/api/ai.js` reads `process.env.GEMINI_API_KEY`, forwards to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, and returns JSON.
- State and caching are handled in-browser; no secrets are stored or requested from users.

## Installation (Local)
1. Clone the repo:
   ```bash
   git clone https://github.com/sahaya-savari/PrepMind.git
   cd PrepMind
   ```
2. Run locally (simple static serve):
   ```bash
   npx serve .
   # or any static server; ensure /api is deployed or mocked if needed
   ```
   For full functionality, deploy to Vercel so the serverless function is available.

## Environment Variables
- `GEMINI_API_KEY` (required) — set in Vercel Project Settings → Environment Variables (Production + Preview).

## Deployment (Vercel)
1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Set `GEMINI_API_KEY` in Vercel (Production + Preview).
4. Deploy. The site will serve `/index.html` and the serverless proxy at `/api/ai`.

## Development Notes
- No API key is ever requested or stored on the client.
- All scripts and styles load from absolute paths: `/js/state.js`, `/js/api.js`, `/js/ui.js`, `/css/styles.css`.
- Caching: lightweight response cache in `localStorage` for AI replies to reduce duplicate calls.
- Logging: frontend logs when major actions fire; backend logs model/message counts and upstream errors.

## Future Improvements
- Add offline/local fallback tips if the model API is unreachable.
- Add richer progress charts and streaks.
- Add i18n for non-English locales.
- Add rate-limit guardrails and user quotas if multi-tenant.

## License
MIT
