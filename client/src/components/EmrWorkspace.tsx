import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getColl, addRow, updateRow, removeRow, seedOnce } from '../api/localdb';

/* Fully-functional EMR / EHR module. The clinical counterpart to HIS: it shares
   the SAME local store, so a patient admitted in HIS appears here and their chart
   is one continuous record. All data stays on the provider's machine (encrypted
   SQLite on desktop, localStorage on web). */

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); } catch { return iso.slice(0, 10); } };

type Adm = { id: string; name: string; age: string; sex: string; abha: string; ward: string; bed: string; status: string; admittedAt: string };
type Pat = { id: string; name: string; age: string; sex: string; abha: string; phone?: string };
type Enc = { id: string; key: string; date: string; type: string; s: string; o: string; a: string; p: string; doctor: string };
type Prob = { id: string; key: string; problem: string; status: string; since: string };
type Allergy = { id: string; key: string; allergen: string; reaction: string; severity: string };
type Med = { id: string; key: string; drug: string; dose: string; freq: string; status: string; since: string };
type Vital = { id: string; key: string; date: string; bp: string; hr: string; temp: string; spo2: string; weight: string };
type Lab = { id: string; key: string; test: string; value: string; unit: string; ref: string; flag: string; date: string };

type Person = { key: string; name: string; age: string; sex: string; abha: string; source: 'HIS' | 'EMR'; ward?: string; bed?: string; status?: string; phone?: string };

const TABS = [
  ['patients', 'Patients'],
  ['chart', 'Chart & Notes'],
  ['problems', 'Problems · Allergies'],
  ['meds', 'Medications'],
  ['vitals', 'Vitals'],
  ['labs', 'Labs'],
] as const;

