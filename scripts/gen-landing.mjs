// Generates MediMind SEO landing pages (static, crawlable) into client/public/,
// and rewrites client/public/sitemap.xml to list all of them + the home + the
// original four pages. Run: node scripts/gen-landing.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'client', 'public');
const DOMAIN = 'https://medicalandroid.com';

const LOGO = `<svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#4285F4"/><rect x="27.5" y="13" width="9" height="30" rx="4.5" fill="#EA4335"/><rect x="17" y="23.5" width="30" height="9" rx="4.5" fill="#EA4335"/><path d="M10 46 h11 l4 -9 5 16 4 -10 h20" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const CSS = `:root{--blue:#4285F4;--blue2:#2F6FE0;--red:#EA4335;--bg:#eef3fb;--surface:#fff;--ink:#152038;--sub:#5a6b8a;--line:#e4e9f3;--card:#f6f9fe}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0d1424;--surface:#141c2f;--ink:#e9eefb;--sub:#9aa8c4;--line:#26304a;--card:#1a2338}}
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
.disc{font-size:13px;color:var(--sub);border-top:1px solid var(--line);margin-top:36px;padding-top:16px}`;

const DISC = `MediMind is an AI medical assistant and can make mistakes. It provides general health information, not a diagnosis or medical advice — always consult a qualified clinician. In an emergency, contact your local emergency number immediately.`;

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
  const feats = p.features.map((f) => `        <li>${f}</li>`).join('\n');
  const faqs = p.faqs.map((f) =>
    `    <details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('\n');
  const related = p.related.map((r) => `    <a href="/${r[0]}/">${r[1]}</a>`).join('\n');
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
<meta property="og:site_name" content="MediMind" />
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
    <a class="brand" href="/">${LOGO} MediMind</a>
    <a class="cta" href="/#/assistant">${p.ctaShort}</a>
  </header>

  <h1>${p.h1}</h1>
  <p class="lede">${p.lede}</p>

  <div class="ctarow"><a class="cta" href="/#/assistant">${p.ctaLong} &rarr;</a></div>

  <h2>${p.featTitle}</h2>
  <ul class="feat">
${feats}
  </ul>

  <div class="card">
    <strong>${p.noteTitle}</strong> ${p.note}
  </div>

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

function spec(key, label, blurb, faqs) {
  const low = label.toLowerCase();
  return {
    slug: `ask/${key}`,
    title: `${label} — Free AI ${label} Assistant | MediMind`,
    desc: `Get ${low} answers from MediMind's free AI, in any language. ${blurb} Educational only, not a diagnosis — always consult a clinician.`,
    h1: `AI ${low} assistant`,
    lede: `Have a ${low} question? MediMind's free AI explains it in plain language, in your language, and helps you understand when to see a specialist. ${blurb}`,
    ctaShort: 'Ask a question',
    ctaLong: `Ask about ${low}`,
    featTitle: `How MediMind helps with ${low}`,
    features: [
      `Understand ${label.toLowerCase()} symptoms and when they need attention`,
      'Explain your medicines — how they work and common side effects',
      'Read and explain related reports and scans in simple words',
      'Answer in your own language, 24/7, free',
      'Clear guidance on when to see a doctor in person',
    ],
    noteTitle: 'Not a diagnosis.',
    note: `MediMind gives general educational information to help you understand your ${label.toLowerCase()} question and prepare for your doctor. It cannot examine you or prescribe — always confirm with a qualified clinician.`,
    faqs,
    related: [...R_CORE, ['ask/' + (key === 'cardiology' ? 'dermatology' : 'cardiology'), 'Other specialities']],
  };
}

const SPECIALITIES = [
  spec('cardiology', 'Cardiology', 'Chest pain, blood pressure, cholesterol, palpitations and heart-health questions.', [
    { q: 'Can MediMind read my ECG?', a: 'You can attach an ECG and MediMind will explain what it appears to show in plain words — rate, rhythm and any features to ask about. It is educational, not a final diagnosis; a doctor must confirm.' },
    { q: 'Is chest pain always a heart attack?', a: 'No — chest pain has many causes, from muscle strain to acid reflux to heart problems. But some chest pain is an emergency: if it is severe, crushing, spreads to the arm/jaw, or comes with breathlessness or sweating, call your local emergency number now.' },
    { q: 'What are normal blood pressure and cholesterol numbers?', a: 'MediMind can explain typical target ranges and what your readings mean in general terms, and when they warrant a doctor visit — but your targets depend on your health, so confirm with your clinician.' },
  ]),
  spec('dermatology', 'Dermatology', 'Skin rashes, acne, moles, hair loss and skin-care questions.', [
    { q: 'Can I upload a photo of my skin problem?', a: 'Yes — attach a clear photo and MediMind will describe what it appears to show and common possibilities in plain words. It cannot diagnose skin cancer or replace a dermatologist; anything changing, bleeding or growing should be seen in person.' },
    { q: 'How do I know if a mole is dangerous?', a: 'General warning signs include asymmetry, irregular borders, multiple colours, large diameter and change over time (the "ABCDE" rule). MediMind can explain these, but only a dermatologist can properly assess a mole.' },
    { q: 'What can I do about acne?', a: 'MediMind can explain common causes and general over-the-counter and prescription options, plus skincare basics — and when to see a dermatologist for persistent or scarring acne.' },
  ]),
  spec('paediatrics', 'Paediatrics', "Children's fever, cough, rashes, feeding and vaccination questions.", [
    { q: 'My child has a fever — what should I do?', a: 'MediMind explains general home care (fluids, rest, appropriate fever medicine by weight) and — most importantly — the red flags that need urgent care in children: difficulty breathing, a non-fading rash, drowsiness, dehydration, or fever in a very young infant. When in doubt with a child, see a doctor.' },
    { q: 'Is this dose safe for my child?', a: 'Children’s doses depend on weight and age, so MediMind gives general guidance and always tells you to confirm the exact dose with your paediatrician or pharmacist.' },
    { q: 'When should I worry about a cough in kids?', a: 'MediMind explains reassuring vs concerning features (fast/laboured breathing, wheeze, blue lips, high persistent fever) and when a child needs to be seen.' },
  ]),
  spec('orthopedics', 'Orthopedics', 'Joint pain, back pain, fractures, sprains and recovery questions.', [
    { q: 'Can MediMind explain my X-ray or MRI?', a: 'Yes — attach the image and MediMind will describe what it appears to show (e.g. a possible fracture or joint changes) in plain words, then tell you a radiologist must confirm. It is educational, not a final diagnosis.' },
    { q: 'Is my back pain serious?', a: 'Most back pain is muscular and improves with time. MediMind explains red flags that need prompt care — numbness, leg weakness, loss of bladder/bowel control, or pain after a major injury.' },
    { q: 'How long does a sprain take to heal?', a: 'MediMind explains general recovery timelines and self-care (rest, ice, compression, elevation), and when an injury should be seen in person.' },
  ]),
  spec('neurology', 'Neurology', 'Headaches, dizziness, numbness, seizures and stroke-related questions.', [
    { q: 'How do I recognise a stroke?', a: 'Remember FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency services. Stroke is an emergency — call your local emergency number immediately; do not wait for an app.' },
    { q: 'When is a headache dangerous?', a: 'MediMind explains reassuring vs concerning headaches — a sudden "worst-ever" headache, headache with fever and stiff neck, weakness or confusion need urgent care.' },
    { q: 'What causes numbness or tingling?', a: 'Many causes, from a trapped nerve to vitamin deficiency. MediMind explains common possibilities and when it needs a neurologist.' },
  ]),
  spec('gynaecology', 'Gynaecology', 'Periods, pregnancy, contraception and women’s-health questions.', [
    { q: 'Are my periods normal?', a: 'MediMind explains typical cycle ranges and what irregular bleeding can mean in general terms, plus when to see a gynaecologist.' },
    { q: 'Can MediMind answer pregnancy questions?', a: 'Yes, in general educational terms — symptoms, what is usually safe, and warning signs that need urgent care. It does not replace your obstetrician; some symptoms in pregnancy need immediate review.' },
    { q: 'What contraception options are there?', a: 'MediMind explains the common options and how they generally work, so you can have an informed conversation with your doctor about what suits you.' },
  ]),
  spec('gastroenterology', 'Gastroenterology', 'Acidity, stomach pain, liver, IBS, ulcers and digestion questions.', [
    { q: 'Why do I keep getting acidity or heartburn?', a: 'MediMind explains common causes (diet, timing, reflux) and general remedies, plus the warning signs — trouble swallowing, black stools, weight loss — that need a doctor.' },
    { q: 'When is stomach pain serious?', a: 'Most tummy pain is mild, but severe, sudden, or persistent pain, or pain with vomiting blood or a rigid abdomen, needs urgent care. MediMind helps you tell the difference.' },
    { q: 'What do my liver function test results mean?', a: 'MediMind explains markers like SGPT/SGOT (ALT/AST) and bilirubin in plain words and what raised values can suggest — always confirm with your doctor.' },
  ]),
  spec('endocrinology', 'Endocrinology (Diabetes & Thyroid)', 'Diabetes, thyroid, hormones and weight-related questions.', [
    { q: 'What do my blood sugar and HbA1c numbers mean?', a: 'MediMind explains typical target ranges and what your values suggest about diabetes control, in general terms — your personal targets should be confirmed with your doctor.' },
    { q: 'What do my thyroid (TSH, T3, T4) results show?', a: 'MediMind explains whether results point toward an under- or over-active thyroid and what that generally means, and when to see an endocrinologist.' },
    { q: 'Can MediMind explain my diabetes medicines?', a: 'Yes — how they generally work, common side effects, and general dosing, with a reminder to confirm your exact dose with your doctor or pharmacist.' },
  ]),
  spec('pulmonology', 'Pulmonology', 'Cough, asthma, breathlessness and lung-health questions.', [
    { q: 'Why won’t my cough go away?', a: 'MediMind explains common causes of a lingering cough and the red flags — coughing blood, weight loss, breathlessness — that need prompt review.' },
    { q: 'Is my breathlessness serious?', a: 'Sudden or severe breathlessness is an emergency — seek care immediately. MediMind explains the causes and what needs urgent attention.' },
    { q: 'Can MediMind read my chest X-ray?', a: 'You can attach a chest X-ray and MediMind will describe what it appears to show in plain words — educational only; a radiologist must confirm.' },
  ]),
  spec('nephrology', 'Nephrology', 'Kidney function, creatinine, dialysis and urine-test questions.', [
    { q: 'What does a high creatinine mean?', a: 'MediMind explains what creatinine and eGFR indicate about kidney function in general terms, and when it needs a nephrologist.' },
    { q: 'How can I protect my kidneys?', a: 'General guidance on blood pressure, sugar control, hydration and avoiding certain painkillers — tailored advice should come from your doctor.' },
    { q: 'What do my urine test results show?', a: 'MediMind explains findings like protein or blood in urine in plain words and what they can suggest.' },
  ]),
  spec('urology', 'Urology', 'Urinary problems, kidney stones, prostate and men’s-health questions.', [
    { q: 'What causes burning during urination?', a: 'Often a urinary infection, but there are other causes. MediMind explains the common ones and when you need to be seen and possibly tested.' },
    { q: 'How are kidney stones treated?', a: 'MediMind explains the general options from fluids and medication to procedures, and the pain/red-flag signs that need urgent care.' },
    { q: 'When should I get my prostate checked?', a: 'MediMind explains typical screening guidance and symptoms (weak stream, frequency at night) that warrant a urologist visit.' },
  ]),
  spec('oncology', 'Oncology', 'Cancer, chemotherapy, biopsy reports and screening questions.', [
    { q: 'Can MediMind explain my biopsy or pathology report?', a: 'Yes — it translates the terms into plain language and what they generally mean. It is educational, not a diagnosis; your oncologist interprets it fully.' },
    { q: 'What do tumour markers mean?', a: 'MediMind explains what common markers indicate in general terms and why they must be read alongside scans and biopsy by a specialist.' },
    { q: 'What are common chemotherapy side effects?', a: 'MediMind explains typical side effects and general ways they are managed, and which symptoms need urgent contact with your team.' },
  ]),
  spec('ent', 'ENT', 'Ear pain, hearing, sinus, throat and nose problems.', [
    { q: 'Why is my ear blocked or ringing?', a: 'MediMind explains common causes (wax, infection, fluid, tinnitus) and when hearing changes need an ENT review.' },
    { q: 'How do I treat a sinus infection?', a: 'General self-care and when antibiotics or a doctor are actually needed — MediMind explains both.' },
    { q: 'When is a sore throat serious?', a: 'MediMind explains viral vs bacterial (strep) throat, and red flags like trouble breathing or swallowing that need urgent care.' },
  ]),
  spec('ophthalmology', 'Ophthalmology', 'Eye pain, vision changes, redness and eye-care questions.', [
    { q: 'Why is my vision suddenly blurry?', a: 'MediMind explains common causes and flags sudden vision loss, eye pain or flashes/floaters as reasons to seek eye care urgently.' },
    { q: 'What causes red, itchy or watery eyes?', a: 'Often allergy or infection (conjunctivitis). MediMind explains the differences and simple care, and when to see an eye doctor.' },
    { q: 'When is an eye problem an emergency?', a: 'Sudden vision loss, severe eye pain, chemical exposure or injury need immediate care — MediMind tells you when not to wait.' },
  ]),
  spec('dentistry', 'Dentistry', 'Toothache, gums, cavities and oral-health questions.', [
    { q: 'How do I relieve a toothache?', a: 'MediMind explains general relief and what a persistent or severe toothache (or facial swelling) means — the latter needs prompt dental care.' },
    { q: 'What causes bleeding gums?', a: 'Usually gum inflammation from plaque; MediMind explains care and when it points to something needing a dentist.' },
    { q: 'When do I need urgent dental care?', a: 'Facial swelling, severe pain, a knocked-out tooth or trauma need urgent attention — MediMind flags these.' },
  ]),
  spec('psychiatry', 'Psychiatry', 'Depression, anxiety, sleep and mental-health medicine questions.', [
    { q: 'How do I know if I should seek help for my mood?', a: 'MediMind explains common signs of depression and anxiety and encourages reaching out to a professional — it does not diagnose, but it can help you decide to seek help.' },
    { q: 'Are antidepressants addictive?', a: 'MediMind explains how these medicines generally work, common misconceptions, and why they should be started and stopped with a doctor’s guidance.' },
    { q: 'What if I have thoughts of self-harm?', a: 'Please seek help immediately — contact your local emergency number or a crisis line now. You are not alone, and urgent support is available.' },
  ]),
  spec('psychology', 'Psychology & Counselling', 'Stress, relationships, coping and counselling questions.', [
    { q: 'What’s the difference between a psychologist and a psychiatrist?', a: 'MediMind explains it simply: psychologists focus on talking therapy and counselling; psychiatrists are doctors who can also prescribe medicine. Many people benefit from both.' },
    { q: 'How can I manage stress and anxiety day to day?', a: 'MediMind shares general, evidence-based coping strategies (breathing, routine, sleep, activity) and when professional counselling would help.' },
    { q: 'When should I see a counsellor or therapist?', a: 'If low mood, stress or worry is affecting your daily life, relationships or sleep, talking to a professional helps — MediMind encourages it and explains what to expect.' },
  ]),
  spec('rheumatology', 'Rheumatology', 'Joint pain, arthritis, autoimmune and inflammation questions.', [
    { q: 'Is my joint pain arthritis?', a: 'MediMind explains the common types (osteoarthritis, rheumatoid, gout) and their typical patterns, and when to see a rheumatologist for proper testing.' },
    { q: 'What do RA factor or ANA blood tests mean?', a: 'MediMind explains what these autoimmune markers can indicate in general terms and why they must be read alongside symptoms by a specialist.' },
    { q: 'How is arthritis managed?', a: 'General options from lifestyle and physiotherapy to medication — MediMind explains the principles; your doctor tailors the plan.' },
  ]),
  spec('physiotherapy', 'Physiotherapy', 'Rehab, exercises, posture and recovery-after-injury questions.', [
    { q: 'What exercises help my back or knee pain?', a: 'MediMind explains general, commonly-recommended exercises and posture tips, and when pain means you should stop and see a physiotherapist or doctor.' },
    { q: 'How long does rehab take after surgery or injury?', a: 'It varies by injury and person; MediMind explains typical timelines and the importance of a guided programme.' },
    { q: 'Is it safe to exercise through pain?', a: 'MediMind explains the difference between normal effort and warning pain, and when to rest or seek assessment.' },
  ]),
  spec('nutrition', 'Nutrition & Dietetics', 'Diet, weight, deficiencies and healthy-eating questions.', [
    { q: 'What should I eat for diabetes or weight loss?', a: 'MediMind explains general, balanced-eating principles and portion guidance, and when a dietitian should tailor a plan for you.' },
    { q: 'What do my vitamin D or B12 levels mean?', a: 'MediMind explains what low levels can cause and general ways to correct them, with a reminder to confirm supplements with your doctor.' },
    { q: 'Is my diet balanced?', a: 'Tell MediMind what you eat and it explains, in general terms, where it looks balanced and where it could improve.' },
  ]),
  spec('general-surgery', 'General Surgery', 'Surgery, pre-op, post-op recovery and wound-care questions.', [
    { q: 'What can I expect after my surgery?', a: 'MediMind explains general recovery, activity and diet guidance for common operations, and the warning signs to report.' },
    { q: 'How do I care for my surgical wound?', a: 'General wound-care principles and the signs of infection (increasing redness, pus, fever) that need prompt review.' },
    { q: 'When is post-op pain or fever a concern?', a: 'MediMind explains what’s expected vs what needs urgent contact with your surgical team.' },
  ]),
  spec('infectious-diseases', 'Infectious Diseases', 'Fever, infections, antibiotics and travel-health questions.', [
    { q: 'Do I actually need antibiotics for this?', a: 'Many infections are viral and don’t need antibiotics. MediMind explains the difference in general terms and when a doctor should decide.' },
    { q: 'How long am I contagious?', a: 'MediMind explains typical contagious periods for common infections and general precautions to avoid spreading them.' },
    { q: 'What precautions or vaccines do I need for travel?', a: 'MediMind gives general travel-health guidance; confirm specifics with a travel clinic or your doctor.' },
  ]),
  spec('allergy-immunology', 'Allergy & Immunology', 'Allergies, rashes, asthma and immune-system questions.', [
    { q: 'How do I find out what I’m allergic to?', a: 'MediMind explains how allergies are generally identified (history, tests) and common triggers, and when to see an allergist.' },
    { q: 'What helps with an allergic reaction?', a: 'General guidance on mild reactions and antihistamines — and clear warning that severe reactions need emergency care.' },
    { q: 'When is an allergic reaction an emergency?', a: 'Swelling of the lips/throat, difficulty breathing or collapse (anaphylaxis) is an emergency — use an adrenaline auto-injector if prescribed and call emergency services immediately.' },
  ]),
  spec('sexual-health', 'Sexual Health', 'STIs, contraception and confidential sexual-health questions.', [
    { q: 'What are common signs of an STI?', a: 'MediMind explains common symptoms (and that many STIs have none), and encourages testing — non-judgementally and in general terms.' },
    { q: 'How do I protect myself and get tested?', a: 'MediMind explains prevention and where testing is generally available, so you can take action confidently.' },
    { q: 'Can I ask sexual-health questions privately?', a: 'Yes — MediMind answers these questions plainly and without judgement. It is general information; for testing or treatment, see a clinician.' },
  ]),
  spec('regenerative-medicine', 'Regenerative Medicine', 'Stem-cell therapy, PRP and regenerative-treatment questions.', [
    { q: 'What is regenerative medicine?', a: 'MediMind explains the general idea (using cells, PRP or growth factors to support healing) in plain terms — and is honest that many regenerative treatments are still investigational.' },
    { q: 'Is stem-cell or PRP therapy proven for my condition?', a: 'For a few conditions there is evidence; for many it is experimental or unproven. MediMind is honest about this and urges caution and expert advice.' },
    { q: 'How do I know if a regenerative treatment is legitimate?', a: 'MediMind explains the questions to ask (evidence, regulatory approval, realistic claims) and warns about clinics that over-promise.' },
  ]),
];

function qcluster(slug, title, h1, lede, features, faqs) {
  return {
    slug, title, h1, lede,
    desc: lede.replace(/<[^>]+>/g, '').slice(0, 155),
    ctaShort: 'Ask MediMind',
    ctaLong: 'Ask MediMind',
    featTitle: 'What MediMind tells you',
    features,
    noteTitle: 'Not a final diagnosis.',
    note: 'MediMind gives general educational information to help you understand — always confirm with your doctor or the relevant specialist.',
    faqs,
    related: R_CORE,
  };
}

const QUESTIONS = [
  qcluster('ecg-explained', 'ECG Explained — Understand Your ECG with MediMind AI',
    'ECG explained — in plain language',
    'Got an ECG and no idea what the lines mean? Attach it and MediMind’s free AI walks you through the rate, rhythm and any features to ask your doctor about — in simple words.',
    ['Heart rate and whether it is fast, slow or normal', 'Rhythm — regular or irregular', 'Any features that may need a doctor’s review', 'Plain-language summary + what to ask your cardiologist'],
    [
      { q: 'Can AI read my ECG accurately?', a: 'MediMind gives a genuine, useful read in plain words, but AI can miss findings — it is educational, not a diagnosis. A doctor or cardiologist must confirm on the actual tracing.' },
      { q: 'What is a normal heart rate?', a: 'A typical resting heart rate is about 60–100 beats per minute, but it varies with fitness and situation. MediMind explains what your reading suggests in general terms.' },
      { q: 'What does an irregular rhythm mean?', a: 'It can range from harmless extra beats to conditions like atrial fibrillation that need treatment. MediMind explains the possibilities and urges a proper review.' },
    ]),
  qcluster('x-ray-explained', 'X-ray Explained — Understand Your X-ray with MediMind AI',
    'X-ray explained — in simple words',
    'MediMind’s free AI describes what your X-ray appears to show — bones, lungs or joints — and the most likely findings in plain language, then tells you a radiologist must confirm.',
    ['A plain-language description of what’s visible', 'The most likely finding(s) and possibilities', 'Never a false "all-clear" — subtle findings can be missed', 'Clear next steps and who to confirm with'],
    [
      { q: 'Can MediMind diagnose from an X-ray?', a: 'No — it gives a useful, tentative read in plain words but can miss findings. It is not a diagnosis; a radiologist must review the actual images.' },
      { q: 'What can a chest X-ray show?', a: 'It can suggest things like infection (pneumonia), fluid, lung changes such as COPD, or heart size changes. MediMind explains these in simple terms.' },
      { q: 'Should I worry if something looks abnormal?', a: 'Many findings are treatable and some are not serious — but anything flagged should be confirmed by a doctor promptly, especially with symptoms.' },
    ]),
  qcluster('mri-scan-explained', 'MRI Scan Explained — Understand Your MRI with MediMind AI',
    'MRI scan explained — in plain language',
    'MRI reports are full of jargon. Attach your scan or report and MediMind’s free AI explains what it appears to show and what the terms mean — in words you can understand.',
    ['Plain-language meaning of the findings and terms', 'What is likely reassuring vs what needs review', 'A summary you can take to your appointment', 'Answers in your own language'],
    [
      { q: 'Can AI interpret my MRI?', a: 'MediMind explains what an MRI or its report appears to show in simple words, but it is educational only — a radiologist and your treating doctor must confirm.' },
      { q: 'What do "hyperintensity" and similar terms mean?', a: 'MediMind translates common MRI terms into plain language and explains, in general, what they can indicate — without replacing the specialist read.' },
      { q: 'Is an incidental finding dangerous?', a: 'Many incidental findings are harmless, but some need follow-up. MediMind explains the general picture and urges you to confirm with your doctor.' },
    ]),
  qcluster('medicine-side-effects', 'Medicine Side Effects & Interactions — MediMind AI',
    'Medicine side effects, explained',
    'Not sure about a medicine? MediMind’s free AI explains how it generally works, its common side effects, and interactions to watch for — in plain language, in your language.',
    ['How a medicine generally works and what it treats', 'Common and serious side effects to know', 'Interactions with other medicines, food or alcohol', 'Typical general dosing (confirm your exact dose with a pharmacist)'],
    [
      { q: 'Can MediMind tell me if two medicines interact?', a: 'It explains common, well-known interactions in general terms and flags when to check with a pharmacist. For your exact medicines and doses, always confirm with your doctor or pharmacist.' },
      { q: 'Is it safe to take painkillers together?', a: 'Some combinations are fine and some are risky (and many products already contain the same drug). MediMind explains the general rules and when to be careful.' },
      { q: 'What should I do about a side effect?', a: 'MediMind explains which side effects are usually mild and which need prompt medical attention — and always says to seek care for severe reactions.' },
    ]),
  qcluster('is-my-fever-serious', 'Is My Fever Serious? — Free AI Fever Check | MediMind',
    'Is my fever serious?',
    'Describe your fever to MediMind’s free AI, in any language, and get clear guidance on likely causes, home care, and — most importantly — the warning signs that mean you should see a doctor now.',
    ['What temperature counts as a fever and when it matters', 'Simple home care that helps', 'Red-flag symptoms that need urgent care', 'When to see a doctor vs wait it out'],
    [
      { q: 'What temperature is a fever?', a: 'Generally a temperature of 38°C (100.4°F) or above. MediMind explains what your reading means and what to do.' },
      { q: 'When is a fever an emergency?', a: 'Seek urgent care for a very high fever, a stiff neck, difficulty breathing, a non-fading rash, confusion, or fever in a very young infant. When in doubt, get seen.' },
      { q: 'How long should a fever last?', a: 'Many viral fevers settle in a few days. MediMind explains when a lasting or worsening fever should be checked by a doctor.' },
    ]),
];

const ALL = [...SPECIALITIES, ...QUESTIONS];

for (const p of ALL) {
  const dir = join(PUBLIC, ...p.slug.split('/'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), page(p), 'utf8');
  console.log('wrote', p.slug);
}

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
