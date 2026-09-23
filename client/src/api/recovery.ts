// Post-discharge / post-procedure recovery guide. Curated, educational recovery
// protocols for common procedures — day-by-day tasks, wound care, warning signs
// and follow-ups. Always follow your surgeon's specific instructions.

export interface Phase { label: string; fromDay: number; tasks: string[] }
export interface FollowUp { day: number; label: string }
export interface Procedure {
  key: string;
  name: string;
  recovery: string;          // rough recovery time label
  overview: string;
  phases: Phase[];
  woundCare: string[];
  warnings: string[];
  followUp: FollowUp[];
}

export const PROCEDURES: Procedure[] = [
  {
    key: 'csection', name: 'Caesarean section (C-section)', recovery: '~6 weeks',
    overview: 'Major abdominal surgery. Rest, gentle movement and wound care are key in the first weeks.',
    phases: [
      { label: 'Days 0–3 (hospital)', fromDay: 0, tasks: ['Take pain relief as prescribed', 'Start walking gently to prevent clots', 'Keep the incision clean & dry', 'Begin breastfeeding with support'] },
      { label: 'Days 3–14 (home)', fromDay: 3, tasks: ['Short frequent walks', 'No lifting heavier than your baby', 'Watch the incision for infection', 'Eat fibre + drink water to avoid constipation'] },
      { label: 'Weeks 2–6', fromDay: 14, tasks: ['Gradually increase activity', 'No driving until pain-free & cleared (~2–3 wks)', 'Start gentle pelvic-floor exercises', 'No strenuous exercise or heavy lifting'] },
    ],
    woundCare: ['Keep the incision clean & dry', 'Change dressing as advised', 'Wear loose, comfortable clothing', 'Do not scrub or apply creams unless told'],
    warnings: ['Soaking a pad an hour / heavy bleeding', 'Fever or chills', 'Wound red, swollen, warm or leaking pus', 'Severe or worsening pain', 'Calf pain/swelling or chest pain/breathlessness', 'Foul-smelling vaginal discharge'],
    followUp: [{ day: 7, label: 'Wound check / suture removal' }, { day: 42, label: '6-week postnatal check' }],
  },
  {
    key: 'delivery', name: 'Normal (vaginal) delivery', recovery: '~2–6 weeks',
    overview: 'Focus on rest, perineal care, pelvic-floor recovery and emotional wellbeing.',
    phases: [
      { label: 'Week 1', fromDay: 0, tasks: ['Rest when the baby sleeps', 'Perineal care — clean, ice if sore', 'Drink water, eat fibre', 'Start gentle pelvic-floor exercises'] },
      { label: 'Weeks 2–6', fromDay: 7, tasks: ['Gradually resume activity', 'Continue pelvic-floor exercises', 'Watch mood — ask for help if low', 'Breastfeeding support as needed'] },
    ],
    woundCare: ['Keep the perineal area clean & dry', 'Rinse with warm water after using the toilet', 'Change pads frequently'],
    warnings: ['Heavy bleeding (soaking a pad/hour)', 'Fever', 'Foul-smelling discharge', 'Severe headache or vision changes', 'Calf pain/swelling', 'Persistent low mood or thoughts of self-harm'],
    followUp: [{ day: 42, label: '6-week postnatal check' }, { day: 42, label: 'Start baby immunizations (see Children tab)' }],
  },
  {
    key: 'appendix', name: 'Appendectomy (keyhole)', recovery: '~1–2 weeks',
    overview: 'Laparoscopic (keyhole) surgery. Most people recover within a couple of weeks.',
    phases: [
      { label: 'Days 0–2', fromDay: 0, tasks: ['Rest and walk a little each day', 'Pain relief as prescribed', 'Light, easily digestible food'] },
      { label: 'Days 3–7', fromDay: 3, tasks: ['Increase gentle activity', 'No heavy lifting or straining', 'Keep port sites clean & dry'] },
      { label: 'Weeks 1–2', fromDay: 7, tasks: ['Gradually return to normal activity', 'Avoid strenuous exercise until reviewed'] },
    ],
    woundCare: ['Keep the small port wounds clean & dry', 'Do not scrub; pat dry after bathing'],
    warnings: ['Fever or chills', 'Wound redness, swelling or pus', 'Severe or worsening tummy pain', 'Persistent vomiting', 'No bowel movement / bloating'],
    followUp: [{ day: 7, label: 'Port-site / suture check' }],
  },
  {
    key: 'gallbladder', name: 'Gallbladder removal (keyhole)', recovery: '~1–2 weeks',
    overview: 'Laparoscopic cholecystectomy. Eat lighter, low-fat meals at first.',
    phases: [
      { label: 'Days 0–2', fromDay: 0, tasks: ['Rest, short walks', 'Small low-fat meals', 'Pain relief as prescribed'] },
      { label: 'Days 3–7', fromDay: 3, tasks: ['Gradually add foods, keep fat low initially', 'No heavy lifting', 'Keep wounds clean & dry'] },
      { label: 'Weeks 1–2', fromDay: 7, tasks: ['Return to normal activity gradually', 'Reintroduce normal diet as tolerated'] },
    ],
    woundCare: ['Keep port sites clean & dry', 'Pat dry; no soaking in baths/pools until healed'],
    warnings: ['Fever', 'Yellow eyes/skin (jaundice)', 'Severe pain or vomiting', 'Wound infection signs', 'Pale stools / dark urine'],
    followUp: [{ day: 10, label: 'Surgical review' }],
  },
  {
    key: 'cataract', name: 'Cataract surgery', recovery: '~2–4 weeks',
    overview: 'Day-care eye surgery. Vision usually improves over days to weeks.',
    phases: [
      { label: 'Days 0–1', fromDay: 0, tasks: ['Wear the eye shield, especially at night', 'Do NOT rub or press the eye', 'Rest; avoid dust and bright glare'] },
      { label: 'Week 1', fromDay: 1, tasks: ['Use eye drops exactly on schedule', 'Avoid water/soap in the eye', 'No heavy lifting or bending forward', 'Wear sunglasses outdoors'] },
      { label: 'Weeks 2–4', fromDay: 14, tasks: ['Resume normal activity gradually', 'Continue drops as prescribed', 'New glasses only after review'] },
    ],
    woundCare: ['Keep the eye clean and dry', 'Wash hands before using drops', 'Do not swim until cleared'],
    warnings: ['Severe eye pain', 'Sudden loss of vision', 'Increasing redness or discharge', 'Flashes of light or many new floaters'],
    followUp: [{ day: 1, label: 'Next-day check' }, { day: 7, label: '1-week review' }, { day: 30, label: '1-month review' }],
  },
  {
    key: 'knee', name: 'Knee replacement', recovery: '~6–12 weeks',
    overview: 'Physiotherapy is essential — the exercises drive your recovery.',
    phases: [
      { label: 'Hospital (Days 0–3)', fromDay: 0, tasks: ['Walk with support as advised', 'Do the prescribed knee exercises', 'Ankle pumps to prevent clots', 'Pain relief as prescribed'] },
      { label: 'Weeks 1–6', fromDay: 3, tasks: ['Physiotherapy daily — do not skip', 'Use walker/stick until steady', 'Ice & elevate to reduce swelling', 'Keep wound clean & dry'] },
      { label: 'Weeks 6–12', fromDay: 42, tasks: ['Increase walking distance', 'Continue strengthening exercises', 'Return to light activity as cleared'] },
    ],
    woundCare: ['Keep the incision clean & dry', 'Watch for swelling — ice and elevate'],
    warnings: ['Calf pain, swelling or warmth (possible clot)', 'Chest pain or breathlessness', 'Fever', 'Wound red/leaking or opening', 'Sudden severe knee pain'],
    followUp: [{ day: 14, label: 'Wound / suture review' }, { day: 42, label: 'Surgeon + physio review' }],
  },
  {
    key: 'angioplasty', name: 'Angioplasty / stent', recovery: '~1 week (activity)',
    overview: 'Keep taking your blood-thinners exactly as prescribed — do NOT stop them.',
    phases: [
      { label: 'Days 0–1', fromDay: 0, tasks: ['Rest; keep the access site (wrist/groin) dry', 'Avoid bending/lifting that arm or leg', 'Drink fluids', 'Take all medicines as prescribed'] },
      { label: 'Week 1', fromDay: 1, tasks: ['Gradually increase walking', 'No heavy lifting or straining', 'Never stop antiplatelet medicines', 'Watch the access site'] },
      { label: 'Ongoing', fromDay: 7, tasks: ['Heart-healthy diet, quit smoking', 'Attend cardiac rehab if advised', 'Regular BP and medicine review'] },
    ],
    woundCare: ['Keep the access site clean & dry', 'Small bruise is normal; report a growing lump'],
    warnings: ['Bleeding or a growing swelling at the site', 'Chest pain or pressure', 'Breathlessness', 'Cold, pale or numb hand/leg', 'Fever'],
    followUp: [{ day: 7, label: 'Cardiology review' }],
  },
  {
    key: 'dental', name: 'Tooth extraction / oral surgery', recovery: '~1 week',
    overview: 'Protect the clot in the socket — no spitting, straws or smoking early on.',
    phases: [
      { label: 'Day 0', fromDay: 0, tasks: ['Bite gently on gauze to stop bleeding', 'No spitting, straws or smoking', 'Cold, soft foods; avoid the area', 'Ice pack on the cheek for swelling'] },
      { label: 'Days 1–3', fromDay: 1, tasks: ['Warm salt-water rinses after meals', 'Continue soft foods', 'Pain relief as prescribed', 'Gentle brushing, avoid the socket'] },
      { label: 'Days 3–7', fromDay: 3, tasks: ['Gradually return to normal foods', 'Keep the area clean'] },
    ],
    woundCare: ['Do not disturb the clot in the socket', 'Salt-water rinses, do not swish hard'],
    warnings: ['Heavy or ongoing bleeding', 'Severe pain after day 2–3 (possible dry socket)', 'Swelling with fever', 'Bad taste/pus'],
    followUp: [{ day: 7, label: 'Review / suture removal if placed' }],
  },
  {
    key: 'general', name: 'After any surgery (general)', recovery: 'varies',
    overview: 'General recovery basics. Always follow your surgeon’s specific advice.',
    phases: [
      { label: 'First days', fromDay: 0, tasks: ['Rest; take pain relief as prescribed', 'Move/walk gently to prevent clots', 'Keep the wound clean & dry', 'Eat well and stay hydrated'] },
      { label: 'First weeks', fromDay: 7, tasks: ['Gradually increase activity', 'No heavy lifting until cleared', 'Take all medicines as prescribed', 'Attend follow-up appointments'] },
    ],
    woundCare: ['Keep the wound clean & dry', 'Change dressings as advised', 'Watch for infection'],
    warnings: ['Fever or chills', 'Wound red, swollen, warm or leaking pus', 'Severe or worsening pain', 'Calf pain/swelling, chest pain or breathlessness', 'Heavy bleeding'],
    followUp: [{ day: 7, label: 'Follow-up / wound review' }],
  },
];

