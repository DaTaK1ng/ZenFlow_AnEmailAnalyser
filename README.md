# ZenFlow — An Email Analyzer

Have you ever encountered the problem of receiving many emails but not wanting to read them at work or in your daily life? I developed a full-stack application - Zenflow, which can be connected to Google Mail. Select the emails you want to analyze, and the application will return the analysis results, generate to-do items.

ZenFlow is a full-stack app that connects to Gmail, lets you select emails to analyze, and generates concise summaries and actionable to‑do items.

## Features
- Google OAuth login and secure session management
- Fetch Gmail messages (readonly scope)
- AI-powered analysis with configurable provider
- Simple concurrency controls to avoid rate limits
- Clean separation of frontend and backend

## Tech Stack
- Frontend: Vue 3, Vite, Pinia, Vue Router, Vitest/Playwright
- Backend: Node.js, Express, Passport (Google OAuth 2.0)
- Optional AI Providers: Groq, OpenAI, OpenRouter, or local (via env config)

## Project Structure
- `frontEnd/` — Vue 3 app (Vite)
- `backEnd/` — Node/Express API (Google OAuth, Gmail, analysis routes)
- `.env-example` — environment variables template (do not commit real `.env`)

## Prerequisites
- Node.js 20+ (see `frontEnd/package.json` engines)
- A Google Cloud OAuth 2.0 Client (Client ID & Secret)

## Setup

1) Create backend env file:
   - Copy `backEnd/.env-example` to `backEnd/.env`
   - Fill required values:
     - `NODE_ENV=development`
     - `PORT=3000`
     - `FRONTEND_URL=http://localhost:5173`
     - `SESSION_SECRET=your_random_secret`
     - `GOOGLE_CLIENT_ID=...`
     - `GOOGLE_CLIENT_SECRET=...`
     - `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback`
   - Optional AI settings:
     - `AI_PROVIDER=groq | openrouter | openai | ollama`
     - `AI_API_KEY=...`
     - `AI_MODEL=...`
     - `AI_ENDPOINT=` (if required by provider)

2) Install dependencies:
   - Backend:
     ```
     cd backEnd
     npm install
     ```
   - Frontend:
     ```
     cd frontEnd
     npm install
     ```

3) Run locally:
   - Backend (dev with auto-reload):
     ```
     cd backEnd
     npm run dev
     ```
     or start normally:
     ```
     cd backEnd
     npm start
     ```
   - Frontend (Vite dev server):
     ```
     cd frontEnd
     npm run dev
     ```
   - Open `http://localhost:5173` in your browser.

## Google OAuth Notes
- In Google Cloud Console, set the Authorized redirect URI to:
  - `http://localhost:3000/api/auth/google/callback`
- Scopes used:
  - `profile`, `email`, `https://www.googleapis.com/auth/gmail.readonly`

## Tests (frontend)
- Unit: `npm run test:unit`
- E2E: `npm run test:e2e`

## Security
- Do not commit real secrets; `.env` is ignored by `.gitignore`.
- Share only `backEnd/.env-example` for reference.

## License
See `LICENSE` for details.