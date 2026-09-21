import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';
import { saveRow } from '../api/supabase';
import { SIMD_CSS } from './SimulatorBrowser';

const KIT_IMG = `${import.meta.env.BASE_URL}kits/orthopedic-cell-therapy-kit.png`;

const therapies: { disease: string; brand: string }[] = [
  { disease: 'Knee osteoarthritis (KL Grade II–III)', brand: 'CiploStem® (Cipla) · StemOne® (Alkem)' },
  { disease: 'Critical Limb Ischaemia — Buerger’s / PAD', brand: 'Regenacip® (Cipla)' },
];

const deliverables: { icon: IconName; title: string; body: string; to?: string }[] = [
  { icon: 'star', title: 'Premium delivery box', body: 'Ships in a beautiful, reusable presentation box — organised and clinic-ready.' },
  { icon: 'clipboard', title: 'Protocol + forms', body: 'Step-by-step SOP plus printable traceability, VAS & WOMAC forms.', to: '/protocols' },
  { icon: 'ai', title: 'AI care assistant', body: 'Reads labs, ECGs and scans and guides the workflow — included.', to: '/assistant' },
  { icon: 'dna', title: 'Protocol Simulator', body: 'A per-patient outcome & safety read before you treat.', to: '/simulator' },
];

const contents: { group: string; icon: IconName; items: string[]; note?: string }[] = [
  { group: 'A · Cold-chain & storage', icon: 'dish', items: ['Cryoshipper / dry shipper', 'Temperature data-logger', 'Cryogloves', 'Cryogenic tongs / forceps', 'LN₂ dewar — vapour-phase (on-site storage)'] },
  { group: 'B · Thaw & reconstitution', icon: 'flask', items: ['Thermostatic water bath (37 ± 1 °C)', 'Timer + water-bath thermometer', 'Multiple Electrolyte Solution / PlasmaLyte A', '2 ml sterile syringe', '18G needle (reconstitution)', 'Alcohol swabs'], note: 'Therapy vials (CiploStem® / StemOne® / Regenacip®) supplied per treatment.' },
  { group: 'C · Injection', icon: 'syringe', items: ['5 ml syringe', '20G, 2.0-inch (5.1 cm) needle', 'Pre-filled 2 ml sodium hyaluronate syringe', 'Ultrasound machine + probe cover + gel', 'Sterile gloves, drape, gown, cap, mask', 'Antiseptic skin prep', 'Sterile gauze + dressing', 'Sharps container'] },
  { group: 'D · Pre-medication', icon: 'dish', items: ['IV hydrocortisone 100 mg', 'Pheniramine maleate 45.5 mg', 'IV cannula + set + normal saline', 'Drug syringes / needles'] },
  { group: 'E · Monitoring & emergency', icon: 'heart', items: ['BP monitor · pulse oximeter · thermometer', 'Adrenaline (1:1000) + anaphylaxis drugs', 'Oxygen source + mask / cannula', 'Airway / resuscitation kit / crash trolley', 'IV fluids'] },
];

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);

