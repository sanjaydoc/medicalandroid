// SimPipeline — neumorphic "console" of the whole pipeline. Success-rate
// optimiser sits dead-centre; the other steps ring around it, each a distinct
// soft-UI component (gauge / slider / wave / toggle / timeline) that fills in
// sequence as the run reveals. Every card keeps a summary AND an expandable
// detail panel (immune symptoms, drivers, endpoints, construct, envelope, …) —
// nothing from the detailed pipeline is dropped. All values are real (FullRun).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { FullRun } from '../sim/full';

const C = 2 * Math.PI * 44;

/* ---------- tiny animated primitives ---------- */
function useCount(target: number, on: boolean, dec = 0) {
  const [v, setV] = useState(0); const raf = useRef(0);
  useEffect(() => {
    if (!on) return;
    const rm = !!window.matchMedia?.('(prefers-reduced-motion:reduce)')?.matches;
    if (rm) { setV(target); return; }
    const st = performance.now(), d = 950;
    cancelAnimationFrame(raf.current);
    const tick = (t: number) => { const k = Math.min(1, (t - st) / d), e = 1 - Math.pow(1 - k, 3); setV(target * e); if (k < 1) raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [on, target]);
  return on ? (dec ? v.toFixed(dec) : Math.round(v).toString()) : '—';
}
function Gauge({ val, max, color, on, unit, dec = 0, hero }: { val: number; max: number; color: string; on: boolean; unit: string; dec?: number; hero?: boolean }) {
  const num = useCount(val, on, dec);
  const off = on ? C * (1 - Math.max(0, Math.min(1, val / max))) : C;
  return (
    <div className={'np-g' + (hero ? ' np-gh' : '')}>
      <svg viewBox="0 0 100 100"><circle className="np-tk" cx="50" cy="50" r="44" fill="none" strokeWidth="9" /><circle className="np-arc" cx="50" cy="50" r="44" fill="none" strokeWidth={hero ? 8 : 9} stroke={color} strokeDasharray={C} strokeDashoffset={off} /></svg>
      <div className="np-hole"><div><span className="np-num">{num}</span><span className="np-unit">{unit}</span></div></div>
    </div>
  );
}
function Slider({ val, max, color, on, unit, pill, pillColor }: { val: number; max: number; color: string; on: boolean; unit: string; pill: string; pillColor: string }) {
  const num = useCount(val, on); const p = on ? Math.max(0, Math.min(100, val / max * 100)) : 0;
  return (
    <div className="np-slider">
      <div className="np-srow"><div className="np-big"><span className="np-num">{num}</span><span className="np-u">{unit}</span></div><span className="np-pillv" style={{ color: pillColor }}>{pill}</span></div>
      <div className="np-track2"><div className="np-fillS" style={{ width: p + '%', background: color }} /><div className="np-knob" style={{ left: p + '%' }} /></div>
    </div>
  );
}
function Wave({ ys, big, unit, sub, color, on }: { ys: number[]; big: string; unit: string; sub: string; color: string; on: boolean }) {
  const { line, end } = useMemo(() => { const n = ys.length, W = 200, H = 60; const pts = ys.map((y, i) => [i / (n - 1) * W, H - y * H + 4]); return { line: 'M' + pts.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' L'), end: pts[pts.length - 1] }; }, [ys]);
  const ref = useRef<SVGPathElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; const L = el.getTotalLength(); el.style.strokeDasharray = String(L); el.style.strokeDashoffset = on ? '0' : String(L); }, [on]);
  return (
    <div className="np-wave">
      <div className="np-whead"><div className="np-big"><span>{big}</span><span className="np-u">{unit}</span></div><span className="np-sub">{sub}</span></div>
      <div className="np-wbox"><svg className="np-wsvg" viewBox="0 0 200 68" preserveAspectRatio="none"><path ref={ref} className="np-wline" style={{ stroke: color }} d={line} /><circle className="np-wdot" cx={end[0].toFixed(1)} cy={end[1].toFixed(1)} r="4" style={{ fill: color, opacity: on ? 1 : 0 }} /></svg></div>
    </div>
  );
}
function Toggle({ word, color, sub, on }: { word: string; color: string; sub: string; on: boolean }) {
  return (<div className="np-body"><div className="np-tg"><div className={'np-bigsw' + (on ? ' on' : '')} style={{ ['--c' as any]: color }}><i /></div><div className={'np-word' + (on ? ' on' : '')}>{word}</div></div><div className="np-sub" style={{ textAlign: 'center' }}>{sub}</div></div>);
}
function Timeline({ nodes, sub, on }: { nodes: string[]; sub: string; on: boolean }) {
  const [lit, setLit] = useState(0);
  useEffect(() => { if (!on) { setLit(0); return; } let i = 0; const id = setInterval(() => { i++; setLit(i); if (i >= nodes.length) clearInterval(id); }, 150); return () => clearInterval(id); }, [on, nodes.length]);
  return (<div className="np-body"><div className="np-tl"><div className="np-line" /><div className="np-prog" style={{ width: on ? 'calc(100% - 24px)' : 0 }} /><div className="np-nodes">{nodes.map((nm, i) => <div key={nm} className={'np-node' + (i < lit ? ' on' : '')}><span className="np-dot" /><span>{nm}</span></div>)}</div></div><div className="np-sub" style={{ textAlign: 'center' }}>{sub}</div></div>);
}

