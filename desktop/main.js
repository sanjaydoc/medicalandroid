'use strict';
const { app, BrowserWindow, ipcMain, safeStorage, shell, Menu } = require('electron');
const path = require('node:path');
const { openDb } = require('./db');

let db = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#ffffff',
    title: 'MedDroid Providers',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the bundled web app straight into the Providers console (HashRouter build).
  win.loadFile(path.join(__dirname, 'app', 'index.html'), { hash: '/providers' });

  // External links open in the system browser, not inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });

  // Minimal native menu (Reload / DevTools / Quit).
  const menu = Menu.buildFromTemplate([
    { label: 'MedDroid', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'quit' }] },
    { role: 'editMenu' },
  ]);
  Menu.setApplicationMenu(menu);
}

function registerIpc() {
  ipcMain.on('mdx-db-list', (e, sys) => { e.returnValue = db ? db.list(sys) : []; });
  ipcMain.on('mdx-db-add', (e, payload) => { e.returnValue = db ? db.add(payload && payload.sys, payload && payload.values) : false; });
  ipcMain.on('mdx-db-remove', (e, payload) => { e.returnValue = db ? db.remove(payload && payload.id) : false; });
  ipcMain.on('mdx-kv-get', (e, k) => { e.returnValue = db ? db.kvGet(k) : null; });
  ipcMain.on('mdx-kv-set', (e, payload) => { e.returnValue = db ? db.kvSet(payload && payload.k, payload && payload.v) : false; });
}

app.whenReady().then(() => {
  try { db = openDb(app, safeStorage); } catch (err) { console.error('[db] failed to open encrypted store:', err); db = null; }
  registerIpc();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
