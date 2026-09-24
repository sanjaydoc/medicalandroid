// Chronic-Condition Coach — vitals logging, classification, trends & escalation.
// v1 stores on-device (localStorage). Educational reference ranges only — NOT a
// diagnosis. Escalation is deliberately conservative (errs toward "see a doctor").

import { supabase } from './supabase';

export type VitalType = 'bp' | 'glucose' | 'weight';
export type GlucoseContext = 'fasting' | 'post' | 'random';
export type Tone = 'good' | 'warn' | 'bad' | 'urgent';

export interface Vital {
  id: string;
  type: VitalType;
  ts: number;                 // epoch ms
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  glucose?: number;           // mg/dL
  context?: GlucoseContext;   // for glucose
  weight?: number;            // kg
}

export interface Classification {
  label: string;
  tone: Tone;
  detail?: string;
}

// Storage key is NAMESPACED by the signed-in user id so multiple accounts on the
// same device never see each other's data (anonymous data lives under the base
// key). `_uid` is set by setVitalsUser() below.
const KEY_BASE = 'meddroid_vitals_v1';
const keyFor = () => (_uid ? `${KEY_BASE}::${_uid}` : KEY_BASE);

export function loadVitals(): Vital[] {
  try {
    const raw = localStorage.getItem(keyFor());
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    // Migration: earlier chat-logged readings were saved with ts=0 (a bug).
    // Stamp any missing/zero timestamp with a recent, staggered time so they
    // appear on the trend/charts and count toward recent stats.
    let changed = false;
    const now = Date.now();
    const fixed = (arr as Vital[]).map((v, i) => {
      if (!v.ts || v.ts <= 0) { changed = true; return { ...v, ts: now - (arr.length - i) * 60000 }; }
      return v;
    });
    if (changed) { try { localStorage.setItem(keyFor(), JSON.stringify(fixed)); } catch { /* ignore */ } }
    return fixed.sort((a, b) => a.ts - b.ts);
  } catch {
    return [];
  }
}

function save(all: Vital[]) {
  try {
    localStorage.setItem(keyFor(), JSON.stringify(all));
  } catch { /* ignore quota/private-mode */ }
}

export function addVital(v: Omit<Vital, 'id' | 'ts'> & { ts?: number }): Vital {
  const all = loadVitals();
  const rec: Vital = { ...v, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ts: v.ts && v.ts > 0 ? v.ts : Date.now() };
  all.push(rec);
  save(all);
  void pushRemote(rec); // mirror to cloud when signed in (fire-and-forget)
  return rec;
}

