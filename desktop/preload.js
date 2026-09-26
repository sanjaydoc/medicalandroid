'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Exposes the local encrypted-SQLite store to the Providers web UI as window.mdxDB.
// The web page uses this when present (desktop); on the website it falls back to
// localStorage. Synchronous IPC keeps the existing render path simple — the DB is
// local and tiny, so blocking calls are imperceptible.
contextBridge.exposeInMainWorld('mdxDB', {
  available: true,
  platform: process.platform,
  list: (sys) => { try { return ipcRenderer.sendSync('mdx-db-list', sys) || []; } catch { return []; } },
  add: (sys, values) => { try { return ipcRenderer.sendSync('mdx-db-add', { sys, values }); } catch { return false; } },
  remove: (id) => { try { return ipcRenderer.sendSync('mdx-db-remove', { id }); } catch { return false; } },
  // encrypted key-value store for structured module collections (HIS etc.)
  kvGet: (k) => { try { return ipcRenderer.sendSync('mdx-kv-get', k); } catch { return null; } },
  kvSet: (k, v) => { try { return ipcRenderer.sendSync('mdx-kv-set', { k, v }); } catch { return false; } },
});
