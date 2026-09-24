// Chat client — talks to the secure proxy (e.g. a Cloudflare Worker), NEVER
// to Anthropic directly. The API key lives only on the proxy, so nothing
// secret is ever shipped in this static bundle.
//
// Configure the proxy URL at build time with VITE_CHAT_ENDPOINT, or at runtime
// by setting window.STEMCELLS_CHAT_ENDPOINT before the app loads (lets you point
// the deployed site at a Worker without rebuilding).

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

// On-device (Android) engine. On the web these are inert: isOnDevice() is false,
// so streamChat always uses the Anthropic proxy below.
import { isOnDevice, isNativeApp, streamOnDevice } from './ondevice';
export { isOnDevice, isNativeApp } from './ondevice';

/** The cross-origin Worker URL (build/runtime configured), if any. */
function configuredEndpoint(): string {
  const runtime = (typeof window !== 'undefined' && (window as any).STEMCELLS_CHAT_ENDPOINT) || '';
  const build = (import.meta.env.VITE_CHAT_ENDPOINT as string | undefined) || '';
  return (runtime || build || '').trim();
}

/**
 * Ordered list of endpoints to try. We prefer a SAME-ORIGIN path (`/api/chat`,
 * a Cloudflare Pages Function that relays to the Worker) because some mobile
 * networks / DNS filters / content-blockers block the cross-origin *.workers.dev
 * domain — which broke the chat on phones while it worked on desktop. If the
 * same-origin path isn't available (e.g. local dev, or the Function hasn't
 * deployed yet), we fall back to the configured Worker URL so nothing regresses.
 */
// The website's first-party chat relay (Pages Function). It forwards to the
// Worker server-side, so callers never hit the Worker's cross-origin origin check.
const SITE_RELAY = (import.meta.env.VITE_CHAT_RELAY as string | undefined) || '';

export function chatEndpoints(): string[] {
  const list: string[] = [];
  const configured = configuredEndpoint();
  if (typeof window !== 'undefined' && isNativeApp()) {
    // Packaged app: no same-origin /api/chat (origin is https://localhost). Prefer
    // the site's first-party relay (CORS-enabled; relays to the Worker server-side,
    // so Online mode doesn't depend on the Worker's ALLOWED_ORIGINS), then fall
    // back to the directly-configured Worker URL.
    list.push(SITE_RELAY);
    if (configured && configured !== SITE_RELAY) list.push(configured);
  } else {
    // Web: same-origin relay first, then the configured Worker as a fallback.
    if (typeof window !== 'undefined') list.push('/api/chat');
    if (configured) list.push(configured);
  }
  return Array.from(new Set(list.filter(Boolean)));
}

export function chatEndpoint(): string {
  return chatEndpoints()[0] || '';
}

export function isChatConfigured(): boolean {
  return chatEndpoints().length > 0;
}

/**
 * Stream a chat completion from the proxy. The proxy responds with a plain-text
 * stream of the assistant's reply; `onText` is called with each chunk.
 * Returns the full concatenated reply.
 */
export async function streamChat(opts: {
  messages: ChatMessage[];
  onText: (chunk: string) => void;
  signal?: AbortSignal;
  mode?: 'concise' | 'doctor';
  // When true, ask the proxy for a structured JSON interpretation (Report & Scan
  // Decoder) instead of prose, so the client can render the report canvas.
  report?: boolean;
  // Android only: when true and the on-device plugin is present, run the local
  // LSM + LLM engine (fully offline) instead of the Anthropic proxy.
  offline?: boolean;
}): Promise<string> {
  if (opts.offline && isOnDevice()) {
    return streamOnDevice(opts);
  }
  const endpoints = chatEndpoints();
  if (!endpoints.length) {
    throw new Error('NOT_CONFIGURED');
  }

  let lastErr: Error | null = null;
  for (let i = 0; i < endpoints.length; i++) {
    const isLast = i === endpoints.length - 1;
    try {
      return await streamOnce(endpoints[i], opts);
    } catch (e: any) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      // Never fall back on a deliberate abort, and never once bytes have already
      // been streamed to the UI (that would duplicate the reply).
      if (e?.name === 'AbortError' || e?.__streamed || isLast) throw lastErr;
      // Otherwise the first endpoint was unreachable / wasn't the chat — try next.
    }
  }
  throw lastErr || new Error('Could not reach the assistant.');
}

