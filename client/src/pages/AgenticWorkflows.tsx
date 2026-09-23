import { Link } from 'react-router-dom';
import { BRAND } from '../brand';

const LIVE = [
  {
    title: 'Find a clinic or hospital',
    tag: 'Live',
    loop: ['Symptoms', 'Right specialty', 'Nearby clinics', 'Directions / Call'],
    body: 'Share your area and MedDroid finds real nearby hospitals & clinics with distance, phone and directions — then links you to photos, reviews & doctors.',
    to: '/assistant',
    cta: 'Try it in the assistant',
  },
  {
    title: 'Chronic-Condition Coach',
    tag: 'Live',
    loop: ['Log BP / sugar', 'Classify', 'Track trend', 'Escalate', 'Weekly summary'],
    body: 'Just type “bp 130/85” or “sugar 140 fasting”. MedDroid logs it, tells you if it’s in range, tracks your trend, and flags when to see a doctor — with charts on your account.',
    to: '/account',
    cta: 'Open your health dashboard',
  },
  {
    title: "Children's Vaccine Scheduler",
    tag: 'Live',
    loop: ['Add child', 'Full schedule', 'Due-date alerts', 'Tick doses'],
    body: 'Enter your child’s date of birth and get their complete national/IAP immunization schedule with due dates, overdue alerts and progress — synced across your devices.',
    to: '/account',
    cta: 'Open in your account',
  },
  {
    title: 'Pregnancy Companion',
    tag: 'Live',
    loop: ['Enter LMP', 'Week-by-week', 'ANC schedule', 'Danger signs'],
    body: 'Enter your last-period date and get your current week, due date, week-by-week guidance, the full antenatal visit/test schedule and danger signs — synced across your devices.',
    to: '/account',
    cta: 'Open in your account',
  },
  {
    title: 'Post-discharge Recovery Guide',
    tag: 'Live',
    loop: ['Pick procedure', 'Day-by-day plan', 'Wound care', 'Follow-ups'],
    body: 'Choose your surgery and date to get a day-by-day recovery checklist, wound care, warning signs and follow-up reminders — for C-section, appendix, gallbladder, cataract, knee, angioplasty, dental and more. Synced across devices.',
    to: '/account',
    cta: 'Open in your account',
  },
  {
    title: 'Generic Medicine & Safety Checker',
    tag: 'Live',
    loop: ['Add medicines', 'Find generic + price', 'Jan Aushadhi', 'Interaction check'],
    body: 'Type your medicines to see the same-composition generic, a branded-vs-generic price comparison and the nearest Jan Aushadhi store — plus an automatic check for dangerous interactions and duplicate ingredients. Synced across devices.',
    to: '/account',
    cta: 'Open in your account',
  },
  {
    title: 'Caregiver Mode',
    tag: 'Live',
    loop: ['Add a person', 'Switch profile', 'Their records', 'All synced'],
    body: 'Manage health records for more than one person — a parent, a child, yourself. Switch profiles and each person’s medicines, vaccines, pregnancy and recovery are kept separate and synced across your devices.',
    to: '/account',
    cta: 'Open in your account',
  },
];

const PLANNED = [
  { title: 'Medication Adherence', body: 'Build a schedule, remind you, track doses, nudge refills.' },
  { title: 'Care-Navigation flagship', body: 'Triage → right specialty → nearby clinic → visit-prep → auto follow-up.' },
  { title: 'Prescription / Report Decoder', body: 'Photo → explain each medicine/value → flag concerns → build a schedule.' },
  { title: 'Emergency / First-Aid', body: 'Detect emergencies → first-aid steps → nearest ER → one-tap 108/112.' },
];

export default function AgenticWorkflows() {
  return (
    <div className="container-x py-10">
      {/* Hero — StemCells-style icon badge + two-tone title + pill */}
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>
          </span>
          <div>
            <h1 className="font-display text-3xl font-extrabold leading-none text-ink-900 sm:text-4xl">
              Agentic <span className="text-blue-600">Workflows</span>
            </h1>
            <p className="mt-1 text-sm text-ink-700/60">Completed care actions, not just answers</p>
          </div>
          <span className="ml-auto rounded-full border border-cream-300 bg-white px-3 py-1 text-xs font-bold text-ink-700/70">Live · educational</span>
        </div>
        <p className="mt-5 max-w-2xl text-lg text-ink-700/80">
          {BRAND.name} is moving from a chatbot that <em>replies</em> to an assistant that <em>does</em> —
          finding you care, tracking your health, and knowing when to escalate.
        </p>
      </div>

      {/* Live */}
      <div className="mx-auto mt-12 max-w-4xl">
        <div className="mb-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs font-bold uppercase tracking-wide text-green-700">Live now</span>
        </div>
        <h2 className="font-display text-2xl font-extrabold text-ink-900">Working today</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {LIVE.map((w) => (
            <div key={w.title} className="card flex flex-col p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-ink-900">{w.title}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> {w.tag}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-700/75">{w.body}</p>
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {w.loop.map((s, i) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className="rounded-lg bg-cream-100 px-2 py-1 text-[11px] font-semibold text-ink-800">{s}</span>
                    {i < w.loop.length - 1 && <span className="text-ink-700/40">→</span>}
                  </span>
                ))}
              </div>
              <Link to={w.to} className="btn-primary mt-5 self-start px-5 py-2.5 text-sm">{w.cta}</Link>
            </div>
          ))}
        </div>
      </div>

      {/* Planned */}
      <div className="mx-auto mt-14 max-w-4xl">
        <div className="mb-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-xs font-bold uppercase tracking-wide text-blue-600">Coming next</span>
        </div>
        <h2 className="font-display text-2xl font-extrabold text-ink-900">On the roadmap</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANNED.map((w) => (
            <div key={w.title} className="card p-5">
              <span className="chip bg-cream-200 text-ink-700/70">Planned</span>
              <h3 className="mt-3 font-display text-base font-bold text-ink-900">{w.title}</h3>
              <p className="mt-1.5 text-sm text-ink-700/70">{w.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust */}
      <div className="mx-auto mt-14 max-w-3xl">
        <div className="card border-l-4 border-l-clay-400 p-6">
          <h3 className="font-display text-base font-bold text-ink-900">Safe by design</h3>
          <p className="mt-2 text-sm text-ink-700/75">
            Every workflow stays <strong>educational — not a diagnosis</strong>. Clinic details and drug facts come from
            <strong> verified sources, never AI guesses</strong>, and health alerts err toward “see a doctor.” {BRAND.name} supports
            your care; it doesn’t replace your clinician.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto mt-12 max-w-3xl text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/assistant" className="btn-primary px-6 py-3">Try the assistant</Link>
          <Link to="/account" className="btn-outline px-6 py-3">My health dashboard</Link>
        </div>
      </div>
    </div>
  );
}
