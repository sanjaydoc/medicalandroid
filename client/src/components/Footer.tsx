import { Link } from 'react-router-dom';
import { BRAND } from '../brand';
import BrandLogo from './BrandLogo';

const APK = 'https://raw.githubusercontent.com/sanjaydoc/medicalandroid/apk/meddroid.apk';
const SUPPORT_EMAIL = 'support@medicalandroid.com';

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

// Real MedDroid social profiles (X/Twitter intentionally omitted for now).
const SOCIALS: { label: string; href: string; icon: JSX.Element }[] = [
  {
    label: 'WhatsApp',
    href: 'https://wa.me/916385371758',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm5.6 14.2c-.24.67-1.4 1.28-1.93 1.33-.5.05-1.13.07-1.82-.11a15.7 15.7 0 0 1-1.65-.61 12.9 12.9 0 0 1-4.95-4.37c-.37-.5-.98-1.42-.98-2.71 0-1.3.68-1.93.92-2.2a.97.97 0 0 1 .7-.32l.5.01c.16 0 .38-.06.59.45.24.58.8 2 .87 2.14a.53.53 0 0 1 .02.5c-.08.16-.12.26-.24.4l-.36.42c-.12.12-.24.25-.1.49.13.24.6.98 1.28 1.59.88.78 1.62 1.02 1.85 1.14.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.53-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.11.06.63-.18 1.29Z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/share/1FNKQB1Cfw/',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M14 9h3l.4-3H14V4.3c0-.87.24-1.46 1.49-1.46H17.5V.16A21.4 21.4 0 0 0 15.2 0c-2.3 0-3.88 1.4-3.88 3.98V6H8.5v3h2.82v9h2.68V9Z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/medicalandroid',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/medicalandroid',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95C21.4 8.75 22 11 22 14v7h-4v-6.2c0-1.48-.03-3.38-2.06-3.38-2.06 0-2.38 1.6-2.38 3.27V21h-4V9Z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@MedicalAndroid',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M23 12s0-3.2-.4-4.74a2.5 2.5 0 0 0-1.76-1.77C19.28 5.1 12 5.1 12 5.1s-7.28 0-8.84.4A2.5 2.5 0 0 0 1.4 7.26C1 8.8 1 12 1 12s0 3.2.4 4.74a2.5 2.5 0 0 0 1.76 1.77c1.56.39 8.84.39 8.84.39s7.28 0 8.84-.4a2.5 2.5 0 0 0 1.76-1.76C23 15.2 23 12 23 12Zm-13 3.06V8.94L15.25 12 10 15.06Z" />
      </svg>
    ),
  },
  {
    label: 'Reddit',
    href: 'https://www.reddit.com/user/Medicalandroid',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M22 11.6a2.1 2.1 0 0 0-3.55-1.5 10.3 10.3 0 0 0-5.2-1.63l.9-4.2 2.94.65a1.5 1.5 0 1 0 .18-.98l-3.3-.73a.5.5 0 0 0-.59.38l-1 4.7a10.4 10.4 0 0 0-5.32 1.62 2.1 2.1 0 1 0-2.3 3.45 3.7 3.7 0 0 0-.05.6c0 3.1 3.6 5.6 8.05 5.6 4.46 0 8.06-2.5 8.06-5.6 0-.2-.02-.4-.05-.6A2.1 2.1 0 0 0 22 11.6ZM8 13.2a1.3 1.3 0 1 1 2.6 0 1.3 1.3 0 0 1-2.6 0Zm7.36 3.5c-.9.9-2.63.97-3.36.97-.73 0-2.46-.07-3.36-.97a.37.37 0 0 1 .52-.52c.57.57 1.78.77 2.84.77 1.06 0 2.27-.2 2.84-.77a.37.37 0 1 1 .52.52Zm-.06-2.2a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z" />
      </svg>
    ),
  },
  {
    label: 'Quora',
    href: 'https://www.quora.com/profile/MedDroid',
    icon: <span className="font-display text-sm font-extrabold leading-none" aria-hidden>Q</span>,
  },
];

function Col({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-2 font-display text-sm font-bold text-white">{title}</h4>
      <ul className="flex flex-col gap-1.5">
        {links.map(([href, label]) => (
          <li key={href}>
            <a href={href} className="text-sm text-white/55 transition hover:text-white">{label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-white/10 bg-[#0b0d12] text-white/70">
      <div className="container-x py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {/* Brand + contact + socials */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2">
              <BrandLogo className="h-8 w-8" />
              <span className="font-display text-lg font-extrabold">
                <span className="text-white">Med</span><span className="text-[#4285F4]">Droid</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-white/55">
              A free AI medical assistant — ask health questions in your language, understand reports &amp; scans, track your health. Educational, not a diagnosis.
            </p>

            {/* Contact */}
            <div className="mt-4 space-y-1 text-sm">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="block text-white/70 transition hover:text-white">{SUPPORT_EMAIL}</a>
              <a href="https://wa.me/916385371758" target="_blank" rel="noopener noreferrer" className="block text-white/70 transition hover:text-white">WhatsApp: +91 63853 71758</a>
            </div>

            {/* Round social buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-[#4285F4] hover:text-white"
                >
                  {s.icon}
                </a>
              ))}
            </div>

            <a href={APK} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#4285F4] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#2F6FE0]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
              Install app
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-2 font-display text-sm font-bold text-white">MedDroid</h4>
            <ul className="flex flex-col gap-1.5 text-sm">
              <li><Link to="/assistant" className="text-white/55 transition hover:text-white">Assistant</Link></li>
              <li><Link to="/workflows" className="text-white/55 transition hover:text-white">Agentic workflows</Link></li>
              <li><Link to="/research" className="text-white/55 transition hover:text-white">Research</Link></li>
              <li><Link to="/about" className="text-white/55 transition hover:text-white">About</Link></li>
              <li><Link to="/account" className="text-white/55 transition hover:text-white">My account</Link></li>
            </ul>
          </div>

          <Col title="Common conditions" links={CONDITIONS} />
          <Col title="Blood tests" links={TESTS} />
          <Col title="Explore" links={EXPLORE} />
        </div>

        {/* Honest trust strip (no fake compliance seals or review scores) */}
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-6 text-xs font-semibold text-white/55">
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            Private &amp; encrypted
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#6ea0ff]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>
            Only you can see your records
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-clay-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            We never sell your data
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.name} ·{' '}
            <Link to="/privacy" className="transition hover:text-white">Privacy</Link> ·{' '}
            <Link to="/terms" className="transition hover:text-white">Terms</Link>
          </p>
          <p>Educational information only — not a diagnosis or a substitute for a clinician. In an emergency call your local emergency number.</p>
        </div>
      </div>
    </footer>
  );
}
