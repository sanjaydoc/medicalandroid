import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Car } from '../types';
import CarImage from '../components/CarImage';
import Spinner from '../components/Spinner';
import Icon, { type IconName } from '../components/Icon';
import { gbp } from '../utils/format';

/**
 * Research — a neumorphic dashboard (matches the Protocols & Simulator pages).
 * Order: (1) published research, (2) the LSM AI research programme, (3) therapies
 * under research. Three nav cards jump to each. Static + on-device. The LSM
 * section is intentionally high-level (no internals).
 */

// ── Published research (mirrors the StemCells Publication Tracker) ────────────
type Paper = {
  n: string;
  title: string;
  authors: string;
  result: string;
  note: string;
  doi: string;
  doiLabel: string;
  preprint: string;
};
const PAPERS: Paper[] = [
  {
    n: '1',
    title: 'A privacy-preserving, in-browser epigenetic-age clock for regenerative-therapy planning',
    authors: 'Dr. Sanjay Anbu',
    result: 'Validated on GSE40279 (whole blood, n = 656): Pearson r = 0.918, MAE 4.77 yr — in line with the published literature.',
    note: 'The epigenetic-age computation is the benchmark-validated component.',
    doi: 'https://doi.org/10.5281/zenodo.22760374',
    doiLabel: '10.5281/zenodo.22760374',
    preprint: 'bioRxiv preprint · in screening',
  },
  {
    n: '2',
    title: 'The Success-Rate Optimizer: a transparent, literature-concordant in-silico formulation model for regenerative-therapy planning',
    authors: 'Dr. Sanjay Anbu · Shivani Singh',
    result: '7 / 7 pre-specified directional hypotheses concordant with the cell-therapy literature (construct / face validation).',
    note: 'Illustrative model — absolute success rates are hypotheses to be tested, not clinical results.',
    doi: 'https://doi.org/10.5281/zenodo.22788247',
    doiLabel: '10.5281/zenodo.22788247',
    preprint: 'bioRxiv preprint · in screening',
  },
];

// ── LSM research programme (high-level milestones — no internals revealed) ────
const LSM_MILESTONES: { label: string; sub: string; done: boolean }[] = [
  { label: 'State-aware responses', sub: 'Output adapts to the situation it is given', done: true },
  { label: 'Self-uncertainty', sub: 'Flags when an answer may be wrong — so it can defer', done: true },
  { label: 'Stable self-model', sub: 'A consistent, inspectable internal representation', done: true },
  { label: 'On-device generation', sub: 'Runs privately on local hardware — data stays put', done: false },
];

const LSM_ROADMAP: { icon: IconName; phase: string; name: string; blurb: string }[] = [
  { icon: 'stethoscope', phase: 'First', name: 'Clinical decision support', blurb: 'A private, on-device assistant for everyday clinical questions that, crucially, defers to the clinician the moment it is unsure — reliability first, not raw confidence.' },
  { icon: 'clipboard', phase: 'First', name: 'Treatment & protocol planning', blurb: 'Reliability-scored planning support that pairs with the Simulator and the Protocol Standard — every suggestion carries how much to trust it.' },
  { icon: 'ai', phase: 'Next', name: 'Humanoid & assistive robotics', blurb: 'An embodied agent that gauges its own confidence and acts within safe limits — the same “knows-when-unsure” core, now in the physical world.' },
  { icon: 'clinician', phase: 'Next', name: 'Surgical robotics', blurb: 'Decision support and real-time reliability monitoring for robot-assisted procedures — flagging uncertainty before it becomes error.' },
  { icon: 'trending', phase: 'Frontier', name: 'Autonomous vehicles', blurb: 'Self-driving where the missing safety layer is exactly this: a system that knows when it does not know, and hands back control.' },
  { icon: 'ai', phase: 'Frontier', name: 'Autonomous drones', blurb: 'Aerial systems — medical delivery, inspection, response — carrying the same confidence-aware safety core into open, unpredictable environments.' },
];

