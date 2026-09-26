import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getColl, addRow, updateRow, seedOnce } from '../api/localdb';

/* Fully-functional CPOE / e-Prescribing. A clinician places orders for a patient;
   the orders ROUTE into the other live systems:
     • Lab order      → creates a LIS accession (appears in the LIS worklist)
     • Medication     → added to the EMR active med list
     • Radiology      → logged as an imaging order
   Every order is checked against the patient's EMR allergies before it is placed.
   All data stays on the provider's machine. */

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const fmtt = (iso: string) => { try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };

type Adm = { id: string; name: string; age: string; sex: string; abha: string; status: string };
type Pat = { id: string; name: string; age: string; sex: string; abha: string };
type Person = { key: string; name: string; age: string; sex: string; abha: string; source: 'HIS' | 'EMR' };
type Allergy = { id: string; key: string; allergen: string };
type CpoeOrder = { id: string; key: string; name: string; kind: 'Lab' | 'Medication' | 'Radiology'; detail: string; status: string; at: string };

const LABS: { test: string; unit: string; ref: string; sample: string }[] = [
  { test: 'Complete blood count', unit: '', ref: 'see report', sample: 'EDTA blood' },
  { test: 'Fasting glucose', unit: 'mg/dL', ref: '70-110', sample: 'Fluoride plasma' },
  { test: 'HbA1c', unit: '%', ref: '<5.7', sample: 'EDTA blood' },
  { test: 'Creatinine', unit: 'mg/dL', ref: '0.6-1.2', sample: 'Serum' },
  { test: 'Lipid profile', unit: '', ref: 'see report', sample: 'Serum' },
  { test: 'TSH', unit: 'µIU/mL', ref: '0.4-4.0', sample: 'Serum' },
];
const DRUGS = ['Amoxicillin', 'Azithromycin', 'Metformin', 'Amlodipine', 'Atorvastatin', 'Salbutamol', 'Tiotropium', 'Pantoprazole', 'Paracetamol', 'Insulin Glargine'];
const FREQS = ['OD', 'BD', 'TDS', 'QID', 'HS', 'SOS'];
const RADS = ['Chest X-ray (PA)', 'CT chest', 'USG abdomen', 'MRI brain', 'ECG', '2D Echo'];

// Order sets: one click places a bundle.
const ORDER_SETS: { name: string; labs?: string[]; meds?: { drug: string; dose: string; freq: string }[]; rads?: string[] }[] = [
  { name: 'Diabetes work-up', labs: ['HbA1c', 'Fasting glucose', 'Creatinine', 'Lipid profile'] },
  { name: 'COPD admission', labs: ['Complete blood count'], rads: ['Chest X-ray (PA)'], meds: [{ drug: 'Salbutamol', dose: '2 puffs', freq: 'QID' }, { drug: 'Tiotropium', dose: '18mcg', freq: 'OD' }] },
  { name: 'Fever panel', labs: ['Complete blood count', 'Creatinine'], meds: [{ drug: 'Paracetamol', dose: '500mg', freq: 'TDS' }] },
];

const nextAcc = () => 'LAB-' + today().replace(/-/g, '').slice(2) + '-' + String(getColl('lis_orders').length + 1).padStart(4, '0');

const TABS = [
  ['dash', 'Dashboard'],
  ['new', 'New order'],
  ['sets', 'Order sets'],
  ['active', 'Active orders'],
] as const;

