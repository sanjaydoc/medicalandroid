import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { FullRun } from '../sim/full';
import { summarizeRun } from '../sim/full';
import { exportSimPdf } from '../sim/pdf';
import { projectRejuvenation, projectRegeneration, tumorSafety } from '../sim/pipeline';
import { immuneSafety } from '../sim/immune';
import { buildCellular } from '../sim/cell';
import type { CellularOutcome } from '../sim/cell';
import { modalityOf } from '../sim/catalog';
import { scoreFormulation } from '../sim/optimize';
import type { Optimization, StepIcon } from '../sim/optimize';
import type { Scorecard } from '../sim/scorecard';
import { streamChat, isChatConfigured } from '../api/chat';
import { buildSynthesisPrompt, synthCandidates, parseSynthesis, synthNarrative } from '../sim/synthesis';
import type { SynthResult } from '../sim/synthesis';

/* Animated simulator run rendered inside the chat / on the page.
   White neumorphic theme. The step list adapts to the therapy MODALITY:
   - reprogramming (Age-Rejuvenation): age reversal + OSK construct + tumorigenicity
   - cell therapy (everything else):   regeneration projection + IV exosome (no tumorigenicity) */

// ── white-neumorphic palette ──────────────────────────────────────────────
const C = {
  ink: '#2b3757', sub: '#6a7699', faint: '#98a4c2', line: 'rgba(43,66,110,.12)', track: '#fdfdfc',
  blue: '#2f6fe0', blueBright: '#4285f4', teal: '#4fa79b', cyan: '#3f74e6',
  green: '#1f9d78', red: '#e0574d', amber: '#c98a1e', purple: '#6a53ff',
  panel: '#ffffff', shd: 'rgba(90,98,112,.20)', shl: '#ffffff',
};

type Kind = 'sample' | 'ingest' | 'age' | 'reversal' | 'regeneration' | 'cellular' | 'construct' | 'exosome' | 'avatar' | 'tumor' | 'immune' | 'optimize' | 'synthesis';
const DEF: Record<Kind, { tag: string; title: string }> = {
  sample: { tag: 'SAMPLE', title: 'Sample & therapy' },
  ingest: { tag: 'SEQUENCE', title: 'Data ingest' },
  age: { tag: 'ANALYSE', title: 'Epigenetic age' },
  reversal: { tag: 'REVERSE', title: 'Reprogramming projection' },
  regeneration: { tag: 'REGEN', title: 'Regeneration projection' },
  cellular: { tag: 'CELL', title: 'Cellular outcome' },
  construct: { tag: 'VECTOR', title: 'OSK construct' },
  exosome: { tag: 'CARRIER', title: 'IV exosome carrier' },
  avatar: { tag: 'AVATAR', title: 'Safety pre-screen' },
  tumor: { tag: 'SAFETY', title: 'Tumorigenicity envelope' },
  immune: { tag: 'IMMUNE', title: 'Immune & adverse-event safety' },
  optimize: { tag: 'FORMULATE', title: 'Success-rate optimiser' },
  synthesis: { tag: 'DE NOVO', title: 'De Novo AI synthesis' },
};
function stepsFor(isReprog: boolean): Kind[] {
  return isReprog
    ? ['sample', 'ingest', 'age', 'reversal', 'cellular', 'construct', 'avatar', 'tumor', 'immune', 'optimize', 'synthesis']
    : ['sample', 'ingest', 'age', 'regeneration', 'cellular', 'exosome', 'avatar', 'immune', 'optimize', 'synthesis'];
}

const SCAN_MS = 780;
const prefersReduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// Immune symptom LIKELIHOOD (not severity) — top tier is a calm blue, never red.
const IMM_TIER_COLOR = (t: string) => (t === 'Uncommon' ? C.green : t === 'Common' ? C.blueBright : C.amber);