export function deleteVital(id: string) {
  save(loadVitals().filter((v) => v.id !== id));
  if (_uid && supabase) {
    try { void supabase.from('vitals').delete().eq('user_id', _uid).eq('client_id', id); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Cloud sync (Supabase) — local-first, cloud-mirror. Readings live in
// localStorage for instant/offline use; when the user is signed in they also
// sync to the `vitals` table (RLS-scoped to the user) so they follow across
// devices. Requires the SQL in finetune/supabase-vitals.sql to be run once.
// ---------------------------------------------------------------------------
let _uid: string | null = null;

/** Called by AuthContext when the signed-in user changes. */
export function setVitalsUser(id: string | null) {
  const changed = id !== _uid;
  _uid = id;
  if (id && changed) void syncVitals();
}

/** Wipe the current identity's local vitals cache. */
export function clearLocalVitals() {
  try { localStorage.removeItem(keyFor()); } catch { /* ignore */ }
}

function vitalToRow(v: Vital) {
  return {
    user_id: _uid, client_id: v.id, type: v.type,
    ts: new Date(v.ts).toISOString(),
    systolic: v.systolic ?? null, diastolic: v.diastolic ?? null, pulse: v.pulse ?? null,
    glucose: v.glucose ?? null, context: v.context ?? null, weight: v.weight ?? null,
  };
}
function rowToVital(r: Record<string, unknown>): Vital {
  return {
    id: (r.client_id as string) || (r.id as string),
    ts: new Date(r.ts as string).getTime(),
    type: r.type as VitalType,
    systolic: (r.systolic as number) ?? undefined,
    diastolic: (r.diastolic as number) ?? undefined,
    pulse: (r.pulse as number) ?? undefined,
    glucose: (r.glucose as number) ?? undefined,
    context: (r.context as GlucoseContext) ?? undefined,
    weight: (r.weight as number) ?? undefined,
  };
}

async function pushRemote(v: Vital) {
  if (!_uid || !supabase) return;
  try { await supabase.from('vitals').upsert(vitalToRow(v), { onConflict: 'user_id,client_id' }); } catch { /* offline / not set up */ }
}

/** Two-way merge: pull the user's cloud rows, push any local-only rows. */
export async function syncVitals(): Promise<Vital[] | null> {
  if (!_uid || !supabase) return null;
  try {
    const { data, error } = await supabase.from('vitals').select('*').eq('user_id', _uid);
    if (error) return null;
    const remote = (data || []).map(rowToVital);
    const local = loadVitals();
    const byId = new Map<string, Vital>();
    for (const v of remote) byId.set(v.id, v);
    const remoteIds = new Set(remote.map((v) => v.id));
    const toPush = local.filter((v) => !remoteIds.has(v.id));
    for (const v of local) if (!byId.has(v.id)) byId.set(v.id, v);
    const merged = Array.from(byId.values()).sort((a, b) => a.ts - b.ts);
    save(merged);
    if (toPush.length) {
      try { await supabase.from('vitals').upsert(toPush.map(vitalToRow), { onConflict: 'user_id,client_id' }); } catch { /* ignore */ }
    }
    return merged;
  } catch {
    return null;
  }
}

// ---- Classification (educational ranges; ACC/AHA + ADA-style) ----
export function classifyBP(sys: number, dia: number): Classification {
  if (sys >= 180 || dia >= 120) return { label: 'Very high', tone: 'urgent', detail: 'Possible hypertensive crisis' };
  if (sys >= 140 || dia >= 90) return { label: 'High', tone: 'bad', detail: 'Stage 2 range' };
  if (sys >= 130 || dia >= 80) return { label: 'Slightly high', tone: 'warn', detail: 'Stage 1 range' };
  if (sys < 90 || dia < 60) return { label: 'Low', tone: 'warn', detail: 'Below normal' };
  if (sys >= 120) return { label: 'Elevated', tone: 'warn' };
  return { label: 'Normal', tone: 'good' };
}

export function classifyGlucose(mgdl: number, ctx: GlucoseContext = 'random'): Classification {
  if (mgdl < 54) return { label: 'Very low', tone: 'urgent', detail: 'Severe hypoglycaemia' };
  if (mgdl < 70) return { label: 'Low', tone: 'warn', detail: 'Hypoglycaemia' };
  if (mgdl >= 300) return { label: 'Very high', tone: 'urgent', detail: 'Seek care if unwell' };
  if (ctx === 'fasting') {
    if (mgdl >= 126) return { label: 'High', tone: 'bad', detail: 'Diabetes range (fasting)' };
    if (mgdl >= 100) return { label: 'Slightly high', tone: 'warn', detail: 'Prediabetes range (fasting)' };
    return { label: 'Normal', tone: 'good' };
  }
  // post-meal / random
  if (mgdl >= 200) return { label: 'High', tone: 'bad', detail: 'Diabetes range' };
  if (mgdl >= 140) return { label: 'Slightly high', tone: 'warn', detail: 'Prediabetes range' };
  return { label: 'Normal', tone: 'good' };
}

export function classify(v: Vital): Classification {
  if (v.type === 'bp' && v.systolic && v.diastolic) return classifyBP(v.systolic, v.diastolic);
  if (v.type === 'glucose' && v.glucose != null) return classifyGlucose(v.glucose, v.context);
  return { label: '', tone: 'good' };
}

// ---- Stats ----
const DAY = 86400000;

export function seriesOf(all: Vital[], type: VitalType): Vital[] {
  return all.filter((v) => v.type === type).sort((a, b) => a.ts - b.ts);
}

export function latest(all: Vital[], type: VitalType): Vital | undefined {
  const s = seriesOf(all, type);
  return s[s.length - 1];
}

export function avgLast(all: Vital[], type: VitalType, days = 7) {
  const since = Date.now() - days * DAY;
  const s = seriesOf(all, type).filter((v) => v.ts >= since);
  if (!s.length) return null;
  if (type === 'bp') {
    return {
      systolic: Math.round(s.reduce((a, v) => a + (v.systolic || 0), 0) / s.length),
      diastolic: Math.round(s.reduce((a, v) => a + (v.diastolic || 0), 0) / s.length),
      count: s.length,
    };
  }
  if (type === 'glucose') {
    return { glucose: Math.round(s.reduce((a, v) => a + (v.glucose || 0), 0) / s.length), count: s.length };
  }
  return { weight: +(s.reduce((a, v) => a + (v.weight || 0), 0) / s.length).toFixed(1), count: s.length };
}

// ---- Escalation (conservative) ----
export interface Escalation {
  level: 'urgent' | 'soon' | 'watch' | 'ok';
  message: string;
}

export function assessEscalation(all: Vital[]): Escalation {
  // Any single reading in the urgent band -> urgent.
  const recentUrgent = all
    .filter((v) => v.ts >= Date.now() - 2 * DAY)
    .some((v) => classify(v).tone === 'urgent');
  if (recentUrgent) {
    return { level: 'urgent', message: 'One of your recent readings is in a dangerous range. If you feel unwell (chest pain, breathlessness, confusion, severe dizziness) seek emergency care now — otherwise contact a doctor today.' };
  }

  // 3+ "bad" (high) readings across the last several days -> see a doctor soon.
  const highDays = new Set<string>();
  for (const v of all) {
    if (v.ts < Date.now() - 10 * DAY) continue;
    const t = classify(v).tone;
    if (t === 'bad') highDays.add(new Date(v.ts).toDateString());
  }
  if (highDays.size >= 3) {
    return { level: 'soon', message: `Your readings have been high on ${highDays.size} separate days recently. This is worth reviewing with a doctor soon — tap "Find a clinic near me" in the assistant.` };
  }

  const watchDays = new Set<string>();
  for (const v of all) {
    if (v.ts < Date.now() - 10 * DAY) continue;
    const t = classify(v).tone;
    if (t === 'bad' || t === 'warn') watchDays.add(new Date(v.ts).toDateString());
  }
  if (watchDays.size >= 3) {
    return { level: 'watch', message: 'A few of your recent readings are a little above the normal range. Keep logging daily and watch the trend; lifestyle steps (below) help.' };
  }

  return { level: 'ok', message: 'Your recent readings are mostly in a healthy range. Keep it up and keep logging daily.' };
}

// ---- Lifestyle nudge (general, non-prescriptive) ----
export function lifestyleNudge(all: Vital[]): string {
  const bp = latest(all, 'bp');
  const glu = latest(all, 'glucose');
  if (bp && classify(bp).tone !== 'good') {
    return 'For blood pressure: cut down on salt & processed food, walk 30 min most days, limit alcohol, sleep well, and take prescribed medicines regularly.';
  }
  if (glu && classify(glu).tone !== 'good') {
    return 'For blood sugar: favour whole grains & vegetables over sugar/refined carbs, stay active after meals, keep a steady meal routine, and take prescribed medicines regularly.';
  }
  return 'Keep up the daily basics: balanced meals, 30 min of movement, good sleep, and regular medicines if prescribed.';
}

// ---- Weekly summary ----
export function weeklySummary(all: Vital[]): string {
  const bp = avgLast(all, 'bp', 7) as { systolic: number; diastolic: number; count: number } | null;
  const glu = avgLast(all, 'glucose', 7) as { glucose: number; count: number } | null;
  const parts: string[] = [];
  if (bp) parts.push(`BP averaged ${bp.systolic}/${bp.diastolic} over ${bp.count} reading${bp.count > 1 ? 's' : ''}`);
  if (glu) parts.push(`glucose averaged ${glu.glucose} mg/dL over ${glu.count} reading${glu.count > 1 ? 's' : ''}`);
  if (!parts.length) return 'No readings logged in the last 7 days. Log daily to see your trends here.';
  return `This week: ${parts.join('; ')}.`;
}

// ---- Chat parsing: turn free text into a Vital (returns null if not a log) ----
export function parseVital(textRaw: string): Vital | null {
  const text = textRaw.toLowerCase();

  // Blood pressure: "bp 130/85", "130/85", "blood pressure 130 / 85 pulse 72"
  const bpMatch = text.match(/(?:bp|blood pressure|pressure)?\s*(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (bpMatch && (/(bp|blood pressure|pressure)/.test(text) || /\d{2,3}\s*\/\s*\d{2,3}/.test(text))) {
    const sys = parseInt(bpMatch[1], 10);
    const dia = parseInt(bpMatch[2], 10);
    if (sys >= 60 && sys <= 260 && dia >= 30 && dia <= 200) {
      const pulseM = text.match(/(?:pulse|hr|heart rate)\s*(\d{2,3})/);
      return {
        id: '', ts: 0, type: 'bp', systolic: sys, diastolic: dia,
        pulse: pulseM ? parseInt(pulseM[1], 10) : undefined,
      };
    }
  }

  // Glucose: "sugar 140 fasting", "glucose 200", "blood sugar 110 fasting"
  const gluM = text.match(/(?:sugar|glucose|blood sugar|bsl|rbs|fbs)\s*(?:is|=|:)?\s*(\d{2,3})/);
  if (gluM) {
    const val = parseInt(gluM[1], 10);
    if (val >= 30 && val <= 600) {
      let ctx: GlucoseContext = 'random';
      if (/fasting|fbs|empty stomach|before/.test(text)) ctx = 'fasting';
      else if (/post|after|pp|ppbs|meal/.test(text)) ctx = 'post';
      return { id: '', ts: 0, type: 'glucose', glucose: val, context: ctx };
    }
  }

  // Weight: "weight 72", "72 kg"
  const wM = text.match(/(?:weight|wt)\s*(?:is|=|:)?\s*(\d{2,3}(?:\.\d)?)\s*(?:kg)?/) || text.match(/(\d{2,3}(?:\.\d)?)\s*kg\b/);
  if (wM) {
    const val = parseFloat(wM[1]);
    if (val >= 20 && val <= 300) return { id: '', ts: 0, type: 'weight', weight: val };
  }

  return null;
}

/** Parse ALL readings in a message (e.g. "sugar 110 fasting sugar 138 fasting"). */
export function parseVitals(textRaw: string): Vital[] {
  const text = textRaw.toLowerCase();
  const out: Vital[] = [];

  // Every valid BP pair.
  const bpRe = /(\d{2,3})\s*\/\s*(\d{2,3})/g;
  let m: RegExpExecArray | null;
  while ((m = bpRe.exec(text)) !== null) {
    const sys = parseInt(m[1], 10), dia = parseInt(m[2], 10);
    if (sys >= 60 && sys <= 260 && dia >= 30 && dia <= 200) {
      out.push({ id: '', ts: 0, type: 'bp', systolic: sys, diastolic: dia });
    }
  }

  // Every glucose value (keyword + number + optional context).
  const gRe = /(?:sugar|glucose|blood sugar|bsl|rbs|fbs|ppbs)\s*(?:is|=|:)?\s*(\d{2,3})\s*(?:mg\/?dl)?\s*(fasting|fbs|empty stomach|before|post|after|pp|ppbs|random)?/gi;
  while ((m = gRe.exec(text)) !== null) {
    const val = parseInt(m[1], 10);
    if (val >= 30 && val <= 600) {
      const c = (m[2] || '').toLowerCase();
      let ctx: GlucoseContext = 'random';
      if (/fast|fbs|empty|before/.test(c)) ctx = 'fasting';
      else if (/post|after|pp/.test(c)) ctx = 'post';
      out.push({ id: '', ts: 0, type: 'glucose', glucose: val, context: ctx });
    }
  }

  // Weight (single).
  const wm = text.match(/(?:weight|wt)\s*(?:is|=|:)?\s*(\d{2,3}(?:\.\d)?)\s*(?:kg)?/) || text.match(/(\d{2,3}(?:\.\d)?)\s*kg\b/);
  if (wm) {
    const val = parseFloat(wm[1]);
    if (val >= 20 && val <= 300) out.push({ id: '', ts: 0, type: 'weight', weight: val });
  }

  // Fall back to the single parser (handles pulse etc.) if nothing matched.
  if (!out.length) {
    const one = parseVital(textRaw);
    if (one) out.push(one);
  }
  return out;
}

/** Does the text look like the user wants to log a reading? (broader than a clean parse) */
export function looksLikeVitalLog(textRaw: string): boolean {
  const t = textRaw.toLowerCase();
  if (/\b(bp|blood pressure)\b/.test(t) && /\d{2,3}\s*\/\s*\d{2,3}/.test(t)) return true;
  if (/\d{2,3}\s*\/\s*\d{2,3}/.test(t) && /(log|record|my|reading)/.test(t)) return true;
  if (/\b(sugar|glucose|blood sugar|bsl|rbs|fbs|ppbs)\b/.test(t) && /\d{2,3}/.test(t)) return true;
  if (/\b(log|record)\b/.test(t) && /\b(weight|wt)\b/.test(t)) return true;
  return false;
}

export function fmtWhen(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
