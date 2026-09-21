// Compose a complete 7-step run payload (PDF/summary shape) from the browser
// pipeline + construct + safety. Keys are snake_case to match export.py / pdf.ts.
import { predictAll, CLOCK_LABELS, parseMethylation, discoverTargets, projectRejuvenation, projectRegeneration, tumorSafety } from './pipeline';
import { assembleOSK, assembleExosome, safetyPrescreen } from './construct';
import { immuneSafety } from './immune';
import { buildCellular, summarizeCellular } from './cell';
import type { CellularOutcome } from './cell';
import { buildOptimization, summarizeOptimization } from './optimize';
import type { Optimization } from './optimize';
import { buildScorecard, summarizeScorecard } from './scorecard';
import type { Scorecard } from './scorecard';
import type { DiseaseEntry, Modality } from './catalog';
import { CARS } from '../api/staticData';

export interface FullRun {
  ok: boolean; error?: string;
  disease: { name: string; department: string; tissue: string; capsid: string; route: string };
  modality: Modality;   // 'reprogramming' vs 'cell' — drives which steps show
  sample: string;
  chronological_age: number | null;
  coverage_pct: number;
  tissue_key: string;
  comorbidities: string[];
  epigenetic_age: any;
  targets: any[];
  rejuvenation: any;    // reprogramming modality (age reversal)
  regeneration: any;    // cell modality (tissue repair)
  construct: any;       // reprogramming: OSK AAV
  exosome: any;         // cell: IV exosome carrier
  safety: any;
  tumor: any;           // reprogramming only (hidden for cell)
  immune: any;
  cellular: CellularOutcome;  // illustrative variant-informed cellular-outcome layer
  optimization: Optimization | null;  // final step — success-rate optimiser (illustrative)
  scorecard: Scorecard | null;        // whole-pipeline safety-adjusted score + confidence gate
}

export function buildRun(text: string, opts: {
  disease: DiseaseEntry; sample?: string; chronologicalAge?: number | null; cycles?: number;
  comorbidities?: string[];
}): FullRun {
  const parse = parseMethylation(text);
  const dz = opts.disease;
  if (parse.matched === 0) {
    return { ok: false, error: 'No Horvath clock CpGs found. Use an array beta CSV (Name,<beta> with cg IDs) or a bisulfite .cov/bedGraph.' } as any;
  }
  const cycles = Math.max(1, Math.min(Math.trunc(opts.cycles || 1), 10));
  const isReprog = dz.modality === 'reprogramming';
  // Multi-clock: Horvath (validated) drives the pipeline; Hannum & PhenoAge are
  // illustrative cross-checks so a reviewer/user isn't relying on one estimator.
  const multi = predictAll(parse.betas, opts.chronologicalAge ?? null);
  const age = multi.primary;
  const targets = discoverTargets(age, parse.betas, 12);
  const rej = projectRejuvenation(age.dnamAge, age.coverage, dz.tissue_key, cycles);
  const regen = projectRegeneration(dz.tissue_key, age.coverage, cycles);
  const construct = isReprog ? assembleOSK({ capsid: dz.capsid, tissueKey: dz.tissue_key }) : null;
  const exosome = isReprog ? null : assembleExosome({ tissueKey: dz.tissue_key, tissueLabel: dz.tissue });
  const safety = safetyPrescreen({ cycles, host: 'mouse', sensitivity: 0.9 });
  const tumor = tumorSafety({
    dnamAge: age.dnamAge, ageAcceleration: age.ageAcceleration, coverage: age.coverage,
    youthSetpoint: rej.youth_setpoint, efficiency: rej.efficiency, tissueKey: dz.tissue_key, cycles,
  });
  const comorbidities = opts.comorbidities || [];
  const immune = immuneSafety({
    tissueKey: dz.tissue_key, department: dz.department, ageAcceleration: age.ageAcceleration,
    coverage: age.coverage, cycles, comorbidities,
  });
  const cellular = buildCellular({
    modality: dz.modality, tissueKey: dz.tissue_key, sample: opts.sample || 'patient',
    dnamAge: age.dnamAge, ageAccel: age.ageAcceleration, coverage: age.coverage,
    rejuvenationIndex: rej.tissue_rejuvenation_index, regenerationIndex: regen.regeneration_index,
    cycles, drivers: targets.map((t) => t.gene || t.cpg),
  });
  // ---- final step: success-rate optimiser (wrapped so it can never break the run) ----
  let optimization: Optimization | null = null;
  try {
    const matchCar = CARS.find((c) => c.model === dz.disease) || CARS.find((c) => c.make === dz.department);
    const category = (matchCar?.body_type as string) || (isReprog ? 'iPSC' : 'MSC');
    const fuel = String(matchCar?.fuel_type || '').toLowerCase();
    const baselineCellSource = fuel.includes('auto') ? 'autologous'
      : fuel.includes('ipsc') ? 'ipsc'
      : fuel.includes('exo') ? 'exosome' : 'allogeneic';
    optimization = buildOptimization({
      disease: dz, category, dnamAge: age.dnamAge, coverage: age.coverage, isReprog,
      baselineCellSource, baselineRoute: dz.route,
    });
  } catch { optimization = null; }
  return finalize({
    ok: true,
    disease: { name: dz.disease, department: dz.department, tissue: dz.tissue, capsid: dz.capsid, route: dz.route },
    modality: dz.modality,
    sample: opts.sample || 'patient',
    chronological_age: opts.chronologicalAge ?? null,
    coverage_pct: Math.round(age.coverage * 100),
    tissue_key: dz.tissue_key,
    comorbidities,
    epigenetic_age: {
      clock: age.clock, dnam_age: Math.round(age.dnamAge * 100) / 100,
      chronological_age: age.chronologicalAge,
      age_acceleration: age.ageAcceleration != null ? Math.round(age.ageAcceleration * 100) / 100 : null,
      n_used: age.nUsed, n_total: age.nTotal, coverage: Math.round(age.coverage * 1000) / 1000,
      // multi-clock cross-check: each clock that had usable CpGs, primary first
      consensus_age: multi.consensus,
      clocks: multi.clocks.map((c) => ({
        clock: c.clock,
        label: CLOCK_LABELS[c.clock] || c.clock,
        dnam_age: Math.round(c.dnamAge * 100) / 100,
        age_acceleration: c.ageAcceleration != null ? Math.round(c.ageAcceleration * 100) / 100 : null,
        n_used: c.nUsed, n_total: c.nTotal, coverage: Math.round(c.coverage * 1000) / 1000,
        validated: c.clock === 'Horvath2013',
      })),
    },
    targets, rejuvenation: rej, regeneration: regen, construct, exosome, safety, tumor, immune, cellular, optimization,
  });
}

