import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';
import { CATEGORIES, PROTOCOLS, type Category, type Protocol } from '../protocols/registry';
import { STANDARDS, DISCLAIMER } from '../protocols/standards';
import { FACILITY_SUMMARY } from '../protocols/facility';

// All-blue medallion gradients (light → deep) for the neumorphic facility tray.
const MED_BLUE = [
  'linear-gradient(145deg,#83a9f8,#2f6fe0)',
  'linear-gradient(145deg,#5b90f6,#1f59c2)',
  'linear-gradient(145deg,#2f6fe0,#153a7c)',
];

/**
 * StemCells Protocol — Standard (v0.1): a coded, safety-first protocol registry,
 * presented as a neumorphic dashboard (matches the Simulator). Static + on-device.
 */

type Scope = 'Systemic' | 'Local' | 'Surface' | 'Targeted';
const SCOPE_CLS: Record<Scope, string> = { Systemic: 'b', Local: 'g', Surface: 'a', Targeted: 'p' };
const ROUTES: { icon: IconName; name: string; scope: Scope; blurb: string }[] = [
  { icon: 'syringe', name: 'IV infusion', scope: 'Systemic', blurb: 'Into a vein, travelling the bloodstream — used for systemic/immune conditions. Large cells are trapped in the lungs and cleared within 1–2 days, so the effect is a paracrine “hit-and-run”; carries the embolic / IBMIR clotting risk the Simulator screens for.' },
  { icon: 'flask', name: 'Intra-articular', scope: 'Local', blurb: 'Directly into a joint space (e.g. knee osteoarthritis) — delivers a high local cell dose and avoids the lung trap.' },
  { icon: 'syringe', name: 'Local injection', scope: 'Local', blurb: 'Into the target tissue itself — perianal fistula, intervertebral disc, tendon, skin or dental sites.' },
  { icon: 'brain', name: 'Intrathecal', scope: 'Local', blurb: 'Into the cerebrospinal fluid via lumbar puncture, to reach neurological targets (ALS, spinal-cord injury).' },
  { icon: 'heart', name: 'Intracoronary / Intramyocardial', scope: 'Local', blurb: 'Via catheter into the coronary arteries or the heart muscle, for cardiac repair after infarction or in heart failure.' },
  { icon: 'stethoscope', name: 'Intramuscular', scope: 'Local', blurb: 'Depot injections spread across a muscle group — e.g. to drive angiogenesis in critical limb ischaemia.' },
  { icon: 'clinician', name: 'Surgical implant', scope: 'Local', blurb: 'Cells (often on a scaffold) seated into a prepared defect in theatre — bone, cartilage, cornea or retina.' },
  { icon: 'dish', name: 'Topical / surface', scope: 'Surface', blurb: 'Applied to skin or a wound surface, often through micro-channels or as a growth-factor-rich membrane graft.' },
  { icon: 'microscope', name: 'Portal / Subretinal', scope: 'Targeted', blurb: 'Organ-specific access — portal vein for liver or islet cells, subretinal delivery beneath the retina for eye therapies.' },
];

