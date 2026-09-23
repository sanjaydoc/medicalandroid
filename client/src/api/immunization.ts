// Child immunization — India National Immunization Schedule (NIS) + common IAP
// vaccines. Educational schedule only — always confirm with your paediatrician,
// as schedules vary by state, brand and clinical advice.

export interface Milestone {
  key: string;
  label: string;      // human age label
  ageDays: number;    // offset from date of birth
  vaccines: string[];
}

const WK = 7, MO = 30, YR = 365;

export const SCHEDULE: Milestone[] = [
  { key: 'birth', label: 'At birth', ageDays: 0, vaccines: ['BCG', 'OPV-0', 'Hepatitis B (birth dose)'] },
  { key: '6w', label: '6 weeks', ageDays: 6 * WK, vaccines: ['Pentavalent-1 (DPT+HepB+Hib)', 'OPV-1', 'Rotavirus-1', 'IPV-1', 'PCV-1'] },
  { key: '10w', label: '10 weeks', ageDays: 10 * WK, vaccines: ['Pentavalent-2', 'OPV-2', 'Rotavirus-2'] },
  { key: '14w', label: '14 weeks', ageDays: 14 * WK, vaccines: ['Pentavalent-3', 'OPV-3', 'Rotavirus-3', 'IPV-2', 'PCV-2'] },
  { key: '6m', label: '6 months', ageDays: 6 * MO, vaccines: ['Hepatitis B (optional)', 'OPV (optional)'] },
  { key: '9m', label: '9 months', ageDays: 9 * MO, vaccines: ['Measles-Rubella (MR)-1', 'PCV booster', 'JE-1 (endemic areas)'] },
  { key: '12m', label: '12 months', ageDays: 12 * MO, vaccines: ['Hepatitis A-1'] },
  { key: '15m', label: '15 months', ageDays: 15 * MO, vaccines: ['MMR', 'Varicella-1', 'PCV booster'] },
  { key: '18m', label: '16–18 months', ageDays: 18 * MO, vaccines: ['DPT booster-1', 'OPV booster', 'IPV booster', 'Hib booster', 'MR-2'] },
  { key: '2y', label: '2 years', ageDays: 2 * YR, vaccines: ['Typhoid', 'Hepatitis A-2'] },
  { key: '5y', label: '4–6 years', ageDays: 5 * YR, vaccines: ['DPT booster-2', 'OPV', 'MMR-2', 'Varicella-2'] },
  { key: '10y', label: '10–12 years', ageDays: 10 * YR, vaccines: ['Tdap / Td', 'HPV (girls, 2 doses)'] },
];

export interface ChildData {
  name: string;
  dob: string;                     // ISO date (yyyy-mm-dd)
  done: Record<string, boolean>;   // milestone key -> completed
}

export type DoseStatus = 'done' | 'overdue' | 'due' | 'upcoming';

export interface MilestoneView extends Milestone {
  dueDate: number;                 // epoch ms
  status: DoseStatus;
}

const DAY = 86400000;

export function ageLabel(dobIso: string): string {
  const dob = new Date(dobIso).getTime();
  if (isNaN(dob)) return '';
  const days = Math.floor((Date.now() - dob) / DAY);
  if (days < 0) return 'not born yet';
  if (days < 60) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months} months`;
  return `${Math.floor(days / 365)} years`;
}

export function scheduleFor(child: ChildData): MilestoneView[] {
  const dob = new Date(child.dob).getTime();
  const now = Date.now();
  return SCHEDULE.map((m) => {
    const dueDate = dob + m.ageDays * DAY;
    let status: DoseStatus;
    if (child.done[m.key]) status = 'done';
    else if (now > dueDate + 3 * DAY) status = 'overdue';        // grace of a few days
    else if (now >= dueDate - 14 * DAY) status = 'due';          // within 2 weeks
    else status = 'upcoming';
    return { ...m, dueDate, status };
  });
}

/** The next actionable milestone (overdue first, then soonest due/upcoming). */
export function nextDue(child: ChildData): MilestoneView | null {
  const views = scheduleFor(child).filter((v) => v.status !== 'done');
  if (!views.length) return null;
  const overdue = views.filter((v) => v.status === 'overdue').sort((a, b) => a.dueDate - b.dueDate);
  if (overdue.length) return overdue[0];
  return views.sort((a, b) => a.dueDate - b.dueDate)[0];
}

export function progress(child: ChildData): { done: number; total: number } {
  const total = SCHEDULE.length;
  const done = SCHEDULE.filter((m) => child.done[m.key]).length;
  return { done, total };
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
