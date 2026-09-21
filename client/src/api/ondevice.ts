// On-device chat engine for the Android (Capacitor) app.
//
// The web/desktop build talks to the Anthropic proxy (see chat.ts). The Android
// app instead runs a LOCAL medical LLM (via a MediaPipe "LlmInference" Capacitor
// plugin) with the 37M LSM as a confidence / defer gate — so it works FULLY
// OFFLINE, for rural / low-connectivity use. No data leaves the phone.
//
// IMPORTANT: this module adds NO npm dependency to the web bundle. It detects the
// native runtime purely through Capacitor's injected `window.Capacitor` global,
// which exists only inside the packaged Android app. On the web it is absent, so
// `isOnDevice()` is false and the app uses the Anthropic path unchanged.

import type { ChatMessage } from './chat';
import { retrieveDrugContext } from './rag';

// Below this confidence the LSM defer-gate fires: the answer is shown, but flagged
// as low-confidence with an explicit "check with a clinician" prompt. On-device
// models are small, so deferring when unsure is the core safety feature.
const DEFER_THRESHOLD = 0.55;

const SYSTEM = [
  'You are a medical information assistant for a pharmacy, running fully on-device.',
  'Answer questions about medicines, conditions, dosing and care clearly and COMPLETELY.',
  'When asked about a medicine, cover: what it is and what it treats; the typical adult',
  'dosage range and how to take it; common side effects; key precautions and drug/food',
  'interactions; and when to see a doctor. Use short headings or bullet points so a',
  'pharmacist can read it at a glance. This is general reference information, NOT a',
  'prescription — always advise confirming with the pharmacist or a doctor, and adjust',
  'for the individual patient. If you are unsure, say so plainly rather than guessing.',
].join(' ');

// On-device model catalog. MedGemma-4B (medical) in quant tiers, plus a small
// general Gemma-3-1B "Fast" tier for low-RAM phones (4 GB) where a 4B model swaps.
export interface OfflineModel {
  id: string;
  tier: string;        // Best / Balanced / Light / Fast
  repo: string;        // HF repo the GGUF lives in
  filename: string;
  sizeMb: number;      // download size
  minRamMb: number;    // recommended minimum total RAM
  medical: boolean;
  note: string;
}

const MED = 'unsloth/medgemma-4b-it-GGUF';
const GEM = 'unsloth/gemma-3-1b-it-GGUF';

export const OFFLINE_MODELS: OfflineModel[] = [
  { id: 'q4', tier: 'Best',     repo: MED, filename: 'medgemma-4b-it-Q4_K_M.gguf', sizeMb: 2374, minRamMb: 7168, medical: true,  note: 'MedGemma-4B · best quality · 8 GB RAM' },
  { id: 'q3', tier: 'Balanced', repo: MED, filename: 'medgemma-4b-it-Q3_K_M.gguf', sizeMb: 2001, minRamMb: 6144, medical: true,  note: 'MedGemma-4B · smaller · 6 GB RAM' },
  { id: 'q2', tier: 'Light',    repo: MED, filename: 'medgemma-4b-it-Q2_K.gguf',   sizeMb: 1649, minRamMb: 5120, medical: true,  note: 'MedGemma-4B · lower quality · ~5 GB RAM' },
  { id: 'g1', tier: 'Fast',     repo: GEM, filename: 'gemma-3-1b-it-Q4_K_M.gguf',  sizeMb:  769, minRamMb: 2560, medical: false, note: 'Gemma-1B · fastest, runs on 4 GB · general (not medical-tuned)' },
];
export const DEFAULT_OFFLINE_MODEL = OFFLINE_MODELS[0];
export function modelUrl(m: OfflineModel): string { return `https://huggingface.co/${m.repo}/resolve/main/${m.filename}`; }

export interface DeviceInfo { totalRamMb: number; availRamMb: number; freeStorageMb: number; totalStorageMb: number; }

