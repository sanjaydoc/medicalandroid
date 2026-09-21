// Client-side disease catalogue for the in-chat simulator — mirrors the local
// backend's disease → tissue/capsid mapping (app/catalog/diseases.py) so the
// run picks the same reprogramming efficiency, delivery and proliferation class.

export type Modality = 'reprogramming' | 'cell';

export interface DiseaseEntry {
  key: string;
  disease: string;
  department: string;
  tissue_key: string;   // drives efficiency, capsid, tumour proliferation
  tissue: string;       // human label
  capsid: string;       // AAV serotype
  route: string;        // delivery route
  modality: Modality;   // 'reprogramming' (OSK / age-reversal) vs 'cell' (MSC/exosome therapy)
}

// Which therapies get the reprogramming treatment (age reversal + OSK construct +
// "Reprogramming cycles" + tumorigenicity envelope) vs the cell-therapy treatment
// (regeneration projection + IV exosome carrier + "Stem-cell therapy cycles", no
// tumorigenicity step). Per the founder's spec: the Age-Rejuvenation department
// therapies are the reprogramming set; everything else is cell therapy.
export function modalityOf(department: string): Modality {
  return department === 'Age Rejuvenation' ? 'reprogramming' : 'cell';
}
export const isReprogramming = (d: { modality?: Modality; department?: string } | null | undefined): boolean =>
  (d?.modality ?? (d?.department ? modalityOf(d.department) : 'cell')) === 'reprogramming';

// tissue_key → (tissue label, capsid, route) — from TISSUE_PRESETS.
const PRESET: Record<string, { tissue: string; capsid: string; route: string }> = {
  retina: { tissue: 'Retina (intravitreal)', capsid: 'aav2', route: 'Intravitreal injection' },
  cns: { tissue: 'CNS (crosses BBB)', capsid: 'aav9', route: 'Intrathecal / systemic' },
  systemic: { tissue: 'Systemic / blood', capsid: 'aav9', route: 'IV infusion' },
  immune: { tissue: 'Immune (ex-vivo HSC/T-cell)', capsid: 'aavdj', route: 'Ex-vivo then IV' },
  joint: { tissue: 'Joint (intra-articular)', capsid: 'aav5', route: 'Intra-articular' },
  liver: { tissue: 'Liver', capsid: 'aav8', route: 'IV infusion' },
  lung: { tissue: 'Airway / lung', capsid: 'aav6', route: 'Inhaled / IV' },
  heart: { tissue: 'Myocardium', capsid: 'aav9', route: 'Intracoronary' },
  skin: { tissue: 'Skin / local', capsid: 'aavdj', route: 'Local injection' },
  pancreas: { tissue: 'Pancreatic islet', capsid: 'aav8', route: 'IV / intra-ductal' },
  gut: { tissue: 'Gut mucosa', capsid: 'aav9', route: 'Local / IV' },
  bone: { tissue: 'Bone / dental', capsid: 'aav5', route: 'Local implant' },
  kidney: { tissue: 'Kidney (tubule / glomerulus)', capsid: 'aav9', route: 'IV infusion' },
  muscle: { tissue: 'Skeletal muscle', capsid: 'aav9', route: 'IV infusion' },
};

// (disease, department, tissue_key) — the diseases the manual simulator offers.
const RAW: [string, string, string][] = [
  ['Persona Reversal Epigenetic Reprogramming', 'Age Rejuvenation', 'systemic'],
  ['Systemic MSC Infusion', 'Age Rejuvenation', 'systemic'],
  ['Exosome IV Longevity', 'Age Rejuvenation', 'systemic'],
  ['Immune (Thymic) Rejuvenation', 'Age Rejuvenation', 'immune'],
  ['Senolytic + MSC Program', 'Age Rejuvenation', 'systemic'],
  ['Type 1 Diabetes', 'Diabetes', 'pancreas'],
  ['Type 2 Diabetes', 'Diabetes', 'pancreas'],
  ["Alzheimer's Disease (neural reprogramming)", 'Neurology', 'cns'],
  ["Parkinson's iPSC Dopaminergic", 'Neurology', 'cns'],
  ['Multiple Sclerosis aHSCT', 'Neurology', 'cns'],
  ['Stroke Recovery MSC', 'Neurology', 'cns'],
  ['Spinal Cord Injury NSC', 'Neurology', 'cns'],
  ['ALS / MND MSC Therapy', 'Neurology', 'cns'],
  ['Ankylosing Spondylitis', 'Autoimmune', 'immune'],
  ['Rheumatoid Arthritis', 'Autoimmune', 'immune'],
  ['Systemic Lupus Erythematosus (SLE)', 'Autoimmune', 'immune'],
  ['CCR5-Δ32 Stem-Cell Transplant', 'HIV', 'immune'],
  ['Liver Cirrhosis MSC Therapy', 'Gastroenterology', 'liver'],
  ['Chronic Kidney Disease (CKD) MSC Therapy', 'Nephrology', 'kidney'],
  ['Acute Kidney Injury (AKI) MSC Therapy', 'Nephrology', 'kidney'],
  ['Diabetic Kidney Disease Exosome Therapy', 'Nephrology', 'kidney'],
  ['Cardiac MSC Regeneration', 'Cardiology', 'heart'],
  ['COPD / Lung Regeneration', 'Pulmonology', 'lung'],
  ['Osteoarthritis MSC (Intra-articular)', 'Orthopedics', 'joint'],
  ['Skin / Anti-ageing Exosome', 'Cosmetic', 'skin'],
];

export const CATALOG: DiseaseEntry[] = RAW.map(([disease, department, tk]) => {
  const p = PRESET[tk] || PRESET.systemic;
  return {
    key: disease.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    disease, department, tissue_key: tk, tissue: p.tissue, capsid: p.capsid, route: p.route,
    modality: modalityOf(department),
  };
});

export const DEPARTMENTS = Array.from(new Set(CATALOG.map((d) => d.department)));
export const DEFAULT_DISEASE = CATALOG[0];
