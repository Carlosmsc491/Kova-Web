# KOVA Web — Personal Finance OS

Mobile-first web version of KOVA, built with React 18 + Vite + Firebase + Tailwind CSS.

## Stack

- **React 18 + Vite 5** — fast SPA
- **Tailwind CSS** — dark theme, mobile-first design
- **Zustand** — global state
- **Firebase** (Auth + Firestore) — backend & auth
- **Recharts** — charts
- **Claude AI** (Anthropic) — AI financial assistant

## Features

- 🔐 **PIN unlock** — secure 4–6 digit PIN via Firebase Auth
- 📊 **Dashboard** — Truly Available balance, 14-day payment calendar, goals
- 💸 **Expenses** — CRUD for fixed/installment expenses, mark paid
- 💰 **Income** — Job 1 biweekly + Job 2 day logger with calendar
- 💳 **Credit** — Card management, utilization tracking, avalanche pay order
- 🎯 **Goals** — Savings goals with contribution tracking
- 🤖 **AI Chat** — Claude Sonnet financial assistant
- 📋 **History** — Activity log

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local and add your VITE_ANTHROPIC_API_KEY
npm run dev
```

## Deploy to GitHub Pages

Push to `main` and GitHub Actions will automatically build and deploy to:
`https://Carlosmsc491.github.io/Kova-Web/`

Make sure to add `VITE_ANTHROPIC_API_KEY` as a repository secret in:
GitHub → Settings → Secrets and variables → Actions

## Firebase Setup

The Firebase project is pre-configured (`kona-finances`). Make sure:
1. Email/password authentication is enabled in Firebase console
2. Firestore rules allow authenticated reads/writes

### Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