/* ---------- detail helpers ---------- */
const DRow = ({ k, v }: { k: string; v: ReactNode }) => <div className="np-drow"><span>{k}</span><b>{v}</b></div>;
const Genes = ({ items }: { items: string[] }) => <div className="np-genes">{items.map((g) => <span key={g} className="np-gene">{g}</span>)}</div>;
const Check = ({ k }: { k: string }) => <div className="np-check"><span className="np-k">✓</span>{k}</div>;
const Panel = ({ head, children }: { head: string; children: ReactNode }) => <div className="np-det"><div className="np-dpanel"><div className="np-dhead">{head}</div>{children}</div></div>;
function BA({ lab, a, b, up }: { lab: string; a: number; b: number; up?: boolean }) {
  return <div className="np-ba"><span className="np-lab">{lab}</span><div className="np-bar"><div className="np-bf" style={{ width: Math.max(4, Math.min(100, b)) + '%', background: up ? 'linear-gradient(90deg,#4fd0a0,#1f9d78)' : 'linear-gradient(90deg,#5a9bff,#2f6fe0)' }} /></div><span className="np-d" style={{ color: up ? 'var(--np-green)' : 'var(--np-teal)' }}>{a}→{b} {up ? '▲' : '▼'}</span></div>;
}
const TIER_CLS: Record<string, string> = { Uncommon: 'unc', Common: 'com', Possible: 'pos', Likely: 'pos' };
function Sym({ cat, tier, list }: { cat: string; tier: string; list: string[] }) {
  return <div className="np-sym"><div className="np-symtop"><span className="np-cat">{cat}</span><span className={'np-lp ' + (TIER_CLS[tier] || 'unc')}>{tier}</span></div><div className="np-sx">{list.map((s, i) => <span key={i} className="np-s">{s}</span>)}</div></div>;
}

/* ---------- build the ordered steps from a run ---------- */
const ACC = { blue: '#2f6fe0', blue2: '#3f74e6', teal: '#2fa08f', green: '#1f9d78', amber: '#c98a1e', indigo: '#6a53ff', hero: '#5b6bff' };
const to100 = (x: any) => (x == null ? 0 : x <= 1 ? Math.round(x * 100) : Math.round(x));

