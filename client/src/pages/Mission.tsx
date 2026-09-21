import { Link } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';

/* ---- the iceberg: Persona Reversal is the tip; the platform is the mass below ---- */
function Iceberg() {
  return (
    <svg viewBox="0 0 820 620" className="mx-auto block w-full max-w-2xl" role="img"
         aria-label="Iceberg: Persona Reversal age-reversal is the visible tip; mass cell-therapy adoption is the larger platform below the surface.">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eaf1ff" /><stop offset="1" stopColor="#dbe8ff" />
        </linearGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f6fe0" stopOpacity="0.18" /><stop offset="1" stopColor="#0d1a33" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id="tip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#cfe0ff" />
        </linearGradient>
        <linearGradient id="mass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bcd3f7" /><stop offset="1" stopColor="#5a86c9" />
        </linearGradient>
      </defs>

      {/* sky + sea */}
      <rect x="0" y="0" width="820" height="200" fill="url(#sky)" />
      <rect x="0" y="200" width="820" height="420" fill="url(#sea)" />
      {/* waterline */}
      <line x1="0" y1="200" x2="820" y2="200" stroke="#2f6fe0" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="6 5" />

      {/* submerged mass */}
      <path d="M410 200 L150 250 L110 360 L180 500 L330 575 L500 575 L650 480 L700 330 L640 235 Z"
            fill="url(#mass)" stroke="#4a74b8" strokeOpacity="0.5" />
      {/* tip above water */}
      <path d="M410 60 L320 200 L510 200 Z" fill="url(#tip)" stroke="#9fc0f5" />

      {/* tip label */}
      <text x="410" y="44" textAnchor="middle" fontSize="17" fontWeight="700" fill="#0d1a33">Persona Reversal</text>
      <text x="410" y="150" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="#2f4a7a">age reversal</text>

      {/* submerged labels */}
      <text x="410" y="270" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0d1a33">Mass cell-therapy adoption</text>
      <text x="410" y="345" textAnchor="middle" fontSize="13" fontWeight="600" fill="#12305f">Tabletop therapy kits — 1/10th the cost</text>
      <text x="410" y="410" textAnchor="middle" fontSize="13" fontWeight="600" fill="#12305f">Standardised protocols anyone can run</text>
      <text x="410" y="475" textAnchor="middle" fontSize="13" fontWeight="600" fill="#12305f">Tumorigenicity solved per-patient</text>

      {/* "what you see / what we're building" tags */}
      <g fontSize="11" fontWeight="600">
        <rect x="556" y="120" width="150" height="26" rx="13" fill="#ffffff" stroke="#cfe0ff" />
        <text x="631" y="137" textAnchor="middle" fill="#2f6fe0">What the world sees</text>
        <rect x="556" y="300" width="170" height="26" rx="13" fill="#0d1a33" />
        <text x="641" y="317" textAnchor="middle" fill="#eaf1ff">What we're building</text>
      </g>
    </svg>
  );
}

const barriers: { icon: IconName; title: string; problem: string; solution: string }[] = [
  {
    icon: 'scale',
    title: 'Tumorigenicity risk',
    problem: 'Push cell reprogramming too hard and cells lose identity and can turn tumorigenic — the single barrier that stops in-vivo cell therapy going mainstream.',
    solution: 'Our simulator computes a per-patient safe dosing envelope from each patient’s own DNA methylation — turning an unmanaged risk into a measured, dosed one.',
  },
  {
    icon: 'banknote',
    title: 'Cost of a facility',
    problem: 'A state-of-the-art stem-cell wet-lab costs a fortune to build and run, so cell therapy stays locked inside a handful of elite centres.',
    solution: 'Our reusable tabletop therapy kit puts the essentials — mini incubator, centrifuge, PCR — on a bench, cutting setup cost to roughly one-tenth.',
  },
];

const phases: { tag: string; icon: IconName; title: string; body: string }[] = [
  {
    tag: 'Now', icon: 'flask',
    title: 'Wet-lab & MSC therapies',
    body: 'Our first stem-cell wet-lab facility delivers MSC and IV-exosome therapies — real care and revenue that funds the platform.',
  },
  {
    tag: 'Next', icon: 'syringe',
    title: 'Commercial AAV & exosome kits',
    body: 'A commercial version of our AAV and IV-exosome therapy kit, supplied to clinics and hospitals.',
  },
  {
    tag: 'The horizon', icon: 'hospital',
    title: 'Tabletop kits, worldwide',
    body: 'Reusable tabletop stem-cell therapy kits for everyone from small clinics to large multi-specialty hospitals — plus our therapies delivered as protocols others can practice.',
  },
];