// ── Base models the LSM layer has been tested with (honest status) ────────────
const LSM_MODELS: { model: string; maker: string; type: string; role: string; status: 'Tested' | 'In-house' | 'Planned' }[] = [
  { model: 'LSM · 37M', maker: 'StemCells Protocol', type: 'Reliability / oversight core', role: 'The higher-level layer — gauges its own confidence and defers when unsure', status: 'In-house' },
  { model: 'MedGemma · 4B', maker: 'Google', type: 'Medical (multimodal)', role: 'Reliability & abstention harness — selective prediction and calibration', status: 'Tested' },
  { model: 'Qwen2.5 · 0.5B', maker: 'Alibaba', type: 'General small LM', role: 'State-conditioning base (FiLM) for fluent, low-footprint output', status: 'Tested' },
  { model: 'On-device medical LM', maker: 'e.g. MedGemma / Gemma', type: 'Local medical LM', role: 'Fully offline generation on a phone for low-connectivity regions', status: 'Planned' },
];

function TherapyCard({ car }: { car: Car }) {
  return (
    <Link to={`/therapies/${car.id}`} className="rp-tcard" data-card>
      <div className="rp-tc-img">
        <CarImage
          accent={car.accent}
          bodyType={car.body_type}
          make={car.make}
          model={car.model}
          year={car.year}
          className="h-40 w-full bg-transparent"
        />
        <span className="rp-tc-tag">Under research</span>
      </div>
      <div className="rp-tc-body">
        <div className="rp-tc-top">
          <h3>{car.model}</h3>
          <span className="rp-scope a"><Icon name="microscope" className="h-3 w-3" /> {car.india_status === 'approved' ? 'Available in India' : 'Unavailable in India'}</span>
        </div>
        <p className="rp-tc-desc">{car.description?.split('.')[0]}.</p>
        <div className="rp-tc-chips">
          <span className="rp-cat">{car.body_type}</span>
          <span className="rp-src">{car.fuel_type} cells</span>
          <span className="rp-dep">{car.make}</span>
        </div>
        <div className="rp-tc-foot">
          <div className="min-w-0">
            <span className="lbl">Indicative cost</span>
            <b>from {gbp(car.price)} <span className="mo">· {gbp(car.monthly_price)}/mo</span></b>
          </div>
          <span className="rp-arw"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
        </div>
      </div>
    </Link>
  );
}

