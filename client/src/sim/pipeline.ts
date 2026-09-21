// Browser-side Simulator pipeline — a faithful TypeScript port of the local
// Python backend's *deterministic* core (Horvath 2013 clock, target discovery,
// reprogramming projection, tumorigenicity safety envelope). It runs entirely
// in the browser: the methylation file never leaves the device.
//
// Parity target: the local FastAPI backend (app/epiage, app/api/routes.py).
// Not ported here (needs the local backend): batch case/control, OSK construct
// assembly, and Track-B ML molecule generation.

import COEFFS from './horvath-coeffs.json';
import COORDS from './clock-coords-hg38.json';
import HANNUM from './hannum-coeffs.json';
import LEVINE from './levine-coeffs.json';

// ---- constants (mirror app/api/routes.py) ---------------------------------
const ADULT_AGE = (COEFFS as any).adultAge ?? 20;
const YOUTH_SETPOINT = 20.0;
const REPROG_EFFICIENCY = 0.35;
const TISSUE_EFFICIENCY: Record<string, number> = {
  retina: 0.45, cns: 0.42, skin: 0.44, liver: 0.40, gut: 0.38,
  kidney: 0.36, systemic: 0.35, pancreas: 0.35, lung: 0.34,
  immune: 0.33, bone: 0.33, heart: 0.32, joint: 0.30,
};
const TISSUE_PROLIF: Record<string, number> = {
  retina: 0.5, cns: 0.55, heart: 0.6, muscle: 0.7, kidney: 0.85,
  liver: 1.0, lung: 1.0, skin: 1.2, gut: 1.3, blood: 1.4,
  systemic: 1.0, generic: 1.0,
};
const OSK_GENES: Record<string, string> = { POU5F1: 'OCT4', SOX2: 'SOX2', KLF4: 'KLF4' };

interface Site { cpg: string; coef: number; gene: string | null; chrom: string | null; }
const SITES: Site[] = (COEFFS as any).sites;
const INTERCEPT: number = (COEFFS as any).intercept;
const BY_CPG: Record<string, Site> = Object.fromEntries(SITES.map((s) => [s.cpg, s]));
// Union of every clock's CpGs, so array-beta parsing retains the sites all
// three clocks need (Horvath + Hannum + PhenoAge), not just Horvath's.
const ALL_CLOCK_CPGS: Set<string> = (() => {
  const s = new Set<string>(SITES.map((x) => x.cpg));
  for (const x of (HANNUM as any).sites) s.add(x.cpg);
  for (const x of (LEVINE as any).sites) s.add(x.cpg);
  return s;
})();
// reverse coordinate index for WGBS: "chr:pos" -> cg
const COORD_TO_CG: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const cg of Object.keys(COORDS as any)) {
    const [chr, pos] = (COORDS as any)[cg];
    m[`${chr}:${pos}`] = cg;
  }
  return m;
})();

// ---- Horvath clock ---------------------------------------------------------
function antiTransform(x: number): number {
  return x < 0 ? (1 + ADULT_AGE) * Math.exp(x) - 1 : (1 + ADULT_AGE) * x + ADULT_AGE;
}

export interface AgeResult {
  clock: string; dnamAge: number; raw: number; nUsed: number; nTotal: number;
  coverage: number; chronologicalAge: number | null; ageAcceleration: number | null;
  contributions: Record<string, number>;
}

export function predict(betas: Record<string, number>, chronologicalAge: number | null = null): AgeResult {
  let raw = INTERCEPT; let used = 0;
  const contributions: Record<string, number> = {};
  for (const s of SITES) {
    const b = betas[s.cpg];
    if (b === undefined || b === null || Number.isNaN(b)) continue;
    const c = s.coef * b;
    raw += c; contributions[s.cpg] = c; used += 1;
  }
  const age = antiTransform(raw);
  const nTotal = SITES.length;
  return {
    clock: (COEFFS as any).clock || 'Horvath2013',
    dnamAge: age, raw, nUsed: used, nTotal,
    coverage: nTotal ? used / nTotal : 0,
    chronologicalAge,
    ageAcceleration: chronologicalAge != null ? age - chronologicalAge : null,
    contributions,
  };
}

