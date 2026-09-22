// Builds the static (backend-free) client and copies it into ./docs so it can
// be served by GitHub Pages from the /docs folder. Cross-platform.
import { execSync } from 'node:child_process';
import { cpSync, rmSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'client', 'dist');
const docs = join(root, 'docs');

console.log('▶ Building static client (VITE_STATIC=true)…');
execSync('npm --prefix client run build', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, VITE_STATIC: 'true' },
});

console.log('▶ Copying build into docs/ (keeping screenshots + .nojekyll)…');
if (!existsSync(docs)) mkdirSync(docs);
// Wipe everything in docs/ EXCEPT screenshots and .nojekyll, then copy the
// whole build output (index.html, assets/, favicon.svg, and any public/ assets
// such as therapy/ images).
for (const entry of readdirSync(docs)) {
  if (entry === 'screenshots' || entry === '.nojekyll' || entry === 'app') continue;
  rmSync(join(docs, entry), { recursive: true, force: true });
}
for (const entry of readdirSync(dist)) {
  cpSync(join(dist, entry), join(docs, entry), { recursive: true });
}

// Stamp the service worker with a unique build id so every deploy ships a
// genuinely different sw.js — the browser then installs the new worker, wipes the
// old cache, and auto-reloads clients (fixes the "frozen on a stale cache" white
// screen). Any change to sw.js content forces a worker update; the id guarantees it.
const swPath = join(docs, 'sw.js');
if (existsSync(swPath)) {
  const buildId = Date.now().toString(36);
  const sw = readFileSync(swPath, 'utf8').replaceAll('__BUILD_ID__', buildId);
  writeFileSync(swPath, sw);
  console.log(`▶ Stamped service worker cache: meddroid-${buildId}`);
} else {
  console.warn('!! docs/sw.js not found — service worker not stamped.');
}

console.log('✅ docs/ updated. Commit & push to publish to GitHub Pages.');
