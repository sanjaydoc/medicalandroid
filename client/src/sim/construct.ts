// OSK Tet-On construct assembly — TS port of app/construct (deterministic).

interface Part { key: string; name: string; type: string; length_bp: number; }
const P = (key: string, name: string, type: string, length_bp: number): Part => ({ key, name, type, length_bp });
const PARTS: Record<string, Part> = {
  itr5: P('itr5', "AAV2 5' ITR", 'itr', 145),
  itr3: P('itr3', "AAV2 3' ITR", 'itr', 145),
  tre3g: P('tre3g', 'TRE3G promoter', 'promoter', 380),
  rtta3g: P('rtta3g', 'rtTA (Tet-On 3G)', 'transactivator', 750),
  efs: P('efs', 'EFS (EF1α core)', 'promoter', 240),
  oct4: P('oct4', 'OCT4 (POU5F1) CDS', 'cds', 1083),
  sox2: P('sox2', 'SOX2 CDS', 'cds', 954),
  klf4: P('klf4', 'KLF4 CDS', 'cds', 1440),
  kozak: P('kozak', 'Kozak + start', 'linker', 10),
  p2a: P('p2a', 'P2A self-cleaving peptide', 'linker', 66),
  t2a: P('t2a', 'T2A self-cleaving peptide', 'linker', 63),
  wpre: P('wpre', 'WPRE', 'element', 600),
  min_polya: P('min_polya', 'Synthetic minimal polyA', 'polyA', 50),
};
const AAV_CAPACITY_BP = 4700;

const CAPSIDS: Record<string, string> = {
  aav9: 'AAV9 — broad, crosses BBB (CNS/systemic)',
  aav2: 'AAV2 — classic; retina (intravitreal, Persona Reversal-style)',
  aav5: 'AAV5 — airway/CNS',
  aav6: 'AAV6 — airway/lung, muscle',
  aav8: 'AAV8 — liver, pancreas',
  aavdj: 'AAV-DJ — engineered broad tropism',
};
const CAPSID_TISSUE_NOTE: Record<string, string> = {
  kidney: 'broad systemic serotype; reaches the kidney via IV infusion',
  cns: 'crosses the blood–brain barrier for CNS delivery (IV/intrathecal)',
  retina: 'gold-standard ocular serotype (intravitreal, Persona Reversal-style)',
  heart: 'strong cardiac and systemic tropism (intracoronary/IV)',
  liver: 'high hepatic tropism (liver-preferential, IV)',
  lung: 'airway/lung tropism (inhaled or IV)',
  immune: 'used for ex-vivo transduction of HSC/immune cells, then reinfused',
  systemic: 'broad systemic biodistribution (IV)',
  joint: 'local intra-articular delivery to the joint',
  pancreas: 'pancreatic/islet + systemic tropism (IV / intra-ductal)',
};
function capsidDescription(capsid: string, tissueKey?: string | null): string {
  const base = CAPSIDS[capsid] || `${capsid.toUpperCase()} capsid`;
  const serotype = base.includes('—') ? base.split('—')[0].trim() : capsid.toUpperCase();
  const note = CAPSID_TISSUE_NOTE[(tissueKey || '').toLowerCase()];
  return note ? `${serotype} — ${note}` : base;
}

export interface Feature { key: string; name: string; type: string; length: number; }
export interface Vector { name: string; length_bp: number; fits_aav: boolean; features: Feature[]; }
export interface Construct { strategy: string; capsid: string; capsid_desc: string; vectors: Vector[]; notes: string[]; }

function layout(name: string, keys: string[]): Vector {
  const features: Feature[] = [];
  let pos = 0;
  for (const k of keys) { const part = PARTS[k]; features.push({ key: k, name: part.name, type: part.type, length: part.length_bp }); pos += part.length_bp; }
  return { name, length_bp: pos, fits_aav: pos <= AAV_CAPACITY_BP, features };
}

