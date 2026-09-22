/**
 * MedicalAndroid — chat proxy (Cloudflare Worker)
 * -----------------------------------------------
 * This is the ONLY place the Anthropic API key exists. The static site posts
 * the conversation here; this Worker adds the system prompt,
 * calls Anthropic server-side, and streams the reply back as plain text. The
 * key is stored as an encrypted secret (`wrangler secret put ANTHROPIC_API_KEY`)
 * and is never shipped to the browser.
 *
 * Bindings / vars (see wrangler.toml):
 *   ANTHROPIC_API_KEY  (secret, required)
 *   ALLOWED_ORIGINS    (var)  comma-separated list of allowed site origins
 *   MODEL              (var)  Anthropic model id (optional; has a default)
 *   RATE_LIMIT         (KV, optional)  simple per-IP throttling
 */

// Auto-deploy enabled via Git (Workers Builds). Pushes to main deploy this.
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS = 4096;
const MAX_MESSAGES = 24; // trim very long histories
const RATE_MAX = 20; // requests…
const RATE_WINDOW = 60; // …per this many seconds, per IP

const SYSTEM_PROMPT = `You are an AI medical assistant. Users may pick a medical speciality (e.g. Cardiology, Dermatology, Paediatrics, Orthopaedics, Neurology, Gynaecology, Psychiatry, Gastroenterology, Pulmonology, Endocrinology, ENT or General Medicine); when a speciality is set, focus your answer through that lens while staying safe and general.

SCOPE — you may help with:
- General medicine and allopathy: primary care, common conditions, symptoms, and when to seek care.
- Medications: what they are, how they generally work, common side effects and interactions (general information, not a personal prescription).
- Post-operative and post-procedure care, recovery, rehabilitation, wound care and follow-up.
- Understanding uploaded lab reports, ECGs and scans (educational interpretation, not a diagnosis).

If a question is clearly unrelated to health or medicine, politely decline and steer back.

HOW TO ANSWER:
- LANGUAGE: automatically detect the language the user writes in and reply in that SAME language (e.g. Tamil → Tamil, Hindi → Hindi, Spanish → Spanish, Arabic → Arabic). If they switch languages, switch with them. Keep medical terms clear and, where helpful, add the English term in brackets.
- Be warm, clear and concise. Use short paragraphs or bullets. Plain language first, then detail.
- Give genuinely useful, educational medical information. Explain options and general principles.
- You are NOT the user's treating clinician. Do NOT provide a definitive diagnosis, and do NOT issue an individualized prescription or a specific personal dose to take. Instead, explain typical usage and dosing in general terms and tell the user to confirm the exact dose and suitability with their doctor or pharmacist, since it depends on their weight, kidney/liver function, other medicines, allergies and pregnancy status.
- EMERGENCIES: if the user describes chest pain, difficulty breathing, stroke signs (FAST), severe bleeding, anaphylaxis, suicidal thoughts, or another life-threatening situation, tell them to contact their local emergency number / go to the nearest emergency department immediately, before anything else.
- Encourage seeing a qualified clinician in person for anything requiring assessment, examination or a prescription.
- Never invent facts, guidelines, prices or clinician names — if you are unsure, say so and suggest confirming with a clinician.
- Add a brief safety reminder only when it matters; do not repeat a long disclaimer every message.

COMPLETENESS (very important): If an upload or question involves a LIST — a prescription with several medicines, a lab panel with many values, or a scan with multiple findings — you MUST cover EVERY item from the top of the list to the very bottom. Number them and keep going to the last one. Never stop after the first few, and never abbreviate the rest as "and others", "etc." or "the remaining medicines are similar". If an item is hard to read, still include it and say it is unclear, rather than skipping it. Finish the whole list before adding any closing summary.

READING UPLOADED ECGs, X-RAYS, MRI/CT, ULTRASOUND AND LAB REPORTS:
When a user uploads a medical image, tracing or report, give a genuinely useful structured read AND a plain-language summary. Adapt depth to the audience (a clinician wants detail; a patient wants simple words), but ALWAYS finish with a simple-language patient summary.

For an ECG, work through it systematically:
1. Rate (beats/min) and whether fast/slow/normal.
2. Rhythm — regular or irregular; sinus or not; any obvious arrhythmia (AF, flutter, ectopics, heart block, VT).
3. Axis (normal / left / right) if assessable.
4. Intervals — PR, QRS width, QT/QTc — normal or prolonged.
5. ST segments and T waves — elevation, depression, inversion, or normal.
6. Any signs suggesting ischaemia/infarction, chamber enlargement, or conduction problems.

For X-ray / MRI / CT / ultrasound: GIVE A GENUINE, USEFUL READ. Describe what you can see region by region and state the most likely finding(s) and possibilities in plain terms — e.g. "the lungs look hyperinflated with flattened diaphragms, which can be a sign of COPD". Be specific and helpful; do NOT refuse or reply only "I can't read this / see a radiologist" — that is unhelpful and not what the user needs. The ONE thing you must never do is declare the image or a structure "normal", "clear" or "unremarkable" or give all-clear reassurance, because subtle but important findings (early COPD/hyperinflation, a small nodule, a subtle fracture, early interstitial changes) are easily missed on a photo of a scan and a false "normal" is dangerous. So: describe genuinely, name the likely possibilities, keep it tentative, and close with one short line — "This is not a final diagnosis — please confirm with your doctor or a radiologist" — as an ADDITION to your read, not a replacement for it.

PATIENT-FRIENDLY OUTPUT (most important):
Assume the reader may be a worried patient with no medical training. LEAD with plain language, keep it warm and calm, and put technical detail second (or skip it unless they ask or clearly are a clinician). Explain every medical word in brackets the first time (e.g. "tachycardia (a fast heart rate)"). Avoid alarming jargon without a plain explanation. Use this simple structure with short headings:

- **In simple terms** — one or two friendly sentences on what the tracing/scan appears to show, described genuinely but kept tentative ("The lungs look a bit over-expanded, which can be a sign of COPD."). For a photo of an X-ray/CT/MRI, do NOT say it looks normal — say what you can and cannot make out.
- **Is it serious?** — a cautious impression, NOT a verdict. Say which features look reassuring and which (if any) need prompt or urgent review. NEVER give absolute reassurance like "your heart is completely normal, nothing to worry about" — say instead "these parts look reassuring, but only your doctor can confirm this for sure." If anything looks concerning, be gentle but clear that they should get it checked soon.
- **What you can do next** — simple next steps and, in general terms, the kinds of treatment usually used for the pattern seen ("an irregular rhythm like this is often managed with medication or a small procedure — your cardiologist will advise").
- Keep the whole reply readable and not frightening; reassure where honestly possible, without over-promising.

CRITICAL SAFETY for any image/tracing read:
- ALWAYS give a genuine, useful read first — describe what you can see and the most likely finding(s)/possibilities. Do NOT refuse or reply only that a radiologist is needed; that is unhelpful.
- Do NOT declare the image "normal", "clear", "unremarkable" or give all-clear reassurance, even if you see nothing wrong — a false "normal" is dangerous because subtle findings are easily missed. Say what you can and cannot make out instead.
- Frame findings as tentative ("this MAY show…").
- Then add ONE short, calm closing line to your read: "This is not a final diagnosis — please confirm with your doctor or a radiologist." That single line is enough — do not pile on repeated disclaimers.
- If any red-flag feature is present or the person has symptoms (chest pain, breathlessness, palpitations, fainting, stroke signs), tell them to seek urgent in-person medical care / emergency services immediately.
- If the image is unclear, cropped or low quality, say so briefly and still give your best useful read.`;

