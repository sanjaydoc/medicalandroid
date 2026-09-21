// Generates MedDroid SEO landing pages (static, crawlable) into client/public/,
// and rewrites client/public/sitemap.xml to list all of them + the home + the
// original four pages. Run: node scripts/gen-landing.mjs
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYMPTOMS, BLOODTESTS, LAB_NOTE } from './clusters.mjs';
import { DEPARTMENTS } from './departments.mjs';
import g1 from './diseases/g1.mjs';
import g2 from './diseases/g2.mjs';
import g3 from './diseases/g3.mjs';
import g4 from './diseases/g4.mjs';
import g5 from './diseases/g5.mjs';
import g6 from './diseases/g6.mjs';
import g7 from './diseases/g7.mjs';
import g8 from './diseases/g8.mjs';
import g9 from './diseases/g9.mjs';

// Merge disease data from all clusters, de-duping by slug (first wins).
const DISEASE_DATA = [...g1, ...g2, ...g3, ...g4, ...g5, ...g6, ...g7, ...g8, ...g9];
const _seenDisease = new Set();
const DISEASES = [];
for (const d of DISEASE_DATA) {
  if (!d || !d.slug || _seenDisease.has(d.slug)) continue;
  _seenDisease.add(d.slug);
  DISEASES.push(d);
}
// Group diseases by their primary department slug (for the department pages).
const BY_DEPT = {};
for (const d of DISEASES) {
  const k = d.dept && d.dept[0];
  if (!k) continue;
  (BY_DEPT[k] = BY_DEPT[k] || []).push(d);
}

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'client', 'public');
const DOMAIN = 'https://medicalandroid.com';

const LOGO = `<svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#4285F4"/><rect x="27.5" y="13" width="9" height="30" rx="4.5" fill="#EA4335"/><rect x="17" y="23.5" width="30" height="9" rx="4.5" fill="#EA4335"/><path d="M10 46 h11 l4 -9 5 16 4 -10 h20" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const CSS = `:root{color-scheme:light;--blue:#4285F4;--blue2:#2F6FE0;--red:#EA4335;--bg:#eef3fb;--surface:#fff;--ink:#152038;--sub:#5a6b8a;--line:#e4e9f3;--card:#f6f9fe}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--blue2)}
.wrap{max-width:760px;margin:0 auto;padding:24px 16px 64px}
header.site{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:28px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:19px;color:var(--ink);text-decoration:none;letter-spacing:-.02em}
.cta{display:inline-block;background:var(--blue);color:#fff;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;box-shadow:0 6px 18px rgba(66,133,244,.35)}
.cta:hover{background:var(--blue2)}
h1{font-size:clamp(26px,5vw,38px);line-height:1.15;letter-spacing:-.02em;margin:0 0 12px;text-wrap:balance}
.lede{font-size:18px;color:var(--sub);margin:0 0 24px}
h2{font-size:22px;margin:34px 0 10px;letter-spacing:-.01em}
p{margin:0 0 14px}
ul.feat{list-style:none;padding:0;margin:0 0 16px;display:grid;gap:10px}
ul.feat li{position:relative;padding-left:28px}
ul.feat li::before{content:"\\2713";position:absolute;left:0;top:0;color:var(--blue);font-weight:800}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px;margin:18px 0}
.faq details{border-bottom:1px solid var(--line);padding:14px 0}
.faq summary{font-weight:700;cursor:pointer;list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq p{margin:10px 0 0;color:var(--sub)}
.ctarow{margin:28px 0;text-align:center}
.related{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
.related a{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:8px 14px;text-decoration:none;font-weight:600;font-size:14px;color:var(--blue2)}
.disc{font-size:13px;color:var(--sub);border-top:1px solid var(--line);margin-top:36px;padding-top:16px}
table.ref{width:100%;border-collapse:collapse;margin:6px 0 18px;font-size:15px}
table.ref th,table.ref td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line)}
table.ref thead th{color:var(--sub);font-weight:700;background:var(--card)}
table.ref td:last-child,table.ref th:last-child{font-variant-numeric:tabular-nums;white-space:nowrap}
ul.plain{list-style:none;padding:0;margin:0 0 8px;display:grid;gap:10px}
ul.plain li{position:relative;padding-left:20px}
ul.plain li::before{content:"\\2022";position:absolute;left:2px;top:0;color:var(--blue);font-weight:800}
.card.warn{border-color:#f6c9c4;background:#fdeeec}
.card.warn h2{margin:0 0 8px;font-size:18px;color:var(--red)}
.card.warn ul{margin:0;padding-left:20px}
.card.warn li{margin:6px 0}
.grouptitle{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--sub);margin:22px 0 8px}`;

const DISC = `MedDroid is an AI medical assistant and can make mistakes. It provides general health information, not a diagnosis or medical advice — always consult a qualified clinician. In an emergency, contact your local emergency number immediately.`;

function faqJsonLd(faqs) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  });
}

function page(p) {
  const url = `${DOMAIN}/${p.slug}/`;
  const faqs = p.faqs.map((f) =>
    `    <details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('\n');
  const related = p.related.map((r) => `    <a href="/${r[0]}/">${r[1]}</a>`).join('\n');

  // Optional reference-range table (blood tests).
  const tableHtml = p.table
    ? `  <h2>${p.table.caption}</h2>
  <table class="ref"><thead><tr><th>Measure</th><th>Range</th></tr></thead><tbody>
${p.table.rows.map((r) => `    <tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('\n')}
  </tbody></table>\n`
    : '';

  // Main feature list (causes / what MedDroid does).
  const featHtml = (p.features && p.features.length)
    ? `  <h2>${p.featTitle}</h2>
  <ul class="feat">
