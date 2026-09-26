import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getColl, addRow, updateRow, seedOnce } from '../api/localdb';

/* Fully-functional LIS / LIMS (Laboratory Information System). Orders → sample
   accession (barcode) → result entry with auto abnormal flags → verify & release.
   Releasing a result writes it into the SHARED store (emr_labs), so it appears in
   the patient's EMR chart automatically. All data stays on the provider's machine. */

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const fmtt = (iso: string) => { try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };

type Adm = { id: string; name: string; age: string; sex: string; abha: string; status: string };
type Pat = { id: string; name: string; age: string; sex: string; abha: string };
type Person = { key: string; name: string; age: string; sex: string; abha: string; source: 'HIS' | 'EMR' };

type Order = {
  id: string; key: string; name: string; test: string; unit: string; ref: string; sample: string;
  acc: string; status: 'Ordered' | 'Collected' | 'Resulted' | 'Released';
  value: string; flag: string; orderedAt: string; resultedAt?: string; releasedAt?: string;
};

// Small test catalogue with reference ranges + sample types.
const CATALOG: { test: string; unit: string; ref: string; sample: string }[] = [
  { test: 'Haemoglobin', unit: 'g/dL', ref: '13-17', sample: 'EDTA blood' },
  { test: 'WBC count', unit: '10³/µL', ref: '4-11', sample: 'EDTA blood' },
  { test: 'Platelet count', unit: '10³/µL', ref: '150-410', sample: 'EDTA blood' },
  { test: 'Fasting glucose', unit: 'mg/dL', ref: '70-110', sample: 'Fluoride plasma' },
  { test: 'HbA1c', unit: '%', ref: '<5.7', sample: 'EDTA blood' },
  { test: 'Creatinine', unit: 'mg/dL', ref: '0.6-1.2', sample: 'Serum' },
  { test: 'Total cholesterol', unit: 'mg/dL', ref: '<200', sample: 'Serum' },
  { test: 'TSH', unit: 'µIU/mL', ref: '0.4-4.0', sample: 'Serum' },
  { test: 'CRP', unit: 'mg/L', ref: '<5', sample: 'Serum' },
];

// Auto abnormal flag from a reference range string ("70-110", "<5.7", "0.6–1.2").
function flagFor(value: string, ref: string): string {
  const v = parseFloat(value); if (isNaN(v)) return '';
  const r = ref.replace(/–/g, '-').replace(/\s/g, '');
  const lt = r.match(/^<([\d.]+)$/); if (lt) return v >= parseFloat(lt[1]) ? 'H' : '';
  const gt = r.match(/^>([\d.]+)$/); if (gt) return v <= parseFloat(gt[1]) ? 'L' : '';
  const rng = r.match(/^([\d.]+)-([\d.]+)$/); if (rng) { const lo = parseFloat(rng[1]), hi = parseFloat(rng[2]); if (v < lo) return 'L'; if (v > hi) return 'H'; }
  return '';
}

const TABS = [
  ['dash', 'Dashboard'],
  ['order', 'Order & Accession'],
  ['worklist', 'Worklist'],
  ['released', 'Released results'],
] as const;