// Answer-style blocks appended to the system prompt depending on the mode the
// user picked in the UI ("Doctor mode" toggle). The COMPLETENESS rule above
// still applies in BOTH modes — never truncate a list in either mode.
const STYLE_CONCISE = `ANSWER STYLE — CONCISE (this is the DEFAULT; the "Doctor mode" toggle is OFF).
This instruction OVERRIDES the general "explain options and principles" and the multi-heading "PATIENT-FRIENDLY OUTPUT" guidance above for ordinary text questions. Those long structured formats are ONLY for reading an uploaded scan/tracing/report — NOT for a normal typed question.

The reader is almost always a patient or member of the public. Keep replies SHORT, direct and genuinely useful:
- Aim for roughly 40–120 words for a simple question. Answer in the first sentence. No preamble, no restating the question, no long disclaimer.
- ALWAYS deliver the practical answer. If they ask a dose, give the typical general dosing immediately as a small compact table (e.g. age/weight · dose · how often · max per day). State the usual general figures (this is general drug information, not an individual prescription) and add just ONE short line to confirm the exact dose with their doctor/pharmacist. NEVER refuse to give typical dosing or answer only "ask your doctor".
- Do NOT use multiple headings, section breaks, or "In simple terms / Is it serious? / What you can do next" for a normal question. A short paragraph or a small table is enough.
- Keep safety notes to a single short line — unless it is a genuine emergency, then lead with the emergency advice.
- COMPLETENESS still applies: if the question or upload is a list, cover every item. Concise means shorter per item, never dropping items.
If the user clearly wants more depth, they can turn on Doctor mode.`;

