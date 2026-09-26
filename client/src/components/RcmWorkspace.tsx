import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getColl, addRow, updateRow } from '../api/localdb';

/* Fully-functional RCM (Revenue Cycle Management — billing / claims / TPA). It
   operates on the SAME hospital-bill ledger HIS writes (his_bills) and folds in
   pharmacy revenue (pharm_sales) for a unified financial picture. Full claim
   lifecycle: Draft → Submitted → Approved → Paid, or Denied → resubmit. All data
   stays on the provider's machine. */

const now = () => new Date().toISOString();
const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const daysAgo = (d?: string) => (d ? Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 86400000)) : 0);

type Bill = { id: string; name: string; amount: number; payer: string; status: string; createdAt: string; denialReason?: string; submittedAt?: string };
type Sale = { id: string; amount: number; at: string };
type Adm = { id: string; name: string; abha: string };
type Pat = { id: string; name: string; abha: string };

const PAYERS = ['Self-pay', 'Star Health', 'Ayushman (PMJAY)', 'ICICI Lombard', 'Other TPA'];
const OPEN = ['Draft', 'Submitted', 'Approved', 'Pending'];

const TABS = [
  ['dash', 'Dashboard'],
  ['claims', 'Claims'],
  ['new', 'New claim'],
  ['aging', 'Payments · Aging'],
] as const;

