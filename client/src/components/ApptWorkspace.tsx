import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getColl, addRow, updateRow, seedOnce } from '../api/localdb';

/* Fully-functional Appointments / Queue — the clinic front door. Book a slot,
   check the patient in (assigns a token), run a live queue board (call next →
   in consult → complete / no-show). Registering a new patient here writes them
   into the shared EMR store, so they flow through the whole clinical chain.
   All data stays on the provider's machine. */

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const d10 = () => Math.floor(Math.random() * 10);
const genAbha = () => `${Array.from({ length: 2 }, d10).join('')}-${Array.from({ length: 4 }, d10).join('')}-${Array.from({ length: 4 }, d10).join('')}-${Array.from({ length: 4 }, d10).join('')}`;

type Adm = { id: string; name: string; age: string; sex: string; abha: string; status: string };
type Pat = { id: string; name: string; age: string; sex: string; abha: string };
type Person = { key: string; name: string; age: string; sex: string; abha: string; source: 'HIS' | 'EMR' };
type Appt = { id: string; key: string; name: string; age: string; sex: string; abha: string; doctor: string; date: string; time: string; status: 'Booked' | 'Checked-in' | 'In consult' | 'Completed' | 'No-show'; token: string; at: string };

const DOCTORS = ['Dr. Sanjay Anbu (Gen Med)', 'Dr. Priya Menon (Pulmonology)', 'Dr. Arvind Rao (Cardiology)'];
const SLOTS = (() => {
  const s: string[] = [];
  for (let h = 9; h < 13; h++) for (const m of [0, 20, 40]) s.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  for (let h = 17; h < 20; h++) for (const m of [0, 20, 40]) s.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  return s;
})();

const TABS = [
  ['queue', 'Today · Queue'],
  ['book', 'Book appointment'],
  ['schedule', 'Schedule'],
] as const;

