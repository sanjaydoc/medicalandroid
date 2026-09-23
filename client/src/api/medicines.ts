// Generic-medicine & price finder + medicine safety checker.
// Curated data for common India medicines: brand -> composition -> generic name,
// rough branded vs generic/Jan Aushadhi price, and conservative interaction/
// duplicate-active checks. Educational only — always confirm with a pharmacist
// or doctor; prices vary by brand, city and pack size.

export interface Active { name: string; cls: string }   // cls = interaction class
export interface Drug {
  generic: string;
  brands: string[];
  actives: Active[];
  branded: string;      // approx branded price (per common pack/strip)
  generprice: string;   // approx generic / Jan Aushadhi price
  jan: boolean;         // typically available at Jan Aushadhi
  note?: string;
}

const A = (name: string, cls: string): Active => ({ name, cls });

export const DRUGS: Drug[] = [
  { generic: 'Paracetamol 500mg', brands: ['dolo', 'crocin', 'calpol', 'pacimol'], actives: [A('paracetamol', 'paracetamol')], branded: '₹30 / 15 tab', generprice: '₹8–12', jan: true },
  { generic: 'Ibuprofen + Paracetamol', brands: ['combiflam', 'brufen plus'], actives: [A('ibuprofen', 'nsaid'), A('paracetamol', 'paracetamol')], branded: '₹45 / 15 tab', generprice: '₹15', jan: true, note: 'Contains paracetamol — don’t add another paracetamol product.' },
  { generic: 'Ibuprofen 400mg', brands: ['brufen'], actives: [A('ibuprofen', 'nsaid')], branded: '₹35', generprice: '₹10', jan: true },
  { generic: 'Aspirin 75mg', brands: ['ecosprin', 'disprin', 'aspirin'], actives: [A('aspirin', 'nsaid'), A('aspirin', 'antiplatelet')], branded: '₹12', generprice: '₹5', jan: true },
  { generic: 'Diclofenac 50mg', brands: ['voveran', 'volini tab'], actives: [A('diclofenac', 'nsaid')], branded: '₹25', generprice: '₹8', jan: true },
  { generic: 'Naproxen 250mg', brands: ['naprosyn'], actives: [A('naproxen', 'nsaid')], branded: '₹60', generprice: '₹20', jan: true },
  { generic: 'Amoxicillin 500mg', brands: ['mox', 'novamox'], actives: [A('amoxicillin', 'penicillin')], branded: '₹60 / 10 cap', generprice: '₹25', jan: true },
  { generic: 'Amoxicillin + Clavulanic acid 625mg', brands: ['augmentin', 'clavam', 'moxikind-cv'], actives: [A('amoxicillin', 'penicillin')], branded: '₹180 / 10', generprice: '₹60–90', jan: true },
  { generic: 'Azithromycin 500mg', brands: ['azithral', 'zithromax', 'azee'], actives: [A('azithromycin', 'macrolide')], branded: '₹75 / 3', generprice: '₹25', jan: true },
  { generic: 'Cefixime 200mg', brands: ['taxim-o', 'cefix', 'zifi'], actives: [A('cefixime', 'cephalosporin')], branded: '₹95 / 10', generprice: '₹35', jan: true },
  { generic: 'Ciprofloxacin 500mg', brands: ['ciplox', 'cifran'], actives: [A('ciprofloxacin', 'quinolone')], branded: '₹55', generprice: '₹18', jan: true },
  { generic: 'Metformin 500mg', brands: ['glycomet', 'gluconorm'], actives: [A('metformin', 'metformin')], branded: '₹25', generprice: '₹8', jan: true },
  { generic: 'Glimepiride 2mg', brands: ['amaryl', 'zoryl'], actives: [A('glimepiride', 'sulfonylurea')], branded: '₹85', generprice: '₹20', jan: true },
  { generic: 'Telmisartan 40mg', brands: ['telma', 'telsartan'], actives: [A('telmisartan', 'arb')], branded: '₹90', generprice: '₹25', jan: true },
  { generic: 'Amlodipine 5mg', brands: ['amlong', 'amlokind', 'stamlo'], actives: [A('amlodipine', 'ccb')], branded: '₹40', generprice: '₹10', jan: true },
  { generic: 'Losartan 50mg', brands: ['losar', 'repace'], actives: [A('losartan', 'arb')], branded: '₹55', generprice: '₹15', jan: true },
  { generic: 'Ramipril 5mg', brands: ['cardace', 'ramistar'], actives: [A('ramipril', 'ace')], branded: '₹70', generprice: '₹20', jan: true },
  { generic: 'Atenolol 50mg', brands: ['aten', 'tenormin'], actives: [A('atenolol', 'betablocker')], branded: '₹25', generprice: '₹8', jan: true },
  { generic: 'Metoprolol 50mg', brands: ['metolar', 'betaloc'], actives: [A('metoprolol', 'betablocker')], branded: '₹45', generprice: '₹15', jan: true },
  { generic: 'Atorvastatin 10mg', brands: ['atorva', 'lipvas', 'storvas'], actives: [A('atorvastatin', 'statin')], branded: '₹75', generprice: '₹15', jan: true },
  { generic: 'Rosuvastatin 10mg', brands: ['rosuvas', 'crestor'], actives: [A('rosuvastatin', 'statin')], branded: '₹110', generprice: '₹25', jan: true },
  { generic: 'Clopidogrel 75mg', brands: ['clopilet', 'plavix', 'deplatt'], actives: [A('clopidogrel', 'antiplatelet')], branded: '₹95', generprice: '₹25', jan: true },
  { generic: 'Warfarin 5mg', brands: ['warf', 'sofarin'], actives: [A('warfarin', 'anticoagulant')], branded: '₹60', generprice: '₹20', jan: true, note: 'Needs regular INR blood tests.' },
  { generic: 'Acenocoumarol 2mg', brands: ['acitrom'], actives: [A('acenocoumarol', 'anticoagulant')], branded: '₹55', generprice: '—', jan: false, note: 'Needs regular INR blood tests.' },
  { generic: 'Pantoprazole 40mg', brands: ['pan', 'pantop', 'pantocid'], actives: [A('pantoprazole', 'ppi')], branded: '₹95', generprice: '₹18', jan: true },
  { generic: 'Omeprazole 20mg', brands: ['omez', 'ocid'], actives: [A('omeprazole', 'ppi')], branded: '₹60', generprice: '₹12', jan: true },
  { generic: 'Rabeprazole 20mg', brands: ['razo', 'rabekind'], actives: [A('rabeprazole', 'ppi')], branded: '₹90', generprice: '₹20', jan: true },
  { generic: 'Famotidine 20mg', brands: ['famocid'], actives: [A('famotidine', 'h2')], branded: '₹40', generprice: '₹12', jan: true },
  { generic: 'Domperidone 10mg', brands: ['domstal', 'motilium'], actives: [A('domperidone', 'prokinetic')], branded: '₹40', generprice: '₹12', jan: true },
  { generic: 'Ondansetron 4mg', brands: ['emeset', 'vomikind'], actives: [A('ondansetron', 'antiemetic')], branded: '₹45', generprice: '₹15', jan: true },
  { generic: 'Cetirizine 10mg', brands: ['cetzine', 'alerid', 'okacet'], actives: [A('cetirizine', 'antihistamine')], branded: '₹30', generprice: '₹8', jan: true },
  { generic: 'Levocetirizine 5mg', brands: ['levocet', 'xyzal'], actives: [A('levocetirizine', 'antihistamine')], branded: '₹45', generprice: '₹12', jan: true },
  { generic: 'Montelukast 10mg', brands: ['montair', 'montek'], actives: [A('montelukast', 'leukotriene')], branded: '₹110', generprice: '₹30', jan: true },
  { generic: 'Levothyroxine 50mcg', brands: ['thyronorm', 'eltroxin'], actives: [A('levothyroxine', 'thyroid')], branded: '₹120 / 120 tab', generprice: '₹40', jan: true, note: 'Take on an empty stomach; keep the same brand if possible.' },
  { generic: 'Sildenafil 50mg', brands: ['sildigra', 'penegra'], actives: [A('sildenafil', 'pde5')], branded: '₹150', generprice: '₹40', jan: false },
  { generic: 'Tramadol + Paracetamol', brands: ['ultracet', 'domadol'], actives: [A('tramadol', 'opioid'), A('paracetamol', 'paracetamol')], branded: '₹80', generprice: '₹30', jan: false, note: 'Contains paracetamol and an opioid.' },
  { generic: 'Alprazolam 0.5mg', brands: ['alprax', 'restyl'], actives: [A('alprazolam', 'benzo')], branded: '₹35', generprice: '₹12', jan: false, note: 'Habit-forming; short courses only.' },
  { generic: 'Sertraline 50mg', brands: ['zoloft', 'daxid'], actives: [A('sertraline', 'ssri')], branded: '₹95', generprice: '₹25', jan: true },
  { generic: 'Escitalopram 10mg', brands: ['nexito', 'cipralex'], actives: [A('escitalopram', 'ssri')], branded: '₹90', generprice: '₹25', jan: true },
  { generic: 'Salbutamol inhaler', brands: ['asthalin', 'ventorlin'], actives: [A('salbutamol', 'saba')], branded: '₹150', generprice: '₹65', jan: true },
];