export default function EmrWorkspace() {
  const nav = useNavigate();
  const [tab, setTab] = useState<string>('patients');
  const [sel, setSel] = useState<string>('');
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    seedOnce('emr_v1', () => {
      const p1: Omit<Pat, 'id'> = { name: 'Lakshmi Narayan', age: '62', sex: 'F', abha: '11-2233-4455-6677', phone: '98400 11223' };
      const p2: Omit<Pat, 'id'> = { name: 'Imran Sheikh', age: '45', sex: 'M', abha: '22-3344-5566-7788', phone: '90030 44556' };
      addRow<Pat>('emr_patients', p1); addRow<Pat>('emr_patients', p2);
      const k1 = p1.abha;
      addRow<Enc>('emr_encounters', { key: k1, date: today(), type: 'OPD follow-up', s: 'Persistent breathlessness on exertion, worse for 2 weeks.', o: 'RR 22, SpO2 93% RA, bilateral rhonchi.', a: 'COPD — moderate exacerbation.', p: 'Start salbutamol MDI + tiotropium; review in 2 weeks; spirometry.', doctor: 'Dr. Sanjay Anbu' } as Omit<Enc, 'id'>);
      addRow<Prob>('emr_problems', { key: k1, problem: 'COPD (moderate)', status: 'Active', since: '2024' } as Omit<Prob, 'id'>);
      addRow<Prob>('emr_problems', { key: k1, problem: 'Type 2 Diabetes', status: 'Active', since: '2019' } as Omit<Prob, 'id'>);
      addRow<Allergy>('emr_allergies', { key: k1, allergen: 'Penicillin', reaction: 'Rash', severity: 'Moderate' } as Omit<Allergy, 'id'>);
      addRow<Med>('emr_meds', { key: k1, drug: 'Metformin', dose: '1000mg', freq: 'BD', status: 'Active', since: '2019' } as Omit<Med, 'id'>);
      addRow<Med>('emr_meds', { key: k1, drug: 'Tiotropium', dose: '18mcg', freq: 'OD', status: 'Active', since: today() } as Omit<Med, 'id'>);
      const now = Date.now();
      [['128/82', '92', '98.4', '93', '68'], ['132/86', '88', '98.1', '94', '68'], ['126/80', '84', '98.6', '96', '67']].forEach((v, i) =>
        addRow<Vital>('emr_vitals', { key: k1, date: new Date(now - (2 - i) * 30 * 86400000).toISOString().slice(0, 10), bp: v[0], hr: v[1], temp: v[2], spo2: v[3], weight: v[4] } as Omit<Vital, 'id'>));
      addRow<Lab>('emr_labs', { key: k1, test: 'HbA1c', value: '7.8', unit: '%', ref: '<5.7', flag: 'H', date: today() } as Omit<Lab, 'id'>);
      addRow<Lab>('emr_labs', { key: k1, test: 'Creatinine', value: '0.9', unit: 'mg/dL', ref: '0.6–1.2', flag: '', date: today() } as Omit<Lab, 'id'>);
    });
    refresh();
  }, []);

  // Merge HIS admissions + EMR-registered outpatients into one patient list (keyed by ABHA).
  const adm = getColl<Adm>('his_adm').filter((a) => a.status === 'Admitted');
  const outpatients = getColl<Pat>('emr_patients');
  const map = new Map<string, Person>();
  outpatients.forEach((p) => map.set(p.abha, { key: p.abha, name: p.name, age: p.age, sex: p.sex, abha: p.abha, source: 'EMR', phone: p.phone }));
  adm.forEach((a) => map.set(a.abha, { key: a.abha, name: a.name, age: a.age, sex: a.sex, abha: a.abha, source: 'HIS', ward: a.ward, bed: a.bed, status: a.status }));
  const people = [...map.values()];
  const person = people.find((p) => p.key === sel) || null;

  const encounters = getColl<Enc>('emr_encounters');
  const encToday = encounters.filter((e) => e.date === today()).length;
  const problems = getColl<Prob>('emr_problems');
  const activeProblems = problems.filter((p) => p.status === 'Active').length;
  const meds = getColl<Med>('emr_meds');

  const open = (key: string) => { setSel(key); setTab('chart'); };

  const explain = () => {
    try { sessionStorage.setItem('meddroid_pending', JSON.stringify({ q: 'Explain my medical record — my problems, medicines and recent test results — in simple Hindi, and what I should do next.', spec: 'General Physician' })); } catch { /* ignore */ }
    nav('/assistant');
  };

  return (
    <div className="mock emr">
      <div className="mhead">
        <div><div className="mtitle">EMR / EHR</div><div className="mfull">Electronic Medical Records · live · on this device</div></div>
        <span className="badge">Core clinical</span>
        <button className="md-chip" onClick={explain}><span className="r" />MedDroid · Explain in Hindi</button>
      </div>

      <div className="pipe"><span className="pl">ABDM / FHIR R4</span><span className="node">Chart</span><span className="node">Encounters</span><span className="node">Problems</span><span className="node">Orders</span><span className="live"><span className="d" />LIVE</span></div>

      {person && (
        <div className="ptbanner">
          <div className="pi"><b>{person.name}</b><span>{person.age}{person.sex} · ABHA {person.abha}{person.source === 'HIS' ? ` · Admitted ${person.bed}` : ''}</span></div>
          <span className={'st ' + (person.source === 'HIS' ? 'ok' : 'info')}>{person.source === 'HIS' ? 'Inpatient (from HIS)' : 'Outpatient'}</span>
          <button className="wbtn xs" onClick={() => { setSel(''); setTab('patients'); }}>Change patient</button>
        </div>
      )}

      <div className="htabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'htab' + (tab === k ? ' on' : '')} disabled={k !== 'patients' && !person} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'patients' && (
        <>
          <div className="kpis">
            <div className="tile"><div className="v">{people.length}</div><div className="l">Patients on file</div><div className="s">{adm.length} inpatient · {outpatients.length} OPD</div></div>
            <div className="tile"><div className="v">{encToday}</div><div className="l">Encounters today</div></div>
            <div className="tile"><div className="v">{activeProblems}</div><div className="l">Active problems</div></div>
            <div className="tile"><div className="v">{meds.filter((m) => m.status === 'Active').length}</div><div className="l">Active medications</div></div>
          </div>
          <div className="cols">
            <div className="panel"><h3>Patient list <span className="c">click to open chart</span></h3>
              <div className="tblwrap"><table><thead><tr><th>Patient</th><th>ABHA</th><th>Type</th><th></th></tr></thead><tbody>
                {people.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--sub)' }}>No patients yet — register one, or admit in HIS.</td></tr>}
                {people.map((p) => (
                  <tr key={p.key}><td>{p.name} · {p.age}{p.sex}</td><td>{p.abha}</td><td><span className={'st ' + (p.source === 'HIS' ? 'ok' : 'info')}>{p.source === 'HIS' ? 'Inpatient' : 'OPD'}</span></td>
                    <td><button className="wbtn xs" onClick={() => open(p.key)}>Open chart →</button></td></tr>
                ))}
              </tbody></table></div>
            </div>
            <NewPatient onChange={refresh} onOpen={open} />
          </div>
        </>
      )}

      {tab === 'chart' && person && <Chart pk={person.key} doctorDefault="Dr. Sanjay Anbu" onChange={refresh} />}
      {tab === 'problems' && person && <ProblemsAllergies pk={person.key} onChange={refresh} />}
      {tab === 'meds' && person && <Medications pk={person.key} onChange={refresh} />}
      {tab === 'vitals' && person && <Vitals pk={person.key} onChange={refresh} />}
      {tab === 'labs' && person && <Labs pk={person.key} onChange={refresh} />}
      {tab !== 'patients' && !person && <div className="panel"><h3>Select a patient</h3><div style={{ color: 'var(--sub)', fontSize: 13 }}>Open a chart from the Patients tab first.</div></div>}
    </div>
  );
}

