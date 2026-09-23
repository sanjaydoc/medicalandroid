import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import VitalsChart, { type ChartSeries } from './VitalsChart';
import {
  loadVitals, addVital, deleteVital, classify, latest, avgLast,
  assessEscalation, lifestyleNudge, weeklySummary, seriesOf, fmtWhen,
  type Vital, type GlucoseContext,
} from '../api/vitals';

const TONE: Record<string, string> = { good: '#2f9e6b', warn: '#d98a00', bad: '#EA4335', urgent: '#b3261e' };
const ESC: Record<string, { bg: string; bd: string; fg: string; icon: string; label: string }> = {
  urgent: { bg: '#fdeeec', bd: '#f2b8b1', fg: '#b3261e', icon: '🚨', label: 'Needs attention' },
  soon: { bg: '#fff4e5', bd: '#f4d6a6', fg: '#9a6400', icon: '⚠️', label: 'See a doctor soon' },
  watch: { bg: '#eef3fb', bd: '#cfe0f7', fg: '#2F6FE0', icon: '👀', label: 'Keep watching' },
  ok: { bg: '#eafaf1', bd: '#bfe8d0', fg: '#237a52', icon: '✅', label: 'On track' },
};
const DAY = 86400000;

type Section = 'overview' | 'bp' | 'glucose' | 'log' | 'history';
type IconName = 'pulse' | 'heart' | 'droplet' | 'plus' | 'list' | 'shield' | 'bulb' | 'info' | 'steth';
const NAV: { id: Section; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'pulse' },
  { id: 'bp', label: 'Blood Pressure', icon: 'heart' },
  { id: 'glucose', label: 'Blood Sugar', icon: 'droplet' },
  { id: 'log', label: 'Log a reading', icon: 'plus' },
  { id: 'history', label: 'History', icon: 'list' },
];

// 2D line icons (Lucide-style) that inherit color via currentColor — themed blue/clay.
function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...p}>
      {name === 'pulse' && <path d="M3 12h4l2-6 4 12 2-6h6" />}
      {name === 'heart' && <path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 3c0 4.5-9.5 12-9.5 12Z" />}
      {name === 'droplet' && <path d="M12 3s6 5.7 6 10a6 6 0 0 1-12 0c0-4.3 6-10 6-10Z" />}
      {name === 'plus' && <path d="M12 5v14M5 12h14" />}
      {name === 'list' && <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />}
      {name === 'shield' && <><path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></>}
      {name === 'bulb' && <><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2Z" /></>}
      {name === 'info' && <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>}
      {name === 'steth' && <><path d="M6 3v5a4 4 0 0 0 8 0V3" /><path d="M10 14.5A6.5 6.5 0 0 0 16.5 21 3.5 3.5 0 0 0 20 17.5V15" /><circle cx="20" cy="13" r="2" /></>}
    </svg>
  );
}