interface NativeLlm {
  // Implemented by the Android plugin (see native/android/LlmInferencePlugin.java).
  generate(opts: { prompt: string; maxTokens?: number }): Promise<{ text: string; confidence?: number }>;
  load(): Promise<{ loaded: boolean }>;
  isReady(opts?: { filename?: string }): Promise<{ filename: string; modelPresent: boolean; loaded: boolean; ready: boolean }>;
  deviceInfo(): Promise<DeviceInfo>;
  setActiveModel(opts: { filename: string }): Promise<{ filename: string }>;
  downloadModel(opts: { url: string; filename: string }): Promise<{ path: string }>;
  addListener(event: 'downloadProgress',
    cb: (e: { percent: number; received: number; total: number }) => void): Promise<{ remove: () => void }>;
  addListener(event: 'token', cb: (e: { text: string }) => void): Promise<{ remove: () => void }>;
}

/** Preload the active model (so the first answer isn't preceded by a long load). */
export async function warmOfflineModel(): Promise<boolean> {
  const llm = nativeLlm();
  if (!llm) return false;
  try { return (await llm.load()).loaded; } catch { return false; }
}

function nativeLlm(): NativeLlm | null {
  const cap = (typeof window !== 'undefined' && (window as any).Capacitor) || null;
  if (!cap?.isNativePlatform?.()) return null;
  return (cap.Plugins?.LlmInference as NativeLlm) || null;
}

/** Read the phone's RAM + free storage (null if unavailable / not native). */
export async function getDeviceInfo(): Promise<DeviceInfo | null> {
  const llm = nativeLlm();
  if (!llm?.deviceInfo) return null;
  try { return await llm.deviceInfo(); } catch { return null; }
}

/** Best model tier the phone can comfortably run (falls back to the lightest). */
export function recommendModel(totalRamMb: number): OfflineModel {
  for (const m of OFFLINE_MODELS) if (totalRamMb >= m.minRamMb) return m;
  return OFFLINE_MODELS[OFFLINE_MODELS.length - 1];
}

/** Is a given model already downloaded? (defaults to any model being present). */
export async function offlineModelPresent(model?: OfflineModel): Promise<boolean> {
  const llm = nativeLlm();
  if (!llm) return false;
  try {
    if (model) return (await llm.isReady({ filename: model.filename })).modelPresent;
    // No specific model: present if ANY catalog model is on device.
    for (const m of OFFLINE_MODELS) {
      if ((await llm.isReady({ filename: m.filename })).modelPresent) {
        await llm.setActiveModel({ filename: m.filename });
        return true;
      }
    }
    return false;
  } catch { return false; }
}

/** Which catalog models are already downloaded on this device (+ the active one). */
export async function listOfflineModels(): Promise<{ present: Record<string, boolean>; active: string | null }> {
  const llm = nativeLlm();
  if (!llm) return { present: {}, active: null };
  const present: Record<string, boolean> = {};
  let active: string | null = null;
  try {
    for (const m of OFFLINE_MODELS) {
      const r = await llm.isReady({ filename: m.filename });
      present[m.filename] = r.modelPresent;
      if (!active && r.filename && r.modelPresent) active = r.filename;
    }
    const cur = await llm.isReady();
    if (cur.filename && present[cur.filename]) active = cur.filename;
  } catch { /* ignore */ }
  return { present, active };
}

/** Switch to an already-downloaded model and load it. */
export async function useOfflineModel(model: OfflineModel): Promise<boolean> {
  const llm = nativeLlm();
  if (!llm) return false;
  try {
    await llm.setActiveModel({ filename: model.filename });
    return (await llm.load()).loaded;
  } catch { return false; }
}

/** Download a chosen model, reporting 0..100% progress. Resolves when ready. */
export async function downloadOfflineModel(model: OfflineModel, onProgress: (percent: number) => void): Promise<void> {
  const llm = nativeLlm();
  if (!llm) throw new Error('ON_DEVICE_UNAVAILABLE');
  let handle: { remove: () => void } | null = null;
  try {
    handle = await llm.addListener('downloadProgress', (e) => onProgress(e.percent));
    await llm.downloadModel({ url: modelUrl(model), filename: model.filename });
    onProgress(100);
  } finally {
    handle?.remove?.();
  }
}

/** True only inside the packaged Android app with the on-device plugin available. */
export function isOnDevice(): boolean {
  return !!nativeLlm();
}

/** True whenever running as the packaged native app (Capacitor), plugin or not.
 *  Used to decide whether to SHOW the Online/Offline toggle. */