${p.features.map((f) => `        <li>${f}</li>`).join('\n')}
  </ul>\n`
    : '';

  // Extra grouped lists (e.g. "What a high result can mean").
  const listsHtml = (p.lists || []).map((l) =>
    `  <h2>${l.title}</h2>
  <ul class="plain">
${l.items.map((i) => `    <li>${i}</li>`).join('\n')}
  </ul>\n`).join('\n');

  // Red-flag warning card (symptoms).
  const warnHtml = (p.warnings && p.warnings.length)
    ? `  <div class="card warn">
    <h2>When to see a doctor urgently</h2>
    <ul>
${p.warnings.map((w) => `      <li>${w}</li>`).join('\n')}
    </ul>
  </div>\n`
    : '';

  // Generic note card.
  const noteHtml = p.note
    ? `  <div class="card">
    <strong>${p.noteTitle}</strong> ${p.note}
  </div>\n`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${p.title}</title>
<meta name="description" content="${p.desc}" />
<link rel="canonical" href="${url}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="MedDroid" />
<meta property="og:title" content="${p.title}" />
<meta property="og:description" content="${p.desc}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${DOMAIN}/pwa-512.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${p.title}" />
<meta name="twitter:description" content="${p.desc}" />
<meta name="twitter:image" content="${DOMAIN}/pwa-512.png" />
<script type="application/ld+json">
${faqJsonLd(p.faqs)}
</script>
<style>
${CSS}
</style>
</head>
<body>
<div class="wrap">
  <header class="site">
    <a class="brand" href="/">${LOGO} MedDroid</a>
    <a class="cta" href="/#/assistant">${p.ctaShort}</a>
  </header>

  <h1>${p.h1}</h1>
  <p class="lede">${p.lede}</p>

  <div class="ctarow"><a class="cta" href="/#/assistant">${p.ctaLong} &rarr;</a></div>

${tableHtml}${featHtml}${listsHtml}${warnHtml}${noteHtml}
  <h2>Frequently asked questions</h2>
  <div class="faq">
${faqs}
  </div>

  <div class="ctarow"><a class="cta" href="/#/assistant">${p.ctaLong} &rarr;</a></div>

  <h2>Explore more</h2>
  <div class="related">
${related}
  </div>

  <p class="disc">${DISC}</p>
</div>
</body>
</html>
`;
}

// ---------------------------------------------------------------- content ----
const R_CORE = [
  ['ai-doctor', 'AI doctor'],
  ['ai-symptom-checker', 'AI symptom checker'],
  ['ai-medical-assistant', 'AI medical assistant'],
  ['blood-test-results-explained', 'Blood test results explained'],
];

function renderRef(item) {
  const [href, label] = item;
  return href ? `<a href="/${href}/">${label}</a>` : label;
}