// ---- additional clocks: Hannum 2013 & PhenoAge/Levine 2018 -----------------
// Both are LINEAR blood clocks: age(years) = intercept + Σ coef·β (no log
// anti-transform, unlike Horvath). Coefficients are the published values,
// sourced via the meffonym package from the original supplements:
//   Hannum 2013  (Mol Cell, doi:10.1016/j.molcel.2012.10.016)  — 71 CpG, no intercept
//   Levine 2018  (Aging,    doi:10.18632/aging.101414)         — 513 CpG, intercept 60.664
interface LinearClock { clock: string; intercept: number; sites: { cpg: string; coef: number }[]; source: string; }
const HANNUM_C = HANNUM as unknown as LinearClock;
const LEVINE_C = LEVINE as unknown as LinearClock;

function predictLinear(m: LinearClock, betas: Record<string, number>, chronologicalAge: number | null): AgeResult {
  let raw = m.intercept; let used = 0;
  const contributions: Record<string, number> = {};
  for (const s of m.sites) {
    const b = betas[s.cpg];
    if (b === undefined || b === null || Number.isNaN(b)) continue;
    const c = s.coef * b;
    raw += c; contributions[s.cpg] = c; used += 1;
  }
  const age = raw; // linear clock — raw is already in years
  const nTotal = m.sites.length;
  return {
    clock: m.clock, dnamAge: age, raw, nUsed: used, nTotal,
    coverage: nTotal ? used / nTotal : 0,
    chronologicalAge,
    ageAcceleration: chronologicalAge != null ? age - chronologicalAge : null,
    contributions,
  };
}

export interface MultiClockResult {
  primary: AgeResult;            // Horvath — the validated clock, drives the pipeline
  clocks: AgeResult[];           // all clocks with usable coverage, primary first
  consensus: number | null;      // coverage-weighted mean age across clocks that have data
  chronologicalAge: number | null;
}

// Human-facing labels for each clock id
export const CLOCK_LABELS: Record<string, string> = {
  Horvath2013: 'Horvath 2013 (multi-tissue, 353 CpG) · validated',
  Hannum2013: 'Hannum 2013 (whole blood, 71 CpG)',
  PhenoAge2018: 'PhenoAge · Levine 2018 (513 CpG)',
};

// Run every available clock on one beta profile. Horvath is the validated
// primary; Hannum & PhenoAge are shown as illustrative cross-checks (only the
// Horvath computation is benchmarked). A clock is included only if it found
// at least one of its CpGs in the sample.
export function predictAll(betas: Record<string, number>, chronologicalAge: number | null = null): MultiClockResult {
  const primary = predict(betas, chronologicalAge);
  const hannum = predictLinear(HANNUM_C, betas, chronologicalAge);
  const pheno = predictLinear(LEVINE_C, betas, chronologicalAge);
  const clocks = [primary, hannum, pheno].filter((c) => c.nUsed > 0);
  // coverage-weighted consensus so a clock with barely any CpGs can't skew it
  let num = 0; let den = 0;
  for (const c of clocks) { const w = c.coverage; num += c.dnamAge * w; den += w; }
  const consensus = den > 0 ? Math.round((num / den) * 10) / 10 : null;
  return { primary, clocks, consensus, chronologicalAge };
}

// ---- methylation parsing (array beta CSV OR WGBS .cov/bedGraph) ------------
function normChr(c: string): string {
  c = (c || '').trim();
  if (c.toLowerCase().startsWith('chr')) c = c.slice(3);
  return c.toUpperCase();
}

export interface ParseResult { betas: Record<string, number>; matched: number; total: number; coverage: number; format: string; }