export function lookupDrug(q: string): Drug | undefined {
  const s = q.toLowerCase().trim();
  if (!s) return undefined;
  return (
    DRUGS.find((d) => d.brands.some((b) => s.includes(b) || b.includes(s))) ||
    DRUGS.find((d) => d.generic.toLowerCase().includes(s) || s.includes(d.generic.toLowerCase().split(' ')[0])) ||
    DRUGS.find((d) => d.actives.some((a) => s.includes(a.name)))
  );
}

// ---- Interaction rules (conservative; class-pair based) ----
export interface Rule { a: string; b: string; severity: 'high' | 'moderate'; note: string }
const RULES: Rule[] = [
  { a: 'anticoagulant', b: 'nsaid', severity: 'high', note: 'Blood-thinner + painkiller (NSAID) — raised bleeding risk. Ask your doctor.' },
  { a: 'anticoagulant', b: 'antiplatelet', severity: 'high', note: 'Blood-thinner + aspirin/clopidogrel — raised bleeding risk.' },
  { a: 'antiplatelet', b: 'nsaid', severity: 'moderate', note: 'Aspirin/clopidogrel + NSAID — bleeding/stomach risk.' },
  { a: 'nitrate', b: 'pde5', severity: 'high', note: 'Nitrates + sildenafil — can cause a dangerous drop in blood pressure.' },
  { a: 'opioid', b: 'benzo', severity: 'high', note: 'Opioid (tramadol) + sedative (alprazolam/diazepam) — heavy sedation/breathing risk.' },
  { a: 'ssri', b: 'opioid', severity: 'moderate', note: 'SSRI + tramadol — small risk of serotonin syndrome.' },
  { a: 'ace', b: 'nsaid', severity: 'moderate', note: 'ACE inhibitor + NSAID — can affect kidneys and blood pressure.' },
  { a: 'arb', b: 'nsaid', severity: 'moderate', note: 'BP medicine (ARB) + NSAID — can affect kidneys and blood pressure.' },
  { a: 'antiplatelet', b: 'ppi', severity: 'moderate', note: 'Clopidogrel + omeprazole may reduce clopidogrel’s effect — pantoprazole is usually preferred.' },
];

