// Success Scorecard — folds the WHOLE pipeline into one self-consistent number.
//
// The honest gap this fixes: the success-rate optimiser (optimize.ts) scores only
// the *formulation* levers (cell source, HLA, protocol, route, age, coverage) and
// IGNORES three of the pipeline's own safety/outcome steps — tumorigenicity,
// immunogenicity, and the cellular-outcome layer. So today the simulator can show a
// high "success %" while tumour risk is high. This module folds those three steps in
// as explicit ± contributions, so a high over-induction risk or adverse-event load
// now pulls the number DOWN. It also adds a deterministic confidence → escalate gate
// (high-confidence proceeds, low-confidence routes to a clinician).
//
// IMPORTANT (honesty): every number here is an ILLUSTRATIVE MODEL ESTIMATE — a
// self-consistent composite of the pipeline's own metrics, NOT a validated clinical
// probability. No LLM and no LSM are involved; this is a deterministic client-side
// scorecard. Validating it against real outcomes needs a clinical pilot.

import type { FullRun } from './full';
import { computeSuccessBreakdown } from './optimize';

export interface ScoreContribution {
  key: string;
  label: string;
  points: number;   // percentage points, signed
  note?: string;
}

export type Gate = 'proceed' | 'review' | 'insufficient';

export interface Scorecard {
  overall_success: number;      // 0-100, safety-adjusted
  formulation_success: number;  // 0-100, optimiser levers only (unchanged)
  safety_delta: number;         // overall − formulation (usually negative)
  contributions: ScoreContribution[];
  confidence: number;           // 0-1
  confidence_tier: 'High' | 'Moderate' | 'Low';
  gate: Gate;
  gate_label: string;
  gate_reason: string;
  flags: string[];
  disclaimer: string;
}

const clampPct = (x: number) => Math.max(3, Math.min(90, x));