export function parseMethylation(text: string): ParseResult {
  const total = SITES.length;
  // Ignore blank lines and '#' comment/note lines (samples carry an age/disease header).
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0 && !l.startsWith('#'));
  if (!lines.length) return { betas: {}, matched: 0, total, coverage: 0, format: 'empty' };

  const first = lines[0];
  const delim = (first.split('\t').length - 1) >= (first.split(',').length - 1) ? '\t' : ',';
  const firstCells = first.split(delim);
  const low = firstCells.map((c) => c.trim().toLowerCase());

  // ---- Array beta format: a "cg" id column + a numeric beta column ----
  // Detect: header mentions Name/cg, OR the first data cell already starts "cg".
  const looksArray = /^cg\d+/i.test(firstCells[0].trim()) ||
    low.includes('name') || low.some((c) => c.startsWith('cg'));
  if (looksArray) {
    const betas: Record<string, number> = {};
    const startsCg = /^cg\d+/i;
    let headerSkipped = false;
    for (const line of lines) {
      const cells = line.split(delim);
      const id = (cells[0] || '').trim();
      if (!startsCg.test(id)) { headerSkipped = true; continue; }
      // beta = last numeric cell (array files are Name,<sample beta>)
      let v = NaN;
      for (let i = cells.length - 1; i >= 1; i--) {
        const n = parseFloat(cells[i]); if (!Number.isNaN(n)) { v = n; break; }
      }
      if (Number.isNaN(v)) continue;
      if (v > 1.5) v = v / 100; // tolerate 0-100 percentages
      if (ALL_CLOCK_CPGS.has(id)) betas[id] = v; // keep CpGs used by any clock
    }
    void headerSkipped;
    // coverage is reported against the validated primary clock (Horvath);
    // per-clock coverage for Hannum/PhenoAge is computed in predictAll().
    if (Object.keys(betas).length > 0) {
      const matched = Object.keys(betas).filter((c) => c in BY_CPG).length;
      return { betas, matched, total, coverage: total ? matched / total : 0, format: 'array-beta' };
    }
  }

  // ---- Positional WGBS: .cov / bedGraph / bedMethyl → map by hg38 coord ----
  const betas: Record<string, number> = {};
  for (const line of lines) {
    const row = line.split(delim);
    if (row.length < 4) continue;
    let chrom: string; let pos: number;
    try { chrom = normChr(row[0]); pos = parseInt(String(parseFloat(row[1])), 10); }
    catch { continue; }
    if (!chrom || Number.isNaN(pos)) continue;
    let beta = NaN;
    if (row.length >= 11 && ['+', '-', '.'].includes(row[5])) {
      const pm = parseFloat(row[10]); if (!Number.isNaN(pm)) beta = pm / 100; // bedMethyl 0-100
    } else if (row.length >= 6) {
      const m = parseFloat(row[4]); const u = parseFloat(row[5]);
      if (!Number.isNaN(m) && !Number.isNaN(u) && (m + u) > 0) beta = m / (m + u); // Bismark .cov counts
    } else if (row.length >= 4) {
      const p = parseFloat(row[3]); if (!Number.isNaN(p)) beta = p > 1.5 ? p / 100 : p; // bedGraph meth%
    }
    if (Number.isNaN(beta)) continue;
    const cg = COORD_TO_CG[`${chrom}:${pos}`];
    if (cg) betas[cg] = Math.min(1, Math.max(0, beta));
  }
  const matched = Object.keys(betas).length;
  return { betas, matched, total, coverage: matched / total, format: matched ? 'wgbs' : 'unrecognised' };
}

// ---- target CpGs -----------------------------------------------------------
export interface Target { cpg: string; gene: string | null; chrom: string | null; direction: string; contribution: number; magnitude: number; note: string; }

export function discoverTargets(age: AgeResult, betas: Record<string, number>, topN = 20): Target[] {
  const out: Target[] = [];
  for (const [cpg, contribution] of Object.entries(age.contributions)) {
    const site = BY_CPG[cpg]; if (!site) continue;
    const beta = betas[cpg] ?? 0;
    const direction = site.coef > 0 ? 'demethylate' : 'methylate';
    const state = beta >= 0.5 ? 'hypermethylated' : 'hypomethylated';
    const osk = site.gene && OSK_GENES[site.gene] ? ` · reprogramming factor (${OSK_GENES[site.gene]})` : '';
    out.push({
      cpg, gene: site.gene, chrom: site.chrom, direction, contribution,
      magnitude: Math.abs(contribution),
      note: `${state}; ${direction} toward youthful state${osk}`,
    });
  }
  out.sort((a, b) => b.magnitude - a.magnitude);
  return out.slice(0, topN);
}

// ---- reprogramming projection ---------------------------------------------
export interface Rejuvenation {
  cycles: number; years_reversed: number; years_reversed_per_first_cycle: number;
  projected_age: number; tissue_rejuvenation_index: number; youth_setpoint: number;
  efficiency: number; tissue_key: string; basis: string;
}

