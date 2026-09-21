import { Link } from 'react-router-dom';
import { BRAND } from '../brand';

const WHY = [
  {
    title: 'Privacy',
    body: 'Health data is deeply personal. An in-house model lets us run entirely on your device — your questions, reports and images never have to leave your phone.',
  },
  {
    title: 'Access anywhere',
    body: 'Care is hardest to reach exactly where the internet is weakest. A compact on-device model works offline, so MediMind keeps helping in low-connectivity areas.',
  },
  {
    title: 'Grounded & trustworthy',
    body: 'General chatbots are not built for medicine. We tune ours on curated clinical material and ground drug dosing in the WHO Essential Medicines standard reference.',
  },
  {
    title: 'Control & safety',
    body: 'Owning the model means we can shape its behaviour — keep it cautious, make it defer to clinicians, and hold it to our own safety tests instead of a black box.',
  },
];

const HOW = [
  {
    step: '01',
    title: 'A medical-domain model',
    body: 'We are building and fine-tuning a language model specialised for medicine — trained on curated medical literature, guidelines and question-answer data, rather than a general-purpose assistant repurposed for health.',
  },
  {
    step: '02',
    title: 'Grounded drug information',
    body: 'Dosing and medicine answers are anchored to the WHO Essential Medicines standard dosing reference, so guidance stays consistent with an established, recognised source.',
  },
  {
    step: '03',
    title: 'On-device deployment',
    body: 'The model is packaged to run fully on a phone in the Android app — with tiers that fit different devices — so it works with no internet and no data leaving the device.',
  },
  {
    step: '04',
    title: 'Multilingual by design',
    body: 'People describe symptoms in their mother tongue. We train and evaluate for Indian and international languages so answers come back clearly in the user’s own language.',
  },
  {
    step: '05',
    title: 'Safety evaluation',
    body: 'We continuously test the model against known cases — especially for reading scans and reports — to drive down dangerous errors like falsely calling an abnormal image “normal.”',
  },
];

export default function Research() {
  return (
    <div className="container-x py-10">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip bg-clay-100 text-clay-700">Research</span>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
          We're training a medical AI model — in-house
        </h1>
        <p className="mt-4 text-lg text-ink-700/80">
          {BRAND.name} isn't just a wrapper around someone else's chatbot. We are building our own medical AI
          model, tuned for clinical accuracy, privacy and offline use — so trustworthy health information can
          reach anyone, anywhere, in their own language.
        </p>
      </div>

      {/* Why in-house */}
      <div className="mx-auto mt-14 max-w-4xl">
        <h2 className="text-center font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Why build our own?</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {WHY.map((w) => (
            <div key={w.title} className="card p-6">
              <h3 className="font-display text-lg font-bold text-ink-900">{w.title}</h3>
              <p className="mt-2 text-sm text-ink-700/75">{w.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How we're building it */}
      <div className="mx-auto mt-16 max-w-4xl">
        <div className="text-center">
          <span className="chip bg-clay-100 text-clay-700">Our approach</span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">How we're building it</h2>
        </div>
        <div className="mt-8 space-y-4">
          {HOW.map((h) => (
            <div key={h.step} className="card flex gap-4 p-6">
              <span className="font-display text-2xl font-extrabold text-clay-400">{h.step}</span>
              <div>
                <h3 className="font-display text-lg font-bold text-ink-900">{h.title}</h3>
                <p className="mt-1 text-sm text-ink-700/75">{h.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="mx-auto mt-16 max-w-4xl">
        <div className="card overflow-hidden">
          <div className="bg-ink-900 p-8 text-white">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#4285F4', color: '#fff' }}>Where we are</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold">Status &amp; roadmap</h2>
          </div>
          <div className="grid gap-0 sm:grid-cols-3">
            <div className="p-6 sm:p-7">
              <span className="chip bg-clay-100 text-clay-700">Today</span>
              <p className="mt-3 text-sm text-ink-700/75">
                The assistant is live on the web and Android, backed by a strong cloud model — and, in the app,
                on-device models that already answer with no internet.
              </p>
            </div>
            <div className="border-t border-cream-200 p-6 sm:border-l sm:border-t-0 sm:p-7">
              <span className="chip bg-clay-100 text-clay-700">In progress</span>
              <p className="mt-3 text-sm text-ink-700/75">
                Training and fine-tuning our own medical model on in-house hardware, grounded in WHO dosing,
                and packaging it to run efficiently on everyday phones.
              </p>
            </div>
            <div className="border-t border-cream-200 p-6 sm:border-l sm:border-t-0 sm:p-7">
              <span className="chip bg-clay-100 text-clay-700">Next</span>
              <p className="mt-3 text-sm text-ink-700/75">
                Safety benchmarking against known cases, wider language coverage, and tighter guardrails for
                reading reports and scans.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Honesty */}
      <div className="mx-auto mt-14 max-w-3xl">
        <div className="card border-l-4 border-l-clay-400 p-6">
          <h3 className="font-display text-base font-bold text-ink-900">A note on honesty</h3>
          <p className="mt-2 text-sm text-ink-700/75">
            This is active research, not a finished product. {BRAND.name} is <strong>not a certified medical
            device</strong>, and its outputs are general information — not a diagnosis, prescription or a
            substitute for professional care. We publish our progress openly and improve it in the open.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto mt-14 max-w-3xl text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/assistant" className="btn-primary px-6 py-3">Try the assistant</Link>
          <Link to="/about" className="btn-outline px-6 py-3">About {BRAND.name}</Link>
        </div>
      </div>
    </div>
  );
}
