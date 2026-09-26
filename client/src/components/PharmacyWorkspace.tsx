import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getColl, addRow, updateRow, seedOnce } from '../api/localdb';

/* Fully-functional Pharmacy Management. It reads the active prescriptions written
   by CPOE / EMR and turns them into a dispensing queue; dispensing decrements the
   SHARED inventory (the same his_pharm stock the HIS Pharmacy tab uses) and records
   a billed sale. All data stays on the provider's machine. */

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtt = (iso: string) => { try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };

type Drug = { id: string; drug: string; stock: number; batch: string; expiry: string; price?: number };
type Med = { id: string; key: string; drug: string; dose: string; freq: string; status: string };
type Adm = { id: string; name: string; abha: string };
type Pat = { id: string; name: string; abha: string };
type Sale = { id: string; name: string; drug: string; qty: number; amount: number; kind: string; at: string };

// Indicative unit prices (₹). Fallback applies to anything not listed.
const PRICE: Record<string, number> = { metformin: 3, amlodipine: 4, atorvastatin: 6, azithromycin: 22, amoxicillin: 8, salbutamol: 120, tiotropium: 320, pantoprazole: 5, paracetamol: 2, 'insulin glargine': 850 };
const priceOf = (drug: string) => { const k = drug.toLowerCase(); for (const p in PRICE) if (k.includes(p)) return PRICE[p]; return 10; };

const TABS = [
  ['dash', 'Dashboard'],
  ['dispense', 'Dispense'],
  ['inventory', 'Inventory'],
  ['sales', 'Sales'],
] as const;