export function projectRejuvenation(dnamAge: number, coverage: number, tissueKey?: string | null, cycles = 1): Rejuvenation {
  const eff = TISSUE_EFFICIENCY[(tissueKey || '').toLowerCase()] ?? REPROG_EFFICIENCY;
  const n = Math.max(1, Math.min(Math.trunc(cycles || 1), 10));
  const gap = Math.max(0, dnamAge - YOUTH_SETPOINT);
  let age = dnamAge;
  for (let i = 0; i < n; i++) age -= eff * Math.max(0, age - YOUTH_SETPOINT);
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return {
    cycles: n,
    years_reversed: r1(dnamAge - age),
    years_reversed_per_first_cycle: r1(eff * gap),
    projected_age: r1(age),
    tissue_rejuvenation_index: Math.round(eff * 100 * coverage),
    youth_setpoint: YOUTH_SETPOINT,
    efficiency: Math.round(eff * 100) / 100,
    tissue_key: tissueKey || 'generic',
    basis: `Projected from an illustrative partial-reprogramming model (${Math.round(eff * 100)}% of the epigenetic age above a ${Math.round(YOUTH_SETPOINT)}-yr setpoint reversed per cycle, tuned to the target tissue), scaled by CpG coverage — not a measured outcome. Cycles compound with diminishing returns toward the setpoint (never below it). Confirm with a post-treatment sample.`,
  };
}

// ---- regeneration projection (cell-therapy modality — replaces age reversal) ----
// MSC / exosome / HSC therapies don't reverse epigenetic age via OSK; their value
// is TISSUE REPAIR. Each dose repairs a tissue-tuned fraction of the addressable
// functional deficit, compounding with diminishing returns. Illustrative model.
const TISSUE_REGEN: Record<string, number> = {
  joint: 0.5, skin: 0.55, bone: 0.5, liver: 0.5, gut: 0.45, immune: 0.45, muscle: 0.45,
  systemic: 0.42, kidney: 0.4, lung: 0.4, retina: 0.4, pancreas: 0.38, heart: 0.35, cns: 0.3,
};
export interface Regeneration {
  doses: number; regeneration_index: number; per_first_dose: number;
  efficiency: number; tissue_key: string; per_dose: { dose: number; repaired: number }[]; basis: string;
}
export function projectRegeneration(tissueKey: string | null | undefined, coverage: number, doses = 1): Regeneration {
  const eff = TISSUE_REGEN[(tissueKey || '').toLowerCase()] ?? 0.42;
  const n = Math.max(1, Math.min(Math.trunc(doses || 1), 10));
  const per: { dose: number; repaired: number }[] = [];
  let repaired = 0;
  for (let i = 1; i <= n; i++) { repaired += eff * (1 - repaired); per.push({ dose: i, repaired: Math.round(repaired * 100 * coverage) }); }
  return {
    doses: n,
    regeneration_index: Math.round(repaired * 100 * coverage),
    per_first_dose: Math.round(eff * 100 * coverage),
    efficiency: Math.round(eff * 100) / 100,
    tissue_key: tissueKey || 'generic',
    per_dose: per,
    basis: `Illustrative tissue-repair model: each dose repairs ${Math.round(eff * 100)}% of the remaining addressable functional deficit in the target tissue (diminishing returns), scaled by CpG coverage. A planning estimate, not a measured outcome — confirm with follow-up imaging/function tests.`,
  };
}

// ---- tumorigenicity safety envelope ---------------------------------------
export interface TumorEnvelope {
  risk_tier: string; estimated_risk: number; risk_threshold: number; max_safe_cycles: number;
  requested_cycles: number; per_cycle_hazard: number; baseline_from_acceleration: number;
  tissue_key: string; tissue_proliferation_factor: number; gap_above_setpoint: number;
  risk_curve: { cycles: number; risk: number }[]; flags: string[]; summary: string;
}

