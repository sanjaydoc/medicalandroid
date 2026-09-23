import { useEffect, useMemo, useState } from 'react';
import {
  listRecords, upsertRecord, deleteRecord, syncRecords, type HealthRecord,
} from '../api/records';
import {
  SCHEDULE, scheduleFor, nextDue, progress, ageLabel, fmtDate,
  type ChildData, type DoseStatus,
} from '../api/immunization';
import { activeProfileId, belongsTo } from '../api/profiles';

const STATUS: Record<DoseStatus, { bg: string; fg: string; label: string }> = {
  done: { bg: 'rgba(47,158,107,.15)', fg: '#237a52', label: 'Done' },
  overdue: { bg: 'rgba(234,67,53,.13)', fg: '#b3261e', label: 'Overdue' },
  due: { bg: 'rgba(217,138,0,.16)', fg: '#9a6400', label: 'Due now' },
  upcoming: { bg: '#eef3fb', fg: '#2F6FE0', label: 'Upcoming' },
};

type ChildRec = HealthRecord<ChildData>;

export default function ImmunizationDashboard() {
  const pid = activeProfileId();
  const forProfile = () => listRecords<ChildData>('child').filter((c) => belongsTo(c.data.profile, pid));
  const [children, setChildren] = useState<ChildRec[]>(forProfile);
  const [selId, setSelId] = useState<string>(children[0]?.id || '');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [err, setErr] = useState('');

  const reload = () => {
    const list = forProfile();
    setChildren(list);
    if (!list.find((c) => c.id === selId)) setSelId(list[0]?.id || '');
  };

  useEffect(() => {
    let alive = true;
    syncRecords().then((ok) => { if (alive && ok) reload(); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addChild = () => {
    setErr('');
    if (!name.trim()) { setErr('Enter the child’s name.'); return; }
    if (!dob || isNaN(new Date(dob).getTime())) { setErr('Enter a valid date of birth.'); return; }
    if (new Date(dob).getTime() > Date.now()) { setErr('Date of birth can’t be in the future.'); return; }
    const rec = upsertRecord<ChildData>({ kind: 'child', data: { name: name.trim(), dob, done: {}, profile: pid } });
    setName(''); setDob('');
    reload();
    setSelId(rec.id);
  };

  const sel = children.find((c) => c.id === selId);

  const toggle = (mKey: string) => {
    if (!sel) return;
    const done = { ...sel.data.done, [mKey]: !sel.data.done[mKey] };
    upsertRecord<ChildData>({ id: sel.id, kind: 'child', data: { ...sel.data, done } });
    reload();
  };

  const views = useMemo(() => (sel ? scheduleFor(sel.data) : []), [sel]);
  const next = sel ? nextDue(sel.data) : null;
  const prog = sel ? progress(sel.data) : { done: 0, total: SCHEDULE.length };

  return (
    <div className="w-full">
      {/* Child selector + add */}
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {children.map((c) => (
            <button key={c.id} onClick={() => setSelId(c.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${c.id === selId ? 'bg-clay-500 text-white' : 'border border-cream-300 text-ink-700 hover:border-clay-400'}`}>
              {c.data.name}
            </button>
          ))}
          {children.length > 0 && <span className="text-xs text-ink-700/50">Add another below</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700/60">
            Child’s name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aarav"
              className="w-40 rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm font-semibold text-ink-900 focus:border-clay-400 focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700/60">
            Date of birth
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)}
              className="rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm font-semibold text-ink-900 focus:border-clay-400 focus:outline-none" />
          </label>
          <button onClick={addChild} className="btn-primary px-5 py-2.5 text-sm">Add child</button>
          {sel && <button onClick={() => { if (confirm(`Remove ${sel.data.name}?`)) { deleteRecord(sel.id); reload(); } }} className="btn-ghost ml-auto px-3 py-2 text-xs">Remove</button>}
        </div>
        {err && <p className="mt-2 text-xs font-semibold text-red-600">{err}</p>}
      </div>

      {sel ? (
        <>
          {/* Summary */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="card p-4">
              <p className="text-xs font-semibold text-ink-700/60">{sel.data.name}</p>
              <p className="mt-1 font-display text-xl font-extrabold text-ink-900">{ageLabel(sel.data.dob)}</p>
              <p className="text-[11px] text-ink-700/50">born {fmtDate(new Date(sel.data.dob).getTime())}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-semibold text-ink-700/60">Progress</p>
              <p className="mt-1 font-display text-xl font-extrabold text-ink-900">{prog.done}/{prog.total} <span className="text-xs font-semibold text-ink-700/45">visits</span></p>
              <div className="mt-2 h-2 rounded-full bg-cream-200"><span className="block h-full rounded-full bg-clay-500" style={{ width: `${Math.round((prog.done / prog.total) * 100)}%` }} /></div>
            </div>
            <div className="card p-4" style={next ? { borderLeft: `4px solid ${STATUS[next.status].fg}` } : undefined}>
              <p className="text-xs font-semibold text-ink-700/60">Next due</p>
              {next ? (
                <>
                  <p className="mt-1 font-display text-base font-extrabold text-ink-900">{next.label}</p>
                  <p className="text-[11px] font-bold" style={{ color: STATUS[next.status].fg }}>{STATUS[next.status].label} · {fmtDate(next.dueDate)}</p>
                </>
              ) : <p className="mt-1 text-sm font-bold text-green-700">All caught up 🎉</p>}
            </div>
          </div>

          {/* Schedule */}
          <div className="card mt-4 p-4 sm:p-5">
            <h3 className="mb-3 font-display text-sm font-bold text-ink-900">Vaccination schedule</h3>
            <ul className="flex flex-col gap-2">
              {views.map((v) => {
                const s = STATUS[v.status];
                return (
                  <li key={v.key} className="rounded-xl border border-cream-200 p-3">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={v.status === 'done'} onChange={() => toggle(v.key)}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-clay-500" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-ink-900">{v.label}</span>
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
                          <span className="ml-auto text-[11px] text-ink-700/50">{fmtDate(v.dueDate)}</span>
                        </div>
                        <p className="mt-1 text-xs text-ink-700/70">{v.vaccines.join(' · ')}</p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mt-3 text-center text-[11px] text-ink-700/45">
            Educational schedule (National / IAP) — vaccines &amp; timing vary by state and brand. Always confirm with your paediatrician. Synced to your account.
          </p>
        </>
      ) : (
        <div className="card mt-4 p-6 text-center">
          <p className="text-sm text-ink-700/70">Add your child above to get their full vaccination schedule with due dates &amp; reminders — synced across your devices.</p>
        </div>
      )}
    </div>
  );
}
