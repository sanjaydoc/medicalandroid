import { Link } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';

const FOUNDER = {
  name: 'Dr. Sanjay Anbu',
  role: 'Founder',
  credential: 'MBBS · (Bachelor of Medicine and Bachelor of Surgery)',
  photo: '/founder.jpg',
  email: 'dr.sanjay@stemcellsprotocol.com',
  personalEmail: 'dr.sanjayanbu@gmail.com',
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
  'Sanjay Anbu is the founder of StemCells Protocol, working at the intersection of regenerative ' +
  'medicine, de novo molecular design and neurotechnology. He is the creator of De-Novo-LLM ' +
  '(generative design of novel biomolecules), a multi-generation Brain–Computer Interface platform, ' +
  'and the StemCells Protocol AI care assistant — building the tools to make age-reversal therapy ' +
  'personal to each patient’s own genome.';

const FOCUS = ['Regenerative medicine', 'Epigenetic reprogramming', 'De novo molecular design', 'Neurotechnology', 'AI platforms'];

const VISION =
  'We built StemCells Protocol to make age-reversal therapy truly personal. A patient uploads a digital ' +
  'version of their DNA into our AI care assistant, which orchestrates our De-Novo-LLM to generate novel ' +
  'age-reversal biomolecules for epigenetic reprogramming — our Persona Reversal programme. Instead of ' +
  'one-size-fits-all treatment, every person receives a therapy engineered for their own genome.';

const pillars: { icon: IconName; title: string; body: string }[] = [
  { icon: 'dna', title: 'Age-reversal — flagship', body: 'Persona Reversal: partial epigenetic reprogramming (OSK) to reset biological age, delivered via IV exosomes.' },
  { icon: 'hospital', title: 'MSC & IV-exosome therapies', body: 'A broad regenerative-medicine platform today — MSC and exosome treatments across Age Rejuvenation, Orthopedics, Cardiology, Neurology and more.' },
  { icon: 'ai', title: 'AI-first, personalised', body: 'A multilingual AI care assistant that reads labs, ECGs and scans, and orchestrates therapy tailored to each patient’s own genome.' },
];

const values: { title: string; body: string }[] = [
  { title: 'Personalised, not one-size-fits-all', body: 'Every protocol is matched to the individual — their condition, their genome, their goals.' },
  { title: 'Evidence & honesty', body: 'Established therapies are labelled separately from investigational ones, with clear disclaimers throughout.' },
  { title: 'Safety by design', body: 'Controlled, transient interventions with defined stopping points — rejuvenate, then stop.' },
];

export default function About() {
  return (
    <div className="container-x py-10">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip bg-clay-100 text-clay-700"><Icon name="hospital" className="h-3.5 w-3.5" /> About us</span>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
          Regenerate, restore, renew — tailored to you
        </h1>
        <p className="mt-4 text-lg text-ink-700/80">
          StemCells Protocol is a regenerative-medicine venture built around one idea: that the future of
          healthcare is personalised. We pair a stem-cell therapy clinic with an AI-driven platform advancing
          partial epigenetic reprogramming — the science of resetting biological age at the cellular level.
        </p>
      </div>

      {/* What we do */}
      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.title} className="card p-6">
            <div className="icon-tile h-14 w-14"><Icon name={p.icon} className="h-7 w-7" /></div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{p.title}</h3>
            <p className="mt-2 text-sm text-ink-700/70">{p.body}</p>
          </div>
        ))}
      </div>

      {/* Phased model */}
      <div className="mx-auto mt-14 max-w-4xl">
        <div className="card overflow-hidden">
          <div className="bg-ink-900 p-8 text-white">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#4285F4', color: '#fff' }}>Our approach</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold">A phased model</h2>
            <p className="mt-2 max-w-2xl text-white/70">
              We enter through a real clinic delivering established regenerative therapies, then compound that
              trust and cashflow into an age-reversal pipeline with a defined regulatory path.
            </p>
          </div>
          <div className="grid gap-0 sm:grid-cols-2">
            <div className="p-6 sm:p-8">
              <span className="chip bg-clay-100 text-clay-700">Phase 1 · Clinic</span>
              <p className="mt-3 text-sm text-ink-700/75">
                MSC &amp; IV-exosome therapies, consultations and diagnostics — near-term care and revenue that
                builds our brand, clinical data and patient community.
              </p>
            </div>
            <div className="border-t border-cream-200 p-6 sm:border-l sm:border-t-0 sm:p-8">
              <span className="chip bg-clay-100 text-clay-700">Phase 2 · Platform</span>
              <p className="mt-3 text-sm text-ink-700/75">
                Our Persona Reversal programme — OSK partial-reprogramming delivered via IV exosomes —
                advanced toward first-in-human on a contained lead indication.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Vision */}
      <div className="mx-auto mt-14 max-w-3xl text-center">
        <span className="chip bg-clay-100 text-clay-700"><Icon name="dna" className="h-3.5 w-3.5" /> Our vision</span>
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
            <p className="mt-1 text-sm font-semibold text-clay-600">{FOUNDER.role}, StemCells Protocol · {FOUNDER.credential}</p>
            <p className="mt-0.5 text-sm font-medium text-ink-700/80">Regenerative Medicine &amp; AI</p>
            <p className="mt-0.5 text-xs text-ink-700/45">pursuing Fellowship in Regenerative Medicine</p>
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

      {/* Contact / Let's talk */}
      <div className="mx-auto mt-14 max-w-4xl">
        <div className="card overflow-hidden">
          <div className="bg-ink-900 p-8 text-white">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#4285F4', color: '#fff' }}>For patients, partners &amp; investors</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold">Let’s talk</h2>
            <p className="mt-2 max-w-2xl text-white/70">
              Whether you’re a prospective patient, a clinical partner or an investor, reach out directly.
            </p>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
            <a href={`mailto:${FOUNDER.email}`} className="rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-clay-300 hover:bg-clay-50">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">Email</p>
              <p className="mt-1 font-semibold text-ink-900">{FOUNDER.email}</p>
            </a>
            <a href={`mailto:${FOUNDER.personalEmail}`} className="rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-clay-300 hover:bg-clay-50">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">Personal email</p>
              <p className="mt-1 font-semibold text-ink-900">{FOUNDER.personalEmail}</p>
            </a>
            {FOUNDER.phones.map((p) => (
              <a key={`tel-${p.raw}`} href={`tel:+91${p.raw}`} className="rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-clay-300 hover:bg-clay-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">Call</p>
                <p className="mt-1 font-semibold text-ink-900">{p.display}</p>
              </a>
            ))}
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
          {values.map((v) => (
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
          <Link to="/consultation" className="btn-primary px-6 py-3">Book a consultation</Link>
          <a href={`mailto:${FOUNDER.email}`} className="btn-outline px-6 py-3">Contact us</a>
        </div>
        <p className="mt-6 text-xs text-ink-700/50">
          Therapies, figures and simulator outputs shown across the site are illustrative model estimates —
          not medical advice, and not an offer of treatment. Established therapies are clearly distinguished
          from investigational ones.
        </p>
      </div>
    </div>
  );
}
