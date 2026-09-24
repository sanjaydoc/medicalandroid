import { Link } from 'react-router-dom';
import { BRAND } from '../brand';
import VideoDemo from '../components/VideoDemo';

const FOUNDER = {
  name: 'Dr. Sanjay Anbu',
  role: 'Founder',
  credential: 'MBBS · (Bachelor of Medicine and Bachelor of Surgery)',
  photo: '/founder.jpg',
  email: BRAND.supportEmail,
  github: 'https://github.com/sanjaydoc',
  githubDisplay: 'github.com/sanjaydoc',
  linkedin: 'https://www.linkedin.com/in/sanjay-anbu-56a076252',
  linkedinDisplay: 'linkedin.com/in/sanjay-anbu',
  phones: [
    { raw: '6385371758', display: '+91 63853 71758' },
    { raw: '6385181758', display: '+91 63851 81758' },
  ],
};

const FOUNDER_BIO =
  `Dr. Sanjay Anbu is the founder of ${BRAND.name}, working at the intersection of medicine and ` +
  'artificial intelligence. A physician (MBBS) and builder, he is developing the MedDroid AI medical ' +
  'assistant and training an in-house medical AI model — with one goal: to make trustworthy health ' +
  'information understandable to everyone, in their own language, on any device.';

const FOCUS = ['Clinical medicine', 'Medical AI', 'On-device models', 'Multilingual health access', 'Patient safety'];

const VISION =
  `We built ${BRAND.name} on a simple belief: everyone deserves to understand their own health. Too many ` +
  'people leave a clinic with a prescription, a blood report or a scan they cannot read — and no one with ' +
  'the time to explain it. MedDroid is an AI medical assistant that explains it in plain language, in your ' +
  'language, for free. It is built to help you understand your health and prepare for your doctor — never to ' +
  'replace them.';