export default function RcmWorkspace() {
  const nav = useNavigate();
  const [tab, setTab] = useState<string>('dash');
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const bills = getColl<Bill>('his_bills');
  const sales = getColl<Sale>('pharm_sales');
  const outpatients = getColl<Pat>('emr_patients');
  const adm = getColl<Adm>('his_adm');

  const billed = bills.reduce((t, b) => t + b.amount, 0);
  const collectedBills = bills.filter((b) => b.status === 'Paid').reduce((t, b) => t + b.amount, 0);
  const pharmRev = sales.reduce((t, s) => t + s.amount, 0);
  const collected = collectedBills + pharmRev;
  const outstanding = bills.filter((b) => OPEN.includes(b.status)).reduce((t, b) => t + b.amount, 0);
  const denied = bills.filter((b) => b.status === 'Denied');
  const denialRate = bills.length ? Math.round((denied.length / bills.length) * 100) : 0;

  // payer mix (by billed amount)
  const byPayer = PAYERS.map((p) => ({ payer: p, amt: bills.filter((b) => b.payer === p).reduce((t, b) => t + b.amount, 0) }));
  const maxPayer = Math.max(1, ...byPayer.map((x) => x.amt));

  // aging buckets of open claims
  const buckets = [['0-30', 0, 30], ['31-60', 31, 60], ['60+', 61, 99999]] as const;
  const agingData = buckets.map(([label, lo, hi]) => ({ label, amt: bills.filter((b) => OPEN.includes(b.status) && daysAgo(b.createdAt) >= lo && daysAgo(b.createdAt) <= hi).reduce((t, b) => t + b.amount, 0) }));
  const maxAge = Math.max(1, ...agingData.map((x) => x.amt));

  const setStatus = (b: Bill, status: string, extra: Record<string, any> = {}) => { updateRow('his_bills', b.id, { status, ...extra }); refresh(); };
  const submit = (b: Bill) => setStatus(b, 'Submitted', { submittedAt: now() });
  const approve = (b: Bill) => setStatus(b, 'Approved');
  const pay = (b: Bill) => setStatus(b, 'Paid');
  const deny = (b: Bill) => { const r = window.prompt('Denial reason:', 'Documentation incomplete'); if (r == null) return; setStatus(b, 'Denied', { denialReason: r.trim() || 'Denied' }); };
  const resubmit = (b: Bill) => setStatus(b, 'Submitted', { submittedAt: now(), denialReason: '' });

  const explain = () => {
    try { sessionStorage.setItem('meddroid_pending', JSON.stringify({ q: 'Explain my hospital bill and insurance/TPA claim in simple Hindi — what is covered, what I owe, and what to do if a claim is denied.', spec: 'General Physician' })); } catch { /* ignore */ }
    nav('/assistant');
  };

  const nameList = [...new Set([...outpatients.map((p) => p.name), ...adm.map((a) => a.name)])];

  return (
    <div className="mock rcm">
      <div className="mhead">
        <div><div className="mtitle">RCM</div><div className="mfull">Revenue Cycle · Billing · Claims · TPA · live</div></div>
        <span className="badge">Operations</span>
        <button className="md-chip" onClick={explain}><span className="r" />MedDroid · Explain in Hindi</button>
      </div>

      <div className="pipe"><span className="pl">Sources</span><span className="node">HIS bills</span><span className="node">Pharmacy sales</span><span className="node">Claim → TPA</span><span className="node">Payment</span><span className="live"><span className="d" />LIVE</span></div>

      <div className="htabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'htab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'dash' && (
        <>
          <div className="kpis">
            <div className="tile"><div className="v">{inr(billed)}</div><div className="l">Total billed</div></div>
            <div className="tile"><div className="v">{inr(collected)}</div><div className="l">Collected</div><div className="s">incl. {inr(pharmRev)} pharmacy</div></div>
            <div className="tile"><div className="v">{inr(outstanding)}</div><div className="l">Outstanding</div></div>
            <div className="tile"><div className="v">{denialRate}%</div><div className="l">Denial rate</div><div className="s">{denied.length} denied</div></div>
          </div>
          <div className="cols">
            <div className="panel"><h3>Payer mix <span className="c">by billed value</span></h3>
              <div className="wardgrid">
                {byPayer.map((p) => (
                  <div className="ward" key={p.payer}><div className="wn"><span>{p.payer}</span><span>{inr(p.amt)}</span></div><div className="bar"><i style={{ width: Math.round((p.amt / maxPayer) * 100) + '%' }} /></div></div>
                ))}
              </div>
            </div>
            <div className="panel"><h3>A/R aging <span className="c">open claims</span></h3>
              <div className="wardgrid">
                {agingData.map((a) => (
                  <div className="ward" key={a.label}><div className="wn"><span>{a.label} days</span><span>{inr(a.amt)}</span></div><div className="bar"><i style={{ width: Math.round((a.amt / maxAge) * 100) + '%', background: a.label === '60+' ? 'var(--bad)' : undefined }} /></div></div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'claims' && (
        <div className="panel"><h3>Claims ledger <span className="c">shared with HIS billing</span></h3>
          <div className="tblwrap"><table><thead><tr><th>Patient</th><th>Payer</th><th>Amount</th><th>Age</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {bills.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--sub)' }}>No claims — create one, or bill in HIS.</td></tr>}
            {bills.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td><td>{b.payer}</td><td>{inr(b.amount)}</td><td>{daysAgo(b.createdAt)}d</td>
                <td><span className={'st ' + stcls(b.status)}>{b.status}</span>{b.status === 'Denied' && b.denialReason && <div className="mini" style={{ color: 'var(--bad)' }}>{b.denialReason}</div>}</td>
                <td><div className="rowacts">
                  {(b.status === 'Draft' || b.status === 'Pending') && <button className="wbtn xs" onClick={() => submit(b)}>Submit</button>}
                  {b.status === 'Submitted' && <><button className="wbtn xs" onClick={() => approve(b)}>Approve</button><button className="wbtn xs" onClick={() => deny(b)}>Deny</button></>}
                  {b.status === 'Approved' && <button className="wbtn xs" onClick={() => pay(b)}>Mark paid</button>}
                  {b.status === 'Denied' && <button className="wbtn xs" onClick={() => resubmit(b)}>Resubmit</button>}
                  {b.status === 'Paid' && <span className="mini">Settled</span>}
                </div></td>
              </tr>
            ))}
          </tbody></table></div>
        </div>
      )}

      {tab === 'new' && <NewClaim names={nameList} onChange={refresh} goClaims={() => setTab('claims')} />}

      {tab === 'aging' && (
        <div className="panel"><h3>Outstanding claims <span className="c">oldest first</span></h3>
          <div className="tblwrap"><table><thead><tr><th>Patient</th><th>Payer</th><th>Amount</th><th>Age</th><th>Status</th></tr></thead><tbody>
            {bills.filter((b) => OPEN.includes(b.status)).length === 0 && <tr><td colSpan={5} style={{ color: 'var(--sub)' }}>Nothing outstanding — all settled.</td></tr>}
            {bills.filter((b) => OPEN.includes(b.status)).sort((x, y) => daysAgo(y.createdAt) - daysAgo(x.createdAt)).map((b) => (
              <tr key={b.id}><td>{b.name}</td><td>{b.payer}</td><td>{inr(b.amount)}</td>
                <td>{daysAgo(b.createdAt) > 60 ? <span className="st bad">{daysAgo(b.createdAt)}d</span> : daysAgo(b.createdAt) + 'd'}</td>
                <td><span className={'st ' + stcls(b.status)}>{b.status}</span></td></tr>
            ))}
          </tbody></table></div>
        </div>
      )}
    </div>
  );
}

