<div align="center">

# PrepMind AI 🧠

**An intelligent, resilient AI-powered exam preparation and personalized learning platform.**

Adaptive practice questions · Socratic AI tutoring · Concept deep dives · Notes retrieval · Progress analytics
for CAT, GATE, UPSC, JEE, NEET and custom exams.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_Site-black?style=for-the-badge)](https://prep-weblearning.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](#license)
[![Open Source](https://img.shields.io/badge/Open_Source-Yes-2ea44f?style=for-the-badge&logo=github)](https://github.com/sahaya-savari/PrepMind)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](#contributing)

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini-8E75C2?logo=google&logoColor=white)](https://ai.google.dev/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

[Live App](https://prep-weblearning.vercel.app/) · [Getting Started](#getting-started) · [Contributing](#contributing) · [Report an Issue](https://github.com/sahaya-savari/PrepMind/issues)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Core Principles](#core-principles)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Repository Structure](#repository-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints-express-server)
- [Getting Started](#getting-started)
- [Running Without API Keys](#running-without-api-keys)
- [Deployment](#deployment)
- [Security](#security)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Acknowledgements](#acknowledgements)
- [License](#license)

---

## Overview

PrepMind AI helps students prepare for competitive exams with practice questions, an AI tutor, structured concept breakdowns, syllabus navigation and progress tracking, all in one platform.

It is built to **keep working when things go wrong**: if AI quotas run out or database credentials are missing, the app falls back to built-in question generators and local storage instead of locking the student out.

> [!NOTE]
> AI-generated questions and explanations can contain mistakes. Always verify important facts and formulas against official study material.

## Core Principles

| | Principle |
|---|---|
| 🛡️ | **Resilient:** automatic fallback to offline generators and local storage |
| 🔐 | **Secure by design:** frontend clients never hold raw LLM API keys |
| 🎯 | **Learning-first:** the tutor guides students through problems instead of just giving answers |
| 🔓 | **Open source:** MIT licensed, and contributions are welcome |

---

## Key Features

| | Feature | Description |
|---|---|---|
| 🎯 | **Instant Exam Onboarding & Dashboard** | Select from predefined competitive exams (CAT, GATE, UPSC, JEE, NEET) or enter custom exams. Automatically prepares customized syllabus paths, strategy recommendations, and study roadmaps. |
| ⚡ | **Smart MCQ Practice Engine** | Generates topic-wise questions with customizable difficulty levels (`Easy`, `Medium`, `Hard`). Provides immediate scoring, step-by-step solutions, and trick explanations. |
| 🤖 | **Socratic AI Study Tutor (Chat)** | Interactive conversational assistant tailored to the active exam syllabus. Guides students through complex problem-solving rather than just providing static answers. |
| 💡 | **Concept Breakdown & Deep Dives** | Multi-level explanations dissecting core formulas, underlying theory, common traps, and mental shortcuts. |
| 📚 | **Notes & Knowledge Retrieval (RAG-lite)** | Upload or paste study notes to query contextual answers powered by recent notes context in Supabase. |
| 📊 | **Analytics & Mastery Tracking** | Visualizes question accuracy, total attempts, weak areas, and trends with persistent local and cloud storage. |
| 🛡️ | **Offline & Degraded Fallback Mode** | Zero-lockout design: if external API quotas or Supabase credentials are unavailable, the platform automatically falls back to deterministic synthetic generators and offline `localStorage` storage. |
| 🎙️ | **Voice & Audio Synthesis (Companion App)** | Speech synthesis and speech recognition integration via the Web Speech API. |

<!-- Add screenshots here once available:
![Dashboard](./docs/screenshots/dashboard.png)
![Practice](./docs/screenshots/practice.png)
![AI Tutor](./docs/screenshots/chat.png)
-->

---

## How It Works

1. **Choose an exam:** pick CAT, GATE, UPSC, JEE, NEET or enter a custom exam.
2. **Get your roadmap:** syllabus paths, strategy recommendations and a study plan are prepared for you.
3. **Practice:** generate topic-wise MCQs at your chosen difficulty and get instant scoring with solutions.
4. **Ask the tutor:** chat with the Socratic AI tutor tuned to your exam's syllabus.
5. **Use your notes:** upload or paste notes and ask questions against them.
6. **Track progress:** review accuracy, attempts, weak areas and trends.

---

## Tech Stack

### Frontend

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Primary App (`/app`)** | **React 18** + **TypeScript** | Modern Single Page Application (SPA) deployed to production |
| **Bundler & Tooling** | **Vite 5** | Lightning-fast HMR and optimized production bundles |
| **Styling** | **Tailwind CSS 3.4** | Modern, responsive dark-mode and glassmorphic user interface |
| **Icons & Animations** | **Lucide React** + **Framer Motion** | Polished micro-interactions and iconography |
| **State & Navigation** | **React Context API** | Modular state for user authentication, exams, and sessions |
| **Companion App (`/`)** | **Vanilla HTML5 / CSS3 / ES6+** | Lightweight, framework-free alternative with Web Speech API |

### Backend & Cloud Services

| Component | Technology | Description |
| :--- | :--- | :--- |
| **API Server (`/server`)** | **Node.js** + **Express 4** | Protected REST API with Bearer token authentication and rate limiting |
| **Serverless Proxy (`/api`)** | **Vercel Serverless Functions** | Secure zero-leakage proxy forwarding requests to Gemini API |
| **AI / LLM Engine** | **Google Gemini API** (`gemini-2.5-flash` / `1.5-flash`) | Contextual reasoning, MCQ generation, and study tutoring |
| **Database & Auth** | **Supabase (PostgreSQL)** | Persistent storage for interviews, notes, and user progress with RLS |
| **Deployment & Hosting** | **Vercel** | CI/CD deployment with edge CDN caching |

---

## System Architecture

PrepMind AI implements a dual-tier client architecture with secure backend orchestration:

```mermaid
graph TD
    Client["Client Browser (React 18 SPA)"] -->|Frontend State| LS["Local Storage (Offline Cache)"]
    Client -->|Zero Client Keys| VercelAPI["Vercel Serverless Function (/api/ai.js)"]
    Client -->|Authenticated REST| ExpressAPI["Express Backend (/server)"]

    VercelAPI -->|Private GEMINI_API_KEY| Gemini["Google Gemini API (gemini-2.5-flash)"]
    ExpressAPI -->|Gemini API Key| Gemini
    ExpressAPI -->|Database & Auth| Supabase[("Supabase PostgreSQL")]

    Gemini -->|Streaming / JSON| Client
    Supabase -->|Notes & Progress| Client
```

1. **Security-first AI communication:** frontend clients never hold raw LLM API keys. All queries route through serverless proxies or Express middleware.
2. **Resilient failure handling:** if external API quotas are hit or credentials are not configured, automatic fallbacks generate mock exam structures and save results locally without disrupting the user experience.

---

## Repository Structure

```
PrepMind/
├── app/                        # Primary React + TypeScript production application
│   ├── api/
│   │   └── ai.js               # Serverless proxy discovered when Vercel root is app/
│   ├── public/                 # Static assets, sitemap.xml, robots.txt, og-image.png
│   ├── src/
│   │   ├── components/         # Layout, UI tokens, React Bits, and shared components
│   │   ├── context/            # ExamContext, AuthContext, ThemeContext
│   │   ├── data/               # Deterministic fallback question bank
│   │   ├── hooks/              # useAuth and custom application hooks
│   │   ├── lib/                # Supabase client initialization & Tailwind cn utils
│   │   ├── pages/              # Home, Practice, Chat, Progress, Profile
│   │   ├── api.ts              # Protected centralized API & database integration layer
│   │   ├── config.ts           # Runtime environment & feature flag constants
│   │   ├── storage.ts          # LocalStorage caching & fallback engine
│   │   ├── App.tsx             # Root application and route controller
│   │   ├── main.tsx            # Application entrypoint
│   │   └── index.css           # Design tokens, midnight palette, typography
│   ├── package.json            # Frontend dependencies & build scripts
│   ├── vite.config.ts          # Vite build configuration (SWC + PWA)
│   ├── vercel.json             # App-level SPA routing & serverless rewrites
│   └── tailwind.config.js      # Tailwind CSS design system tokens
│
├── server/                     # Express.js REST API backend
│   ├── routes/                 # Modular API routes (chat, exam, notes, progress)
│   ├── services/               # Backend business logic (examService, memoryService, ragService)
│   ├── server.js               # Express application, routes, and rate-limiting
│   ├── db.js                   # Supabase connection setup
│   ├── supabase_schema.sql     # PostgreSQL database schema with RLS
│   ├── package.json            # Server dependencies
│   └── .env.example            # Backend environment variables template
│
├── api/                        # Vercel Serverless Functions
│   └── ai.js                   # Secure proxy discovered when Vercel root is repository root
│
├── test/                       # Automated test suites
│   ├── api-test.mjs            # AI provider orchestration & validation tests
│   └── local-dev-api.mjs       # Local developer API mock harness
│
├── docs/                       # Production readiness & QA specifications
│   ├── PRODUCTION_UPGRADE_PLAN.md
│   ├── PRODUCTION_READINESS_PRD.md
│   └── PRODUCTION_READINESS_CHECKLIST.md
│
├── js/                         # Companion Vanilla JS modules
│   ├── api.js                  # Client API fetchers
│   ├── state.js                # In-memory reactive state manager
│   └── ui.js                   # UI controller and DOM interactions
│
├── css/                        # Custom CSS stylesheets (Companion App)
├── index.html                  # Companion Vanilla JS app entry point
├── supabase_schema.sql         # PostgreSQL schema (interviews, questions, results) with RLS
├── vercel.json                 # Root Vercel SPA routing & serverless rewrites
├── sitemap.xml                 # Search engine canonical XML sitemap
├── robots.txt                  # Web crawler access configuration
├── og-image.png                # Social preview image (1200x630)
├── package.json                # Root package configuration with unified dev/test scripts
└── README.md                   # Project documentation
```

---

## Database Schema

The database is built on **PostgreSQL (Supabase)** with Row-Level Security (RLS) enabled. See [`supabase_schema.sql`](./supabase_schema.sql) for the complete schema:

```sql
create extension if not exists "pgcrypto";

-- Core interviews / session management
create table if not exists public.interviews (
  id bigint generated by default as identity primary key,
  title text not null,
  role text default 'General',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Practice questions associated with interviews
create table if not exists public.questions (
  id bigint generated by default as identity primary key,
  interview_id bigint references public.interviews(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text,
  explanation text,
  created_at timestamptz default now()
);

-- Evaluated drill results and feedback
create table if not exists public.results (
  id bigint generated by default as identity primary key,
  interview_id bigint references public.interviews(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  score numeric not null default 0,
  feedback text default '',
  created_at timestamptz default now()
);
```

---

## API Endpoints (Express Server)

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/health` | No | Server uptime & Supabase connectivity status |
| `POST` | `/api/generate` | Bearer Token | Generates topic-specific MCQs with Gemini |
| `POST` | `/api/evaluate` | Bearer Token | Evaluates student answer arrays and returns scores |
| `POST` | `/api/ask` | Bearer Token | Direct LLM conversational query |
| `POST` | `/api/store` | Bearer Token | Stores user notes into Supabase |
| `POST` | `/api/query-context` | Bearer Token | RAG-lite query utilizing stored notes as context |

---

## Getting Started

### Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- *(Optional)* A [Google AI Studio Gemini API Key](https://aistudio.google.com/)
- *(Optional)* A [Supabase Project](https://supabase.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/sahaya-savari/PrepMind.git
cd PrepMind
```

### 2. Run the React Production App (`/app`)

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

Create `app/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_API_TOKEN=your_backend_secret_token
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your_supabase_anon_key
```

> [!WARNING]
> Every `VITE_` variable is embedded in the browser bundle and visible to anyone using the app. Never put a private secret in one. Only the Supabase **anon** key is safe to expose, and only with RLS enabled.

### 3. Run the Backend Server (`/server`)

```bash
cd ../server
npm install
npm run dev
```

The server starts on [http://localhost:5000](http://localhost:5000).

Create `server/.env`:

```env
PORT=5000
API_TOKEN=your_backend_secret_token
GEMINI_API_KEY=your_google_gemini_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_or_anon_key
```

### 4. (Optional) Run the Vanilla JS Companion App

From the project root:

```bash
npx serve .
```

Open [http://localhost:3000](http://localhost:3000) to view the lightweight Vanilla JS interface.

### 5. Automated Tests & Quality Gates

Run these from the repository root:

| Command | Purpose |
| :--- | :--- |
| `npm test` | Run the AI provider orchestration and offline fallback test suite |
| `npm run build` | Build the production Vite bundle |
| `npm run typecheck` | Run TypeScript typecheck |
| `npm run server:dev` | Run the lightweight local dev API harness (port 5000) |

---

## Running Without API Keys

Both the Gemini key and Supabase are optional for local development. If they are missing or a quota is exhausted, PrepMind AI switches to its fallback mode:

| Missing | What happens |
|---|---|
| Gemini API key / quota exhausted | Deterministic synthetic question generators are used |
| Supabase credentials | Progress and results are saved in browser `localStorage` |

This lets you explore and develop the app without setting up any external service.

---

## Deployment

### Deploying to Vercel

1. Push your repository to GitHub.
2. Import the project into your **Vercel Dashboard**.
3. Set the **Root Directory** to `app` (for the React application) or deploy the root repository.
4. Add the following **Environment Variables** in Vercel Project Settings:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `VITE_SUPABASE_URL`: *(Optional)* Your Supabase URL
   - `VITE_SUPABASE_KEY`: *(Optional)* Your Supabase anon key
5. Deploy! Vercel will automatically provision the application and edge endpoints.

### Deploying the Express Backend (`/server`)

The Express server is deployed separately from the Vercel frontend, on any Node.js host.

1. Set the server's environment variables on your host: `API_TOKEN`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`.
2. Point the frontend's `VITE_API_URL` to your deployed server URL.
3. Check that `GET /api/health` responds before connecting the frontend.

---

## Security

- Raw LLM API keys are never shipped to the browser; AI calls go through the serverless proxy or the Express backend
- Express API routes require a Bearer token and are rate limited
- Supabase tables use Row-Level Security (RLS)
- Never commit `.env` files or real keys to the repository

**Reporting a vulnerability:** please do not post exploit details publicly. Use the **Security** tab of the repository and click **Report a vulnerability**, or open a GitHub Issue with the title prefix `[Security]` and no sensitive details.

---

## Roadmap

> [!NOTE]
> These are plans, not promises. Priorities may change.

- [ ] Frontend UI redesign (in progress)
- [ ] Timer per question
- [ ] Score history graph
- [ ] Weak-topic detection
- [ ] Dashboard UX improvements

Have an idea? [Open an issue](https://github.com/sahaya-savari/PrepMind/issues) to discuss it.

---

## Contributing

PrepMind AI is open source and contributions are welcome, from bug reports and docs fixes to new features.

### Quick start

1. **Fork** the repository and clone your fork
2. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes, following the existing code style
4. Run the quality checks from the repository root:
   ```bash
   npm test
   npm run typecheck
   npm run build
   ```
5. Commit with a clear message (for example `feat: add timer per question` or `fix: handle empty notes`)
6. Push your branch and open a **Pull Request** describing what changed and why

### Guidelines

- Keep pull requests focused: one feature or fix per PR
- Do not commit secrets, `.env` files or API keys
- Keep the offline fallback mode working for any feature that calls an AI or database service
- For big changes, open an issue first so we can discuss the approach

### Reporting bugs

[Open an issue](https://github.com/sahaya-savari/PrepMind/issues) with steps to reproduce, what you expected, what happened, and your browser and Node.js version.

### Contributors

<a href="https://github.com/sahaya-savari/PrepMind/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=sahaya-savari/PrepMind" alt="Contributors" />
</a>

---

## Acknowledgements

PrepMind AI is built on the work of these open-source projects and services:

[React](https://react.dev/) · [TypeScript](https://www.typescriptlang.org/) · [Vite](https://vitejs.dev/) · [Tailwind CSS](https://tailwindcss.com/) · [Framer Motion](https://www.framer.com/motion/) · [Lucide](https://lucide.dev/) · [Express](https://expressjs.com/) · [Supabase](https://supabase.com/) · [Google Gemini API](https://ai.google.dev/)

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

<div align="center">

If PrepMind AI helps you, consider giving the repository a ⭐

**Built by [Sahaya Savari F](https://github.com/sahaya-savari)**

</div>
