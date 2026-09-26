import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getColl, addRow, updateRow, removeRow, seedOnce } from '../api/localdb';

/* Fully-functional HIS (Hospital Information System) module. Every screen reads
   and writes the provider's LOCAL store (encrypted SQLite on desktop,
   localStorage on web) — no data leaves the machine. */

const WARDS = [
  { name: 'ICU', beds: 10 },
  { name: 'Gen-A', beds: 20 },
  { name: 'Maternity', beds: 10 },
  { name: 'Peds', beds: 8 },
];
const TOTAL_BEDS = WARDS.reduce((s, w) => s + w.beds, 0);
const PAYERS = ['Self-pay', 'Star Health', 'Ayushman (PMJAY)', 'ICICI Lombard', 'Other TPA'];

const d10 = () => Math.floor(Math.random() * 10);
const genAbha = () => `${Array.from({ length: 2 }, d10).join('')}-${Array.from({ length: 4 }, d10).join('')}-${Array.from({ length: 4 }, d10).join('')}-${Array.from({ length: 4 }, d10).join('')}`;
const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const today = () => new Date().toISOString().slice(0, 10);
const days = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

type Adm = { id: string; name: string; age: string; sex: string; abha: string; ward: string; bed: string; doctor: string; status: string; admittedAt: string; dischargedAt?: string };
type Bill = { id: string; name: string; amount: number; payer: string; status: string; createdAt: string };
type Drug = { id: string; drug: string; stock: number; batch: string; expiry: string };
type Task = { id: string; name: string; task: string; done: boolean; at: string };

const TABS = [
  ['dash', 'Dashboard · MRD'],
  ['adt', 'Registration & ADT'],
  ['beds', 'Beds & Wards'],
  ['billing', 'Billing & TPA'],
  ['pharmacy', 'Pharmacy'],
  ['nursing', 'Nursing'],
] as const;