/* ---------------- Register outpatient ---------------- */
function NewPatient({ onChange, onOpen }: { onChange: () => void; onOpen: (k: string) => void }) {
  const d10 = () => Math.floor(Math.random() * 10);
  const genAbha = () => `${Array.from({ length: 2 }, d10).join('')}-${Array.from({ length: 4 }, d10).join('')}-${Array.from({ length: 4 }, d10).join('')}-${Array.from({ length: 4 }, d10).join('')}`;
  const [name, setName] = useState(''); const [age, setAge] = useState(''); const [sex, setSex] = useState('M'); const [abha, setAbha] = useState(''); const [phone, setPhone] = useState(''); const [err, setErr] = useState('');
  const add = () => {
    if (!name.trim()) { setErr('Enter patient name'); return; }
    const key = abha.trim() || genAbha();
    addRow<Pat>('emr_patients', { name: name.trim(), age: age.trim() || '—', sex, abha: key, phone: phone.trim() } as Omit<Pat, 'id'>);
    setName(''); setAge(''); setAbha(''); setPhone(''); setErr(''); onChange(); onOpen(key);
  };
  return (
    <div className="panel"><h3>Register outpatient</h3>
      <div className="frm">
        <label className="f"><span>Patient name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Menon" /></label>
        <div className="frow">
          <label className="f" style={{ flex: '0 0 70px' }}><span>Age</span><input value={age} onChange={(e) => setAge(e.target.value)} placeholder="35" /></label>
          <div className="f"><span>Sex</span><div className="seg sm">{['M', 'F'].map((s) => <button key={s} aria-pressed={sex === s} onClick={() => setSex(s)}>{s}</button>)}</div></div>
        </div>
        <label className="f"><span>ABHA (14-digit) · blank = auto</span><input value={abha} onChange={(e) => setAbha(e.target.value)} placeholder="XX-XXXX-XXXX-XXXX" /></label>
        <label className="f"><span>Phone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9xxxxxxxxx" inputMode="tel" /></label>
        {err && <div className="ferr">{err}</div>}
        <button className="tbtn run" onClick={add}>Register &amp; open chart →</button>
      </div>
    </div>
  );
}

