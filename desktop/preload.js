'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Exposes the local encrypted-SQLite store to the Partners web UI as window.mdxDB.
// The web page uses this when present (desktop); on the website it falls back to
// localStorage. Synchronous IPC keeps the existing render path simple — the DB is
// local and tiny, so blocking calls are imperceptible.
contextBridge.exposeInMainWorld('mdxDB', {
  available: true,
  platform: process.platform,
  list: (sys) => { try { return ipcRenderer.sendSync('mdx-db-list', sys) || []; } catch { return []; } },
  add: (sys, values) => { try { return ipcRenderer.sendSync('mdx-db-add', { sys, values }); } catch { return false; } },
  remove: (id) => { try { return ipcRenderer.sendSync('mdx-db-remove', { id }); } catch { return false; } },
});
