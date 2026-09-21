import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../brand';

function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#4285F4" />
      <rect x="27.5" y="13" width="9" height="30" rx="4.5" fill="#EA4335" />
      <rect x="17" y="23.5" width="30" height="9" rx="4.5" fill="#EA4335" />
      <path d="M10 46 h11 l4 -9 5 16 4 -10 h20" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="container-x grid min-h-[80vh] items-center gap-10 py-10 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <LogoMark />
          <span className="font-display text-2xl font-extrabold text-ink-900">{BRAND.name}</span>
        </Link>
        <h1 className="font-display text-3xl font-extrabold text-ink-900">{title}</h1>
        <p className="mt-2 text-ink-700/70">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>

      <div className="hidden lg:block">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 p-10 text-white">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-clay-500/30 blur-3xl" />
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10">
            <LogoMark size={40} />
          </div>
          <h2 className="mt-8 font-display text-2xl font-extrabold">
            Your AI medical assistant, any time
          </h2>
          <p className="mt-2 text-white/70">
            Ask health questions by speciality, understand your medicines, lab reports and scans, and
            get clear general information — in any language.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-white/80">
            <li className="flex items-start gap-2"><span aria-hidden>✓</span> Free, 24/7, in your language</li>
            <li className="flex items-start gap-2"><span aria-hidden>✓</span> Understand blood tests, ECGs &amp; scans</li>
            <li className="flex items-start gap-2"><span aria-hidden>✓</span> Focus answers by speciality</li>
          </ul>
          <p className="mt-6 text-xs text-white/45">
            General information, not a diagnosis — always consult a qualified clinician.
          </p>
        </div>
      </div>
    </div>
  );
}
