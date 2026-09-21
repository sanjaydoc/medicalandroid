/**
 * Same-origin chat relay — Cloudflare Pages Function
 * --------------------------------------------------
 * Served at  https://medicalandroid.com/api/chat  (first-party, same domain
 * as the site itself). The browser talks ONLY to this path; this function then
 * forwards the request server-side (Cloudflare edge → Worker) to the
 * `medicalandroid-chat` Worker, which still holds the Anthropic API key.
 *
 * WHY: some mobile networks / private-DNS filters / content-blockers block
 * cross-origin requests to *.workers.dev, which broke the chat with a bare
 * "Failed to fetch" while it worked fine elsewhere. A same-origin request to
 * the site's own domain is first-party and is not touched by those blockers;
 * the hop to the Worker happens on Cloudflare's edge, never from the browser.
 * No secrets move — the Anthropic key stays only in the Worker.
 */

const WORKER_URL = 'https://medicalandroid-chat.dr-sanjayanbu.workers.dev';

// CORS so the packaged Capacitor app (Origin https://localhost) can use this
// first-party relay too — not just the same-origin website. The relay forwards
// to the Worker SERVER-SIDE, so the app never depends on the Worker's own
// ALLOWED_ORIGINS list. We reflect the caller's Origin (no credentials are used).
function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function onRequestPost(context) {
  const { request } = context;
  const cors = corsHeaders(request);

  // Preserve the real visitor IP so the Worker's per-IP rate limit still works
  // (a Worker→Worker subrequest would otherwise share one bucket).
  const clientIp = request.headers.get('CF-Connecting-IP') || '';

  let upstream;
  try {
    upstream = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(clientIp ? { 'X-Real-IP': clientIp } : {}),
      },
      body: await request.text(),
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Assistant is temporarily unreachable.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors },
    });
  }

  // Stream the Worker's SSE / plain-text reply straight back to the browser.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      ...cors,
    },
  });
}

// CORS preflight for the cross-origin app call.
export function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}
