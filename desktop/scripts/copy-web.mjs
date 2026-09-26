// Copies the built web client (../client/dist) into ./app so Electron can load
// it offline. Run automatically before every packaging step. Requires the client
// to be built first (cd client && npm run build).
import { cp, rm, access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.resolve(here, '..');
const dist = path.resolve(desktop, '..', 'client', 'dist');
const app = path.resolve(desktop, 'app');

try {
  await access(path.join(dist, 'index.html'), constants.F_OK);
} catch {
  console.error('\n[copy-web] client/dist not found. Build the web app first:\n  cd ../client && npm install && npm run build\n');
  process.exit(1);
}

await rm(app, { recursive: true, force: true });
await mkdir(app, { recursive: true });
await cp(dist, app, { recursive: true });
console.log('[copy-web] copied client/dist → desktop/app');
