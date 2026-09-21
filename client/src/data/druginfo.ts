// Offline drug reference — bundled with the app so Offline mode can GROUND its
// answers (retrieval-augmented) and cite a source, instead of relying on the
// model's memory for doses.
//
// ⚠️ CLINICAL DATA — VERIFY BEFORE THE PILOT. This is a STARTER set of common
// WHO Essential Medicines with standard adult dosing, compiled for the plumbing.
// A qualified clinician (Dr. Sanjay Anbu, MBBS) must review, correct and EXPAND
// every entry against the current WHO Model List of Essential Medicines and the
// local formulary before real patient use. Doses are typical adult ranges and are
// NOT a prescription — always adjust for the individual, renal/hepatic function,
// pregnancy, allergies and local guidance.
//
// Format is deliberately flat/plain so lexical retrieval (see api/rag.ts) is
// reliable and a clinician can edit it without touching code.

export interface DrugEntry {
  name: string;
  aka: string[];          // brand / alternate names / spellings for matching
  cls: string;            // drug class
  uses: string;           // main indications
  adultDose: string;      // typical adult dose (VERIFY)
  route?: string;
  precautions: string;    // key cautions / contraindications
  interactions: string;   // notable interactions
  source: string;         // citation
}

export const DRUG_SOURCE = 'WHO Model List of Essential Medicines (starter set — verify locally)';