export default function CpoeWorkspace() {
  const nav = useNavigate();
  const [tab, setTab] = useState<string>('new');
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    seedOnce('cpoe_v1', () => {
      addRow<CpoeOrder>('cpoe_orders', { key: '11-2233-4455-6677', name: 'Lakshmi Narayan', kind: 'Medication', detail: 'Tiotropium 18mcg OD', status: 'Active', at: now() } as Omit<CpoeOrder, 'id'>);
    });
    refresh();
  }, []);

  const adm = getColl<Adm>('his_adm').filter((a) => a.status === 'Admitted');
  const outpatients = getColl<Pat>('emr_patients');
  const map = new Map<string, Person>();
  outpatients.forEach((p) => map.set(p.abha, { key: p.abha, name: p.name, age: p.age, sex: p.sex, abha: p.abha, source: 'EMR' }));
  adm.forEach((a) => map.set(a.abha, { key: a.abha, name: a.name, age: a.age, sex: a.sex, abha: a.abha, source: 'HIS' }));
  const people = [...map.values()];

  const orders = getColl<CpoeOrder>('cpoe_orders');
  const todayOrders = orders.filter((o) => o.at.slice(0, 10) === today());

  const explain = () => {
    try { sessionStorage.setItem('meddroid_pending', JSON.stringify({ q: 'Explain the tests and medicines my doctor has ordered for me, in simple Hindi — what each is for and how to take them.', spec: 'General Physician' })); } catch { /* ignore */ }
    nav('/assistant');
  };

  return (
    <div className="mock cpoe">
      <div className="mhead">
        <div><div className="mtitle">CPOE</div><div className="mfull">Computerised Physician Order Entry · e-Prescribing · live</div></div>
        <span className="badge">Core clinical</span>
        <button className="md-chip" onClick={explain}><span className="r" />MedDroid · Explain in Hindi</button>
      </div>

      <div className="pipe"><span className="pl">Orders route to</span><span className="node">→ LIS (labs)</span><span className="node">→ EMR (meds)</span><span className="node">→ Radiology</span><span className="node">allergy-checked</span><span className="live"><span className="d" />LIVE</span></div>

      <div className="htabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'htab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'dash' && (
        <>
          <div className="kpis">
            <div className="tile"><div className="v">{orders.filter((o) => o.status === 'Active').length}</div><div className="l">Active orders</div></div>
            <div className="tile"><div className="v">{todayOrders.filter((o) => o.kind === 'Medication').length}</div><div className="l">Meds ordered today</div></div>
            <div className="tile"><div className="v">{todayOrders.filter((o) => o.kind === 'Lab').length}</div><div className="l">Labs ordered today</div></div>
            <div className="tile"><div className="v">{todayOrders.filter((o) => o.kind === 'Radiology').length}</div><div className="l">Imaging ordered today</div></div>
          </div>
          <div className="cols">
            <div className="panel"><h3>Recent orders <span className="c">live</span></h3>
              <div className="tblwrap"><table><thead><tr><th>Patient</th><th>Order</th><th>Type</th><th>When</th></tr></thead><tbody>
                {orders.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--sub)' }}>No orders yet.</td></tr>}
                {orders.slice(0, 8).map((o) => (
                  <tr key={o.id}><td>{o.name}</td><td>{o.detail}</td><td><span className={'st ' + kcls(o.kind)}>{o.kind}</span></td><td><small>{fmtt(o.at)}</small></td></tr>
                ))}
              </tbody></table></div>
            </div>
            <div className="panel"><h3>Where orders go</h3>
              <div className="list">
                <div className="li"><div className="ic">🧪</div><div className="g">Lab orders<small>Appear in the LIS worklist for collection &amp; result</small></div></div>
                <div className="li"><div className="ic">💊</div><div className="g">Medications<small>Added to the EMR active medication list</small></div></div>
                <div className="li"><div className="ic">🩻</div><div className="g">Radiology<small>Logged as imaging orders</small></div></div>
                <div className="li"><div className="ic">🛡️</div><div className="g">Allergy safety<small>Every med is checked against EMR allergies</small></div></div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'new' && <NewOrder people={people} onChange={refresh} />}
      {tab === 'sets' && <OrderSets people={people} onChange={refresh} goActive={() => setTab('active')} />}
      {tab === 'active' && (
        <div className="panel"><h3>Active orders <span className="c">{orders.length}</span></h3>
          <div className="tblwrap"><table><thead><tr><th>Patient</th><th>Order</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>
            {orders.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--sub)' }}>No orders.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id}><td>{o.name}</td><td>{o.detail}</td><td><span className={'st ' + kcls(o.kind)}>{o.kind}</span></td>
                <td><span className={'st ' + (o.status === 'Active' ? 'ok' : 'info')}>{o.status}</span></td>
                <td>{o.status === 'Active' && <button className="wbtn xs" onClick={() => { updateRow('cpoe_orders', o.id, { status: 'Discontinued' }); refresh(); }}>Discontinue</button>}</td></tr>
            ))}
          </tbody></table></div>
        </div>
      )}
    </div>
  );
}

function kcls(k: string) { return k === 'Lab' ? 'info' : k === 'Medication' ? 'ok' : 'warn'; }

/* Allergy check: does a drug name collide with any recorded allergen? */
function allergyHit(key: string, drug: string): string | null {
  const d = drug.toLowerCase();
  const hits = getColl<Allergy>('emr_allergies').filter((a) => a.key === key).filter((a) => {
    const w = a.allergen.toLowerCase().replace(/s$/, '');
    return w.length > 2 && (d.includes(w) || w.includes(d.split(' ')[0]));
  });
  return hits.length ? hits.map((h) => h.allergen).join(', ') : null;
}