export default function Mission() {
  return (
    <div className="container-x py-10">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip bg-clay-100 text-clay-700"><Icon name="heart" className="h-3.5 w-3.5" /> Our mission</span>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
          A disability-free world
        </h1>
        <p className="mt-4 text-lg text-ink-700/80">
          We exist to end disability at its source — rebuilding what disease and ageing take away, using
          <b className="text-ink-900"> stem-cell therapies, regenerative medicine and AI</b>. Age reversal is where
          we start. It is not where we stop.
        </p>
      </div>

      {/* Iceberg */}
      <div className="mx-auto mt-12 max-w-4xl">
        <div className="card overflow-hidden p-6 sm:p-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="chip bg-clay-100 text-clay-700">The iceberg</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-ink-900">
              Persona Reversal is the tip
            </h2>
            <p className="mt-2 text-sm text-ink-700/75">
              The age-reversal programme people see on the surface sits on top of something far larger: the
              infrastructure to make cell therapy affordable and repeatable everywhere.
            </p>
          </div>
          <div className="mt-6"><Iceberg /></div>
        </div>
      </div>

      {/* The revolution statement */}
      <div className="mx-auto mt-14 max-w-4xl">
        <div className="card overflow-hidden">
          <div className="bg-ink-900 p-8 text-white sm:p-10">
            <span className="chip bg-clay-500 text-white">The bigger picture</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">
              A revolution in who gets to deliver cell therapy
            </h2>
            <p className="mt-3 max-w-2xl text-white/75">
              Today cell therapy lives in a few elite centres. We intend to change that — to be the
              <b className="text-white"> manufacturer and supplier of tabletop stem-cell therapy kits</b> and the
              standard <b className="text-white">protocols</b> that run on them, so clinics, hospitals and
              institutions worldwide can treat patients with therapies that used to require a research campus.
            </p>
          </div>
        </div>
      </div>

      {/* Two barriers → our answers */}
      <div className="mx-auto mt-14 max-w-4xl">
        <h2 className="text-center font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Two barriers stand in the way. We remove both.
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {barriers.map((b) => (
            <div key={b.title} className="card p-6">
              <div className="icon-tile h-14 w-14"><Icon name={b.icon} className="h-7 w-7" /></div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{b.title}</h3>
              <p className="mt-2 text-sm text-ink-700/70">{b.problem}</p>
              <div className="mt-4 rounded-xl bg-clay-50 p-4">
                <span className="chip bg-clay-100 text-clay-700">Our answer</span>
                <p className="mt-2 text-sm text-ink-800">{b.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phased goals */}
      <div className="mx-auto mt-14 max-w-4xl">
        <h2 className="text-center font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          How we get there
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {phases.map((p) => (
            <div key={p.title} className="card p-6">
              <div className="flex items-center justify-between">
                <div className="icon-tile h-12 w-12"><Icon name={p.icon} className="h-6 w-6" /></div>
                <span className="chip bg-clay-100 text-clay-700">{p.tag}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{p.title}</h3>
              <p className="mt-2 text-sm text-ink-700/70">{p.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Inside the kit */}
      <div className="mx-auto mt-14 max-w-4xl">
        <div className="card overflow-hidden">
          <div className="grid gap-0 md:grid-cols-2">
            <div className="p-6 sm:p-8">
              <span className="chip bg-clay-100 text-clay-700"><Icon name="microscope" className="h-3.5 w-3.5" /> The tabletop kit</span>
              <h3 className="mt-3 font-display text-xl font-extrabold text-ink-900">A wet-lab on a bench</h3>
              <p className="mt-3 text-sm text-ink-700/75">
                A single reusable unit that houses the core of a cell-therapy lab — so preparing an autologous
                dose no longer needs a dedicated facility. Standardised, serviceable, and built to run our
                protocols out of the box.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-ink-800">
                {['Mini CO₂ incubator', 'Bench centrifuge', 'On-board PCR / thermocycler', 'Sterile prep & handling', 'Reusable — not single-use', '≈ 1/10th the cost of a full wet-lab'].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Icon name="star" className="mt-0.5 h-4 w-4 shrink-0 text-clay-500" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-cream-200 bg-cream-50 p-6 sm:border-l sm:border-t-0 sm:p-8">
              <span className="chip bg-clay-100 text-clay-700"><Icon name="clipboard" className="h-3.5 w-3.5" /> Therapies as protocols</span>
              <h3 className="mt-3 font-display text-xl font-extrabold text-ink-900">We ship the method, not just the machine</h3>
              <p className="mt-3 text-sm text-ink-700/75">
                The standard StemCells Protocol therapies we develop are packaged as protocols others can
                practice — validated, repeatable procedures that run on the kit. We manufacture and supply both:
                the <b className="text-ink-900">protocols</b> and the <b className="text-ink-900">cost-effective tabletop kits</b> they run on.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[['1/10', 'facility cost'], ['∞', 'reusable'], ['1', 'shared protocol']].map(([n, t]) => (
                  <div key={t} className="rounded-xl border border-cream-200 bg-white p-3">
                    <div className="font-display text-xl font-extrabold text-clay-600">{n}</div>
                    <div className="mt-1 text-[11px] text-ink-700/60">{t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto mt-14 max-w-3xl text-center">
        <h2 className="font-display text-2xl font-extrabold text-ink-900">Join the revolution</h2>
        <p className="mt-3 text-ink-700/75">
          Whether you’re a patient, a clinician, an institution or an investor — this is how cell therapy
          reaches everyone.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/waiting-list" className="btn-primary px-6 py-3">Join the waiting list</Link>
          <Link to="/investors" className="btn-outline px-6 py-3">For investors</Link>
          <Link to="/simulator" className="btn-ghost px-6 py-3">See the simulator</Link>
        </div>
        <p className="mt-6 text-xs text-ink-700/50">
          StemCells Protocol is an early-stage venture. Therapies, kits, figures and outcomes shown are
          illustrative and forward-looking — not medical advice, and not an offer of treatment.
        </p>
      </div>
    </div>
  );
}