export default function LisWorkspace() {
  const nav = useNavigate();
  const [tab, setTab] = useState<string>('dash');
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    seedOnce('lis_v1', () => {
      const seed = (o: Partial<Order>) => addRow<Order>('lis_orders', {
        key: o.key!, name: o.name!, test: o.test!, unit: o.unit!, ref: o.ref!, sample: o.sample!,
        acc: o.acc!, status: o.status || 'Ordered', value: o.value || '', flag: o.flag || '',
        orderedAt: o.orderedAt || now(), resultedAt: o.resultedAt, releasedAt: o.releasedAt,
      } as Omit<Order, 'id'>);
      seed({ key: '11-2233-4455-6677', name: 'Lakshmi Narayan', test: 'HbA1c', unit: '%', ref: '<5.7', sample: 'EDTA blood', acc: 'LAB-' + today().replace(/-/g, '').slice(2) + '-0001', status: 'Resulted', value: '7.8', flag: 'H', resultedAt: now() });
      seed({ key: '22-3344-5566-7788', name: 'Imran Sheikh', test: 'Fasting glucose', unit: 'mg/dL', ref: '70-110', sample: 'Fluoride plasma', acc: 'LAB-' + today().replace(/-/g, '').slice(2) + '-0002', status: 'Collected' });
      seed({ key: '22-3344-5566-7788', name: 'Imran Sheikh', test: 'Creatinine', unit: 'mg/dL', ref: '0.6-1.2', sample: 'Serum', acc: 'LAB-' + today().replace(/-/g, '').slice(2) + '-0003', status: 'Ordered' });
    });
    refresh();
  }, []);

  // Shared patient list (HIS admissions + EMR outpatients), keyed by ABHA.
  const adm = getColl<Adm>('his_adm').filter((a) => a.status === 'Admitted');
  const outpatients = getColl<Pat>('emr_patients');
  const map = new Map<string, Person>();
  outpatients.forEach((p) => map.set(p.abha, { key: p.abha, name: p.name, age: p.age, sex: p.sex, abha: p.abha, source: 'EMR' }));
  adm.forEach((a) => map.set(a.abha, { key: a.abha, name: a.name, age: a.age, sex: a.sex, abha: a.abha, source: 'HIS' }));
  const people = [...map.values()];

  const orders = getColl<Order>('lis_orders');
  const samplesToday = orders.filter((o) => o.orderedAt.slice(0, 10) === today()).length;
  const pending = orders.filter((o) => o.status === 'Ordered' || o.status === 'Collected' || o.status === 'Resulted');
  const critical = orders.filter((o) => o.flag && o.status !== 'Ordered').length;
  const released = orders.filter((o) => o.status === 'Released');

  const explain = () => {
    try { sessionStorage.setItem('meddroid_pending', JSON.stringify({ q: 'Explain my lab test results in simple Hindi — which are normal, which are high or low, and what I should do.', spec: 'General Physician' })); } catch { /* ignore */ }
    nav('/assistant');
  };

  return (
    <div className="mock lis">
      <div className="mhead">
        <div><div className="mtitle">LIS / LIMS</div><div className="mfull">Laboratory Information System · live · on this device</div></div>
        <span className="badge">Diagnostics</span>
        <button className="md-chip" onClick={explain}><span className="r" />MedDroid · Explain in Hindi</button>
      </div>

      <div className="pipe"><span className="pl">HL7 / ASTM · LOINC</span><span className="node">Order</span><span className="node">Accession</span><span className="node">Analyser</span><span className="node">Verify</span><span className="node">Release → EMR</span><span className="live"><span className="d" />LIVE</span></div>

      <div className="htabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'htab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'dash' && (
        <>
          <div className="kpis">
            <div className="tile"><div className="v">{samplesToday}</div><div className="l">Samples today</div></div>
            <div className="tile"><div className="v">{pending.length}</div><div className="l">Pending</div><div className="s">order · collect · verify</div></div>
            <div className="tile"><div className="v">{critical}</div><div className="l">Abnormal flags</div></div>
            <div className="tile"><div className="v">{released.length}</div><div className="l">Released to EMR</div></div>
          </div>
          <div className="cols">
            <div className="panel"><h3>Pending worklist <span className="c">live</span></h3>
              <div className="tblwrap"><table><thead><tr><th>Accession</th><th>Patient</th><th>Test</th><th>Status</th></tr></thead><tbody>
                {pending.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--sub)' }}>Nothing pending — order a test.</td></tr>}
                {pending.map((o) => (
                  <tr key={o.id}><td><small>{o.acc}</small></td><td>{o.name}</td><td>{o.test}</td><td><span className={'st ' + stcls(o.status)}>{o.status}</span></td></tr>
                ))}
              </tbody></table></div>
            </div>
            <div className="panel"><h3>Test catalogue <span className="c">{CATALOG.length} assays</span></h3>
              <div className="tblwrap"><table><thead><tr><th>Assay</th><th>Ref</th><th>Sample</th></tr></thead><tbody>
                {CATALOG.map((c) => <tr key={c.test}><td>{c.test}</td><td>{c.ref} {c.unit}</td><td><small>{c.sample}</small></td></tr>)}
              </tbody></table></div>
            </div>
          </div>
        </>
      )}

      {tab === 'order' && <OrderTest people={people} onChange={refresh} goWorklist={() => setTab('worklist')} />}
      {tab === 'worklist' && <Worklist orders={orders.filter((o) => o.status !== 'Released')} onChange={refresh} />}
      {tab === 'released' && (
        <div className="panel"><h3>Released results <span className="c">also in EMR chart</span></h3>
          <div className="tblwrap"><table><thead><tr><th>Patient</th><th>Test</th><th>Result</th><th>Reference</th><th>Released</th></tr></thead><tbody>
            {released.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--sub)' }}>No results released yet.</td></tr>}
            {released.map((o) => (
              <tr key={o.id}><td>{o.name}</td><td>{o.test}</td>
                <td>{o.value} {o.unit} {o.flag && <span className={'st ' + (o.flag === 'H' ? 'bad' : 'warn')}>{o.flag}</span>}</td>
                <td>{o.ref} {o.unit}</td><td><small>{o.releasedAt ? fmtt(o.releasedAt) : '—'}</small></td></tr>
            ))}
          </tbody></table></div>
        </div>
      )}
    </div>
  );
}