export interface SafetyIssue { severity: 'high' | 'moderate'; title: string; note: string }

export function checkSafety(meds: Drug[]): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  // duplicate active ingredients
  const byActive = new Map<string, string[]>();
  meds.forEach((m) => m.actives.forEach((a) => {
    const arr = byActive.get(a.name) || [];
    arr.push(m.generic);
    byActive.set(a.name, arr);
  }));
  byActive.forEach((names, active) => {
    const uniq = Array.from(new Set(names));
    if (uniq.length > 1) {
      issues.push({
        severity: active === 'paracetamol' ? 'high' : 'moderate',
        title: `Duplicate ingredient: ${active}`,
        note: `${uniq.join(' and ')} both contain ${active}. Taking them together can mean too much ${active}${active === 'paracetamol' ? ' — risk of overdose' : ''}. Check with a pharmacist.`,
      });
    }
  });
  // interaction pairs (special-case clopidogrel+omeprazole only, not all PPIs)
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      const c1 = new Set(meds[i].actives.map((a) => a.cls));
      const c2 = new Set(meds[j].actives.map((a) => a.cls));
      for (const r of RULES) {
        const hit = (c1.has(r.a) && c2.has(r.b)) || (c1.has(r.b) && c2.has(r.a));
        if (!hit) continue;
        // clopidogrel+PPI rule: only omeprazole matters
        if (r.a === 'antiplatelet' && r.b === 'ppi') {
          const hasOme = [meds[i], meds[j]].some((m) => m.actives.some((a) => a.name === 'omeprazole'));
          const hasClop = [meds[i], meds[j]].some((m) => m.actives.some((a) => a.name === 'clopidogrel'));
          if (!(hasOme && hasClop)) continue;
        }
        issues.push({ severity: r.severity, title: `${meds[i].generic.split(' ')[0]} + ${meds[j].generic.split(' ')[0]}`, note: r.note });
      }
    }
  }
  // de-dup
  const seen = new Set<string>();
  return issues.filter((x) => { const k = x.title + x.note; if (seen.has(k)) return false; seen.add(k); return true; });
}

export interface MedicineData { query: string; generic?: string }  // stored per medicine
