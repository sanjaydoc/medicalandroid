import { useEffect, useMemo, useState } from 'react';
import { listRecords, upsertRecord, deleteRecord, syncRecords, type HealthRecord } from '../api/records';
import { lookupDrug, checkSafety, type MedicineData, type Drug } from '../api/medicines';
import { activeProfileId, belongsTo } from '../api/profiles';

type MedRec = HealthRecord<MedicineData>;

export default function MedicinesDashboard() {
  const pid = activeProfileId();
  const forProfile = () => listRecords<MedicineData>('medicine').filter((m) => belongsTo(m.data.profile, pid));
  const [meds, setMeds] = useState<MedRec[]>(forProfile);
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');

  const reload = () => setMeds(forProfile());

  useEffect(() => {
    let alive = true;
    syncRecords().then((ok) => { if (alive && ok) reload(); });
    return () => { alive = false; };
  }, []);

  const add = () => {
    const name = q.trim();
    if (!name) return;
    const d = lookupDrug(name);
    upsertRecord<MedicineData>({ kind: 'medicine', data: { query: name, generic: d?.generic, profile: pid } });
    setQ('');
    setNote(d ? '' : `“${name}” isn’t in our common-medicines list yet — added it, but ask a pharmacist for its generic & interactions.`);
    reload();
  };

  // resolve each stored medicine to a Drug (for display + safety)
  const resolved = useMemo(() => meds.map((m) => ({ rec: m, drug: lookupDrug(m.data.query) })), [meds]);
  const knownDrugs = resolved.map((r) => r.drug).filter((d): d is Drug => !!d);
  const issues = useMemo(() => checkSafety(knownDrugs), [knownDrugs]);

  return (
    <div className="w-full">
      {/* Add */}
      <div className="card p-4 sm:p-5">
        <h3 className="font-display text-sm font-bold text-ink-900">Add a medicine</h3>
        <p className="mt-1 text-xs text-ink-700/60">Type a brand or generic name (e.g. “Dolo 650”, “Augmentin”, “Telma 40”).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Medicine name…"
            className="min-w-0 flex-1 rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm font-semibold text-ink-900 focus:border-clay-400 focus:outline-none" />
          <button onClick={add} className="btn-primary px-5 py-2.5 text-sm">Add</button>
        </div>
        {note && <p className="mt-2 text-xs font-semibold text-amber-700">{note}</p>}
      </div>

      {/* Safety panel */}
      {issues.length > 0 && (
        <div className="mt-4 rounded-2xl border p-4" style={{ background: '#fdeeec', borderColor: '#f2b8b1' }}>
          <h3 className="mb-2 font-display text-sm font-bold" style={{ color: '#b3261e' }}>⚠️ Safety check — {issues.length} thing{issues.length > 1 ? 's' : ''} to review</h3>
          <ul className="flex flex-col gap-2">
            {issues.map((i, k) => (
              <li key={k} className="rounded-xl bg-white/70 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: i.severity === 'high' ? 'rgba(179,38,30,.15)' : 'rgba(217,138,0,.16)', color: i.severity === 'high' ? '#b3261e' : '#9a6400' }}>{i.severity === 'high' ? 'HIGH' : 'CHECK'}</span>
                  <span className="text-sm font-bold text-ink-900">{i.title}</span>
                </div>
                <p className="mt-1 text-xs text-ink-700/80">{i.note}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px]" style={{ color: '#b3261e' }}>This is a general check, not complete — always confirm with your pharmacist or doctor.</p>
        </div>
      )}
      {knownDrugs.length > 1 && issues.length === 0 && (
        <div className="mt-4 rounded-2xl border p-3 text-center text-sm font-semibold" style={{ background: '#eafaf1', borderColor: '#bfe8d0', color: '#237a52' }}>
          ✅ No common interactions or duplicate ingredients found among your listed medicines.
        </div>
      )}

      {/* Medicine cards */}
      {resolved.length === 0 ? (
        <div className="card mt-4 p-6 text-center">
          <p className="text-sm text-ink-700/70">Add your medicines to see their generic equivalent, a price comparison, and an automatic safety check. Synced across your devices.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {resolved.map(({ rec, drug }) => (
            <div key={rec.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-ink-900">{drug ? drug.generic : rec.data.query}</p>
                  {drug && <p className="text-[11px] text-ink-700/50">you typed: {rec.data.query}</p>}
                </div>
                <button onClick={() => { deleteRecord(rec.id); reload(); }} aria-label="Remove" className="text-lg leading-none text-ink-700/40 hover:text-red-600">×</button>
              </div>
              {drug ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-cream-100 p-2">
                      <p className="text-ink-700/55">Branded</p>
                      <p className="font-bold text-ink-900">{drug.branded}</p>
                    </div>
                    <div className="rounded-lg p-2" style={{ background: 'rgba(47,158,107,.12)' }}>
                      <p className="text-ink-700/55">Generic {drug.jan ? '/ Jan Aushadhi' : ''}</p>
                      <p className="font-bold" style={{ color: '#237a52' }}>{drug.generprice}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-ink-700/60">Composition: {drug.actives.map((a) => a.name).join(' + ')}</p>
                  {drug.note && <p className="mt-1 text-[11px] font-semibold text-amber-700">{drug.note}</p>}
                  {drug.jan && (
                    <a href="https://www.google.com/maps/search/Jan+Aushadhi+Kendra+near+me" target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-bold text-clay-600 underline">Find a Jan Aushadhi store near me →</a>
                  )}
                </>
              ) : (
                <p className="mt-2 text-xs text-ink-700/60">Not in our common list — ask a pharmacist for the generic name, price and interactions.</p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-ink-700/45">
        Educational only — prices are approximate and vary by brand, city &amp; pack size. Generic substitution &amp; interactions must be confirmed with a pharmacist or doctor. Synced to your account.
      </p>
    </div>
  );
}
