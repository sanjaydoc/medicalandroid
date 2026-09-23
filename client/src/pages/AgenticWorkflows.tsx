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
];

const PLANNED = [
  { title: 'Generic-medicine & price finder', body: 'Find the same-composition generic, typical price and nearest Jan Aushadhi / pharmacy — save money on every prescription.' },
  { title: 'Medicine safety checker', body: 'Flag dangerous interactions and duplicate ingredients across all your medicines.' },
  { title: 'Post-discharge recovery guide', body: 'Day-by-day recovery checklist, wound care and warning signs after a procedure.' },
  { title: 'Caregiver mode', body: 'Manage a parent’s meds, readings & appointments remotely — multiple profiles.' },
  { title: 'Medication Adherence', body: 'Build a schedule, remind you, track doses, nudge refills.' },
  { title: 'Care-Navigation flagship', body: 'Triage → right specialty → nearby clinic → visit-prep → auto follow-up.' },
  { title: 'Prescription / Report Decoder', body: 'Photo → explain each medicine/value → flag concerns → build a schedule.' },
  { title: 'Emergency / First-Aid', body: 'Detect emergencies → first-aid steps → nearest ER → one-tap 108/112.' },
];

export default function AgenticWorkflows() {
  return (
    <div className="container-x py-10">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip bg-clay-100 text-clay-700">Agentic health</span>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
          Not just answers — <span className="text-clay-600">completed care actions</span>
        </h1>
        <p className="mt-4 text-lg text-ink-700/80">
          {BRAND.name} is moving from a chatbot that <em>replies</em> to an assistant that <em>does</em> —
          finding you care, tracking your health, and knowing when to escalate. Here’s what’s live and what’s next.
        </p>
      </div>

      {/* Live */}
      <div className="mx-auto mt-12 max-w-4xl">
        <h2 className="font-display text-2xl font-extrabold text-ink-900">Live now</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
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
        <h2 className="font-display text-2xl font-extrabold text-ink-900">On the roadmap</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