function useCountUp(target: number, active: boolean, ms = 800, decimals = 0) {
  const [v, setV] = useState(active ? target : 0);
  useEffect(() => {
    if (!active) return;
    if (prefersReduced) { setV(target); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms); const e = 1 - Math.pow(1 - p, 3);
      setV(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, ms]);
  return decimals ? v.toFixed(decimals) : Math.round(v).toString();
}

function Bar({ pct, color, height = 8 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{ height, background: C.track, borderRadius: 99, overflow: 'hidden', boxShadow: 'inset 2px 2px 4px rgba(90,98,112,.18), inset -2px -2px 4px #ffffff' }}>
      <div style={{ width: `${Math.max(2, Math.min(100, pct))}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .9s cubic-bezier(.2,.8,.2,1)' }} />
    </div>
  );
}

const stepBtn = { width: 26, height: 26, borderRadius: 99, border: 0, background: '#ffffff', color: C.blue, fontSize: 16, fontWeight: 700, cursor: 'pointer', lineHeight: '22px', boxShadow: '3px 3px 6px rgba(90,98,112,.20), -3px -3px 6px #ffffff' } as const;

// Raised neumorphic pill — soft blue-grey drop shadow + white highlight on the
// neumorphic ground so it reads as a lifted chip rather than a flat tag.
const neuPill = (fg: string, bg = '#ffffff', weight = 600): CSSProperties => ({
  display: 'inline-block', background: bg, color: fg, border: 0, borderRadius: 99,
  padding: '4px 12px', fontSize: 11.5, fontWeight: weight, lineHeight: 1.35,
  boxShadow: '3px 3px 7px rgba(90,98,112,.18), -3px -3px 6px #ffffff',
});
// Raised neumorphic panel for the two advisory boxes.
const neuBox = (bg: string): CSSProperties => ({
  background: bg, border: 0, borderRadius: 14, padding: '10px 12px',
  boxShadow: '5px 5px 13px rgba(90,98,112,.16), -4px -4px 10px #ffffff',
});

// Whole-pipeline safety-adjusted scorecard: shows the success number AFTER folding
// in tumorigenicity, immunogenicity & cellular outcome (the honest self-consistency
// fix), a per-step waterfall, a confidence meter, and the escalate gate. Rendered
// BELOW the existing optimiser UI — it adds to, never replaces, that view.
function ScorecardPanel({ sc }: { sc: Scorecard }) {
  const gateColor = sc.gate === 'proceed' ? C.green : sc.gate === 'review' ? C.amber : C.red;
  const confColor = sc.confidence_tier === 'High' ? C.green : sc.confidence_tier === 'Moderate' ? C.amber : C.red;
  const gateBg = sc.gate === 'proceed' ? '#eef8f3' : sc.gate === 'review' ? '#fdf6ea' : '#fdf1f0';
  return (
    <div style={{ marginTop: 14, borderRadius: 16, background: C.panel, padding: 14, boxShadow: '6px 6px 16px rgba(90,98,112,.16), -5px -5px 12px #ffffff' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: C.sub }}>OVERALL PROJECTED SUCCESS · SAFETY-ADJUSTED</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>{sc.overall_success}%</div>
          <div style={{ fontSize: 10.5, color: C.faint }}>
            formulation {sc.formulation_success}%{sc.safety_delta ? ` · safety ${sc.safety_delta > 0 ? '+' : ''}${sc.safety_delta} pts` : ''}
          </div>
        </div>
        <span style={neuPill('#ffffff', gateColor, 700)}>{sc.gate_label}</span>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em', color: C.sub }}>PER-STEP CONTRIBUTION</div>
        {sc.contributions.map((c) => {
          const pos = c.points >= 0;
          const mag = Math.min(100, Math.abs(c.points) * 3);
          return (
            <div key={c.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                <span style={{ color: C.ink }}>{c.label}</span>
                <span style={{ fontWeight: 700, color: pos ? C.green : C.red }}>{pos ? '+' : ''}{c.points} pts</span>
              </div>
              <Bar pct={mag} color={pos ? C.green : C.red} height={6} />
              {c.note && <div style={{ fontSize: 9.5, color: C.faint, marginTop: 2 }}>{c.note}</div>}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={neuBox('#f5f8fd')}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em', color: C.sub, marginBottom: 5 }}>CONFIDENCE</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: confColor }}>{Math.round(sc.confidence * 100)}%</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: confColor }}>{sc.confidence_tier}</span>
          </div>
          <div style={{ marginTop: 5 }}><Bar pct={Math.round(sc.confidence * 100)} color={confColor} height={6} /></div>
        </div>
        <div style={neuBox(gateBg)}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em', color: gateColor, marginBottom: 5 }}>DECISION GATE</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{sc.gate_label}</div>
          <div style={{ fontSize: 10, color: C.sub, marginTop: 3 }}>{sc.gate_reason}</div>
        </div>
      </div>

      {sc.flags.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {sc.flags.map((f) => <div key={f} style={{ fontSize: 10.5, color: C.red, marginBottom: 2 }}>⚠ {f}</div>)}
        </div>
      )}

      <div style={{ fontSize: 9.5, color: C.faint, marginTop: 10, fontStyle: 'italic' }}>{sc.disclaimer}</div>
    </div>
  );
}

function Stepper({ label, cycles, onStep, hint }: { label: string; cycles: number; onStep: (d: number) => void; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f3f7fd', border: '1px solid ' + C.line, borderRadius: 12, padding: '7px 10px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>{label}</span>
      <button aria-label="fewer" onClick={() => onStep(-1)} disabled={cycles <= 1} style={{ ...stepBtn, opacity: cycles <= 1 ? 0.4 : 1 }}>−</button>
      <span style={{ minWidth: 18, textAlign: 'center', fontSize: 15, fontWeight: 800, color: C.ink }}>{cycles}</span>
      <button aria-label="more" onClick={() => onStep(1)} disabled={cycles >= 10} style={{ ...stepBtn, opacity: cycles >= 10 ? 0.4 : 1 }}>+</button>
      {hint && <span style={{ fontSize: 10.5, color: C.sub, marginLeft: 4 }}>{hint}</span>}
    </div>
  );
}

function GeneMap({ vector }: { vector: any }) {
  const color = (nm: string) => {
    const s = nm.toLowerCase();
    if (s.includes('itr')) return '#94a3b8';
    if (/promoter|tre|efs|ef1|cmv/.test(s)) return C.blueBright;
    if (/oct4|sox2|klf4|rtta|cds|pou5f1/.test(s)) return '#22c55e';
    if (/p2a|t2a|peptide/.test(s)) return '#f59e0b';
    if (s.includes('polya')) return '#a78bfa';
    if (/kozak|start/.test(s)) return '#2dd4bf';
    if (s.includes('wpre')) return '#60a5fa';
    return '#64748b';
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.sub, marginBottom: 3 }}>
        <span style={{ fontWeight: 700, color: C.ink }}>{vector.name} · {vector.length_bp} bp</span>
        <span style={{ color: vector.fits_aav ? C.green : C.red, fontWeight: 700 }}>{vector.fits_aav ? '✓ fits AAV' : '✗ over limit'}</span>
      </div>
      <div style={{ display: 'flex', height: 16, borderRadius: 6, overflow: 'hidden', boxShadow: '2px 2px 6px rgba(21,58,124,.14)' }}>
        {vector.features.map((f: any, i: number) => (
          <div key={i} title={f.name} style={{ flex: Math.max(1, f.length), background: color(f.name), borderRight: '1px solid #ffffff' }} />
        ))}
      </div>
    </div>
  );
}

function ExosomeCard({ exo }: { exo: any }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        {/* vesicle motif */}
        <svg width="34" height="34" viewBox="0 0 34 34" style={{ flexShrink: 0, filter: 'drop-shadow(2px 2px 4px rgba(21,58,124,.2))' }}>
          <circle cx="17" cy="17" r="12" fill="none" stroke={C.blueBright} strokeWidth="2" />
          <circle cx="17" cy="17" r="12" fill="rgba(66,133,244,.10)" />
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const r = (a * Math.PI) / 180; return <circle key={a} cx={17 + 12 * Math.cos(r)} cy={17 + 12 * Math.sin(r)} r="2" fill={C.cyan} />;
          })}
          <circle cx="14" cy="15" r="2" fill="#22c55e" /><circle cx="20" cy="19" r="2" fill="#a78bfa" /><circle cx="18" cy="13" r="1.6" fill="#f59e0b" />
        </svg>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{exo.strategy}</div>
          <div style={{ fontSize: 10.5, color: C.sub }}>{exo.vesicle_size_nm} nm · {exo.route}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {[
          ['Cargo', exo.cargo],
          ['Targeting', `${exo.targeting.tissue} — ${exo.targeting.ligand}`],
          ['Source', exo.source_cell],
        ].map(([k, v]) => (
          <div key={k as string} style={{ display: 'flex', gap: 8, fontSize: 11.5 }}>
            <span style={{ minWidth: 64, color: C.sub, fontWeight: 700 }}>{k}</span>
            <span style={{ color: C.ink }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {exo.advantages.slice(0, 4).map((a: string) => (
          <span key={a} style={{ background: 'rgba(22,163,74,.10)', color: '#15803d', border: '1px solid rgba(22,163,74,.28)', borderRadius: 99, padding: '2px 8px', fontSize: 10 }}>✓ {a.split(' — ')[0]}</span>
        ))}
      </div>
    </div>
  );
}

// A stylised "cell field" — a cartoon driven by the pathway model's numbers,
// never a molecular rendering. Senescent fraction → grey enlarged cells; ROS →
// red membrane glow; SASP → orange inflammatory particles; stem → nucleus glow.
function CellScene({ label, e, tint }: { label: string; e: { sen: number; ros: number; sasp: number; stem: number }; tint: string }) {
  const N = 16;
  const nSen = Math.round((N * e.sen) / 100);
  const cols = 4;
  const cells = Array.from({ length: N }, (_, i) => {
    const cx = 20 + (i % cols) * 30 + ((Math.floor(i / cols) % 2) * 6);
    const cy = 22 + Math.floor(i / cols) * 28;
    return { cx, cy, sen: i < nSen };
  });
  const sasp = Math.round((e.sasp / 100) * 10);
  const glow = 0.15 + (e.ros / 100) * 0.5;
  return (
    <div style={{ flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.06em', color: tint, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
      <svg viewBox="0 0 140 130" width="100%" style={{ borderRadius: 12, background: 'radial-gradient(circle at 50% 45%, #fbfdff, #eef3fb)', boxShadow: 'inset 2px 2px 6px rgba(21,58,124,.10), inset -2px -2px 6px #ffffff' }}>
        {/* oxidative-stress membrane glow */}
        <circle cx="70" cy="62" r="60" fill="none" stroke={C.red} strokeWidth={2 + (e.ros / 100) * 4} opacity={glow} />
        {/* SASP inflammatory particles */}
        {Array.from({ length: sasp }, (_, i) => {
          const a = (i / Math.max(1, sasp)) * Math.PI * 2;
          const r = 44 + (i % 3) * 6;
          return <circle key={`p${i}`} cx={70 + r * Math.cos(a)} cy={62 + r * Math.sin(a)} r="1.8" fill={C.amber} opacity={0.75} />;
        })}
        {/* cell population */}
        {cells.map((c, i) => (
          <g key={i}>
            <circle cx={c.cx} cy={c.cy} r={c.sen ? 9 : 7} fill={c.sen ? '#c3ccdb' : 'rgba(66,133,244,.22)'} stroke={c.sen ? '#9aa6bb' : C.blueBright} strokeWidth="1.2" />
            {/* nucleus — brighter when more youthful/stem */}
            <circle cx={c.cx} cy={c.cy} r={c.sen ? 3 : 2.6} fill={c.sen ? '#8b97ad' : `rgba(13,132,120,${0.35 + (e.stem / 100) * 0.5})`} />
          </g>
        ))}
      </svg>
    </div>
  );
}

function CellularCard({ cel }: { cel: CellularOutcome }) {
  const u = cel.endpoint.untreated, tr = cel.endpoint.treated;
  const toneColor = (t: string) => (t === 'protective' ? '#15803d' : t === 'risk' ? C.red : C.sub);
  const toneBg = (t: string) => (t === 'protective' ? '#eefaf1' : t === 'risk' ? '#fdf4f4' : '#f1f6fd');
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <CellScene label="Untreated" e={u} tint={C.sub} />
        <CellScene label="With therapy" e={tr} tint={C.teal} />
      </div>
      {/* headline metric shifts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {cel.headline.map((m) => {
          const improved = m.better === 'up' ? m.delta > 0 : m.delta < 0;
          const arrow = m.delta === 0 ? '→' : m.delta > 0 ? '▲' : '▼';
          return (
            <div key={m.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: C.ink, fontWeight: 600 }}>{m.label}</span>
                <span style={{ fontWeight: 700, color: improved ? C.green : m.delta === 0 ? C.sub : C.amber }}>
                  {m.untreated}% <span style={{ color: C.faint }}>→</span> {m.treated}% <span style={{ fontSize: 10 }}>{arrow} {Math.abs(m.delta)}</span>
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <Bar pct={m.untreated} color="rgba(138,152,184,.5)" height={7} />
                <div style={{ position: 'absolute', inset: 0 }}><Bar pct={m.treated} color={improved ? `linear-gradient(90deg,${C.blueBright},${C.teal})` : C.amber} height={7} /></div>
              </div>
            </div>
          );
        })}
      </div>
      {/* variant panel */}
      <div style={neuBox('#f1f6fe')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', color: C.blue, marginBottom: 6 }}>
          <span style={{ display: 'inline-grid', placeItems: 'center', width: 15, height: 15, borderRadius: 99, background: '#e3edfe', color: C.blue, fontSize: 10 }}>🧬</span>
          GENOTYPE PANEL
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: cel.variant_source === 'curated' ? '#15803d' : C.amber, letterSpacing: 0 }}>
            {cel.variant_source === 'curated' ? 'demo panel' : 'illustrative — not called from your file'}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {cel.variants.map((v) => (
            <span key={v.gene} title={`${v.rsid} · ${v.note}`} style={{ ...neuPill(toneColor(v.tone), toneBg(v.tone), 700), fontSize: 10.5 }}>
              {v.gene} {v.genotype}
            </span>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: C.sub }}>Pathways: {cel.pathways.join(' · ')}</div>
      <div style={{ marginTop: 6, fontSize: 9.5, color: C.faint, fontStyle: 'italic' }}>{cel.disclaimer}</div>
    </div>
  );
}

// ── Success-rate optimiser: sci-fi live formulation console ────────────────
const SPIN = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];

function StepGlyph({ icon }: { icon: StepIcon }) {
  const p: Record<StepIcon, JSX.Element> = {
    dna: <><path d="M8 3c0 5 8 5 8 10s-8 5-8 10M16 3c0 5-8 5-8 10s8 5 8 10" /><path d="M9 7h6M8.4 11h7.2M8.4 14h7.2M9 18h6" /></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 0-1 1h-3" /><path d="M3 12h18" /></>,
    cells: <><circle cx="8" cy="9" r="3" /><circle cx="15" cy="13" r="3.5" /><circle cx="9" cy="16" r="2" /></>,
    route: <><circle cx="5" cy="6" r="2" /><circle cx="19" cy="18" r="2" /><path d="M7 6h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8" /></>,
    flask: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7.5 15h9" /></>,
    search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.3-4.3" /></>,
    optimize: <><path d="M4 18L10 11l4 4 6-8" /><path d="M16 7h4v4" /></>,
    assemble: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M12 3v9M12 12l8-4.5M12 12l-8-4.5" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px currentColor)' }}>
      {p[icon]}
    </svg>
  );
}

function ScoreGauge({ value, active }: { value: number; active: boolean }) {
  // value 0..1 ; sci-fi circular gauge with count-up
  const shown = useCountUp(Math.round(value * 100), active, 1100, 0);
  const R = 46, C0 = 2 * Math.PI * R;
  const frac = active ? value : 0;
  const col = value >= 0.75 ? '#22e0a1' : value >= 0.5 ? '#2f6fe0' : '#ffcf5c';
  return (
    <div style={{ position: 'relative', width: 120, height: 120, flex: '0 0 auto' }}>
      <svg viewBox="0 0 120 120" width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(120,160,220,.18)" strokeWidth="9" />
        <circle cx="60" cy="60" r={R} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C0} strokeDashoffset={C0 * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)', filter: `drop-shadow(0 0 6px ${col})` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 30, fontWeight: 800, color: col, lineHeight: 1, textShadow: `0 0 12px ${col}` }}>{shown}%</div>
        <div style={{ fontSize: 8.5, letterSpacing: '.18em', color: '#6a7699', marginTop: 3 }}>SUCCESS</div>
      </div>
    </div>
  );
}

function OptimizeConsole({ opt, instant }: { opt: Optimization; instant: boolean }) {
  const steps = opt.steps;
  const [shown, setShown] = useState(instant ? steps.length : 0);
  const [spin, setSpin] = useState(0);
  const done = shown >= steps.length;

  // stream steps
  useEffect(() => {
    if (instant) { setShown(steps.length); return; }
    if (shown >= steps.length) return;
    const t = window.setTimeout(() => setShown((s) => s + 1), shown === 0 ? 250 : 560);
    return () => clearTimeout(t);
  }, [shown, steps.length, instant]);
  // spinner frames
  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => setSpin((s) => (s + 1) % SPIN.length), 90);
    return () => clearInterval(id);
  }, [done]);

  // custom dropdowns (live recompute against the deterministic model)
  const [cs, setCs] = useState(opt.best.cellSource);
  const [rt, setRt] = useState(opt.best.route);
  const [pr, setPr] = useState(opt.best.protocol);
  const [hla, setHla] = useState(!!opt.best.hlaMatched);
  const custom = useMemo(() => scoreFormulation(opt.ctx, cs, rt, pr, hla), [opt.ctx, cs, rt, pr, hla]);
  const cpct = Math.round(custom.success * 100);

  const NEON = '#2f6fe0';
  const selStyle: CSSProperties = {
    background: '#fdfdfc', color: '#2b3757', border: '1px solid rgba(43,66,110,.12)', borderRadius: 8,
    padding: '6px 8px', fontSize: 11.5, fontFamily: 'ui-monospace,monospace', width: '100%', outline: 'none',
  };
  const labStyle: CSSProperties = { fontSize: 9, letterSpacing: '.14em', color: '#8797b8', marginBottom: 4, textTransform: 'uppercase' };

  return (
    <div style={{
      marginTop: 6, borderRadius: 14, overflow: 'hidden',
      background: '#ffffff',
      border: '1px solid rgba(43,66,110,.10)', boxShadow: '6px 6px 16px rgba(90,98,112,.18), -6px -6px 14px #ffffff',
    }}>
      {/* console header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid rgba(43,66,110,.10)', background: '#fdfdfc' }}>
        <span style={{ width: 9, height: 9, borderRadius: 99, background: '#ff5f57', boxShadow: '14px 0 0 #febc2e, 28px 0 0 #28c840' }} />
        <span style={{ marginLeft: 30, fontFamily: 'ui-monospace,monospace', fontSize: 11, letterSpacing: '.14em', color: NEON, textShadow: `0 0 8px ${NEON}` }}>
          DE&nbsp;NOVO&nbsp;FORMULATION&nbsp;ENGINE
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'ui-monospace,monospace', fontSize: 10, color: done ? '#28c840' : '#febc2e' }}>{done ? '● READY' : '● SYNTHESISING'}</span>
      </div>

      {/* streaming steps */}
      <div style={{ padding: '10px 12px', fontFamily: 'ui-monospace,monospace' }}>
        {steps.map((st, i) => {
          const stState = i < shown ? 'done' : i === shown ? 'run' : 'idle';
          if (stState === 'idle') return null;
          const tone = stState === 'done' ? '#1f9d78' : NEON;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '4px 0', opacity: stState === 'run' ? 1 : 0.92, animation: 'scp-fade .35s ease' }}>
              <span style={{ color: tone, marginTop: 1, display: 'inline-flex' }}><StepGlyph icon={st.icon} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: '#e6f1ff', letterSpacing: '.05em' }}>
                  {st.label}
                  {stState === 'run' && <span style={{ color: NEON, marginLeft: 6 }}>{SPIN[spin]}</span>}
                  {stState === 'done' && <span style={{ color: '#28c840', marginLeft: 6 }}>✓</span>}
                </div>
                {st.detail && (stState === 'done' || stState === 'run') && (
                  <div style={{ fontSize: 10, color: '#6a7699', marginTop: 1 }}>{st.detail}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* result panel */}
      {done && (
        <div style={{ padding: '4px 12px 14px', animation: 'scp-fade .5s ease' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid rgba(43,66,110,.10)', paddingTop: 12 }}>
            <ScoreGauge value={opt.best.success} active={done} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 9, letterSpacing: '.16em', color: '#8797b8' }}>NOVEL FORMULATION</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#2b3757', margin: '3px 0 6px' }}>{opt.best.product}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[opt.best.cellSourceLabel, ...(opt.best.cellSource === 'allogeneic' ? [opt.best.hla] : []), opt.best.route, opt.best.protocolLabel].map((x) => (
                  <span key={x} style={{ fontSize: 10.5, color: '#2f6fe0', background: '#ffffff', border: '1px solid rgba(43,66,110,.10)', borderRadius: 7, padding: '3px 8px' }}>{x}</span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#1f9d78', marginTop: 8 }}>
                ▲ +{opt.liftPts} pts vs baseline ({Math.round(opt.baseline.success * 100)}%) · ~{opt.best.weeks} wk prep
              </div>
            </div>
          </div>

          <div style={{ fontSize: 10.5, color: '#6a7699', marginTop: 10, lineHeight: 1.5 }}>⚖ {opt.tradeoff}</div>

          {/* custom dropdowns */}
          <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: '#fdfdfc', border: '1px solid rgba(43,66,110,.10)' }}>
            <div style={{ fontSize: 9.5, letterSpacing: '.14em', color: NEON, marginBottom: 8 }}>◈ CUSTOMISE FORMULATION</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>
              <div><div style={labStyle}>Cell source</div>
                <select value={cs} onChange={(e) => setCs(e.target.value)} style={selStyle}>
                  {opt.options.cellSources.map((s) => <option key={s.key} value={s.key} style={{ background: '#fdfdfc' }}>{s.label}</option>)}
                </select></div>
              <div><div style={labStyle}>Delivery route</div>
                <select value={rt} onChange={(e) => setRt(e.target.value)} style={selStyle}>
                  {opt.options.routes.map((r) => <option key={r} value={r} style={{ background: '#fdfdfc' }}>{r}</option>)}
                </select></div>
              <div><div style={labStyle}>Protocol</div>
                <select value={pr} onChange={(e) => setPr(e.target.value)} style={selStyle}>
                  {opt.options.protocols.map((p) => <option key={p.key} value={p.key} style={{ background: '#fdfdfc' }}>{p.label}</option>)}
                </select></div>
              <div><div style={labStyle}>HLA {cs !== 'allogeneic' && <span style={{ color: '#5f7194' }}>(allogeneic only)</span>}</div>
                <select value={hla ? 'matched' : 'mismatched'} disabled={cs !== 'allogeneic'} onChange={(e) => setHla(e.target.value === 'matched')} style={{ ...selStyle, opacity: cs === 'allogeneic' ? 1 : 0.45 }}>
                  {opt.options.hla.map((h) => <option key={h.key} value={h.key} style={{ background: '#fdfdfc' }}>{h.label}</option>)}
                </select></div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'rgba(120,160,220,.18)', overflow: 'hidden' }}>
                <div style={{ width: `${cpct}%`, height: '100%', background: cpct >= 75 ? '#22e0a1' : cpct >= 50 ? '#2f6fe0' : '#ffcf5c', borderRadius: 99, transition: 'width .5s', boxShadow: '0 0 6px rgba(47,111,224,.35)' }} />
              </div>
              <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 15, fontWeight: 800, color: cpct >= 75 ? '#22e0a1' : '#2b3757', minWidth: 44, textAlign: 'right' }}>{cpct}%</div>
            </div>
            <div style={{ fontSize: 9.5, color: '#8797b8', marginTop: 6 }}>~{custom.weeks} wk prep · {custom.notes[0]}</div>
          </div>

          <div style={{ fontSize: 9, color: '#8797b8', marginTop: 10, fontStyle: 'italic', lineHeight: 1.5 }}>{opt.disclaimer}</div>
        </div>
      )}
    </div>
  );
}

// ── De Novo AI Synthesis: dedicated final step. Streams a structured build
//    protocol from the existing Anthropic Worker, rendered as clickable cards
//    that deep-link to the real Protocol / Facility / Product pages. ──────────
function SynthesisPanel({ opt, onAiBrief }: { opt: Optimization; onAiBrief?: (t: string) => void }) {
  const configured = isChatConfigured();
  const [status, setStatus] = useState<'idle' | 'run' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<SynthResult | null>(null);
  const [raw, setRaw] = useState('');
  const [err, setErr] = useState('');
  const [spin, setSpin] = useState(0);
  const [phase, setPhase] = useState(0);
  const PHASES = ['Querying protocol registry', 'Mapping facility tier', 'Selecting products', 'Compiling build steps', 'Validating references'];

  useEffect(() => {
    if (status !== 'run') return;
    const s = window.setInterval(() => setSpin((x) => (x + 1) % SPIN.length), 90);
    const p = window.setInterval(() => setPhase((x) => Math.min(PHASES.length - 1, x + 1)), 900);
    return () => { clearInterval(s); clearInterval(p); };
  }, [status]);

  async function run() {
    if (status === 'run') return;
    setStatus('run'); setResult(null); setRaw(''); setErr(''); setPhase(0);
    try {
      const cand = synthCandidates(opt);
      const prompt = buildSynthesisPrompt(opt, cand);
      const full = await streamChat({ messages: [{ role: 'user', content: prompt }], mode: 'concise', onText: (t) => setRaw((r) => r + t) });
      const parsed = parseSynthesis(full);
      if (parsed) { setResult(parsed); onAiBrief?.(synthNarrative(parsed)); }
      else { onAiBrief?.(full.replace(/\*\*/g, '').replace(/^#{1,6}\s*/gm, '').trim()); }
      setStatus('done');
    } catch (e: any) {
      setErr(e?.message === 'NOT_CONFIGURED' ? 'AI endpoint not configured on this site.' : (e?.message || 'Synthesis failed — try again.'));
      setStatus('error');
    }
  }

  const CY = '#2f6fe0', VIO = '#c084fc', AMB = '#ffcf5c', GRN = '#34e0a1';
  const panel: CSSProperties = {
    marginTop: 6, borderRadius: 14, overflow: 'hidden',
    background: '#ffffff',
    border: '1px solid rgba(43,66,110,.10)', boxShadow: '6px 6px 16px rgba(90,98,112,.18), -6px -6px 14px #ffffff',
  };
  const head = (label: string, right: JSX.Element) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid rgba(43,66,110,.10)', background: '#fdfdfc' }}>
      <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, letterSpacing: '.16em', color: VIO, textShadow: `0 0 8px ${VIO}` }}>⧉ DE&nbsp;NOVO&nbsp;AI&nbsp;SYNTHESIS</span>
      <span style={{ marginLeft: 'auto', fontFamily: 'ui-monospace,monospace', fontSize: 10, color: right ? undefined : VIO }}>{right}</span>
      {void label}
    </div>
  );
  const cardLink = (href: string, accent: string, kicker: string, title: string, sub: string, i: number): JSX.Element => (
    <a key={href + title} href={href} className="synth-card" style={{
      display: 'block', textDecoration: 'none', animation: `scp-fade .4s ease both`, animationDelay: `${i * 60}ms`,
      background: 'linear-gradient(160deg,rgba(20,30,58,.92),rgba(12,20,44,.92))', border: `1px solid ${accent}66`,
      borderRadius: 11, padding: '9px 11px', boxShadow: `0 0 0 1px ${accent}22, 4px 4px 12px rgba(90,98,112,.14), -3px -3px 8px #ffffff`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 8.5, letterSpacing: '.14em', color: accent, textShadow: `0 0 6px ${accent}` }}>{kicker}</span>
        <span style={{ marginLeft: 'auto', color: accent, fontSize: 12 }}>↗</span>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#2b3757', margin: '2px 0 1px' }}>{title}</div>
      {sub && <div style={{ fontSize: 10, color: '#6a7699' }}>{sub}</div>}
    </a>
  );

  if (!configured) {
    return <div style={{ fontSize: 11.5, color: C.sub }}>De Novo AI synthesis is unavailable — the AI endpoint isn't configured on this site.</div>;
  }

  return (
    <div style={panel}>
      {head('', (
        <span style={{ color: status === 'done' ? GRN : status === 'error' ? '#ff8a8a' : status === 'run' ? VIO : '#6a7699' }}>
          {status === 'run' ? `${SPIN[spin]} synthesising` : status === 'done' ? '● complete' : status === 'error' ? '● error' : '● standby'}
        </span>
      ))}

      <div style={{ padding: '12px' }}>
        {status === 'idle' && (
          <button onClick={run} style={{
            width: '100%', cursor: 'pointer', fontFamily: 'ui-monospace,monospace', fontSize: 12.5, letterSpacing: '.1em',
            color: '#10152a', fontWeight: 800, border: 0, borderRadius: 11, padding: '13px 12px',
            background: 'linear-gradient(90deg,#7dd3fc,#c084fc)', boxShadow: '0 0 22px rgba(147,197,253,.55)',
          }}>✦ GENERATE BUILD PROTOCOL WITH AI</button>
        )}

        {status === 'run' && (
          <div style={{ fontFamily: 'ui-monospace,monospace', padding: '4px 2px' }}>
            {PHASES.map((ph, i) => (
              <div key={ph} style={{ display: i <= phase ? 'flex' : 'none', alignItems: 'center', gap: 8, padding: '4px 0', color: i < phase ? GRN : CY }}>
                <span style={{ width: 14 }}>{i < phase ? '✓' : SPIN[spin]}</span>
                <span style={{ fontSize: 11.5, color: '#6a7699' }}>{ph}{i === phase ? '…' : ''}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, height: 3, borderRadius: 99, background: 'rgba(120,160,220,.16)', overflow: 'hidden' }}>
              <div style={{ width: `${((phase + 1) / PHASES.length) * 100}%`, height: '100%', background: `linear-gradient(90deg,${CY},${VIO})`, transition: 'width .8s', boxShadow: `0 0 8px ${VIO}` }} />
            </div>
          </div>
        )}

        {status === 'error' && (
          <div style={{ fontSize: 11.5, color: '#ff9d9d' }}>{err} <button onClick={run} style={{ marginLeft: 8, color: VIO, background: 'none', border: 0, cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}>retry</button></div>
        )}

        {status === 'done' && result && (
          <div>
            <div style={{ fontSize: 12.5, color: '#eadcff', lineHeight: 1.5, marginBottom: 10 }}>{result.summary}</div>

            {/* facility + products row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
              {result.facility && cardLink(`#/protocols/facility/${result.facility.n}`, AMB, `FACILITY · LEVEL ${result.facility.n}`, result.facility.name, result.facility.tagline || '', 0)}
              {result.products.map((p, i) => cardLink(`#/products`, GRN, 'PRODUCT REQUIRED', p.name.split(' (')[0], `${p.category || ''}${p.status ? ' · ' + p.status : ''}`, i + 1))}
            </div>

            {/* build steps */}
            <div style={{ fontSize: 9.5, letterSpacing: '.16em', color: CY, margin: '14px 0 8px' }}>◈ BUILD PROTOCOL</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.steps.map((s, i) => {
                const inner = (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, color: CY, textShadow: `0 0 6px ${CY}` }}>{String(i + 1).padStart(2, '0')}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#2b3757' }}>{s.title}</span>
                      {s.protocol && <span style={{ marginLeft: 'auto', fontFamily: 'ui-monospace,monospace', fontSize: 10, color: CY, border: `1px solid ${CY}66`, borderRadius: 6, padding: '1px 6px' }}>{s.protocol.code} ↗</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#b9cbe8', lineHeight: 1.5, marginTop: 4 }}>{s.instruction}</div>
                    {s.protocol && <div style={{ fontSize: 9.5, color: '#6a7699', marginTop: 4 }}>{s.protocol.name}{s.protocol.route ? ` · ${s.protocol.route}` : ''}</div>}
                  </>
                );
                const style: CSSProperties = {
                  display: 'block', textDecoration: 'none', animation: 'scp-fade .4s ease both', animationDelay: `${i * 70}ms`,
                  background: 'linear-gradient(160deg,rgba(18,28,56,.9),rgba(11,18,40,.9))', border: `1px solid ${s.protocol ? CY + '55' : 'rgba(120,150,210,.22)'}`,
                  borderRadius: 11, padding: '10px 12px', boxShadow: '4px 4px 12px rgba(90,98,112,.14), -3px -3px 8px #ffffff',
                };
                return s.protocol
                  ? <a key={i} href={`#/protocols/${encodeURIComponent(s.protocol.code)}`} className="synth-card" style={style}>{inner}</a>
                  : <div key={i} style={style}>{inner}</div>;
              })}
            </div>

            <div style={{ fontSize: 9, color: '#8797b8', marginTop: 12, fontStyle: 'italic', lineHeight: 1.5 }}>
              Illustrative AI-generated build protocol — steps link to StemCells Protocol standards; not a validated therapy or clinical success rate.
            </div>
            <button onClick={run} style={{ marginTop: 8, fontFamily: 'ui-monospace,monospace', fontSize: 10.5, color: VIO, background: 'none', border: `1px solid ${VIO}55`, borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>↻ regenerate</button>
          </div>
        )}

        {status === 'done' && !result && (
          <div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 11.5, lineHeight: 1.55, color: '#eadcff', fontFamily: 'ui-monospace,monospace' }}>{raw.replace(/\*\*/g, '').replace(/^#{1,6}\s*/gm, '').trim()}</div>
            <div style={{ fontSize: 9, color: '#8797b8', marginTop: 10, fontStyle: 'italic' }}>Illustrative AI-generated hypothesis — not a validated therapy or clinical success rate.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({ kind, num, run, rej, regen, t, im, cel, cycles, cycleLabel, onStep, active, revealed, instant, onAiBrief }: {
  kind: Kind; num: number; run: FullRun; rej: any; regen: any; t: any; im: any; cel: CellularOutcome; cycles: number; cycleLabel: string; onStep: (d: number) => void; active: boolean; revealed: boolean; instant?: boolean; onAiBrief?: (t: string) => void;
}) {
  const s = DEF[kind];
  const ea = run.epigenetic_age;
  const dnam = useCountUp(ea.dnam_age, active && kind === 'age', 900, 1);
  const cov = useCountUp(run.coverage_pct, active && kind === 'ingest', 700);
  const state = revealed ? 'revealed' : active ? 'scanning' : 'pending';
  const tierColor = t.risk_tier === 'Low' ? C.green : t.risk_tier === 'High' ? C.red : C.amber;
  const risk = Math.round(t.estimated_risk * 100);
  const isReprog = run.modality === 'reprogramming';

  return (
    <div style={{
      opacity: state === 'pending' ? 0.55 : 1,
      transform: state === 'revealed' ? 'none' : 'translateY(6px)',
      transition: 'opacity .5s, transform .5s, box-shadow .3s',
      background: C.panel, borderRadius: 18, padding: '14px 16px', marginBottom: 12, position: 'relative',
      boxShadow: active
        ? `6px 6px 16px ${C.shd}, -6px -6px 14px ${C.shl}, 0 0 0 2px rgba(66,133,244,.35)`
        : `6px 6px 16px ${C.shd}, -6px -6px 14px ${C.shl}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: revealed ? 12 : 0 }}>
        <span style={{ width: 30, height: 30, borderRadius: 10, display: 'grid', placeItems: 'center', flex: 'none',
          fontFamily: 'ui-monospace,monospace', fontSize: 12, fontWeight: 700,
          color: revealed ? C.blue : active ? C.cyan : C.faint,
          boxShadow: `inset 3px 3px 6px ${C.shd}, inset -3px -3px 6px ${C.shl}` }}>{String(num).padStart(2, '0')}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 9.5, letterSpacing: '.2em', color: active ? C.cyan : C.faint }}>{s.tag}</div>
          <div style={{ fontFamily: 'Poppins, Inter, sans-serif', fontSize: 14, fontWeight: 600, color: C.ink }}>{s.title}</div>
        </div>
        {active && !revealed && <span className="scp-scan" style={{ fontSize: 10, color: C.cyan, fontFamily: 'ui-monospace,monospace' }}>scanning…</span>}
      </div>

      {revealed && (
        <div style={{ fontSize: 12.5, color: C.ink }}>
          {kind === 'sample' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[run.disease.name, run.disease.tissue, isReprog ? `capsid ${run.disease.capsid.toUpperCase()}` : 'IV exosome', run.disease.route].map((x) => (
                <span key={x} style={neuPill(C.blue)}>{x}</span>
              ))}
              <span style={neuPill(isReprog ? C.purple : '#15803d', isReprog ? '#f5f1fe' : '#eefaf1', 700)}>
                {isReprog ? 'Reprogramming (OSK)' : 'Cell / regenerative therapy'}
              </span>
            </div>
          )}
          {kind === 'ingest' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: C.sub }}>Clock CpGs mapped ({ea.clock})</span>
                <span style={{ fontWeight: 700, color: C.blue }}>{ea.n_used}/{ea.n_total} · {cov}%</span>
              </div>
              <Bar pct={run.coverage_pct} color={`linear-gradient(90deg,${C.blueBright},${C.teal})`} />
            </div>
          )}
          {kind === 'age' && (
            <div>
              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: 30, fontWeight: 800, color: C.ink, lineHeight: 1 }}>{dnam}<span style={{ fontSize: 13, color: C.sub }}> yr</span></div><div style={{ fontSize: 10.5, color: C.sub, marginTop: 3 }}>BIOLOGICAL (DNAm) AGE</div></div>
                {ea.age_acceleration != null && <div><div style={{ fontSize: 22, fontWeight: 800, color: ea.age_acceleration >= 0 ? C.red : C.green, lineHeight: 1 }}>{ea.age_acceleration >= 0 ? '+' : ''}{ea.age_acceleration}</div><div style={{ fontSize: 10.5, color: C.sub, marginTop: 3 }}>ACCELERATION (yr)</div></div>}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: C.sub }}>Top drivers: {run.targets.slice(0, 5).map((x: any) => x.gene || x.cpg).join(' · ')}</div>
              {ea.clocks && ea.clocks.length > 1 && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: '#f6f9fe', border: '1px solid ' + C.line, borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: C.sub }}>MULTI-CLOCK CROSS-CHECK</span>
                    {ea.consensus_age != null && <span style={{ marginLeft: 'auto', fontSize: 11, color: C.sub }}>consensus <b style={{ color: C.ink }}>{ea.consensus_age} yr</b></span>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ea.clocks.map((c: any) => (
                      <span key={c.clock} title={`${c.label} · ${c.n_used}/${c.n_total} CpGs (${Math.round(c.coverage * 100)}%)`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, padding: '4px 9px', borderRadius: 8,
                          background: c.validated ? '#eef4ff' : '#fff', border: '1px solid ' + (c.validated ? 'rgba(66,133,244,.35)' : C.line), color: C.ink }}>
                        <b style={{ color: c.validated ? C.blue : C.ink }}>{c.label.split(' (')[0].replace(' · validated', '')}</b>
                        <span style={{ fontWeight: 700 }}>{c.dnam_age} yr</span>
                        {c.validated && <span style={{ fontSize: 9, color: C.blue, fontWeight: 700 }}>✓ validated</span>}
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 10, color: C.faint }}>Only Horvath is benchmark-validated (r=0.918 on GSE40279); Hannum &amp; PhenoAge are illustrative cross-checks.</div>
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <Stepper label={cycleLabel} cycles={cycles} onStep={onStep}
                  hint={isReprog
                    ? `${ea.dnam_age} → ${rej.projected_age} yr after ${cycles} (−${rej.years_reversed} yr)`
                    : `tissue-repair ${regen.regeneration_index}% after ${cycles} dose${cycles > 1 ? 's' : ''}`} />
              </div>
            </div>
          )}
          {kind === 'reversal' && (
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><div style={{ fontSize: 24, fontWeight: 800, color: C.green, lineHeight: 1 }}>−{rej.years_reversed} yr</div><div style={{ fontSize: 10.5, color: C.sub, marginTop: 3 }}>AGE REVERSAL ({rej.cycles} cycle{rej.cycles > 1 ? 's' : ''})</div></div>
              <div><div style={{ fontSize: 24, fontWeight: 800, color: C.teal, lineHeight: 1 }}>{rej.tissue_rejuvenation_index}%</div><div style={{ fontSize: 10.5, color: C.sub, marginTop: 3 }}>TISSUE REJUVENATION</div></div>
              <div style={{ fontSize: 12, color: C.sub }}>{ea.dnam_age} → <b style={{ color: C.ink }}>{rej.projected_age} yr</b></div>
            </div>
          )}
          {kind === 'regeneration' && (
            <div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
                <div><div style={{ fontSize: 28, fontWeight: 800, color: C.green, lineHeight: 1 }}>{regen.regeneration_index}%</div><div style={{ fontSize: 10.5, color: C.sub, marginTop: 3 }}>TISSUE-REPAIR INDEX ({regen.doses} dose{regen.doses > 1 ? 's' : ''})</div></div>
                <div style={{ fontSize: 12, color: C.sub }}>target: <b style={{ color: C.ink }}>{run.disease.tissue}</b></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 54, borderBottom: '1px solid ' + C.line, paddingBottom: 2, marginBottom: 8 }}>
                {regen.per_dose.map((d: any) => (
                  <div key={d.dose} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <span style={{ fontSize: 9, color: C.sub }}>{d.repaired}%</span>
                    <div style={{ width: '70%', height: `${Math.max(4, d.repaired)}%`, background: d.dose === cycles ? C.green : 'rgba(22,163,74,.4)', borderRadius: '3px 3px 0 0', transition: 'height .8s' }} />
                    <span style={{ fontSize: 9, color: C.faint, marginTop: 2 }}>{d.dose}</span>
                  </div>
                ))}
              </div>
              <Stepper label={cycleLabel} cycles={cycles} onStep={onStep} hint="repair compounds with diminishing returns" />
            </div>
          )}
          {kind === 'cellular' && cel && <CellularCard cel={cel} />}
          {kind === 'construct' && run.construct && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: C.sub }}>{run.construct.strategy} · {run.construct.capsid_desc}</div>
              {run.construct.vectors.map((v: any, k: number) => <GeneMap key={k} vector={v} />)}
            </div>
          )}
          {kind === 'exosome' && run.exosome && <ExosomeCard exo={run.exosome} />}
          {kind === 'avatar' && (
            <div>
              {[['Without avatar', run.safety.projected_success_without, C.faint], ['With avatar pre-screen', run.safety.projected_success_with, C.green]].map(([lab, pct, col]) => (
                <div key={lab as string} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}><span style={{ color: C.sub }}>{lab}</span><span style={{ fontWeight: 700, color: col as string }}>{pct}%</span></div>
                  <Bar pct={pct as number} color={col as string} height={9} />
                </div>
              ))}
            </div>
          )}
          {kind === 'tumor' && (
            <div>
              <div style={{ marginBottom: 10 }}>
                <Stepper label={cycleLabel} cycles={cycles} onStep={onStep} hint="step up to watch over-induction risk climb" />
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
                <div><div style={{ fontSize: 22, fontWeight: 800, color: tierColor, lineHeight: 1 }}>{t.risk_tier}</div><div style={{ fontSize: 10, color: C.sub }}>RISK TIER</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 800, color: tierColor, lineHeight: 1 }}>{risk}%</div><div style={{ fontSize: 10, color: C.sub }}>@ {t.requested_cycles} CYCLE</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 800, color: C.blue, lineHeight: 1 }}>{t.max_safe_cycles}</div><div style={{ fontSize: 10, color: C.sub }}>MAX SAFE</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 800, color: C.blue, lineHeight: 1 }}>{t.tissue_proliferation_factor}×</div><div style={{ fontSize: 10, color: C.sub }}>{String(t.tissue_key).toUpperCase()}</div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60, borderBottom: '1px solid ' + C.line, paddingBottom: 2 }}>
                {t.risk_curve.map((c: any) => {
                  const over = c.risk > (t.risk_threshold || 0.15);
                  return (
                    <div key={c.cycles} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                      <span style={{ fontSize: 9, color: C.sub }}>{Math.round(c.risk * 100)}%</span>
                      <div style={{ width: '70%', height: `${Math.min(100, c.risk * 100 / 0.6 * 100)}%`, background: c.cycles === t.requested_cycles ? tierColor : over ? 'rgba(220,38,38,.45)' : 'rgba(66,133,244,.4)', borderRadius: '3px 3px 0 0', transition: 'height .8s' }} />
                      <span style={{ fontSize: 9, color: C.faint, marginTop: 2 }}>{c.cycles}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: C.faint, marginTop: 4 }}>Green ≤ {Math.round((t.risk_threshold || 0.15) * 100)}% · red &gt; threshold · cycles →</div>
            </div>
          )}
          {kind === 'immune' && im && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: IMM_TIER_COLOR(im.overall_tier), lineHeight: 1 }}>{im.overall_tier}</div>
                  <div style={{ fontSize: 10, color: C.sub }}>SYMPTOM OUTLOOK · usually mild</div>
                </div>
                {im.comorbidities?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginLeft: 4 }}>
                    {im.comorbidities.map((c: string) => (
                      <span key={c} style={neuPill('#b45309', '#fdf5ea', 700)}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {im.classes.map((c: any) => (
                  <div key={c.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: C.ink, fontWeight: 600 }}>{c.label}</span>
                      <span style={{ fontWeight: 700, color: IMM_TIER_COLOR(c.tier) }}>{c.tier}</span>
                    </div>
                    <Bar pct={Math.round(c.index * 100)} color={IMM_TIER_COLOR(c.tier)} height={7} />
                    <div style={{ fontSize: 10, color: C.sub, marginTop: 3 }}>{c.symptoms.slice(0, 4).join(' · ')}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                <div style={neuBox('#fdf4f4')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', color: '#b91c1c', marginBottom: 5 }}>
                    <span style={{ display: 'inline-grid', placeItems: 'center', width: 15, height: 15, borderRadius: 99, background: '#fde8e8', color: '#b91c1c', fontSize: 10, boxShadow: 'inset 1px 1px 2px rgba(185,28,28,.18), -1px -1px 2px #ffffff' }}>👁</span>
                    WHAT THIS CAN'T SEE
                  </div>
                  {im.cant_see.slice(0, 3).map((x: string) => <div key={x} style={{ fontSize: 10, color: C.ink, marginBottom: 2 }}>✗ {x}</div>)}
                </div>
                <div style={neuBox('#f1f6fe')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', color: C.blue, marginBottom: 5 }}>
                    <span style={{ display: 'inline-grid', placeItems: 'center', width: 15, height: 15, borderRadius: 99, background: '#e3edfe', color: C.blue, fontSize: 10, boxShadow: 'inset 1px 1px 2px rgba(47,111,224,.2), -1px -1px 2px #ffffff' }}>✓</span>
                    ASK YOUR CLINICIAN FOR
                  </div>
                  {im.tests_to_ask.slice(0, 3).map((x: string) => <div key={x} style={{ fontSize: 10, color: C.ink, marginBottom: 2 }}>• {x}</div>)}
                </div>
              </div>
              {im.modifiable?.length > 0 && <div style={{ marginTop: 8, fontSize: 10.5, color: '#15803d' }}>↺ {im.modifiable[0]}</div>}
              <div style={{ fontSize: 9.5, color: C.faint, marginTop: 8, fontStyle: 'italic' }}>Relative, probabilistic — not a yes/no verdict. Informs the conversation with your clinician.</div>
            </div>
          )}
          {kind === 'optimize' && run.optimization && (
            <>
              <OptimizeConsole opt={run.optimization} instant={!!instant} />
              {run.scorecard && <ScorecardPanel sc={run.scorecard} />}
            </>
          )}
          {kind === 'optimize' && !run.optimization && (
            <div style={{ fontSize: 11.5, color: C.sub }}>Success-rate optimiser unavailable for this run.</div>
          )}
          {kind === 'synthesis' && run.optimization && (
            <SynthesisPanel opt={run.optimization} onAiBrief={onAiBrief} />
          )}
          {kind === 'synthesis' && !run.optimization && (
            <div style={{ fontSize: 11.5, color: C.sub }}>Run the simulator to enable De Novo synthesis.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SimRun({ run, onExplain, instant, onDone }: { run: FullRun; onExplain?: (summary: string) => void; instant?: boolean; onDone?: () => void }) {
  const modality = run.modality || modalityOf(run.disease?.department || '');
  const isReprog = modality === 'reprogramming';
  const steps = useMemo(() => stepsFor(isReprog), [isReprog]);
  const cycleLabel = isReprog ? 'Reprogramming cycles' : 'Stem-cell therapy cycles';

  const skip = prefersReduced || !!instant;
  const [revealed, setRevealed] = useState(skip ? steps.length : 0);
  const [active, setActive] = useState(skip ? -1 : 0);
  const [done, setDone] = useState(skip);
  const [aiBrief, setAiBrief] = useState('');
  const timers = useRef<number[]>([]);

  const ea = run.epigenetic_age;
  const tk = run.tissue_key || run.rejuvenation?.tissue_key || run.tumor?.tissue_key || 'systemic';
  const [cycles, setCycles] = useState<number>(run.rejuvenation?.cycles || run.regeneration?.doses || 1);
  const rej = useMemo(() => projectRejuvenation(ea.dnam_age, ea.coverage, tk, cycles), [cycles, ea.dnam_age, ea.coverage, tk]);
  const regen = useMemo(() => projectRegeneration(tk, ea.coverage, cycles), [cycles, ea.coverage, tk]);
  const tumor = useMemo(() => tumorSafety({
    dnamAge: ea.dnam_age, ageAcceleration: ea.age_acceleration, coverage: ea.coverage,
    youthSetpoint: rej.youth_setpoint, efficiency: rej.efficiency, tissueKey: tk, cycles,
  }), [cycles, rej, ea, tk]);
  const immune = useMemo(() => immuneSafety({
    tissueKey: tk, department: run.disease?.department, ageAcceleration: ea.age_acceleration,
    coverage: ea.coverage, cycles, comorbidities: run.comorbidities || [],
  }), [cycles, ea, tk, run.disease, run.comorbidities]);
  const cellular = useMemo(() => buildCellular({
    modality, tissueKey: tk, sample: run.sample,
    dnamAge: ea.dnam_age, ageAccel: ea.age_acceleration, coverage: ea.coverage,
    rejuvenationIndex: rej.tissue_rejuvenation_index, regenerationIndex: regen.regeneration_index,
    cycles, drivers: (run.targets || []).map((x: any) => x.gene || x.cpg),
  }), [modality, tk, run.sample, ea, rej, regen, cycles, run.targets]);
  const stepCycles = (d: number) => setCycles((c) => Math.max(1, Math.min(10, c + d)));

  useEffect(() => {
    if (skip) { onDone?.(); return; }
    let i = 0;
    const step = () => {
      if (i >= steps.length) { setActive(-1); setDone(true); onDone?.(); return; }
      setActive(i);
      timers.current.push(window.setTimeout(() => {
        setRevealed(i + 1); i += 1;
        timers.current.push(window.setTimeout(step, 420));
      }, SCAN_MS));
    };
    step();
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, []);

  const pdf = () => {
    exportSimPdf({
      disease: run.disease, modality, sample: run.sample, chronological_age: run.chronological_age,
      epigenetic_age: run.epigenetic_age, targets: run.targets, rejuvenation: rej, regeneration: regen,
      construct: run.construct, exosome: run.exosome, safety: run.safety,
      tumor: isReprog ? tumor : undefined, immune, cellular,
      optimization: run.optimization, aiBrief: aiBrief || undefined,
    }, `StemCells-Simulator-${run.sample}.pdf`);
  };

  return (
    <div style={{
      background: 'linear-gradient(180deg,#fdfdfc,#fdfdfc)',
      borderRadius: 24, padding: 18, color: C.ink,
      boxShadow: '9px 9px 22px rgba(90,98,112,.20), -9px -9px 18px #ffffff', fontFamily: 'inherit',
    }}>
      <style>{`
        @keyframes scpScan{0%,100%{opacity:.4}50%{opacity:1}}
        .scp-scan{animation:scpScan 1s ease-in-out infinite}
        @keyframes scpPulse{0%,100%{box-shadow:0 0 0 0 rgba(66,133,244,.35)}50%{box-shadow:0 0 0 6px rgba(66,133,244,0)}}
        @keyframes scp-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .synth-card{transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease}
        .synth-card:hover{transform:translateY(-2px);box-shadow:6px 6px 18px rgba(90,98,112,.20), -5px -5px 12px #ffffff;border-color:rgba(66,133,244,.55)!important}
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: done ? C.green : C.blueBright, animation: done ? 'none' : 'scpPulse 1.4s infinite' }} />
        <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, letterSpacing: '.16em', color: C.sub }}>
          {done ? 'RUN COMPLETE' : 'PROTOCOL SIMULATOR · RUNNING'}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'ui-monospace,monospace', fontSize: 11, color: C.blue }}>{Math.min(revealed, steps.length)}/{steps.length}</span>
      </div>

      <div>
        {steps.map((kind, i) => (
          <StepCard key={kind} kind={kind} num={i + 1} run={run} rej={rej} regen={regen} t={tumor} im={immune} cel={cellular}
            cycles={cycles} cycleLabel={cycleLabel} onStep={stepCycles} active={active === i} revealed={i < revealed} instant={skip} onAiBrief={setAiBrief} />
        ))}
      </div>

      {done && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(43,66,110,.12)' }}>
          <button onClick={pdf} style={{ background: `linear-gradient(90deg,${C.blueBright},${C.teal})`, color: '#fff', fontWeight: 700, border: 0, borderRadius: 12, padding: '9px 15px', fontSize: 12.5, cursor: 'pointer', boxShadow: '4px 4px 12px rgba(47,111,224,.4)' }}>⬇ Export PDF</button>
          {onExplain && <button onClick={() => onExplain(summarizeRun({ ...run, rejuvenation: rej, regeneration: regen, tumor, immune, cellular }))} style={{ background: '#ffffff', color: C.blue, border: 0, borderRadius: 12, padding: '9px 15px', fontSize: 12.5, cursor: 'pointer', boxShadow: '4px 4px 10px rgba(90,98,112,.18), -4px -4px 8px #ffffff' }}>💬 Explain in plain language</button>}
        </div>
      )}
      <div style={{ fontSize: 10, color: C.faint, marginTop: 10 }}>Research / illustrative — computed on your device. Not medical advice.</div>
    </div>
  );
}