function stcls(s: string) { return s === 'Released' ? 'ok' : s === 'Resulted' ? 'info' : s === 'Collected' ? 'warn' : 'warn'; }

/* ---------------- Order & Accession ---------------- */
function OrderTest({ people, onChange, goWorklist }: { people: Person[]; onChange: () => void; goWorklist: () => void }) {
  const [key, setKey] = useState(people[0]?.key || '');
  const [testName, setTestName] = useState(CATALOG[0].test);
  const [err, setErr] = useState('');
  const [lastAcc, setLastAcc] = useState('');
  const c = CATALOG.find((x) => x.test === testName)!;
  const nextAcc = () => {
    const n = getColl<Order>('lis_orders').length + 1;
    return 'LAB-' + today().replace(/-/g, '').slice(2) + '-' + String(n).padStart(4, '0');
  };
  const order = () => {
    const person = people.find((p) => p.key === key);
    if (!person) { setErr('Select a patient (register one in EMR or admit in HIS)'); return; }
    const acc = nextAcc();
    addRow<Order>('lis_orders', { key: person.key, name: person.name, test: c.test, unit: c.unit, ref: c.ref, sample: c.sample, acc, status: 'Ordered', value: '', flag: '', orderedAt: now() } as Omit<Order, 'id'>);
    setLastAcc(acc); setErr(''); onChange();
  };
  return (
    <div className="cols">
      <div className="panel"><h3>Order a test</h3>
        <div className="frm">
          <label className="f"><span>Patient</span>
            <select value={key} onChange={(e) => setKey(e.target.value)}>
              {people.length === 0 && <option value="">No patients — add in EMR / HIS</option>}
              {people.map((p) => <option key={p.key} value={p.key}>{p.name} · {p.age}{p.sex} ({p.source})</option>)}
            </select>
          </label>
          <label className="f"><span>Assay</span>
            <select value={testName} onChange={(e) => setTestName(e.target.value)}>{CATALOG.map((x) => <option key={x.test}>{x.test}</option>)}</select>
          </label>
          <div className="mini">Reference <b>{c.ref} {c.unit}</b> · Sample <b>{c.sample}</b></div>
          {err && <div className="ferr">{err}</div>}
          <button className="tbtn run" onClick={order}>Order &amp; accession →</button>
        </div>
      </div>
      <div className="panel"><h3>Accession label</h3>
        {lastAcc ? (
          <div className="acclabel">
            <Barcode value={lastAcc} />
            <div className="accno">{lastAcc}</div>
            <div className="mini">Test <b>{c.test}</b> · Sample <b>{c.sample}</b></div>
            <button className="wbtn xs" style={{ marginTop: 10 }} onClick={goWorklist}>Go to worklist →</button>
          </div>
        ) : <div style={{ color: 'var(--sub)', fontSize: 13 }}>Order a test to generate a sample accession &amp; barcode.</div>}
      </div>
    </div>
  );
}

