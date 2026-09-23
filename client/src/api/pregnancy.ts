// Pregnancy companion — gestational age, week-by-week guidance, antenatal (ANC)
// visit/test schedule and danger signs. Educational only; every pregnancy is
// different — always follow your obstetrician's advice.

export interface PregnancyData {
  lmp: string;                     // last menstrual period (ISO date)
  done: Record<string, boolean>;   // ANC task key -> completed
}

const DAY = 86400000;
const TERM_DAYS = 280;             // 40 weeks

export function gaWeeks(lmpIso: string): number {
  const lmp = new Date(lmpIso).getTime();
  if (isNaN(lmp)) return 0;
  return Math.max(0, Math.floor((Date.now() - lmp) / (7 * DAY)));
}
export function gaText(lmpIso: string): string {
  const lmp = new Date(lmpIso).getTime();
  const days = Math.floor((Date.now() - lmp) / DAY);
  const w = Math.floor(days / 7), d = days % 7;
  return `${w}w ${d}d`;
}
export function dueDate(lmpIso: string): number {
  return new Date(lmpIso).getTime() + TERM_DAYS * DAY;
}
export function daysToGo(lmpIso: string): number {
  return Math.round((dueDate(lmpIso) - Date.now()) / DAY);
}
export function trimester(week: number): 1 | 2 | 3 {
  return week < 13 ? 1 : week < 28 ? 2 : 3;
}

// Week-by-week highlights (nearest lower key week is used).
const WEEKS: { from: number; size: string; note: string }[] = [
  { from: 4, size: 'a poppy seed', note: 'The embryo is implanting. Start folic acid if not already, avoid alcohol/smoking, and confirm the pregnancy.' },
  { from: 6, size: 'a lentil', note: 'The heart begins to beat. Nausea and tiredness are common — eat small, frequent meals.' },
  { from: 8, size: 'a raspberry', note: 'Major organs are forming. Book your first antenatal visit if you haven’t.' },
  { from: 10, size: 'a strawberry', note: 'Morning sickness may peak. Stay hydrated; keep taking folic acid.' },
  { from: 12, size: 'a lime', note: 'End of first trimester soon. NT scan / first-trimester screening is done around now.' },
  { from: 16, size: 'an avocado', note: 'Energy often improves. You may feel first movements in the coming weeks.' },
  { from: 20, size: 'a banana', note: 'Halfway! The anomaly (TIFFA) scan is done around 18–20 weeks.' },
  { from: 24, size: 'an ear of corn', note: 'Glucose (OGTT) screening is usually done at 24–28 weeks. Watch for swelling & headaches.' },
  { from: 28, size: 'a brinjal (eggplant)', note: 'Third trimester begins. Start counting fetal movements daily; Tdap vaccine 27–36 weeks.' },
  { from: 32, size: 'a coconut', note: 'Growth scans continue. Rest on your side; report reduced movements immediately.' },
  { from: 36, size: 'a romaine lettuce', note: 'Baby is getting into position. Visits become weekly. Pack your hospital bag.' },
  { from: 40, size: 'a small pumpkin', note: 'Full term. Watch for labour signs — regular contractions, water breaking, or reduced movements.' },
];
export function weekInfo(week: number): { size: string; note: string } {
  let cur = WEEKS[0];
  for (const w of WEEKS) if (week >= w.from) cur = w;
  return { size: cur.size, note: cur.note };
}

// Antenatal visits & tests (recommended week).
export interface AncTask { key: string; week: number; label: string; detail: string }
export const ANC: AncTask[] = [
  { key: 'booking', week: 8, label: 'First (booking) visit', detail: 'Confirm dating, Hb, blood group & Rh, HIV/HBsAg/VDRL, blood sugar, urine; start folic acid & iron.' },
  { key: 'nt', week: 12, label: 'NT scan / 1st-trimester screening', detail: 'Done between 11–13+6 weeks.' },
  { key: 'anomaly', week: 19, label: 'Anomaly (TIFFA) scan', detail: 'Detailed scan at 18–20 weeks.' },
  { key: 'ogtt', week: 26, label: 'Glucose (OGTT) screening', detail: 'Gestational diabetes screen at 24–28 weeks.' },
  { key: 'tdap', week: 30, label: 'Tdap vaccine', detail: 'Whooping-cough protection, given 27–36 weeks.' },
  { key: 'growth32', week: 32, label: 'Growth scan', detail: 'Check baby’s growth, fluid & position.' },
  { key: 'growth36', week: 36, label: 'Growth scan + position', detail: 'Confirm head-down; plan delivery.' },
  { key: 'weekly', week: 37, label: 'Weekly check-ups', detail: 'From 37 weeks until delivery.' },
];

export type AncStatus = 'done' | 'overdue' | 'due' | 'upcoming';
export interface AncView extends AncTask { status: AncStatus }
export function ancSchedule(p: PregnancyData): AncView[] {
  const week = gaWeeks(p.lmp);
  return ANC.map((t) => {
    let status: AncStatus;
    if (p.done[t.key]) status = 'done';
    else if (week > t.week + 2) status = 'overdue';
    else if (week >= t.week - 2) status = 'due';
    else status = 'upcoming';
    return { ...t, status };
  });
}

export const DANGER_SIGNS = [
  'Vaginal bleeding',
  'Severe or persistent headache, or blurred vision',
  'Severe belly pain',
  'Reduced or no baby movements (after 28 weeks)',
  'Fluid leaking from the vagina',
  'High fever, or burning urine',
  'Severe swelling of face/hands, or sudden weight gain',
  'Severe vomiting, unable to keep fluids down',
];

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
