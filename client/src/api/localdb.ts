/* Local collection store for provider modules (HIS, etc.).
   Desktop: encrypted SQLite via window.mdxDB.kv* (SQLCipher). Web: localStorage.
   Data never leaves the provider's machine. Records are plain objects with an id. */

type Row = Record<string, any> & { id: string };

function kvGet(k: string): string | null {
  const d: any = typeof window !== 'undefined' ? (window as any).mdxDB : null;
  if (d && typeof d.kvGet === 'function') { try { const v = d.kvGet(k); return v == null ? null : String(v); } catch { /* fall through */ } }
  try { return localStorage.getItem(k); } catch { return null; }
}
function kvSet(k: string, v: string): void {
  const d: any = typeof window !== 'undefined' ? (window as any).mdxDB : null;
  if (d && typeof d.kvSet === 'function') { try { d.kvSet(k, v); return; } catch { /* fall through */ } }
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
}

const key = (name: string) => 'mdxc_' + name;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function getColl<T extends Row = Row>(name: string): T[] {
  try { const raw = kvGet(key(name)); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; }
}
export function setColl(name: string, rows: Row[]): void {
  kvSet(key(name), JSON.stringify(rows));
}
export function addRow<T extends Row = Row>(name: string, row: Omit<T, 'id'>): T {
  const rows = getColl(name);
  const rec = { id: uid(), ...row } as T;
  rows.unshift(rec);
  setColl(name, rows);
  return rec;
}
export function updateRow(name: string, id: string, patch: Record<string, any>): void {
  setColl(name, getColl(name).map((r) => (r.id === id ? { ...r, ...patch } : r)));
}
export function removeRow(name: string, id: string): void {
  setColl(name, getColl(name).filter((r) => r.id !== id));
}
/** Seed a collection once (guarded by a flag) so a fresh workspace isn't empty. */
export function seedOnce(flag: string, fn: () => void): void {
  if (kvGet('mdxseed_' + flag)) return;
  try { fn(); } finally { kvSet('mdxseed_' + flag, '1'); }
}
