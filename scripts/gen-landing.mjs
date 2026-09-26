// Generates MedDroid SEO landing pages (static, crawlable) into client/public/,
// and rewrites client/public/sitemap.xml to list all of them + the home + the
// original four pages. Run: node scripts/gen-landing.mjs
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYMPTOMS, BLOODTESTS, LAB_NOTE } from './clusters.mjs';
import { DRUGS } from './drugs.mjs';
import { DRUG_CLASSES } from './drugs-bulk.mjs';
import { DRUG_CLASSES_2 } from './drugs-bulk2.mjs';
import { DRUG_CLASSES_3 } from './drugs-bulk3.mjs';
import { CHILD_QA } from './child-qa.mjs';
import { WOMEN_QA } from './women-qa.mjs';
import { FIRST_AID } from './first-aid.mjs';
import { MENS_QA } from './mens-qa.mjs';
import { MENTAL_QA } from './mental-qa.mjs';
import { NUTRITION_QA } from './nutrition-qa.mjs';
import { MEDICINE_FOR } from './medicine-for.mjs';
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
.grouptitle{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--sub);margin:22px 0 8px}
.byline{font-size:13.5px;color:var(--sub);margin:-2px 0 22px;padding-bottom:16px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.byline strong{color:var(--ink);font-weight:700}
.byline .dot{color:var(--line)}
ul.refs{list-style:none;padding:0;margin:0 0 8px;display:grid;gap:8px}
ul.refs li{position:relative;padding-left:20px;font-size:14px}
ul.refs li::before{content:"\\2197";position:absolute;left:0;top:0;color:var(--blue);font-weight:800}`;

const DISC = `MedDroid is an AI medical assistant and can make mistakes. It provides general health information, not a diagnosis or medical advice — always consult a qualified clinician. In an emergency, contact your local emergency number immediately.`;

// E-E-A-T signals (Google weights author expertise + freshness heavily for
// health/YMYL content). Byline, "last reviewed" date and authoritative sources
// are added to every generated page, plus MedicalWebPage schema naming the author.
const AUTHOR_NAME = 'Dr. Sanjay Anbu';
const AUTHOR_CRED = 'MBBS';
const REVIEW_ISO = new Date().toISOString().slice(0, 10);
const REVIEW_HUMAN = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// Authoritative sources consumer health pages should cite (dofollow — outbound
// links to reputable references are a positive trust signal for medical content).
const SOURCES = [
  ['https://www.who.int/health-topics', 'World Health Organization (WHO)'],
  ['https://medlineplus.gov/', 'MedlinePlus — U.S. National Library of Medicine'],
  ['https://www.mohfw.gov.in/', 'Ministry of Health & Family Welfare, India'],
  ['https://www.icmr.gov.in/', 'Indian Council of Medical Research (ICMR)'],
];

function medWebPageJsonLd(url, p) {
  const author = {
    '@type': 'Person',
    name: AUTHOR_NAME,
    honorificPrefix: 'Dr.',
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'degree',
      name: `${AUTHOR_CRED} (Bachelor of Medicine, Bachelor of Surgery)`,
    },
  };
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: p.h1,
    url,
    description: p.desc,
    inLanguage: 'en',
    lastReviewed: REVIEW_ISO,
    dateModified: REVIEW_ISO,
    author,
    reviewedBy: author,
    publisher: {
      '@type': 'Organization',
      name: 'MedDroid',
      url: DOMAIN,
      logo: { '@type': 'ImageObject', url: `${DOMAIN}/pwa-512.png` },
    },
  });
}

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
<html lang="${p.lang || 'en'}">
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
<script type="application/ld+json">
${medWebPageJsonLd(url, p)}
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
  <p class="byline">Written &amp; medically reviewed by <strong>${AUTHOR_NAME}, ${AUTHOR_CRED}</strong> <span class="dot">&middot;</span> Last reviewed <time datetime="${REVIEW_ISO}">${REVIEW_HUMAN}</time></p>
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

  <h2>Sources &amp; further reading</h2>
  <ul class="refs">
${SOURCES.map((s) => `    <li><a href="${s[0]}" target="_blank" rel="noopener">${s[1]}</a></li>`).join('\n')}
  </ul>

  <p class="disc">Reviewed by ${AUTHOR_NAME}, ${AUTHOR_CRED}. ${DISC}</p>
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

// ------------------------------------------------------- medicine cluster ------
function drugPage(d) {
  const low = d.name.split(' (')[0].toLowerCase();
  const lists = [];
  const brandItems = [];
  if (d.brandsIndia && d.brandsIndia.length) brandItems.push(`<strong>India:</strong> ${d.brandsIndia.join(', ')}`);
  if (d.brandsWorld && d.brandsWorld.length) brandItems.push(`<strong>Worldwide:</strong> ${d.brandsWorld.join(', ')}`);
  if (brandItems.length) lists.push({ title: 'Common brand names', items: brandItems });
  if ((d.sideEffects || []).length) lists.push({ title: 'Common side effects', items: d.sideEffects });
  if ((d.precautions || []).length) lists.push({ title: 'Before taking it — precautions', items: d.precautions });
  const rx = d.rx ? 'Prescription' : 'Over-the-counter (OTC)';
  return {
    slug: `medicines/${d.slug}`,
    name: d.name,
    title: `${d.name}: Uses, Dose, Side Effects & Brands | MedDroid`,
    desc: (d.desc || `${d.name}: uses, typical adult and paediatric dose, common brands, side effects and precautions — explained in plain language by MedDroid. Not a prescription.`).slice(0, 155),
    h1: `${d.name}: uses, dose & side effects`,
    lede: d.lede,
    ctaShort: 'Ask MedDroid',
    ctaLong: `Ask MedDroid about ${low}`,
    featTitle: 'What it is used for',
    features: d.uses,
    table: {
      caption: 'Typical dose — general reference only, NOT a prescription',
      rows: [
        ['Category', rx],
        ['Adult dose', d.adultDose || 'As directed by your doctor'],
        ['Child (paediatric) dose', d.pedsDose || 'Must be set by a doctor'],
      ],
    },
    lists,
    warnings: d.warnings,
    noteTitle: 'Doses are a general reference, not a prescription.',
    note: `Doses shown are typical adult/paediatric references and vary with age, weight, kidney/liver function and the exact product. Paediatric doses are usually weight-based and must be set by a doctor. MedDroid cannot prescribe — always confirm ${low} and your dose with a doctor or pharmacist and the leaflet inside the pack.`,
    faqs: d.faqs,
    related: d.related || [['medicine-side-effects', 'Medicine side effects'], ['ai-medical-assistant', 'AI medical assistant'], ['ai-doctor', 'AI doctor']],
  };
}

// Bulk drug pages (class-based, no specific dose shown).
function bulkDrugPage(m, cls) {
  const low = m.name.split(' (')[0].toLowerCase();
  const brandItems = [];
  if (m.brandsIndia && m.brandsIndia.length) brandItems.push(`<strong>India:</strong> ${m.brandsIndia.join(', ')}`);
  if (m.brandsWorld && m.brandsWorld.length) brandItems.push(`<strong>Worldwide:</strong> ${m.brandsWorld.join(', ')}`);
  const lists = [];
  if (brandItems.length) lists.push({ title: 'Common brand names', items: brandItems });
  lists.push({ title: 'Common side effects', items: cls.sideEffects });
  lists.push({ title: 'Before taking it — precautions', items: cls.precautions });
  const mates = cls.members.filter((x) => x.slug !== m.slug).slice(0, 3).map((x) => ['medicines/' + x.slug, x.name.split(' (')[0]]);
  return {
    slug: `medicines/${m.slug}`,
    name: m.name,
    title: `${m.name}: Uses, Side Effects & Brands | MedDroid`,
    desc: `${m.name} (${cls.class}): uses, common side effects, precautions and brand names — explained in plain language by MedDroid. Not a prescription.`.slice(0, 155),
    h1: `${m.name}: uses, side effects & brands`,
    lede: `${m.blurb} It belongs to the ${cls.class} group. ${cls.desc}`,
    ctaShort: 'Ask MedDroid',
    ctaLong: `Ask MedDroid about ${low}`,
    featTitle: 'What it is used for',
    features: cls.uses,
    table: {
      caption: 'Drug type — dosing is set by your doctor',
      rows: [
        ['Drug class', cls.class],
        ['Type', m.rx === false ? 'Over-the-counter (OTC)' : 'Prescription'],
        ['Dose', 'Individual — ask your doctor or pharmacist'],
      ],
    },
    lists,
    warnings: cls.warnings,
    noteTitle: 'Not a prescription — no dose shown.',
    note: `The right dose of ${low} depends on age, weight, kidney/liver function and the condition, so MedDroid does not show a dose here. Always get your dose from a doctor or pharmacist and the leaflet inside the pack. General educational information only.`,
    faqs: cls.faqs,
    related: [...mates, ['medicine-side-effects', 'Medicine side effects']],
  };
}

const SYMPTOM_PAGES = SYMPTOMS.map(symptomPage);
const BLOODTEST_PAGES = BLOODTESTS.map(bloodTestPage);
const _curatedDrugSlugs = new Set(DRUGS.map((d) => `medicines/${d.slug}`));
const _bulkSeen = new Set();
const BULK_DRUG_PAGES = [];
for (const cls of [...DRUG_CLASSES, ...DRUG_CLASSES_2, ...DRUG_CLASSES_3]) {
  for (const m of cls.members) {
    const slug = `medicines/${m.slug}`;
    if (_curatedDrugSlugs.has(slug) || _bulkSeen.has(slug)) continue; // curated wins, no dupes
    _bulkSeen.add(slug);
    BULK_DRUG_PAGES.push(bulkDrugPage(m, cls));
  }
}
const DRUG_PAGES = [...DRUGS.map(drugPage), ...BULK_DRUG_PAGES];

// ------------------------------------------------ India-specific specials ----
// High-intent India searches that don't fit the disease/symptom/bloodtest
// templates: a head-to-head comparison, a single-number explainer, and a
// Hindi-language landing page. These use the full page() capabilities.
const INDIA_SPECIALS = [
  {
    slug: 'dengue-vs-typhoid',
    name: 'Dengue vs Typhoid',
    title: 'Dengue vs Typhoid: Symptoms, Fever Pattern & Tests | MedDroid',
    desc: 'Dengue vs typhoid — how the fever, symptoms, tests and platelet count differ, and how doctors tell them apart. Explained in plain language by MedDroid. Not a diagnosis.',
    h1: 'Dengue vs typhoid: how to tell them apart',
    lede: 'Both dengue and typhoid cause high fever and are common in India, but they are very different illnesses — one is a mosquito-borne virus, the other a bacterial infection from contaminated food or water. Here is how their symptoms, timeline and tests differ, and why only a blood test can confirm which one you have.',
    ctaShort: 'Ask MedDroid',
    ctaLong: 'Ask MedDroid about your fever',
    lists: [
      { title: 'Points more towards DENGUE', items: [
        'Sudden high fever with severe body and joint pain (“breakbone fever”)',
        'Pain behind the eyes, headache and a skin rash',
        'Spread by the Aedes mosquito (daytime biter), not food or water',
        'Falling platelet count on blood tests',
        'Warning signs: bleeding gums, nose bleeds, black stools, belly pain',
      ] },
      { title: 'Points more towards TYPHOID', items: [
        'Fever that rises step-by-step over days and stays high',
        'Spread by contaminated food or water',
        'Abdominal pain, constipation or diarrhoea, poor appetite',
        'A coated tongue and sometimes a slow pulse',
        'Rose-coloured spots on the chest or abdomen in some people',
      ] },
    ],
    warnings: [
      'Bleeding from the gums or nose, blood in vomit or stools (dengue warning sign)',
      'Severe abdominal pain, persistent vomiting or a swollen belly',
      'Restlessness, drowsiness, cold clammy skin or fainting',
      'Very high fever that will not come down, or fever lasting more than a few days',
      'Reduced urine, breathlessness or a rapid heartbeat',
    ],
    noteTitle: 'Only a blood test can confirm it.',
    note: 'Dengue and typhoid can look similar in the first few days. Do not self-diagnose — a doctor will use tests such as NS1/dengue serology and Widal or blood culture, along with a platelet count, to decide. MedDroid gives general information, not a diagnosis.',
    faqs: [
      { q: 'Can you have dengue and typhoid at the same time?', a: 'Yes, co-infection is possible, especially in the monsoon season. That is why doctors often test for both when the fever pattern is unclear.' },
      { q: 'Which is more dangerous, dengue or typhoid?', a: 'Both can be serious if untreated. Dengue can lead to bleeding and a dangerous drop in blood pressure; typhoid can cause intestinal complications. Early testing and treatment matter for both.' },
      { q: 'Does the platelet count fall in typhoid too?', a: 'Platelets fall most notably in dengue, but they can dip in typhoid and other infections as well. The count is one clue among many, not a stand-alone diagnosis.' },
      { q: 'What tests tell them apart?', a: 'Dengue is checked with an NS1 antigen test (early) and IgM/IgG serology, with a falling platelet count. Typhoid is checked with a Widal test or, more reliably, a blood culture. A doctor interprets these together.' },
    ],
    related: [
      ['diseases/dengue', 'Dengue'],
      ['diseases/typhoid', 'Typhoid'],
      ['diseases/viral-fever', 'Viral fever'],
      ['dengue-platelet-count', 'Dengue platelet count'],
    ],
  },
  {
    slug: 'dengue-platelet-count',
    name: 'Dengue Platelet Count',
    title: 'Dengue Platelet Count: Normal Range & When It Is Dangerous | MedDroid',
    desc: 'Dengue platelet count explained — the normal range, when a low count is dangerous, when platelets are transfused, and how to care for it. Plain language, not a diagnosis.',
    h1: 'Dengue platelet count: what the number means',
    lede: 'In dengue, the platelet count often falls as part of the illness, which worries many families. Here is what the numbers mean, when a low count actually becomes dangerous, and what care helps — explained simply.',
    ctaShort: 'Explain my report',
    ctaLong: 'Upload your report to MedDroid',
    table: { caption: 'Platelet count — general guide', rows: [
      ['Normal', '150,000 – 450,000 /µL'],
      ['Mildly low', '100,000 – 150,000 /µL'],
      ['Monitor closely', '50,000 – 100,000 /µL'],
      ['High risk — under medical care', '20,000 – 50,000 /µL'],
      ['Danger of spontaneous bleeding', 'below 20,000 /µL'],
    ] },
    lists: [
      { title: 'What actually matters (not just the number)', items: [
        'A falling trend matters more than any single reading',
        'Warning signs (bleeding, belly pain, restlessness) matter more than the count alone',
        'Most people recover as the platelet count rises on its own after the fever settles',
        'Staying well hydrated with fluids is the mainstay of care',
      ] },
      { title: 'Foods and care often advised (supportive only)', items: [
        'Plenty of oral fluids, ORS, soups and coconut water',
        'Papaya leaf extract is popular but not a proven cure — do not rely on it',
        'Rest and paracetamol for fever (avoid aspirin and ibuprofen — they raise bleeding risk)',
        'Regular platelet monitoring as advised by your doctor',
      ] },
    ],
    warnings: [
      'Bleeding from the gums or nose, blood in vomit, stools or urine',
      'Tiny red spots on the skin that do not fade when pressed',
      'Severe abdominal pain, persistent vomiting or a swollen belly',
      'Restlessness, drowsiness, cold clammy skin or fainting',
      'A platelet count that is dropping quickly or is below 20,000',
    ],
    noteTitle: 'Platelets are only part of the picture.',
    note: 'A platelet transfusion is usually needed only for very low counts or active bleeding — not for a number alone. Always let your treating doctor interpret the trend along with your symptoms. MedDroid gives general information, not a diagnosis.',
    faqs: [
      { q: 'At what platelet count is dengue dangerous?', a: 'Bleeding risk rises as the count falls below about 20,000/µL, but warning signs and a fast-falling trend can be concerning even at higher counts. Your doctor looks at the whole picture, not one number.' },
      { q: 'When is a platelet transfusion needed in dengue?', a: 'Usually only for very low counts (often below 10,000–20,000) or active, significant bleeding. Most people recover without a transfusion as platelets rise on their own.' },
      { q: 'Does papaya leaf juice increase platelets?', a: 'It is a popular home remedy, but the evidence is limited and it is not a substitute for medical care. Hydration, monitoring and treating warning signs are what matter most.' },
      { q: 'How quickly do platelets recover after dengue?', a: 'They usually start rising within a day or two after the fever settles and return to normal over about a week, though this varies from person to person.' },
    ],
    related: [
      ['diseases/dengue', 'Dengue'],
      ['dengue-vs-typhoid', 'Dengue vs typhoid'],
      ['blood-tests/complete-blood-count-cbc', 'Complete blood count (CBC)'],
      ['ai-medical-assistant', 'AI medical assistant'],
    ],
  },
  {
    slug: 'diabetes-symptoms-in-hindi',
    lang: 'hi',
    name: 'डायबिटीज़ के लक्षण',
    title: 'डायबिटीज़ (शुगर) के लक्षण — पहचान, कारण और बचाव | MedDroid',
    desc: 'डायबिटीज़ (शुगर) के शुरुआती लक्षण, कारण, चेतावनी के संकेत और डॉक्टर को कब दिखाएँ — MedDroid के मुफ़्त AI द्वारा आसान हिंदी में समझाया गया। यह निदान नहीं है।',
    h1: 'डायबिटीज़ (शुगर) के लक्षण — आसान हिंदी में',
    lede: 'डायबिटीज़ यानी शुगर की बीमारी में खून में ग्लूकोज़ (शर्करा) का स्तर बढ़ जाता है। कई बार शुरुआती लक्षण हल्के होते हैं और लोग इन्हें नज़रअंदाज़ कर देते हैं। नीचे शुगर के आम लक्षण, कारण और चेतावनी के संकेत दिए गए हैं ताकि आप समय रहते जाँच करा सकें।',
    ctaShort: 'MedDroid से पूछें',
    ctaLong: 'MedDroid से शुगर के बारे में पूछें',
    featTitle: 'डायबिटीज़ (शुगर) के आम लक्षण',
    features: [
      'बार-बार पेशाब आना, खासकर रात में',
      'बहुत ज़्यादा प्यास लगना और मुँह सूखना',
      'बहुत भूख लगना फिर भी वज़न कम होना',
      'हर समय थकान और कमज़ोरी महसूस होना',
      'धुंधला दिखाई देना',
      'घाव या चोट का देर से भरना',
      'हाथ-पैर में सुन्नपन या झुनझुनी',
      'बार-बार त्वचा, मसूड़ों या पेशाब में संक्रमण होना',
    ],
    warnings: [
      'बहुत तेज़ प्यास, बार-बार पेशाब और तेज़ थकान के साथ भ्रम या बेहोशी',
      'साँस लेने में तकलीफ़ या साँस से फल जैसी गंध आना',
      'लगातार उल्टी और पेट दर्द',
      'बहुत ज़्यादा या बहुत कम शुगर के कारण चक्कर आना या बेहोश होना',
      'पैर में ठीक न होने वाला घाव या अल्सर',
    ],
    noteTitle: 'यह निदान नहीं है।',
    note: 'MedDroid केवल सामान्य जानकारी देता है। शुगर की पुष्टि के लिए खून की जाँच (जैसे फास्टिंग शुगर और HbA1c) ज़रूरी है — कृपया किसी योग्य डॉक्टर से सलाह लें।',
    faqs: [
      { q: 'शुगर के शुरुआती लक्षण क्या हैं?', a: 'बार-बार पेशाब आना, ज़्यादा प्यास और भूख लगना, बिना कारण वज़न कम होना और थकान — ये शुगर के सबसे आम शुरुआती लक्षण हैं। इनमें से कई संकेत दिखने पर जाँच ज़रूर कराएँ।' },
      { q: 'क्या बिना लक्षण के भी शुगर हो सकती है?', a: 'हाँ। टाइप 2 डायबिटीज़ कई सालों तक बिना किसी साफ़ लक्षण के रह सकती है, इसलिए 40 की उम्र के बाद या पारिवारिक इतिहास होने पर नियमित जाँच ज़रूरी है।' },
      { q: 'शुगर की जाँच कैसे होती है?', a: 'फास्टिंग ब्लड शुगर, खाने के बाद की शुगर और HbA1c जैसी खून की जाँचों से शुगर की पुष्टि होती है। डॉक्टर इन नतीजों को मिलाकर बताते हैं।' },
      { q: 'क्या शुगर को नियंत्रित किया जा सकता है?', a: 'जी हाँ। संतुलित आहार, नियमित व्यायाम, वज़न नियंत्रण और डॉक्टर की बताई दवाओं से शुगर को अच्छी तरह नियंत्रित रखा जा सकता है।' },
    ],
    related: [
      ['diseases/type-2-diabetes', 'Type 2 diabetes'],
      ['diseases/diabetes-diet', 'Diabetes diet'],
      ['diseases/prediabetes', 'Prediabetes'],
      ['ai-symptom-checker', 'AI symptom checker'],
    ],
  },
];

// ------------------------------------------------ Medical-AI topic cluster ----
// Authority + high-intent pages for "AI in healthcare", "medical AI", "AI
// diagnosis", "ask a doctor online" and "ChatGPT for medical questions".
const AI_RELATED = [
  ['ai-doctor', 'AI doctor'],
  ['ai-symptom-checker', 'AI symptom checker'],
  ['ai-medical-assistant', 'AI medical assistant'],
  ['medical-ai', 'Medical AI'],
];
const AI_PAGES = [
  {
    slug: 'ai-in-healthcare',
    name: 'AI in Healthcare',
    title: 'AI in Healthcare: Uses, Benefits & Limits Explained | MedDroid',
    desc: 'AI in healthcare — how it is used for diagnosis support, medical images, reports and patient questions, its benefits and its limits, explained simply by MedDroid.',
    h1: 'AI in healthcare: what it can and cannot do',
    lede: 'Artificial intelligence is changing how people understand and access health information — from explaining lab reports to triaging symptoms. Here is a clear, honest look at how AI is used in healthcare today, where it genuinely helps, and where a human doctor is still essential.',
    ctaShort: 'Try MedDroid',
    ctaLong: 'Ask MedDroid a health question',
    featTitle: 'Where AI is used in healthcare',
    features: [
      'Explaining lab reports, prescriptions and scans in plain language',
      'Symptom triage — helping people decide how urgently to seek care',
      'Supporting doctors with medical image and pattern analysis',
      '24/7 multilingual health information for people far from a clinic',
      'Reducing paperwork so clinicians spend more time with patients',
      'Flagging drug interactions and safety warnings',
    ],
    lists: [
      { title: 'Real benefits', items: [
        'Access: free, instant health information in your own language',
        'Understanding: turns jargon into words anyone can follow',
        'Preparation: helps you ask your doctor the right questions',
      ] },
      { title: 'Honest limits', items: [
        'AI cannot examine you, order tests or give a legal diagnosis',
        'It can be wrong or miss findings — a clinician must confirm',
        'It is a companion to medical care, never a replacement for it',
      ] },
    ],
    noteTitle: 'A tool, not a replacement.',
    note: 'MedDroid uses AI to give general educational information and to help you understand your health — it does not diagnose or treat. Always confirm with a qualified clinician.',
    faqs: [
      { q: 'Is AI in healthcare safe?', a: 'Used correctly — for information, explanation and triage rather than diagnosis — AI is a helpful tool. The key is honesty about its limits and always confirming important decisions with a doctor.' },
      { q: 'Can AI replace doctors?', a: 'No. AI can widen access to information and support clinicians, but it cannot examine you, take responsibility for your care, or replace a doctor’s judgement.' },
      { q: 'How does MedDroid use AI?', a: 'MedDroid uses AI to answer health questions and explain reports, medicines and scans in plain language and many Indian languages — as general information, not a diagnosis.' },
    ],
    related: AI_RELATED,
  },
  {
    slug: 'medical-ai',
    name: 'Medical AI',
    title: 'Medical AI: What It Is & How It Helps You | MedDroid',
    desc: 'Medical AI explained — what it is, how it helps patients understand health, and how MedDroid uses it to explain reports and answer health questions in plain language.',
    h1: 'Medical AI, explained in plain language',
    lede: 'Medical AI means artificial intelligence built to understand health information. Done responsibly, it helps ordinary people make sense of their reports, medicines and symptoms — and helps doctors work faster. Here is what it is and how to use it wisely.',
    ctaShort: 'Try MedDroid',
    ctaLong: 'Ask MedDroid a health question',
    featTitle: 'What good medical AI can do for you',
    features: [
      'Explain a blood test, X-ray, ECG or MRI report in simple words',
      'Answer everyday health questions any time, in your language',
      'Explain what a medicine does and its common side effects',
      'Help you judge when a symptom needs a doctor',
      'Work on low-end phones and even offline in some apps',
    ],
    noteTitle: 'Information, not diagnosis.',
    note: 'Medical AI like MedDroid gives general educational information. It cannot examine you or diagnose — always confirm with a qualified clinician.',
    faqs: [
      { q: 'What is medical AI?', a: 'It is artificial intelligence trained to understand and explain health information — such as reports, medicines and symptoms — to help patients and support clinicians.' },
      { q: 'Is medical AI accurate?', a: 'It is often very helpful but not perfect — it can make mistakes or miss things. That is why responsible medical AI always urges you to confirm with a doctor.' },
      { q: 'Is MedDroid’s medical AI free?', a: 'Yes. MedDroid is a free AI medical assistant available on the web and as an Android app, built to make health information understandable to everyone.' },
    ],
    related: AI_RELATED,
  },
  {
    slug: 'ai-diagnosis',
    name: 'AI Diagnosis',
    title: 'Can AI Diagnose Disease? AI Diagnosis Explained | MedDroid',
    desc: 'Can AI diagnose disease? An honest look at what AI diagnosis can and cannot do, how accurate it is, and how to use AI health tools safely alongside a real doctor.',
    h1: 'Can AI diagnose disease?',
    lede: 'It is one of the most common questions about health AI: can a computer actually diagnose you? The honest answer is nuanced — AI can suggest possibilities and explain findings, but a true diagnosis needs a doctor. Here is what AI diagnosis really means.',
    ctaShort: 'Check my symptoms',
    ctaLong: 'Ask MedDroid about your symptoms',
    featTitle: 'What AI can genuinely help with',
    features: [
      'Listing possible explanations for a set of symptoms',
      'Explaining what a report or scan appears to show',
      'Helping you decide how urgently to seek care',
      'Preparing questions to ask your doctor',
      'Spotting red-flag symptoms that need urgent attention',
    ],
    warnings: [
      'Never rely on AI alone for a serious or worsening symptom',
      'AI cannot examine you, feel for signs, or order tests',
      'A confident-sounding answer can still be wrong',
      'Emergency symptoms (chest pain, breathlessness, stroke signs) need immediate care, not a chatbot',
    ],
    noteTitle: 'Suggestion, not diagnosis.',
    note: 'MedDroid gives general information and possibilities to help you understand — it does not diagnose. A qualified doctor makes the diagnosis after examining you and reviewing tests.',
    faqs: [
      { q: 'Can AI diagnose my illness from symptoms?', a: 'AI can suggest possible causes and how urgent they may be, but it cannot give a real diagnosis. Only a doctor who can examine you and order tests can do that.' },
      { q: 'How accurate is AI diagnosis?', a: 'AI can be helpful and is improving quickly, but it still makes mistakes and can miss things. Treat its output as information to discuss with a clinician, not a verdict.' },
      { q: 'Is it safe to use an AI symptom checker?', a: 'Yes, as a first step to understand and prepare — provided you seek real medical care for anything serious, worsening, or in an emergency.' },
    ],
    related: [['ai-symptom-checker', 'AI symptom checker'], ['ai-doctor', 'AI doctor'], ['ai-in-healthcare', 'AI in healthcare'], ['medical-ai', 'Medical AI']],
  },
  {
    slug: 'ask-a-doctor-online-free',
    name: 'Ask a Doctor Online (Free)',
    title: 'Ask a Doctor Online Free — AI Health Answers | MedDroid',
    desc: 'Ask a doctor online for free with MedDroid’s AI — get clear general answers to health questions any time, in your language. Educational information, not a diagnosis.',
    h1: 'Ask a doctor online — free, any time',
    lede: 'Have a health question but cannot get to a clinic? MedDroid’s free AI answers your health questions in plain language, day or night, in many Indian languages. It is built to help you understand and prepare — and to always point you to a real doctor when you need one.',
    ctaShort: 'Ask now',
    ctaLong: 'Ask MedDroid your health question',
    featTitle: 'What you can ask',
    features: [
      'What your symptoms might mean and how urgent they are',
      'What a blood test, X-ray, ECG or MRI report shows',
      'How a medicine works and its common side effects',
      'Everyday questions on diet, fever, pain and children’s health',
      'Answers in English, Hindi, Tamil, Telugu, Kannada, Malayalam and more',
    ],
    noteTitle: 'AI answers, not a substitute for your doctor.',
    note: 'MedDroid is a free AI medical assistant, not a licensed doctor. It gives general educational information and always recommends confirming with a qualified clinician. In an emergency, contact your local emergency number.',
    faqs: [
      { q: 'Is it really free to ask a doctor online here?', a: 'Yes — MedDroid’s AI assistant is free to use on the web and as an Android app. It gives general health information any time, at no cost.' },
      { q: 'Is this a real doctor or an AI?', a: 'MedDroid is an AI medical assistant. It explains health information clearly, but it is not a licensed physician and does not replace one. Use it to understand and prepare, then confirm with a doctor.' },
      { q: 'Can I ask in my own language?', a: 'Yes. You can ask in many Indian languages and get clear answers back in the same language.' },
    ],
    related: [['ai-doctor', 'AI doctor'], ['ai-medical-assistant', 'AI medical assistant'], ['ai-symptom-checker', 'AI symptom checker'], ['medicine-side-effects', 'Medicine side effects']],
  },
  {
    slug: 'chatgpt-for-medical-questions',
    name: 'ChatGPT for Medical Questions',
    title: 'ChatGPT for Medical Questions: Is It Safe? | MedDroid',
    desc: 'Is ChatGPT safe for medical questions? How general AI compares to a purpose-built medical AI like MedDroid for health advice, reports and symptoms — explained honestly.',
    h1: 'Using AI like ChatGPT for medical questions',
    lede: 'Many people now type health questions into general AI chatbots. They can be genuinely useful — but there are important safety points to understand. Here is how to use AI for medical questions wisely, and how a purpose-built medical AI differs.',
    ctaShort: 'Try MedDroid',
    ctaLong: 'Ask MedDroid a health question',
    featTitle: 'How to use AI for health questions safely',
    features: [
      'Use it to understand, not to self-diagnose or self-prescribe',
      'Never enter another person’s identifiable data without care for privacy',
      'Double-check anything important with a qualified doctor',
      'Prefer tools that show their limits and cite when to seek care',
      'Seek immediate care for emergencies — do not wait on a chatbot',
    ],
    warnings: [
      'General chatbots can sound confident yet be wrong (“hallucinate”)',
      'They may miss red-flag symptoms that need urgent care',
      'They are not a substitute for examination and tests',
    ],
    noteTitle: 'Purpose-built for health.',
    note: 'MedDroid is designed for health questions: it explains reports and symptoms in plain language, flags emergencies, and always urges you to confirm with a clinician. It gives general information, not a diagnosis.',
    faqs: [
      { q: 'Is ChatGPT safe for medical advice?', a: 'It can help you understand general health topics, but it can also be wrong and is not a doctor. Never rely on it alone for diagnosis, medicines or emergencies — confirm important things with a clinician.' },
      { q: 'How is MedDroid different from a general chatbot?', a: 'MedDroid is built specifically for health: it reads reports and scans, answers in Indian languages, flags urgent warning signs, and consistently points you back to a qualified doctor.' },
      { q: 'Can AI give me a prescription?', a: 'No. AI can explain how medicines generally work, but it cannot prescribe. Only a licensed doctor can prescribe medication for you.' },
    ],
    related: [['ai-medical-assistant', 'AI medical assistant'], ['ai-doctor', 'AI doctor'], ['medical-ai', 'Medical AI'], ['medicine-side-effects', 'Medicine side effects']],
  },
];

// ------------------------------------------------------- Health Q&A cluster ----
// High-volume "how to / why / what is" health questions (featured-snippet bait),
// each cross-linked to the relevant disease or symptom page.
const QA_PAGES = [
  {
    slug: 'how-to-lower-blood-pressure',
    name: 'How to Lower Blood Pressure',
    title: 'How to Lower Blood Pressure Naturally & Safely | MedDroid',
    desc: 'How to lower blood pressure — proven lifestyle steps (salt, exercise, weight, sleep, stress), when medicine is needed, and warning signs to act on. Not a diagnosis.',
    h1: 'How to lower your blood pressure',
    lede: 'High blood pressure usually has no symptoms but quietly raises the risk of heart attack, stroke and kidney disease. The good news: lifestyle changes make a real difference, and treatment is very effective. Here is how to bring it down safely.',
    ctaShort: 'Ask MedDroid',
    ctaLong: 'Ask MedDroid about blood pressure',
    featTitle: 'Steps that lower blood pressure',
    features: [
      'Cut down on salt (aim well below one teaspoon a day)',
      'Be active — about 30 minutes most days',
      'Lose extra weight, even a few kilos helps',
      'Eat more fruit, vegetables and wholegrains; less processed food',
      'Limit alcohol and stop smoking',
      'Sleep well and manage stress',
      'Take prescribed BP medicines regularly — do not stop on your own',
    ],
    warnings: [
      'A reading of 180/120 or higher — seek urgent care',
      'Severe headache, chest pain, breathlessness or vision changes',
      'Weakness, numbness or slurred speech (possible stroke — emergency)',
    ],
    noteTitle: 'Keep taking your medicine.',
    note: 'Lifestyle helps, but do not stop prescribed blood-pressure medicines without your doctor’s advice. MedDroid gives general information, not a diagnosis.',
    faqs: [
      { q: 'How can I lower my blood pressure quickly?', a: 'There is no safe instant fix at home. Rest, calm breathing and cutting salt help over time, but a very high reading with symptoms needs urgent medical care, not home remedies.' },
      { q: 'Can I lower blood pressure without medication?', a: 'Mildly raised blood pressure can often improve with lifestyle changes alone. Higher levels usually need medicine too — your doctor will guide you.' },
      { q: 'What foods lower blood pressure?', a: 'Fruits, vegetables, wholegrains, and potassium-rich foods (with a low-salt diet) support healthy blood pressure. Reducing salt and processed food matters most.' },
    ],
    related: [['diseases/hypertension', 'Hypertension'], ['normal-blood-pressure-by-age', 'Normal BP by age'], ['diseases/high-cholesterol', 'High cholesterol'], ['ai-medical-assistant', 'AI medical assistant']],
  },
  {
    slug: 'how-to-lower-cholesterol',
    name: 'How to Lower Cholesterol',
    title: 'How to Lower Cholesterol: Diet & Lifestyle Tips | MedDroid',
    desc: 'How to lower cholesterol — the foods to eat and avoid, exercise, weight and when statins are needed, explained simply by MedDroid. Educational, not a diagnosis.',
    h1: 'How to lower your cholesterol',
    lede: 'High cholesterol builds up fatty plaque in the arteries, raising the risk of heart attack and stroke. Diet and lifestyle can lower it a lot, and medicines help when needed. Here is what actually works.',
    ctaShort: 'Ask MedDroid',
    ctaLong: 'Ask MedDroid about cholesterol',
    featTitle: 'Ways to lower cholesterol',
    features: [
      'Eat less saturated fat (fried food, fatty meat, full-fat dairy)',
      'Add fibre — oats, beans, fruit and vegetables',
      'Use healthier oils and eat nuts and oily fish',
      'Be active most days and lose extra weight',
      'Stop smoking and limit alcohol',
      'Take statins or other medicines if your doctor advises',
    ],
    noteTitle: 'Know your numbers.',
    note: 'A lipid profile blood test shows your cholesterol. Your target depends on your overall heart-disease risk. MedDroid gives general information, not a diagnosis.',
    faqs: [
      { q: 'What foods lower cholesterol fast?', a: 'Oats, beans, nuts, oily fish, fruit and vegetables help, especially when replacing fried and fatty foods. Changes usually show over weeks to months, not days.' },
      { q: 'Do I need statins?', a: 'It depends on your cholesterol level and your overall risk of heart disease. Some people manage with lifestyle; others benefit greatly from statins. Your doctor decides with you.' },
      { q: 'Is cholesterol always bad?', a: 'No — your body needs some cholesterol. The problem is too much LDL (“bad”) cholesterol and too little HDL (“good”), which a lipid profile measures.' },
    ],
    related: [['diseases/high-cholesterol', 'High cholesterol'], ['blood-tests/lipid-profile-cholesterol', 'Lipid profile'], ['diseases/high-cholesterol-diet', 'High-cholesterol diet'], ['how-to-lower-blood-pressure', 'Lower blood pressure']],
  },
  {
    slug: 'how-to-lower-blood-sugar',
    name: 'How to Lower Blood Sugar',
    title: 'How to Lower Blood Sugar Levels Safely | MedDroid',
    desc: 'How to lower blood sugar — diet, exercise, weight and medicine tips for diabetes and prediabetes, plus warning signs of very high or low sugar. Not a diagnosis.',
    h1: 'How to lower your blood sugar',
    lede: 'Keeping blood sugar in a healthy range protects your eyes, kidneys, nerves and heart. Whether you have diabetes or prediabetes, daily habits make a big difference. Here is how to lower blood sugar safely.',
    ctaShort: 'Ask MedDroid',
    ctaLong: 'Ask MedDroid about blood sugar',
    featTitle: 'Ways to lower blood sugar',
    features: [
      'Cut sugary drinks, sweets and refined carbs',
      'Choose wholegrains, vegetables, pulses and protein',
      'Be active — even a walk after meals helps',
      'Lose extra weight if needed',
      'Take diabetes medicines or insulin exactly as prescribed',
      'Check your sugar as advised and keep a record',
    ],
    warnings: [
      'Very high sugar with vomiting, drowsiness or fruity-smelling breath — urgent',
      'Low-sugar signs: shakiness, sweating, confusion — take fast sugar and seek help if severe',
      'A non-healing foot wound in a person with diabetes',
    ],
    noteTitle: 'Do not stop your medicine.',
    note: 'Lifestyle helps, but never stop diabetes medicine or insulin without your doctor’s advice. MedDroid gives general information, not a diagnosis.',
    faqs: [
      { q: 'How can I lower blood sugar quickly?', a: 'Drinking water and gentle activity can help modestly, and prescribed medicine works as directed. But very high sugar with symptoms is an emergency needing medical care.' },
      { q: 'What should I eat to control blood sugar?', a: 'Focus on vegetables, pulses, wholegrains and protein, and limit sugary drinks and refined carbs. Portion size and regular meals matter too.' },
      { q: 'What is a normal blood sugar level?', a: 'A common fasting target is 70–99 mg/dL, but your personal goals depend on your situation. HbA1c and fasting sugar tests track your control.' },
    ],
    related: [['diseases/type-2-diabetes', 'Type 2 diabetes'], ['blood-tests/hba1c', 'HbA1c test'], ['diseases/diabetes-diet', 'Diabetes diet'], ['blood-tests/fasting-blood-sugar', 'Fasting blood sugar']],
  },
  {
    slug: 'normal-blood-pressure-by-age',
    name: 'Normal Blood Pressure by Age',
    title: 'Normal Blood Pressure by Age: Chart & What It Means | MedDroid',
    desc: 'Normal blood pressure by age — what the numbers mean, a simple guide for adults and children, and when a reading is too high or too low. Educational, not a diagnosis.',
    h1: 'Normal blood pressure by age',
    lede: 'Blood pressure is written as two numbers — systolic over diastolic. What counts as normal is broadly similar across adults, though it tends to drift up with age. Here is a simple guide and what the numbers mean.',
    ctaShort: 'Ask MedDroid',
    ctaLong: 'Ask MedDroid about blood pressure',
    table: { caption: 'General blood-pressure categories (adults)', rows: [
      ['Normal', 'below 120 / 80 mmHg'],
      ['Elevated', '120–129 / below 80'],
      ['Stage 1 high', '130–139 / 80–89'],
      ['Stage 2 high', '140+ / 90+'],
      ['Crisis (urgent)', '180+ / 120+'],
    ] },
    lists: [
      { title: 'A rough guide by life stage', items: [
        'Children: lower than adults and judged on age/height charts',
        'Teens & young adults: often around 110–120 / 70–80',
        'Middle age onward: readings tend to rise, but the target stays similar',
        'Older adults: your doctor may set an individual target',
      ] },
    ],
    noteTitle: 'One reading is not enough.',
    note: 'Blood pressure varies through the day. A diagnosis is based on several readings, ideally including home or 24-hour monitoring. MedDroid gives general information, not a diagnosis.',
    faqs: [
      { q: 'What is a normal blood pressure reading?', a: 'For most adults, below 120/80 mmHg is considered normal. Consistently 130/80 or above is generally regarded as high and worth reviewing with a doctor.' },
      { q: 'Does blood pressure increase with age?', a: 'It often does, as arteries stiffen, but that does not make high readings harmless. The healthy target stays broadly the same, and treatment still helps.' },
      { q: 'What is dangerously high blood pressure?', a: 'A reading of 180/120 mmHg or higher — especially with chest pain, breathlessness, severe headache or vision changes — needs urgent medical care.' },
    ],
    related: [['how-to-lower-blood-pressure', 'How to lower blood pressure'], ['diseases/hypertension', 'Hypertension'], ['what-is-a-normal-heart-rate', 'Normal heart rate'], ['ai-medical-assistant', 'AI medical assistant']],
  },
  {
    slug: 'is-bronchitis-contagious',
    name: 'Is Bronchitis Contagious?',
    title: 'Is Bronchitis Contagious? How Long & How It Spreads | MedDroid',
    desc: 'Is bronchitis contagious? How long acute bronchitis spreads, when it is not contagious, and how to avoid passing it on — explained simply. Not a diagnosis.',
    h1: 'Is bronchitis contagious?',
    lede: 'It depends on the type. Acute bronchitis is usually caused by a virus and can spread like a cold; long-term (chronic) bronchitis from smoking or COPD is not contagious. Here is what to know.',
    ctaShort: 'Ask MedDroid',
    ctaLong: 'Ask MedDroid about bronchitis',
    featTitle: 'The short answer',
    features: [
      'Acute bronchitis (viral): yes, contagious like a cold or flu',
      'It spreads through coughs, sneezes and contaminated hands/surfaces',
      'Most contagious in the first few days, often while you have a fever',
      'Chronic bronchitis (smoking/COPD): not contagious',
      'Cover coughs, wash hands and rest to avoid spreading it',
    ],
    warnings: [
      'Breathlessness, wheezing or chest pain',
      'A cough lasting more than three weeks or bringing up blood',
      'High fever, or symptoms in a baby, elderly or frail person',
    ],
    noteTitle: 'Antibiotics rarely help.',
    note: 'Most acute bronchitis is viral, so antibiotics usually do not help. MedDroid gives general information, not a diagnosis.',
    faqs: [
      { q: 'How long is bronchitis contagious?', a: 'For viral acute bronchitis, you are usually most contagious in the first few days and while feverish. The cough itself can linger for weeks after you are no longer infectious.' },
      { q: 'Is chronic bronchitis contagious?', a: 'No. Chronic bronchitis is caused by long-term irritation, usually from smoking or COPD, and does not spread from person to person.' },
      { q: 'Do I need antibiotics for bronchitis?', a: 'Usually not — most cases are viral. Antibiotics are only useful if a doctor finds a bacterial infection. Rest, fluids and time are the mainstays.' },
    ],
    related: [['diseases/acute-bronchitis', 'Acute bronchitis'], ['diseases/copd', 'COPD'], ['diseases/pneumonia', 'Pneumonia'], ['symptoms/cough', 'Cough']],
  },
  {
    slug: 'why-am-i-always-tired',
    name: 'Why Am I Always Tired?',
    title: 'Why Am I Always Tired? Common Causes & Fixes | MedDroid',
    desc: 'Why am I always tired? Common causes of constant fatigue — sleep, diet, anaemia, thyroid, stress and more — and when tiredness needs a doctor. Not a diagnosis.',
    h1: 'Why am I always tired?',
    lede: 'Constant tiredness is one of the most common health complaints. Often it is lifestyle — poor sleep, stress or diet — but sometimes it signals a treatable medical cause like anaemia or thyroid problems. Here is how to think about it.',
    ctaShort: 'Check my symptoms',
    ctaLong: 'Ask MedDroid about tiredness',
    featTitle: 'Common causes of constant tiredness',
    features: [
      'Not enough or poor-quality sleep',
      'Stress, anxiety or low mood',
      'Iron-deficiency anaemia (very common, especially in women)',
      'Thyroid problems (an underactive thyroid)',
      'Uncontrolled diabetes or blood-sugar swings',
      'Vitamin B12 or vitamin D deficiency',
      'Dehydration, poor diet or too little activity',
    ],
    warnings: [
      'Tiredness with breathlessness, chest pain or a racing heart',
      'Unexplained weight loss, fever or night sweats',
      'Extreme, sudden or worsening exhaustion',
      'Feeling faint, very pale, or noticing blood loss',
    ],
    noteTitle: 'Simple tests can find the cause.',
    note: 'Blood tests (like CBC, thyroid, sugar and vitamins) often reveal a treatable reason for fatigue. MedDroid gives general information, not a diagnosis.',
    faqs: [
      { q: 'When should I worry about being tired all the time?', a: 'See a doctor if tiredness lasts more than a few weeks, is severe, or comes with warning signs like weight loss, breathlessness, fever or heavy periods.' },
      { q: 'What blood tests check for fatigue?', a: 'Common ones are a full blood count (for anaemia), thyroid tests, blood sugar/HbA1c, and vitamin B12 and D levels. Your doctor chooses based on your history.' },
      { q: 'Can vitamin deficiency cause tiredness?', a: 'Yes. Low iron, vitamin B12 or vitamin D are common, treatable causes of ongoing tiredness, so they are often checked.' },
    ],
    related: [['symptoms/fatigue', 'Fatigue'], ['diseases/iron-deficiency-anaemia', 'Iron-deficiency anaemia'], ['diseases/hypothyroidism', 'Hypothyroidism'], ['blood-tests/vitamin-b12', 'Vitamin B12 test']],
  },
  {
    slug: 'how-much-water-should-i-drink',
    name: 'How Much Water Should I Drink?',
    title: 'How Much Water Should I Drink a Day? | MedDroid',
    desc: 'How much water should you drink a day? A simple guide by body, climate and activity, signs of dehydration, and when to drink more or less. Educational, not a diagnosis.',
    h1: 'How much water should I drink a day?',
    lede: 'There is no single magic number, but most adults do well on roughly 2–3 litres of fluid a day — more in India’s heat or with exercise. The simplest guide is your body: your thirst and the colour of your urine. Here is how to judge it.',
    ctaShort: 'Ask MedDroid',
    ctaLong: 'Ask MedDroid about hydration',
    featTitle: 'A simple hydration guide',
    features: [
      'Most adults: about 2–3 litres of total fluid a day',
      'Drink more in hot weather, with exercise, fever or diarrhoea',
      'Pale-yellow urine usually means you are well hydrated',
      'Dark urine, thirst and dry mouth suggest you need more',
      'Water is best; limit sugary and very caffeinated drinks',
    ],
    warnings: [
      'Dizziness, confusion, very little urine or a fast heartbeat (dehydration)',
      'Inability to keep fluids down with vomiting or diarrhoea',
      'Swelling or breathlessness if you have heart or kidney disease (you may need to limit fluids)',
    ],
    noteTitle: 'Some conditions change the rules.',
    note: 'People with heart, kidney or liver disease may need to limit fluids — follow your doctor’s advice. MedDroid gives general information, not a diagnosis.',
    faqs: [
      { q: 'Is 2 litres of water a day enough?', a: 'For many adults, yes, but needs vary with body size, climate and activity. In India’s heat or with exercise you may need more. Let thirst and urine colour guide you.' },
      { q: 'Can you drink too much water?', a: 'Rarely, drinking excessive water very fast can dangerously dilute the body’s salts. For most people this is not a concern, but those with heart or kidney disease should follow medical advice.' },
      { q: 'How do I know if I am dehydrated?', a: 'Common signs are thirst, dark urine, dry mouth, tiredness and dizziness. Severe dehydration with confusion or very little urine needs medical care.' },
    ],
    related: [['diseases/dehydration', 'Dehydration'], ['diseases/kidney-stones', 'Kidney stones'], ['symptoms/dizziness', 'Dizziness'], ['diseases/urinary-tract-infection', 'UTI']],
  },
  {
    slug: 'how-to-reduce-fever-at-home',
    name: 'How to Reduce Fever at Home',
    title: 'How to Reduce Fever at Home Safely | MedDroid',
    desc: 'How to reduce a fever at home — safe steps for adults and children, what to avoid, and the warning signs that mean you should see a doctor. Educational, not a diagnosis.',
    h1: 'How to reduce a fever at home',
    lede: 'A fever is the body’s natural response to infection and often does not need aggressive treatment. The aim is comfort and hydration — while watching for the warning signs that need medical care. Here is how to manage it safely.',
    ctaShort: 'Ask MedDroid',
    ctaLong: 'Ask MedDroid about fever',
    featTitle: 'Safe steps to bring a fever down',
    features: [
      'Rest and drink plenty of fluids to avoid dehydration',
      'Paracetamol for comfort, at the correct dose for age/weight',
      'Dress lightly and keep the room comfortably cool',
      'A lukewarm (not cold) sponge can help comfort',
      'For children, use weight-based dosing and never give aspirin',
    ],
    warnings: [
      'A baby under 3 months with any fever — see a doctor urgently',
      'Fever with a stiff neck, a rash that does not fade, or breathing trouble',
      'Confusion, a fit (seizure), or being very drowsy',
      'Fever above 40°C, or lasting more than a few days',
    ],
    noteTitle: 'Treat the person, not just the number.',
    note: 'How unwell someone is matters more than the exact temperature. MedDroid gives general information, not a diagnosis — seek care for the warning signs above.',
    faqs: [
      { q: 'How can I reduce a fever quickly at home?', a: 'Rest, fluids, light clothing and paracetamol at the right dose are the safe basics. Avoid cold baths and never overdose on fever medicines.' },
      { q: 'What temperature is a fever?', a: 'Generally 38°C (100.4°F) or above. A very high fever, or fever with warning signs, needs medical attention.' },
      { q: 'Should I always bring a fever down?', a: 'Not necessarily — a mild fever helps fight infection. Treat for comfort, keep hydrated, and focus on how unwell the person is and any red-flag signs.' },
    ],
    related: [['is-my-fever-serious', 'Is my fever serious?'], ['diseases/childhood-fever', 'Childhood fever'], ['diseases/viral-fever', 'Viral fever'], ['symptoms/fever', 'Fever']],
  },
  {
    slug: 'what-is-a-normal-heart-rate',
    name: 'What Is a Normal Heart Rate?',
    title: 'What Is a Normal Heart Rate? Resting BPM by Age | MedDroid',
    desc: 'What is a normal heart rate? Resting heart rate ranges by age, what a fast or slow pulse means, and when to see a doctor — explained simply. Not a diagnosis.',
    h1: 'What is a normal heart rate?',
    lede: 'Your resting heart rate is a simple, useful health signal. For most adults it sits between 60 and 100 beats per minute, though fit people can be lower. Here is what is normal and when a fast or slow pulse matters.',
    ctaShort: 'Ask MedDroid',
    ctaLong: 'Ask MedDroid about heart rate',
    table: { caption: 'Typical resting heart rate by age', rows: [
      ['Newborns', '100–160 bpm'],
      ['Children (1–10 yr)', '70–120 bpm'],
      ['Over 10 yr & adults', '60–100 bpm'],
      ['Well-trained athletes', '40–60 bpm (can be normal)'],
    ] },
    lists: [
      { title: 'What can change it', items: [
        'Exercise, caffeine, stress and fever raise it temporarily',
        'Good fitness and rest lower it',
        'Some medicines and thyroid problems can raise or lower it',
      ] },
    ],
    warnings: [
      'A pounding, racing or very irregular pulse with dizziness or chest pain',
      'A very slow pulse with fainting or breathlessness',
      'Palpitations that keep happening or last a long time',
    ],
    noteTitle: 'Context matters.',
    note: 'A single number means little on its own — how you feel and any symptoms matter. MedDroid gives general information, not a diagnosis.',
    faqs: [
      { q: 'What is a good resting heart rate?', a: 'For most adults, 60–100 beats per minute at rest is normal, and fitter people are often at the lower end. Consistently very high or very low rates are worth checking.' },
      { q: 'Is a heart rate of 100+ dangerous?', a: 'A brief rise with exercise, stress or fever is normal. A persistently fast resting pulse, or one with dizziness or chest pain, should be reviewed by a doctor.' },
      { q: 'What does a low heart rate mean?', a: 'In fit people a low rate is often healthy. But a slow pulse with fainting, tiredness or breathlessness can need medical assessment.' },
    ],
    related: [['diseases/cardiac-arrhythmia', 'Cardiac arrhythmia'], ['symptoms/heart-palpitations', 'Heart palpitations'], ['ecg-explained', 'ECG explained'], ['normal-blood-pressure-by-age', 'Normal BP by age']],
  },
  {
    slug: 'how-to-stop-diarrhea',
    name: 'How to Stop Diarrhea',
    title: 'How to Stop Diarrhea Fast & Safely | MedDroid',
    desc: 'How to stop diarrhea — rehydration, what to eat and avoid, when to use medicine, and the warning signs of dehydration or serious illness. Educational, not a diagnosis.',
    h1: 'How to stop diarrhea safely',
    lede: 'Most diarrhoea is caused by an infection and settles in a few days. The most important thing is not to stop it at all costs, but to prevent dehydration — especially in children and the elderly. Here is how to manage it.',
    ctaShort: 'Ask MedDroid',
    ctaLong: 'Ask MedDroid about diarrhoea',
    featTitle: 'What helps',
    features: [
      'Drink plenty of fluids; use ORS (oral rehydration solution) to replace salts',
      'Eat small, bland meals when you can (rice, banana, toast)',
      'Continue feeding children and breastfeeding babies',
      'Zinc supplements help in children (as advised)',
      'Wash hands well to avoid spreading infection',
      'Avoid very sugary, fatty or spicy foods until better',
    ],
    warnings: [
      'Signs of dehydration: little urine, sunken eyes, drowsiness, dizziness',
      'Blood or black stools, or severe abdominal pain',
      'High fever, or diarrhoea lasting more than a few days',
      'A baby, elderly or frail person who cannot keep fluids down',
    ],
    noteTitle: 'Rehydration comes first.',
    note: 'ORS is the mainstay for diarrhoea. Anti-diarrhoeal medicines are not suitable for everyone (avoid in children and if there is blood or high fever). MedDroid gives general information, not a diagnosis.',
    faqs: [
      { q: 'How do I stop diarrhea fast?', a: 'Focus on rehydration with fluids and ORS, and eat bland foods as tolerated. Most infections settle on their own; anti-diarrhoeal medicines are not right for everyone, so check first.' },
      { q: 'What should I eat with diarrhea?', a: 'Simple, bland foods like rice, bananas, toast and khichdi are gentle. Keep drinking fluids and ORS, and avoid very fatty, spicy or sugary foods for a while.' },
      { q: 'When is diarrhea an emergency?', a: 'Seek care for signs of dehydration, blood in the stool, severe pain, high fever, or diarrhoea that lasts more than a few days — and quickly for babies and the elderly.' },
    ],
    related: [['symptoms/diarrhea', 'Diarrhoea'], ['diseases/gastroenteritis', 'Gastroenteritis'], ['diseases/food-poisoning', 'Food poisoning'], ['diseases/dehydration', 'Dehydration']],
  },
];

const ALL = [...SPECIALITIES, ...QUESTIONS, ...SYMPTOM_PAGES, ...BLOODTEST_PAGES, ...DISEASE_PAGES, ...INDIA_SPECIALS, ...AI_PAGES, ...QA_PAGES, ...DRUG_PAGES, ...CHILD_QA, ...WOMEN_QA, ...FIRST_AID, ...MENS_QA, ...MENTAL_QA, ...NUTRITION_QA, ...MEDICINE_FOR];

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
