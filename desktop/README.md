# MedDroid Partners — Desktop

The partner desktop app. It wraps the MedDroid Partners console (the Transformer)
in an Electron shell and stores all partner data in a **local, encrypted SQLite
database on the partner's own machine** — no hospital/PHI data ever leaves the
device.

- **UI:** the same web console (`client/dist`), loaded offline at `#/partners`.
- **Database:** SQLite encrypted with SQLCipher (`better-sqlite3-multiple-ciphers`).
  The passphrase is generated once and stored under the OS keychain (Electron
  `safeStorage`) when available. DB file: `<userData>/meddroid-partners.db`.
- **Bridge:** `preload.js` exposes `window.mdxDB` to the web UI; the Partners page
  uses it when running in the desktop app, and falls back to `localStorage` on the
  website.

## Build locally

```bash
cd ../client && npm install && npm run build   # build the web UI first
cd ../desktop && npm install
npm run start          # run the app
npm run dist:win       # or dist:mac / dist:linux → installers in ./release
```

## CI

`.github/workflows/partners-desktop.yml` builds installers for Windows, macOS and
Linux on GitHub Actions and publishes them to this repo's **Releases**. Trigger by
bumping `.github/desktop-build.txt` (or run the workflow manually). The website's
Partners page links its **Download desktop app** button to the latest release.
