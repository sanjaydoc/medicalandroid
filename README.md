# MedDroid — AI Medical Assistant

A ChatGPT-style medical assistant (web + Android) in the StemCells Protocol
Simulator's neumorphic theme. Pick a speciality, ask a question, get clear general
information — **not a diagnosis**; always consult a clinician.

## Quick start
```bash
cd client
cp .env.example .env.local   # fill in the new Worker + Supabase values
npm install
npm run dev                  # local dev
npm run build                # production build -> client/dist
```

## Structure
- `client/` — React + Vite app (home, assistant, admin, login/register).
- `chat-worker/` — Cloudflare Worker (Anthropic proxy, general-medical prompt).
- `capacitor.config.json` — Android wrapper config.

See `CLAUDE.md` for architecture, infra decisions, and TODOs.

> Educational information only. MedDroid is AI and can make mistakes. It does not
> diagnose, prescribe, or replace a qualified clinician.