export function buildScorecard(run: FullRun): Scorecard | null {
  if (!run.optimization) return null;
  const o = run.optimization;
  const best = o.best;
  const ctx = o.ctx;
  const isReprog = run.modality === 'reprogramming';

  // formulation terms (single source of truth — the optimiser's own model)
  const bd = computeSuccessBreakdown({
    category: ctx.category, cellSource: best.cellSource, route: best.route, protocol: best.protocol,
    tissueKey: ctx.disease.tissue_key, dnamAge: ctx.dnamAge, coverage: ctx.coverage,
    isReprog: ctx.isReprog, hlaMatched: best.hlaMatched,
  });
  const formulationPct = Math.round(bd.final * 100);
  const contributions: ScoreContribution[] = bd.terms.map((t) => ({
    key: t.key, label: t.label, points: Math.round(t.points), note: t.note,
  }));

  const flags: string[] = [];

  // (1) Tumorigenicity — reprogramming only. High over-induction risk must lower it.
  let tumorPts = 0;
  if (isReprog && run.tumor) {
    const risk = run.tumor.estimated_risk ?? 0;            // 0..~0.99
    tumorPts = -Math.round(risk * 55);                     // ~15% → -8 pts, ~40% → -22 pts
    contributions.push({
      key: 'tumor', label: `Tumorigenicity risk (${run.tumor.risk_tier})`, points: tumorPts,
      note: `~${Math.round(risk * 100)}% over-induction risk at ${run.tumor.requested_cycles} cycle(s)`,
    });
    if (run.tumor.requested_cycles > run.tumor.max_safe_cycles) {
      flags.push(`Requested ${run.tumor.requested_cycles} cycle(s) exceeds the safe envelope `
        + `(${run.tumor.max_safe_cycles}).`);
    }
    if (run.tumor.risk_tier === 'High') flags.push('Tumorigenicity risk tier is High.');
  }

  // (2) Immunogenicity / adverse-event load.
  let immunePts = 0;
  if (run.immune) {
    const tierMap: Record<string, number> = { Uncommon: -1, Possible: -5, Common: -10 };
    immunePts = tierMap[run.immune.overall_tier] ?? -3;
    contributions.push({
      key: 'immune', label: `Immunogenicity / AE load (${run.immune.overall_tier})`, points: immunePts,
      note: run.immune.classes?.[0] ? `most likely: ${run.immune.classes[0].label}` : undefined,
    });
    if (run.immune.overall_tier === 'Common') flags.push('Adverse-event likelihood tier is Common.');
  }

  // (3) Cellular-outcome benefit — does the therapy actually move the markers?
  let cellPts = 0;
  if (run.cellular?.headline?.length) {
    let benefit = 0;
    for (const h of run.cellular.headline) {
      const good = h.better === 'up' ? Math.max(0, h.delta) : Math.max(0, -h.delta);
      benefit += good;
    }
    cellPts = Math.round(Math.min(12, benefit / 12));      // up to +12 pts for a broad response
    contributions.push({
      key: 'cellular', label: 'Cellular-outcome benefit', points: cellPts,
      note: 'net improvement across senescence / damage / stemness markers',
    });
    if (cellPts <= 1) flags.push('Modelled cellular response is weak — markers barely move.');
  }

  const overallPct = clampPct(formulationPct + tumorPts + immunePts + cellPts);

  // ---- confidence: how much can we trust this estimate for THIS input? ----
  const cov = ctx.coverage ?? 0;
  const ea: any = run.epigenetic_age;
  let clockAgree = 0.6;                                     // neutral if only one clock ran
  if (ea?.clocks && ea.clocks.length > 1) {
    const ages = ea.clocks.map((c: any) => c.dnam_age).filter((x: any) => typeof x === 'number');
    if (ages.length > 1) {
      const spread = Math.max(...ages) - Math.min(...ages);
      clockAgree = Math.max(0, Math.min(1, 1 - spread / 20)); // >20-yr disagreement → 0
    }
  }
  const ageKnown = ea?.age_acceleration != null ? 1 : 0.5;  // chronological age provided?
  const flagPenalty = Math.min(0.3, 0.1 * flags.length);
  const confidence = Math.max(0, Math.min(1, 0.5 * cov + 0.3 * clockAgree + 0.2 * ageKnown - flagPenalty));
  const confidence_tier = confidence >= 0.75 ? 'High' : confidence >= 0.5 ? 'Moderate' : 'Low';

  // ---- the escalate gate ----
  const hardFlag = isReprog && !!run.tumor
    && (run.tumor.risk_tier === 'High' || run.tumor.requested_cycles > run.tumor.max_safe_cycles);
  let gate: Gate;
  let gate_label: string;
  let gate_reason: string;
  if (confidence < 0.35) {
    gate = 'insufficient';
    gate_label = 'Insufficient data';
    gate_reason = 'Low input confidence — a methylation file alone can’t decide candidacy.';
  } else if (confidence < 0.75 || hardFlag) {
    gate = 'review';
    gate_label = 'Clinician review';
    gate_reason = hardFlag
      ? 'A safety flag was raised — a clinician must review before proceeding.'
      : 'Moderate confidence — confirm eligibility with a clinician.';
  } else {
    gate = 'proceed';
    gate_label = 'Proceed to clinician';
    gate_reason = 'High input confidence and no safety flags — a reasonable candidate to discuss with a clinician.';
  }

  return {
    overall_success: overallPct,
    formulation_success: formulationPct,
    safety_delta: overallPct - formulationPct,
    contributions,
    confidence,
    confidence_tier,
    gate,
    gate_label,
    gate_reason,
    flags,
    disclaimer: 'Illustrative model estimate — a self-consistent composite of the pipeline’s own metrics '
      + '(now including tumorigenicity, immunogenicity & cellular outcome), not a validated clinical '
      + 'probability. Low confidence routes to clinician review.',
  };
}

export function summarizeScorecard(s: Scorecard): string {
  const flags = s.flags.length ? ` Flags: ${s.flags.join('; ')}` : '';
  return `Overall projected success (safety-adjusted): ${s.overall_success}% `
    + `(formulation ${s.formulation_success}%${s.safety_delta ? `, safety adjustment ${s.safety_delta > 0 ? '+' : ''}${s.safety_delta} pts` : ''}) `
    + `— now folds in tumorigenicity, immunogenicity & cellular outcome. `
    + `Confidence ${s.confidence_tier} → ${s.gate_label}.${flags} ${s.disclaimer}`;
}