export default function PharmacyWorkspace() {
  const nav = useNavigate();
  const [tab, setTab] = useState<string>('dispense');
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    seedOnce('pharm_std_v1', () => {
      // Reuse HIS pharmacy stock; only seed base lines if empty (HIS may already have seeded).
      if (getColl<Drug>('his_pharm').length === 0) {
        addRow<Drug>('his_pharm', { drug: 'Metformin 1000mg', stock: 30, batch: 'MET2291', expiry: '2027-04' } as Omit<Drug, 'id'>);
        addRow<Drug>('his_pharm', { drug: 'Amlodipine 5mg', stock: 8, batch: 'AML1180', expiry: '2026-11' } as Omit<Drug, 'id'>);
      }
      // A couple of extra retail lines
      addRow<Drug>('his_pharm', { drug: 'Paracetamol 500mg', stock: 200, batch: 'PAR7781', expiry: '2028-01' } as Omit<Drug, 'id'>);
      addRow<Drug>('his_pharm', { drug: 'Azithromycin 500mg', stock: 24, batch: 'AZI3390', expiry: '2027-02' } as Omit<Drug, 'id'>);
    });
    refresh();
  }, []);

  const stock = getColl<Drug>('his_pharm');
  const meds = getColl<Med>('emr_meds').filter((m) => m.status === 'Active');
  const sales = getColl<Sale>('pharm_sales');
  const outpatients = getColl<Pat>('emr_patients');
  const adm = getColl<Adm>('his_adm');
  const nameFor = (key: string) => outpatients.find((p) => p.abha === key)?.name || adm.find((a) => a.abha === key)?.name || 'Patient';

  const lowStock = stock.filter((s) => s.stock <= 10);
  const salesToday = sales.filter((s) => s.at.slice(0, 10) === today());
  const revenueToday = salesToday.reduce((t, s) => t + s.amount, 0);

  const findStock = (drug: string) => stock.find((s) => s.drug.toLowerCase().split(' ')[0] === drug.toLowerCase().split(' ')[0] || s.drug.toLowerCase().includes(drug.toLowerCase()));

  const dispenseRx = (m: Med) => {
    const st = findStock(m.drug);
    const qty = Number(window.prompt(`Dispense how many units of ${m.drug} (${m.dose} ${m.freq})?${st ? ` — in stock: ${st.stock}` : ' — NOT in inventory'}`, '10'));
    if (!qty || qty <= 0) return;
    if (st) { if (qty > st.stock) { window.alert('Not enough stock.'); return; } updateRow('his_pharm', st.id, { stock: st.stock - qty }); }
    const amount = qty * priceOf(m.drug);
    addRow<Sale>('pharm_sales', { name: nameFor(m.key), drug: m.drug, qty, amount, kind: 'Rx', at: now() } as Omit<Sale, 'id'>);
    refresh();
  };

  const explain = () => {
    try { sessionStorage.setItem('meddroid_pending', JSON.stringify({ q: 'Explain in simple Hindi how to take the medicines dispensed to me — timing, food, and common side effects to watch for.', spec: 'General Physician' })); } catch { /* ignore */ }
    nav('/assistant');
  };

  return (
    <div className="mock pharmacy">
      <div className="mhead">
        <div><div className="mtitle">Pharmacy</div><div className="mfull">Pharmacy Management &amp; dispensing · live · on this device</div></div>
        <span className="badge">Operations</span>
        <button className="md-chip" onClick={explain}><span className="r" />MedDroid · Explain in Hindi</button>
      </div>

      <div className="pipe"><span className="pl">Rx source</span><span className="node">CPOE / EMR</span><span className="node">Dispense</span><span className="node">Inventory ↓</span><span className="node">Billed sale</span><span className="live"><span className="d" />LIVE</span></div>

      <div className="htabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'htab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'dash' && (
        <>
          <div className="kpis">
            <div className="tile"><div className="v">{meds.length}</div><div className="l">Active prescriptions</div></div>
            <div className="tile"><div className="v">{salesToday.length}</div><div className="l">Dispensed today</div></div>
            <div className="tile"><div className="v">{inr(revenueToday)}</div><div className="l">Revenue today</div></div>
            <div className="tile"><div className="v">{lowStock.length}</div><div className="l">Low-stock lines</div></div>
          </div>
          <div className="cols">
            <div className="panel"><h3>Low / expiring stock <span className="c">reorder</span></h3>
              <div className="tblwrap"><table><thead><tr><th>Drug</th><th>Stock</th><th>Expiry</th></tr></thead><tbody>
                {lowStock.length === 0 && <tr><td colSpan={3} style={{ color: 'var(--sub)' }}>All lines above reorder level.</td></tr>}
                {lowStock.map((s) => <tr key={s.id}><td>{s.drug}</td><td><span className="st bad">{s.stock} low</span></td><td>{s.expiry}</td></tr>)}
              </tbody></table></div>
            </div>
            <div className="panel"><h3>Recent sales</h3>
              <div className="tblwrap"><table><thead><tr><th>Patient</th><th>Drug</th><th>Qty</th><th>Amount</th></tr></thead><tbody>
                {sales.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--sub)' }}>No sales yet.</td></tr>}
                {sales.slice(0, 6).map((s) => <tr key={s.id}><td>{s.name}</td><td>{s.drug}</td><td>{s.qty}</td><td>{inr(s.amount)}</td></tr>)}
              </tbody></table></div>
            </div>
          </div>
        </>
      )}

      {tab === 'dispense' && (
        <div className="cols">
          <div className="panel"><h3>Prescription queue <span className="c">from CPOE / EMR</span></h3>
            <div className="tblwrap"><table><thead><tr><th>Patient</th><th>Drug</th><th>Sig</th><th>Stock</th><th></th></tr></thead><tbody>
              {meds.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--sub)' }}>No active prescriptions — prescribe in CPOE or EMR.</td></tr>}
              {meds.map((m) => { const st = findStock(m.drug); return (
                <tr key={m.id}><td>{nameFor(m.key)}</td><td>{m.drug}</td><td>{m.dose} · {m.freq}</td>
                  <td>{st ? (st.stock <= 10 ? <span className="st bad">{st.stock}</span> : st.stock) : <span className="st warn">not stocked</span>}</td>
                  <td><button className="wbtn xs" onClick={() => dispenseRx(m)}>Dispense</button></td></tr>
              ); })}
            </tbody></table></div>
          </div>
          <OtcSale stock={stock} onChange={refresh} />
        </div>
      )}

      {tab === 'inventory' && <Inventory stock={stock} onChange={refresh} />}

      {tab === 'sales' && (
        <div className="panel"><h3>Sales &amp; dispensing log <span className="c">{sales.length}</span></h3>
          <div className="tblwrap"><table><thead><tr><th>When</th><th>Patient</th><th>Drug</th><th>Qty</th><th>Type</th><th>Amount</th></tr></thead><tbody>
            {sales.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--sub)' }}>No sales yet.</td></tr>}
            {sales.map((s) => <tr key={s.id}><td><small>{fmtt(s.at)}</small></td><td>{s.name}</td><td>{s.drug}</td><td>{s.qty}</td><td><span className={'st ' + (s.kind === 'Rx' ? 'ok' : 'info')}>{s.kind}</span></td><td>{inr(s.amount)}</td></tr>)}
          </tbody></table></div>
          <div className="mini" style={{ marginTop: 10 }}>Total today: <b>{inr(revenueToday)}</b> · {salesToday.length} transactions</div>
        </div>
      )}
    </div>
  );
}

