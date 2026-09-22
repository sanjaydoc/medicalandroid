import { Link } from 'react-router-dom';
import { BRAND } from '../brand';

const WHY = [
  {
    title: 'Privacy',
    body: 'Health data is deeply personal. An in-house model lets us run entirely on your device — your questions, reports and images never have to leave your phone.',
  },
  {
    title: 'Access anywhere',
    body: 'Care is hardest to reach exactly where the internet is weakest. A compact on-device model works offline, so MedDroid keeps helping in low-connectivity areas.',
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

      {/* Milestone: MedDroid-v9 */}
      <div className="mx-auto mt-12 max-w-4xl">
        <div className="card overflow-hidden border-l-4" style={{ borderLeftColor: '#4285F4' }}>
          <div className="p-6 sm:p-8">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#e8f0fe', color: '#2F6FE0' }}>
              Milestone · MedDroid-v9
            </span>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-ink-900">
              Our first in-house model just passed its safety benchmark
            </h2>
            <p className="mt-3 text-sm text-ink-700/80">
              After two honest attempts that we measured and set aside, <strong>MedDroid-v9</strong> — our own
              medical model, fine-tuned from Google's open <strong>MedGemma</strong> — cleared our internal
              safety benchmark. The breakthrough: we trained it only on <em>language and communication style</em>,
              never on medical facts, so it gained a warmer, multilingual voice <em>without</em> losing the base
              model's knowledge.
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-ink-700/80 sm:grid-cols-2">
              <li>✅ Answers in Tamil, Hindi &amp; more — not just English</li>
              <li>✅ Clear, structured, patient-friendly replies</li>
              <li>✅ Reads chest X-rays as well as before</li>
              <li>✅ Kept everyday medicine facts accurate</li>
              <li>✅ Zero dangerous errors on our benchmark</li>
              <li>✅ Compact enough to run offline on a phone</li>
            </ul>
            <p className="mt-4 text-xs text-ink-700/60">
              Educational information only — not a diagnosis. Our live assistant still uses proven frontier AI
              models for complex questions, and exact drug dosing is grounded in a standard reference. We only
              put a model in front of you once it clears our safety tests.
            </p>
          </div>
        </div>
      </div>

      {/* Get the model — open source links */}
      <div className="mx-auto mt-8 max-w-4xl">
        <div className="card p-6 sm:p-7">
          <span className="chip bg-clay-100 text-clay-700">Open source</span>
          <h2 className="mt-3 font-display text-xl font-extrabold text-ink-900">Get MedDroid-v9</h2>
          <p className="mt-2 text-sm text-ink-700/75">
            Our first in-house model is openly published. Explore it, or run it locally in one command:
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl bg-ink-900 px-4 py-3 font-mono text-sm text-white">
            ollama run drsanjayanbu/meddroid-v9
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="https://huggingface.co/CryptoGod97/meddroid-v9" target="_blank" rel="noopener noreferrer" className="btn-primary px-5 py-2.5">
              View on Hugging Face
            </a>
            <a href="https://ollama.com/drsanjayanbu/meddroid-v9" target="_blank" rel="noopener noreferrer" className="btn-outline px-5 py-2.5">
              View on Ollama
            </a>
          </div>
          <p className="mt-3 text-xs text-ink-700/60">
            Educational use only — not a medical device. Built on Google MedGemma 4B under the HAI-DEF licence.
          </p>
        </div>
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
              <span className="chip bg-clay-100 text-clay-700">Done</span>
              <p className="mt-3 text-sm text-ink-700/75">
                <strong>MedDroid-v9</strong> — our first in-house model — passed our safety benchmark:
                multilingual, well-structured, strong at reading scans, with everyday medicine facts intact and
                zero dangerous errors.
              </p>
            </div>
            <div className="border-t border-cream-200 p-6 sm:border-l sm:border-t-0 sm:p-7">
              <span className="chip bg-clay-100 text-clay-700">In progress</span>
              <p className="mt-3 text-sm text-ink-700/75">
                Broadening to more Indian languages and deeper answers, and grounding drug dosing in a standard
                reference with safety guardrails — while the live assistant keeps using proven frontier models
                for complex questions.
              </p>
            </div>
            <div className="border-t border-cream-200 p-6 sm:border-l sm:border-t-0 sm:p-7">
              <span className="chip bg-clay-100 text-clay-700">Next</span>
              <p className="mt-3 text-sm text-ink-700/75">
                On-device deployment of our model in the app, wider safety benchmarking (scans, reports, more
                languages), and smarter checks that know when to defer to a doctor.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust */}
      <div className="mx-auto mt-14 max-w-3xl">
        <div className="card border-l-4 border-l-clay-400 p-6">
          <h3 className="font-display text-base font-bold text-ink-900">Built on trust</h3>
          <p className="mt-2 text-sm text-ink-700/75">
            {BRAND.name} gives clear, reliable general health information to help you understand your health
            and make confident decisions with your doctor. Like every responsible health service, it
            <strong> supports your care — it doesn't replace your clinician</strong>, and it isn't a
            substitute for a professional diagnosis. We're honest about what AI can and can't do, and we keep
            improving it — because earning your trust matters more to us than overpromising.
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