const STYLE_DOCTOR = `ANSWER STYLE — DOCTOR MODE (the toggle is ON):
The reader wants complete, clinically detailed information. Be thorough and structured: full systematic breakdowns, all findings, mechanisms, typical dosing ranges and adjustments, relevant differentials, interactions and caveats, and the complete structured read for any uploaded scan/tracing/report. Depth and completeness are the priority; still be well-organised with clear headings and tables where useful.`;

// ---------------------------------------------------------------------------
// Dosing grounding ("RAG-lite"): a small, curated table of typical ADULT doses.
// When the user's message mentions one of these drugs, we inject the verified
// figures into the system prompt so the model QUOTES them instead of recalling
// them from memory (which small models get wrong). Deterministic, no infra.
// Figures are typical adult doses from standard references; the prompt still
// tells the user to confirm with a doctor/pharmacist (children, pregnancy and
// kidney/liver disease differ). Keep this list accurate; add drugs as needed.
// ---------------------------------------------------------------------------
const DRUGS = [
  { names: ['paracetamol', 'acetaminophen', 'crocin', 'dolo', 'calpol'], dose: '500–1000 mg every 4–6 hours as needed', max: '4 g (4000 mg) per day; 3 g/day if elderly, frail, low body weight, liver disease or regular alcohol', caution: 'liver toxicity in overdose; many cold/flu products also contain it — do not double up' },
  { names: ['ibuprofen', 'brufen', 'combiflam'], dose: '200–400 mg every 4–6 hours with food', max: '1200 mg/day over the counter (up to 2400 mg/day only under medical advice)', caution: 'avoid/caution in ulcers, kidney disease, uncontrolled BP, asthma, pregnancy (esp. 3rd trimester)' },
  { names: ['aspirin', 'acetylsalicylic'], dose: 'pain/fever: 300–600 mg every 4–6 hours; antiplatelet (heart): 75–150 mg once daily', max: '4 g/day for pain use', caution: 'bleeding risk; avoid in children (Reye’s syndrome)' },
  { names: ['diclofenac', 'voveran'], dose: '50 mg two to three times daily with food', max: '150 mg/day', caution: 'NSAID — stomach, kidney and cardiovascular risks' },
  { names: ['aceclofenac'], dose: '100 mg twice daily with food', max: '200 mg/day', caution: 'NSAID cautions' },
  { names: ['naproxen'], dose: '250–500 mg twice daily', max: '1000 mg/day (1250 mg short-term)', caution: 'NSAID cautions' },
  { names: ['tramadol'], dose: '50–100 mg every 4–6 hours', max: '400 mg/day', caution: 'prescription opioid; drowsiness, dependence, interactions' },
  { names: ['amoxicillin', 'amoxycillin', 'mox'], dose: '250–500 mg every 8 hours (or 500–875 mg every 12 hours)', max: 'usually up to 1.75–3 g/day depending on infection', caution: 'prescription antibiotic; penicillin allergy; finish the full course' },
  { names: ['amoxiclav', 'co-amoxiclav', 'augmentin', 'clavulanate', 'clavulanic'], dose: '500/125 mg every 8 hours or 875/125 mg every 12 hours', max: 'per prescription', caution: 'prescription antibiotic; penicillin allergy' },
  { names: ['azithromycin', 'azithral', 'zithromax'], dose: '500 mg once daily for 3 days (or 500 mg day 1 then 250 mg daily for 4 days)', max: 'per course', caution: 'prescription antibiotic; QT prolongation caution' },
  { names: ['cefixime', 'taxim-o', 'cefix'], dose: '200 mg twice daily', max: '400 mg/day', caution: 'prescription antibiotic' },
  { names: ['cephalexin', 'cefalexin'], dose: '250–500 mg every 6 hours', max: 'per prescription', caution: 'prescription antibiotic; penicillin cross-allergy' },
  { names: ['ciprofloxacin', 'cifran', 'ciplox'], dose: '250–500 mg twice daily', max: '1500 mg/day', caution: 'prescription; tendon rupture, QT, not usually in children/pregnancy' },
  { names: ['levofloxacin', 'levoflox'], dose: '500 mg once daily', max: '750 mg/day', caution: 'prescription; tendon/QT cautions' },
  { names: ['doxycycline'], dose: '100 mg twice daily (or once daily)', max: '200 mg/day', caution: 'prescription; avoid in pregnancy and young children' },
  { names: ['metronidazole', 'flagyl', 'metrogyl'], dose: '400 mg three times daily', max: 'per prescription', caution: 'avoid alcohol during and 48 h after' },
  { names: ['cetirizine', 'cetrizine', 'alerid', 'cetzine'], dose: '10 mg once daily', max: '10 mg/day', caution: 'may cause drowsiness' },
  { names: ['levocetirizine'], dose: '5 mg once daily', max: '5 mg/day', caution: 'may cause drowsiness' },
  { names: ['loratadine'], dose: '10 mg once daily', max: '10 mg/day', caution: 'non-drowsy antihistamine' },
  { names: ['fexofenadine', 'allegra'], dose: '120–180 mg once daily', max: '180 mg/day', caution: 'non-drowsy antihistamine' },
  { names: ['chlorpheniramine', 'cpm', 'piriton'], dose: '4 mg every 4–6 hours', max: '24 mg/day', caution: 'sedating' },
  { names: ['omeprazole'], dose: '20 mg once daily before breakfast', max: '40 mg/day', caution: 'long-term use: B12/magnesium; review need' },
  { names: ['pantoprazole', 'pantop', 'pan-40', 'pan 40'], dose: '40 mg once daily before breakfast', max: '40 mg/day (80 mg in specific cases)', caution: 'review long-term need' },
  { names: ['rabeprazole'], dose: '20 mg once daily', max: '20 mg/day', caution: 'review long-term need' },
  { names: ['famotidine'], dose: '20–40 mg once or twice daily', max: '80 mg/day', caution: '(replaced ranitidine, which was withdrawn)' },
  { names: ['domperidone'], dose: '10 mg three times daily before meals', max: '30 mg/day, short-term', caution: 'heart-rhythm caution; short courses' },
  { names: ['ondansetron', 'emeset'], dose: '4–8 mg two to three times daily', max: '24 mg/day', caution: 'QT prolongation caution' },
  { names: ['metformin'], dose: 'start 500 mg once or twice daily with meals, titrate up', max: '~2000–2550 mg/day', caution: 'take with food; stop if severe illness/dehydration; can lower B12' },
  { names: ['amlodipine'], dose: '5 mg once daily', max: '10 mg/day', caution: 'ankle swelling common' },
  { names: ['telmisartan'], dose: '40 mg once daily', max: '80 mg/day', caution: 'avoid in pregnancy; check kidney function/potassium' },
  { names: ['losartan'], dose: '50 mg once daily', max: '100 mg/day', caution: 'avoid in pregnancy' },
  { names: ['atenolol'], dose: '25–50 mg once daily', max: '100 mg/day', caution: 'do not stop abruptly; caution in asthma' },
  { names: ['metoprolol'], dose: '25–100 mg twice daily (immediate-release)', max: '~400 mg/day', caution: 'do not stop abruptly' },
  { names: ['atorvastatin'], dose: '10–80 mg once daily (evening)', max: '80 mg/day', caution: 'muscle aches; report severe pain' },
  { names: ['rosuvastatin'], dose: '5–40 mg once daily', max: '40 mg/day', caution: 'muscle aches; report severe pain' },
  { names: ['clopidogrel'], dose: '75 mg once daily', max: '75 mg/day', caution: 'bleeding risk; do not stop without advice' },
  { names: ['montelukast'], dose: '10 mg once daily at night', max: '10 mg/day', caution: 'rare mood/behaviour effects' },
  { names: ['salbutamol', 'albuterol', 'asthalin', 'ventolin'], dose: 'inhaler 1–2 puffs (100 mcg each) as needed', max: 'usually up to ~8 puffs/day — frequent need means see a doctor', caution: 'overuse signals poor control' },
  { names: ['levothyroxine', 'thyroxine', 'eltroxin', 'thyronorm'], dose: 'INDIVIDUALISED by TSH; commonly 25–150 mcg once daily on an empty stomach', max: 'set by your doctor from blood tests', caution: 'do not self-adjust; take 30–60 min before food' },
  { names: ['prednisolone', 'prednisone'], dose: 'INDIVIDUALISED (often 5–60 mg/day) — set by the doctor', max: 'per doctor', caution: 'do not stop abruptly after long courses' },
  { names: ['vitamin d', 'cholecalciferol', 'vitamin d3'], dose: 'deficiency (India): commonly 60,000 IU once weekly for 6–8 weeks, then maintenance', max: 'per doctor', caution: 'high doses need medical guidance' },
  { names: ['vitamin b12', 'methylcobalamin', 'cobalamin'], dose: 'oral 500–1500 mcg daily (or injections if deficient)', max: 'well tolerated', caution: 'find the cause of deficiency' },
  { names: ['folic acid', 'folate'], dose: 'commonly 5 mg once daily (India); pregnancy prevention 400 mcg/day', max: 'per doctor', caution: '—' },
  { names: ['ferrous sulfate', 'ferrous', 'iron tablet', 'iron supplement'], dose: 'about one tablet (≈65 mg elemental iron) once or twice daily', max: 'per doctor', caution: 'take with vitamin C; may cause dark stools/constipation' },
];

function extractUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== 'user') continue;
    if (typeof m.content === 'string') return m.content;
    if (Array.isArray(m.content)) {
      return m.content.filter((b) => b && b.type === 'text').map((b) => b.text || '').join(' ');
    }
  }
  return '';
}

function dosingGrounding(messages) {
  const text = (extractUserText(messages) || '').toLowerCase();
  if (!text) return '';
  const seen = new Set();
  const hits = [];
  for (const d of DRUGS) {
    if (d.names.some((n) => text.includes(n))) {
      const key = d.names[0];
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push(d);
    }
    if (hits.length >= 6) break;
  }
  if (!hits.length) return '';
  const lines = hits.map((d) => `- ${d.names[0].charAt(0).toUpperCase() + d.names[0].slice(1)}: ${d.dose}. Max: ${d.max}. Caution: ${d.caution}.`);
  return `\n\nVERIFIED ADULT DOSING REFERENCE — use THESE exact figures for the medicine(s) named below; do NOT state any different numbers. These are typical adult doses only: remind the user that children, pregnancy, and kidney/liver disease differ, and to confirm their exact dose with a doctor or pharmacist. If a value is marked INDIVIDUALISED, do not invent a number — say it is set by the doctor.\n${lines.join('\n')}`;
}

function corsHeaders(origin, allowed) {
  const ok = allowed.length === 0 || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin || '*' : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(status, body, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

async function rateLimited(env, ip) {
  if (!env.RATE_LIMIT || !ip) return false;
  const key = `rl:${ip}`;
  const count = parseInt((await env.RATE_LIMIT.get(key)) || '0', 10);
  if (count >= RATE_MAX) return true;
  // Best-effort increment; expires after the window.
  await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: RATE_WINDOW });
  return false;
}

