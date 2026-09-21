import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Icon from '../components/Icon';
import SimRun from '../components/SimRun';
import { buildRun, type FullRun } from '../sim/full';
import { CATALOG, DEFAULT_DISEASE } from '../sim/catalog';
import { impliedCondition } from '../sim/immune';
import ConditionPicker from '../components/ConditionPicker';
import { SIMD_CSS } from '../theme/simd';

const METH_EXT = /\.(csv|cov|tsv|txt|bedgraph|bed)$/i;
const SAMPLES = [
  { href: `${import.meta.env.BASE_URL}samples/sample1_age64_chronic_kidney_disease.cov`, label: 'Age 64 · Chronic Kidney Disease', age: 64, disease: 'chronic-kidney-disease-ckd-msc-therapy' },
  { href: `${import.meta.env.BASE_URL}samples/sample2_age47_multiple_sclerosis.cov`, label: 'Age 47 · Multiple Sclerosis', age: 47, disease: 'multiple-sclerosis-ahsct' },
];

/* rail step definitions per modality (mirror the SimPipeline order) */
type StepDef = { label: string; ic: string };
const REPROG_STEPS: StepDef[] = [
  { label: 'Sample & therapy', ic: 'layers' }, { label: 'Data ingest', ic: 'dna' },
  { label: 'Epigenetic age', ic: 'wave' }, { label: 'Rejuvenation', ic: 'refresh' },
  { label: 'Cellular outcome', ic: 'cells' }, { label: 'OSK construct', ic: 'flask' },
  { label: 'Safety pre-screen', ic: 'shield' }, { label: 'Tumorigenicity', ic: 'alert' },
  { label: 'Immunogenicity', ic: 'immune' }, { label: 'Success optimiser', ic: 'target' },
  { label: 'De Novo synthesis', ic: 'report' },
];
const CELL_STEPS: StepDef[] = [
  { label: 'Sample & therapy', ic: 'layers' }, { label: 'Data ingest', ic: 'dna' },
  { label: 'Epigenetic age', ic: 'wave' }, { label: 'Regeneration', ic: 'refresh' },
  { label: 'Cellular outcome', ic: 'cells' }, { label: 'Exosome carrier', ic: 'droplet' },
  { label: 'Safety pre-screen', ic: 'shield' }, { label: 'Immunogenicity', ic: 'immune' },
  { label: 'Success optimiser', ic: 'target' }, { label: 'De Novo synthesis', ic: 'report' },
];
const ICON_PATHS: Record<string, string> = {
  layers: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="M3 13l9 5 9-5"/>',
  dna: '<path d="M8 3c8 4 0 14 8 18M16 3c-8 4 0 14-8 18"/><path d="M9.5 6h5M9.5 18h5M8 10h8M8 14h8"/>',
  wave: '<path d="M3 14l3-5 3 3 3-7 3 9 3-4h3"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 4v4h-4"/>',
  cells: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="10" r="2.4"/><circle cx="11" cy="16" r="3"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 8a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-8V3"/><path d="M7.5 15h9"/>',
  droplet: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/>',
  alert: '<path d="M10.3 4 2.6 18a1.5 1.5 0 0 0 1.3 2.2h16.2A1.5 1.5 0 0 0 21.4 18L13.7 4a1.5 1.5 0 0 0-2.6 0Z"/><path d="M12 9v4M12 17h.01"/>',
  immune: '<path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/><path d="M9 12l2 2 4-4"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  report: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><path d="M9 13v4M12 11v6M15 14v3"/>',
};
const RIcon = ({ d, cls }: { d: string; cls?: string }) => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICON_PATHS[d] || '' }} />
);

const to100 = (x: any) => (x == null ? 0 : x <= 1 ? Math.round(x * 100) : Math.round(x));
const C = 2 * Math.PI * 52;

