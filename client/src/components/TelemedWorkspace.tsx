import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getColl, addRow, updateRow, seedOnce } from '../api/localdb';

/* Fully-functional Teleconsult / Telemedicine. Join today's appointments into a
   video-consult room with the patient's live EMR context alongside; the consult
   note and any e-prescription flow back into EMR / CPOE. The "video" is a
   simulated call surface (no camera access) — everything stays on the device. */

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const fmtt = (iso: string) => { try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
const initials = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

type Adm = { id: string; name: string; age: string; sex: string; abha: string; status: string };
type Pat = { id: string; name: string; age: string; sex: string; abha: string };
type Person = { key: string; name: string; age: string; sex: string; abha: string; source: 'HIS' | 'EMR' };
type Appt = { id: string; key: string; name: string; time: string; doctor: string; date: string; status: string };
type Prob = { id: string; key: string; problem: string; status: string };
type Med = { id: string; key: string; drug: string; dose: string; freq: string; status: string };
type Allergy = { id: string; key: string; allergen: string };
type Sess = { id: string; key: string; name: string; doctor: string; assessment: string; plan: string; duration: number; at: string };

const FREQS = ['OD', 'BD', 'TDS', 'QID', 'HS', 'SOS'];

const TABS = [
  ['waiting', 'Waiting room'],
  ['consult', 'Consult'],
  ['history', 'History'],
] as const;

export default function TelemedWorkspace() {
  const nav = useNavigate();
  const [tab, setTab] = useState<string>('waiting');
  const [active, setActive] = useState<Person | null>(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => { seedOnce('tele_v1', () => { /* uses appointments + EMR */ }); refresh(); }, []);

  const adm = getColl<Adm>('his_adm').filter((a) => a.status === 'Admitted');
  const outpatients = getColl<Pat>('emr_patients');
  const map = new Map<string, Person>();
  outpatients.forEach((p) => map.set(p.abha, { key: p.abha, name: p.name, age: p.age, sex: p.sex, abha: p.abha, source: 'EMR' }));
  adm.forEach((a) => map.set(a.abha, { key: a.abha, name: a.name, age: a.age, sex: a.sex, abha: a.abha, source: 'HIS' }));
  const people = [...map.values()];

  const appts = getColl<Appt>('appt_appointments').filter((a) => a.date === today() && (a.status === 'Booked' || a.status === 'Checked-in'));
  const sessions = getColl<Sess>('tele_sessions');

  const join = (key: string, name: string, age = '', sex = '') => {
    const p = people.find((x) => x.key === key) || { key, name, age, sex, abha: key, source: 'EMR' as const };
    setActive(p); setTab('consult');
  };

  const explain = () => {
    try { sessionStorage.setItem('meddroid_pending', JSON.stringify({ q: 'Explain in simple Hindi how a video teleconsultation works and how to prepare for my online doctor appointment.', spec: 'General Physician' })); } catch { /* ignore */ }
    nav('/assistant');
  };

  return (
    <div className="mock telemed">
      <div className="mhead">
        <div><div className="mtitle">Teleconsult</div><div className="mfull">Telemedicine · video consults · live · on this device</div></div>
        <span className="badge">Patient-facing</span>
        <button className="md-chip" onClick={explain}><span className="r" />MedDroid · Explain in Hindi</button>
      </div>

      <div className="pipe"><span className="pl">Flow</span><span className="node">Appointment</span><span className="node">Video room</span><span className="node">Consult note → EMR</span><span className="node">e-Rx → CPOE</span><span className="live"><span className="d" />LIVE</span></div>

      <div className="htabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'htab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'waiting' && (
        <>
          <div className="kpis">
            <div className="tile"><div className="v">{appts.length}</div><div className="l">In waiting room</div></div>
            <div className="tile"><div className="v">{sessions.filter((s) => s.at.slice(0, 10) === today()).length}</div><div className="l">Consults today</div></div>
            <div className="tile"><div className="v">{sessions.length}</div><div className="l">Total consults</div></div>
            <div className="tile"><div className="v">{sessions.length ? Math.round(sessions.reduce((t, s) => t + s.duration, 0) / sessions.length / 60) + 'm' : '—'}</div><div className="l">Avg duration</div></div>
          </div>
          <div className="cols">
            <div className="panel"><h3>Waiting room <span className="c">today's appointments</span></h3>
              <div className="tblwrap"><table><thead><tr><th>Patient</th><th>Doctor</th><th>Time</th><th></th></tr></thead><tbody>
                {appts.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--sub)' }}>No one waiting — book a slot in Appointments.</td></tr>}
                {appts.map((a) => (
                  <tr key={a.id}><td>{a.name}</td><td>{a.doctor.split(' (')[0]}</td><td>{a.time}</td>
                    <td><button className="wbtn xs" onClick={() => join(a.key, a.name)}>Join call →</button></td></tr>
                ))}
              </tbody></table></div>
            </div>
            <div className="panel"><h3>Start ad-hoc consult</h3>
              <div className="frm">
                <label className="f"><span>Patient</span>
                  <select onChange={(e) => e.target.value && join(e.target.value, people.find((p) => p.key === e.target.value)?.name || '')} defaultValue="">
                    <option value="" disabled>Select a patient…</option>
                    {people.map((p) => <option key={p.key} value={p.key}>{p.name} · {p.age}{p.sex} ({p.source})</option>)}
                  </select>
                </label>
                <div className="mini">Joining opens the video room with the patient's live EMR record beside the call.</div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'consult' && (active
        ? <ConsultRoom person={active} onEnd={() => { setActive(null); setTab('history'); refresh(); }} appts={appts} />
        : <div className="panel"><h3>No active consult</h3><div style={{ color: 'var(--sub)', fontSize: 13 }}>Join someone from the Waiting room.</div></div>)}

      {tab === 'history' && (
        <div className="panel"><h3>Past consults <span className="c">notes saved to EMR</span></h3>
          <div className="list">
            {sessions.length === 0 && <div style={{ color: 'var(--sub)', fontSize: 13 }}>No consults yet.</div>}
            {sessions.map((s) => (
              <div className="enc" key={s.id}>
                <div className="ehd"><b>{s.name}</b><span>{fmtt(s.at)} · {Math.round(s.duration / 60)}m · {s.doctor}</span></div>
                <div className="erow"><i>A</i>{s.assessment || '—'}</div>
                <div className="erow"><i>P</i>{s.plan || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Video consult room ---------------- */
function ConsultRoom({ person, onEnd, appts }: { person: Person; onEnd: () => void; appts: Appt[] }) {
  const [secs, setSecs] = useState(0);
  const [mic, setMic] = useState(true); const [cam, setCam] = useState(true);
  const [assessment, setAssessment] = useState(''); const [plan, setPlan] = useState('');
  const [rxDrug, setRxDrug] = useState(''); const [rxDose, setRxDose] = useState(''); const [rxFreq, setRxFreq] = useState('OD');
  const [rxList, setRxList] = useState<string[]>([]);
  const timer = useRef<number>();

  useEffect(() => { timer.current = window.setInterval(() => setSecs((s) => s + 1), 1000); return () => window.clearInterval(timer.current); }, []);
  const mmss = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  const problems = getColl<Prob>('emr_problems').filter((p) => p.key === person.key && p.status === 'Active');
  const meds = getColl<Med>('emr_meds').filter((m) => m.key === person.key && m.status === 'Active');
  const allergies = getColl<Allergy>('emr_allergies').filter((a) => a.key === person.key);

  const addRx = () => {
    if (!rxDrug.trim()) return;
    addRow('emr_meds', { key: person.key, drug: rxDrug.trim(), dose: rxDose.trim() || '—', freq: rxFreq, status: 'Active', since: today() });
    addRow('cpoe_orders', { key: person.key, name: person.name, kind: 'Medication', detail: `${rxDrug.trim()} ${rxDose.trim() || '—'} ${rxFreq}`, status: 'Active', at: now() });
    setRxList((l) => [`${rxDrug.trim()} ${rxDose.trim() || '—'} ${rxFreq}`, ...l]); setRxDrug(''); setRxDose('');
  };

  const end = () => {
    addRow('tele_sessions', { key: person.key, name: person.name, doctor: 'Dr. Sanjay Anbu', assessment: assessment.trim(), plan: plan.trim(), duration: secs, at: now() });
    addRow('emr_encounters', { key: person.key, date: today(), type: 'Teleconsult', s: '', o: `Video consult (${mmss}).`, a: assessment.trim(), p: plan.trim() + (rxList.length ? ` Rx: ${rxList.join('; ')}.` : ''), doctor: 'Dr. Sanjay Anbu' });
    const appt = appts.find((a) => a.key === person.key);
    if (appt) updateRow('appt_appointments', appt.id, { status: 'Completed' });
    onEnd();
  };

  return (
    <div className="cols tele">
      <div className="panel"><h3>Live consult · {person.name} <span className="c">{mmss}</span></h3>
        <div className={'vc' + (cam ? '' : ' camoff')}>
          <div className="vtile" style={{ background: 'linear-gradient(135deg,#1b3a6b,#2F6FE0)' }}>
            {cam ? <span className="vinit">{initials(person.name)}</span> : <span className="vcamoff">Camera off</span>}
            <span className="vname">{person.name} · {person.age}{person.sex}</span>
            <span className="vconn"><span className="d" />connected</span>
          </div>
          <div className="vself"><span className="vinit sm">Dr</span><span className="vname">You</span></div>
        </div>
        <div className="vcontrols">
          <button className={'vbtn' + (mic ? '' : ' off')} onClick={() => setMic((m) => !m)} title="Mic">{mic ? '🎙' : '🔇'}</button>
          <button className={'vbtn' + (cam ? '' : ' off')} onClick={() => setCam((c) => !c)} title="Camera">{cam ? '🎥' : '📷'}</button>
          <button className="vbtn end" onClick={end} title="End &amp; save">⏹ End &amp; save</button>
        </div>
        <div className="mini" style={{ marginTop: 8 }}>Simulated call surface — no camera/microphone is accessed.</div>
      </div>

      <div className="panel"><h3>Patient context &amp; note</h3>
        <div className="ctxrow">
          {problems.length > 0 && <div className="ctx"><b>Problems</b>{problems.map((p) => <span key={p.id} className="chip">{p.problem}</span>)}</div>}
          {meds.length > 0 && <div className="ctx"><b>Meds</b>{meds.map((m) => <span key={m.id} className="chip">{m.drug}</span>)}</div>}
          {allergies.length > 0 && <div className="ctx"><b>Allergies</b>{allergies.map((a) => <span key={a.id} className="chip bad">{a.allergen}</span>)}</div>}
          {problems.length === 0 && meds.length === 0 && allergies.length === 0 && <div className="mini">No prior record for this patient yet.</div>}
        </div>
        <div className="frm" style={{ marginTop: 10 }}>
          <label className="f"><span>Assessment</span><textarea value={assessment} onChange={(e) => setAssessment(e.target.value)} placeholder="Impression from the call" /></label>
          <label className="f"><span>Plan</span><textarea value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Advice / follow-up" /></label>
          <div className="rxbar">
            <input value={rxDrug} onChange={(e) => setRxDrug(e.target.value)} placeholder="Prescribe drug" />
            <input value={rxDose} onChange={(e) => setRxDose(e.target.value)} placeholder="dose" style={{ maxWidth: 90 }} />
            <select value={rxFreq} onChange={(e) => setRxFreq(e.target.value)}>{FREQS.map((f) => <option key={f}>{f}</option>)}</select>
            <button className="wbtn xs" onClick={addRx}>Add e-Rx</button>
          </div>
          {rxList.length > 0 && <div className="mini">Prescribed: {rxList.join(' · ')} → EMR / CPOE</div>}
          <button className="tbtn run" onClick={end}>End consult &amp; save to EMR →</button>
        </div>
      </div>
    </div>
  );
}