/* ---------------- Chart & SOAP notes ---------------- */
function Chart({ pk, doctorDefault, onChange }: { pk: string; doctorDefault: string; onChange: () => void }) {
  const [type, setType] = useState('OPD consult'); const [s, setS] = useState(''); const [o, setO] = useState(''); const [a, setA] = useState(''); const [p, setP] = useState(''); const [doctor, setDoctor] = useState(doctorDefault); const [err, setErr] = useState('');
  const encs = getColl<Enc>('emr_encounters').filter((e) => e.key === pk);
  const save = () => {
    if (!a.trim() && !s.trim()) { setErr('Add at least the Subjective or Assessment'); return; }
    addRow<Enc>('emr_encounters', { key: pk, date: today(), type, s: s.trim(), o: o.trim(), a: a.trim(), p: p.trim(), doctor: doctor.trim() || doctorDefault } as Omit<Enc, 'id'>);
    setS(''); setO(''); setA(''); setP(''); setErr(''); onChange();
  };
  return (
    <div className="cols">
      <div className="panel"><h3>New encounter · SOAP note</h3>
        <div className="frm">
          <div className="frow">
            <label className="f"><span>Type</span><select value={type} onChange={(e) => setType(e.target.value)}>{['OPD consult', 'OPD follow-up', 'Inpatient round', 'Emergency', 'Teleconsult'].map((t) => <option key={t}>{t}</option>)}</select></label>
            <label className="f"><span>Doctor</span><input value={doctor} onChange={(e) => setDoctor(e.target.value)} /></label>
          </div>
          <label className="f"><span>S · Subjective</span><textarea value={s} onChange={(e) => setS(e.target.value)} placeholder="Complaint / history" /></label>
          <label className="f"><span>O · Objective</span><textarea value={o} onChange={(e) => setO(e.target.value)} placeholder="Exam / findings" /></label>
          <label className="f"><span>A · Assessment</span><textarea value={a} onChange={(e) => setA(e.target.value)} placeholder="Diagnosis / impression" /></label>
          <label className="f"><span>P · Plan</span><textarea value={p} onChange={(e) => setP(e.target.value)} placeholder="Treatment / follow-up" /></label>
          {err && <div className="ferr">{err}</div>}
          <button className="tbtn run" onClick={save}>Sign &amp; save note →</button>
        </div>
      </div>
      <div className="panel"><h3>Encounter history <span className="c">{encs.length}</span></h3>
        <div className="list">
          {encs.length === 0 && <div style={{ color: 'var(--sub)', fontSize: 13 }}>No notes yet.</div>}
          {encs.map((e) => (
            <div className="enc" key={e.id}>
              <div className="ehd"><b>{e.type}</b><span>{fmt(e.date)} · {e.doctor}</span></div>
              {e.s && <div className="erow"><i>S</i>{e.s}</div>}
              {e.o && <div className="erow"><i>O</i>{e.o}</div>}
              {e.a && <div className="erow"><i>A</i>{e.a}</div>}
              {e.p && <div className="erow"><i>P</i>{e.p}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Problems & Allergies ---------------- */
function ProblemsAllergies({ pk, onChange }: { pk: string; onChange: () => void }) {
  const [prob, setProb] = useState(''); const [since, setSince] = useState('');
  const [allergen, setAllergen] = useState(''); const [reaction, setReaction] = useState(''); const [severity, setSeverity] = useState('Moderate');
  const problems = getColl<Prob>('emr_problems').filter((x) => x.key === pk);
  const allergies = getColl<Allergy>('emr_allergies').filter((x) => x.key === pk);
  const addProb = () => { if (!prob.trim()) return; addRow<Prob>('emr_problems', { key: pk, problem: prob.trim(), status: 'Active', since: since.trim() || String(new Date().getFullYear()) } as Omit<Prob, 'id'>); setProb(''); setSince(''); onChange(); };
  const toggle = (x: Prob) => { updateRow('emr_problems', x.id, { status: x.status === 'Active' ? 'Resolved' : 'Active' }); onChange(); };
  const addAll = () => { if (!allergen.trim()) return; addRow<Allergy>('emr_allergies', { key: pk, allergen: allergen.trim(), reaction: reaction.trim() || '—', severity } as Omit<Allergy, 'id'>); setAllergen(''); setReaction(''); onChange(); };
  return (
    <div className="cols">
      <div className="panel"><h3>Problem list</h3>
        <div className="frm frow">
          <label className="f"><span>Problem</span><input value={prob} onChange={(e) => setProb(e.target.value)} placeholder="e.g. Hypertension" /></label>
          <label className="f" style={{ flex: '0 0 90px' }}><span>Since</span><input value={since} onChange={(e) => setSince(e.target.value)} placeholder="2021" /></label>
        </div>
        <button className="tbtn run" style={{ marginTop: 10 }} onClick={addProb}>Add problem →</button>
        <div className="tblwrap" style={{ marginTop: 12 }}><table><thead><tr><th>Problem</th><th>Since</th><th>Status</th></tr></thead><tbody>
          {problems.length === 0 && <tr><td colSpan={3} style={{ color: 'var(--sub)' }}>No problems recorded.</td></tr>}
          {problems.map((x) => (
            <tr key={x.id}><td>{x.problem}</td><td>{x.since}</td>
              <td><button className={'st ' + (x.status === 'Active' ? 'warn' : 'ok')} style={{ border: 0, cursor: 'pointer' }} onClick={() => toggle(x)}>{x.status}</button></td></tr>
          ))}
        </tbody></table></div>
      </div>
      <div className="panel"><h3>Allergies <span className="c">safety</span></h3>
        <div className="frm">
          <label className="f"><span>Allergen</span><input value={allergen} onChange={(e) => setAllergen(e.target.value)} placeholder="e.g. Sulfa drugs" /></label>
          <div className="frow">
            <label className="f"><span>Reaction</span><input value={reaction} onChange={(e) => setReaction(e.target.value)} placeholder="Hives" /></label>
            <label className="f"><span>Severity</span><select value={severity} onChange={(e) => setSeverity(e.target.value)}>{['Mild', 'Moderate', 'Severe'].map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
          <button className="tbtn run" onClick={addAll}>Add allergy →</button>
        </div>
        <div className="list" style={{ marginTop: 12 }}>
          {allergies.length === 0 && <div style={{ color: 'var(--sub)', fontSize: 13 }}>No known allergies.</div>}
          {allergies.map((x) => (
            <div className="li" key={x.id}><div className="ic" style={{ color: 'var(--bad)' }}>!</div><div className="g">{x.allergen}<small>{x.reaction}</small></div><span className={'st ' + (x.severity === 'Severe' ? 'bad' : x.severity === 'Moderate' ? 'warn' : 'info')}>{x.severity}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Medications ---------------- */
function Medications({ pk, onChange }: { pk: string; onChange: () => void }) {
  const [drug, setDrug] = useState(''); const [dose, setDose] = useState(''); const [freq, setFreq] = useState('OD');
  const meds = getColl<Med>('emr_meds').filter((m) => m.key === pk);
  const add = () => { if (!drug.trim()) return; addRow<Med>('emr_meds', { key: pk, drug: drug.trim(), dose: dose.trim() || '—', freq, status: 'Active', since: today() } as Omit<Med, 'id'>); setDrug(''); setDose(''); onChange(); };
  const toggle = (m: Med) => { updateRow('emr_meds', m.id, { status: m.status === 'Active' ? 'Stopped' : 'Active' }); onChange(); };
  return (
    <div className="cols">
      <div className="panel"><h3>Prescribe medication</h3>
        <div className="frm">
          <label className="f"><span>Drug</span><input value={drug} onChange={(e) => setDrug(e.target.value)} placeholder="e.g. Amlodipine" /></label>
          <div className="frow">
            <label className="f"><span>Dose</span><input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="5mg" /></label>
            <label className="f"><span>Frequency</span><select value={freq} onChange={(e) => setFreq(e.target.value)}>{['OD', 'BD', 'TDS', 'QID', 'HS', 'SOS', 'Weekly'].map((f) => <option key={f}>{f}</option>)}</select></label>
          </div>
          <button className="tbtn run" onClick={add}>Add to med list →</button>
        </div>
      </div>
      <div className="panel"><h3>Medication list</h3>
        <div className="tblwrap"><table><thead><tr><th>Drug</th><th>Dose · Freq</th><th>Since</th><th>Status</th></tr></thead><tbody>
          {meds.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--sub)' }}>No medications.</td></tr>}
          {meds.map((m) => (
            <tr key={m.id}><td>{m.drug}</td><td>{m.dose} · {m.freq}</td><td>{m.since}</td>
              <td><button className={'st ' + (m.status === 'Active' ? 'ok' : 'bad')} style={{ border: 0, cursor: 'pointer' }} onClick={() => toggle(m)}>{m.status === 'Active' ? 'Active — stop' : 'Stopped'}</button></td></tr>
          ))}
        </tbody></table></div>
      </div>
    </div>
  );
}

/* ---------------- Vitals + trend ---------------- */
function Vitals({ pk, onChange }: { pk: string; onChange: () => void }) {
  const [bp, setBp] = useState(''); const [hr, setHr] = useState(''); const [temp, setTemp] = useState(''); const [spo2, setSpo2] = useState(''); const [weight, setWeight] = useState('');
  const vitals = getColl<Vital>('emr_vitals').filter((v) => v.key === pk).slice().reverse();
  const add = () => { if (!bp && !hr && !spo2) return; addRow<Vital>('emr_vitals', { key: pk, date: today(), bp: bp.trim() || '—', hr: hr.trim() || '—', temp: temp.trim() || '—', spo2: spo2.trim() || '—', weight: weight.trim() || '—' } as Omit<Vital, 'id'>); setBp(''); setHr(''); setTemp(''); setSpo2(''); setWeight(''); onChange(); };
  const hrs = vitals.map((v) => Number(v.hr)).filter((n) => !isNaN(n));
  return (
    <div className="cols">
      <div className="panel"><h3>Record vitals</h3>
        <div className="frm">
          <div className="frow">
            <label className="f"><span>BP (mmHg)</span><input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="120/80" /></label>
            <label className="f"><span>HR (bpm)</span><input value={hr} onChange={(e) => setHr(e.target.value)} placeholder="76" inputMode="numeric" /></label>
          </div>
          <div className="frow">
            <label className="f"><span>Temp (°F)</span><input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="98.6" /></label>
            <label className="f"><span>SpO₂ (%)</span><input value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="98" inputMode="numeric" /></label>
          </div>
          <label className="f"><span>Weight (kg)</span><input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="68" inputMode="numeric" /></label>
          <button className="tbtn run" onClick={add}>Save vitals →</button>
        </div>
      </div>
      <div className="panel"><h3>Vitals trend <span className="c">heart rate</span></h3>
        <Spark values={hrs} />
        <div className="tblwrap" style={{ marginTop: 10 }}><table><thead><tr><th>Date</th><th>BP</th><th>HR</th><th>Temp</th><th>SpO₂</th></tr></thead><tbody>
          {vitals.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--sub)' }}>No vitals recorded.</td></tr>}
          {vitals.map((v) => (
            <tr key={v.id}><td>{fmt(v.date)}</td><td>{v.bp}</td><td>{v.hr}</td><td>{v.temp}</td><td>{Number(v.spo2) < 94 ? <span className="st warn">{v.spo2}</span> : v.spo2}</td></tr>
          ))}
        </tbody></table></div>
      </div>
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <div style={{ color: 'var(--sub)', fontSize: 12 }}>Record at least two readings to see a trend.</div>;
  const w = 260, h = 60, pad = 6;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Heart-rate trend">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => { const x = pad + (i / (values.length - 1)) * (w - pad * 2); const y = h - pad - ((v - min) / span) * (h - pad * 2); return <circle key={i} cx={x} cy={y} r="2.6" fill="var(--accent)" />; })}
    </svg>
  );
}

/* ---------------- Labs ---------------- */
function Labs({ pk, onChange }: { pk: string; onChange: () => void }) {
  const [test, setTest] = useState(''); const [value, setValue] = useState(''); const [unit, setUnit] = useState(''); const [ref, setRef] = useState(''); const [flag, setFlag] = useState('');
  const labs = getColl<Lab>('emr_labs').filter((l) => l.key === pk);
  const add = () => { if (!test.trim() || !value.trim()) return; addRow<Lab>('emr_labs', { key: pk, test: test.trim(), value: value.trim(), unit: unit.trim(), ref: ref.trim() || '—', flag, date: today() } as Omit<Lab, 'id'>); setTest(''); setValue(''); setUnit(''); setRef(''); setFlag(''); onChange(); };
  const del = (l: Lab) => { removeRow('emr_labs', l.id); onChange(); };
  return (
    <div className="cols">
      <div className="panel"><h3>Record lab result</h3>
        <div className="frm">
          <label className="f"><span>Test</span><input value={test} onChange={(e) => setTest(e.target.value)} placeholder="e.g. Fasting glucose" /></label>
          <div className="frow">
            <label className="f"><span>Value</span><input value={value} onChange={(e) => setValue(e.target.value)} placeholder="126" /></label>
            <label className="f"><span>Unit</span><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="mg/dL" /></label>
          </div>
          <div className="frow">
            <label className="f"><span>Reference</span><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="70–110" /></label>
            <label className="f"><span>Flag</span><div className="seg sm">{['', 'H', 'L'].map((s) => <button key={s || 'n'} aria-pressed={flag === s} onClick={() => setFlag(s)}>{s || 'Norm'}</button>)}</div></label>
          </div>
          <button className="tbtn run" onClick={add}>Add result →</button>
        </div>
      </div>
      <div className="panel"><h3>Results <span className="c">{labs.length}</span></h3>
        <div className="tblwrap"><table><thead><tr><th>Test</th><th>Result</th><th>Reference</th><th></th></tr></thead><tbody>
          {labs.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--sub)' }}>No results.</td></tr>}
          {labs.map((l) => (
            <tr key={l.id}><td>{l.test}<br /><small style={{ color: 'var(--sub)' }}>{fmt(l.date)}</small></td>
              <td>{l.value} {l.unit} {l.flag && <span className={'st ' + (l.flag === 'H' ? 'bad' : 'warn')}>{l.flag}</span>}</td>
              <td>{l.ref}</td>
              <td><button className="wbtn xs" onClick={() => del(l)}>✕</button></td></tr>
          ))}
        </tbody></table></div>
      </div>
    </div>
  );
}