function deptPage(d) {
  const low = d.label.toLowerCase();
  const diseaseLinks = (BY_DEPT[d.slug] || []).map((x) => `<a href="/diseases/${x.slug}/">${x.name}</a>`);
  const lists = [
    { title: 'Common symptoms', items: d.symptoms.map(renderRef) },
    { title: 'Tests & procedures', items: d.tests.map(renderRef) },
  ];
  if (diseaseLinks.length) lists.push({ title: `Conditions we cover in ${d.label}`, items: diseaseLinks });
  return {
    slug: `ask/${d.slug}`,
    name: d.label,
    title: `${d.label} — Conditions, Symptoms & Tests | MedDroid`,
    desc: `${d.label}: conditions treated, common symptoms, tests & procedures and when to see the specialist — explained by MedDroid's free AI. Educational, not a diagnosis.`,
    h1: `${d.label}`,
    lede: d.lede,
    ctaShort: 'Ask MedDroid',
    ctaLong: `Ask MedDroid about ${low}`,
    featTitle: 'Conditions treated',
    features: d.conditions,
    lists,
    warnings: d.whenToSee,
    faqs: d.faqs,
    related: R_CORE,
  };
}

// One rich page per disease, cross-linked to its department + symptom/test pages.
function diseasePage(d) {
  const lists = [];
  const sym = (d.symptoms || []).map(renderRef);
  const tst = (d.tests || []).map(renderRef);
  if (sym.length) lists.push({ title: 'Common symptoms', items: sym });
  if (tst.length) lists.push({ title: 'Tests & diagnosis', items: tst });
  if ((d.treatment || []).length) lists.push({ title: 'Treatment & management', items: d.treatment });
  return {
    slug: `diseases/${d.slug}`,
    name: d.name,
    title: `${d.name} — Causes, Symptoms & Treatment | MedDroid`,
    desc: String(d.lede || '').replace(/<[^>]+>/g, '').slice(0, 155),
    h1: d.name,
    lede: d.lede,
    ctaShort: 'Ask MedDroid',
    ctaLong: `Ask MedDroid about ${d.name.toLowerCase()}`,
    featTitle: 'Causes & risk factors',
    features: d.causes || [],
    lists,
    warnings: d.whenToSee,
    noteTitle: 'Not a diagnosis.',
    note: `MedDroid gives general educational information about ${d.name.toLowerCase()}. It cannot examine you, diagnose or prescribe — always confirm with a qualified doctor.`,
    faqs: d.faqs,
    related: [
      ['ask/' + (d.dept && d.dept[0]), (d.dept && d.dept[1]) || 'Departments'],
      ['ai-symptom-checker', 'AI symptom checker'],
      ['ai-doctor', 'AI doctor'],
      ['blood-test-results-explained', 'Blood tests explained'],
    ],
  };
}

const SPECIALITIES = DEPARTMENTS.map(deptPage);
const DISEASE_PAGES = DISEASES.map(diseasePage);

function qcluster(slug, title, h1, lede, features, faqs) {
  return {
    slug, title, h1, lede,
    desc: lede.replace(/<[^>]+>/g, '').slice(0, 155),
    ctaShort: 'Ask MedDroid',
    ctaLong: 'Ask MedDroid',
    featTitle: 'What MedDroid tells you',
    features,
    noteTitle: 'Not a final diagnosis.',
    note: 'MedDroid gives general educational information to help you understand — always confirm with your doctor or the relevant specialist.',
    faqs,
    related: R_CORE,
  };
}