type Level = {
  n: string; accent: string; name: string; cost: string; costNote: string;
  cumulative: string; adds: string; unlocks: { label: string; flag?: boolean }[]; unlockNote?: string;
};
const LEVELS: Level[] = [
  {
    n: '1', accent: '#4285F4', name: 'Outpatient administration clinic', cost: '$50–150k', costNote: 'one-time · live now',
    cumulative: '≈ 40 of 64 therapies',
    adds: 'The minimum kit — cold chain, aseptic prep, IV & injection administration, monitoring and emergency readiness (product supplied by a GMP manufacturer).',
    unlocks: [
      { label: 'All MSC IV infusions (age-rejuvenation, autoimmune, organ)' },
      { label: 'IV & topical exosome therapies' },
      { label: 'Intra-articular & local injections' },
      { label: 'PRP' },
    ],
    unlockNote: 'Covers every Phase-1 revenue therapy from day one.',
  },
  {
    n: '2', accent: '#22c55e', name: 'Interventional & day-procedure centre', cost: '+$0.2–0.8M', costNote: 'added · cath lab optional',
    cumulative: '≈ 54 of 64 therapies',
    adds: 'A minor-OR / day-surgery suite, image guidance (C-arm + ultrasound), point-of-care processing (SVF / BMAC), short-stay beds and harvest suites; optional cath lab.',
    unlocks: [
      { label: 'Post-MI repair' }, { label: 'Heart failure' }, { label: 'Cardiosphere' },
      { label: 'Critical limb ischaemia' }, { label: 'Alveolar bone' }, { label: 'Non-union fracture' },
    ],
    unlockNote: 'Plus it graduates Level 1’s dental, disc, fat-grafting + SVF, ALS-intrathecal and inpatient (GvHD / ARDS / AKI) therapies to native.',
  },
  {
    n: '3', accent: '#a855f7', name: 'Advanced cell & gene-therapy centre', cost: '$5–50M', costNote: 'owned · or via CDMO',
    cumulative: '64 of 64 — the full catalogue',
    adds: 'Full GMP manufacturing, apheresis, a cryo cell-bank, QC lab, and transplant & gene-therapy programmes — or reached capital-light via a CDMO + partner hospital (the seed’s route to first-in-human).',
    unlocks: [
      { label: 'Persona Reversal — age reversal', flag: true }, { label: 'Persona Reversal — renal', flag: true },
      { label: 'CCR5 transplants & gene-edits' }, { label: 'MS aHSCT' }, { label: 'Systemic sclerosis HSCT' },
      { label: 'NK-cell & thymic' }, { label: 'Type 1 diabetes islets' }, { label: 'Spinal-cord iPSC' },
      { label: 'FSHD' }, { label: 'Parkinson’s iPSC' }, { label: 'Whole-tooth' }, { label: 'Airway epithelium' },
    ],
    unlockNote: 'The flagship Persona Reversal reprogramming platform lives here — the tier the seed round funds.',
  },
];