export function assembleOSK(opts: { capsid?: string; tissueKey?: string | null } = {}): Construct {
  const capsid = opts.capsid || 'aav9';
  const payload = ['tre3g', 'kozak', 'oct4', 'p2a', 'sox2', 't2a', 'klf4', 'wpre', 'min_polya'];
  const driver = ['efs', 'rtta3g', 'min_polya'];
  const notes: string[] = [];
  const single = layout('Single AAV (all-in-one)', ['itr5', ...payload, ...driver, 'itr3']);
  let vectors: Vector[]; let strategy: string;
  if (single.fits_aav) {
    vectors = [single]; strategy = 'single-aav';
  } else {
    let v1 = layout('Vector 1 — payload (TRE3G–OSK)', ['itr5', ...payload, 'itr3']);
    if (!v1.fits_aav) {
      const noW = payload.filter((p) => p !== 'wpre');
      v1 = layout('Vector 1 — payload (TRE3G–OSK)', ['itr5', ...noW, 'itr3']);
      notes.push('WPRE dropped from the payload vector to fit AAV capacity.');
    }
    const v2 = layout('Vector 2 — driver (promoter–rtTA)', ['itr5', ...driver, 'itr3']);
    vectors = [v1, v2]; strategy = 'dual-aav (split)';
    notes.push(`Single-vector cassette is ${single.length_bp} bp (> ${AAV_CAPACITY_BP} bp AAV limit) → split into two co-delivered AAVs.`);
  }
  return { strategy, capsid, capsid_desc: capsidDescription(capsid, opts.tissueKey), vectors, notes };
}

// ---- IV exosome carrier (cell-therapy modality — replaces the OSK AAV) ------
// MSC / exosome therapies deliver regenerative cargo in extracellular vesicles,
// not an OSK gene cassette — so there is no AAV packaging limit and no dual-vector
// split. Illustrative research delivery spec (no dose, no clinical claim).
const EXO_TARGETING: Record<string, { ligand: string; note: string; local?: boolean }> = {
  cns: { ligand: 'RVG peptide (Lamp2b)', note: 'RVG-displaying exosomes cross the blood–brain barrier after IV dosing.' },
  systemic: { ligand: 'Native circulation + CD47 “don’t-eat-me” display', note: 'CD47 extends circulation time for systemic targets.' },
  immune: { ligand: 'Native uptake by PBMCs / spleen', note: 'Immune cells take up circulating exosomes readily.' },
  joint: { ligand: 'Chondrocyte-affinity peptide', note: 'Intra-articular injection localises the vesicles to the joint.', local: true },
  liver: { ligand: 'Native hepatic tropism', note: 'IV exosomes are naturally cleared to the liver.' },
  lung: { ligand: 'First-pass lung capture (or nebulised)', note: 'IV exosomes show significant lung uptake.' },
  heart: { ligand: 'Cardiac-homing peptide (CHP)', note: 'CHP-engineered exosomes enrich in myocardium.' },
  skin: { ligand: 'Local injection', note: 'Local delivery for dermal/cosmetic targets.', local: true },
  pancreas: { ligand: 'GLP-1 / islet-homing peptide', note: 'Islet-targeting ligands under study.' },
  gut: { ligand: 'Oral / local or IV', note: 'Gut delivery often uses oral or local routes.' },
  bone: { ligand: 'Aspartate-rich bone-targeting peptide', note: 'Aspartate peptides home to bone.', local: true },
  kidney: { ligand: 'Native + megalin-affinity peptide', note: 'IV exosomes reach the kidney; peptide ligands improve tubular uptake.' },
  retina: { ligand: 'Intravitreal-tropic peptide', note: 'Local (intravitreal) delivery preferred — IV homing is limited.', local: true },
  muscle: { ligand: 'Muscle-homing peptide', note: 'Intramuscular or IV with muscle-targeting ligand.' },
};

