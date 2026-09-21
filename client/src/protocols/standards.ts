// StemCells Protocol — cross-cutting Safety & Quality Standards layer.
//
// This is the backbone every coded protocol inherits. It is grounded in the
// established real-world frameworks that govern cell & gene therapy manufacture
// and administration. It is a PROPOSED, open standard (v0.1, draft) — it cites
// those frameworks, it does not replace them, and nothing here is medical advice
// or a substitute for your own institutional, ethics-board and regulator sign-off.

export interface StandardRef { label: string; note: string; }
export interface StandardGroup { key: string; title: string; icon: string; items: StandardRef[]; }

export const STANDARDS: StandardGroup[] = [
  {
    key: 'manufacturing',
    title: 'Manufacturing & tissue practice',
    icon: 'flask',
    items: [
      { label: 'cGMP', note: 'Current Good Manufacturing Practice for the cell/gene product — controlled cleanrooms, validated processes, batch records.' },
      { label: '21 CFR 1271 (US GTP)', note: 'Good Tissue Practice for human cells, tissues and cellular/tissue-based products (HCT/Ps); PHS Act §361 vs §351 pathway.' },
      { label: 'EU GMP Annex 1 & ATMP GMP', note: 'EU Advanced Therapy Medicinal Product manufacturing & sterile-product guidance for the EU/EEA.' },
      { label: 'Aseptic / closed-system processing', note: 'Prefer functionally-closed processing (e.g. automated cell-processing platforms) to minimise contamination risk.' },
    ],
  },
  {
    key: 'identity',
    title: 'Cell identity, potency & release',
    icon: 'dna',
    items: [
      { label: 'ISCT MSC minimal criteria', note: 'Plastic-adherent; ≥95% CD73⁺ CD90⁺ CD105⁺; ≤2% CD45 CD34 CD14/CD11b CD19/CD79α HLA-DR; tri-lineage differentiation (osteo/adipo/chondro).' },
      { label: 'HPC identity', note: 'CD34⁺ enumeration + viability (e.g. 7-AAD) for haematopoietic products; TNC/CD34 dose targets.' },
      { label: 'Release testing', note: 'Viability threshold, sterility (14-day culture / rapid method), endotoxin (LAL), mycoplasma-negative, identity & potency assay before release.' },
      { label: 'Genetic stability', note: 'Karyotype / genomic-integrity check for expanded or reprogrammed products; vector copy number & insertion-site profile for gene therapies.' },
    ],
  },
  {
    key: 'accreditation',
    title: 'Programme accreditation',
    icon: 'hospital',
    items: [
      { label: 'FACT-JACIE', note: 'International standards for haematopoietic & immune-effector cellular therapy — collection, processing, administration & quality management.' },
      { label: 'AABB / ISO 15189', note: 'Blood/cell facility and medical-laboratory quality accreditation where applicable.' },
      { label: 'Ethics & regulatory', note: 'IRB/IEC approval, informed consent, and the appropriate regulatory pathway (FDA IND/BLA, EMA ATMP, or national equivalent) before any human use.' },
    ],
  },
  {
    key: 'traceability',
    title: 'Labelling & traceability',
    icon: 'clipboard',
    items: [
      { label: 'ISBT 128', note: 'Global standard terminology, identifiers and labelling for cellular therapy products — full donor→product→patient chain of identity/custody.' },
      { label: 'Cold chain', note: 'Validated storage/transport (vapour-phase LN₂ for cryopreserved; 2–8 °C or controlled RT for fresh) with continuous monitoring.' },
    ],
  },
  {
    key: 'safety',
    title: 'Patient safety & pharmacovigilance',
    icon: 'heart',
    items: [
      { label: 'Adverse-event grading', note: 'Grade and report events with CTCAE; pre-defined stop criteria and escalation pathway per protocol.' },
      { label: 'Per-patient risk pre-screen', note: 'Run the Protocol Simulator (epigenetic-age → immune / adverse-event envelope) as a personalised pre-treatment risk read, alongside clinical screening.' },
      { label: 'Long-term follow-up', note: 'Structured follow-up (durability + delayed events); gene/reprogramming products need extended (often 5–15 yr) surveillance.' },
      { label: 'Contraindication screening', note: 'Active infection, active malignancy (for proliferative products), pregnancy, uncontrolled comorbidity, and product-specific exclusions.' },
    ],
  },
];

// Universal steps every administration shares (before the therapy-specific ones).
export const COMMON_PRECHECKS: string[] = [
  'Confirm eligibility against the protocol’s inclusion/exclusion criteria and MDT sign-off.',
  'Informed consent covering benefits, risks, alternatives and the investigational status.',
  'Baseline labs + the relevant screening panel; document comorbidities and current medications.',
  'Two-person identity & product verification (patient ID ↔ ISBT-128 product label ↔ order).',
  'Confirm the product’s release certificate: viability, sterility, endotoxin, identity/potency all within spec.',
  'Emergency readiness — anaphylaxis/resuscitation kit and trained staff present for the infusion/procedure.',
];

export const DISCLAIMER =
  'StemCells Protocol Standard v0.1 — a proposed, open framework for discussion. Doses, intervals, consumables and '
  + 'brands shown are typical published ranges or representative categories, NOT fixed instructions, and MUST be '
  + 'validated against your own institutional protocol, ethics board and national regulator before any clinical use. '
  + 'Established vs investigational status is labelled per protocol. This is not medical advice.';