export default function SimulatorBrowser() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [disease, setDisease] = useState(DEFAULT_DISEASE.key);
  const [age, setAge] = useState('');
  const [patientId, setPatientId] = useState('');
  const [comorbid, setComorbid] = useState<string[]>([]);
  const [run, setRun] = useState<FullRun | null>(null);
  const [error, setError] = useState('');
  const [runKey, setRunKey] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const dz = CATALOG.find((d) => d.key === disease) || DEFAULT_DISEASE;
  const reprog = (run ? run.modality : dz.modality) === 'reprogramming';
  const railDefs = reprog ? REPROG_STEPS : CELL_STEPS;
  const total = railDefs.length;

  // drive the rail / ring / stepper reveal after a run
  useEffect(() => {
    if (!run || !run.ok) { setRevealed(0); return; }
    const rm = !!window.matchMedia?.('(prefers-reduced-motion:reduce)')?.matches;
    if (rm) { setRevealed(total); return; }
    setRevealed(0);
    let i = 0;
    const id = setInterval(() => { i++; setRevealed(i); if (i >= total) clearInterval(id); }, 300);
    return () => clearInterval(id);
  }, [runKey, total]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFile = async (f: File | null) => {
    if (!f) return;
    if (!METH_EXT.test(f.name)) { setError('Please choose a .csv / .cov / .tsv / .txt / .bedgraph methylation file.'); return; }
    setError('');
    try { setText(await f.text()); setFileName(f.name); setRun(null); } catch { setError('Could not read that file.'); }
  };
  const loadSample = async (s: typeof SAMPLES[number]) => {
    setError('');
    try {
      const t = await (await fetch(s.href)).text();
      setText(t); setFileName(s.href.split('/').pop() || 'sample.cov'); setDisease(s.disease); setAge(String(s.age)); setRun(null);
    } catch { setError('Could not load the sample file.'); }
  };
  const start = () => {
    if (!text) { setError('Upload a methylation file or pick a sample first.'); return; }
    const d = CATALOG.find((x) => x.key === disease) || DEFAULT_DISEASE;
    const sample = patientId.trim() || fileName.replace(/\.[^.]+$/, '');
    const r = buildRun(text, { disease: d, sample, chronologicalAge: age ? Number(age) : null, cycles: 1, comorbidities: comorbid });
    if (!r.ok) { setError(r.error || 'Could not run the simulation on that file.'); return; }
    setRun(r); setRunKey((k) => k + 1);
    setTimeout(() => document.getElementById('simd-out')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  };

  const running = !!run && run.ok && revealed < total;
  const done = !!run && run.ok && revealed >= total;
  const pct = run && run.ok ? Math.round((revealed / total) * 100) : 0;

  return (
    <div className="simd">
      <style>{SIMD_CSS}</style>
      <div className="simd-wrap container-x">
        {/* top bar */}
        <div className="simd-top">
          <span className="simd-mark"><Icon name="brain" className="h-7 w-7" /></span>
          <div className="simd-ttl">
            <h1>Protocol <span>Simulator</span></h1>
            <p>Personalised regenerative protocol simulation · on-device</p>
          </div>
          <span className="simd-badge">Research / illustrative</span>
        </div>

        <div className="simd-grid">
          {/* LEFT — steps */}
          <aside className="simd-rail simd-neu">
            <div className="simd-rail-h"><b>Simulation steps</b><span>{revealed} / {total}</span></div>
            <div className="simd-rail-prog simd-inset"><i style={{ width: pct + '%' }} /></div>
            <ul className="simd-steps">
              {railDefs.map((s, i) => {
                const st = i < revealed ? 'done' : (i === revealed && running) || (!run && i === 0) ? 'active' : '';
                return (
                  <li key={s.label} className={'simd-step ' + st}>
                    <span className="simd-no">{i + 1}</span>
                    <RIcon d={s.ic} cls="simd-ic" />
                    <span className="simd-lb">{s.label}</span>
                    <svg className="simd-arw" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* CENTER — form */}
          <section className="simd-form simd-neu">
            <div className="simd-form-h">
              <span className="simd-tile"><Icon name="dna" className="h-6 w-6" /></span>
              <h2>Start a new simulation</h2>
            </div>

            <div className="simd-fields">
              <div className="simd-field">
                <label>Therapy / disease</label>
                <div className="simd-ctl">
                  <select value={disease} onChange={(e) => { setDisease(e.target.value); setRun(null); }}>
                    {CATALOG.map((d) => <option key={d.key} value={d.key}>{d.disease} · {d.department}</option>)}
                  </select>
                  <svg className="simd-caret" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M1 1l5 5 5-5" /></svg>
                </div>
              </div>
              <div className="simd-field">
                <label>Chronological age <em>(optional)</em></label>
                <div className="simd-ctl">
                  <input value={age} onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Enter age (years)" />
                </div>
              </div>
              <div className="simd-field">
                <label>Target tissue <em>(auto)</em></label>
                <div className="simd-ctl ro"><span className="simd-roval">{dz.tissue}</span></div>
              </div>
              <div className="simd-field">
                <label>Sample / patient ID <em>(optional)</em></label>
                <div className="simd-ctl">
                  <input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Enter sample ID" />
                </div>
              </div>
              <div className="simd-field">
                <label>Therapy modality <em>(auto)</em></label>
                <div className="simd-ctl ro"><span className="simd-roval">{reprog ? 'Reprogramming (OSK)' : 'Cell / regenerative'}</span></div>
              </div>
              <div className="simd-field">
                <label>Delivery route <em>(auto)</em></label>
                <div className="simd-ctl ro"><span className="simd-roval">{dz.route}</span></div>
              </div>
            </div>

            <label
              className="simd-drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); loadFile(e.dataTransfer.files?.[0] ?? null); }}
            >
              <input ref={inputRef} type="file" className="hidden" accept=".csv,.cov,.tsv,.txt,.bedgraph,.bed" onChange={(e) => loadFile(e.target.files?.[0] ?? null)} />
              <span className="simd-dt"><Icon name="dna" className="h-6 w-6" /></span>
              <b>{fileName || 'Upload profile / methylation file'}</b>
              <small>Drag and drop your file here, or click to browse</small>
              <small className="fmt">array beta .csv (cg IDs) or bisulfite .cov/bedGraph — nothing leaves your device</small>
            </label>

            <div className="simd-samples">
              {SAMPLES.map((s) => (
                <button key={s.href} onClick={() => loadSample(s)} className={'simd-samp' + (fileName && s.href.includes(fileName) ? ' sel' : '')}>
                  <Icon name="dna" className="h-4 w-4 shrink-0" /> {s.label}
                </button>
              ))}
            </div>

            <div className="simd-cond">
              <label>Other conditions <em>(optional — sharpens the immune / adverse-event read)</em></label>
              <ConditionPicker value={comorbid} onChange={setComorbid} impliedKey={impliedCondition(dz.department)} neu />
            </div>

            {error && <p className="simd-err">{error}</p>}

            <div className="simd-actions">
              <button onClick={start} disabled={!text} className="simd-btn run">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>{run ? 'Run again' : 'Run simulation'}
              </button>
              <button onClick={() => loadSample(SAMPLES[1])} className="simd-btn ghost">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>Load sample
              </button>
            </div>
          </section>

          {/* RIGHT — live + safety */}
          <div className="simd-rightcol">
            <section className="simd-card simd-neu">
              <div className="simd-card-h"><span className="simd-ci"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2 6 4-14 2 8h6" /></svg></span><h3>Live simulation</h3></div>
              <p className="simd-live-sub">{revealed} / {total} steps complete</p>
              <div className="simd-ring-wrap">
                <div className="simd-ring">
                  <svg viewBox="0 0 120 120">
                    <defs><linearGradient id="simdrg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4285F4" /><stop offset=".55" stopColor="#6a53ff" /><stop offset="1" stopColor="#e15b8c" /></linearGradient></defs>
                    <circle className="simd-ring-bg" cx="60" cy="60" r="52" fill="none" strokeWidth={10} />
                    <circle className="simd-ring-fg" cx="60" cy="60" r="52" fill="none" strokeWidth={10} strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} />
                  </svg>
                  <div className="simd-ring-hole"><span className="simd-pct">{pct}%</span></div>
                </div>
              </div>
              <div className={'simd-status' + (running ? ' run' : '')}>
                <span className="simd-dot" />Model status:&nbsp;<b>{done ? 'Complete ✓' : running ? 'Running' : 'Ready'}</b>
              </div>
            </section>

            <section className="simd-card simd-neu">
              <div className="simd-card-h"><span className="simd-ci"><RIcon d="shield" /></span><h3>Safety &amp; evidence</h3></div>
              <div className="simd-safe-list">
                <div className="simd-safe"><span className="simd-si b"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg></span><div className="simd-stx"><b>Illustrative model</b><span>Not validated for clinical use</span></div></div>
                <div className="simd-safe"><span className="simd-si a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg></span><div className="simd-stx"><b>Not medical advice</b><span>For research and education only</span></div></div>
                <div className="simd-safe"><span className="simd-si g"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg></span><div className="simd-stx"><b>Confirm with clinician</b><span>Discuss with your healthcare provider</span></div></div>
              </div>
            </section>
          </div>
        </div>

        {/* BOTTOM — stepper + output */}
        <section className="simd-bottom simd-neu" id="simd-out">
          <div className="simd-stepper">
            {railDefs.map((s, i) => {
              const st = i < revealed ? 'done' : (i === revealed && running) || (!run && i === 0) ? 'active' : '';
              return (
                <div key={s.label} className={'simd-snode ' + st + (i > 0 && i <= revealed ? ' fill' : '')}>
                  <span className="simd-sd">{i + 1}</span><span className="simd-sl">{s.label}</span>
                </div>
              );
            })}
          </div>

          <div className="simd-outbox simd-inset">
            {run && run.ok ? <Results run={run} reprog={reprog} /> : (
              <div className="simd-out-empty">
                <span className="simd-oi"><RIcon d="report" /></span>
                <div><b>Simulation output</b><span>Results will appear as the simulation runs</span></div>
              </div>
            )}
          </div>
        </section>

        {/* full detail / AI synthesis / PDF */}
        {run && run.ok && (
          <details className="simd-details group">
            <summary><span className="simd-chev">▶</span> Interactive breakdown · AI synthesis · PDF export</summary>
            <div className="mt-4"><SimRun key={runKey} run={run} /></div>
          </details>
        )}
        {run && !run.ok && <div className="mt-6"><SimRun key={runKey} run={run} /></div>}
      </div>
    </div>
  );
}

/* ---- detail helpers (ported from the pipeline, new theme) ---- */
const DRow = ({ k, v }: { k: string; v: ReactNode }) => <div className="simd-drow"><span>{k}</span><b>{v}</b></div>;
const Genes = ({ items }: { items: string[] }) => <div className="simd-genes">{items.map((g) => <span key={g} className="simd-gene">{g}</span>)}</div>;
const Check = ({ k }: { k: string }) => <div className="simd-check"><span className="simd-ck">✓</span>{k}</div>;
const Panel = ({ head, children }: { head: string; children: ReactNode }) => <div className="simd-dpanel"><div className="simd-dhead">{head}</div>{children}</div>;
function BA({ lab, a, b, up }: { lab: string; a: number; b: number; up?: boolean }) {
  return <div className="simd-ba"><span className="lab">{lab}</span><div className="bar"><div className="bf" style={{ width: Math.max(4, Math.min(100, b)) + '%', background: up ? 'linear-gradient(90deg,#4fd0a0,#1f9d78)' : 'linear-gradient(90deg,#5a9bff,#2f6fe0)' }} /></div><span className="d" style={{ color: up ? 'var(--green)' : '#2fa08f' }}>{a}→{b} {up ? '▲' : '▼'}</span></div>;
}
const SYM_CLS: Record<string, string> = { Uncommon: 'g', Common: 'b', Possible: 'a', Likely: 'a' };
function Sym({ cat, tier, list }: { cat: string; tier: string; list: string[] }) {
  return <div className="simd-sym"><div className="top"><span className="cat">{cat}</span><span className={'simd-pill ' + (SYM_CLS[tier] || 'g')}>{tier}</span></div><div className="sx">{list.map((s, i) => <span key={i} className="s">{s}</span>)}</div></div>;
}

/* ---- real result cards (summary + expandable detail) ---- */
function Results({ run, reprog }: { run: FullRun; reprog: boolean }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [allOpen, setAllOpen] = useState(false);
  const ea: any = run.epigenetic_age || {};
  const opt: any = run.optimization;
  const best: any = opt?.best || {};
  const cel: any = run.cellular || {};
  const im: any = run.immune || {};
  const tm: any = run.tumor || {};
  const cx: any = run.construct || {};
  const ex: any = run.exosome || {};
  const successPct = to100(best.success);
  const basePct = to100(opt?.baseline?.success);
  const lift = Math.max(0, successPct - basePct);
  const senT: number[] = cel?.senescent_series?.treated || [];
  const cellPct = senT.length ? Math.max(5, Math.min(95, Math.round(100 - senT[senT.length - 1]))) : null;
  const accel = ea.age_acceleration;
  const iTier = im.overall_tier || '—';
  const iCls = iTier === 'Uncommon' ? 'g' : iTier === 'Common' ? 'b' : 'a';
  const safeTier = reprog ? (tm.risk_tier || 'Low') : 'Cleared';
  const safeCls = reprog ? (tm.risk_tier === 'High' || tm.risk_tier === 'Moderate' ? 'a' : 'g') : 'g';
  const weeks = best.weeks;

  const clocks: any[] = Array.isArray(ea.clocks) && ea.clocks.length ? ea.clocks : [{ label: 'Horvath', dnam_age: ea.dnam_age, validated: true }];
  const drivers: string[] = (run.targets || []).map((t: any) => t.gene || t.cpg).filter(Boolean).slice(0, 6);
  const head: any[] = cel.headline || [];
  const baVal = (k: string, fb: number): [number, number, boolean] => { const h = head.find((x) => (x.key || x.label || '').toLowerCase().includes(k)); return h ? [Math.round(h.untreated), Math.round(h.treated), h.better === 'up'] : [fb, fb, false]; };
  const [su, st] = baVal('sen', 60); const [iu, it] = baVal('sasp', 55); const [ou, ot] = baVal('oxid', 55); const [pu, pt, pup] = baVal('prolif', 30);
  const classes: any[] = im.classes || [];
  const bsteps = reprog ? ['Cell sourcing', 'Reprogramming (OSK)', 'QC / release', 'Cryopreservation', 'Delivery'] : ['Cell sourcing', 'Culture / expansion', 'QC / release', 'Cryopreservation', 'Delivery'];

  const cards: { k: string; v: ReactNode; sub?: ReactNode; pill?: { t: string; c: string }; detail: ReactNode }[] = [
    {
      k: 'Epigenetic age', v: <>{Number(ea.dnam_age || 0).toFixed(1)}<small> yr</small></>, sub: accel != null ? `${accel >= 0 ? '+' : ''}${Number(accel).toFixed(1)} yr acceleration` : 'DNAm age',
      detail: <Panel head="Multi-clock cross-check">{clocks.map((c, i) => <DRow key={i} k={(c.label || c.clock) + (c.validated ? ' ✓' : '')} v={`${Number(c.dnam_age).toFixed(2)} yr`} />)}{ea.consensus_age != null && <DRow k="Consensus" v={`${ea.consensus_age} yr`} />}{drivers.length ? <><div className="simd-dhead" style={{ marginTop: 4 }}>Top methylation drivers</div><Genes items={drivers} /></> : null}</Panel>,
    },
    {
      k: 'Success rate', v: <>{successPct}<small>%</small></>, sub: opt ? `▲ +${lift} pts vs baseline` : 'optimised formulation',
      detail: <Panel head={`Best formulation${opt?.candidates ? ` · ${opt.candidates} candidates` : ''}`}><DRow k="Baseline → optimised" v={`${basePct}% → ${successPct}%`} /><DRow k="Cell source" v={best.cellSourceLabel || '—'} /><DRow k="Delivery route" v={best.route || run.disease.route} /><DRow k="Protocol" v={best.protocolLabel || 'De Novo'} /><DRow k="Prep time" v={weeks ? `~${weeks} wk` : '—'} />{opt?.tradeoff ? <div className="simd-note">{opt.tradeoff}</div> : null}</Panel>,
    },
    {
      k: 'Cellular outcome', v: <>{cellPct ?? '—'}<small>%</small></>, sub: 'senescence cleared',
      detail: <Panel head="Endpoints · untreated → treated"><BA lab="Senescent load" a={su} b={st} /><BA lab="SASP inflammation" a={iu} b={it} /><BA lab="Oxidative stress" a={ou} b={ot} /><BA lab="Proliferative cap." a={pu} b={pt} up={pup} />{Array.isArray(cel.variants) && cel.variants.length ? <><div className="simd-dhead" style={{ marginTop: 4 }}>Genotype panel</div><Genes items={cel.variants.slice(0, 6).map((v: any) => `${v.gene} ${v.genotype}`)} /></> : null}{Array.isArray(cel.pathways) && cel.pathways.length ? <div className="simd-note">{cel.pathways.join(' · ')}</div> : null}</Panel>,
    },
    {
      k: 'Immunogenicity', v: <span className="sm">{iTier}</span>, pill: { t: 'likelihood tier', c: iCls },
      detail: <Panel head="Symptom likelihood (not severity)">{classes.length ? classes.map((c, i) => <Sym key={i} cat={c.label} tier={c.tier} list={c.symptoms || []} />) : <div className="simd-note">No elevated immune classes flagged.</div>}{Array.isArray(im.cant_see) && im.cant_see.length ? <div className="simd-note warn"><b>What this can't see:</b> {im.cant_see.join(' · ')}</div> : null}{Array.isArray(im.modifiable) && im.modifiable.length ? <div className="simd-note rev">↺ {im.modifiable[0]}</div> : null}</Panel>,
    },
    {
      k: reprog ? 'Tumorigenicity' : 'Safety envelope', v: <span className="sm">{safeTier}</span>, pill: { t: reprog ? `${Math.round((tm.estimated_risk ?? 0.08) * 100)}% risk` : 'pre-screen passed', c: safeCls },
      detail: reprog
        ? <Panel head="Over-induction risk envelope"><DRow k="Risk tier" v={tm.risk_tier || 'Low'} /><DRow k="Estimated risk" v={`${Math.round((tm.estimated_risk ?? 0.08) * 100)}%`} /><DRow k="Max safe cycles" v={tm.max_safe_cycles ?? '—'} /><DRow k="Threshold" v={`${Math.round((tm.risk_threshold ?? 0.2) * 100)}%`} /><div className="simd-note">Screened &amp; mitigated with a kill-switch — not eliminated.</div></Panel>
        : <Panel head="Pre-screen checks"><Check k="Sterility & endotoxin" /><Check k="Dose-controlled induction" /><Check k="Transient exposure" /><Check k="Off-target screen passed" /></Panel>,
    },
    {
      k: 'Protocol', v: <span className="sm">Buildable</span>, sub: <>{best.protocolLabel || 'De Novo'}{weeks ? ` · ~${weeks} wk prep` : ''}</>,
      detail: <Panel head={reprog ? 'OSK construct & build outline' : 'Carrier & build outline'}>{reprog
        ? <><DRow k="Capsid" v={cx.capsid_desc || (cx.capsid || 'AAV').toString().toUpperCase()} /><DRow k="Cassette" v="OSK (Oct4 · Sox2 · Klf4)" /><DRow k="Promoter" v="TRE3G · dox-inducible" /></>
        : <><DRow k="Carrier" v={ex.carrier || 'MSC-derived exosome'} /><DRow k="Payload" v={ex.payload || 'regenerative cargo'} /><DRow k="Vesicle size" v={`${ex.vesicle_size_nm || '30–150'} nm`} /><DRow k="Targeting" v={ex.ligand || ex.targeting?.ligand || 'native circulation'} /></>}<div className="simd-dhead" style={{ marginTop: 4 }}>Compiled build outline</div><div className="simd-blist">{bsteps.map((b, i) => <div key={i} className="simd-bstep"><span className="bn">{i + 1}</span><span className="bt">{b}</span></div>)}</div><div className="simd-note">Full De Novo protocol (facility level · products · CT-code steps) is in the interactive breakdown below.</div></Panel>,
    },
  ];

  return (
    <>
      <div className="simd-res-head">
        <b>Simulation output</b>
        <button className="simd-showall" onClick={() => setAllOpen((v) => !v)}>{allOpen ? '－ Hide details' : '＋ Show all details'}</button>
      </div>
      <div className="simd-results">
        {cards.map((c, i) => {
          const isOpen = allOpen || !!open[i];
          return (
            <div key={c.k} className={'simd-rrow' + (isOpen ? ' open' : '')}>
              <button className="simd-rhead" onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}>
                <span className="rk">{c.k}</span>
                <span className="rv">{c.v}</span>
                {c.sub && <span className="rs">{c.sub}</span>}
                {c.pill && <span className={'simd-pill ' + c.pill.c}>{c.pill.t}</span>}
                <span className="simd-spacer" />
                <span className="simd-mtog"><span>details</span><span className="simd-mchev">▾</span></span>
              </button>
              <div className="simd-det">{c.detail}</div>
            </div>
          );
        })}
      </div>
      <p className="simd-disc">Illustrative model estimates — published Horvath (2013) clock + a deterministic pipeline. Not measured outcomes, not medical advice.</p>
    </>
  );
}

export { SIMD_CSS } from '../theme/simd';
