import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listRecords, upsertRecord, deleteRecord, syncRecords, type HealthRecord } from '../api/records';
import {
  PROCEDURES, getProcedure, dayNumber, currentPhaseIndex, taskId, recoveryProgress,
  followUpStatus, followUpDate, fmtDate, type RecoveryData,
} from '../api/recovery';
import { activeProfileId, belongsTo } from '../api/profiles';

type RecRec = HealthRecord<RecoveryData>;

export default function RecoveryDashboard() {
  const pid = activeProfileId();
  const forProfile = () => listRecords<RecoveryData>('recovery').filter((r) => belongsTo(r.data.profile, pid))[0];
  const [rec, setRec] = useState<RecRec | undefined>(forProfile);
  const [procKey, setProcKey] = useState(PROCEDURES[0].key);
  const [startDate, setStartDate] = useState('');
  const [err, setErr] = useState('');

  const reload = () => setRec(forProfile());

  useEffect(() => {
    let alive = true;
    syncRecords().then((ok) => { if (alive && ok) reload(); });
    return () => { alive = false; };
  }, []);

  const start = () => {
    setErr('');
    const t = new Date(startDate).getTime();
    if (!startDate || isNaN(t)) { setErr('Enter the surgery / discharge date.'); return; }
    if (t > Date.now()) { setErr('That date is in the future.'); return; }
    setRec(upsertRecord<RecoveryData>({ kind: 'recovery', data: { procedureKey: procKey, startDate, done: {}, profile: pid } }));
  };

  const toggle = (id: string) => {
    if (!rec) return;
    const done = { ...rec.data.done, [id]: !rec.data.done[id] };
    setRec(upsertRecord<RecoveryData>({ id: rec.id, kind: 'recovery', data: { ...rec.data, done } }));
  };

  const proc = rec ? getProcedure(rec.data.procedureKey) : undefined;
  const day = rec ? dayNumber(rec.data.startDate) : 0;
  const curPhase = proc ? currentPhaseIndex(proc, day) : 0;
  const prog = useMemo(() => (proc && rec ? recoveryProgress(proc, rec.data.done) : { done: 0, total: 0 }), [proc, rec]);

  if (!rec || !proc) {
    return (
      <div className="card p-5 sm:p-6">
        <h3 className="font-display text-lg font-extrabold text-ink-900">Start a recovery plan</h3>
        <p className="mt-1 text-sm text-ink-700/70">Pick your procedure and its date — you’ll get a day-by-day recovery checklist, wound care, warning signs and follow-ups.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700/60">
            Procedure
            <select value={procKey} onChange={(e) => setProcKey(e.target.value)}
              className="rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm font-semibold text-ink-900 focus:border-clay-400 focus:outline-none">
              {PROCEDURES.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700/60">
            Surgery / discharge date
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={new Date().toISOString().slice(0, 10)}
              className="rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm font-semibold text-ink-900 focus:border-clay-400 focus:outline-none" />
          </label>
        </div>
        <button onClick={start} className="btn-primary mt-3 px-5 py-2.5 text-sm">Start recovery plan</button>
        {err && <p className="mt-2 text-xs font-semibold text-red-600">{err}</p>}
        <p className="mt-3 text-[11px] text-ink-700/50">Educational guidance — always follow your surgeon’s specific instructions.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-4 sm:col-span-2">
          <p className="text-xs font-semibold text-ink-700/60">Recovering from</p>
          <p className="mt-1 font-display text-lg font-extrabold text-ink-900">{proc.name}</p>
          <p className="text-[11px] text-ink-700/50">since {fmtDate(new Date(rec.data.startDate).getTime())} · typical recovery {proc.recovery}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-700/60">Recovery day</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">Day {day}</p>
          <div className="mt-2 h-2 rounded-full bg-cream-200"><span className="block h-full rounded-full bg-clay-500" style={{ width: `${prog.total ? Math.round((prog.done / prog.total) * 100) : 0}%` }} /></div>
          <p className="mt-1 text-[11px] text-ink-700/50">{prog.done}/{prog.total} tasks done</p>
        </div>
      </div>

      <div className="card mt-4 p-4 sm:p-5"><p className="text-sm text-ink-700/80">{proc.overview}</p></div>

      {/* Phased checklist */}
      <div className="card mt-4 p-4 sm:p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-ink-900">Recovery checklist</h3>
        <div className="flex flex-col gap-3">
          {proc.phases.map((ph, pi) => (
            <div key={pi} className={`rounded-xl border p-3 ${pi === curPhase ? 'border-clay-300 bg-clay-50/50' : 'border-cream-200'}`}>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-bold text-ink-900">{ph.label}</span>
                {pi === curPhase && <span className="rounded-full bg-clay-500 px-2 py-0.5 text-[11px] font-bold text-white">You’re here</span>}
              </div>
              <ul className="flex flex-col gap-1.5">
                {ph.tasks.map((t, ti) => {
                  const id = taskId(proc.key, pi, ti);
                  return (
                    <li key={ti}>
                      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                        <input type="checkbox" checked={!!rec.data.done[id]} onChange={() => toggle(id)} className="mt-0.5 shrink-0 accent-clay-500" style={{ width: 18, height: 18 }} />
                        <span className={rec.data.done[id] ? 'text-ink-700/50 line-through' : 'text-ink-800'}>{t}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Wound care + follow-ups */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4 sm:p-5">
          <h3 className="mb-2 font-display text-sm font-bold text-ink-900">Wound / site care</h3>
          <ul className="flex flex-col gap-1.5 text-sm text-ink-700/80">
            {proc.woundCare.map((w) => <li key={w} className="flex gap-2"><span className="text-clay-500">•</span>{w}</li>)}
          </ul>
        </div>
        <div className="card p-4 sm:p-5">
          <h3 className="mb-2 font-display text-sm font-bold text-ink-900">Follow-ups</h3>
          <ul className="flex flex-col gap-2">
            {proc.followUp.map((fu, i) => {
              const st = followUpStatus(rec.data.startDate, fu);
              const c = st === 'due' ? { bg: 'rgba(217,138,0,.16)', fg: '#9a6400', label: 'Due now' } : st === 'done-ish' ? { bg: 'rgba(47,158,107,.15)', fg: '#237a52', label: 'Past due' } : { bg: '#eef3fb', fg: '#2F6FE0', label: 'Upcoming' };
              return (
                <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-ink-900">{fu.label}</span>
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: c.bg, color: c.fg }}>{c.label}</span>
                  <span className="ml-auto text-[11px] text-ink-700/50">{fmtDate(followUpDate(rec.data.startDate, fu))}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Warning signs */}
      <div className="mt-4 rounded-2xl border p-4" style={{ background: '#fdeeec', borderColor: '#f2b8b1' }}>
        <h3 className="mb-2 font-display text-sm font-bold" style={{ color: '#b3261e' }}>⚠️ Get medical help if you have</h3>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {proc.warnings.map((w) => <li key={w} className="flex items-start gap-2 text-xs text-ink-800"><span style={{ color: '#b3261e' }}>•</span>{w}</li>)}
        </ul>
        <Link to="/assistant" className="mt-3 inline-block text-xs font-bold underline" style={{ color: '#b3261e' }}>Find a hospital near me →</Link>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] text-ink-700/45">Educational only — follow your surgeon’s advice. Synced to your account.</p>
        <button onClick={() => { if (confirm('End this recovery plan?')) { deleteRecord(rec.id); reload(); } }} className="text-[11px] font-semibold text-ink-700/45 hover:text-red-600">End plan</button>
      </div>
    </div>
  );
}
