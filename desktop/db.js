'use strict';
// Local, ENCRYPTED SQLite store for the partner desktop app. The database lives
// only on the partner's machine (Electron userData dir) — no hospital/PHI data
// ever leaves the device. Encryption uses SQLCipher via
// better-sqlite3-multiple-ciphers; the passphrase is generated once and kept
// under the OS keychain (Electron safeStorage) when available.
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const Database = require('better-sqlite3-multiple-ciphers');

function loadKey(app, safeStorage) {
  const keyPath = path.join(app.getPath('userData'), 'db.key');
  const canOSCrypt = safeStorage && safeStorage.isEncryptionAvailable();
  if (fs.existsSync(keyPath)) {
    const buf = fs.readFileSync(keyPath);
    if (canOSCrypt) {
      try { return safeStorage.decryptString(buf); } catch { /* fall through */ }
    }
    return buf.toString('utf8');
  }
  const key = crypto.randomBytes(32).toString('hex');
  const toStore = canOSCrypt ? safeStorage.encryptString(key) : Buffer.from(key, 'utf8');
  fs.writeFileSync(keyPath, toStore, { mode: 0o600 });
  return key;
}

function openDb(app, safeStorage) {
  const dbPath = path.join(app.getPath('userData'), 'meddroid-partners.db');
  const key = loadKey(app, safeStorage);
  const d = new Database(dbPath);
  // SQLCipher: apply the key BEFORE any other statement.
  d.pragma(`cipher='sqlcipher'`);
  d.pragma(`key='${key}'`);
  d.pragma('journal_mode = WAL');
  d.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sys         TEXT    NOT NULL,
      values_json TEXT    NOT NULL,
      created_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_records_sys ON records(sys, id DESC);
    CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT);
  `);

  const stmtList = d.prepare('SELECT id, values_json FROM records WHERE sys = ? ORDER BY id DESC');
  const stmtAdd = d.prepare('INSERT INTO records (sys, values_json, created_at) VALUES (?, ?, ?)');
  const stmtDel = d.prepare('DELETE FROM records WHERE id = ?');

  return {
    list(sys) {
      try { return stmtList.all(String(sys)).map((r) => JSON.parse(r.values_json)); }
      catch { return []; }
    },
    add(sys, values) {
      try { stmtAdd.run(String(sys), JSON.stringify(values || []), Date.now()); return true; }
      catch { return false; }
    },
    remove(id) {
      try { stmtDel.run(Number(id)); return true; } catch { return false; }
    },
  };
}

module.exports = { openDb };
