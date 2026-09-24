// Generic, cloud-synced record store shared by the newer agentic workflows
// (child immunization, pregnancy, recovery, medicines, caregiver profiles…).
// Local-first (instant + offline) with Supabase mirror per user, last-write-wins.
// Requires finetune/supabase-records.sql run once.

import { supabase } from './supabase';

export interface HealthRecord<T = unknown> {
  id: string;
  kind: string;      // 'child' | 'pregnancy' | 'recovery' | 'medicine' | 'profile' | …
  data: T;
  ts: number;        // created
  updated: number;   // last modified (for conflict resolution)
}

const KEY = 'meddroid_records_v1';

function readAll(): HealthRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as HealthRecord[]) : [];
  } catch {
    return [];
  }
}
function writeAll(list: HealthRecord[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export function listRecords<T = unknown>(kind?: string): HealthRecord<T>[] {
  const all = readAll() as HealthRecord<T>[];
  return (kind ? all.filter((r) => r.kind === kind) : all).sort((a, b) => a.ts - b.ts);
}

export function upsertRecord<T = unknown>(rec: Partial<HealthRecord<T>> & { kind: string; data: T }): HealthRecord<T> {
  const all = readAll();
  const now = Date.now();
  const id = rec.id || `${now}-${Math.random().toString(36).slice(2, 7)}`;
  const existing = all.find((r) => r.id === id);
  const full: HealthRecord<T> = {
    id, kind: rec.kind, data: rec.data,
    ts: rec.ts || existing?.ts || now,
    updated: now,
  };
  const next = existing ? all.map((r) => (r.id === id ? full : r)) : [...all, full];
  writeAll(next);
  void pushRemote(full);
  return full;
}

export function deleteRecord(id: string) {
  writeAll(readAll().filter((r) => r.id !== id));
  if (_uid && supabase) {
    try { void supabase.from('health_records').delete().eq('user_id', _uid).eq('client_id', id); } catch { /* ignore */ }
  }
}

// ---- cloud sync ----
let _uid: string | null = null;
export function setRecordsUser(id: string | null) {
  const changed = id !== _uid;
  _uid = id;
  if (id && changed) void syncRecords();
}

/** Wipe this device's local records cache (used on account switch/logout so one
 * user's data never bleeds into another account on a shared device). */
export function clearLocalRecords() {
  _uid = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

function toRow(r: HealthRecord) {
  return { user_id: _uid, client_id: r.id, kind: r.kind, data: r.data, ts: new Date(r.ts).toISOString(), updated: new Date(r.updated).toISOString() };
}
function fromRow(row: Record<string, unknown>): HealthRecord {
  return {
    id: (row.client_id as string) || (row.id as string),
    kind: row.kind as string,
    data: row.data,
    ts: new Date(row.ts as string).getTime(),
    updated: new Date((row.updated as string) || (row.ts as string)).getTime(),
  };
}

async function pushRemote(r: HealthRecord) {
  if (!_uid || !supabase) return;
  try { await supabase.from('health_records').upsert(toRow(r), { onConflict: 'user_id,client_id' }); } catch { /* offline / not set up */ }
}

/** Pull + merge (last-write-wins by `updated`), then push local-newer rows. */
export async function syncRecords(): Promise<boolean> {
  if (!_uid || !supabase) return false;
  try {
    const { data, error } = await supabase.from('health_records').select('*').eq('user_id', _uid);
    if (error) return false;
    const remote = (data || []).map(fromRow);
    const local = readAll();
    const byId = new Map<string, HealthRecord>();
    for (const r of local) byId.set(r.id, r);
    const toPush: HealthRecord[] = [];
    for (const r of remote) {
      const cur = byId.get(r.id);
      if (!cur || r.updated > cur.updated) byId.set(r.id, r);       // remote wins
      else if (cur.updated > r.updated) toPush.push(cur);           // local newer → push
    }
    // local-only rows
    const remoteIds = new Set(remote.map((r) => r.id));
    for (const r of local) if (!remoteIds.has(r.id)) toPush.push(r);
    const merged = Array.from(byId.values());
    writeAll(merged);
    if (toPush.length) {
      try { await supabase.from('health_records').upsert(toPush.map(toRow), { onConflict: 'user_id,client_id' }); } catch { /* ignore */ }
    }
    return true;
  } catch {
    return false;
  }
}