function Barcode({ value }: { value: string }) {
  // Deterministic decorative barcode from the accession string.
  const bars: number[] = [];
  for (let i = 0; i < value.length; i++) { const ch = value.charCodeAt(i); bars.push(1 + (ch % 3)); bars.push(1 + ((ch >> 2) % 3)); }
  let x = 0; const gap = 1;
  const rects = bars.map((w, i) => { const r = <rect key={i} x={x} y={0} width={w} height={44} fill={i % 2 ? 'transparent' : '#111318'} />; x += w + gap; return r; });
  return <svg className="barcode" viewBox={`0 0 ${x} 44`} preserveAspectRatio="none" role="img" aria-label={'Barcode ' + value}>{rects}</svg>;
}

/* ---------------- Worklist: collect → result → verify/release ---------------- */
function Worklist({ orders, onChange }: { orders: Order[]; onChange: () => void }) {
  const collect = (o: Order) => { updateRow('lis_orders', o.id, { status: 'Collected' }); onChange(); };
  const result = (o: Order) => {
    const val = window.prompt(`Enter result for ${o.test} (${o.ref} ${o.unit}):`, o.value || '');
    if (val == null || !val.trim()) return;
    const flag = flagFor(val.trim(), o.ref);
    updateRow('lis_orders', o.id, { value: val.trim(), flag, status: 'Resulted', resultedAt: now() });
    onChange();
  };
  const release = (o: Order) => {
    updateRow('lis_orders', o.id, { status: 'Released', releasedAt: now() });
    // Push into the SHARED store so the result appears in the patient's EMR chart.
    addRow('emr_labs', { key: o.key, test: o.test, value: o.value, unit: o.unit, ref: o.ref, flag: o.flag, date: today() });
    onChange();
  };
  return (
    <div className="panel"><h3>Worklist <span className="c">collect → result → verify &amp; release</span></h3>
      <div className="tblwrap"><table><thead><tr><th>Accession</th><th>Patient</th><th>Test</th><th>Result</th><th>Status</th><th></th></tr></thead><tbody>
        {orders.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--sub)' }}>Worklist is clear.</td></tr>}
        {orders.map((o) => (
          <tr key={o.id}>
            <td><small>{o.acc}</small><br /><small style={{ color: 'var(--sub)' }}>{o.sample}</small></td>
            <td>{o.name}</td><td>{o.test}<br /><small style={{ color: 'var(--sub)' }}>{o.ref} {o.unit}</small></td>
            <td>{o.value ? <>{o.value} {o.unit} {o.flag && <span className={'st ' + (o.flag === 'H' ? 'bad' : 'warn')}>{o.flag}</span>}</> : <span style={{ color: 'var(--sub)' }}>—</span>}</td>
            <td><span className={'st ' + stcls(o.status)}>{o.status}</span></td>
            <td style={{ whiteSpace: 'nowrap' }}>
              {o.status === 'Ordered' && <button className="wbtn xs" onClick={() => collect(o)}>Collect</button>}
              {o.status === 'Collected' && <button className="wbtn xs" onClick={() => result(o)}>Enter result</button>}
              {o.status === 'Resulted' && <><button className="wbtn xs" onClick={() => result(o)}>Edit</button> <button className="wbtn xs" onClick={() => release(o)}>Verify &amp; release</button></>}
            </td>
          </tr>
        ))}
      </tbody></table></div>
    </div>
  );
}
