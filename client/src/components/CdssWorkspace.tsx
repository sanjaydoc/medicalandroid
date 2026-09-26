import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getColl, addRow, seedOnce } from '../api/localdb';

/* Fully-functional CDSS (Clinical Decision Support). It READS the patient's record
   built up by the other live systems — EMR problems/meds/allergies/vitals and LIS
   results — and surfaces assistive alerts: drug–allergy conflicts, drug–drug
   interactions, abnormal labs, care gaps and simple risk flags. Care-gap actions
   route back into CPOE/LIS. Everything stays on the provider's machine.

   ⚠ Decision support is ASSISTIVE only — it is not a diagnosis and never replaces
   clinical judgement. */

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const daysAgo = (d: string) => Math.round((Date.now() - new Date(d).getTime()) / 86400000);

type Adm = { id: string; name: string; age: string; sex: string; abha: string; status: string };
type Pat = { id: string; name: string; age: string; sex: string; abha: string };
type Person = { key: string; name: string; age: string; sex: string; abha: string; source: 'HIS' | 'EMR' };
type Med = { id: string; key: string; drug: string; status: string };
type Allergy = { id: string; key: string; allergen: string };
type Lab = { id: string; key: string; test: string; value: string; unit: string; ref: string; flag: string; date: string };
type Prob = { id: string; key: string; problem: string; status: string };
type Vital = { id: string; key: string; date: string; bp: string; hr: string; spo2: string };

type Sev = 'high' | 'med' | 'low';
type Alert = { sev: Sev; cat: string; title: string; detail: string; action?: { label: string; run: () => void } };

// Illustrative drug–drug interaction pairs among the CPOE formulary.
const INTERACTIONS: { a: string; b: string; note: string }[] = [
  { a: 'atorvastatin', b: 'azithromycin', note: 'Macrolide raises statin levels — myopathy / QT risk. Consider holding statin during the course.' },
  { a: 'amlodipine', b: 'atorvastatin', note: 'Amlodipine increases atorvastatin exposure — cap atorvastatin at 20 mg/day.' },
  { a: 'metformin', b: 'insulin glargine', note: 'Additive glucose-lowering — monitor for hypoglycaemia.' },
  { a: 'salbutamol', b: 'atorvastatin', note: 'No major interaction (informational).' },
];

const TABS = [
  ['dash', 'Dashboard'],
  ['analyse', 'Patient analysis'],
  ['rules', 'Rule library'],
] as const;