export function tumorSafety(opts: {
  dnamAge: number; ageAcceleration?: number | null; coverage?: number;
  youthSetpoint?: number; efficiency?: number; tissueKey?: string | null; cycles?: number;
}): TumorEnvelope {
  const dnamAge = opts.dnamAge || 0;
  const accel = opts.ageAcceleration ?? 0;
  const coverage = opts.coverage ?? 1;
  const floor = opts.youthSetpoint ?? YOUTH_SETPOINT;
  const tissueKey = opts.tissueKey || 'generic';
  const cycles = Math.max(1, Math.min(Math.trunc(opts.cycles || 1), 10));
  const prolif = TISSUE_PROLIF[tissueKey] ?? 1.0;

  const gap = Math.max(0, dnamAge - floor);
  const gapFrac = Math.min(1, gap / 40);
  const baseline = 0.02 + Math.max(0, accel) * 0.004;
  let perCycle = (0.05 + 0.05 * gapFrac) * prolif;
  perCycle = Math.min(perCycle, 0.45);
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  const riskAt = (nn: number) => r3(Math.min(0.99, baseline + (1 - Math.pow(1 - perCycle, nn))));

  const risk = riskAt(cycles);
  const THRESHOLD = 0.15;
  let maxSafe = 0;
  for (let n = 1; n <= 10; n++) { if (riskAt(n) <= THRESHOLD) maxSafe = n; else break; }
  const tier = risk < 0.10 ? 'Low' : risk < 0.20 ? 'Moderate' : 'High';

  const flags: string[] = [];
  if (accel >= 5) flags.push(`Epigenetic age accelerated by +${Math.round(accel * 10) / 10} yr — elevated baseline dysregulation; start conservative.`);
  if (prolif >= 1.2) flags.push(`High-turnover tissue (${tissueKey}) — greater teratoma susceptibility; prefer localised, tightly-dosed delivery.`);
  if (prolif <= 0.6) flags.push(`Post-mitotic tissue (${tissueKey}) — comparatively tolerant of transient OSK (safest reprogramming setting).`);
  if (coverage < 0.8) flags.push(`CpG coverage ${Math.round(coverage * 100)}% — lower confidence; treat the envelope as provisional.`);
  if (cycles > maxSafe) flags.push(`Requested ${cycles} cycle(s) exceeds the estimated safe envelope (${maxSafe}); reduce cycles or add safeguards.`);

  return {
    risk_tier: tier, estimated_risk: risk, risk_threshold: THRESHOLD, max_safe_cycles: maxSafe,
    requested_cycles: cycles, per_cycle_hazard: Math.round(perCycle * 1000) / 1000,
    baseline_from_acceleration: Math.round(baseline * 1000) / 1000,
    tissue_key: tissueKey, tissue_proliferation_factor: prolif,
    gap_above_setpoint: Math.round(gap * 10) / 10,
    risk_curve: [1, 2, 3, 4, 5, 6].map((n) => ({ cycles: n, risk: riskAt(n) })),
    flags,
    summary: `At ${cycles} cycle(s) on ${tissueKey} tissue, estimated over-induction risk is ~${Math.round(risk * 100)}% (${tier}). Estimated safe envelope: up to ${maxSafe} cycle(s) under transient, dose-controlled OSK with a kill-switch.`,
  };
}

// ---- orchestration ---------------------------------------------------------
export interface PipelineResult {
  ok: boolean; error?: string;
  parse: ParseResult;
  epigenetic_age: AgeResult;
  targets: Target[];
  rejuvenation: Rejuvenation;
  tumor: TumorEnvelope;
}

export function runPipeline(text: string, opts: {
  chronologicalAge?: number | null; tissueKey?: string | null; cycles?: number; topTargets?: number;
} = {}): PipelineResult {
  const parse = parseMethylation(text);
  if (parse.matched === 0) {
    return { ok: false, error: 'No Horvath clock CpGs found in this file. Expected an array beta CSV (Name,<beta>) or a bisulfite .cov/bedGraph (hg38).', parse } as any;
  }
  const cycles = Math.max(1, Math.min(Math.trunc(opts.cycles || 1), 10));
  const age = predict(parse.betas, opts.chronologicalAge ?? null);
  const targets = discoverTargets(age, parse.betas, opts.topTargets ?? 20);
  const rej = projectRejuvenation(age.dnamAge, age.coverage, opts.tissueKey, cycles);
  const tumor = tumorSafety({
    dnamAge: age.dnamAge, ageAcceleration: age.ageAcceleration, coverage: age.coverage,
    youthSetpoint: rej.youth_setpoint, efficiency: rej.efficiency, tissueKey: opts.tissueKey, cycles,
  });
  return { ok: true, parse, epigenetic_age: age, targets, rejuvenation: rej, tumor };
}