/* ---------------- OTC / counter sale ---------------- */
function OtcSale({ stock, onChange }: { stock: Drug[]; onChange: () => void }) {
  const [drug, setDrug] = useState(stock[0]?.drug || ''); const [qty, setQty] = useState('1'); const [name, setName] = useState(''); const [msg, setMsg] = useState('');
  const sell = () => {
    const st = stock.find((s) => s.drug === drug); const q = Number(qty);
    if (!st || !q || q <= 0) { setMsg('Pick a drug and quantity.'); return; }
    if (q > st.stock) { setMsg('Not enough stock.'); return; }
    updateRow('his_pharm', st.id, { stock: st.stock - q });
    const amount = q * priceOf(st.drug);
    addRow<Sale>('pharm_sales', { name: name.trim() || 'Walk-in', drug: st.drug, qty: q, amount, kind: 'OTC', at: now() } as Omit<Sale, 'id'>);
    setMsg(`Sold ${q} × ${st.drug} — ${inr(amount)}`); setName(''); onChange();
  };
  return (
    <div className="panel"><h3>Counter / OTC sale</h3>
      <div className="frm">
        <label className="f"><span>Drug</span><select value={drug} onChange={(e) => setDrug(e.target.value)}>{stock.length === 0 && <option value="">No stock</option>}{stock.map((s) => <option key={s.id} value={s.drug}>{s.drug} (stk {s.stock})</option>)}</select></label>
        <div className="frow">
          <label className="f" style={{ flex: '0 0 90px' }}><span>Qty</span><input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" /></label>
          <label className="f"><span>Customer (optional)</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Walk-in" /></label>
        </div>
        <div className="mini">Unit price <b>{inr(priceOf(drug))}</b> · Total <b>{inr((Number(qty) || 0) * priceOf(drug))}</b></div>
        {msg && <div className="okbox">{msg}</div>}
        <button className="tbtn run" onClick={sell}>Sell &amp; bill →</button>
      </div>
    </div>
  );
}

/* ---------------- Inventory ---------------- */
function Inventory({ stock, onChange }: { stock: Drug[]; onChange: () => void }) {
  const [drug, setDrug] = useState(''); const [qty, setQty] = useState(''); const [batch, setBatch] = useState(''); const [expiry, setExpiry] = useState('');
  const add = () => { if (!drug.trim()) return; addRow<Drug>('his_pharm', { drug: drug.trim(), stock: Number(qty) || 0, batch: batch.trim() || '—', expiry: expiry.trim() || '—' } as Omit<Drug, 'id'>); setDrug(''); setQty(''); setBatch(''); setExpiry(''); onChange(); };
  const restock = (s: Drug) => { const q = Number(window.prompt(`Add stock to ${s.drug} (current ${s.stock}):`, '50')); if (!q) return; updateRow('his_pharm', s.id, { stock: s.stock + q }); onChange(); };
  return (
    <div className="cols">
      <div className="panel"><h3>Add / receive stock</h3>
        <div className="frm">
          <label className="f"><span>Drug</span><input value={drug} onChange={(e) => setDrug(e.target.value)} placeholder="e.g. Cetirizine 10mg" /></label>
          <div className="frow">
            <label className="f"><span>Quantity</span><input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="100" inputMode="numeric" /></label>
            <label className="f"><span>Batch</span><input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="B1234" /></label>
          </div>
          <label className="f"><span>Expiry (YYYY-MM)</span><input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="2028-03" /></label>
          <button className="tbtn run" onClick={add}>Add to inventory →</button>
        </div>
      </div>
      <div className="panel"><h3>Inventory <span className="c">shared with HIS pharmacy</span></h3>
        <div className="tblwrap"><table><thead><tr><th>Drug</th><th>Stock</th><th>Batch</th><th>Expiry</th><th></th></tr></thead><tbody>
          {stock.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--sub)' }}>No stock.</td></tr>}
          {stock.map((s) => <tr key={s.id}><td>{s.drug}</td><td>{s.stock <= 10 ? <span className="st bad">{s.stock} low</span> : s.stock}</td><td>{s.batch}</td><td>{s.expiry}</td>
            <td><button className="wbtn xs" onClick={() => restock(s)}>Restock</button></td></tr>)}
        </tbody></table></div>
      </div>
    </div>
  );
}