const KIT_CSS = `
.kit-sec{margin-top:26px}
.kit-h{font-family:var(--disp);font-weight:700;font-size:clamp(18px,2.2vw,22px);margin:0 0 3px;color:var(--ink)}
.kit-sub{font-size:12.8px;color:var(--mut);margin:0 0 15px;max-width:74ch}
.kit-hero{padding:14px}
.kit-hero img{width:100%;height:auto;border-radius:16px;display:block}
.kit-cap{text-align:center;font-size:12px;color:var(--mut);margin-top:10px}
.kit-grid{display:grid;gap:18px}
.kit-grid.two{grid-template-columns:1fr 1fr}
.kit-grid.four{grid-template-columns:repeat(4,1fr)}
@media(max-width:900px){.kit-grid.two,.kit-grid.four{grid-template-columns:1fr}}
.kit-p{padding:20px 22px}
.kit-p h3{font-family:var(--disp);font-weight:700;font-size:15px;margin:0;color:var(--ink)}
.kit-prow{display:flex;align-items:center;gap:12px}
.kit-tile{width:44px;height:44px;border-radius:13px;flex:none;display:grid;place-items:center;color:var(--blue);background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl)}
.kit-list{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--ink)}
.kit-list li{display:flex;gap:8px;align-items:flex-start}
.kit-list svg{width:15px;height:15px;color:var(--blue);flex:none;margin-top:2px}
.kit-note{font-size:11.5px;color:var(--fnt);margin-top:11px}
.kit-link{font-weight:700;font-size:12.5px;color:var(--blue);text-decoration:none;margin-top:10px;display:inline-block}
.kit-tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}
.kit-tbl th{text-align:left;font-family:var(--mono);font-size:9.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--fnt);padding:8px;border-bottom:1px solid var(--track)}
.kit-tbl td{padding:10px 8px;border-bottom:1px solid var(--track);color:var(--ink);vertical-align:top}
.kit-appr{display:inline-flex;align-items:center;gap:4px;font-family:var(--mono);font-size:10px;font-weight:700;color:#1f9d78;background:rgba(31,157,120,.13);padding:3px 8px;border-radius:999px;white-space:nowrap}
.kit-x{width:44px;height:44px;border-radius:13px;flex:none;display:grid;place-items:center;color:var(--fnt);background:var(--sp);box-shadow:inset 4px 4px 9px var(--shd),inset -4px -4px 9px var(--shl);font-weight:700}
.kit-price{font-family:var(--disp);font-weight:800;font-size:32px;color:var(--ink);margin-top:12px}
.kit-price small{display:block;font-family:var(--disp);font-weight:600;font-size:12px;color:var(--mut);margin-top:2px}
.kit-tag{display:inline-flex;align-items:center;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.05em;color:var(--blue);background:var(--sp);box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);padding:6px 11px;border-radius:999px}
.kit-btn{font-family:var(--disp);font-weight:700;font-size:14px;border:0;cursor:pointer;color:#fff;background:var(--grad);border-radius:14px;padding:13px 26px;box-shadow:6px 6px 16px rgba(106,83,255,.28);transition:transform .12s}
.kit-btn:hover{transform:translateY(-1px)}
.kit-full{grid-column:1 / -1}
.simd-ctl textarea{width:100%;border:0;background:transparent;outline:none;font-family:inherit;font-size:13.5px;color:var(--ink);padding:12px 14px;border-radius:13px;resize:vertical;min-height:100px}
.kit-ok{padding:34px 24px;text-align:center}
.kit-ok .kit-tile{margin:0 auto 12px;color:#1f9d78}
.simd-disc{font-size:11.5px;color:var(--fnt);text-align:center;margin-top:26px}
`;

const ROLES = ['Orthopaedic surgeon', 'Rheumatologist', 'Hospital / institution', 'Clinic owner', 'Distributor', 'Other'];

