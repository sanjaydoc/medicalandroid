import { Link } from 'react-router-dom';
import { BRAND } from '../brand';

const APK = 'https://raw.githubusercontent.com/sanjaydoc/medicalandroid/apk/meddroid.apk';

// SEO pages are static files (served by Cloudflare at these paths), so they use
// plain <a> for a full navigation, not the SPA router.
const CONDITIONS: [string, string][] = [
  ['/diseases/hypertension/', 'High blood pressure'],
  ['/diseases/type-2-diabetes/', 'Type-2 diabetes'],
  ['/diseases/dengue-fever/', 'Dengue fever'],
  ['/diseases/typhoid/', 'Typhoid'],
  ['/diseases/asthma/', 'Asthma'],
  ['/diseases/hypothyroidism/', 'Thyroid (hypo)'],
];
const TESTS: [string, string][] = [
  ['/blood-tests/complete-blood-count-cbc/', 'CBC'],
  ['/blood-tests/widal-test-typhoid/', 'Widal (typhoid)'],
  ['/blood-tests/lipid-profile-cholesterol/', 'Lipid profile'],
  ['/blood-tests/hba1c/', 'HbA1c (diabetes)'],
  ['/blood-tests/thyroid-function-test-tft/', 'Thyroid (TFT)'],
  ['/blood-tests/liver-function-test-lft/', 'Liver (LFT)'],
];
const EXPLORE: [string, string][] = [
  ['/ai-symptom-checker/', 'Symptom checker'],
  ['/blood-test-results-explained/', 'Blood tests explained'],
  ['/ai-doctor/', 'AI doctor'],
  ['/ask/general-medicine/', 'All departments'],
];

function Col({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-2 font-display text-sm font-bold text-ink-900">{title}</h4>
      <ul className="flex flex-col gap-1.5">
        {links.map(([href, label]) => (
          <li key={href}>
            <a href={href} className="text-sm text-ink-700/70 transition hover:text-clay-600">{label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-cream-300 bg-cream-100">
      <div className="container-x py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>
              </span>
              <span className="font-display text-lg font-extrabold text-ink-900">{BRAND.name}</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-ink-700/70">
              A free AI medical assistant — ask health questions in your language, understand reports &amp; scans, track your health. Educational, not a diagnosis.
            </p>
            <a href={APK} className="btn-primary mt-4 inline-block px-4 py-2 text-sm">Get the Android app</a>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-2 font-display text-sm font-bold text-ink-900">MedDroid</h4>
            <ul className="flex flex-col gap-1.5 text-sm">
              <li><Link to="/assistant" className="text-ink-700/70 hover:text-clay-600">Assistant</Link></li>
              <li><Link to="/workflows" className="text-ink-700/70 hover:text-clay-600">Agentic workflows</Link></li>
              <li><Link to="/research" className="text-ink-700/70 hover:text-clay-600">Research</Link></li>
              <li><Link to="/about" className="text-ink-700/70 hover:text-clay-600">About</Link></li>
              <li><Link to="/account" className="text-ink-700/70 hover:text-clay-600">My account</Link></li>
            </ul>
          </div>

          <Col title="Common conditions" links={CONDITIONS} />
          <Col title="Blood tests" links={TESTS} />
          <Col title="Explore" links={EXPLORE} />
        </div>

        {/* Honest trust strip (no fake compliance seals) */}
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-cream-300 pt-6 text-xs font-semibold text-ink-700/60">
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            Private &amp; encrypted
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>
            Only you can see your records
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-clay-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            We never sell your data
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-cream-300 pt-6 text-xs text-ink-700/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.name} ·{' '}
            <Link to="/privacy" className="hover:text-clay-600">Privacy</Link> ·{' '}
            <Link to="/terms" className="hover:text-clay-600">Terms</Link>
          </p>
          <p>Educational information only — not a diagnosis or a substitute for a clinician. In an emergency call your local emergency number.</p>
        </div>
      </div>
    </footer>
  );
}
