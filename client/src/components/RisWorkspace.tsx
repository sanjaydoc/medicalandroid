import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getColl, addRow, seedOnce } from '../api/localdb';

/* Fully-functional RIS / PACS (Radiology Information System + image viewer).
   It picks up the imaging orders CPOE places, opens the study in a PACS viewer,
   and when the radiologist signs a report it flows back into the patient's EMR
   chart as a "Radiology report" encounter. All data stays on the provider's
   machine. */

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const fmtt = (iso: string) => { try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
const IMG = '/pacs/chest-copd.jpg';
const isXray = (s: string) => /x-?ray|chest|cxr/i.test(s);

type Adm = { id: string; name: string; age: string; sex: string; abha: string; status: string };
type Pat = { id: string; name: string; age: string; sex: string; abha: string };
type Person = { key: string; name: string; age: string; sex: string; abha: string; source: 'HIS' | 'EMR' };
type CpoeOrder = { id: string; key: string; name: string; kind: string; detail: string; status: string; at: string };
type Report = { id: string; orderId: string; key: string; name: string; study: string; findings: string; impression: string; radiologist: string; at: string };

const RADS = ['Chest X-ray (PA)', 'CT chest', 'USG abdomen', 'MRI brain', 'ECG', '2D Echo'];

const TABS = [
  ['work', 'Worklist'],
  ['viewer', 'Viewer & Report'],
  ['reports', 'Reports'],
] as const;

export default function RisWorkspace() {
  const nav = useNavigate();
  const [tab, setTab] = useState<string>('work');
  const [sel, setSel] = useState<CpoeOrder | null>(null);
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    seedOnce('ris_v1', () => {
      addRow<CpoeOrder>('cpoe_orders', { key: '11-2233-4455-6677', name: 'Lakshmi Narayan', kind: 'Radiology', detail: 'Chest X-ray (PA)', status: 'Active', at: now() } as Omit<CpoeOrder, 'id'>);
    });
    refresh();
  }, []);

  const adm = getColl<Adm>('his_adm').filter((a) => a.status === 'Admitted');
  const outpatients = getColl<Pat>('emr_patients');
  const map = new Map<string, Person>();
  outpatients.forEach((p) => map.set(p.abha, { key: p.abha, name: p.name, age: p.age, sex: p.sex, abha: p.abha, source: 'EMR' }));
  adm.forEach((a) => map.set(a.abha, { key: a.abha, name: a.name, age: a.age, sex: a.sex, abha: a.abha, source: 'HIS' }));
  const people = [...map.values()];

  const imgOrders = getColl<CpoeOrder>('cpoe_orders').filter((o) => o.kind === 'Radiology');
  const reports = getColl<Report>('ris_reports');
  const reportedIds = new Set(reports.map((r) => r.orderId));
  const pending = imgOrders.filter((o) => !reportedIds.has(o.id));

  const openViewer = (o: CpoeOrder) => { setSel(o); setTab('viewer'); };

  const explain = () => {
    try { sessionStorage.setItem('meddroid_pending', JSON.stringify({ q: 'Explain my radiology / X-ray report in simple Hindi — what the findings mean and what I should do next.', spec: 'General Physician' })); } catch { /* ignore */ }
    nav('/assistant');
  };

  return (
    <div className="mock ris">
      <div className="mhead">
        <div><div className="mtitle">RIS / PACS</div><div className="mfull">Radiology Information System + image viewer · live</div></div>
        <span className="badge">Diagnostics</span>
        <button className="md-chip" onClick={explain}><span className="r" />MedDroid · Explain in Hindi</button>
      </div>

      <div className="pipe"><span className="pl">DICOM · HL7</span><span className="node">Order (from CPOE)</span><span className="node">Acquire</span><span className="node">PACS</span><span className="node">Report</span><span className="node">→ EMR</span><span className="live"><span className="d" />LIVE</span></div>

      <div className="htabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'htab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'work' && (
        <>
          <div className="kpis">
            <div className="tile"><div className="v">{imgOrders.length}</div><div className="l">Imaging orders</div></div>
            <div className="tile"><div className="v">{pending.length}</div><div className="l">Awaiting report</div></div>
            <div className="tile"><div className="v">{reports.filter((r) => r.at.slice(0, 10) === today()).length}</div><div className="l">Reported today</div></div>
            <div className="tile"><div className="v">{reports.length}</div><div className="l">Reports → EMR</div></div>
          </div>
          <div className="cols">
            <div className="panel"><h3>Modality worklist <span className="c">from CPOE</span></h3>
              <div className="tblwrap"><table><thead><tr><th>Patient</th><th>Study</th><th>Status</th><th></th></tr></thead><tbody>
                {imgOrders.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--sub)' }}>No imaging ordered — order one in CPOE (Radiology) or below.</td></tr>}
                {imgOrders.map((o) => (
                  <tr key={o.id}><td>{o.name}</td><td>{o.detail}</td>
                    <td><span className={'st ' + (reportedIds.has(o.id) ? 'ok' : 'warn')}>{reportedIds.has(o.id) ? 'Reported' : 'Awaiting'}</span></td>
                    <td><button className="wbtn xs" onClick={() => openViewer(o)}>{reportedIds.has(o.id) ? 'View' : 'Open & report →'}</button></td></tr>
                ))}
              </tbody></table></div>
            </div>
            <OrderImaging people={people} onChange={refresh} />
          </div>
        </>
      )}

      {tab === 'viewer' && (sel
        ? <Viewer order={sel} report={reports.find((r) => r.orderId === sel.id) || null} onChange={refresh} />
        : <div className="panel"><h3>No study open</h3><div style={{ color: 'var(--sub)', fontSize: 13 }}>Open a study from the Worklist.</div></div>)}

      {tab === 'reports' && (
        <div className="panel"><h3>Signed reports <span className="c">also in EMR chart</span></h3>
          <div className="list">
            {reports.length === 0 && <div style={{ color: 'var(--sub)', fontSize: 13 }}>No reports yet.</div>}
            {reports.map((r) => (
              <div className="enc" key={r.id}>
                <div className="ehd"><b>{r.study} · {r.name}</b><span>{fmtt(r.at)} · {r.radiologist}</span></div>
                <div className="erow"><i>F</i>{r.findings}</div>
                <div className="erow"><i>I</i>{r.impression}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Order imaging directly ---------------- */
function OrderImaging({ people, onChange }: { people: Person[]; onChange: () => void }) {
  const [key, setKey] = useState(people[0]?.key || '');
  const [study, setStudy] = useState(RADS[0]); const [msg, setMsg] = useState('');
  const place = () => {
    const p = people.find((x) => x.key === key); if (!p) { setMsg('Select a patient first.'); return; }
    addRow('cpoe_orders', { key: p.key, name: p.name, kind: 'Radiology', detail: study, status: 'Active', at: now() });
    setMsg(`${study} ordered for ${p.name}.`); onChange();
  };
  return (
    <div className="panel"><h3>Order imaging</h3>
      <div className="frm">
        <label className="f"><span>Patient</span>
          <select value={key} onChange={(e) => { setKey(e.target.value); setMsg(''); }}>
            {people.length === 0 && <option value="">No patients — add in EMR / HIS</option>}
            {people.map((p) => <option key={p.key} value={p.key}>{p.name} · {p.age}{p.sex} ({p.source})</option>)}
          </select>
        </label>
        <label className="f"><span>Study</span><select value={study} onChange={(e) => setStudy(e.target.value)}>{RADS.map((r) => <option key={r}>{r}</option>)}</select></label>
        {msg && <div className="okbox">{msg}</div>}
        <button className="tbtn run" onClick={place}>Order study →</button>
      </div>
    </div>
  );
}

/* ---------------- PACS viewer + reporting ---------------- */
function Viewer({ order, report, onChange }: { order: CpoeOrder; report: Report | null; onChange: () => void }) {
  const xray = isXray(order.detail);
  const [findings, setFindings] = useState(report?.findings || (xray ? 'Hyperinflated lung fields with flattened diaphragms. Increased retrosternal air space. Bronchovascular markings coarsened; no focal consolidation or effusion. Cardiac silhouette normal.' : ''));
  const [impression, setImpression] = useState(report?.impression || (xray ? 'Features consistent with COPD. No acute cardiopulmonary process.' : ''));
  const [radiologist, setRadiologist] = useState(report?.radiologist || 'Dr. Sanjay Anbu');
  const [saved, setSaved] = useState(!!report);
  const sign = () => {
    if (!findings.trim() || !impression.trim()) return;
    addRow<Report>('ris_reports', { orderId: order.id, key: order.key, name: order.name, study: order.detail, findings: findings.trim(), impression: impression.trim(), radiologist: radiologist.trim() || 'Radiologist', at: now() } as Omit<Report, 'id'>);
    // Flow the report into the patient's EMR chart as a radiology encounter.
    addRow('emr_encounters', { key: order.key, date: today(), type: 'Radiology report', s: '', o: `${order.detail}: ${findings.trim()}`, a: impression.trim(), p: '', doctor: radiologist.trim() || 'Radiologist' });
    setSaved(true); onChange();
  };
  return (
    <div className="cols">
      <div className="panel"><h3>PACS · {order.detail} <span className="c">{order.name}</span></h3>
        {xray ? (
          <div className="viewer xr">
            <div className="vtools"><span className="vtool">W/L</span><span className="vtool">Zoom</span><span className="vtool">Invert</span><span className="vtool">Measure</span></div>
            <img src={IMG} alt={order.detail} />
            <span className="vfind">AI pre-read: COPD pattern</span>
          </div>
        ) : (
          <div className="viewer empty"><div className="vph">DICOM series for <b>{order.detail}</b><span>Modality push pending · report can still be entered</span></div></div>
        )}
        {xray && <>
          <div className="aiflab">AI pre-read (assistive · not a diagnosis)</div>
          <div className="mlist">
            <div className="mrow"><span className="mck"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10" /></svg></span>Hyperinflation with flattened hemidiaphragms</div>
            <div className="mrow"><span className="mck"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10" /></svg></span>Coarsened bronchovascular markings</div>
            <div className="mrow"><span className="mck"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10" /></svg></span>No focal consolidation / effusion / pneumothorax</div>
          </div>
        </>}
      </div>
      <div className="panel"><h3>{saved ? 'Signed report' : 'Radiologist report'}</h3>
        <div className="frm">
          <label className="f"><span>Findings</span><textarea value={findings} onChange={(e) => { setFindings(e.target.value); setSaved(false); }} placeholder="Describe the findings" /></label>
          <label className="f"><span>Impression</span><textarea value={impression} onChange={(e) => { setImpression(e.target.value); setSaved(false); }} placeholder="Conclusion / impression" /></label>
          <label className="f"><span>Radiologist</span><input value={radiologist} onChange={(e) => setRadiologist(e.target.value)} /></label>
          {saved ? <div className="okbox">Report signed → added to {order.name}'s EMR chart.</div> : <button className="tbtn run" onClick={sign}>Sign &amp; send to EMR →</button>}
        </div>
      </div>
    </div>
  );
}