export default function CdssWorkspace() {
  const nav = useNavigate();
  const [tab, setTab] = useState<string>('analyse');
  const [key, setKey] = useState('');
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => { seedOnce('cdss_v1', () => { /* CDSS reads existing data; nothing to seed */ }); refresh(); }, []);

  const adm = getColl<Adm>('his_adm').filter((a) => a.status === 'Admitted');
  const outpatients = getColl<Pat>('emr_patients');
  const map = new Map<string, Person>();
  outpatients.forEach((p) => map.set(p.abha, { key: p.abha, name: p.name, age: p.age, sex: p.sex, abha: p.abha, source: 'EMR' }));
  adm.forEach((a) => map.set(a.abha, { key: a.abha, name: a.name, age: a.age, sex: a.sex, abha: a.abha, source: 'HIS' }));
  const people = [...map.values()];
  const firstKey = people[0]?.key;
  useEffect(() => { if (!key && firstKey) setKey(firstKey); /* eslint-disable-next-line */ }, [firstKey]);
  const person = people.find((p) => p.key === key) || null;

  const analyse = (pk: string): Alert[] => {
    const meds = getColl<Med>('emr_meds').filter((m) => m.key === pk && m.status === 'Active');
    const allergies = getColl<Allergy>('emr_allergies').filter((a) => a.key === pk);
    const labs = getColl<Lab>('emr_labs').filter((l) => l.key === pk);
    const problems = getColl<Prob>('emr_problems').filter((p) => p.key === pk && p.status === 'Active');
    const vitals = getColl<Vital>('emr_vitals').filter((v) => v.key === pk).slice().reverse();
    const out: Alert[] = [];

    // drug–allergy
    meds.forEach((m) => {
      const d = m.drug.toLowerCase();
      allergies.forEach((a) => { const w = a.allergen.toLowerCase().replace(/s$/, ''); if (w.length > 2 && (d.includes(w) || w.includes(d.split(' ')[0]))) out.push({ sev: 'high', cat: 'Safety', title: `Drug–allergy conflict: ${m.drug}`, detail: `Patient is allergic to ${a.allergen}. Review this prescription urgently.` }); });
    });
    // drug–drug
    for (let i = 0; i < meds.length; i++) for (let j = i + 1; j < meds.length; j++) {
      const x = meds[i].drug.toLowerCase().split(' ')[0], y = meds[j].drug.toLowerCase().split(' ')[0];
      const hit = INTERACTIONS.find((k) => (k.a === x && k.b === y) || (k.a === y && k.b === x));
      if (hit) out.push({ sev: hit.note.startsWith('No major') ? 'low' : 'med', cat: 'Interaction', title: `${meds[i].drug} + ${meds[j].drug}`, detail: hit.note });
    }
    // abnormal labs
    labs.filter((l) => l.flag).forEach((l) => out.push({ sev: 'med', cat: 'Lab', title: `${l.test} ${l.flag === 'H' ? 'high' : 'low'}: ${l.value} ${l.unit}`, detail: `Reference ${l.ref} ${l.unit}. Recorded ${daysAgo(l.date)}d ago — review and act.` }));
    // vitals
    const lastV = vitals[0];
    if (lastV) {
      const sys = parseInt((lastV.bp || '').split('/')[0], 10);
      if (!isNaN(sys) && sys >= 140) out.push({ sev: 'med', cat: 'Vital', title: `Elevated BP: ${lastV.bp} mmHg`, detail: 'Above 140 systolic — confirm and consider antihypertensive review.' });
      const spo2 = parseInt(lastV.spo2, 10);
      if (!isNaN(spo2) && spo2 < 94) out.push({ sev: 'high', cat: 'Vital', title: `Low SpO₂: ${lastV.spo2}%`, detail: 'Hypoxia (<94%). Assess oxygenation now.' });
    }
    // care gaps
    const hasProblem = (t: string) => problems.some((p) => p.problem.toLowerCase().includes(t));
    const recentLab = (t: string, within: number) => labs.some((l) => l.test.toLowerCase().includes(t) && daysAgo(l.date) <= within);
    if (hasProblem('diab')) {
      const a1c = labs.filter((l) => l.test.toLowerCase().includes('hba1c')).sort((x, y) => (x.date < y.date ? 1 : -1))[0];
      if (!recentLab('hba1c', 120)) out.push({ sev: 'low', cat: 'Care gap', title: 'Diabetes: HbA1c overdue', detail: 'No HbA1c in the last 120 days. Guidelines suggest 3–6 monthly monitoring.', action: { label: 'Order HbA1c →', run: () => orderLab(pk, person?.name || '', 'HbA1c', '%', '<5.7', 'EDTA blood') } });
      if (a1c && parseFloat(a1c.value) > 7) out.push({ sev: 'med', cat: 'Risk', title: `Diabetes not at target (HbA1c ${a1c.value}%)`, detail: 'Above 7% — consider therapy intensification and lifestyle counselling.' });
    }
    if (hasProblem('hyperten') || hasProblem('htn')) {
      if (!vitals.some((v) => v.bp && v.bp !== '—' && daysAgo(v.date) <= 90)) out.push({ sev: 'low', cat: 'Care gap', title: 'Hypertension: BP not recorded recently', detail: 'No BP reading in 90 days — record at next contact.' });
    }
    if (hasProblem('copd')) out.push({ sev: 'low', cat: 'Care gap', title: 'COPD: preventive care', detail: 'Consider influenza & pneumococcal vaccination and annual spirometry.' });

    return out;
  };

  const orderLab = (pk: string, name: string, test: string, unit: string, ref: string, sample: string) => {
    const acc = 'LAB-' + today().replace(/-/g, '').slice(2) + '-' + String(getColl('lis_orders').length + 1).padStart(4, '0');
    addRow('lis_orders', { key: pk, name, test, unit, ref, sample, acc, status: 'Ordered', value: '', flag: '', orderedAt: now() });
    addRow('cpoe_orders', { key: pk, name, kind: 'Lab', detail: `${test} (${acc})`, status: 'Active', at: now() });
    refresh();
  };

  const explain = (a: Alert) => {
    try { sessionStorage.setItem('meddroid_pending', JSON.stringify({ q: `A clinical decision-support alert for a patient says: "${a.title} — ${a.detail}". Explain what this means and the safe next steps, in simple Hindi.`, spec: 'General Physician' })); } catch { /* ignore */ }
    nav('/assistant');
  };

  const alerts = person ? analyse(person.key) : [];
  const allAlerts = people.flatMap((p) => analyse(p.key).map((a) => ({ ...a, patient: p.name })));
  const sevRank = { high: 0, med: 1, low: 2 } as const;

  return (
    <div className="mock cdss">
      <div className="mhead">
        <div><div className="mtitle">CDSS</div><div className="mfull">Clinical Decision Support · assistive AI · live</div></div>
        <span className="badge">Core clinical</span>
      </div>

      <div className="pipe"><span className="pl">Reads</span><span className="node">EMR problems</span><span className="node">Meds · allergies</span><span className="node">LIS labs</span><span className="node">Vitals</span><span className="live"><span className="d" />LIVE</span></div>

      <div className="disc">⚠ Decision support is assistive only — informational, not a diagnosis, and never a substitute for clinical judgement.</div>

      <div className="htabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'htab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'dash' && (
        <>
          <div className="kpis">
            <div className="tile"><div className="v">{people.length}</div><div className="l">Patients analysed</div></div>
            <div className="tile"><div className="v">{allAlerts.length}</div><div className="l">Open alerts</div></div>
            <div className="tile"><div className="v">{allAlerts.filter((a) => a.sev === 'high').length}</div><div className="l">High severity</div></div>
            <div className="tile"><div className="v">{allAlerts.filter((a) => a.cat === 'Care gap').length}</div><div className="l">Care gaps</div></div>
          </div>
          <div className="panel"><h3>Alerts across all patients <span className="c">most severe first</span></h3>
            <div className="alerts">
              {allAlerts.length === 0 && <div style={{ color: 'var(--sub)', fontSize: 13 }}>No alerts — records are clean, or no data yet.</div>}
              {allAlerts.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]).map((a, i) => (
                <div className={'alert ' + a.sev} key={i}><div className="ab"><b>{a.title}</b><span className="asev">{a.cat}</span></div><div className="ad">{(a as any).patient} · {a.detail}</div></div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'analyse' && (
        <div className="cols">
          <div className="panel"><h3>Select patient</h3>
            <div className="frm">
              <label className="f"><span>Patient</span>
                <select value={key} onChange={(e) => setKey(e.target.value)}>
                  {people.length === 0 && <option value="">No patients — add in EMR / HIS</option>}
                  {people.map((p) => <option key={p.key} value={p.key}>{p.name} · {p.age}{p.sex} ({p.source})</option>)}
                </select>
              </label>
            </div>
            {person && <div className="mini" style={{ marginTop: 12, lineHeight: 1.7 }}>
              Analysing <b>{person.name}</b>'s live record.<br />
              {alerts.filter((a) => a.sev === 'high').length} high · {alerts.filter((a) => a.sev === 'med').length} moderate · {alerts.filter((a) => a.sev === 'low').length} low.
            </div>}
          </div>
          <div className="panel"><h3>Decision support alerts <span className="c">{alerts.length}</span></h3>
            <div className="alerts">
              {!person && <div style={{ color: 'var(--sub)', fontSize: 13 }}>Select a patient.</div>}
              {person && alerts.length === 0 && <div style={{ color: 'var(--sub)', fontSize: 13 }}>No alerts for {person.name}. Add meds/labs/problems in EMR to see support fire.</div>}
              {alerts.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]).map((a, i) => (
                <div className={'alert ' + a.sev} key={i}>
                  <div className="ab"><b>{a.title}</b><span className="asev">{a.cat}</span></div>
                  <div className="ad">{a.detail}</div>
                  <div className="rowacts">
                    {a.action && <button className="wbtn xs" onClick={a.action.run}>{a.action.label}</button>}
                    <button className="wbtn xs" onClick={() => explain(a)}>Explain in Hindi</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'rules' && (
        <div className="cols">
          <div className="panel"><h3>Interaction rules <span className="c">{INTERACTIONS.length}</span></h3>
            <div className="tblwrap"><table><thead><tr><th>Drug A</th><th>Drug B</th><th>Note</th></tr></thead><tbody>
              {INTERACTIONS.map((k, i) => <tr key={i}><td style={{ textTransform: 'capitalize' }}>{k.a}</td><td style={{ textTransform: 'capitalize' }}>{k.b}</td><td><small>{k.note}</small></td></tr>)}
            </tbody></table></div>
          </div>
          <div className="panel"><h3>Care-gap &amp; risk rules</h3>
            <div className="list">
              <div className="li"><div className="ic">🩸</div><div className="g">Diabetes → HbA1c<small>Flag if no HbA1c in 120 days; risk if HbA1c &gt; 7%</small></div></div>
              <div className="li"><div className="ic">💓</div><div className="g">Hypertension → BP<small>Flag if no BP recorded in 90 days; alert if systolic ≥ 140</small></div></div>
              <div className="li"><div className="ic">🫁</div><div className="g">COPD → prevention<small>Vaccination + annual spirometry reminder; SpO₂ &lt; 94% = high</small></div></div>
              <div className="li"><div className="ic">🛡️</div><div className="g">Drug–allergy<small>Every active med cross-checked against recorded allergies</small></div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