export default function ApptWorkspace() {
  const nav = useNavigate();
  const [tab, setTab] = useState<string>('queue');
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    seedOnce('appt_v1', () => {
      const mk = (o: Partial<Appt>) => addRow<Appt>('appt_appointments', {
        key: o.key || genAbha(), name: o.name!, age: o.age || '—', sex: o.sex || '', abha: o.abha || genAbha(),
        doctor: o.doctor || DOCTORS[0], date: today(), time: o.time!, status: o.status || 'Booked', token: o.token || '', at: now(),
      } as Omit<Appt, 'id'>);
      mk({ name: 'Lakshmi Narayan', age: '62', sex: 'F', abha: '11-2233-4455-6677', doctor: DOCTORS[1], time: '09:20', status: 'Checked-in', token: 'A-001' });
      mk({ name: 'Imran Sheikh', age: '45', sex: 'M', abha: '22-3344-5566-7788', doctor: DOCTORS[0], time: '09:40', status: 'Booked' });
      mk({ name: 'Ravi Teja', age: '29', sex: 'M', doctor: DOCTORS[0], time: '10:00', status: 'Booked' });
    });
    refresh();
  }, []);

  const adm = getColl<Adm>('his_adm').filter((a) => a.status === 'Admitted');
  const outpatients = getColl<Pat>('emr_patients');
  const map = new Map<string, Person>();
  outpatients.forEach((p) => map.set(p.abha, { key: p.abha, name: p.name, age: p.age, sex: p.sex, abha: p.abha, source: 'EMR' }));
  adm.forEach((a) => map.set(a.abha, { key: a.abha, name: a.name, age: a.age, sex: a.sex, abha: a.abha, source: 'HIS' }));
  const people = [...map.values()];

  const appts = getColl<Appt>('appt_appointments');
  const todays = appts.filter((a) => a.date === today());
  const waiting = todays.filter((a) => a.status === 'Checked-in').sort((x, y) => x.token.localeCompare(y.token));
  const inConsult = todays.filter((a) => a.status === 'In consult');
  const booked = todays.filter((a) => a.status === 'Booked');

  const nextToken = () => 'A-' + String(todays.filter((a) => a.token).length + 1).padStart(3, '0');
  const checkIn = (a: Appt) => { updateRow('appt_appointments', a.id, { status: 'Checked-in', token: a.token || nextToken() }); refresh(); };
  const callNext = () => { const n = waiting[0]; if (!n) return; updateRow('appt_appointments', n.id, { status: 'In consult' }); refresh(); };
  const complete = (a: Appt) => { updateRow('appt_appointments', a.id, { status: 'Completed' }); refresh(); };
  const noShow = (a: Appt) => { updateRow('appt_appointments', a.id, { status: 'No-show' }); refresh(); };

  const explain = () => {
    try { sessionStorage.setItem('meddroid_pending', JSON.stringify({ q: 'I have a doctor appointment booked. Explain in simple Hindi how OPD token queues work and what I should carry.', spec: 'General Physician' })); } catch { /* ignore */ }
    nav('/assistant');
  };

  return (
    <div className="mock appt">
      <div className="mhead">
        <div><div className="mtitle">Appointments</div><div className="mfull">Appointment &amp; OPD queue · live · on this device</div></div>
        <span className="badge">Patient-facing</span>
        <button className="md-chip" onClick={explain}><span className="r" />MedDroid · Explain in Hindi</button>
      </div>

      <div className="pipe"><span className="pl">Front desk</span><span className="node">Book</span><span className="node">Check-in → token</span><span className="node">Queue</span><span className="node">→ EMR / HIS</span><span className="live"><span className="d" />LIVE</span></div>

      <div className="htabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'htab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'queue' && (
        <>
          <div className="kpis">
            <div className="tile"><div className="v">{todays.length}</div><div className="l">Appointments today</div></div>
            <div className="tile"><div className="v">{waiting.length}</div><div className="l">Waiting</div></div>
            <div className="tile"><div className="v">{inConsult.length}</div><div className="l">In consult</div></div>
            <div className="tile"><div className="v">{todays.filter((a) => a.status === 'Completed').length}</div><div className="l">Completed</div></div>
          </div>
          <div className="qtophd">
            <div className="nowserving"><span className="l">Now serving</span><b>{inConsult[0]?.token || waiting[0]?.token || '—'}</b><span className="nm">{inConsult[0]?.name || (waiting[0] ? 'Next: ' + waiting[0].name : 'Queue empty')}</span></div>
            <button className="tbtn run" onClick={callNext} disabled={waiting.length === 0}>Call next →</button>
          </div>
          <div className="qboard">
            <div className="qcol"><div className="qch">Waiting <span>{waiting.length}</span></div>
              {waiting.length === 0 && <div className="qempty">No one waiting.</div>}
              {waiting.map((a) => (
                <div className="qcard" key={a.id}><span className="token">{a.token}</span><div className="qg"><b>{a.name}</b><small>{a.doctor.split(' (')[0]} · {a.time}</small></div>
                  <button className="wbtn xs" onClick={() => { updateRow('appt_appointments', a.id, { status: 'In consult' }); refresh(); }}>Start</button></div>
              ))}
            </div>
            <div className="qcol"><div className="qch">In consult <span>{inConsult.length}</span></div>
              {inConsult.length === 0 && <div className="qempty">None.</div>}
              {inConsult.map((a) => (
                <div className="qcard hot" key={a.id}><span className="token">{a.token}</span><div className="qg"><b>{a.name}</b><small>{a.doctor.split(' (')[0]}</small></div>
                  <button className="wbtn xs" onClick={() => complete(a)}>Done</button></div>
              ))}
            </div>
            <div className="qcol"><div className="qch">Booked (not in) <span>{booked.length}</span></div>
              {booked.length === 0 && <div className="qempty">None.</div>}
              {booked.map((a) => (
                <div className="qcard" key={a.id}><span className="token muted">{a.time}</span><div className="qg"><b>{a.name}</b><small>{a.doctor.split(' (')[0]}</small></div>
                  <div className="rowacts"><button className="wbtn xs" onClick={() => checkIn(a)}>Check in</button><button className="wbtn xs" onClick={() => noShow(a)}>No-show</button></div></div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'book' && <Book people={people} takenSlots={todays.map((a) => a.time)} onChange={refresh} goQueue={() => setTab('queue')} />}

      {tab === 'schedule' && (
        <div className="panel"><h3>Today's schedule <span className="c">{todays.length} appointments</span></h3>
          <div className="tblwrap"><table><thead><tr><th>Time</th><th>Token</th><th>Patient</th><th>Doctor</th><th>Status</th></tr></thead><tbody>
            {todays.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--sub)' }}>No appointments today.</td></tr>}
            {todays.slice().sort((x, y) => x.time.localeCompare(y.time)).map((a) => (
              <tr key={a.id}><td>{a.time}</td><td>{a.token || '—'}</td><td>{a.name} · {a.age}{a.sex}</td><td>{a.doctor.split(' (')[0]}</td>
                <td><span className={'st ' + stcls(a.status)}>{a.status}</span></td></tr>
            ))}
          </tbody></table></div>
        </div>
      )}
    </div>
  );
}

function stcls(s: string) { return s === 'Completed' ? 'ok' : s === 'In consult' ? 'info' : s === 'No-show' ? 'bad' : s === 'Checked-in' ? 'warn' : 'info'; }

/* ---------------- Book ---------------- */
function Book({ people, takenSlots, onChange, goQueue }: { people: Person[]; takenSlots: string[]; onChange: () => void; goQueue: () => void }) {
  const [mode, setMode] = useState<'existing' | 'new'>(people.length ? 'existing' : 'new');
  const [key, setKey] = useState(people[0]?.key || '');
  const [name, setName] = useState(''); const [age, setAge] = useState(''); const [sex, setSex] = useState('M'); const [abha, setAbha] = useState('');
  const [registerEmr, setRegisterEmr] = useState(true);
  const [doctor, setDoctor] = useState(DOCTORS[0]); const [time, setTime] = useState(SLOTS.find((s) => !takenSlots.includes(s)) || SLOTS[0]);
  const [err, setErr] = useState(''); const [msg, setMsg] = useState('');

  const book = () => {
    let person: { key: string; name: string; age: string; sex: string; abha: string };
    if (mode === 'existing') {
      const p = people.find((x) => x.key === key); if (!p) { setErr('Select a patient or switch to New.'); return; }
      person = { key: p.key, name: p.name, age: p.age, sex: p.sex, abha: p.abha };
    } else {
      if (!name.trim()) { setErr('Enter patient name.'); return; }
      const ab = abha.trim() || genAbha();
      person = { key: ab, name: name.trim(), age: age.trim() || '—', sex, abha: ab };
      if (registerEmr && !people.some((p) => p.key === ab)) addRow('emr_patients', { name: person.name, age: person.age, sex: person.sex, abha: ab });
    }
    addRow<Appt>('appt_appointments', { key: person.key, name: person.name, age: person.age, sex: person.sex, abha: person.abha, doctor, date: today(), time, status: 'Booked', token: '', at: now() } as Omit<Appt, 'id'>);
    setErr(''); setMsg(`Booked ${person.name} with ${doctor.split(' (')[0]} at ${time}${mode === 'new' && registerEmr ? ' · registered in EMR' : ''}.`);
    setName(''); setAge(''); setAbha(''); onChange();
  };

  return (
    <div className="cols">
      <div className="panel"><h3>Book an appointment</h3>
        <div className="frm">
          <div className="f"><span>Patient</span><div className="seg"><button aria-pressed={mode === 'existing'} onClick={() => setMode('existing')}>Existing</button><button aria-pressed={mode === 'new'} onClick={() => setMode('new')}>New / walk-in</button></div></div>
          {mode === 'existing'
            ? <label className="f"><span>Choose patient</span><select value={key} onChange={(e) => setKey(e.target.value)}>{people.length === 0 && <option value="">No patients yet</option>}{people.map((p) => <option key={p.key} value={p.key}>{p.name} · {p.age}{p.sex} ({p.source})</option>)}</select></label>
            : <>
                <label className="f"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ravi Teja" /></label>
                <div className="frow">
                  <label className="f" style={{ flex: '0 0 70px' }}><span>Age</span><input value={age} onChange={(e) => setAge(e.target.value)} placeholder="29" /></label>
                  <div className="f"><span>Sex</span><div className="seg sm">{['M', 'F'].map((s) => <button key={s} aria-pressed={sex === s} onClick={() => setSex(s)}>{s}</button>)}</div></div>
                </div>
                <label className="f"><span>ABHA · blank = auto</span><input value={abha} onChange={(e) => setAbha(e.target.value)} placeholder="XX-XXXX-XXXX-XXXX" /></label>
                <label className="chkline"><input type="checkbox" checked={registerEmr} onChange={(e) => setRegisterEmr(e.target.checked)} /> Also register in EMR (recommended)</label>
              </>}
          <div className="frow">
            <label className="f"><span>Doctor</span><select value={doctor} onChange={(e) => setDoctor(e.target.value)}>{DOCTORS.map((d) => <option key={d}>{d}</option>)}</select></label>
            <label className="f"><span>Slot (today)</span><select value={time} onChange={(e) => setTime(e.target.value)}>{SLOTS.map((s) => <option key={s} value={s} disabled={takenSlots.includes(s)}>{s}{takenSlots.includes(s) ? ' · booked' : ''}</option>)}</select></label>
          </div>
          {err && <div className="ferr">{err}</div>}
          {msg && <div className="okbox">{msg} <button className="wbtn xs" style={{ marginLeft: 8 }} onClick={goQueue}>View queue →</button></div>}
          <button className="tbtn run" onClick={book}>Book appointment →</button>
        </div>
      </div>
      <div className="panel"><h3>Slot availability <span className="c">today</span></h3>
        <div className="slotgrid">
          {SLOTS.map((s) => <span key={s} className={'slot' + (takenSlots.includes(s) ? ' taken' : '')}>{s}</span>)}
        </div>
        <div className="mini" style={{ marginTop: 10 }}>Grey = booked. Booking a new walk-in registers them in EMR so they appear in Appointments, EMR, CPOE, LIS and CDSS.</div>
      </div>
    </div>
  );
}