async function streamOnce(
  endpoint: string,
  opts: { messages: ChatMessage[]; onText: (chunk: string) => void; signal?: AbortSignal; mode?: 'concise' | 'doctor'; report?: boolean },
): Promise<string> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: opts.messages, mode: opts.mode || 'concise', report: !!opts.report }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    let detail = '';
    try {
      detail = (await res.json())?.error || '';
    } catch {
      /* ignore */
    }
    const err: any = new Error(detail || `Request failed (${res.status})`);
    err.status = res.status; // let the UI map it to a calm, human message
    throw err;
  }

  // If a same-origin path fell through to the SPA shell (the Pages Function is
  // not deployed), we get index.html with a 200. Treat that as "not the chat"
  // so streamChat() can fall back to the configured Worker URL.
  const ctype = (res.headers.get('content-type') || '').toLowerCase();
  if (ctype.includes('text/html')) {
    throw new Error('CHAT_ENDPOINT_UNAVAILABLE');
  }

  let streamed = false;
  const emit = (t: string) => {
    streamed = true;
    opts.onText(t);
  };
  const streamError = (msg: string) => {
    const err: any = new Error(msg);
    if (streamed) err.__streamed = true;
    return err;
  };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';

  // Two Worker formats are supported so the site never breaks mid-upgrade:
  //  - text/event-stream: the proxy pipes Anthropic's raw SSE (parsed here, so
  //    the CPU-limited Worker no longer truncates long replies).
  //  - text/plain: the older proxy already extracted the text.
  const isSSE = (res.headers.get('content-type') || '').includes('event-stream');

  if (!isSSE) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        full += chunk;
        emit(chunk);
      }
    }
    return full;
  }

  let buffer = '';

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === '[DONE]') return;
    try {
      const evt = JSON.parse(data);
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
        const t = evt.delta.text as string;
        if (t) {
          full += t;
          emit(t);
        }
      } else if (evt.type === 'error') {
        throw streamError(evt.error?.message || 'Stream error');
      }
    } catch (e) {
      // Re-throw genuine stream errors; ignore partial/keepalive JSON.
      if (e instanceof Error && e.message && data.includes('"type":"error"')) throw e;
    }
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) handleLine(line);
  }
  if (buffer) handleLine(buffer);
  return full;
}

/** Read a File into a base64 string (no data: prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Downscale + recompress an image for upload. Phone photos are 5–12 MB; sent raw
 * as base64 they inflate ~1.33× and the request is rejected / times out (the chat
 * shows "briefly unavailable"). We cap the long edge at 1568px — Anthropic resizes
 * anything larger server-side anyway, so this loses NO model-visible detail — and
 * re-encode as JPEG, cutting the payload ~20×. Falls back to raw bytes if the
 * browser can't decode the image (e.g. some HEIC). Returns base64 (no prefix).
 */
export async function imageForUpload(
  file: File,
  maxDim = 1568,
  quality = 0.82,
): Promise<{ data: string; mediaType: string }> {
  try {
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') throw new Error('unsupported');
    const bitmap = await createImageBitmap(file);
    let w = bitmap.width;
    let h = bitmap.height;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.fillStyle = '#ffffff'; // flatten any transparency so JPEG stays clean
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    if (typeof bitmap.close === 'function') bitmap.close();
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const data = dataUrl.split(',')[1] || '';
    if (!data) throw new Error('encode failed');
    return { data, mediaType: 'image/jpeg' };
  } catch {
    // Fallback: send the original bytes (keeps behaviour for exotic formats).
    return { data: await fileToBase64(file), mediaType: file.type || 'image/jpeg' };
  }
}