export default function Kits() {
  const [form, setForm] = useState({ name: '', org: '', role: ROLES[0], email: '', phone: '', city: '', message: '' });
  const [done, setDone] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    saveRow('kit_quotes', { ...form, kit: 'Orthopaedic Cell Therapy Kit' });
    const subject = encodeURIComponent('Quote request — Orthopaedic Cell Therapy Kit');
    const body = encodeURIComponent(
      `Name: ${form.name}\nClinic / Hospital: ${form.org}\nRole: ${form.role}\nEmail: ${form.email}\nPhone: ${form.phone}\nCity: ${form.city}\n\nMessage:\n${form.message}`,
    );
    try { window.location.href = `mailto:dr.sanjay@stemcellsprotocol.com?subject=${subject}&body=${body}`; } catch { /* ignore */ }
    setDone(true);
  };

  return (
    <div className="simd">
      <style>{SIMD_CSS + KIT_CSS}</style>
      <div className="simd-wrap container-x">

        {/* Header band */}
        <div className="simd-top">
          <span className="simd-mark"><Icon name="microscope" className="h-7 w-7" /></span>
          <div className="simd-ttl">
            <h1>Cell-therapy kits <span>for mass adoption</span></h1>
            <p>Approved cell therapies, packaged into one ready-to-use kit — for clinics, hospitals &amp; institutions.</p>
          </div>
          <span className="simd-badge">Clinics · Hospitals · Institutions</span>
        </div>

        {/* Hero image */}
        <div className="simd-neu kit-hero">
          <img src={KIT_IMG} alt="StemCells Protocol — Orthopaedic Cell Therapy Kit and its component boxes" />
          <p className="kit-cap">Kit 01 · Orthopaedic Cell Therapy Kit — the complete workflow in one box.</p>
        </div>

        {/* Featured kit */}
        <div className="kit-sec simd-neu kit-p">
          <div className="kit-prow">
            <span className="kit-tile"><Icon name="hospital" className="h-6 w-6" /></span>
            <div>
              <h3 style={{ fontSize: '18px' }}>Orthopaedic Cell Therapy Kit</h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.8px', color: 'var(--mut)' }}>For orthopaedic surgeons — deliver approved allogeneic BM-MSC therapy (Stempeucel® platform) at the point of care.</p>
            </div>
          </div>
          <table className="kit-tbl">
            <thead><tr><th>Indication</th><th>Brand</th><th>Status</th></tr></thead>
            <tbody>
              {therapies.map((t) => (
                <tr key={t.disease}>
                  <td style={{ fontWeight: 600 }}>{t.disease}</td>
                  <td style={{ color: 'var(--mut)' }}>{t.brand}</td>
                  <td><span className="kit-appr">✓ DCGI-approved</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* More than a box */}
        <div className="kit-sec">
          <h2 className="kit-h">More than a box</h2>
          <p className="kit-sub">The method, not just the machine — the kit ships with the protocol, our software and the simulator.</p>
          <div className="kit-grid four">
            {deliverables.map((d) => (
              <div key={d.title} className="simd-neu kit-p">
                <span className="kit-tile"><Icon name={d.icon} className="h-6 w-6" /></span>
                <h3 style={{ marginTop: '12px' }}>{d.title}</h3>
                <p style={{ margin: '6px 0 0', fontSize: '12.8px', color: 'var(--mut)' }}>{d.body}</p>
                {d.to && <Link className="kit-link" to={d.to}>Explore →</Link>}
              </div>
            ))}
          </div>
        </div>

        {/* What's in the kit */}
        <div className="kit-sec">
          <h2 className="kit-h">What’s in the kit</h2>
          <p className="kit-sub">Everything to prepare, administer and safely monitor the therapy is included — the only item <b style={{ color: 'var(--ink)' }}>not</b> included is the patient <b style={{ color: 'var(--ink)' }}>observation bed</b>.</p>
          <div className="kit-grid two">
            {contents.map((c) => (
              <div key={c.group} className="simd-neu kit-p">
                <div className="kit-prow">
                  <span className="kit-tile"><Icon name={c.icon} className="h-5 w-5" /></span>
                  <h3>{c.group}</h3>
                </div>
                <ul className="kit-list">
                  {c.items.map((it) => (<li key={it}><Check /> {it}</li>))}
                </ul>
                {c.note && <p className="kit-note">{c.note}</p>}
              </div>
            ))}
            <div className="simd-neu kit-p" style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
              <span className="kit-x">✕</span>
              <div>
                <h3>Not included</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12.8px', color: 'var(--mut)' }}>Patient observation bed / recliner — provided by the clinic.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="kit-sec">
          <h2 className="kit-h">Pricing</h2>
          <p className="kit-sub">Indicative — a one-time kit cost plus a per-treatment therapy cost the patient pays.</p>
          <div className="kit-grid two">
            <div className="simd-neu kit-p">
              <span className="kit-tag">One-time · the kit</span>
              <div className="kit-price">₹3–5 lakh<small>per kit (one-time)</small></div>
              <ul className="kit-list">
                {['All cold-chain, thaw, injection, pre-med & emergency equipment', 'Handheld ultrasound (Vscan-class) for guided injection', 'Premium reusable delivery box', 'Validated protocol + printable clinical forms', 'AI care-assistant software + Protocol Simulator access'].map((f) => (<li key={f}><Check /> {f}</li>))}
              </ul>
              <p className="kit-note">Observation bed not included. Final price, configuration &amp; GST on enquiry.</p>
            </div>
            <div className="simd-neu kit-p">
              <span className="kit-tag">Per treatment · recurring</span>
              <div className="kit-price">~₹1.25 lakh<small>per patient (therapy dose)</small></div>
              <ul className="kit-list">
                <li><Check /> Cell-therapy vial — CiploStem® / StemOne® / Regenacip® (25M cells)</li>
                <li><Check /> Per-procedure consumables ≈ ₹400–900</li>
                <li><Check /> Supplied per case via Cipla / Alkem</li>
              </ul>
              <p className="kit-note">Patient-facing therapy cost; clinic sets its own service fee.</p>
            </div>
          </div>
        </div>

        {/* Request a quote */}
        <div className="kit-sec simd-neu kit-p" id="quote">
          {done ? (
            <div className="kit-ok">
              <span className="kit-tile"><Icon name="hospital" className="h-6 w-6" /></span>
              <h3 style={{ fontSize: '18px' }}>Thank you — request received</h3>
              <p style={{ margin: '8px auto 0', maxWidth: '48ch', fontSize: '13px', color: 'var(--mut)' }}>
                We’ll be in touch with availability, pricing and onboarding. If your email app didn’t open, write to
                {' '}<a className="kit-link" href="mailto:dr.sanjay@stemcellsprotocol.com" style={{ margin: 0 }}>dr.sanjay@stemcellsprotocol.com</a>.
              </p>
            </div>
          ) : (
            <>
              <div className="kit-prow" style={{ marginBottom: '16px' }}>
                <span className="kit-tile"><Icon name="clipboard" className="h-6 w-6" /></span>
                <div>
                  <h3 style={{ fontSize: '18px' }}>Request a quote</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12.8px', color: 'var(--mut)' }}>For the Orthopaedic Cell Therapy Kit — we’ll send pricing, configuration &amp; onboarding.</p>
                </div>
              </div>
              <form onSubmit={submit}>
                <div className="simd-fields">
                  <div className="simd-field"><label>Full name</label><div className="simd-ctl"><input required value={form.name} onChange={set('name')} placeholder="Dr. …" /></div></div>
                  <div className="simd-field"><label>Clinic / Hospital</label><div className="simd-ctl"><input value={form.org} onChange={set('org')} placeholder="Organisation" /></div></div>
                  <div className="simd-field"><label>Role</label><div className="simd-ctl"><select value={form.role} onChange={set('role')}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select><svg className="simd-caret" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M1 1l5 5 5-5" /></svg></div></div>
                  <div className="simd-field"><label>City</label><div className="simd-ctl"><input value={form.city} onChange={set('city')} placeholder="City" /></div></div>
                  <div className="simd-field"><label>Email</label><div className="simd-ctl"><input required type="email" value={form.email} onChange={set('email')} placeholder="you@clinic.com" /></div></div>
                  <div className="simd-field"><label>Phone / WhatsApp</label><div className="simd-ctl"><input value={form.phone} onChange={set('phone')} placeholder="+91 …" /></div></div>
                  <div className="simd-field kit-full"><label>Message <em>(optional)</em></label><div className="simd-ctl"><textarea value={form.message} onChange={set('message')} placeholder="Volumes, indications of interest, timeline…" /></div></div>
                </div>
                <div style={{ marginTop: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="submit" className="kit-btn">Request a quote</button>
                  <Link to="/waiting-list" className="kit-link" style={{ margin: 0 }}>or join the waiting list →</Link>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="simd-disc">
          Kit delivers DCGI/CDSCO-approved therapies for their approved indications; administration is by a
          qualified clinician per the product label. Figures are illustrative pending final kit specification.
        </p>
      </div>
    </div>
  );
}