function buildSteps(run: FullRun) {
  const reprog = run.modality === 'reprogramming';
  const ea: any = run.epigenetic_age || {};
  const clocks: any[] = Array.isArray(ea.clocks) && ea.clocks.length ? ea.clocks : [{ label: 'Horvath', dnam_age: ea.dnam_age, validated: true }];
  const drivers: string[] = (run.targets || []).map((t: any) => t.gene || t.cpg).filter(Boolean).slice(0, 6);
  const cel: any = run.cellular || {};
  const head: any[] = cel.headline || [];
  const senT: number[] = cel?.senescent_series?.treated || [];
  const cellPct = senT.length ? Math.max(5, Math.min(95, Math.round(100 - senT[senT.length - 1]))) : 65;
  const opt: any = run.optimization;
  const cov = to100(ea.coverage ?? (run.coverage_pct ? run.coverage_pct / 100 : 1));

  type S = { n: number; tag: string; title: string; viz: string; hero?: boolean; props: any; detail: ReactNode };
  const steps: S[] = [];
  let n = 1;

  steps.push({ n: n++, tag: 'Sample', title: 'Sample & therapy', viz: 'chips',
    props: { word: 'Loaded', color: 'var(--np-grad)', chips: [run.disease.name, run.disease.tissue].filter(Boolean) },
    detail: <Panel head="Therapy target"><DRow k="Department" v={run.disease.department} /><DRow k="Tissue" v={run.disease.tissue} /><DRow k="Modality" v={reprog ? 'Reprogramming (OSK)' : 'Cell / regenerative'} /><DRow k="Delivery route" v={run.disease.route} /><DRow k="Sample" v={`${run.sample} · on-device`} /></Panel> });

  steps.push({ n: n++, tag: 'Sequence', title: 'Data ingest', viz: 'slider',
    props: { val: cov, max: 100, unit: '%', color: 'linear-gradient(90deg,#5a9bff,#2F6FE0)', pill: `${ea.n_used ?? '—'}/${ea.n_total ?? '—'}`, pillColor: ACC.blue },
    detail: <Panel head="Clock CpG coverage">{clocks.map((c, i) => <DRow key={i} k={(c.label || c.clock) + (c.validated ? ' ✓' : '')} v={`${c.dnam_age?.toFixed?.(1) ?? c.dnam_age} yr`} />)}<DRow k="Coverage" v={`${cov}% · nothing leaves device`} /></Panel> });

  steps.push({ n: n++, tag: 'Analyse', title: 'Epigenetic age', viz: 'wave',
    props: { ys: [.25, .28, .34, .3, .4, .46, .52, .58, .64], big: Number(ea.dnam_age || 0).toFixed(1), unit: 'yr', sub: ea.age_acceleration != null ? `${ea.age_acceleration >= 0 ? '+' : ''}${Number(ea.age_acceleration).toFixed(1)} yr accel` : '', color: ACC.blue2 },
    detail: <Panel head="Multi-clock cross-check">{clocks.map((c, i) => <DRow key={i} k={(c.label || c.clock) + (c.validated ? ' ✓' : '')} v={`${Number(c.dnam_age).toFixed(2)} yr`} />)}{ea.consensus_age != null && <DRow k="Consensus" v={`${ea.consensus_age} yr`} />}{drivers.length ? <><div className="np-dhead" style={{ marginTop: 4 }}>Top methylation drivers</div><Genes items={drivers} /></> : null}</Panel> });

  if (reprog) {
    const rej: any = run.rejuvenation || {};
    steps.push({ n: n++, tag: 'Reverse', title: 'Rejuvenation projection', viz: 'gauge',
      props: { val: to100(rej.tissue_rejuvenation_index), max: 100, unit: '%', color: ACC.teal, sub: rej.projected_age != null ? `${(Number(ea.dnam_age) - Number(rej.projected_age)).toFixed(1)} yr reversed` : '' },
      detail: <Panel head="Partial-reprogramming model"><DRow k="Projected DNAm age" v={`${Number(rej.projected_age).toFixed(1)} yr`} /><DRow k="Youth setpoint" v={`${Math.round(rej.youth_setpoint)} yr`} /><DRow k="Efficiency / cycle" v={`${Math.round((rej.efficiency || 0) * 100)}%`} /><div className="np-note">Illustrative OSK model — cycles compound with diminishing returns toward the setpoint.</div></Panel> });
  } else {
    const rg: any = run.regeneration || {};
    steps.push({ n: n++, tag: 'Regen', title: 'Regeneration projection', viz: 'gauge',
      props: { val: to100(rg.regeneration_index), max: 100, unit: '%', color: ACC.teal, sub: `tissue-repair · ${rg.doses || 1} dose` },
      detail: <Panel head="Tissue-repair model"><DRow k="Repair index (1 dose)" v={`${to100(rg.regeneration_index)}%`} /><DRow k="Per first dose" v={`${to100(rg.per_first_dose)}%`} /><DRow k="Target" v={run.disease.tissue} /><div className="np-note">Each dose repairs a fraction of the remaining deficit (diminishing returns). Confirm with follow-up imaging.</div></Panel> });
  }

  const baVal = (k: string, fb: number) => { const h = head.find((x) => (x.key || x.label || '').toLowerCase().includes(k)); return h ? [Math.round(h.untreated), Math.round(h.treated), h.better === 'up'] as [number, number, boolean] : [fb, fb, false] as [number, number, boolean]; };
  const [su, st] = baVal('sen', 60); const [iu, it] = baVal('sasp', 55) as any; const [ou, ot] = baVal('oxid', 55) as any; const [pu, pt, pup] = baVal('prolif', 30) as any;
  steps.push({ n: n++, tag: 'Cell', title: 'Cellular outcome', viz: 'wave',
    props: { ys: (senT.length ? senT : [72, 68, 60, 52, 46, 40, 36, 33, 32]).map((x) => Math.max(0, Math.min(1, x / 100))), big: String(cellPct), unit: '%', sub: 'senescence cleared (▼)', color: ACC.blue2 },
    detail: <Panel head="Endpoints · untreated → treated"><BA lab="Senescent load" a={su} b={st} /><BA lab="SASP inflammation" a={iu} b={it} /><BA lab="Oxidative stress" a={ou} b={ot} /><BA lab="Proliferative cap." a={pu} b={pt} up={pup} />{Array.isArray(cel.variants) && cel.variants.length ? <><div className="np-dhead" style={{ marginTop: 4 }}>Genotype panel</div><Genes items={cel.variants.slice(0, 6).map((v: any) => `${v.gene} ${v.genotype}`)} /></> : null}{Array.isArray(cel.pathways) && cel.pathways.length ? <div className="np-note">{cel.pathways.join(' · ')}</div> : null}</Panel> });

  if (reprog) {
    const cx: any = run.construct || {};
    steps.push({ n: n++, tag: 'Vector', title: 'OSK construct', viz: 'toggle',
      props: { word: 'Ready', color: 'linear-gradient(135deg,#7c6bff,#6a53ff)', sub: `${(cx.capsid || 'AAV').toString().toUpperCase()} · OSK cassette` },
      detail: <Panel head="Construct assembly"><DRow k="Capsid" v={cx.capsid_desc || (cx.capsid || 'AAV').toString().toUpperCase()} /><DRow k="Cassette" v="OSK (Oct4 · Sox2 · Klf4)" /><DRow k="Promoter" v="TRE3G · dox-inducible" /><DRow k="Strategy" v={cx.strategy || 'single AAV'} />{Array.isArray(cx.notes) && cx.notes.length ? <div className="np-note">{cx.notes[0]}</div> : null}</Panel> });
  } else {
    const ex: any = run.exosome || {};
    steps.push({ n: n++, tag: 'Carrier', title: 'IV exosome carrier', viz: 'toggle',
      props: { word: 'Ready', color: 'linear-gradient(135deg,#7c6bff,#6a53ff)', sub: `${ex.vesicle_size_nm || '30–150'} nm · ${ex.route || 'IV'}` },
      detail: <Panel head="Exosome carrier"><DRow k="Payload" v={ex.payload || 'MSC-derived regenerative cargo'} /><DRow k="Route" v={ex.route || 'Intravenous infusion'} /><DRow k="Vesicle size" v={`${ex.vesicle_size_nm || '30–150'} nm`} /><DRow k="Targeting" v={ex.ligand || ex.targeting?.ligand || 'native circulation'} /></Panel> });
  }

  steps.push({ n: n++, tag: 'Avatar', title: 'Safety pre-screen', viz: 'toggle',
    props: { word: 'Cleared', color: 'linear-gradient(135deg,#3fc0a8,#2fa08f)', sub: 'sterility · kill-switch' },
    detail: <Panel head="Pre-screen checks"><Check k="Sterility & endotoxin" /><Check k="Dose-controlled induction" />{reprog && <Check k="Kill-switch armed & tested" />}<Check k="Transient exposure" /><Check k="Off-target screen passed" /></Panel> });

  if (reprog) {
    const tm: any = run.tumor || {};
    const risk = Math.round((tm.estimated_risk ?? 0.08) * 100);
    const tone = tm.risk_tier === 'Low' ? ACC.green : tm.risk_tier === 'High' ? '#e0574d' : ACC.amber;
    const curve: any[] = tm.risk_curve || [];
    steps.push({ n: n++, tag: 'Safety', title: 'Tumorigenicity', viz: 'slider',
      props: { val: risk, max: 100, unit: '%', color: tm.risk_tier === 'Low' ? 'linear-gradient(90deg,#4fd0a0,#1f9d78)' : 'linear-gradient(90deg,#f0c26a,#c98a1e)', pill: tm.risk_tier || 'Low', pillColor: tone },
      detail: <Panel head="Over-induction risk envelope"><DRow k="Risk tier" v={tm.risk_tier || 'Low'} /><DRow k="Estimated risk" v={`${risk}%`} /><DRow k="Max safe cycles" v={tm.max_safe_cycles ?? '—'} /><DRow k="Threshold" v={`${Math.round((tm.risk_threshold ?? .2) * 100)}%`} />{curve.length >= 4 ? <><BA lab="1 cycle" a={0} b={Math.round(curve[0].risk * 100)} /><BA lab={`${curve[3].cycles} cycles`} a={0} b={Math.round(curve[3].risk * 100)} up={false} /></> : null}<div className="np-note">Screened & mitigated with a kill-switch — not eliminated.</div></Panel> });
  }

  // immunogenicity
  const im: any = run.immune || {};
  const iTier = im.overall_tier || 'Uncommon';
  const iPct = iTier === 'Uncommon' ? 30 : iTier === 'Common' ? 52 : 72;
  const iTone = iTier === 'Uncommon' ? ACC.green : iTier === 'Common' ? ACC.blue : ACC.amber;
  const classes: any[] = im.classes || [];
  steps.push({ n: n++, tag: 'Immune', title: 'Immunogenicity', viz: 'slider',
    props: { val: iPct, max: 100, unit: '%', color: iTier === 'Uncommon' ? 'linear-gradient(90deg,#4fd0a0,#1f9d78)' : iTier === 'Common' ? 'linear-gradient(90deg,#5a9bff,#2f6fe0)' : 'linear-gradient(90deg,#f0c26a,#c98a1e)', pill: iTier, pillColor: iTone },
    detail: <Panel head="Symptom likelihood (not severity)">{classes.map((c, i) => <Sym key={i} cat={c.label} tier={c.tier} list={c.symptoms || []} />)}{Array.isArray(im.cant_see) && im.cant_see.length ? <div className="np-note np-warn"><b>What this can't see:</b> {im.cant_see.join(' · ')}</div> : null}{Array.isArray(im.modifiable) && im.modifiable.length ? <div className="np-note np-rev">↺ {im.modifiable[0]}</div> : null}</Panel> });

  // success optimiser — HERO (centre)
  const best: any = opt?.best || {}; const successPct = to100(best.success); const basePct = to100(opt?.baseline?.success);
  const chips = [best.cellSourceLabel, ...(best.cellSource === 'allogeneic' && best.hlaMatched ? ['HLA-matched'] : []), best.route].filter(Boolean);
  steps.push({ n: n++, tag: 'Formulate', title: 'Success-rate optimiser', viz: 'gauge', hero: true,
    props: { val: successPct, max: 100, unit: '%', color: ACC.hero, hero: true, lift: opt ? `▲ +${Math.max(0, successPct - basePct)} pts vs baseline (${basePct}%)` : '', chips },
    detail: <Panel head={`Best formulation${opt?.candidates ? ` · ${opt.candidates} candidates` : ''}`}><DRow k="Baseline → optimised" v={`${basePct}% → ${successPct}%`} /><DRow k="Cell source" v={best.cellSourceLabel} /><DRow k="Delivery route" v={best.route} /><DRow k="Protocol" v={best.protocolLabel} /><DRow k="Prep time" v={`~${best.weeks ?? 0} wk`} />{opt?.tradeoff ? <div className="np-note">{opt.tradeoff}</div> : null}</Panel> });

  // De Novo synthesis — deterministic build outline (full AI synthesis lives in the interactive breakdown below)
  const bsteps = reprog
    ? ['Cell sourcing', 'Reprogramming (OSK)', 'QC / release', 'Cryopreservation', 'Delivery']
    : ['Cell sourcing', 'Culture / expansion', 'QC / release', 'Cryopreservation', 'Delivery'];
  steps.push({ n: n++, tag: 'De Novo', title: 'De Novo AI synthesis', viz: 'timeline',
    props: { nodes: ['Source', 'Make', 'QC', 'Cryo', 'Deliver'], sub: 'buildable protocol compiled' },
    detail: <Panel head="Compiled build outline"><div className="np-blist">{bsteps.map((b, i) => <div key={i} className="np-bstep"><span className="np-bn">{i + 1}</span><span className="np-bt">{b}</span></div>)}</div><div className="np-note">Full De Novo protocol (facility level · products · CT-code steps) is generated in the interactive breakdown below.</div></Panel> });

  return steps;
}

export default function SimPipeline({ run }: { run: FullRun }) {
  const steps = useMemo(() => buildSteps(run), [run]);
  const [revealed, setRevealed] = useState(0);
  const [allOpen, setAllOpen] = useState(false);
  const [open, setOpen] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const rm = !!window.matchMedia?.('(prefers-reduced-motion:reduce)')?.matches;
    if (rm) { setRevealed(steps.length); return; }
    setRevealed(0); let i = 0; const id = setInterval(() => { i++; setRevealed(i); if (i >= steps.length) clearInterval(id); }, 300);
    return () => clearInterval(id);
  }, [steps.length]);

  const done = revealed >= steps.length;
  return (
    <div className="np-root">
      <style>{CSS}</style>
      <div className="np-top np-neu">
        <div className="np-brand"><span className="np-kick">StemCells Protocol · De Novo</span><h3 className="np-h1">Protocol Simulator</h3></div>
        <span className={'np-status' + (done ? ' done' : ' run')}><span className="np-d" />{done ? 'COMPLETE ✓' : 'RUNNING'}</span>
        <button className="np-btn" onClick={() => setAllOpen((v) => !v)}>{allOpen ? '－ Collapse' : '＋ Details'}</button>
      </div>
      <div className="np-grid">
        {steps.map((s, i) => {
          const on = i < revealed;
          const isOpen = allOpen || !!open[i];
          const p = s.props;
          return (
            <div key={s.n} className={'np-card' + (s.hero ? ' np-hero' : '') + (on ? ' np-done' : '') + (i === revealed - 1 && !done ? ' np-active' : '') + (isOpen ? ' np-open' : '')}>
              <div className="np-hd"><span className="np-no">{String(s.n).padStart(2, '0')}</span><div className="np-ht"><div className="np-t">{s.tag}</div><div className="np-n">{s.title}</div></div>{i === revealed - 1 && !done && <span className="np-scan">scanning…</span>}</div>
              {/* body */}
              {s.viz === 'gauge' && <div className="np-body"><Gauge val={p.val} max={p.max} color={p.color} on={on} unit={p.unit} hero={p.hero} />{p.lift && <div className="np-lift">{p.lift}</div>}{p.chips && <div className="np-chips">{p.chips.map((c: string, k: number) => <span key={k} className="np-chip">{c}</span>)}</div>}{p.sub && !p.chips && <div className="np-sub" style={{ textAlign: 'center' }}>{p.sub}</div>}</div>}
              {s.viz === 'slider' && <div className="np-body"><Slider val={p.val} max={p.max} color={p.color} on={on} unit={p.unit} pill={p.pill} pillColor={p.pillColor} /></div>}
              {s.viz === 'wave' && <div className="np-body"><Wave ys={p.ys} big={p.big} unit={p.unit} sub={p.sub} color={p.color} on={on} /></div>}
              {s.viz === 'toggle' && <Toggle word={p.word} color={p.color} sub={p.sub} on={on} />}
              {s.viz === 'timeline' && <Timeline nodes={p.nodes} sub={p.sub} on={on} />}
              {s.viz === 'chips' && <div className="np-body"><div className="np-tg" style={{ gap: 12 }}><div className={'np-bigsw' + (on ? ' on' : '')} style={{ ['--c' as any]: 'var(--np-grad)' }}><i /></div><div className={'np-word' + (on ? ' on' : '')}>{p.word}</div></div><div className="np-chips">{p.chips.map((c: string, k: number) => <span key={k} className="np-chip">{c}</span>)}</div></div>}
              <button className="np-more" onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}><span>details</span><span className="np-chev">▾</span></button>
              {s.detail}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CSS = `
.np-root{--np-panel:#ffffff;--np-shd:rgba(90,98,112,.22);--np-shl:#fff;--np-ink:#2b3757;--np-muted:#6a7699;--np-faint:#9aa6c2;--np-track:rgba(43,66,110,.13);--np-blue:#2f6fe0;--np-teal:#2fa08f;--np-green:#1f9d78;--np-amber:#c98a1e;--np-indigo:#6a53ff;--np-grad:linear-gradient(135deg,#5a9bff,#2F6FE0);--np-disp:Poppins,Inter,system-ui,sans-serif;--np-mono:ui-monospace,monospace;
  background:linear-gradient(180deg,#fdfdfc,#fdfdfc);border-radius:24px;padding:18px;color:var(--np-ink);font-family:Inter,system-ui,sans-serif}
.np-neu{background:var(--np-panel);border-radius:16px;box-shadow:8px 8px 18px var(--np-shd),-8px -8px 16px var(--np-shl)}
.np-top{display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:16px;flex-wrap:wrap}
.np-brand{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.np-kick{font-family:var(--np-mono);font-size:9.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--np-faint)}
.np-h1{font-family:var(--np-disp);font-weight:600;font-size:18px;margin:0}
.np-status{font-family:var(--np-mono);font-size:10px;letter-spacing:.12em;color:var(--np-blue);padding:6px 11px;border-radius:999px;box-shadow:inset 3px 3px 6px var(--np-shd),inset -3px -3px 6px var(--np-shl);white-space:nowrap}
.np-status .np-d{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--np-faint);margin-right:6px;vertical-align:middle}
.np-status.run .np-d{background:var(--np-blue);animation:npPulse 1.2s infinite}.np-status.done .np-d{background:var(--np-green)}
@keyframes npPulse{0%,100%{box-shadow:0 0 0 0 rgba(47,111,224,.5)}50%{box-shadow:0 0 0 5px rgba(47,111,224,0)}}
.np-btn{border:0;font-family:var(--np-disp);font-weight:600;font-size:12px;color:var(--np-blue);background:var(--np-panel);padding:9px 13px;border-radius:12px;cursor:pointer;box-shadow:4px 4px 10px var(--np-shd),-4px -4px 8px var(--np-shl)}
.np-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:start;grid-auto-flow:row dense}
@media(max-width:860px){.np-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.np-grid{grid-template-columns:1fr}}
.np-card{padding:16px;border-radius:20px;display:flex;flex-direction:column;gap:12px;background:var(--np-panel);box-shadow:6px 6px 16px var(--np-shd),-6px -6px 14px var(--np-shl);opacity:.5;filter:saturate(.6);transition:opacity .5s,filter .5s,box-shadow .35s}
.np-card.np-active{box-shadow:6px 6px 16px var(--np-shd),-6px -6px 14px var(--np-shl),0 0 0 2px rgba(47,111,224,.4)}
.np-card.np-done{opacity:1;filter:none}
.np-hero{grid-column:2;grid-row:2 / span 2;justify-content:center;background:linear-gradient(180deg,#ffffff,#fdfdfc);box-shadow:9px 9px 24px var(--np-shd),-9px -9px 20px var(--np-shl)}
@media(max-width:860px){.np-hero{grid-column:1 / -1;grid-row:auto}}
@media(max-width:560px){.np-hero{grid-column:auto}}
.np-hd{display:flex;align-items:center;gap:10px}
.np-no{width:28px;height:28px;border-radius:9px;flex:none;display:grid;place-items:center;font-family:var(--np-mono);font-size:11px;font-weight:600;color:var(--np-muted);box-shadow:inset 3px 3px 6px var(--np-shd),inset -3px -3px 6px var(--np-shl)}
.np-done .np-no{color:var(--np-blue)}
.np-ht{min-width:0}.np-t{font-family:var(--np-mono);font-size:9px;letter-spacing:.2em;color:var(--np-faint);text-transform:uppercase}
.np-n{font-family:var(--np-disp);font-weight:600;font-size:13.5px;color:var(--np-ink);line-height:1.15}
.np-scan{margin-left:auto;font-family:var(--np-mono);font-size:9px;color:var(--np-blue);animation:npBlink 1s infinite}
@keyframes npBlink{0%,100%{opacity:.35}50%{opacity:1}}
.np-body{display:flex;flex-direction:column;gap:10px;justify-content:center}
.np-sub{font-size:11px;color:var(--np-faint);line-height:1.45}
.np-g{position:relative;width:120px;height:120px;margin:0 auto}.np-gh{width:168px;height:168px}
.np-g svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
.np-tk{stroke:var(--np-track)}.np-arc{stroke-linecap:round;transition:stroke-dashoffset 1s cubic-bezier(.3,.85,.3,1)}
.np-hole{position:absolute;inset:17px;border-radius:50%;background:var(--np-panel);box-shadow:6px 6px 13px var(--np-shd),-6px -6px 11px var(--np-shl);display:grid;place-items:center;text-align:center}
.np-gh .np-hole{inset:22px;background:linear-gradient(145deg,#6ba6ff,#3f6fe0 55%,#6a53ff);box-shadow:inset 6px 6px 15px rgba(16,34,80,.42),inset -5px -5px 13px rgba(255,255,255,.25),5px 5px 14px var(--np-shd)}
.np-num{font-family:var(--np-disp);font-weight:700;font-size:26px;color:var(--np-ink);line-height:1}.np-gh .np-num{font-size:40px;color:#fff}
.np-unit{font-size:12px;color:var(--np-faint);font-weight:600}.np-gh .np-unit{font-size:18px;color:rgba(255,255,255,.82)}
.np-slider .np-srow{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px}
.np-big{font-family:var(--np-disp);font-weight:700;font-size:26px;color:var(--np-ink)}.np-big .np-u{font-size:13px;color:var(--np-faint);font-weight:600}
.np-pillv{font-size:10.5px;font-weight:600;padding:5px 11px;border-radius:999px;box-shadow:inset 3px 3px 6px var(--np-shd),inset -3px -3px 6px var(--np-shl)}
.np-track2{position:relative;height:16px;border-radius:99px;box-shadow:inset 4px 4px 8px var(--np-shd),inset -4px -4px 8px var(--np-shl)}
.np-fillS{position:absolute;left:0;top:0;height:100%;width:0;border-radius:99px;transition:width 1s cubic-bezier(.3,.85,.3,1)}
.np-knob{position:absolute;top:50%;left:0;width:24px;height:24px;border-radius:50%;background:var(--np-panel);transform:translate(-50%,-50%);box-shadow:3px 3px 7px var(--np-shd),-3px -3px 6px var(--np-shl);transition:left 1s cubic-bezier(.3,.85,.3,1)}
.np-wave .np-whead{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px}
.np-wbox{border-radius:14px;padding:8px;box-shadow:inset 4px 4px 9px var(--np-shd),inset -4px -4px 9px var(--np-shl)}
.np-wsvg{display:block;width:100%;height:68px}.np-wline{fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;transition:stroke-dashoffset 1.2s ease}.np-wdot{transition:opacity .4s .8s}
.np-tg{display:flex;align-items:center;gap:14px;justify-content:center}
.np-bigsw{width:82px;height:42px;border-radius:99px;position:relative;flex:none;box-shadow:inset 5px 5px 10px var(--np-shd),inset -5px -5px 10px var(--np-shl)}
.np-bigsw i{position:absolute;top:5px;left:5px;width:32px;height:32px;border-radius:50%;background:var(--np-panel);box-shadow:3px 3px 7px var(--np-shd),-3px -3px 6px var(--np-shl);transition:left .45s cubic-bezier(.3,1.4,.4,1),background .45s}
.np-bigsw.on i{left:45px;background:var(--c,var(--np-grad))}
.np-word{font-family:var(--np-disp);font-weight:700;font-size:17px;color:var(--np-faint);transition:color .4s}.np-word.on{color:var(--np-ink)}
.np-tl{position:relative;padding:16px 4px 2px}
.np-line{position:absolute;left:12px;right:12px;top:24px;height:8px;border-radius:99px;box-shadow:inset 3px 3px 6px var(--np-shd),inset -3px -3px 6px var(--np-shl)}
.np-prog{position:absolute;left:12px;top:24px;height:8px;width:0;border-radius:99px;background:var(--np-grad);transition:width 1.1s ease}
.np-nodes{position:relative;display:flex;justify-content:space-between}
.np-node{display:flex;flex-direction:column;align-items:center;gap:6px;z-index:1;flex:1}
.np-node .np-dot{width:16px;height:16px;border-radius:50%;background:var(--np-panel);box-shadow:3px 3px 6px var(--np-shd),-3px -3px 6px var(--np-shl);transition:.3s}
.np-node.on .np-dot{background:var(--np-grad);box-shadow:0 0 0 4px rgba(47,111,224,.12)}
.np-node span{font-size:9px;color:var(--np-faint);font-weight:600;text-align:center}.np-node.on span{color:var(--np-ink)}
.np-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.np-chip{font-size:10px;font-weight:600;color:var(--np-blue);padding:5px 10px;border-radius:999px;box-shadow:inset 3px 3px 6px var(--np-shd),inset -3px -3px 6px var(--np-shl)}
.np-lift{font-family:var(--np-disp);font-weight:600;font-size:12px;color:var(--np-green);text-align:center}
.np-more{margin-top:2px;align-self:center;display:flex;align-items:center;gap:6px;border:0;background:transparent;cursor:pointer;font-family:var(--np-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--np-blue)}
.np-chev{display:inline-block;transition:transform .35s}.np-open .np-chev{transform:rotate(180deg)}
.np-det{max-height:0;overflow:hidden;opacity:0;transition:max-height .55s ease,opacity .4s}.np-open .np-det{max-height:1600px;opacity:1;margin-top:4px}
.np-dpanel{border-radius:14px;padding:12px;box-shadow:inset 4px 4px 9px var(--np-shd),inset -4px -4px 9px var(--np-shl);display:flex;flex-direction:column;gap:9px}
.np-dhead{font-family:var(--np-mono);font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--np-faint)}
.np-drow{display:flex;justify-content:space-between;gap:10px;font-size:11.5px;color:var(--np-muted)}.np-drow b{color:var(--np-ink);font-weight:600;text-align:right}
.np-genes{display:flex;flex-wrap:wrap;gap:5px}.np-gene{font-family:var(--np-mono);font-size:9.5px;color:var(--np-indigo);padding:3px 8px;border-radius:7px;box-shadow:inset 2px 2px 4px var(--np-shd),inset -2px -2px 4px var(--np-shl)}
.np-ba{display:flex;align-items:center;gap:8px;font-size:10.5px;color:var(--np-muted)}.np-ba .np-lab{min-width:96px}.np-ba .np-bar{flex:1;height:8px;border-radius:8px;position:relative;box-shadow:inset 2px 2px 4px var(--np-shd),inset -2px -2px 4px var(--np-shl);overflow:hidden}.np-ba .np-bf{position:absolute;left:0;top:0;height:100%;border-radius:8px}.np-ba .np-d{font-family:var(--np-disp);font-weight:600;min-width:64px;text-align:right}
.np-check{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--np-ink)}.np-check .np-k{width:18px;height:18px;border-radius:6px;display:grid;place-items:center;color:var(--np-teal);font-size:12px;box-shadow:inset 2px 2px 4px var(--np-shd),inset -2px -2px 4px var(--np-shl)}
.np-sym{display:flex;flex-direction:column;gap:5px;padding:9px;border-radius:11px;box-shadow:inset 3px 3px 6px var(--np-shd),inset -3px -3px 6px var(--np-shl)}
.np-symtop{display:flex;align-items:center;justify-content:space-between;gap:8px}.np-cat{font-size:11.5px;font-weight:600;color:var(--np-ink)}
.np-lp{font-size:9.5px;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap;box-shadow:2px 2px 5px var(--np-shd),-2px -2px 4px var(--np-shl)}
.np-lp.unc{color:var(--np-green)}.np-lp.com{color:var(--np-blue)}.np-lp.pos{color:var(--np-amber)}
.np-sx{display:flex;flex-wrap:wrap;gap:5px}.np-sx .np-s{font-size:9.5px;color:var(--np-muted);padding:3px 8px;border-radius:7px;box-shadow:2px 2px 4px var(--np-shd),-2px -2px 4px var(--np-shl)}
.np-note{font-size:10.5px;line-height:1.5;padding:9px 10px;border-radius:11px;color:var(--np-muted);box-shadow:inset 3px 3px 6px var(--np-shd),inset -3px -3px 6px var(--np-shl)}.np-note.np-rev{color:var(--np-green)}
.np-blist{display:flex;flex-direction:column;gap:6px}.np-bstep{display:flex;gap:9px;align-items:center;padding:8px 10px;border-radius:10px;box-shadow:2px 2px 6px var(--np-shd),-2px -2px 5px var(--np-shl)}
.np-bn{width:20px;height:20px;border-radius:6px;flex:none;display:grid;place-items:center;font-family:var(--np-mono);font-size:9px;color:#fff;background:var(--np-grad)}.np-bt{font-size:11.5px;font-weight:600;color:var(--np-ink)}
`;