export default function HisWorkspace() {
  const nav = useNavigate();
  const [tab, setTab] = useState<string>('dash');
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    seedOnce('his_v1', () => {
      const now = Date.now();
      const seedAdm = (o: Partial<Adm>, agoDays: number) => addRow<Adm>('his_adm', {
        name: o.name!, age: o.age || '—', sex: o.sex || '', abha: o.abha || genAbha(),
        ward: o.ward!, bed: o.bed!, doctor: o.doctor || 'Dr. Sanjay Anbu',
        status: 'Admitted', admittedAt: new Date(now - agoDays * 86400000).toISOString(),
      } as Omit<Adm, 'id'>);
      seedAdm({ name: 'Rajesh Kumar', age: '54', sex: 'M', ward: 'ICU', bed: 'ICU-2' }, 3);
      seedAdm({ name: 'Meena Iyer', age: '31', sex: 'F', ward: 'Maternity', bed: 'Maternity-1' }, 1);
      seedAdm({ name: 'Arjun Rao', age: '8', sex: 'M', ward: 'Peds', bed: 'Peds-1' }, 0);
      addRow<Bill>('his_bills', { name: 'Rajesh Kumar', amount: 120000, payer: 'Star Health', status: 'Approved', createdAt: new Date().toISOString() } as Omit<Bill, 'id'>);
      addRow<Bill>('his_bills', { name: 'Meena Iyer', amount: 45000, payer: 'Ayushman (PMJAY)', status: 'Pending', createdAt: new Date().toISOString() } as Omit<Bill, 'id'>);
      addRow<Drug>('his_pharm', { drug: 'Metformin 1000mg', stock: 30, batch: 'MET2291', expiry: '2027-04' } as Omit<Drug, 'id'>);
      addRow<Drug>('his_pharm', { drug: 'Amlodipine 5mg', stock: 8, batch: 'AML1180', expiry: '2026-11' } as Omit<Drug, 'id'>);
      addRow<Drug>('his_pharm', { drug: 'Insulin Glargine', stock: 15, batch: 'INS4521', expiry: '2026-08' } as Omit<Drug, 'id'>);
    });
    refresh();
  }, []);

  const adm = getColl<Adm>('his_adm');
  const bills = getColl<Bill>('his_bills');
  const pharm = getColl<Drug>('his_pharm');
  const nursing = getColl<Task>('his_nursing');
  const activeAdm = adm.filter((a) => a.status === 'Admitted');

  const occupied = activeAdm.length;
  const admToday = adm.filter((a) => a.admittedAt.slice(0, 10) === today()).length;
  const pending = bills.filter((b) => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
  const discharged = adm.filter((a) => a.status === 'Discharged' && a.dischargedAt);
  const alos = discharged.length ? (discharged.reduce((s, a) => s + days(a.admittedAt, a.dischargedAt!), 0) / discharged.length).toFixed(1) + 'd' : '—';

  const freeBed = (ward: string): string | null => {
    const cap = WARDS.find((w) => w.name === ward)?.beds || 0;
    const used = new Set(activeAdm.filter((a) => a.ward === ward).map((a) => a.bed));
    for (let i = 1; i <= cap; i++) { const b = `${ward}-${i}`; if (!used.has(b)) return b; }
    return null;
  };

  const explain = () => {
    try { sessionStorage.setItem('meddroid_pending', JSON.stringify({ q: 'Explain my hospital admission and bill to me in simple Hindi — what does it mean and what should I do next?', spec: 'General Physician' })); } catch { /* ignore */ }
    nav('/assistant');
  };

  return (
    <div className="mock his">
      <div className="mhead">
        <div><div className="mtitle">HIS</div><div className="mfull">Hospital Information System · live · on this device</div></div>
        <span className="badge">Core clinical</span>
        <button className="md-chip" onClick={explain}><span className="r" />MedDroid · Explain in Hindi</button>
      </div>

      <div className="pipe"><span className="pl">ABDM / HL7</span><span className="node">Registration</span><span className="node">ADT</span><span className="node">Billing</span><span className="node">Napier HIS core</span><span className="live"><span className="d" />LIVE</span></div>

      <div className="htabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'htab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'dash' && (
        <>
          <div className="kpis">
            <div className="tile"><div className="v">{occupied}/{TOTAL_BEDS}</div><div className="l">Beds occupied</div><div className="s">{Math.round((occupied / TOTAL_BEDS) * 100)}% capacity</div></div>
            <div className="tile"><div className="v">{admToday}</div><div className="l">Admissions today</div></div>
            <div className="tile"><div className="v">{inr(pending)}</div><div className="l">Pending bills</div><div className="s">{bills.filter((b) => b.status === 'Pending').length} invoices</div></div>
            <div className="tile"><div className="v">{alos}</div><div className="l">Avg length of stay</div></div>
          </div>
          <div className="cols">
            <div className="panel"><h3>Current admissions <span className="c">live ADT</span></h3>
              <div className="tblwrap"><table><thead><tr><th>Patient</th><th>ABHA</th><th>Ward · Bed</th><th>Status</th></tr></thead><tbody>
                {activeAdm.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--sub)' }}>No admissions yet — add one in Registration & ADT.</td></tr>}
                {activeAdm.map((a) => (
                  <tr key={a.id}><td>{a.name} · {a.age}{a.sex}</td><td>{a.abha}</td><td>{a.bed}</td><td><span className="st ok">Admitted</span></td></tr>
                ))}
              </tbody></table></div>
            </div>
            <div className="panel"><h3>Ward occupancy</h3>
              <div className="wardgrid">
                {WARDS.map((w) => {
                  const occ = activeAdm.filter((a) => a.ward === w.name).length;
                  const pct = Math.round((occ / w.beds) * 100);
                  return <div className="ward" key={w.name}><div className="wn"><span>{w.name}</span><span>{occ}/{w.beds}</span></div><div className="bar"><i style={{ width: pct + '%' }} /></div></div>;
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'adt' && <ADT wards={WARDS} freeBed={freeBed} adm={activeAdm} onChange={refresh} />}
      {tab === 'beds' && (
        <div className="panel"><h3>Bed board</h3>
          <div className="bedwards">
            {WARDS.map((w) => {
              const beds = Array.from({ length: w.beds }, (_, i) => `${w.name}-${i + 1}`);
              const byBed = new Map(activeAdm.filter((a) => a.ward === w.name).map((a) => [a.bed, a]));
              return (
                <div className="bedward" key={w.name}>
                  <div className="wn"><b>{w.name}</b><span>{byBed.size}/{w.beds}</span></div>
                  <div className="bedgrid">
                    {beds.map((b) => { const a = byBed.get(b); return <div key={b} className={'bed' + (a ? ' occ' : '')} title={a ? a.name : b}>{a ? a.name.split(' ')[0] : '·'}</div>; })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tab === 'billing' && <Billing bills={bills} onChange={refresh} />}
      {tab === 'pharmacy' && <Pharmacy pharm={pharm} onChange={refresh} />}
      {tab === 'nursing' && <Nursing nursing={nursing} patients={activeAdm.map((a) => a.name)} onChange={refresh} />}
    </div>
  );
}

/* ---------------- Registration & ADT ---------------- */
function ADT({ wards, freeBed, adm, onChange }: { wards: typeof WARDS; freeBed: (w: string) => string | null; adm: Adm[]; onChange: () => void }) {
  const [name, setName] = useState(''); const [age, setAge] = useState(''); const [sex, setSex] = useState('M');
  const [abha, setAbha] = useState(''); const [ward, setWard] = useState(wards[0].name); const [doctor, setDoctor] = useState('');
  const [err, setErr] = useState('');
  const admit = () => {
    if (!name.trim()) { setErr('Enter patient name'); return; }
    const bed = freeBed(ward);
    if (!bed) { setErr(`${ward} is full — choose another ward`); return; }
    addRow<Adm>('his_adm', { name: name.trim(), age: age.trim() || '—', sex, abha: abha.trim() || genAbha(), ward, bed, doctor: doctor.trim() || 'Dr. Sanjay Anbu', status: 'Admitted', admittedAt: new Date().toISOString() } as Omit<Adm, 'id'>);
    setName(''); setAge(''); setAbha(''); setDoctor(''); setErr(''); onChange();
  };
  const discharge = (a: Adm) => { updateRow('his_adm', a.id, { status: 'Discharged', dischargedAt: new Date().toISOString() }); onChange(); };
  const transfer = (a: Adm) => {
    const to = window.prompt(`Transfer ${a.name} to which ward?\n${wards.map((w) => w.name).join(', ')}`, a.ward);
    if (!to) return; const w = wards.find((x) => x.name.toLowerCase() === to.trim().toLowerCase()); if (!w) { window.alert('Unknown ward'); return; }
    const bed = freeBed(w.name); if (!bed) { window.alert(`${w.name} is full`); return; }
    updateRow('his_adm', a.id, { ward: w.name, bed }); onChange();
  };
  return (
    <div className="cols">
      <div className="panel"><h3>Register &amp; admit</h3>
        <div className="frm">
          <label className="f"><span>Patient name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rohan Das" /></label>
          <div className="frow">
            <label className="f" style={{ flex: '0 0 70px' }}><span>Age</span><input value={age} onChange={(e) => setAge(e.target.value)} placeholder="42" /></label>
            <div className="f"><span>Sex</span><div className="seg sm">{['M', 'F'].map((s) => <button key={s} aria-pressed={sex === s} onClick={() => setSex(s)}>{s}</button>)}</div></div>
          </div>
          <label className="f"><span>ABHA (14-digit) · blank = auto</span><input value={abha} onChange={(e) => setAbha(e.target.value)} placeholder="XX-XXXX-XXXX-XXXX" /></label>
          <div className="frow">
            <label className="f"><span>Ward</span><select value={ward} onChange={(e) => setWard(e.target.value)}>{wards.map((w) => <option key={w.name} value={w.name}>{w.name}</option>)}</select></label>
            <label className="f"><span>Doctor</span><input value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="Dr. …" /></label>
          </div>
          {err && <div className="ferr">{err}</div>}
          <button className="tbtn run" onClick={admit}>Admit patient →</button>
        </div>
      </div>
      <div className="panel"><h3>Admitted patients <span className="c">{adm.length}</span></h3>
        <div className="tblwrap"><table><thead><tr><th>Patient</th><th>Ward · Bed</th><th></th></tr></thead><tbody>
          {adm.length === 0 && <tr><td colSpan={3} style={{ color: 'var(--sub)' }}>No one admitted.</td></tr>}
          {adm.map((a) => (
            <tr key={a.id}><td>{a.name}<br /><small style={{ color: 'var(--sub)' }}>{a.abha}</small></td><td>{a.bed}</td>
              <td style={{ whiteSpace: 'nowrap' }}><button className="wbtn xs" onClick={() => transfer(a)}>Transfer</button> <button className="wbtn xs" onClick={() => discharge(a)}>Discharge</button></td></tr>
          ))}
        </tbody></table></div>
      </div>
    </div>
  );
}

/* ---------------- Billing & TPA ---------------- */
function Billing({ bills, onChange }: { bills: Bill[]; onChange: () => void }) {
  const [name, setName] = useState(''); const [amount, setAmount] = useState(''); const [payer, setPayer] = useState(PAYERS[0]);
  const add = () => { if (!name.trim() || !amount) return; addRow<Bill>('his_bills', { name: name.trim(), amount: Number(amount) || 0, payer, status: 'Pending', createdAt: new Date().toISOString() } as Omit<Bill, 'id'>); setName(''); setAmount(''); onChange(); };
  const setStatus = (b: Bill, status: string) => { updateRow('his_bills', b.id, { status }); onChange(); };
  const stcls = (s: string) => s === 'Paid' || s === 'Approved' ? 'ok' : s === 'Denied' ? 'bad' : 'warn';
  return (
    <div className="cols">
      <div className="panel"><h3>New bill / claim</h3>
        <div className="frm">
          <label className="f"><span>Patient</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient name" /></label>
          <label className="f"><span>Amount (₹)</span><input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="120000" inputMode="numeric" /></label>
          <label className="f"><span>Payer / TPA</span><select value={payer} onChange={(e) => setPayer(e.target.value)}>{PAYERS.map((p) => <option key={p}>{p}</option>)}</select></label>
          <button className="tbtn run" onClick={add}>Create bill →</button>
        </div>
      </div>
      <div className="panel"><h3>Bills &amp; claims</h3>
        <div className="tblwrap"><table><thead><tr><th>Patient</th><th>Payer</th><th>Amount</th><th>Status</th></tr></thead><tbody>
          {bills.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--sub)' }}>No bills yet.</td></tr>}
          {bills.map((b) => (
            <tr key={b.id}><td>{b.name}</td><td>{b.payer}</td><td>{inr(b.amount)}</td>
              <td><span className={'st ' + stcls(b.status)}>{b.status}</span>
                <div className="rowacts">{['Approved', 'Paid', 'Denied'].filter((s) => s !== b.status).map((s) => <button key={s} className="wbtn xs" onClick={() => setStatus(b, s)}>{s}</button>)}</div>
              </td></tr>
          ))}
        </tbody></table></div>
      </div>
    </div>
  );
}

/* ---------------- Pharmacy & inventory ---------------- */
function Pharmacy({ pharm, onChange }: { pharm: Drug[]; onChange: () => void }) {
  const [drug, setDrug] = useState(''); const [stock, setStock] = useState(''); const [batch, setBatch] = useState(''); const [expiry, setExpiry] = useState('');
  const add = () => { if (!drug.trim()) return; addRow<Drug>('his_pharm', { drug: drug.trim(), stock: Number(stock) || 0, batch: batch.trim() || '—', expiry: expiry.trim() || '—' } as Omit<Drug, 'id'>); setDrug(''); setStock(''); setBatch(''); setExpiry(''); onChange(); };
  const dispense = (d: Drug) => { const q = Number(window.prompt(`Dispense how many of ${d.drug}? (stock ${d.stock})`, '1')); if (!q || q <= 0) return; updateRow('his_pharm', d.id, { stock: Math.max(0, d.stock - q) }); onChange(); };
  return (
    <div className="cols">
      <div className="panel"><h3>Add stock</h3>
        <div className="frm">
          <label className="f"><span>Drug</span><input value={drug} onChange={(e) => setDrug(e.target.value)} placeholder="e.g. Paracetamol 500mg" /></label>
          <div className="frow">
            <label className="f"><span>Stock</span><input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="100" inputMode="numeric" /></label>
            <label className="f"><span>Batch</span><input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="B1234" /></label>
          </div>
          <label className="f"><span>Expiry (YYYY-MM)</span><input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="2027-06" /></label>
          <button className="tbtn run" onClick={add}>Add to inventory →</button>
        </div>
      </div>
      <div className="panel"><h3>Inventory</h3>
        <div className="tblwrap"><table><thead><tr><th>Drug</th><th>Stock</th><th>Batch</th><th>Expiry</th><th></th></tr></thead><tbody>
          {pharm.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--sub)' }}>No stock.</td></tr>}
          {pharm.map((d) => (
            <tr key={d.id}><td>{d.drug}</td><td>{d.stock <= 10 ? <span className="st bad">{d.stock} low</span> : d.stock}</td><td>{d.batch}</td><td>{d.expiry}</td>
              <td><button className="wbtn xs" onClick={() => dispense(d)}>Dispense</button></td></tr>
          ))}
        </tbody></table></div>
      </div>
    </div>
  );
}

/* ---------------- Nursing & ward workflow ---------------- */
function Nursing({ nursing, patients, onChange }: { nursing: Task[]; patients: string[]; onChange: () => void }) {
  const [name, setName] = useState(patients[0] || ''); const [task, setTask] = useState('');
  const add = () => { if (!task.trim()) return; addRow<Task>('his_nursing', { name: name || patients[0] || '—', task: task.trim(), done: false, at: new Date().toISOString() } as Omit<Task, 'id'>); setTask(''); onChange(); };
  const toggle = (t: Task) => { updateRow('his_nursing', t.id, { done: !t.done }); onChange(); };
  const del = (t: Task) => { removeRow('his_nursing', t.id); onChange(); };
  return (
    <div className="cols">
      <div className="panel"><h3>Log task / vital</h3>
        <div className="frm">
          <label className="f"><span>Patient</span><select value={name} onChange={(e) => setName(e.target.value)}>{patients.length === 0 && <option value="">No admitted patients</option>}{patients.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="f"><span>Task / vital</span><input value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. BP 130/85 · give insulin 10U" /></label>
          <button className="tbtn run" onClick={add}>Add task →</button>
        </div>
      </div>
      <div className="panel"><h3>Ward tasks</h3>
        <div className="list">
          {nursing.length === 0 && <div style={{ color: 'var(--sub)', fontSize: 13 }}>No tasks logged.</div>}
          {nursing.map((t) => (
            <div className="li" key={t.id}>
              <button className="chkbox" aria-pressed={t.done} onClick={() => toggle(t)}>{t.done ? '✓' : ''}</button>
              <div className="g" style={{ textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.6 : 1 }}>{t.task}<small>{t.name}</small></div>
              <button className="wbtn xs" onClick={() => del(t)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
