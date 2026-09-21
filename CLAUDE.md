# CLAUDE.md — MedAI (project memory)

Auto-loaded each session. Durable memory so no one re-reads chat history.

## What this is
**MedAI** — an AI **medical assistant** web + Android app. ChatGPT-style home
(centered "Where should we begin?" + ask box) rendered in the **StemCells Protocol
Simulator's white neumorphic theme** (`.simd`). Users pick a **speciality** and ask
medical questions; answers are general information (NOT diagnosis), with an
escalate-to-clinician stance. Founder: **Dr. Sanjay Anbu**.

Working name "MedAI" is a **placeholder** — rename in one place: `client/src/brand.ts`.

## Origin
Forked from the `sanjaydoc/stemcellsprotocol` client to reuse its exact theme +
the Assistant/ChatWidget + Admin dashboard. Stem-cell-specific pages (therapies,
kits, simulator, protocols) were copied but are **unrouted** (not linked) — trim/
delete them when convenient. `App.tsx` routes only: `/` (home), `/assistant`,
`/admin`, `/login`, `/register`.

## Stack
- **Frontend:** React 18 + TS + Vite + Tailwind, HashRouter (`VITE_STATIC=true`).
  Theme: `client/src/theme/simd.ts` (`SIMD_CSS`, extracted from the Simulator) +
  the `clay`/`cream`/`ink` Tailwind palette, Inter/Poppins.
- **Home:** `client/src/pages/Home.tsx` — ChatGPT-style, own chrome (Navbar hidden
  on `/`). Submitting the ask box stashes `{q, spec}` in `sessionStorage`
  (`medai_pending`) and routes to `/assistant`. (TODO: have Assistant consume it.)
- **Assistant/ChatWidget:** reused from StemCells — speciality selector, Online/
  Offline toggle, upload reading, chat logging.
- **Admin:** `client/src/pages/Admin.tsx` — Supabase-backed KPI cards, per-day
  chart, searchable tables, CSV export.
- **Auth:** Supabase email + **Google OAuth** (`AuthContext`), `/login` + `/register`.

## Infra — SEPARATE from StemCells (decided at kickoff)
- **Chat = a NEW Cloudflare Worker** (clone of `chat-worker/worker.js`, general
  medical system prompt already set). Deploy via the Cloudflare dashboard (paste
  `worker.js`, set `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS`, rate-limit KV). Point the
  app at it with `VITE_CHAT_ENDPOINT`. Nothing in the client hardcodes StemCells any
  more (site-relay is `VITE_CHAT_RELAY`, empty by default).
- **Supabase = a NEW project.** Client reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY`
  (or `window.SUPABASE_URL/KEY`), **empty by default** so it never writes to the
  StemCells DB. Create tables (`chat_logs`, `signups`, …) with INSERT-only RLS +
  a SELECT policy for the authenticated admin (mirror the StemCells setup).
- **Hosting:** Cloudflare Pages (build output `client/dist`), + Capacitor Android
  (`capacitor.config.json`: appId `com.medai.assistant`, webDir `client/dist`).
- See `client/.env.example` for all env vars.

## Build
- `cd client && npm install && npm run build` (tsc + vite → `client/dist`).
- Android: same web build wrapped by Capacitor (add the workflow like StemCells).

## Honesty rules (non-negotiable)
- **Interpretation, not diagnosis.** Lab/scan/ECG reads are educational; always
  defer to a clinician; surface emergencies first. Deterministic rules/validated
  calculators are the accurate core; the LLM handles the fuzzy explanation.
- Never present AI output as a diagnosis, prescription, or personal dose.

## Open TODOs
- Wire the home ask box query into the Assistant (read `medai_pending`).
- Trim/delete the unrouted stem-cell pages + unused deps (three.js, jsPDF, sim/).
- Rebrand remaining copied strings + swap logo/icons + PWA manifest/name.
- Create the Supabase project + tables; deploy the new Worker; set env; wire the
  Android build workflow. Confirm the app name with the founder.