export interface RecoveryData {
  procedureKey: string;
  startDate: string;                 // ISO date of surgery/discharge
  done: Record<string, boolean>;     // task id -> completed
}

const DAY = 86400000;

export function getProcedure(key: string): Procedure | undefined {
  return PROCEDURES.find((p) => p.key === key);
}
export function dayNumber(startIso: string): number {
  const t = new Date(startIso).getTime();
  if (isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / DAY));
}
export function currentPhaseIndex(proc: Procedure, day: number): number {
  let idx = 0;
  proc.phases.forEach((p, i) => { if (day >= p.fromDay) idx = i; });
  return idx;
}
export function taskId(procKey: string, phaseIdx: number, taskIdx: number): string {
  return `${procKey}:${phaseIdx}:${taskIdx}`;
}
export function recoveryProgress(proc: Procedure, done: Record<string, boolean>): { done: number; total: number } {
  let total = 0, d = 0;
  proc.phases.forEach((p, pi) => p.tasks.forEach((_, ti) => { total++; if (done[taskId(proc.key, pi, ti)]) d++; }));
  return { done: d, total };
}
export function followUpStatus(startIso: string, fu: FollowUp): 'done-ish' | 'due' | 'upcoming' {
  const day = dayNumber(startIso);
  if (day > fu.day + 2) return 'done-ish';
  if (day >= fu.day - 2) return 'due';
  return 'upcoming';
}
export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
export function followUpDate(startIso: string, fu: FollowUp): number {
  return new Date(startIso).getTime() + fu.day * DAY;
}
