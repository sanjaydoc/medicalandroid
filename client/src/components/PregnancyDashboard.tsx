import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listRecords, upsertRecord, deleteRecord, syncRecords, type HealthRecord,
} from '../api/records';
import {
  gaWeeks, gaText, dueDate, daysToGo, trimester, weekInfo,
  ancSchedule, DANGER_SIGNS, fmtDate, type PregnancyData, type AncStatus,
} from '../api/pregnancy';
import { activeProfileId, belongsTo } from '../api/profiles';

const STATUS: Record<AncStatus, { bg: string; fg: string; label: string }> = {
  done: { bg: 'rgba(47,158,107,.15)', fg: '#237a52', label: 'Done' },
  overdue: { bg: 'rgba(234,67,53,.13)', fg: '#b3261e', label: 'Overdue' },
  due: { bg: 'rgba(217,138,0,.16)', fg: '#9a6400', label: 'Due now' },
  upcoming: { bg: '#eef3fb', fg: '#2F6FE0', label: 'Upcoming' },
};

type PregRec = HealthRecord<PregnancyData>;

export default function PregnancyDashboard() {
  const pid = activeProfileId();
  const forProfile = () => listRecords<PregnancyData>('pregnancy').filter((r) => belongsTo(r.data.profile, pid))[0];
  const [rec, setRec] = useState<PregRec | undefined>(forProfile);
  const [lmp, setLmp] = useState('');
  const [err, setErr] = useState('');

  const reload = () => setRec(forProfile());

  useEffect(() => {
    let alive = true;
    syncRecords().then((ok) => { if (alive && ok) reload(); });
    return () => { alive = false; };
  }, []);

  const start = () => {
    setErr('');
    const t = new Date(lmp).getTime();
    if (!lmp || isNaN(t)) { setErr('Enter a valid date.'); return; }
    if (t > Date.now()) { setErr('That date is in the future.'); return; }
    if (Date.now() - t > 300 * 86400000) { setErr('That’s more than 300 days ago — please check the date.'); return; }
    const r = upsertRecord<PregnancyData>({ kind: 'pregnancy', data: { lmp, done: {}, profile: pid } });
    setRec(r);
  };

  const toggle = (key: string) => {
    if (!rec) return;
    const done = { ...rec.data.done, [key]: !rec.data.done[key] };
    setRec(upsertRecord<PregnancyData>({ id: rec.id, kind: 'pregnancy', data: { ...rec.data, done } }));
  };

  const week = rec ? gaWeeks(rec.data.lmp) : 0;
  const anc = useMemo(() => (rec ? ancSchedule(rec.data) : []), [rec]);

  if (!rec) {
    return (
      <div className="card p-5 sm:p-6">
        <h3 className="font-display text-lg font-extrabold text-ink-900">Start your pregnancy companion</h3>
        <p className="mt-1 text-sm text-ink-700/70">Enter the first day of your last menstrual period (LMP) — we’ll work out your week, due date and antenatal schedule.</p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700/60">
            First day of last period (LMP)
            <input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} max={new Date().toISOString().slice(0, 10)}
              className="rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm font-semibold text-ink-900 focus:border-clay-400 focus:outline-none" />
          </label>
          <button onClick={start} className="btn-primary px-5 py-2.5 text-sm">Start</button>
        </div>
        {err && <p className="mt-2 text-xs font-semibold text-red-600">{err}</p>}
        <p className="mt-3 text-[11px] text-ink-700/50">Don’t know your LMP? Ask your doctor for your dating-scan due date. Educational only — not a substitute for antenatal care.</p>
      </div>
    );
  }

  const info = weekInfo(week);
  const dtg = daysToGo(rec.data.lmp);
  const tri = trimester(week);

  return (
    <div className="w-full">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-700/60">You are at</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{gaText(rec.data.lmp)}</p>
          <p className="text-[11px] font-bold text-clay-600">Trimester {tri}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-700/60">Due date</p>
          <p className="mt-1 font-display text-base font-extrabold text-ink-900">{fmtDate(dueDate(rec.data.lmp))}</p>
          <p className="text-[11px] text-ink-700/60">{dtg > 0 ? `${dtg} days to go` : dtg === 0 ? 'Due today' : `${-dtg} days over`}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-700/60">Baby is about</p>
          <p className="mt-1 font-display text-base font-extrabold text-ink-900">{info.size}</p>
          <p className="text-[11px] text-ink-700/50">size guide</p>
        </div>
      </div>

      {/* This week */}
      <div className="card mt-4 p-4 sm:p-5">
        <h3 className="mb-1 font-display text-sm font-bold text-ink-900">This week (week {week})</h3>
        <p className="text-sm text-ink-700/80">{info.note}</p>
      </div>

      {/* ANC schedule */}
      <div className="card mt-4 p-4 sm:p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-ink-900">Antenatal visits &amp; tests</h3>
        <ul className="flex flex-col gap-2">
          {anc.map((t) => {
            const s = STATUS[t.status];
            return (
              <li key={t.key} className="rounded-xl border border-cream-200 p-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={t.status === 'done'} onChange={() => toggle(t.key)} className="mt-0.5 h-5 w-5 shrink-0 accent-clay-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-ink-900">{t.label}</span>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
                      <span className="ml-auto text-[11px] text-ink-700/50">~week {t.week}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-700/70">{t.detail}</p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Danger signs */}
      <div className="mt-4 rounded-2xl border p-4" style={{ background: '#fdeeec', borderColor: '#f2b8b1' }}>
        <h3 className="mb-2 font-display text-sm font-bold" style={{ color: '#b3261e' }}>⚠️ Seek care immediately if you have</h3>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {DANGER_SIGNS.map((d) => (
            <li key={d} className="flex items-start gap-2 text-xs text-ink-800"><span style={{ color: '#b3261e' }}>•</span>{d}</li>
          ))}
        </ul>
        <Link to="/assistant" className="mt-3 inline-block text-xs font-bold underline" style={{ color: '#b3261e' }}>Find a hospital near me →</Link>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] text-ink-700/45">Educational only — always follow your obstetrician. Synced to your account.</p>
        <button onClick={() => { if (confirm('Reset pregnancy tracking?')) { deleteRecord(rec.id); reload(); } }} className="text-[11px] font-semibold text-ink-700/45 hover:text-red-600">Reset</button>
      </div>
    </div>
  );
}