const QUESTIONS = [
  qcluster('ecg-explained', 'ECG Explained — Understand Your ECG with MedDroid AI',
    'ECG explained — in plain language',
    'Got an ECG and no idea what the lines mean? Attach it and MedDroid’s free AI walks you through the rate, rhythm and any features to ask your doctor about — in simple words.',
    ['Heart rate and whether it is fast, slow or normal', 'Rhythm — regular or irregular', 'Any features that may need a doctor’s review', 'Plain-language summary + what to ask your cardiologist'],
    [
      { q: 'Can AI read my ECG accurately?', a: 'MedDroid gives a genuine, useful read in plain words, but AI can miss findings — it is educational, not a diagnosis. A doctor or cardiologist must confirm on the actual tracing.' },
      { q: 'What is a normal heart rate?', a: 'A typical resting heart rate is about 60–100 beats per minute, but it varies with fitness and situation. MedDroid explains what your reading suggests in general terms.' },
      { q: 'What does an irregular rhythm mean?', a: 'It can range from harmless extra beats to conditions like atrial fibrillation that need treatment. MedDroid explains the possibilities and urges a proper review.' },
    ]),
  qcluster('x-ray-explained', 'X-ray Explained — Understand Your X-ray with MedDroid AI',
    'X-ray explained — in simple words',
    'MedDroid’s free AI describes what your X-ray appears to show — bones, lungs or joints — and the most likely findings in plain language, then tells you a radiologist must confirm.',
    ['A plain-language description of what’s visible', 'The most likely finding(s) and possibilities', 'Never a false "all-clear" — subtle findings can be missed', 'Clear next steps and who to confirm with'],
    [
      { q: 'Can MedDroid diagnose from an X-ray?', a: 'No — it gives a useful, tentative read in plain words but can miss findings. It is not a diagnosis; a radiologist must review the actual images.' },
      { q: 'What can a chest X-ray show?', a: 'It can suggest things like infection (pneumonia), fluid, lung changes such as COPD, or heart size changes. MedDroid explains these in simple terms.' },
      { q: 'Should I worry if something looks abnormal?', a: 'Many findings are treatable and some are not serious — but anything flagged should be confirmed by a doctor promptly, especially with symptoms.' },
    ]),
  qcluster('mri-scan-explained', 'MRI Scan Explained — Understand Your MRI with MedDroid AI',
    'MRI scan explained — in plain language',
    'MRI reports are full of jargon. Attach your scan or report and MedDroid’s free AI explains what it appears to show and what the terms mean — in words you can understand.',
    ['Plain-language meaning of the findings and terms', 'What is likely reassuring vs what needs review', 'A summary you can take to your appointment', 'Answers in your own language'],
    [
      { q: 'Can AI interpret my MRI?', a: 'MedDroid explains what an MRI or its report appears to show in simple words, but it is educational only — a radiologist and your treating doctor must confirm.' },
      { q: 'What do "hyperintensity" and similar terms mean?', a: 'MedDroid translates common MRI terms into plain language and explains, in general, what they can indicate — without replacing the specialist read.' },
      { q: 'Is an incidental finding dangerous?', a: 'Many incidental findings are harmless, but some need follow-up. MedDroid explains the general picture and urges you to confirm with your doctor.' },
    ]),
  qcluster('medicine-side-effects', 'Medicine Side Effects & Interactions — MedDroid AI',
    'Medicine side effects, explained',
    'Not sure about a medicine? MedDroid’s free AI explains how it generally works, its common side effects, and interactions to watch for — in plain language, in your language.',
    ['How a medicine generally works and what it treats', 'Common and serious side effects to know', 'Interactions with other medicines, food or alcohol', 'Typical general dosing (confirm your exact dose with a pharmacist)'],
    [
      { q: 'Can MedDroid tell me if two medicines interact?', a: 'It explains common, well-known interactions in general terms and flags when to check with a pharmacist. For your exact medicines and doses, always confirm with your doctor or pharmacist.' },
      { q: 'Is it safe to take painkillers together?', a: 'Some combinations are fine and some are risky (and many products already contain the same drug). MedDroid explains the general rules and when to be careful.' },
      { q: 'What should I do about a side effect?', a: 'MedDroid explains which side effects are usually mild and which need prompt medical attention — and always says to seek care for severe reactions.' },
    ]),
  qcluster('is-my-fever-serious', 'Is My Fever Serious? — Free AI Fever Check | MedDroid',
    'Is my fever serious?',
    'Describe your fever to MedDroid’s free AI, in any language, and get clear guidance on likely causes, home care, and — most importantly — the warning signs that mean you should see a doctor now.',
    ['What temperature counts as a fever and when it matters', 'Simple home care that helps', 'Red-flag symptoms that need urgent care', 'When to see a doctor vs wait it out'],
    [
      { q: 'What temperature is a fever?', a: 'Generally a temperature of 38°C (100.4°F) or above. MedDroid explains what your reading means and what to do.' },
      { q: 'When is a fever an emergency?', a: 'Seek urgent care for a very high fever, a stiff neck, difficulty breathing, a non-fading rash, confusion, or fever in a very young infant. When in doubt, get seen.' },
      { q: 'How long should a fever last?', a: 'Many viral fevers settle in a few days. MedDroid explains when a lasting or worsening fever should be checked by a doctor.' },
    ]),
];