const PILLARS = [
  {
    title: 'An AI medical assistant',
    body: 'Ask any health question and understand your medicines, blood tests, ECGs, X-rays, MRIs and prescriptions — explained in plain words, in your own language.',
    icon: (
      <path d="M12 3l1.9 4.7L18.5 9.5l-4.6 1.8L12 16l-1.9-4.7L5.5 9.5l4.6-1.8L12 3z" />
    ),
  },
  {
    title: 'Built for everyone',
    body: 'Free, 24/7, on the web and as an Android app — with on-device AI so it still works in low-connectivity areas where care is hardest to reach.',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.6 2.6 4 6 4 9s-1.4 6.4-4 9c-2.6-2.6-4-6-4-9s1.4-6.4 4-9z" />
      </>
    ),
  },
  {
    title: 'Honest by design',
    body: 'MedDroid gives clear, general information — never a diagnosis. It flags emergencies, explains uncertainty, and always points you back to a qualified clinician.',
    icon: (
      <>
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
];

const VALUES = [
  { title: 'Accessible to all', body: 'Free, multilingual and offline-capable — so cost, language or connectivity never stand between a person and clear health information.' },
  { title: 'Honesty & safety', body: 'General information, not a diagnosis. We keep the disclaimers clear, lead with emergency advice when it matters, and never overclaim.' },
  { title: 'Privacy first', body: 'On-device options keep sensitive data on your phone. We only store what is needed to run and improve the service.' },
];

function Ico({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export default function About() {
  return (
    <div className="container-x py-10">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip bg-clay-100 text-clay-700">About us</span>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
          Understand your health — in plain language
        </h1>
        <p className="mt-4 text-lg text-ink-700/80">
          {BRAND.name} is a free AI medical assistant. Ask health questions in any language, understand your
          medicines, lab reports and scans, and get clear general information — always with the reminder to
          confirm with a qualified clinician.
        </p>
      </div>

      {/* See it in action */}
      <div className="mx-auto mt-12 max-w-3xl">
        <div className="mb-4 text-center">
          <span className="chip bg-clay-100 text-clay-700">See it in action</span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
            How MedDroid reads a lab report
          </h2>
        </div>
        <VideoDemo id="dZZ9j9gV-pE" title="How MedDroid reads your lab report" />
      </div>

      {/* What we do */}
      <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.title} className="card p-6">
            <div className="icon-tile h-14 w-14"><Ico>{p.icon}</Ico></div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{p.title}</h3>
            <p className="mt-2 text-sm text-ink-700/70">{p.body}</p>
          </div>
        ))}
      </div>

      {/* Vision */}
      <div className="mx-auto mt-14 max-w-3xl text-center">
        <span className="chip bg-clay-100 text-clay-700">Our vision</span>
        <p className="mt-4 text-lg leading-relaxed text-ink-800">{VISION}</p>
      </div>

      {/* Founder */}
      <div className="mx-auto mt-14 max-w-4xl">
        <h2 className="text-center font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">About the founder</h2>
        <div className="card mt-8 flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start sm:p-8">
          <img
            src={FOUNDER.photo}
            alt={FOUNDER.name}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            className="h-28 w-28 shrink-0 rounded-2xl object-cover object-top ring-1 ring-ink-900/10 sm:h-32 sm:w-32"
          />
          <div>
            <h3 className="font-display text-2xl font-extrabold text-ink-900">{FOUNDER.name}</h3>
            <p className="mt-1 text-sm font-semibold text-clay-600">{FOUNDER.role}, {BRAND.name} · {FOUNDER.credential}</p>
            <p className="mt-0.5 text-sm font-medium text-ink-700/80">Medicine &amp; AI</p>
            <p className="mt-3 text-sm text-ink-700/80">{FOUNDER_BIO}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {FOCUS.map((f) => (
                <span key={f} className="chip bg-cream-200 text-ink-700">{f}</span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={FOUNDER.linkedin} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 rounded-full border border-cream-300 px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-clay-300 hover:bg-clay-50">
                {FOUNDER.linkedinDisplay}
              </a>
              <a href={FOUNDER.github} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 rounded-full border border-cream-300 px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-clay-300 hover:bg-clay-50">
                {FOUNDER.githubDisplay}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="mx-auto mt-14 max-w-4xl">
        <div className="card overflow-hidden">
          <div className="bg-ink-900 p-8 text-white">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#4285F4', color: '#fff' }}>For users, partners &amp; press</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold">Let's talk</h2>
            <p className="mt-2 max-w-2xl text-white/70">
              Feedback, partnership or press — reach out directly.
            </p>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
            <a href={`mailto:${FOUNDER.email}`} className="rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-clay-300 hover:bg-clay-50">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">Email</p>
              <p className="mt-1 font-semibold text-ink-900">{FOUNDER.email}</p>
            </a>
            {FOUNDER.phones.map((p) => (
              <a key={`wa-${p.raw}`} href={`https://wa.me/91${p.raw}`} target="_blank" rel="noopener noreferrer"
                 className="rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-green-300 hover:bg-green-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">WhatsApp</p>
                <p className="mt-1 font-semibold text-ink-900">{p.display}</p>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="mx-auto mt-14 max-w-4xl">
        <h2 className="text-center font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">What we stand for</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="card p-6">
              <h3 className="font-display text-base font-bold text-ink-900">{v.title}</h3>
              <p className="mt-2 text-sm text-ink-700/70">{v.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto mt-14 max-w-3xl text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/assistant" className="btn-primary px-6 py-3">Open the assistant</Link>
          <Link to="/research" className="btn-outline px-6 py-3">Our research</Link>
        </div>
        <p className="mt-6 text-xs text-ink-700/50">
          {BRAND.name} provides general health information, not a diagnosis or medical advice — always consult
          a qualified clinician. In an emergency, contact your local emergency number immediately.
        </p>
      </div>
    </div>
  );
}
