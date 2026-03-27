# PrepMind AI 🧠

PrepMind AI is your smart, AI-powered exam preparation companion. Get personalised practice questions, smart tutoring, and real-time progress analytics for any competitive exam (e.g., TCS NQT, CAT, GATE) directly in your browser.

## Features
- **Smart Practice**: Automatically generates topic-specific MCQ questions powered by AI.
- **AI Tutor**: "Teach Me" section provides theory, formulas, shortcuts, and common mistakes.
- **Ask Doubts**: Chat interface for quick clarification on concepts and exam strategies.
- **Real-Time Analytics**: Dashboard that tracks your accuracy and topic-wise progress.

## How It Works
PrepMind AI is built with HTML, CSS, and Vanilla JavaScript. It uses **GitHub Models (OpenAI API)** to access advanced LLMs (like `gpt-4o`) directly from the browser payload, leveraging a public CORS proxy (`corsproxy.io`) to handle cross-origin requests.

## Setup & Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sahaya-savari/PrepMind.git
   cd PrepMind
   ```

2. **Open the App:**
   Just double-click on `index.html` to open it in any modern browser.

3. **Provide your API Token:**
   Upon the first interaction (or page load), the app will prompt you for an API token. 
   - Get a free **GitHub Personal Access Token** at [GitHub Developer Settings](https://github.com/settings/tokens).
   - The token requires **NO SCOPES** (leave all checkboxes empty).
   - Enter it into the browser prompt. It will be securely stored in your browser's Local Storage for future visits.

## Hosting
This project is a static web page and can be hosted fully free on:
- [GitHub Pages](https://pages.github.com/)
- [Vercel](https://vercel.com/)
- [Netlify](https://netlify.com/)

**Note:** Since the API key is provided individually by the user at runtime, you can safely host this repository publicly without leaking any secrets!

## Technologies Used
- HTML5 / CSS3 (Custom responsive design with modern glassmorphism)
- Vanilla JavaScript (ES6+)
- GitHub Models API (OpenAI compatibility)
- LocalStorage for token management
