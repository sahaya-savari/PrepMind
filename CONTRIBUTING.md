# Contributing to PrepMind AI

First off, thank you for considering contributing to PrepMind AI! 🚀

PrepMind AI is an open-source, resilient AI-powered exam preparation platform built with React 18, TypeScript, Tailwind CSS, Node.js, and multi-provider AI fallbacks. We welcome contributions that improve exam syllabi, enhance tutoring capabilities, fix bugs, optimize performance, and polish the user experience.

---

## 📑 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Development Workflow](#development-workflow)
- [Coding Conventions](#coding-conventions)
- [Running Tests & Quality Gates](#running-tests--quality-gates)
- [Commit Guidelines](#commit-guidelines)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Security Disclosures](#security-disclosures)

---

## Code of Conduct

This project and everyone participating in it is governed by the [PrepMind AI Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## Prerequisites

Before starting, ensure your system meets the following requirements:

- **Node.js**: `v18.0.0` or higher (verified on Node 18, 20, 22, 24)
- **npm**: `v9.0.0` or higher
- **Git**: Installed and configured
- *(Optional)* A free [Google AI Studio Gemini API Key](https://aistudio.google.com/) for live AI tutoring during local testing.

---

## Local Setup

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/PrepMind.git
   cd PrepMind
   ```

2. **Install Frontend Dependencies**:
   ```bash
   cd app
   npm install
   cd ..
   ```

3. **Install Root & Server Dependencies** *(if modifying backend or running server tools)*:
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

4. **Configure Environment Variables**:
   Create `app/.env` using the template:
   ```bash
   cp app/.env.example app/.env
   ```
   *(By default, leaving `VITE_API_URL` empty allows the app to use the relative `/api/ai` endpoint or deterministic offline fallbacks without any mandatory paid services).*

5. **Start the Frontend Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Development Workflow

1. Always branch off `main` or the active feature branch (`ui-terminal-dark`).
2. Use descriptive branch names:
   - `feat/interactive-mcq-timer`
   - `fix/progress-cache-invalidation`
   - `docs/clarify-api-fallback-order`
3. Keep changes focused and atomic. Avoid large refactors mixed with feature additions.

---

## Coding Conventions

### TypeScript & React
- Write strictly typed TypeScript (`.tsx` / `.ts`).
- Prefer functional components and React hooks over class components.
- Do not use `any` unless strictly necessary and documented.

### Styling & Design System
- Use **Tailwind CSS 3.4** utilities with the **Midnight / Terminal-Dark** design token palette:
  - Surface tokens: `bg-midnight-bg`, `bg-midnight-surface`, `bg-midnight-elevated`
  - Border tokens: `border-midnight-border`, `border-midnight-accent/30`
  - Typography tokens: `text-ink-primary`, `text-ink-secondary`, `text-ink-muted`
  - Use the [`cn()`](app/src/lib/utils.ts) utility to merge conditional Tailwind classes.

### Backend & API Safety
- **Protected File**: Never modify, move, or reformat [`app/src/api.ts`](app/src/api.ts) without explicit maintainer direction.
- All API handlers in [`api/ai.js`](api/ai.js) and [`app/api/ai.js`](app/api/ai.js) must preserve dual discovery and strictly validate request bodies prior to provider dispatch.

---

## Running Tests & Quality Gates

Run all quality checks directly from the repository root before submitting code:

```bash
# 1. Run automated AI provider, RAG, notebook, and BYOK test suites
npm run test:all

# 2. Run TypeScript strict typecheck across the frontend
npm run typecheck

# 3. Build the production Vite bundle
npm run build

# 4. (Optional) Run the local zero-dependency mock API on port 5000
npm run server:dev
```

Ensure all commands exit with code 0 before opening a pull request.

---

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` Adds a new feature or capability
- `fix:` Fixes a bug or unexpected behavior
- `docs:` Documentation changes only
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `perf:` Performance optimization
- `test:` Adding or updating tests
- `chore:` Maintenance, package scripts, or repository hygiene

**Example**:
```bash
git commit -m "feat(practice): add keyboard shortcut navigation for MCQ options"
```

---

## Submitting a Pull Request

1. **Check Git Status**: Confirm no accidental or temporary files are staged.
2. **Review Diff**: Ensure no API keys, private tokens, or `.env` files are tracked:
   ```bash
   git diff --check
   ```
3. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```
4. **Open a Pull Request**:
   - Provide a clear summary of what was changed and why.
   - List the exact tests and verification steps you ran.
   - Link any related GitHub issues.

---

## Security Disclosures

If you discover a potential security vulnerability, please review our **[Security Policy](SECURITY.md)** and report it responsibly rather than opening a public issue.