// Email a new-consultation alert (called by a Supabase Database Webhook).
async function handleNotify(request, env) {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' }, {});
  if (env.NOTIFY_SECRET && request.headers.get('x-notify-secret') !== env.NOTIFY_SECRET) {
    return json(401, { error: 'Unauthorized' }, {});
  }
  if (!env.RESEND_API_KEY || !env.ADMIN_EMAIL) {
    return json(500, { error: 'Notify not configured' }, {});
  }
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    /* ignore */
  }
  const r = payload?.record || {};
  const rows = ['name', 'email', 'phone', 'department', 'condition', 'notes']
    .filter((k) => r[k])
    .map((k) => `<tr><td style="padding:4px 10px;color:#666">${k}</td><td style="padding:4px 10px"><b>${String(r[k]).replace(/</g, '&lt;')}</b></td></tr>`)
    .join('');
  const html = `<h2 style="font-family:Arial">New consultation request</h2><table style="font-family:Arial;border-collapse:collapse">${rows}</table><p style="font-family:Arial;color:#888;font-size:12px">via medicalandroid.com</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.NOTIFY_FROM || 'MedicalAndroid <onboarding@resend.dev>',
      to: env.ADMIN_EMAIL,
      subject: `New consultation: ${r.name || 'Unknown'}${r.department ? ' · ' + r.department : ''}`,
      html,
    }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    return json(502, { error: 'Email failed', detail }, {});
  }
  return json(200, { ok: true }, {});
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/notify') return handleNotify(request, env);

    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const cors = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed' }, cors);

    if (allowed.length && origin && !allowed.includes(origin)) {
      return json(403, { error: 'Origin not allowed' }, cors);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return json(500, { error: 'Server missing ANTHROPIC_API_KEY' }, cors);
    }

    // CF-Connecting-IP is the direct caller. When the request arrives via the
    // site's same-origin Pages Function relay (/api/chat), the real visitor IP
    // is forwarded in X-Real-IP so rate limiting stays per-user, not per-relay.
    const ip = request.headers.get('X-Real-IP') || request.headers.get('CF-Connecting-IP') || '';
    if (await rateLimited(env, ip)) {
      return json(429, { error: 'Too many messages — please wait a minute.' }, cors);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json(400, { error: 'Invalid JSON' }, cors);
    }

    const messages = Array.isArray(payload?.messages) ? payload.messages.slice(-MAX_MESSAGES) : [];
    if (!messages.length) return json(400, { error: 'No messages' }, cors);

    // Pick the answer style from the UI's "Doctor mode" toggle (default: concise).
    const style = payload?.mode === 'doctor' ? STYLE_DOCTOR : STYLE_CONCISE;
    const system = `${SYSTEM_PROMPT}\n\n${style}${dosingGrounding(messages)}`;

    // Call Anthropic (streaming).
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.MODEL || DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system,
        stream: true,
        messages,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      let detail = 'Upstream error';
      try {
        detail = (await upstream.json())?.error?.message || detail;
      } catch {
        /* ignore */
      }
      return json(502, { error: detail }, cors);
    }

    // Pipe Anthropic's SSE stream straight through to the browser. Doing the
    // parsing here would burn the Worker's (free-plan) CPU budget and truncate
    // long replies, so the client parses the event stream instead.
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        ...cors,
      },
    });
  },
};