export default function Protocols() {
  const [cat, setCat] = useState<Category | 'ALL'>('ALL');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return PROTOCOLS.filter((p) =>
      (cat === 'ALL' || p.category === cat) &&
      (!query || p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query) ||
        p.indication.toLowerCase().includes(query) || (p.aka || '').toLowerCase().includes(query) ||
        (p.regions || '').toLowerCase().includes(query)));
  }, [cat, q]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of PROTOCOLS) m[p.category] = (m[p.category] || 0) + 1;
    return m;
  }, []);

  const established = PROTOCOLS.filter((p) => p.status === 'established').length;
  const investigational = PROTOCOLS.length - established;
  const fullProtocols = PROTOCOLS.filter((p) => p.detailed).length;

  const STATS = [
    { v: PROTOCOLS.length, k: 'Coded protocols' },
    { v: CATEGORIES.length, k: 'Therapy categories' },
    { v: established, k: 'Established' },
    { v: investigational, k: 'Investigational' },
    { v: '3', k: 'Facility levels' },
    { v: fullProtocols, k: 'Full protocols' },
  ];

  return (
    <div className="pd">
      <style>{PROTO_CSS}</style>
      <div className="pd-wrap container-x">
        {/* top bar */}
        <div className="pd-top">
          <span className="pd-mark"><Icon name="clipboard" className="h-7 w-7" /></span>
          <div className="pd-ttl">
            <h1>The Protocol <span>Standard</span></h1>
            <p>One coded, safety-first, documented standard — same results, everywhere.</p>
          </div>
          <span className="pd-badge">Standard v0.1 · draft</span>
          <span className="pd-spacer" />
          <Link to="/products" className="pd-btn solid"><Icon name="clipboard" className="h-4 w-4" /> Product Catalogue</Link>
          <Link to="/synthesizer" className="pd-btn ghost"><Icon name="flask" className="h-4 w-4" /> Synthesizer</Link>
        </div>

        {/* KPI strip */}
        <div className="pd-stats">
          {STATS.map((s) => (
            <div key={s.k} className="pd-stat pd-neu">
              <div className="v">{s.v}</div>
              <div className="k">{s.k}</div>
            </div>
          ))}
        </div>

        {/* facility launcher (full-width, horizontal) */}
        <section className="pd-panel pd-neu">
            <div className="pd-ph"><span className="pi"><Icon name="clipboard" className="h-5 w-5" /></span><h2>Build your facility</h2></div>
            <p className="pd-sub">The capital staircase — a clinic that earns from day one funds the climb to a full cell &amp; gene-therapy centre.</p>
            <div className="pd-fac-list">
              {FACILITY_SUMMARY.map((lv, i) => (
                <Link key={lv.n} to={`/protocols/facility/${lv.n}`} className="pd-fac">
                  <span className="pd-med" style={{ background: MED_BLUE[i] }}>{lv.n}</span>
                  <span className="pd-fac-tx">
                    <span className="lbl">LEVEL {lv.n} · {lv.cost}</span>
                    <span className="nm">{lv.name}</span>
                    <span className="cm">{lv.cumulative}</span>
                  </span>
                  <span className="pd-arw"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
                </Link>
              ))}
            </div>
          </section>

        {/* safety backbone (full-width, horizontal) */}
        <section className="pd-panel pd-neu">
            <div className="pd-ph"><span className="pi"><Icon name="hospital" className="h-5 w-5" /></span><h2>Safety &amp; quality backbone</h2></div>
            <p className="pd-sub">Every coded protocol inherits this cross-cutting layer, grounded in the frameworks that govern cell &amp; gene therapy.</p>
            <div className="pd-std-list">
              {STANDARDS.map((g) => (
                <div key={g.key} className="pd-std">
                  <div className="pd-std-h"><span className="pi sm"><Icon name={g.icon as IconName} className="h-4 w-4" /></span><h3>{g.title}</h3></div>
                  <ul>
                    {g.items.map((it) => (
                      <li key={it.label}><b>{it.label}</b> — {it.note}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
        </section>

        {/* Coded protocol registry — the main organised panel */}
        <section className="pd-panel pd-neu pd-registry">
          <div className="pd-reg-top">
            <div className="pd-ph"><span className="pi"><Icon name="clipboard" className="h-5 w-5" /></span><h2>Coded protocol registry</h2></div>
            <div className="pd-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, therapy, condition…" />
            </div>
          </div>
          <div className="pd-filters">
            {(['ALL', ...CATEGORIES.map((c) => c.key)] as (Category | 'ALL')[]).map((k) => (
              <button key={k} type="button" onClick={() => setCat(k)} className={'pd-chipf' + (cat === k ? ' on' : '')}>
                {k === 'ALL' ? `All · ${PROTOCOLS.length}` : `${k} · ${counts[k] || 0}`}
              </button>
            ))}
          </div>
          <div className="pd-cards">
            {list.map((p) => <ProtocolCard key={p.code} p={p} />)}
          </div>
          {list.length === 0 && <p className="pd-empty">No protocols match that search.</p>}
        </section>

        {/* Delivery routes */}
        <section className="pd-panel pd-neu">
          <div className="pd-ph"><span className="pi"><Icon name="syringe" className="h-5 w-5" /></span><h2>How therapies are delivered</h2></div>
          <p className="pd-sub">The delivery route decides how a therapy reaches its target — and, with living cells, it drives both mechanism and risk. Every coded protocol states its route.</p>
          <div className="pd-route2">
            <div className="pd-well">
              <div className="pd-well-h"><span className="pi sm"><Icon name="dna" className="h-4 w-4" /></span><h3>MSC therapy — delivering living cells</h3></div>
              <p>MSCs are living cells, so delivery is about getting them where they act. <b>Systemic (IV)</b> sends them through the bloodstream — most are trapped in the lung capillaries within minutes and cleared in 1–2 days, so the benefit is a paracrine <i>“hit-and-run”</i> effect, not permanent engraftment, and IV carries the embolic / IBMIR clotting risk the Simulator screens for. <b>Local delivery</b> places a high cell dose exactly where it is needed and avoids the lung trap.</p>
            </div>
            <div className="pd-well purple">
              <div className="pd-well-h"><span className="pi sm p"><Icon name="heart" className="h-4 w-4" /></span><h3>Where IV exosomes fit — the cell-free signal</h3></div>
              <p>Exosomes are <b>not a delivery route for MSCs</b> — they are the cell-free “message in a bottle” MSCs secrete. IV exosomes infuse that signal without the living cell — ~1,000× smaller, they <b>skip the lung trap and the clot / tumour risk</b> and biodistribute more freely (even toward the CNS). Trade-offs: <b>no consensus dose</b> and they remain <b>investigational</b> for most uses. This is why the Simulator swaps in an <b>IV exosome carrier</b> for MSC-class therapies.</p>
            </div>
          </div>
          <div className="pd-routes">
            {ROUTES.map((r) => (
              <div key={r.name} className="pd-route">
                <div className="pd-route-h"><span className="pi sm"><Icon name={r.icon} className="h-4 w-4" /></span><h4>{r.name}</h4><span className={'pd-scope ' + SCOPE_CLS[r.scope]}>{r.scope}</span></div>
                <p>{r.blurb}</p>
              </div>
            ))}
          </div>
          <p className="pd-legend"><b>Systemic</b> = whole-body via circulation · <b>Local</b> = placed at the target · <b>Surface</b> = skin / wound · <b>Targeted</b> = organ-specific access.</p>
        </section>

        {/* Facility levels — detailed */}
        <section className="pd-panel pd-neu">
          <div className="pd-ph"><span className="pi"><Icon name="clipboard" className="h-5 w-5" /></span><h2>Facility levels</h2></div>
          <p className="pd-sub">A phased build — each level adds capability and unlocks more of the catalogue.</p>
          <div className="pd-lvls">
            {LEVELS.map((lv, i) => (
              <Link key={lv.n} to={`/protocols/facility/${lv.n}`} className="pd-lvl">
                <div className="pd-lvl-h">
                  <span className="pd-med lg" style={{ background: MED_BLUE[i] }}>{lv.n}</span>
                  <div><p className="lbl">LEVEL {lv.n} · {lv.cost}</p><h3>{lv.name}</h3></div>
                </div>
                <p className="cm">{lv.cumulative}</p>
                <p className="adds">{lv.adds}</p>
                <div className="pd-unlock">
                  <p className="uh">Therapies unlocked</p>
                  <div className="tags">
                    {lv.unlocks.map((u) => (
                      <span key={u.label} className={'utag' + (u.flag ? ' flag' : '')}>{u.flag && '★ '}{u.label}</span>
                    ))}
                  </div>
                  {lv.unlockNote && <p className="un">{lv.unlockNote}</p>}
                </div>
                <p className="view">View equipment &amp; costs →</p>
              </Link>
            ))}
          </div>
          <p className="pd-legend">Costs are representative new-equipment ballparks and therapy mappings are guidance — validation-required, not a compliance or investment guarantee. Level 3 is reachable capital-light via a CDMO + partner hospital.</p>
        </section>

        <p className="pd-disc">{DISCLAIMER}</p>
      </div>
    </div>
  );
}

function ProtocolCard({ p }: { p: Protocol }) {
  const c = CATEGORIES.find((x) => x.key === p.category)!;
  return (
    <Link to={`/protocols/${p.code}`} className="pd-pcard">
      <div className="pc-top">
        <span className="pc-code" style={{ background: c.accent }}>{p.code}</span>
        <span className={'pd-scope ' + (p.status === 'established' ? 'g' : 'a')}>{p.status === 'established' ? 'Established' : 'Investigational'}</span>
      </div>
      <h3>{p.name}</h3>
      <p className="pc-ind">{p.indication}</p>
      {p.regions && <p className="pc-reg">📍 {p.regions}</p>}
      <div className="pc-foot">
        <span style={{ color: c.accent }}><Icon name={c.icon as IconName} className="h-4 w-4" /></span>
        {c.name}
        {p.detailed && <span className="pc-full">Full protocol ✓</span>}
      </div>
    </Link>
  );
}

const PROTO_CSS = `
.pd{--sp:#ffffff;--shd:rgba(90,98,112,.20);--shl:#ffffff;--ink:#2b3757;--mut:#6a7699;--fnt:#9aa6c2;--blue:#2F6FE0;--green:#1f9d78;--amber:#c98a1e;--purple:#8a53d6;--track:rgba(43,66,110,.12);--grad:linear-gradient(135deg,#5a9bff,#2F6FE0);--disp:Poppins,Inter,system-ui,sans-serif;--mono:'IBM Plex Mono',ui-monospace,monospace;
  background:linear-gradient(180deg,#fdfdfc 0%,#fdfdfc 55%,#fdfdfc 100%);min-height:100vh;color:var(--ink);}
.pd-wrap{padding-top:26px;padding-bottom:44px;}
.pd-neu{background:var(--sp);border-radius:22px;box-shadow:9px 9px 22px var(--shd),-9px -9px 18px var(--shl);}
/* top bar */
.pd-top{display:flex;align-items:center;gap:14px;margin-bottom:20px;flex-wrap:wrap;}
.pd-mark{width:56px;height:56px;border-radius:17px;flex:none;display:grid;place-items:center;color:#2F6FE0;background:var(--sp);box-shadow:6px 6px 14px var(--shd),-6px -6px 12px var(--shl);}
.pd-ttl{min-width:0;}
.pd-ttl h1{font-family:var(--disp);font-weight:700;font-size:clamp(22px,2.6vw,30px);margin:0;letter-spacing:-.01em;line-height:1.05;}
.pd-ttl h1 span{color:#2F6FE0;}
.pd-ttl p{margin:2px 0 0;font-size:12.5px;color:var(--mut);}
.pd-badge{font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.08em;color:var(--blue);padding:8px 13px;border-radius:999px;background:var(--sp);box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);white-space:nowrap;}
.pd-spacer{flex:1;min-width:8px;}
.pd-btn{display:inline-flex;align-items:center;gap:8px;border-radius:13px;font-family:var(--disp);font-weight:600;font-size:13px;padding:11px 16px;cursor:pointer;text-decoration:none;transition:transform .12s;white-space:nowrap;}
.pd-btn:hover{transform:translateY(-1px);}
.pd-btn.solid{color:#fff;background:var(--grad);box-shadow:5px 5px 14px rgba(47,111,224,.34),-4px -4px 9px var(--shl);}
.pd-btn.ghost{color:var(--blue);background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);}
/* stats */
.pd-stats{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-bottom:20px;}
@media(max-width:900px){.pd-stats{grid-template-columns:repeat(3,1fr);}}
@media(max-width:520px){.pd-stats{grid-template-columns:repeat(2,1fr);}}
.pd-stat{padding:16px 14px;text-align:center;border-radius:16px;}
.pd-stat .v{font-family:var(--disp);font-weight:700;font-size:28px;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1;}
.pd-stat .k{font-size:11px;color:var(--mut);margin-top:6px;font-weight:600;}
/* generic panel */
.pd-panel{padding:22px clamp(16px,2.2vw,26px);margin-bottom:20px;}
.pd-ph{display:flex;align-items:center;gap:11px;margin-bottom:6px;}
.pi{width:38px;height:38px;border-radius:12px;flex:none;display:grid;place-items:center;color:var(--blue);background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);}
.pi.sm{width:30px;height:30px;border-radius:9px;box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);}
.pi.p{color:var(--purple);}
.pd-ph h2{font-family:var(--disp);font-weight:700;font-size:clamp(17px,2vw,21px);margin:0;}
.pd-sub{font-size:13px;color:var(--mut);margin:0 0 16px;max-width:70ch;line-height:1.55;}
/* two-column */
/* facility launcher */
.pd-fac-list{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
@media(max-width:820px){.pd-fac-list{grid-template-columns:1fr;}}
.pd-fac{display:flex;align-items:center;gap:14px;padding:13px;border-radius:15px;background:var(--sp);box-shadow:5px 5px 13px var(--shd),-5px -5px 11px var(--shl);text-decoration:none;transition:transform .12s;}
.pd-fac:hover{transform:translateY(-1px);}
.pd-med{width:40px;height:40px;border-radius:50%;flex:none;display:grid;place-items:center;font-family:var(--disp);font-weight:700;font-size:16px;color:#fff;box-shadow:3px 3px 9px rgba(90,98,112,.3);}
.pd-med.lg{width:46px;height:46px;font-size:19px;}
.pd-fac-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;}
.pd-fac-tx .lbl{font-family:var(--mono);font-size:9.5px;font-weight:600;letter-spacing:.05em;color:var(--blue);}
.pd-fac-tx .nm{font-family:var(--disp);font-weight:600;font-size:13.5px;color:var(--ink);line-height:1.2;}
.pd-fac-tx .cm{font-size:11px;color:var(--mut);}
.pd-arw{width:32px;height:32px;border-radius:50%;flex:none;display:grid;place-items:center;color:var(--blue);box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);}
.pd-arw svg{width:15px;height:15px;}
/* standards */
.pd-std-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;align-items:start;}
.pd-std{padding:14px;border-radius:14px;box-shadow:inset 4px 4px 9px var(--shd),inset -4px -4px 9px var(--shl);}
.pd-std-h{display:flex;align-items:center;gap:9px;margin-bottom:9px;}
.pd-std-h h3{font-family:var(--disp);font-weight:700;font-size:14px;margin:0;}
.pd-std ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;}
.pd-std li{font-size:12px;color:var(--mut);line-height:1.5;}
.pd-std li b{color:var(--blue);font-weight:600;}
/* registry */
.pd-reg-top{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px;}
.pd-reg-top .pd-ph{margin-bottom:0;}
.pd-search{display:flex;align-items:center;gap:9px;border-radius:13px;background:var(--sp);box-shadow:inset 5px 5px 10px var(--shd),inset -4px -4px 9px var(--shl);padding:0 14px;min-width:min(280px,100%);flex:1;max-width:340px;}
.pd-search svg{width:16px;height:16px;color:var(--fnt);flex:none;}
.pd-search input{border:0;background:transparent;outline:none;font-family:inherit;font-size:13.5px;color:var(--ink);padding:12px 0;width:100%;}
.pd-search input::placeholder{color:var(--fnt);}
.pd-filters{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:16px;}
.pd-chipf{border:0;cursor:pointer;font-family:var(--disp);font-weight:600;font-size:12.5px;padding:9px 14px;border-radius:12px;color:var(--mut);background:var(--sp);box-shadow:4px 4px 10px var(--shd),-4px -4px 8px var(--shl);transition:transform .12s,color .2s;}
.pd-chipf:hover{transform:translateY(-1px);color:var(--blue);}
.pd-chipf.on{color:#fff;background:var(--grad);box-shadow:4px 4px 12px rgba(47,111,224,.34),-3px -3px 8px var(--shl);}
.pd-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:14px;}
.pd-empty{color:var(--mut);margin-top:14px;font-size:14px;}
/* protocol card */
.pd-pcard{display:flex;flex-direction:column;padding:16px;border-radius:16px;background:var(--sp);box-shadow:5px 5px 13px var(--shd),-5px -5px 11px var(--shl);text-decoration:none;transition:transform .12s,box-shadow .2s;}
.pd-pcard:hover{transform:translateY(-2px);box-shadow:7px 7px 18px var(--shd),-6px -6px 13px var(--shl);}
.pc-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.pc-code{font-family:var(--mono);font-weight:700;font-size:13px;color:#fff;padding:3px 9px;border-radius:8px;box-shadow:2px 2px 6px rgba(90,98,112,.25);}
.pd-pcard h3{font-family:var(--disp);font-weight:700;font-size:15px;color:var(--ink);margin:11px 0 0;line-height:1.25;}
.pc-ind{font-size:12.5px;color:var(--mut);margin:5px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.pc-reg{font-size:11px;font-weight:600;color:var(--fnt);margin:8px 0 0;}
.pc-foot{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--mut);margin-top:12px;}
.pc-full{margin-left:auto;font-size:10px;font-weight:700;color:var(--blue);padding:3px 9px;border-radius:999px;box-shadow:inset 2px 2px 5px var(--shd),inset -2px -2px 5px var(--shl);}
/* scope / status pills */
.pd-scope{font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap;box-shadow:inset 2px 2px 5px var(--shd),inset -2px -2px 5px var(--shl);}
.pd-scope.b{color:var(--blue);}.pd-scope.g{color:var(--green);}.pd-scope.a{color:var(--amber);}.pd-scope.p{color:var(--purple);}
/* delivery routes */
.pd-route2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;}
@media(max-width:820px){.pd-route2{grid-template-columns:1fr;}}
.pd-well{padding:16px;border-radius:15px;box-shadow:inset 4px 4px 10px var(--shd),inset -4px -4px 10px var(--shl);}
.pd-well-h{display:flex;align-items:center;gap:9px;margin-bottom:9px;}
.pd-well-h h3{font-family:var(--disp);font-weight:700;font-size:14px;margin:0;}
.pd-well p{font-size:12.5px;color:var(--mut);line-height:1.6;margin:0;}
.pd-well p b{color:var(--ink);}
.pd-routes{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:12px;}
.pd-route{padding:14px;border-radius:14px;background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);}
.pd-route-h{display:flex;align-items:center;gap:8px;}
.pd-route-h h4{font-family:var(--disp);font-weight:700;font-size:13px;margin:0;flex:1;min-width:0;}
.pd-route p{font-size:11.5px;color:var(--mut);line-height:1.55;margin:9px 0 0;}
.pd-legend{font-size:11.5px;font-style:italic;color:var(--fnt);margin:14px 0 0;line-height:1.55;}
.pd-legend b{color:var(--mut);font-style:normal;}
/* facility levels detailed */
.pd-lvls{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
@media(max-width:980px){.pd-lvls{grid-template-columns:1fr;}}
.pd-lvl{display:flex;flex-direction:column;padding:18px;border-radius:16px;background:var(--sp);box-shadow:6px 6px 15px var(--shd),-6px -6px 13px var(--shl);text-decoration:none;transition:transform .12s;}
.pd-lvl:hover{transform:translateY(-2px);}
.pd-lvl-h{display:flex;align-items:center;gap:12px;}
.pd-lvl-h .lbl{font-family:var(--mono);font-size:9.5px;font-weight:600;color:var(--blue);}
.pd-lvl-h h3{font-family:var(--disp);font-weight:700;font-size:14.5px;margin:2px 0 0;color:var(--ink);line-height:1.2;}
.pd-lvl .cm{font-size:12px;font-weight:600;color:var(--blue);margin:12px 0 0;}
.pd-lvl .adds{font-size:12.5px;color:var(--mut);margin:8px 0 0;line-height:1.55;}
.pd-unlock{margin-top:14px;padding:14px;border-radius:13px;box-shadow:inset 4px 4px 9px var(--shd),inset -4px -4px 9px var(--shl);}
.pd-unlock .uh{font-family:var(--mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--fnt);margin:0 0 9px;}
.pd-unlock .tags{display:flex;flex-wrap:wrap;gap:6px;}
.utag{font-size:11px;font-weight:500;padding:4px 9px;border-radius:8px;color:#1f59c2;background:rgba(47,111,224,.12);}
.utag.flag{background:var(--grad);color:#fff;font-weight:600;}
.pd-unlock .un{font-size:11px;font-style:italic;color:var(--mut);margin:11px 0 0;}
.pd-lvl .view{font-size:12px;font-weight:600;color:var(--blue);margin:14px 0 0;}
.pd-disc{font-size:11.5px;font-style:italic;color:var(--fnt);line-height:1.6;padding:14px 16px;border-radius:14px;box-shadow:inset 4px 4px 9px var(--shd),inset -4px -4px 9px var(--shl);}
@media(prefers-reduced-motion:reduce){.pd *{transition:none!important;}}
`;
