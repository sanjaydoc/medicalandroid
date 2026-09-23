import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import VitalsChart, { type ChartSeries } from './VitalsChart';
import {
  loadVitals, addVital, deleteVital, classify, latest, avgLast,
  assessEscalation, lifestyleNudge, weeklySummary, seriesOf, fmtWhen,
  type Vital, type GlucoseContext,
} from '../api/vitals';

const TONE: Record<string, string> = { good: '#2f9e6b', warn: '#d98a00', bad: '#EA4335', urgent: '#b3261e' };
const ESC: Record<string, { bg: string; bd: string; fg: string; icon: string }> = {
  urgent: { bg: '#fdeeec', bd: '#f2b8b1', fg: '#b3261e', icon: '🚨' },
  soon: { bg: '#fff4e5', bd: '#f4d6a6', fg: '#9a6400', icon: '⚠️' },
  watch: { bg: '#eef3fb', bd: '#cfe0f7', fg: '#2F6FE0', icon: '👀' },
  ok: { bg: '#eafaf1', bd: '#bfe8d0', fg: '#237a52', icon: '✅' },
};

export default function HealthDashboard() {
  const [vitals, setVitals] = useState<Vital[]>(loadVitals);
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

  const recent = [...vitals].sort((a, b) => b.ts - a.ts).slice(0, 8);
  const hasData = vitals.length > 0;
  const e = ESC[esc.level];

  return (
    <div className="mt-6 w-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-extrabold text-ink-900">My Health</h2>
        <span className="text-xs font-semibold text-ink-700/50">Chronic-Condition Coach</span>
      </div>

      {/* Escalation / status banner */}
      {hasData && (
        <div className="mb-4 flex gap-3 rounded-2xl border p-4" style={{ background: e.bg, borderColor: e.bd }}>
          <span className="text-xl leading-none">{e.icon}</span>
          <div>
            <p className="text-sm" style={{ color: e.fg }}>{esc.message}</p>
            {(esc.level === 'urgent' || esc.level === 'soon') && (
              <Link to="/assistant" className="mt-2 inline-block text-xs font-bold underline" style={{ color: e.fg }}>
                Find a clinic near me →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Latest stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Blood Pressure"
          value={bpLatest ? `${bpLatest.systolic}/${bpLatest.diastolic}` : '—'}
          unit="mmHg"
          when={bpLatest ? fmtWhen(bpLatest.ts) : 'No readings yet'}
          cls={bpLatest ? classify(bpLatest) : undefined}
          avg={bpAvg ? `7-day avg ${bpAvg.systolic}/${bpAvg.diastolic}` : ''} />
        <StatCard title="Blood Sugar"
          value={gluLatest ? `${gluLatest.glucose}` : '—'}
          unit="mg/dL"
          when={gluLatest ? `${gluLatest.context} · ${fmtWhen(gluLatest.ts)}` : 'No readings yet'}
          cls={gluLatest ? classify(gluLatest) : undefined}
          avg={gluAvg ? `7-day avg ${gluAvg.glucose}` : ''} />
      </div>

      {/* Charts */}
      {bpSeries[0].points.length > 0 && (
        <div className="card mt-4 p-4">
          <h3 className="mb-2 font-display text-sm font-bold text-ink-900">Blood pressure trend</h3>
          <VitalsChart series={bpSeries} unit="mmHg" bands={[
            { from: 90, to: 120, color: 'rgba(47,158,107,.10)' },
            { from: 140, to: 260, color: 'rgba(234,67,53,.07)' },
          ]} />
        </div>
      )}
      {gluSeries[0].points.length > 0 && (
        <div className="card mt-4 p-4">
          <h3 className="mb-2 font-display text-sm font-bold text-ink-900">Blood sugar trend</h3>
          <VitalsChart series={gluSeries} unit="mg/dL" bands={[
            { from: 70, to: 140, color: 'rgba(47,158,107,.10)' },
            { from: 200, to: 600, color: 'rgba(234,67,53,.07)' },
          ]} />
          <p className="mt-1 text-[11px] text-ink-700/50">Shaded green = general target zone; red = high. Fasting targets are lower — this is a guide, not a diagnosis.</p>
        </div>
      )}

      {/* Weekly summary + nudge */}
      {hasData && (
        <div className="card mt-4 p-4">
          <h3 className="mb-1 font-display text-sm font-bold text-ink-900">Weekly summary</h3>
          <p className="text-sm text-ink-700/80">{summary}</p>
          <p className="mt-2 text-sm text-ink-700/70"><strong className="text-ink-900">Tip:</strong> {nudge}</p>
        </div>
      )}

      {/* Add reading */}
      <div className="card mt-4 p-4">
        <div className="mb-3 flex gap-2">
          {(['bp', 'glucose'] as const).map((m) => (
            <button key={m} onClick={() => setMetric(m)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${metric === m ? 'bg-clay-500 text-white' : 'border border-cream-300 text-ink-700 hover:border-clay-400'}`}>
              {m === 'bp' ? 'Blood pressure' : 'Blood sugar'}
            </button>
          ))}
        </div>
        {metric === 'bp' ? (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Systolic" v={sys} set={setSys} ph="120" />
            <span className="pb-2 text-lg text-ink-700/40">/</span>
            <Field label="Diastolic" v={dia} set={setDia} ph="80" />
            <Field label="Pulse (opt)" v={pulse} set={setPulse} ph="72" />
            <button onClick={submit} className="btn-primary ml-auto px-5 py-2 text-sm">Add</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Sugar (mg/dL)" v={glu} set={setGlu} ph="110" />
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700/60">
              When
              <select value={ctx} onChange={(e2) => setCtx(e2.target.value as GlucoseContext)}
                className="rounded-lg border border-cream-300 bg-white px-2 py-2 text-sm font-semibold text-ink-900 focus:border-clay-400 focus:outline-none">
                <option value="fasting">Fasting</option>
                <option value="post">After meal</option>
                <option value="random">Random</option>
              </select>
            </label>
            <button onClick={submit} className="btn-primary ml-auto px-5 py-2 text-sm">Add</button>
          </div>
        )}
        {err && <p className="mt-2 text-xs font-semibold text-red-600">{err}</p>}
        <p className="mt-2 text-[11px] text-ink-700/50">Tip: you can also just type “bp 130/85” or “sugar 140 fasting” in the assistant.</p>
      </div>

      {/* Recent readings */}
      {hasData ? (
        <div className="card mt-4 p-4">
          <h3 className="mb-2 font-display text-sm font-bold text-ink-900">Recent readings</h3>
          <ul className="divide-y divide-cream-200">
            {recent.map((v) => {
              const c = classify(v);
              const val = v.type === 'bp' ? `${v.systolic}/${v.diastolic} mmHg` : v.type === 'glucose' ? `${v.glucose} mg/dL (${v.context})` : `${v.weight} kg`;
              return (
                <li key={v.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="font-semibold text-ink-900">{val}</span>
                  {c.label && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: `${TONE[c.tone]}22`, color: TONE[c.tone] }}>{c.label}</span>}
                  <span className="ml-auto text-xs text-ink-700/50">{fmtWhen(v.ts)}</span>
                  <button onClick={() => { deleteVital(v.id); refresh(); }} aria-label="Delete" className="text-ink-700/40 hover:text-red-600">×</button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="card mt-4 p-5 text-center">
          <p className="text-sm text-ink-700/70">No readings yet. Add your first BP or sugar reading above, or type it in the assistant — your trends &amp; charts will appear here.</p>
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-ink-700/45">
        Educational tracking only — not a diagnosis. Readings are stored on this device. Always follow your doctor’s advice.
      </p>
    </div>
  );
}

function StatCard({ title, value, unit, when, cls, avg }: { title: string; value: string; unit: string; when: string; cls?: { label: string; tone: string }; avg?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-ink-700/60">{title}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">
        {value} <span className="text-sm font-semibold text-ink-700/50">{unit}</span>
      </p>
      {cls?.label && (
        <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: `${TONE[cls.tone]}22`, color: TONE[cls.tone] }}>{cls.label}</span>
      )}
      <p className="mt-1 text-[11px] text-ink-700/50">{when}</p>
      {avg && <p className="text-[11px] text-ink-700/50">{avg}</p>}
    </div>
  );
}

function Field({ label, v, set, ph }: { label: string; v: string; set: (s: string) => void; ph: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700/60">
      {label}
      <input inputMode="numeric" value={v} onChange={(e) => set(e.target.value.replace(/[^\d.]/g, ''))} placeholder={ph}
        className="w-20 rounded-lg border border-cream-300 bg-white px-2 py-2 text-sm font-semibold text-ink-900 focus:border-clay-400 focus:outline-none" />
    </label>
  );
}