/* ---------------- New order ---------------- */
function NewOrder({ people, onChange }: { people: Person[]; onChange: () => void }) {
  const [key, setKey] = useState(people[0]?.key || '');
  const [kind, setKind] = useState<'Lab' | 'Medication' | 'Radiology'>('Lab');
  const [lab, setLab] = useState(LABS[0].test);
  const [drug, setDrug] = useState(DRUGS[0]); const [dose, setDose] = useState(''); const [freq, setFreq] = useState('OD');
  const [rad, setRad] = useState(RADS[0]);
  const [msg, setMsg] = useState<{ t: 'ok' | 'warn'; s: string } | null>(null);
  const person = useMemo(() => people.find((p) => p.key === key) || null, [people, key]);
  const allergyWarn = kind === 'Medication' && person ? allergyHit(person.key, drug) : null;

  const place = () => {
    if (!person) { setMsg({ t: 'warn', s: 'Select a patient first (register in EMR or admit in HIS).' }); return; }
    if (kind === 'Lab') {
      const c = LABS.find((x) => x.test === lab)!;
      const acc = nextAcc();
      addRow('lis_orders', { key: person.key, name: person.name, test: c.test, unit: c.unit, ref: c.ref, sample: c.sample, acc, status: 'Ordered', value: '', flag: '', orderedAt: now() });
      addRow<CpoeOrder>('cpoe_orders', { key: person.key, name: person.name, kind: 'Lab', detail: `${c.test} (${acc})`, status: 'Active', at: now() } as Omit<CpoeOrder, 'id'>);
      setMsg({ t: 'ok', s: `Lab ordered → sent to LIS worklist (${acc}).` });
    } else if (kind === 'Medication') {
      if (allergyWarn && !window.confirm(`⚠ ALLERGY ALERT\n${person.name} is allergic to ${allergyWarn}.\nOrder ${drug} anyway?`)) return;
      const detail = `${drug} ${dose.trim() || '—'} ${freq}`;
      addRow('emr_meds', { key: person.key, drug, dose: dose.trim() || '—', freq, status: 'Active', since: today() });
      addRow<CpoeOrder>('cpoe_orders', { key: person.key, name: person.name, kind: 'Medication', detail, status: 'Active', at: now() } as Omit<CpoeOrder, 'id'>);
      setMsg({ t: 'ok', s: `Prescribed → added to EMR med list${allergyWarn ? ' (allergy override recorded)' : ''}.` });
      setDose('');
    } else {
      addRow<CpoeOrder>('cpoe_orders', { key: person.key, name: person.name, kind: 'Radiology', detail: rad, status: 'Active', at: now() } as Omit<CpoeOrder, 'id'>);
      setMsg({ t: 'ok', s: 'Imaging order placed.' });
    }
    onChange();
  };

  return (
    <div className="cols">
      <div className="panel"><h3>Place an order</h3>
        <div className="frm">
          <label className="f"><span>Patient</span>
            <select value={key} onChange={(e) => { setKey(e.target.value); setMsg(null); }}>
              {people.length === 0 && <option value="">No patients — add in EMR / HIS</option>}
              {people.map((p) => <option key={p.key} value={p.key}>{p.name} · {p.age}{p.sex} ({p.source})</option>)}
            </select>
          </label>
          <div className="f"><span>Order type</span><div className="seg" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            {(['Lab', 'Medication', 'Radiology'] as const).map((t) => <button key={t} aria-pressed={kind === t} onClick={() => { setKind(t); setMsg(null); }}>{t}</button>)}
          </div></div>

          {kind === 'Lab' && <label className="f"><span>Assay</span><select value={lab} onChange={(e) => setLab(e.target.value)}>{LABS.map((x) => <option key={x.test}>{x.test}</option>)}</select></label>}

          {kind === 'Medication' && <>
            <label className="f"><span>Drug</span><select value={drug} onChange={(e) => setDrug(e.target.value)}>{DRUGS.map((d) => <option key={d}>{d}</option>)}</select></label>
            <div className="frow">
              <label className="f"><span>Dose</span><input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 500mg" /></label>
              <label className="f"><span>Frequency</span><select value={freq} onChange={(e) => setFreq(e.target.value)}>{FREQS.map((f) => <option key={f}>{f}</option>)}</select></label>
            </div>
            {allergyWarn && <div className="alertbox">⚠ Allergy: {person?.name} is allergic to <b>{allergyWarn}</b>. Ordering will require confirmation.</div>}
          </>}

          {kind === 'Radiology' && <label className="f"><span>Study</span><select value={rad} onChange={(e) => setRad(e.target.value)}>{RADS.map((r) => <option key={r}>{r}</option>)}</select></label>}

          {msg && <div className={msg.t === 'ok' ? 'okbox' : 'ferr'}>{msg.s}</div>}
          <button className="tbtn run" onClick={place}>Sign &amp; place order →</button>
        </div>
      </div>
      <div className="panel"><h3>Order routing</h3>
        <div className="mini" style={{ lineHeight: 1.8 }}>
          Orders you place here don't stay in a silo — they flow into the systems that act on them:
        </div>
        <div className="list" style={{ marginTop: 10 }}>
          <div className="li"><div className="ic">🧪</div><div className="g">Lab → LIS<small>Generates an accession; shows in the LIS worklist to collect &amp; result</small></div></div>
          <div className="li"><div className="ic">💊</div><div className="g">Medication → EMR<small>Appears on the patient's active medication list</small></div></div>
          <div className="li"><div className="ic">🩻</div><div className="g">Radiology<small>Logged as an imaging order (RIS/PACS next)</small></div></div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Order sets ---------------- */
function OrderSets({ people, onChange, goActive }: { people: Person[]; onChange: () => void; goActive: () => void }) {
  const [key, setKey] = useState(people[0]?.key || '');
  const [msg, setMsg] = useState('');
  const person = people.find((p) => p.key === key) || null;
  const apply = (set: typeof ORDER_SETS[number]) => {
    if (!person) { setMsg('Select a patient first.'); return; }
    let n = 0;
    (set.labs || []).forEach((t) => {
      const c = LABS.find((x) => x.test === t); if (!c) return;
      const acc = nextAcc();
      addRow('lis_orders', { key: person.key, name: person.name, test: c.test, unit: c.unit, ref: c.ref, sample: c.sample, acc, status: 'Ordered', value: '', flag: '', orderedAt: now() });
      addRow('cpoe_orders', { key: person.key, name: person.name, kind: 'Lab', detail: `${c.test} (${acc})`, status: 'Active', at: now() }); n++;
    });
    (set.meds || []).forEach((m) => {
      addRow('emr_meds', { key: person.key, drug: m.drug, dose: m.dose, freq: m.freq, status: 'Active', since: today() });
      addRow('cpoe_orders', { key: person.key, name: person.name, kind: 'Medication', detail: `${m.drug} ${m.dose} ${m.freq}`, status: 'Active', at: now() }); n++;
    });
    (set.rads || []).forEach((r) => { addRow('cpoe_orders', { key: person.key, name: person.name, kind: 'Radiology', detail: r, status: 'Active', at: now() }); n++; });
    setMsg(`Placed ${n} orders from “${set.name}” for ${person.name}.`); onChange();
  };
  return (
    <div className="panel"><h3>Order sets <span className="c">one click places the bundle</span></h3>
      <div className="frm" style={{ maxWidth: 360 }}>
        <label className="f"><span>Patient</span>
          <select value={key} onChange={(e) => { setKey(e.target.value); setMsg(''); }}>
            {people.length === 0 && <option value="">No patients — add in EMR / HIS</option>}
            {people.map((p) => <option key={p.key} value={p.key}>{p.name} · {p.age}{p.sex} ({p.source})</option>)}
          </select>
        </label>
      </div>
      {msg && <div className="okbox" style={{ marginTop: 12 }}>{msg} <button className="wbtn xs" style={{ marginLeft: 8 }} onClick={goActive}>View active →</button></div>}
      <div className="setgrid">
        {ORDER_SETS.map((s) => (
          <div className="setcard" key={s.name}>
            <b>{s.name}</b>
            <div className="setitems">
              {(s.labs || []).map((l) => <span className="chip lab" key={'l' + l}>🧪 {l}</span>)}
              {(s.meds || []).map((m) => <span className="chip med" key={'m' + m.drug}>💊 {m.drug} {m.dose} {m.freq}</span>)}
              {(s.rads || []).map((r) => <span className="chip rad" key={'r' + r}>🩻 {r}</span>)}
            </div>
            <button className="tbtn run" onClick={() => apply(s)}>Place set →</button>
          </div>
        ))}
      </div>
    </div>
  );
}