// Attach the whole-pipeline safety-adjusted scorecard (folds tumorigenicity,
// immunogenicity & cellular outcome into the success number + a confidence gate).
// Wrapped so it can never break a run.
function finalize(run: Omit<FullRun, 'scorecard'>): FullRun {
  let scorecard: Scorecard | null = null;
  try { scorecard = buildScorecard(run as FullRun); } catch { scorecard = null; }
  return { ...run, scorecard };
}

export function summarizeRun(r: FullRun): string {
  const ea = r.epigenetic_age, rej = r.rejuvenation, regen = r.regeneration, t = r.tumor;
  const isReprog = r.modality === 'reprogramming';
  const accel = ea.age_acceleration != null ? `${ea.age_acceleration >= 0 ? '+' : ''}${ea.age_acceleration} yr` : 'not provided';
  return [
    `StemCells Protocol simulator — on-device run for ${r.disease.name} (${r.disease.tissue}). Modality: ${isReprog ? 'epigenetic reprogramming (OSK)' : 'cell / regenerative therapy'}. Raw genome NOT uploaded.`,
    `Clock ${ea.clock}, coverage ${ea.n_used}/${ea.n_total} (${r.coverage_pct}%).`,
    `Biological (DNAm) age ${ea.dnam_age} yr; chronological ${ea.chronological_age ?? 'not provided'}; acceleration ${accel}.`,
    (ea.clocks && ea.clocks.length > 1)
      ? `Multi-clock cross-check — ${ea.clocks.map((c: any) => `${c.label.split(' (')[0].replace(' · validated', '')} ${c.dnam_age} yr`).join('; ')}${ea.consensus_age != null ? `; consensus ${ea.consensus_age} yr` : ''}. Only Horvath is benchmark-validated; the others are illustrative cross-checks.`
      : '',
    isReprog
      ? `Reprogramming (${rej.cycles} cycle): ${ea.dnam_age} → ${rej.projected_age} yr (−${rej.years_reversed} yr), rejuvenation index ${rej.tissue_rejuvenation_index}%.`
      : `Regeneration projection (${regen.doses} dose${regen.doses > 1 ? 's' : ''}): tissue-repair index ${regen.regeneration_index}% for ${r.disease.tissue}.`,
    isReprog
      ? `Construct: ${r.construct.strategy}, ${r.construct.capsid_desc}.`
      : `Delivery: ${r.exosome.strategy} — ${r.exosome.cargo} Targeting ${r.exosome.targeting.tissue} via ${r.exosome.targeting.ligand}.`,
    `Safety avatar lifts projected success ${r.safety.projected_success_without}% → ${r.safety.projected_success_with}%.`,
    isReprog
      ? `Tumorigenicity: ${t.risk_tier}, ~${Math.round(t.estimated_risk * 100)}% at ${t.requested_cycles} cycle(s); max safe ${t.max_safe_cycles}; proliferation ${t.tissue_proliferation_factor}× (${t.tissue_key}).`
      : '',
    r.cellular ? summarizeCellular(r.cellular) : '',
    r.optimization ? summarizeOptimization(r.optimization) : '',
    r.scorecard ? summarizeScorecard(r.scorecard) : '',
    r.immune ? `Immune & adverse-event envelope — symptom outlook: ${r.immune.overall_tier} (usually mild & short-lived)${r.immune.classes?.[0] ? `; most likely = ${r.immune.classes[0].label} (${r.immune.classes[0].tier})` : ''}${r.immune.comorbidities?.length ? `; comorbidities: ${r.immune.comorbidities.join(', ')}` : ''}. Likelihood read (not a severity grade or yes/no); a methylation file can't see HLA/clotting genes or the clinic.` : '',
    `Research/illustrative — projections are model estimates, not measured outcomes; not medical advice.`,
  ].filter(Boolean).join('\n');
}