export default function HealthDashboard() {
  const [vitals, setVitals] = useState<Vital[]>(loadVitals);
  const [section, setSection] = useState<Section>('overview');
  const [metric, setMetric] = useState<'bp' | 'glucose'>('bp');
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [glu, setGlu] = useState('');
  const [ctx, setCtx] = useState<GlucoseContext>('fasting');
  const [err, setErr] = useState('');

  const refresh = () => setVitals(loadVitals());
  const submit = () => {
    setErr('');
    if (metric === 'bp') {
      const s = parseInt(sys, 10), d = parseInt(dia, 10);
      if (!(s >= 60 && s <= 260 && d >= 30 && d <= 200)) { setErr('Enter valid BP, e.g. 120 / 80.'); return; }
      addVital({ type: 'bp', systolic: s, diastolic: d, pulse: pulse ? parseInt(pulse, 10) : undefined });
      setSys(''); setDia(''); setPulse('');
    } else {
      const g = parseInt(glu, 10);
      if (!(g >= 30 && g <= 600)) { setErr('Enter a valid sugar value in mg/dL, e.g. 110.'); return; }
      addVital({ type: 'glucose', glucose: g, context: ctx });
      setGlu('');
    }
    refresh();
  };

  const bpLatest = latest(vitals, 'bp');
  const gluLatest = latest(vitals, 'glucose');
  const bpAvg = avgLast(vitals, 'bp', 7) as { systolic: number; diastolic: number; count: number } | null;
  const gluAvg = avgLast(vitals, 'glucose', 7) as { glucose: number; count: number } | null;
  const esc = useMemo(() => assessEscalation(vitals), [vitals]);
  const nudge = useMemo(() => lifestyleNudge(vitals), [vitals]);
  const summary = useMemo(() => weeklySummary(vitals), [vitals]);
  const weekCount = useMemo(() => vitals.filter((v) => v.ts >= Date.now() - 7 * DAY).length, [vitals]);
  const inRange = useMemo(() => {
    const s = vitals.filter((v) => v.ts >= Date.now() - 30 * DAY && (v.type === 'bp' || v.type === 'glucose'));
    if (!s.length) return null;
    const good = s.filter((v) => classify(v).tone === 'good').length;
    return { pct: Math.round((good / s.length) * 100), good, total: s.length };
  }, [vitals]);

  const bpSeries: ChartSeries[] = useMemo(() => {
    const s = seriesOf(vitals, 'bp');
    return [
      { label: 'Systolic', color: '#2F6FE0', points: s.filter((v) => v.systolic).map((v) => ({ t: v.ts, v: v.systolic! })) },
      { label: 'Diastolic', color: '#EA4335', points: s.filter((v) => v.diastolic).map((v) => ({ t: v.ts, v: v.diastolic! })) },
    ];
  }, [vitals]);
  const gluSeries: ChartSeries[] = useMemo(() => {
    const s = seriesOf(vitals, 'glucose');
    return [{ label: 'Glucose', color: '#2f9e6b', points: s.filter((v) => v.glucose).map((v) => ({ t: v.ts, v: v.glucose! })) }];
  }, [vitals]);

  const hasData = vitals.length > 0;
  const e = ESC[esc.level];
  const bpC = bpLatest ? classify(bpLatest) : undefined;
  const gluC = gluLatest ? classify(gluLatest) : undefined;

  const go = (s: Section) => setSection(s);

  return (
    <div className="mt-8 w-full">
      {/* Header — simulator style: icon badge + two-tone title + tag */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-clay-100 text-clay-600"><Icon name="pulse" className="h-6 w-6" /></span>
        <div>
          <h2 className="font-display text-2xl font-extrabold leading-none text-ink-900 sm:text-3xl">
            My <span className="text-clay-600">Health</span>
          </h2>
          <p className="mt-1 text-sm text-ink-700/60">Chronic-Condition Coach · on-device tracking</p>
        </div>
        <span className="ml-auto rounded-full border border-cream-300 bg-white px-3 py-1 text-xs font-bold text-ink-700/70">Educational · not a diagnosis</span>
      </div>

      {/* 3-column dashboard */}
      <div className="grid gap-5 lg:grid-cols-[210px_1fr_300px]">

        {/* LEFT: section rail */}
        <div className="card h-max p-3">
          <p className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-ink-700/50">Sections</p>
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {NAV.map((n) => {
              const active = section === n.id;
              return (
                <button key={n.id} onClick={() => go(n.id)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition lg:w-full ${active ? 'bg-clay-50 ring-1 ring-clay-200 text-ink-900' : 'text-ink-700/70 hover:bg-cream-100'}`}>
                  <span className={`grid h-7 w-7 place-items-center rounded-lg ${active ? 'bg-gradient-to-br from-clay-500 to-clay-400 text-white' : 'bg-cream-200 text-ink-700'}`}><Icon name={n.icon} className="h-4 w-4" /></span>
                  {n.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER: main panel */}
        <div className="min-w-0">
          {section === 'overview' && (
            <div className="card p-5 sm:p-6">
              <h3 className="font-display text-lg font-extrabold text-ink-900">Overview</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <KpiTile title="Blood Pressure" value={bpLatest ? `${bpLatest.systolic}/${bpLatest.diastolic}` : '—'} unit="mmHg" tone={bpC?.tone} sub={bpC?.label || 'No readings'} />
                <KpiTile title="Blood Sugar" value={gluLatest ? `${gluLatest.glucose}` : '—'} unit="mg/dL" tone={gluC?.tone} sub={gluC ? `${gluC.label}` : 'No readings'} />
                <KpiTile title="Readings (7d)" value={`${weekCount}`} unit="logged" sub={weekCount ? 'Keep it daily' : 'Log your first'} />
                <KpiTile title="7-day avg BP" value={bpAvg ? `${bpAvg.systolic}/${bpAvg.diastolic}` : '—'} unit="mmHg" sub={gluAvg ? `Sugar avg ${gluAvg.glucose}` : '—'} />
              </div>
              {hasData && (
                <div className="mt-4 flex gap-3 rounded-2xl border p-4" style={{ background: e.bg, borderColor: e.bd }}>
                  <span className="text-xl leading-none">{e.icon}</span>
                  <div>
                    <p className="text-sm" style={{ color: e.fg }}>{esc.message}</p>
                    {(esc.level === 'urgent' || esc.level === 'soon') && (
                      <Link to="/assistant" className="mt-2 inline-block text-xs font-bold underline" style={{ color: e.fg }}>Find a clinic near me →</Link>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-4 rounded-2xl bg-cream-100 p-4">
                <p className="text-sm font-bold text-ink-900">Weekly summary</p>
                <p className="mt-1 text-sm text-ink-700/80">{summary}</p>
              </div>
            </div>
          )}

          {section === 'bp' && (
            <ChartPanel title="Blood pressure trend" empty="Log a BP reading to see your trend"
              hasPoints={bpSeries[0].points.length > 0}
              chart={<VitalsChart series={bpSeries} unit="mmHg" bands={[{ from: 90, to: 120, color: 'rgba(47,158,107,.10)' }, { from: 140, to: 260, color: 'rgba(234,67,53,.07)' }]} />}
              latest={bpLatest ? { text: `Latest: ${bpLatest.systolic}/${bpLatest.diastolic} mmHg`, cls: bpC } : undefined}
              recent={seriesOf(vitals, 'bp')} refresh={refresh} />
          )}

          {section === 'glucose' && (
            <ChartPanel title="Blood sugar trend" empty="Log a sugar reading to see your trend"
              hasPoints={gluSeries[0].points.length > 0}
              chart={<><VitalsChart series={gluSeries} unit="mg/dL" bands={[{ from: 70, to: 140, color: 'rgba(47,158,107,.10)' }, { from: 200, to: 600, color: 'rgba(234,67,53,.07)' }]} /><p className="mt-1 text-[11px] text-ink-700/50">Green = general target; red = high. Fasting targets are lower — a guide, not a diagnosis.</p></>}
              latest={gluLatest ? { text: `Latest: ${gluLatest.glucose} mg/dL (${gluLatest.context})`, cls: gluC } : undefined}
              recent={seriesOf(vitals, 'glucose')} refresh={refresh} />
          )}

          {section === 'log' && (
            <div className="card p-5 sm:p-6">
              <h3 className="font-display text-lg font-extrabold text-ink-900">Log a reading</h3>
              <div className="my-4 flex gap-2">
                {(['bp', 'glucose'] as const).map((m) => (
                  <button key={m} onClick={() => setMetric(m)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${metric === m ? 'bg-clay-500 text-white' : 'border border-cream-300 text-ink-700 hover:border-clay-400'}`}>
                    {m === 'bp' ? 'Blood pressure' : 'Blood sugar'}
                  </button>
                ))}
              </div>
              {metric === 'bp' ? (
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Systolic" v={sys} set={setSys} ph="120" />
                  <span className="pb-2 text-lg text-ink-700/40">/</span>
                  <Field label="Diastolic" v={dia} set={setDia} ph="80" />
                  <Field label="Pulse (opt)" v={pulse} set={setPulse} ph="72" />
                  <button onClick={submit} className="btn-primary px-6 py-2.5 text-sm">Add reading</button>
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Sugar (mg/dL)" v={glu} set={setGlu} ph="110" />
                  <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700/60">
                    When
                    <select value={ctx} onChange={(e2) => setCtx(e2.target.value as GlucoseContext)}
                      className="rounded-lg border border-cream-300 bg-white px-2 py-2.5 text-sm font-semibold text-ink-900 focus:border-clay-400 focus:outline-none">
                      <option value="fasting">Fasting</option>
                      <option value="post">After meal</option>
                      <option value="random">Random</option>
                    </select>
                  </label>
                  <button onClick={submit} className="btn-primary px-6 py-2.5 text-sm">Add reading</button>
                </div>
              )}
              {err && <p className="mt-2 text-xs font-semibold text-red-600">{err}</p>}
              <p className="mt-3 text-[11px] text-ink-700/50">Or just type “bp 130/85” or “sugar 140 fasting” in the assistant — it logs here automatically.</p>
            </div>
          )}

          {section === 'history' && (
            <div className="card p-5 sm:p-6">
              <h3 className="font-display text-lg font-extrabold text-ink-900">History</h3>
              {hasData ? (
                <ul className="mt-3 divide-y divide-cream-200">
                  {[...vitals].sort((a, b) => b.ts - a.ts).map((v) => {
                    const c = classify(v);
                    const val = v.type === 'bp' ? `${v.systolic}/${v.diastolic} mmHg` : v.type === 'glucose' ? `${v.glucose} mg/dL (${v.context})` : `${v.weight} kg`;
                    return (
                      <li key={v.id} className="flex items-center gap-2 py-2.5 text-sm">
                        <span className="font-semibold text-ink-900">{val}</span>
                        {c.label && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: `${TONE[c.tone]}22`, color: TONE[c.tone] }}>{c.label}</span>}
                        <span className="ml-auto text-xs text-ink-700/50">{fmtWhen(v.ts)}</span>
                        <button onClick={() => { deleteVital(v.id); refresh(); }} aria-label="Delete" className="text-lg leading-none text-ink-700/40 hover:text-red-600">×</button>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="mt-4 py-4 text-center text-sm text-ink-700/60">No readings yet.</p>}
            </div>
          )}
        </div>

        {/* RIGHT: status + guidance */}
        <div className="flex flex-col gap-5">
          <div className="card p-5">
            <div className="mb-2 flex items-center gap-2 text-clay-500">
              <Icon name="pulse" className="h-4 w-4" />
              <h3 className="font-display text-sm font-bold text-ink-900">Health status</h3>
            </div>
            <div className="grid place-items-center py-2">
              <Ring pct={inRange ? inRange.pct : 0} empty={!inRange} />
            </div>
            <p className="text-center text-xs text-ink-700/60">
              {inRange ? `${inRange.good} of ${inRange.total} readings in a healthy range (30 days)` : 'Log readings to see your in-range score'}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl px-3 py-2" style={{ background: e.bg }}>
              <span className="h-2 w-2 rounded-full" style={{ background: e.fg }} />
              <span className="text-xs font-bold" style={{ color: e.fg }}>{e.label}</span>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2 text-clay-500">
              <Icon name="shield" className="h-4 w-4" />
              <h3 className="font-display text-sm font-bold text-ink-900">Guidance &amp; safety</h3>
            </div>
            <GuideItem icon="bulb" title="Today's tip" body={nudge} />
            <GuideItem icon="info" title="Educational only" body="Reference ranges to help you understand trends — not a diagnosis." />
            <GuideItem icon="steth" title="Confirm with a clinician" body="Discuss any concerning trend with your doctor." />
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-ink-700/45">
        Educational tracking only — not a diagnosis. Readings are stored on this device. Always follow your doctor’s advice.
      </p>
    </div>
  );
}

function ChartPanel({ title, empty, hasPoints, chart, latest, recent, refresh }: {
  title: string; empty: string; hasPoints: boolean; chart: ReactNode;
  latest?: { text: string; cls?: { label: string; tone: string } }; recent: Vital[]; refresh: () => void;
}) {
  const recentSorted = [...recent].sort((a, b) => b.ts - a.ts).slice(0, 6);
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-extrabold text-ink-900">{title}</h3>
        {latest?.cls && <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `${TONE[latest.cls.tone]}22`, color: TONE[latest.cls.tone] }}>{latest.cls.label}</span>}
      </div>
      {hasPoints ? chart : <div className="grid h-[150px] place-items-center rounded-xl border border-dashed border-cream-300 bg-cream-50 text-xs font-semibold text-ink-700/45">{empty}</div>}
      {latest && <p className="mt-3 text-sm text-ink-700/75">{latest.text}</p>}
      {recentSorted.length > 0 && (
        <ul className="mt-3 divide-y divide-cream-200">
          {recentSorted.map((v) => {
            const c = classify(v);
            const val = v.type === 'bp' ? `${v.systolic}/${v.diastolic} mmHg` : `${v.glucose} mg/dL (${v.context})`;
            return (
              <li key={v.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="font-semibold text-ink-900">{val}</span>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: `${TONE[c.tone]}22`, color: TONE[c.tone] }}>{c.label}</span>
                <span className="ml-auto text-xs text-ink-700/50">{fmtWhen(v.ts)}</span>
                <button onClick={() => { deleteVital(v.id); refresh(); }} aria-label="Delete" className="text-lg leading-none text-ink-700/40 hover:text-red-600">×</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Ring({ pct, empty }: { pct: number; empty?: boolean }) {
  const r = 52, C = 2 * Math.PI * r;
  const off = C * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const color = empty ? '#c7d2e6' : pct >= 70 ? '#2f9e6b' : pct >= 40 ? '#d98a00' : '#EA4335';
  return (
    <svg viewBox="0 0 130 130" width="130" height="130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="#e8eef8" strokeWidth="11" />
      {!empty && <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 65 65)" />}
      <text x="65" y="62" textAnchor="middle" fontSize="26" fontWeight="800" fill="#152038" fontFamily="Poppins,sans-serif">{empty ? '—' : `${pct}%`}</text>
      <text x="65" y="82" textAnchor="middle" fontSize="10" fill="#8a99b5" fontFamily="Inter,sans-serif">in range</text>
    </svg>
  );
}

function GuideItem({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className="mb-3 flex gap-2.5 last:mb-0">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-clay-50 text-clay-600"><Icon name={icon} className="h-3.5 w-3.5" /></span>
      <div>
        <p className="text-xs font-bold text-ink-900">{title}</p>
        <p className="text-xs text-ink-700/65">{body}</p>
      </div>
    </div>
  );
}

function KpiTile({ title, value, unit, tone, sub }: { title: string; value: string; unit: string; tone?: string; sub?: string }) {
  const color = tone ? TONE[tone] : '#5a6b8a';
  return (
    <div className="rounded-2xl bg-cream-100 p-4">
      <p className="text-xs font-semibold text-ink-700/60">{title}</p>
      <p className="mt-1 font-display text-2xl font-extrabold leading-none text-ink-900">{value} <span className="text-xs font-semibold text-ink-700/45">{unit}</span></p>
      {sub && <p className="mt-1.5 text-[11px] font-bold" style={{ color }}>{sub}</p>}
    </div>
  );
}

function Field({ label, v, set, ph }: { label: string; v: string; set: (s: string) => void; ph: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700/60">
      {label}
      <input inputMode="numeric" value={v} onChange={(e) => set(e.target.value.replace(/[^\d.]/g, ''))} placeholder={ph}
        className="w-24 rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm font-semibold text-ink-900 focus:border-clay-400 focus:outline-none" />
    </label>
  );
}