function stcls(s: string) { return s === 'Paid' ? 'ok' : s === 'Approved' ? 'ok' : s === 'Denied' ? 'bad' : s === 'Submitted' ? 'info' : 'warn'; }

/* ---------------- New claim ---------------- */
function NewClaim({ names, onChange, goClaims }: { names: string[]; onChange: () => void; goClaims: () => void }) {
  const [name, setName] = useState(names[0] || ''); const [amount, setAmount] = useState(''); const [payer, setPayer] = useState(PAYERS[1]); const [err, setErr] = useState(''); const [msg, setMsg] = useState('');
  const create = () => {
    if (!name.trim() || !amount) { setErr('Enter patient and amount.'); return; }
    addRow<Bill>('his_bills', { name: name.trim(), amount: Number(amount) || 0, payer, status: 'Draft', createdAt: now() } as Omit<Bill, 'id'>);
    setErr(''); setMsg(`Claim created for ${name.trim()} · ${inr(Number(amount) || 0)} · ${payer}.`); setAmount(''); onChange();
  };
  return (
    <div className="cols">
      <div className="panel"><h3>Create claim / invoice</h3>
        <div className="frm">
          <label className="f"><span>Patient</span>
            {names.length ? <input list="rcm-names" value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient name" /> : <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient name" />}
            <datalist id="rcm-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
          </label>
          <label className="f"><span>Amount (₹)</span><input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="45000" inputMode="numeric" /></label>
          <label className="f"><span>Payer / TPA</span><select value={payer} onChange={(e) => setPayer(e.target.value)}>{PAYERS.map((p) => <option key={p}>{p}</option>)}</select></label>
          {err && <div className="ferr">{err}</div>}
          {msg && <div className="okbox">{msg} <button className="wbtn xs" style={{ marginLeft: 8 }} onClick={goClaims}>View claims →</button></div>}
          <button className="tbtn run" onClick={create}>Create claim →</button>
        </div>
      </div>
      <div className="panel"><h3>Claim lifecycle</h3>
        <div className="list">
          <div className="li"><div className="ic">1</div><div className="g">Draft → Submit<small>Send the claim to the payer / TPA</small></div></div>
          <div className="li"><div className="ic">2</div><div className="g">Approve or Deny<small>Denials capture a reason and can be resubmitted</small></div></div>
          <div className="li"><div className="ic">3</div><div className="g">Mark paid<small>Moves value into Collected; drops out of A/R aging</small></div></div>
          <div className="li"><div className="ic">₹</div><div className="g">Unified revenue<small>HIS bills + pharmacy sales roll into the dashboard</small></div></div>
        </div>
      </div>
    </div>
  );
}