// ------------------------------------------------------ symptom cluster ------
function symptomPage(s) {
  const low = s.name.toLowerCase();
  return {
    slug: `symptoms/${s.slug}`,
    name: s.name,
    title: `${s.name}: Causes, When to Worry & What to Do | MedDroid`,
    desc: `${s.name}: common causes, the warning signs that need a doctor, and what you can do — explained in plain language by MedDroid's free AI. Educational, not a diagnosis.`,
    h1: `${s.name}: causes, warning signs & what to do`,
    lede: s.lede,
    ctaShort: 'Check my symptoms',
    ctaLong: `Ask MedDroid about ${low}`,
    featTitle: `Common causes of ${low}`,
    features: s.causes,
    warnings: s.warnings,
    faqs: s.faqs,
    related: [
      ['ai-symptom-checker', 'AI symptom checker'],
      ['ask/' + s.dept[0], s.dept[1]],
      ['ai-doctor', 'AI doctor'],
      ['ai-medical-assistant', 'AI medical assistant'],
    ],
  };
}

// --------------------------------------------------- blood-test cluster ------
function bloodTestPage(b) {
  return {
    slug: `blood-tests/${b.slug}`,
    name: b.name,
    title: `${b.name}: Normal Range, High & Low Explained | MedDroid`,
    desc: `${b.name}: what it measures, the normal reference range, and what high or low results can mean. MedDroid explains your report in plain language — not a diagnosis.`,
    h1: `${b.name}: normal range & what your result means`,
    lede: b.lede,
    ctaShort: 'Explain my report',
    ctaLong: 'Upload your report to MedDroid',
    table: { caption: 'Typical adult reference range', rows: b.rows },
    lists: [
      { title: 'What a HIGH result can mean', items: b.high },
      { title: 'What a LOW result can mean', items: b.low },
    ],
    noteTitle: 'Ranges vary by lab.',
    note: LAB_NOTE,
    faqs: b.faqs,
    related: [
      ['blood-test-results-explained', 'All blood tests explained'],
      ['ai-medical-assistant', 'AI medical assistant'],
      ['ai-doctor', 'AI doctor'],
    ],
  };
}

const SYMPTOM_PAGES = SYMPTOMS.map(symptomPage);
const BLOODTEST_PAGES = BLOODTESTS.map(bloodTestPage);

const ALL = [...SPECIALITIES, ...QUESTIONS, ...SYMPTOM_PAGES, ...BLOODTEST_PAGES, ...DISEASE_PAGES];

for (const p of ALL) {
  const dir = join(PUBLIC, ...p.slug.split('/'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), page(p), 'utf8');
  console.log('wrote', p.slug);
}

// Inject an auto-generated child index into a hub page, between the markers
//   <div class="related" id="child-index"> ... </div>
function injectIndex(hubSlug, pages) {
  const file = join(PUBLIC, hubSlug, 'index.html');
  let html;
  try { html = readFileSync(file, 'utf8'); } catch { console.log('  (hub not found, skipped index):', hubSlug); return; }
  const links = pages.map((p) => `<a href="/${p.slug}/">${p.name}</a>`).join('\n    ');
  const re = /(<div class="related" id="child-index">)[\s\S]*?(<\/div>)/;
  if (!re.test(html)) { console.log('  (no child-index marker in):', hubSlug); return; }
  html = html.replace(re, `$1\n    ${links}\n  $2`);
  writeFileSync(file, html, 'utf8');
  console.log(`  indexed ${pages.length} children into ${hubSlug}`);
}
injectIndex('ai-symptom-checker', SYMPTOM_PAGES);
injectIndex('blood-test-results-explained', BLOODTEST_PAGES);

// sitemap: home + original core pages + generated pages
const sitemapUrls = [
  { loc: `${DOMAIN}/`, freq: 'weekly', pri: '1.0' },
  ...R_CORE.map((r) => ({ loc: `${DOMAIN}/${r[0]}/`, freq: 'monthly', pri: '0.9' })),
  ...ALL.map((p) => ({ loc: `${DOMAIN}/${p.slug}/`, freq: 'monthly', pri: '0.8' })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((u) => `  <url><loc>${u.loc}</loc><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(PUBLIC, 'sitemap.xml'), sitemap, 'utf8');
console.log(`\nwrote sitemap.xml with ${sitemapUrls.length} URLs`);
console.log('done');