export interface Exosome {
  carrier: 'exosome'; strategy: string; payload: string; route: string; vesicle_size_nm: string;
  source_cell: string; cargo: string; targeting: { tissue: string; ligand: string; note: string };
  advantages: string[]; control: string;
}

export function assembleExosome(opts: { tissueKey?: string | null; tissueLabel?: string } = {}): Exosome {
  const tk = (opts.tissueKey || 'systemic').toLowerCase();
  const tgt = EXO_TARGETING[tk] || EXO_TARGETING.systemic;
  return {
    carrier: 'exosome',
    strategy: 'IV exosome (extracellular vesicle) carrier',
    payload: 'MSC-derived regenerative cargo',
    route: tgt.local ? 'Local injection' : 'Intravenous infusion',
    vesicle_size_nm: '30–150',
    source_cell: 'Autologous / allogeneic MSC producer cells (vesicles harvested by ultracentrifugation / TFF)',
    cargo: 'Regenerative miRNA (e.g. miR-21/-125), growth factors (VEGF, HGF, TGF-β) and mRNA — pro-repair, anti-inflammatory, pro-angiogenic.',
    targeting: { tissue: opts.tissueLabel || tk, ligand: tgt.ligand, note: tgt.note },
    advantages: [
      'Low immunogenicity — vesicles can be made from the patient’s own cells.',
      'Surface-engineerable — display a homing ligand for tissue targeting.',
      'Re-dosable — no AAV neutralising-antibody problem on repeat IV dosing.',
      'Cell-free — none of the embolic / ectopic-engraftment risk of whole-cell infusions.',
    ],
    control: 'Dose = number of vesicles × cargo copy number; repeat spaced infusions rather than a genetic switch.',
  };
}

// ---- Step 6: Safety Implant Blob (avatar pre-screen) ----------------------
const SAFETY_PER_CYCLE: Record<string, number> = { reprogramming: 0.07, gene_replacement: 0.03, epigenetic_silencing: 0.03 };
const HOST_LABEL: Record<string, string> = { mouse: 'immunodeficient / transgenic mouse (NSG-style)', guinea_pig: 'transgenic guinea pig' };
const AVATAR_DETECTS = [
  'Tumorigenicity / teratoma at the graft (the key reprogramming danger)',
  'Loss of cell identity / de-differentiation in the patient’s own cells',
  'Off-target or run-away transgene expression in the graft',
  'Local efficacy — re-methylate the graft and re-run the clock to confirm reversal',
];
const AVATAR_MISSES = [
  'The patient’s whole-body immune response to the vector/cells',
  'Systemic pharmacokinetics & biodistribution beyond the graft',
  'Delayed effects beyond the observation window',
];

export interface Safety {
  host: string; avatar_cycles: number; sensitivity: number;
  projected_success_without: number; projected_success_with: number; risk_reduction: number;
  detects: string[]; misses: string[];
}

export function safetyPrescreen(opts: { cycles?: number; host?: string; sensitivity?: number } = {}): Safety {
  const cycles = Math.max(1, Math.min(Math.trunc(opts.cycles || 1), 10));
  const host = opts.host || 'mouse';
  const sensitivity = Math.min(Math.max(opts.sensitivity ?? 0.9, 0), 0.95);
  const r = SAFETY_PER_CYCLE.reprogramming;
  const preRisk = 1 - Math.pow(1 - r, cycles);
  const residual = preRisk * (1 - sensitivity);
  void HOST_LABEL;
  return {
    host, avatar_cycles: Math.min(cycles, 2), sensitivity: Math.round(sensitivity * 100) / 100,
    projected_success_without: Math.round(100 * (1 - preRisk) * 10) / 10,
    projected_success_with: Math.round(100 * (1 - residual) * 10) / 10,
    risk_reduction: Math.round((preRisk - residual) * 1000) / 1000,
    detects: AVATAR_DETECTS, misses: AVATAR_MISSES,
  };
}
