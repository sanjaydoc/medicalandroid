import { Link } from 'react-router-dom';
import { type ReactNode } from 'react';
import { BRAND } from '../brand';

const UPDATED = 'September 2026';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-lg font-bold text-ink-900">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-700/80">{children}</div>
    </section>
  );
}

export default function Legal({ doc }: { doc: 'privacy' | 'terms' }) {
  return (
    <div className="container-x py-10">
      <div className="mx-auto max-w-3xl">
        {/* Hero */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>
          </span>
          <div>
            <h1 className="font-display text-3xl font-extrabold leading-none text-ink-900 sm:text-4xl">
              {doc === 'privacy' ? <>Privacy <span className="text-blue-600">Policy</span></> : <>Terms of <span className="text-blue-600">Service</span></>}
            </h1>
            <p className="mt-1 text-sm text-ink-700/60">Last updated {UPDATED}</p>
          </div>
        </div>

        <div className="card mt-8 p-6 sm:p-8">
          {doc === 'privacy' ? <PrivacyBody /> : <TermsBody />}
          <div className="mt-8 border-t border-cream-200 pt-4 text-xs text-ink-700/55">
            {doc === 'privacy'
              ? <>See also our <Link to="/terms" className="font-semibold text-blue-600 hover:underline">Terms of Service</Link>.</>
              : <>See also our <Link to="/privacy" className="font-semibold text-blue-600 hover:underline">Privacy Policy</Link>.</>}
            {' '}Questions? Contact {BRAND.supportEmail}.
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacyBody() {
  return (
    <>
      <p className="text-sm text-ink-700/80">
        {BRAND.name} (“we”) provides a free AI medical assistant at medicalandroid.com. This policy explains
        what we collect, how we use it, and your rights. {BRAND.name} gives <strong>general health information
        only — not a diagnosis</strong>.
      </p>

      <Section title="What we collect">
        <ul className="ml-4 list-disc space-y-1">
          <li><strong>Account details</strong> — your name and email (e.g. via Google sign-in), so you can save and sync your data.</li>
          <li><strong>Information you provide</strong> — questions you type, files you upload (reports, scans), and health records you enter (e.g. blood-pressure/sugar readings, medicines, children’s vaccine dates, pregnancy or recovery details).</li>
          <li><strong>Basic usage data</strong> — anonymous page-view/analytics to improve the service.</li>
        </ul>
      </Section>

      <Section title="How your data is stored & protected">
        <ul className="ml-4 list-disc space-y-1">
          <li>Encrypted <strong>in transit</strong> (HTTPS/TLS) and <strong>at rest</strong> (our database provider, Supabase).</li>
          <li><strong>Row-level security</strong> — your health records are tied to your account and only you can read them.</li>
          <li>We <strong>never sell</strong> your data or use it for advertising.</li>
        </ul>
      </Section>

      <Section title="How we use it">
        <p>Only to provide and improve the service — answering your questions, saving your records, and syncing them across your devices.</p>
      </Section>

      <Section title="Who processes your data (sub-processors)">
        <p>We use trusted providers strictly to run the service: <strong>Supabase</strong> (database &amp; sign-in), <strong>Cloudflare</strong> (hosting &amp; the chat proxy), and <strong>Anthropic</strong> (the AI model that generates chat replies). Your chat messages are sent to the AI model to produce a response. We do not sell data to anyone.</p>
      </Section>

      <Section title="Your rights">
        <p>Under India’s Digital Personal Data Protection Act (DPDP) 2023 and, where applicable, the EU GDPR, you can access, correct, or delete your data and withdraw consent at any time. You can delete individual records in the app, or email us to delete your account and associated data.</p>
      </Section>

      <Section title="International &amp; U.S. users (including HIPAA)">
        <p>
          {BRAND.name} provides general health information and is <strong>not a “covered entity” or “business
          associate” under the U.S. HIPAA law</strong>, so HIPAA does not govern the general information we
          provide. Wherever you are, we protect the data you give us with encryption, strict per-user access
          controls, and a no-selling policy. Please avoid uploading another person’s identifiable medical
          records unless necessary, and never share more than you’re comfortable with.
        </p>
      </Section>

      <Section title="Children">
        <p>The service is intended for adults. “Children’s vaccines” features let a parent/guardian track a child’s schedule; a guardian is responsible for that information.</p>
      </Section>

      <Section title="Retention & changes">
        <p>We keep your data while your account is active or as needed to provide the service, and delete it on request. We may update this policy; material changes will be posted here with a new date.</p>
      </Section>
    </>
  );
}

function TermsBody() {
  return (
    <>
      <Section title="Educational use only — not medical advice">
        <p>
          {BRAND.name} provides <strong>general health information and educational content only</strong>. It is
          <strong> not a diagnosis, prescription, or medical advice</strong>, does not create a doctor–patient
          relationship, and is not a substitute for a qualified clinician. Always consult a doctor or pharmacist
          for medical decisions.
        </p>
      </Section>

      <Section title="Emergencies">
        <p>If you have a medical emergency, contact your local emergency number or go to the nearest emergency department immediately. Do not rely on {BRAND.name} in an emergency.</p>
      </Section>

      <Section title="Accuracy & AI limitations">
        <p>The assistant uses AI and <strong>can be wrong</strong>. Reference ranges, drug prices, generic suggestions, schedules and clinic listings are general and may be incomplete or out of date — always confirm with a professional or the official source. You use the service at your own risk.</p>
      </Section>

      <Section title="Your account & acceptable use">
        <ul className="ml-4 list-disc space-y-1">
          <li>Keep your login secure; you’re responsible for activity under your account.</li>
          <li>Don’t misuse the service, attempt to break it, or use it for anything unlawful.</li>
          <li>Only enter information you have the right to enter.</li>
        </ul>
      </Section>

      <Section title="Limitation of liability">
        <p>To the maximum extent permitted by law, {BRAND.name} and its team are not liable for any loss or harm arising from use of, or reliance on, the service or its content. The service is provided “as is”, without warranties.</p>
      </Section>

      <Section title="Governing law">
        <p>These terms are governed by the laws of India. We may update them; continued use means you accept the changes.</p>
      </Section>
    </>
  );
}