export const DRUG_KB: DrugEntry[] = [
  {
    name: 'Paracetamol', aka: ['acetaminophen', 'crocin', 'panadol', 'calpol'],
    cls: 'Analgesic / antipyretic',
    uses: 'Pain and fever.',
    adultDose: '500–1000 mg every 4–6 h as needed; max 4 g in 24 h (3 g if low body weight, elderly, alcohol use or liver disease).',
    precautions: 'Liver disease / heavy alcohol use — lower max dose; overdose causes serious liver injury.',
    interactions: 'Additive with other paracetamol-containing products (many cold/flu combos); warfarin (monitor with regular use).',
    source: 'WHO EML — analgesics',
  },
  {
    name: 'Ibuprofen', aka: ['brufen', 'advil', 'nurofen'],
    cls: 'NSAID',
    uses: 'Pain, fever, inflammation.',
    adultDose: '200–400 mg every 4–6 h with food; max 1200 mg/day OTC (up to 2400 mg/day under medical supervision).',
    precautions: 'Avoid in peptic ulcer, significant kidney disease, heart failure, 3rd-trimester pregnancy; take with food.',
    interactions: 'Other NSAIDs, anticoagulants (bleeding), ACE inhibitors/ARBs + diuretics (kidney), lithium, methotrexate.',
    source: 'WHO EML — NSAIDs',
  },
  {
    name: 'Amoxicillin', aka: ['amox', 'mox', 'amoxil'],
    cls: 'Penicillin antibiotic',
    uses: 'Bacterial infections — chest, ENT, urinary, dental.',
    adultDose: '250–500 mg every 8 h (or 500–875 mg every 12 h) for 5–7 days depending on infection.',
    precautions: 'Penicillin allergy — do NOT use. Reduce dose in severe renal impairment.',
    interactions: 'Allopurinol (rash), methotrexate, oral typhoid vaccine; may reduce oral contraceptive reliability (use backup).',
    source: 'WHO EML — antibacterials (Access group)',
  },
  {
    name: 'Amoxicillin + clavulanic acid', aka: ['co-amoxiclav', 'augmentin', 'clavulanate'],
    cls: 'Penicillin + beta-lactamase inhibitor',
    uses: 'Resistant/mixed bacterial infections.',
    adultDose: '500/125 mg every 8 h, or 875/125 mg every 12 h, with food.',
    precautions: 'Penicillin allergy — avoid. Higher risk of diarrhoea and (rarely) liver effects than plain amoxicillin.',
    interactions: 'As amoxicillin; caution with anticoagulants.',
    source: 'WHO EML — antibacterials',
  },
  {
    name: 'Azithromycin', aka: ['azee', 'zithromax', 'azithro'],
    cls: 'Macrolide antibiotic',
    uses: 'Chest/ENT infections, some STIs, atypical infections.',
    adultDose: '500 mg once daily for 3 days, or 500 mg day 1 then 250 mg daily days 2–5.',
    precautions: 'Caution in significant heart-rhythm (QT) risk, severe liver disease.',
    interactions: 'QT-prolonging drugs, warfarin, antacids (separate dosing).',
    source: 'WHO EML — antibacterials (Watch group)',
  },
  {
    name: 'Ciprofloxacin', aka: ['cipro', 'ciplox'],
    cls: 'Fluoroquinolone antibiotic',
    uses: 'Urinary, GI and some respiratory infections.',
    adultDose: '250–500 mg every 12 h for 5–7 days (per infection).',
    precautions: 'Avoid in children/pregnancy where possible; tendon rupture risk; QT prolongation; avoid dairy/antacids at the same time.',
    interactions: 'Antacids, iron/zinc/calcium (separate by 2 h), theophylline, warfarin, tizanidine.',
    source: 'WHO EML — antibacterials (Watch group)',
  },
  {
    name: 'Metronidazole', aka: ['flagyl', 'metrogyl'],
    cls: 'Nitroimidazole antibiotic/antiprotozoal',
    uses: 'Anaerobic infections, amoebiasis, giardiasis, bacterial vaginosis.',
    adultDose: '400 mg every 8 h for 5–7 days (indication-dependent).',
    precautions: 'Do NOT drink alcohol during and for 48 h after (severe reaction).',
    interactions: 'Alcohol (disulfiram-like reaction), warfarin, lithium.',
    source: 'WHO EML — antibacterials/antiprotozoals',
  },
  {
    name: 'Co-trimoxazole', aka: ['sulfamethoxazole trimethoprim', 'bactrim', 'septran', 'tmp-smx'],
    cls: 'Sulfonamide + trimethoprim',
    uses: 'UTIs, some chest infections, PCP prophylaxis.',
    adultDose: '960 mg (800/160) every 12 h.',
    precautions: 'Sulfa allergy — avoid. Caution in renal impairment, folate deficiency, pregnancy.',
    interactions: 'Warfarin, methotrexate, ACE inhibitors/ARBs + potassium (hyperkalaemia).',
    source: 'WHO EML — antibacterials',
  },
  {
    name: 'Oral Rehydration Salts', aka: ['ors', 'oral rehydration solution', 'rehydration'],
    cls: 'Rehydration',
    uses: 'Diarrhoea and dehydration.',
    adultDose: 'One sachet in the stated volume of clean water; drink small amounts frequently; ~200–400 mL after each loose stool.',
    precautions: 'Use clean/boiled water; seek care for severe dehydration, blood in stool, or no improvement.',
    interactions: 'None significant.',
    source: 'WHO EML — oral rehydration',
  },
  {
    name: 'Zinc sulfate', aka: ['zinc'],
    cls: 'Mineral supplement',
    uses: 'Adjunct in childhood diarrhoea; deficiency.',
    adultDose: 'Childhood diarrhoea: 20 mg/day for 10–14 days (10 mg/day if <6 months).',
    precautions: 'Take with ORS for diarrhoea.',
    interactions: 'Reduces absorption of some antibiotics (quinolones, tetracyclines) — separate dosing.',
    source: 'WHO EML — diarrhoea',
  },
  {
    name: 'Artemether + lumefantrine', aka: ['coartem', 'act', 'al', 'artemisinin combination'],
    cls: 'Antimalarial (ACT)',
    uses: 'Uncomplicated Plasmodium falciparum malaria.',
    adultDose: 'Weight-based 6-dose course over 3 days (e.g. ≥35 kg: 4 tablets at 0, 8, 24, 36, 48, 60 h); take with fatty food.',
    precautions: 'Confirm malaria first where possible; not for severe malaria (use parenteral artesunate); QT caution.',
    interactions: 'Other QT-prolonging drugs, strong CYP3A4 inhibitors/inducers.',
    source: 'WHO malaria treatment guidelines / EML',
  },
  {
    name: 'Albendazole', aka: ['zentel', 'albenza'],
    cls: 'Anthelmintic',
    uses: 'Intestinal worms.',
    adultDose: '400 mg single dose (repeat in 2–3 weeks for some worms).',
    precautions: 'Avoid in first trimester of pregnancy.',
    interactions: 'Few; dexamethasone/cimetidine raise levels.',
    source: 'WHO EML — anthelmintics',
  },
  {
    name: 'Metformin', aka: ['glucophage', 'glycomet'],
    cls: 'Biguanide (antidiabetic)',
    uses: 'Type 2 diabetes.',
    adultDose: 'Start 500 mg once–twice daily with meals; titrate; usual 1–2 g/day, max 2–3 g/day.',
    precautions: 'Avoid in significant renal impairment; stop before contrast imaging/surgery; risk of lactic acidosis.',
    interactions: 'Alcohol, iodinated contrast, drugs affecting kidney function.',
    source: 'WHO EML — antidiabetics',
  },
  {
    name: 'Amlodipine', aka: ['amlong', 'norvasc'],
    cls: 'Calcium-channel blocker',
    uses: 'Hypertension, angina.',
    adultDose: '5 mg once daily; up to 10 mg once daily.',
    precautions: 'Ankle swelling common; caution in severe aortic stenosis.',
    interactions: 'Simvastatin (limit dose), strong CYP3A4 inhibitors.',
    source: 'WHO EML — antihypertensives',
  },
  {
    name: 'Hydrochlorothiazide', aka: ['hctz', 'hydrochlorthiazide'],
    cls: 'Thiazide diuretic',
    uses: 'Hypertension, oedema.',
    adultDose: '12.5–25 mg once daily in the morning.',
    precautions: 'Can lower potassium/sodium, raise glucose/urate; caution in gout, diabetes.',
    interactions: 'NSAIDs (reduce effect), lithium, other antihypertensives.',
    source: 'WHO EML — diuretics',
  },
  {
    name: 'Losartan', aka: ['cozaar', 'losar'],
    cls: 'ARB (angiotensin receptor blocker)',
    uses: 'Hypertension, diabetic kidney protection.',
    adultDose: '50 mg once daily; up to 100 mg/day.',
    precautions: 'Avoid in pregnancy; caution in renal artery stenosis, high potassium.',
    interactions: 'Potassium supplements, NSAIDs, lithium.',
    source: 'WHO EML — antihypertensives',
  },
  {
    name: 'Omeprazole', aka: ['omez', 'prilosec', 'ppi'],
    cls: 'Proton-pump inhibitor',
    uses: 'Acid reflux, ulcers, gastritis.',
    adultDose: '20–40 mg once daily before breakfast, usually 4–8 weeks.',
    precautions: 'Long-term use: B12/magnesium, fracture risk; rule out red-flag symptoms.',
    interactions: 'Clopidogrel (reduced effect), some antifungals/HIV drugs.',
    source: 'WHO EML — GI',
  },
  {
    name: 'Salbutamol', aka: ['albuterol', 'ventolin', 'asthalin', 'inhaler'],
    cls: 'Short-acting beta-2 agonist',
    uses: 'Asthma / wheeze relief.',
    adultDose: 'Inhaler 100–200 mcg (1–2 puffs) as needed, up to 4 times daily; use a spacer.',
    precautions: 'Frequent need = poor control (seek review); caution in heart disease, low potassium.',
    interactions: 'Non-selective beta-blockers (avoid), diuretics (potassium).',
    source: 'WHO EML — respiratory',
  },
  {
    name: 'Cetirizine', aka: ['zyrtec', 'alerid'],
    cls: 'Antihistamine (2nd generation)',
    uses: 'Allergies, urticaria, allergic rhinitis.',
    adultDose: '10 mg once daily.',
    precautions: 'May cause mild drowsiness; reduce dose in renal impairment.',
    interactions: 'Additive sedation with alcohol/sedatives.',
    source: 'WHO EML — antiallergics',
  },
  {
    name: 'Prednisolone', aka: ['prednisone', 'steroid'],
    cls: 'Corticosteroid',
    uses: 'Inflammatory/allergic conditions, asthma exacerbation.',
    adultDose: 'Varies widely by condition (e.g. asthma exacerbation 40 mg once daily for 5 days); take with food in the morning.',
    precautions: 'Do not stop suddenly after prolonged use; raises glucose/BP, infection risk.',
    interactions: 'NSAIDs (ulcer), diuretics (potassium), vaccines, diabetes drugs.',
    source: 'WHO EML — corticosteroids',
  },
  {
    name: 'Ferrous sulfate', aka: ['iron', 'iron tablet', 'ferrous'],
    cls: 'Iron supplement',
    uses: 'Iron-deficiency anaemia.',
    adultDose: 'Treatment ~ elemental iron 100–200 mg/day (e.g. ferrous sulfate 200 mg 2–3 times daily); take with vitamin C, away from tea.',
    precautions: 'GI upset/black stools common; keep away from children (overdose dangerous).',
    interactions: 'Reduces absorption of quinolones, tetracyclines, levothyroxine — separate by 2 h.',
    source: 'WHO EML — antianaemia',
  },
  {
    name: 'Folic acid', aka: ['folate', 'vitamin b9'],
    cls: 'Vitamin',
    uses: 'Pregnancy (neural-tube prevention), deficiency, with some anaemias.',
    adultDose: 'Pregnancy prevention 400 mcg/day (higher if high risk); deficiency 5 mg/day.',
    precautions: 'Exclude B12 deficiency before high-dose long-term use.',
    interactions: 'Some anticonvulsants, methotrexate.',
    source: 'WHO EML — vitamins',
  },
  {
    name: 'Diclofenac', aka: ['voveran', 'voltaren'],
    cls: 'NSAID',
    uses: 'Pain and inflammation.',
    adultDose: '50 mg 2–3 times daily with food (max ~150 mg/day), short-term.',
    precautions: 'Higher cardiovascular risk among NSAIDs; avoid in ulcer, kidney/heart disease, late pregnancy.',
    interactions: 'Anticoagulants, other NSAIDs, ACE inhibitors/ARBs + diuretics, lithium.',
    source: 'WHO EML — NSAIDs',
  },
  {
    name: 'Dexamethasone', aka: ['dexa'],
    cls: 'Corticosteroid (potent)',
    uses: 'Severe inflammation/allergy, croup, some emergencies.',
    adultDose: 'Highly indication-dependent (e.g. 4–8 mg/day); specialist/guideline-directed.',
    precautions: 'As corticosteroids; potent — use lowest effective dose, taper after prolonged use.',
    interactions: 'NSAIDs, diabetes drugs, CYP3A4 inhibitors/inducers, vaccines.',
    source: 'WHO EML — corticosteroids',
  },
];
