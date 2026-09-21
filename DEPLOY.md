# MedDroid — Deploy & Infra

Same model as StemCells Protocol: **the host serves the pre-built, committed
`docs/` — no build step, no wrangler.** Claude builds `docs/` and pushes; Cloudflare
Pages auto-deploys.

- **App name:** MedDroid · **Domain:** medicalandroid.com · **Repo:** sanjaydoc/medicalandroid

## 1. Hosting — Cloudflare Pages (git-connected)
- Workers & Pages → **Pages** → Connect to Git → `sanjaydoc/medicalandroid`
- Production branch **main** · **Build command: empty** · **Build output directory: `docs`**
- Custom domains: `medicalandroid.com` + `www.medicalandroid.com` (auto DNS + SSL).
- Every push that changes `docs/` auto-deploys. To rebuild `docs/`:
  `cd client && npm install && npm run build` then `npm run build:pages` (from repo root),
  re-add `docs/CNAME` (`medicalandroid.com`) + `docs/.nojekyll`, commit, push.
- DNS: nameservers moved to Cloudflare; **keep the email MX + SPF records** (DNS-only).

## 2. Chat backend — Cloudflare Worker (dashboard, NOT wrangler)
- Create a Worker, paste `chat-worker/worker.js` (Edit code → Deploy). `wrangler.toml`
  in that folder is documentation only.
- Settings → Variables & Secrets:
  - `ANTHROPIC_API_KEY` (secret)
  - `ALLOWED_ORIGINS` =
    `https://medicalandroid.com,https://www.medicalandroid.com,https://medicalandroid.pages.dev,https://localhost,capacitor://localhost`
  - (optional) rate-limit KV namespace `RATE_LIMIT`
- Copy the Worker URL → it becomes `VITE_CHAT_ENDPOINT`.

## 3. Database + auth — Supabase (new project)
- Create a new Supabase project. SQL Editor → run `supabase/schema.sql`
  (tables `signups`, `chat_logs`, `page_views`; anon INSERT-only + authenticated SELECT).
- Authentication → Providers → **Google**: enable, set **Site URL**
  `https://medicalandroid.com`, and add redirect URLs:
  `https://medicalandroid.com`, `https://www.medicalandroid.com`,
  `https://medicalandroid.pages.dev` (and `http://localhost:5173` for dev).
- Copy the **Project URL** + **anon/publishable key** → they become
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY`.

## 4. Bake env into the build
Because the host serves the committed `docs/`, the public values are baked at build
time (they're all frontend-safe — anon key + worker URL). Build `docs/` with:
```
VITE_CHAT_ENDPOINT=https://<worker-url> \
VITE_SUPABASE_URL=https://<project>.supabase.co \
VITE_SUPABASE_KEY=<anon-key> \
npm run build:pages
```
then commit `docs/` and push → Cloudflare auto-deploys with chat + login + admin live.
(Claude does this step; the values live in the committed bundle, same as StemCells.)

## 5. Android (Capacitor)
- Workflow `.github/workflows/android-apk.yml` builds the APK on GitHub Actions
  (trigger: bump `.github/apk-build.txt`, or run manually). Set repo **Secrets**
  `VITE_CHAT_ENDPOINT`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`. APK is uploaded as
  the `meddroid-android-apk` artifact.
- `capacitor.config.json`: appId `com.meddroid.app`, webDir `client/dist`.