export default function EvDeals() {
  const [evs, setEvs] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<string>('ALL');
  const [q, setQ] = useState('');

  useEffect(() => {
    api
      .getCars({ condition: 'used', limit: 48 })
      .then(({ cars }) => setEvs(cars))
      .finally(() => setLoading(false));
  }, []);

  const cats = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of evs) m[c.body_type] = (m[c.body_type] || 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [evs]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return evs.filter((c) =>
      (cat === 'ALL' || c.body_type === cat) &&
      (!query ||
        c.model.toLowerCase().includes(query) ||
        c.make.toLowerCase().includes(query) ||
        c.body_type.toLowerCase().includes(query) ||
        c.fuel_type.toLowerCase().includes(query) ||
        (c.description || '').toLowerCase().includes(query)));
  }, [evs, cat, q]);

  const STATS = [
    { v: 2, k: 'Published papers' },
    { v: 2, k: 'Preprints in screening' },
    { v: 2, k: 'Zenodo DOIs' },
    { v: 1, k: 'AI research programme' },
    { v: evs.length, k: 'Therapies under research' },
  ];

  const NAV: { id: string; icon: IconName; name: string; sub: string }[] = [
    { id: 'rp-papers', icon: 'clipboard', name: 'Published research', sub: '2 papers · open DOIs' },
    { id: 'rp-lsm', icon: 'ai', name: 'LSM — on-device AI', sub: 'Our reliability-first AI programme' },
    { id: 'rp-therapies', icon: 'microscope', name: 'Therapies under research', sub: `${evs.length || '—'} under investigation` },
  ];
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="rp">
      <style>{RP_CSS}</style>
      <div className="rp-wrap container-x">
        {/* top bar */}
        <div className="rp-top">
          <span className="rp-mark"><Icon name="microscope" className="h-7 w-7" /></span>
          <div className="rp-ttl">
            <h1>Research <span>&amp; Progress</span></h1>
            <p>Our published research, the AI we are building — on-device — and the therapies under investigation.</p>
          </div>
          <span className="rp-badge">Research / illustrative</span>
          <span className="rp-spacer" />
          <Link to="/browse" className="rp-btn solid"><Icon name="dna" className="h-4 w-4" /> Browse therapies</Link>
          <Link to="/consultation" className="rp-btn ghost"><Icon name="clinician" className="h-4 w-4" /> Book consultation</Link>
        </div>

        {/* KPI strip */}
        <div className="rp-stats">
          {STATS.map((s) => (
            <div key={s.k} className="rp-stat rp-neu">
              <div className="v">{s.v}</div>
              <div className="k">{s.k}</div>
            </div>
          ))}
        </div>

        {/* section nav — jumps to each section */}
        <div className="rp-nav">
          {NAV.map((c) => (
            <button key={c.id} type="button" className="rp-navcard" onClick={() => jump(c.id)}>
              <span className="pi"><Icon name={c.icon} className="h-5 w-5" /></span>
              <span className="tx"><span className="nm">{c.name}</span><span className="sb">{c.sub}</span></span>
              <span className="rp-arw sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg></span>
            </button>
          ))}
        </div>

        {/* ── Section 1 · Published research ─────────────────────────────── */}
        <section id="rp-papers" className="rp-panel rp-neu">
          <div className="rp-ph"><span className="pi"><Icon name="clipboard" className="h-5 w-5" /></span>
            <div><h2>Published research</h2></div>
          </div>
          <p className="rp-sub">Peer-review-track software papers, each archived with a citable DOI and validated openly. Only the epigenetic-age computation is benchmark-validated; the planning models are illustrative and honestly labelled.</p>
          <div className="rp-papers">
            {PAPERS.map((p) => (
              <div key={p.n} className="rp-paper">
                <div className="rp-paper-h">
                  <span className="rp-pnum">Paper {p.n}</span>
                  <span className="rp-scope g"><Icon name="star" className="h-3 w-3" /> Zenodo · published</span>
                  <span className="rp-scope b">{p.preprint}</span>
                </div>
                <h3>{p.title}</h3>
                <p className="rp-auth">{p.authors}</p>
                <p className="rp-res">{p.result}</p>
                <p className="rp-pnote">{p.note}</p>
                <a className="rp-doi" href={p.doi} target="_blank" rel="noopener">DOI {p.doiLabel} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg></a>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 2 · LSM AI research programme ──────────────────────── */}
        <section id="rp-lsm" className="rp-panel rp-neu">
          <div className="rp-ph"><span className="pi"><Icon name="ai" className="h-5 w-5" /></span>
            <div><h2>LSM — reliable on-device clinical AI</h2></div>
            <span className="rp-tag-prog">Research programme</span>
          </div>
          <p className="rp-sub">
            We are building the <b>LSM</b>, a compact AI designed to run <b>entirely on-device</b> — private by default — whose defining trait is <b>reliability</b>: it is built to know when it is uncertain and hand back to a clinician. Early research milestones are encouraging. This is active research, not a product or a medical device.
          </p>

          <div className="rp-mile">
            {LSM_MILESTONES.map((m) => (
              <div key={m.label} className={'rp-milecard' + (m.done ? ' on' : '')}>
                <span className="rp-miledot">{m.done ? '✓' : '●'}</span>
                <div>
                  <p className="ml">{m.label} <span className="st">{m.done ? 'validated' : 'in progress'}</span></p>
                  <p className="sub">{m.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* LSM as a higher-level layer over base models */}
          <div className="rp-well">
            <div className="rp-well-h"><span className="pi sm"><Icon name="ai" className="h-4 w-4" /></span><h3>A higher-level intelligence — on top of other models</h3></div>
            <p>The LSM is not another chatbot. It is designed to sit <b>on top of a base language model</b>: the base model provides fluent answers, and the LSM adds the layer that matters most in medicine — it <b>monitors its own confidence and defers to a clinician when unsure</b>. We test this layered approach with established medical and general models.</p>
          </div>
          <div className="rp-mtable-wrap">
            <table className="rp-mtable">
              <thead><tr><th>Model</th><th>Maker</th><th>Type</th><th>Role with the LSM</th><th>Status</th></tr></thead>
              <tbody>
                {LSM_MODELS.map((m) => (
                  <tr key={m.model}>
                    <td><b>{m.model}</b></td>
                    <td>{m.maker}</td>
                    <td>{m.type}</td>
                    <td>{m.role}</td>
                    <td><span className={'rp-mst ' + (m.status === 'Tested' ? 'g' : m.status === 'In-house' ? 'b' : 'a')}>{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="rp-legend">Comparative results are preliminary and logged honestly in our internal LSM Training Lab — the LSM is a reliability layer under evaluation, not a proven replacement for these models.</p>

          {/* On-device / offline for low-connectivity regions */}
          <div className="rp-offline">
            <div className="rp-off-ic" aria-hidden>📶</div>
            <div>
              <h3>Built for where the internet isn't</h3>
              <p>In rural India and parts of sub-Saharan Africa, a reliable connection is not a given. The LSM paired with a <b>compact on-device medical model</b> is designed to run <b>entirely offline on an ordinary phone</b> — private by default, and useful with no signal at all. This is an active research goal, not a shipped feature.</p>
            </div>
          </div>

          <div className="rp-well">
            <div className="rp-well-h"><span className="pi sm"><Icon name="trending" className="h-4 w-4" /></span><h3>Where the LSM is headed</h3></div>
            <p>One principle ties it together — an agent that <b>gauges its own confidence and acts within safe limits</b>. The path is deliberate: prove it in the clinic first, then extend the same reliability core to embodied frontiers.</p>
          </div>

          <div className="rp-road">
            {LSM_ROADMAP.map((r) => (
              <div key={r.name} className="rp-rcard">
                <div className="rp-rcard-h">
                  <span className="pi sm"><Icon name={r.icon} className="h-4 w-4" /></span>
                  <span className={'rp-phase ' + (r.phase === 'First' ? 'g' : r.phase === 'Next' ? 'b' : 'p')}>{r.phase}</span>
                </div>
                <h4>{r.name}</h4>
                <p>{r.blurb}</p>
              </div>
            ))}
          </div>
          <p className="rp-legend">Clinical use comes first; the embodied frontiers (humanoid &amp; surgical robotics, autonomous vehicles, drones) are the roadmap — the same reliability core, extended. All milestones are research-stage and measured, not marketing.</p>
          <p className="rp-disc">Research programme — not a product, not a medical device, and not a claim of machine consciousness. Outputs are for research and education only; always confirm with a qualified clinician.</p>
        </section>

        {/* ── Section 3 · Therapies under research ───────────────────────── */}
        {loading ? (
          <Spinner label="Loading research therapies…" />
        ) : (
          <section id="rp-therapies" className="rp-panel rp-neu">
            <div className="rp-reg-top">
              <div className="rp-ph"><span className="pi"><Icon name="microscope" className="h-5 w-5" /></span>
                <div><h2>Therapies under research</h2></div>
              </div>
              <div className="rp-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search therapy, condition, department…" />
              </div>
            </div>
            <p className="rp-sub">Stem-cell therapies our partner clinics are studying in clinical-trial settings — experimental and clearly labelled as investigational.</p>
            <div className="rp-filters">
              <button type="button" onClick={() => setCat('ALL')} className={'rp-chipf' + (cat === 'ALL' ? ' on' : '')}>All · {evs.length}</button>
              {cats.map(([k, n]) => (
                <button key={k} type="button" onClick={() => setCat(k)} className={'rp-chipf' + (cat === k ? ' on' : '')}>{k} · {n}</button>
              ))}
            </div>
            <p className="rp-count">{list.length} {list.length === 1 ? 'therapy' : 'therapies'} found</p>
            <div className="rp-tgrid">
              {list.map((car) => <TherapyCard key={car.id} car={car} />)}
            </div>
            {list.length === 0 && <p className="rp-empty">No therapies match that search.</p>}
            <p className="rp-legend">Investigational therapies are experimental and offered within clinical-trial settings — not established treatments.</p>
          </section>
        )}

        {/* CTA */}
        <section className="rp-cta rp-neu">
          <div>
            <h2>Not sure if a trial or therapy suits you?</h2>
            <p>Speak to a specialist — personalised guidance, no obligation.</p>
          </div>
          <Link to="/consultation" className="rp-btn solid lg"><Icon name="clinician" className="h-4 w-4" /> Book a consultation</Link>
        </section>
      </div>
    </div>
  );
}

const RP_CSS = `
.rp{--sp:#ffffff;--shd:rgba(90,98,112,.20);--shl:#ffffff;--ink:#2b3757;--mut:#6a7699;--fnt:#9aa6c2;--blue:#2F6FE0;--green:#1f9d78;--amber:#c98a1e;--purple:#8a53d6;--grad:linear-gradient(135deg,#5a9bff,#2F6FE0);--disp:Poppins,Inter,system-ui,sans-serif;--mono:'IBM Plex Mono',ui-monospace,monospace;
  background:#fdfdfc;min-height:100vh;color:var(--ink);}
.rp-wrap{padding-top:26px;padding-bottom:44px;}
.rp-neu{background:var(--sp);border-radius:22px;box-shadow:9px 9px 22px var(--shd),-9px -9px 18px var(--shl);}
/* top bar */
.rp-top{display:flex;align-items:center;gap:14px;margin-bottom:20px;flex-wrap:wrap;}
.rp-mark{width:56px;height:56px;border-radius:17px;flex:none;display:grid;place-items:center;color:#2F6FE0;background:var(--sp);box-shadow:6px 6px 14px var(--shd),-6px -6px 12px var(--shl);}
.rp-ttl{min-width:0;}
.rp-ttl h1{font-family:var(--disp);font-weight:700;font-size:clamp(22px,2.6vw,30px);margin:0;letter-spacing:-.01em;line-height:1.05;}
.rp-ttl h1 span{color:#2F6FE0;}
.rp-ttl p{margin:2px 0 0;font-size:12.5px;color:var(--mut);}
.rp-badge{font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.06em;color:var(--blue);padding:8px 13px;border-radius:999px;background:var(--sp);box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);white-space:nowrap;font-style:italic;}
.rp-spacer{flex:1;min-width:8px;}
.rp-btn{display:inline-flex;align-items:center;gap:8px;border-radius:13px;font-family:var(--disp);font-weight:600;font-size:13px;padding:11px 16px;cursor:pointer;text-decoration:none;transition:transform .12s;white-space:nowrap;}
.rp-btn:hover{transform:translateY(-1px);}
.rp-btn.solid{color:#fff;background:var(--grad);box-shadow:5px 5px 14px rgba(47,111,224,.34),-4px -4px 9px var(--shl);}
.rp-btn.ghost{color:var(--blue);background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);}
.rp-btn.lg{padding:14px 22px;font-size:14px;}
/* stats */
.rp-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:20px;}
@media(max-width:900px){.rp-stats{grid-template-columns:repeat(3,1fr);}}
@media(max-width:520px){.rp-stats{grid-template-columns:repeat(2,1fr);}}
.rp-stat{padding:16px 14px;text-align:center;border-radius:16px;}
.rp-stat .v{font-family:var(--disp);font-weight:700;font-size:28px;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1;}
.rp-stat .k{font-size:11px;color:var(--mut);margin-top:6px;font-weight:600;}
/* section nav cards */
.rp-nav{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;}
@media(max-width:820px){.rp-nav{grid-template-columns:1fr;}}
.rp-navcard{display:flex;align-items:center;gap:12px;text-align:left;border:0;cursor:pointer;padding:15px 16px;border-radius:18px;background:var(--sp);box-shadow:6px 6px 15px var(--shd),-6px -6px 13px var(--shl);transition:transform .12s,box-shadow .2s;font-family:inherit;}
.rp-navcard:hover{transform:translateY(-2px);box-shadow:8px 8px 19px var(--shd),-7px -7px 14px var(--shl);}
.rp-navcard .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
.rp-navcard .nm{font-family:var(--disp);font-weight:700;font-size:14px;color:var(--ink);line-height:1.2;}
.rp-navcard .sb{font-size:11.5px;color:var(--mut);}
/* panel */
.rp-panel{padding:22px clamp(16px,2.2vw,26px);margin-bottom:20px;scroll-margin-top:92px;}
.rp-ph{display:flex;align-items:center;gap:11px;margin-bottom:6px;}
.rp .pi{width:38px;height:38px;border-radius:12px;flex:none;display:grid;place-items:center;color:var(--blue);background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);}
.rp .pi.sm{width:30px;height:30px;border-radius:9px;box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);}
.rp-ph h2{font-family:var(--disp);font-weight:700;font-size:clamp(17px,2vw,21px);margin:0;}
.rp-tag-prog{margin-left:auto;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.05em;color:var(--purple);padding:6px 11px;border-radius:999px;box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);white-space:nowrap;}
.rp-sub{font-size:13px;color:var(--mut);margin:0 0 16px;max-width:74ch;line-height:1.6;}
.rp-sub b{color:var(--ink);}
.rp-legend{font-size:11.5px;font-style:italic;color:var(--fnt);margin:16px 0 0;line-height:1.55;}
.rp-legend b{color:var(--mut);font-style:normal;}
.rp-disc{font-size:11.5px;font-style:italic;color:var(--fnt);line-height:1.6;padding:13px 15px;border-radius:14px;margin:12px 0 0;box-shadow:inset 4px 4px 9px var(--shd),inset -4px -4px 9px var(--shl);}
/* scope / status pills (shared) */
.rp-scope{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap;box-shadow:inset 2px 2px 5px var(--shd),inset -2px -2px 5px var(--shl);}
.rp-scope.b{color:var(--blue);}.rp-scope.g{color:var(--green);}.rp-scope.a{color:var(--amber);}.rp-scope.p{color:var(--purple);}
/* search + filters */
.rp-reg-top{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:8px;}
.rp-reg-top .rp-ph{margin-bottom:0;}
.rp-search{display:flex;align-items:center;gap:9px;border-radius:13px;background:var(--sp);box-shadow:inset 5px 5px 10px var(--shd),inset -4px -4px 9px var(--shl);padding:0 14px;min-width:min(280px,100%);flex:1;max-width:340px;}
.rp-search svg{width:16px;height:16px;color:var(--fnt);flex:none;}
.rp-search input{border:0;background:transparent;outline:none;font-family:inherit;font-size:13.5px;color:var(--ink);padding:12px 0;width:100%;}
.rp-search input::placeholder{color:var(--fnt);}
.rp-filters{display:flex;flex-wrap:wrap;gap:9px;margin:14px 0 4px;}
.rp-chipf{border:0;cursor:pointer;font-family:var(--disp);font-weight:600;font-size:12.5px;padding:9px 14px;border-radius:12px;color:var(--mut);background:var(--sp);box-shadow:4px 4px 10px var(--shd),-4px -4px 8px var(--shl);transition:transform .12s,color .2s;}
.rp-chipf:hover{transform:translateY(-1px);color:var(--blue);}
.rp-chipf.on{color:#fff;background:var(--grad);box-shadow:4px 4px 12px rgba(47,111,224,.34),-3px -3px 8px var(--shl);}
.rp-count{font-family:var(--disp);font-weight:700;font-size:15px;color:var(--ink);margin:14px 0 12px;}
.rp-empty{color:var(--mut);margin-top:14px;font-size:14px;}
/* therapy cards */
.rp-tgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;}
.rp-tcard{display:flex;flex-direction:column;border-radius:18px;background:var(--sp);box-shadow:6px 6px 15px var(--shd),-6px -6px 13px var(--shl);text-decoration:none;overflow:hidden;transition:transform .12s,box-shadow .2s;}
.rp-tcard:hover{transform:translateY(-2px);box-shadow:8px 8px 19px var(--shd),-7px -7px 14px var(--shl);}
.rp-tc-img{position:relative;padding:12px 12px 0;}
.rp-tc-tag{position:absolute;left:18px;bottom:6px;font-size:10px;font-weight:700;color:var(--amber);background:var(--sp);padding:4px 10px;border-radius:999px;box-shadow:2px 2px 6px var(--shd);}
.rp-tc-body{padding:8px 16px 16px;display:flex;flex-direction:column;flex:1;}
.rp-tc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
.rp-tc-top h3{font-family:var(--disp);font-weight:700;font-size:15.5px;color:var(--ink);margin:0;line-height:1.2;}
.rp-tc-desc{font-size:12.5px;color:var(--mut);margin:7px 0 0;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.4em;}
.rp-tc-chips{display:flex;flex-wrap:wrap;gap:6px;margin:11px 0 0;}
.rp-cat{font-size:11px;font-weight:700;color:#1f59c2;background:rgba(47,111,224,.12);padding:4px 9px;border-radius:8px;}
.rp-src,.rp-dep{font-size:11px;font-weight:600;color:var(--mut);padding:4px 9px;border-radius:8px;box-shadow:inset 2px 2px 5px var(--shd),inset -2px -2px 5px var(--shl);}
.rp-tc-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-top:14px;padding-top:13px;border-top:1px solid rgba(43,66,110,.08);}
.rp-tc-foot .lbl{display:block;font-size:9.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--fnt);}
.rp-tc-foot b{font-family:var(--disp);font-size:14px;color:var(--ink);}
.rp-tc-foot .mo{font-weight:600;color:var(--mut);font-size:12px;}
.rp-arw{width:38px;height:38px;border-radius:50%;flex:none;display:grid;place-items:center;color:#fff;background:var(--grad);box-shadow:4px 4px 11px rgba(47,111,224,.3);}
.rp-arw svg{width:16px;height:16px;}
.rp-arw.sm{width:30px;height:30px;background:var(--sp);color:var(--blue);box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);}
.rp-arw.sm svg{width:14px;height:14px;}
/* papers */
.rp-papers{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
@media(max-width:820px){.rp-papers{grid-template-columns:1fr;}}
.rp-paper{display:flex;flex-direction:column;padding:18px;border-radius:16px;box-shadow:inset 4px 4px 10px var(--shd),inset -4px -4px 10px var(--shl);}
.rp-paper-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px;}
.rp-pnum{font-family:var(--mono);font-size:11px;font-weight:700;color:#fff;background:var(--grad);padding:4px 10px;border-radius:8px;}
.rp-paper h3{font-family:var(--disp);font-weight:700;font-size:15px;color:var(--ink);margin:0;line-height:1.3;}
.rp-auth{font-size:12px;font-weight:600;color:var(--blue);margin:8px 0 0;}
.rp-res{font-size:12.5px;color:var(--mut);margin:9px 0 0;line-height:1.55;}
.rp-pnote{font-size:11.5px;font-style:italic;color:var(--fnt);margin:9px 0 0;line-height:1.5;}
.rp-doi{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11.5px;font-weight:600;color:var(--blue);text-decoration:none;margin-top:13px;}
.rp-doi svg{width:13px;height:13px;}
.rp-doi:hover{text-decoration:underline;}
/* LSM milestones */
.rp-mile{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:16px;}
.rp-milecard{display:flex;gap:11px;padding:14px;border-radius:14px;background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);}
.rp-miledot{width:26px;height:26px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:13px;font-weight:700;color:var(--fnt);background:var(--sp);box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);}
.rp-milecard.on .rp-miledot{color:#fff;background:linear-gradient(135deg,#39c08a,#1f9d78);box-shadow:2px 2px 7px rgba(31,157,120,.4);}
.rp-milecard .ml{font-family:var(--disp);font-weight:700;font-size:13.5px;color:var(--ink);margin:0;display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
.rp-milecard .ml .st{font-family:var(--mono);font-size:9px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--green);padding:2px 7px;border-radius:999px;box-shadow:inset 2px 2px 4px var(--shd),inset -2px -2px 4px var(--shl);}
.rp-milecard:not(.on) .ml .st{color:var(--amber);}
.rp-milecard .sub{font-size:11.5px;color:var(--mut);margin:3px 0 0;line-height:1.45;}
/* LSM well + roadmap */
.rp-well{padding:16px;border-radius:15px;box-shadow:inset 4px 4px 10px var(--shd),inset -4px -4px 10px var(--shl);margin-bottom:16px;}
.rp-well-h{display:flex;align-items:center;gap:9px;margin-bottom:9px;}
.rp-well-h h3{font-family:var(--disp);font-weight:700;font-size:14px;margin:0;}
.rp-well p{font-size:12.5px;color:var(--mut);line-height:1.6;margin:0;}
.rp-well p b{color:var(--ink);}
.rp-road{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:14px;}
.rp-rcard{padding:15px;border-radius:14px;background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);}
.rp-rcard-h{display:flex;align-items:center;gap:9px;margin-bottom:9px;}
.rp-phase{margin-left:auto;font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:999px;box-shadow:inset 2px 2px 5px var(--shd),inset -2px -2px 5px var(--shl);}
.rp-phase.g{color:var(--green);}.rp-phase.b{color:var(--blue);}.rp-phase.p{color:var(--purple);}
.rp-rcard h4{font-family:var(--disp);font-weight:700;font-size:14px;color:var(--ink);margin:0;}
.rp-rcard p{font-size:12px;color:var(--mut);line-height:1.55;margin:8px 0 0;}
/* LSM models table */
.rp-mtable-wrap{overflow-x:auto;border-radius:15px;box-shadow:inset 4px 4px 10px var(--shd),inset -4px -4px 10px var(--shl);padding:6px;margin-bottom:12px;}
.rp-mtable{width:100%;border-collapse:collapse;font-size:12.5px;min-width:600px;}
.rp-mtable th{text-align:left;font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fnt);padding:10px 12px;}
.rp-mtable td{padding:11px 12px;color:var(--mut);border-top:1px solid rgba(43,66,110,.08);line-height:1.45;vertical-align:top;}
.rp-mtable td b{color:var(--ink);font-family:var(--disp);white-space:nowrap;}
.rp-mst{display:inline-block;font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px;box-shadow:inset 2px 2px 5px var(--shd),inset -2px -2px 5px var(--shl);white-space:nowrap;}
.rp-mst.g{color:var(--green);}.rp-mst.b{color:var(--blue);}.rp-mst.a{color:var(--amber);}
/* on-device offline block */
.rp-offline{display:flex;gap:14px;align-items:flex-start;padding:16px;border-radius:15px;background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);margin:14px 0 4px;}
.rp-off-ic{font-size:26px;line-height:1;flex:none;}
.rp-offline h3{font-family:var(--disp);font-weight:700;font-size:14px;margin:0 0 5px;color:var(--ink);}
.rp-offline p{font-size:12.5px;color:var(--mut);line-height:1.6;margin:0;}
.rp-offline p b{color:var(--ink);}
/* CTA */
.rp-cta{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:24px clamp(18px,2.4vw,30px);}
.rp-cta h2{font-family:var(--disp);font-weight:700;font-size:clamp(18px,2.2vw,23px);margin:0;color:var(--ink);}
.rp-cta p{font-size:13px;color:var(--mut);margin:5px 0 0;}
@media(prefers-reduced-motion:reduce){.rp *{transition:none!important;}}
`;