export function isNativeApp(): boolean {
  const cap = (typeof window !== 'undefined' && (window as any).Capacitor) || null;
  return !!cap?.isNativePlatform?.();
}

/** Flatten the chat history into a single prompt the local model can consume. */
function toPrompt(messages: ChatMessage[], mode?: 'concise' | 'doctor', reference?: string): string {
  const lines: string[] = [SYSTEM];
  // RAG: ground dosing in the bundled reference so the model doesn't invent doses.
  if (reference) {
    lines.push(
      '\nUSE THIS VERIFIED REFERENCE for any dose or drug fact below. If the medicine',
      'asked about is NOT in the reference, say the on-device reference does not cover',
      'it and give only cautious general guidance. Do not contradict the reference.',
      '--- REFERENCE ---',
      reference,
      '--- END REFERENCE ---\n',
    );
  }
  if (mode === 'doctor') lines.push('(Answer as a complete, structured clinical reference for a pharmacist: indication, typical adult dosing and adjustments, contraindications, interactions, and key counselling points. Do not cut the answer short.)');
  else lines.push('(Answer in clear, complete plain language for a patient: what it is, how to take it / typical dosing, what to watch for, and when to see a doctor. Be thorough, not brief.)');
  for (const m of messages) {
    const who = m.role === 'user' ? 'Patient' : 'Assistant';
    const text = typeof m.content === 'string'
      ? m.content
      // On-device is text-only; describe non-text blocks rather than sending bytes.
      : m.content.map((b) => (b.type === 'text' ? b.text : `[${b.type} attachment — on-device model is text-only]`)).join('\n');
    lines.push(`${who}: ${text}`);
  }
  lines.push('Assistant:');
  return lines.join('\n');
}

/**
 * Stream a reply from the on-device model. MediaPipe's simple API returns the
 * whole string; we chunk it to the UI so it feels like the web streaming path.
 * The LSM defer-gate wraps the output when confidence is low.
 */
export async function streamOnDevice(opts: {
  messages: ChatMessage[];
  onText: (chunk: string) => void;
  signal?: AbortSignal;
  mode?: 'concise' | 'doctor';
}): Promise<string> {
  const llm = nativeLlm();
  if (!llm) throw new Error('ON_DEVICE_UNAVAILABLE');

  // RAG: retrieve the bundled drug reference for the latest question and ground
  // the answer in it (so doses come from the reference, not the model's memory).
  const lastUser = [...opts.messages].reverse().find((m) => m.role === 'user');
  const queryText = lastUser
    ? (typeof lastUser.content === 'string'
        ? lastUser.content
        : lastUser.content.map((b) => (b.type === 'text' ? b.text : '')).join(' '))
    : '';
  const retrieved = retrieveDrugContext(queryText);
  const prompt = toPrompt(opts.messages, opts.mode, retrieved.context || undefined);

  // Stream tokens live from the native engine (a phone runs a few tokens/sec, so
  // real streaming is what keeps the UI from looking frozen).
  let streamed = '';
  const handle = await llm.addListener('token', (e) => {
    if (opts.signal?.aborted) return;
    streamed += e.text;
    opts.onText(e.text);
  });
  try {
    // Complete answers matter more than speed for a pharmacy look-up. Doctor mode
    // (structured clinical reference) gets the most room.
    const maxTokens = opts.mode === 'doctor' ? 900 : 640;
    const { text, confidence } = await llm.generate({ prompt, maxTokens });
    if (opts.signal?.aborted) return streamed;
    let out = (text || streamed).trim();
    // LSM defer gate: low confidence → append an explicit, honest caution.
    if (typeof confidence === 'number' && confidence < DEFER_THRESHOLD) {
      const note = "\n\n⚠️ I'm not fully confident about this — please confirm with the pharmacist or a doctor before acting on it.";
      opts.onText(note); out += note;
    }
    // Citation: grounded answers show their source; ungrounded ones say so.
    const cite = retrieved.hits.length
      ? `\n\n📚 Source: ${retrieved.sources[0]} — entries: ${retrieved.hits.map((h) => h.name).join(', ')}. Verify dose for the individual patient.`
      : "\n\n📚 Not found in the on-device drug reference — answer is general knowledge; verify before advising.";
    opts.onText(cite); out += cite;
    return out;
  } finally {
    handle?.remove?.();
  }
}
