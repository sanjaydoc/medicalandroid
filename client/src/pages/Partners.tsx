import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, saveRow } from '../api/supabase';

/* ============================================================================
   MedDroid Transformer — Partner console.
   One workspace that morphs (flip-clock style) into any hospital system a
   partner already runs (HIS, EMR, PACS, LIS…), showing the real modules each
   category has — then layers MedDroid's own patient wedge on top:
   "explain my report in Hindi", which none of those systems do.
   Explore freely; sign in only to input real data, customise, or lock an
   instance to a purpose.
   ========================================================================== */

const AR = '<span class="ar"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>';
const tile = (v: string, l: string, s?: string) =>
  `<div class="tile"><div class="v">${v}</div><div class="l">${l}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
const pipe = (label: string, nodes: string[]) =>
  `<div class="pipe"><span class="pl">${label}</span>${nodes.map((n) => `<span class="node">${n}</span>`).join(AR)}<span class="live"><span class="d"></span>LIVE</span></div>`;
const mods = (items: string[]) =>
  `<div class="panel"><h3>Modules & features</h3><div class="mlist">${items
    .map((m) => `<div class="mrow"><span class="mck"><svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></svg></span>${m}</div>`)
    .join('')}</div></div>`;
const MD = '<span class="md-chip"><span class="r"></span>MedDroid · Explain in Hindi</span>';

type Sys = {
  name: string; full: string; cat: string;
  render: () => string; after?: (root: HTMLElement) => void;
};

const SYS: Record<string, Sys> = {
  /* ---------------- Core clinical ---------------- */
  his: {
    name: 'HIS', full: 'Hospital Information System', cat: 'Core clinical',
    render: () => `
     ${pipe('ABDM / HL7', ['Registration', 'ADT feed', 'Billing', 'Napier HIS core'])}
     <div class="kpis">${tile('218/300', 'Beds occupied', '73% capacity')}${tile('47', 'Admissions today', '+6 vs avg')}${tile('₹4.2L', 'Pending bills', '128 invoices')}${tile('3.6d', 'Avg length of stay', '↓ 0.3d')}</div>
     <div class="cols">
       <div class="panel"><h3>Admissions <span class="c">live ADT</span></h3>
        <div class="tblwrap"><table><thead><tr><th>Patient</th><th>ABHA</th><th>Ward</th><th>Status</th></tr></thead><tbody>
         <tr><td>Rajesh Kumar · 54M</td><td>••••-1234</td><td>ICU-2</td><td><span class="st bad">Critical</span></td></tr>
         <tr><td>Meena Iyer · 31F</td><td>••••-8890</td><td>Maternity</td><td><span class="st ok">Stable</span></td></tr>
         <tr><td>Arjun Rao · 8M</td><td>••••-4521</td><td>Peds</td><td><span class="st warn">Observation</span></td></tr>
         <tr><td>Fatima S. · 67F</td><td>••••-3077</td><td>Gen-A</td><td><span class="st ok">Stable</span></td></tr>
        </tbody></table></div>
       </div>
       ${mods(['Registration & ADT (admission/discharge/transfer)', 'Bed, ward & OT management', 'Billing + cashless TPA claims', 'Nursing & ward workflow', 'In-house pharmacy & inventory', 'MRD + management dashboards'])}
     </div>`,
  },
  emr: {
    name: 'EMR / EHR', full: 'Electronic Medical Records', cat: 'Core clinical',
    render: () => `
     ${pipe('ABDM–FHIR', ['ABHA lookup', 'FHIR bundle', 'Medixcel EMR'])}
     <div class="kpis">${tile('1,284', 'Active patients', '')}${tile('63', 'Notes today', '')}${tile('912', 'ABHA linked', '71%')}${tile('4', 'Allergy alerts', '')}</div>
     <div class="cols">
       <div class="panel"><h3>Rajesh Kumar · 54M <span class="c">ABHA ••••-1234</span></h3>
        <div class="tblwrap"><table><tbody>
         <tr><td>Allergies</td><td><span class="st bad">Penicillin</span></td></tr>
         <tr><td>Problems</td><td>Type-2 Diabetes · Hypertension</td></tr>
         <tr><td>Last HbA1c</td><td>8.1% <span class="st warn">High</span></td></tr>
         <tr><td>BP (today)</td><td>148/92 mmHg</td></tr>
        </tbody></table></div>
       </div>
       ${mods(['Problem list, allergies & med reconciliation', 'SOAP notes + templates & voice', 'Order sets & care plans', 'Growth / vitals charts', 'Lab & imaging results inbox', 'ABDM health-record linking'])}
     </div>`,
  },
  cpoe: {
    name: 'CPOE', full: 'CPOE / e-Prescribing', cat: 'Core clinical',
    render: () => `
     ${pipe('Order → Pharmacy', ['CPOE entry', 'Interaction check', 'e-sign', 'LIS / Pharmacy'])}
     <div class="kpis">${tile('312', 'Orders today', '')}${tile('9', 'Interactions caught', '')}${tile('38s', 'Avg order time', '')}${tile('100%', 'e-signed', '')}</div>
     <div class="cols">
       <div class="panel"><h3>New order <span class="c">draft</span></h3>
        <div class="list">
         <div class="li"><div class="ic">🧪</div><div class="g">CBC + HbA1c<small>Routine · to LIS</small></div><span class="st info">Draft</span></div>
         <div class="li"><div class="ic">💊</div><div class="g">Amoxicillin 500mg<small>TID × 5d</small></div><span class="st bad">Allergy!</span></div>
         <div class="li"><div class="ic">💊</div><div class="g">Insulin Glargine 10U<small>bedtime</small></div><span class="st ok">OK</span></div>
        </div>
        <div class="note"><span class="st bad">⚠ Interaction</span> Penicillin allergy on chart blocks Amoxicillin.</div>
       </div>
       ${mods(['Condition-based order sets', 'Real-time drug–drug & allergy checks', 'Weight-based dose calculator', 'Formulary & generic substitution', 'Digital signature & audit trail', 'Auto-routing to LIS / RIS / pharmacy'])}
     </div>`,
  },
  cdss: {
    name: 'CDSS', full: 'Clinical Decision Support / AI', cat: 'Core clinical',
    render: () => `
     ${pipe('AI on chart', ['EMR + labs', 'Risk models', 'Guidance'])}
     <div class="kpis">${tile('27', 'Active alerts', '')}${tile('6', 'High-risk flags', '')}${tile('72%', 'CVD risk (this pt)', '')}${tile('14', 'Guideline hits', '')}</div>
     <div class="cols">
       <div class="panel"><h3>Suggested differentials <span class="c">this patient</span></h3>
        <div class="list">
         <div class="li"><div class="ic">1</div><div class="g">Uncontrolled T2DM<small>evidence: HbA1c trend</small></div><span class="st bad">88%</span></div>
         <div class="li"><div class="ic">2</div><div class="g">Diabetic nephropathy<small>check ACR</small></div><span class="st warn">54%</span></div>
         <div class="li"><div class="ic">3</div><div class="g">Statin non-adherence<small>refill gap</small></div><span class="st info">31%</span></div>
        </div>
       </div>
       ${mods(['Risk scores (CVD, sepsis, readmission)', 'Differential-diagnosis suggestions', 'Early-warning / deterioration alerts', 'Imaging AI triage (qure.ai, Predible)', 'Guideline & drug-advisory links', 'Duplicate-order & dose warnings'])}
     </div>`,
  },
  /* ---------------- Diagnostics ---------------- */
  lis: {
    name: 'LIS / LIMS', full: 'Laboratory Information System', cat: 'Diagnostics',
    render: () => `
     ${pipe('Sample → Result', ['Barcode', 'Analyzer', 'Auto-verify', 'FHIR → ABDM'])}
     <div class="kpis">${tile('142', 'Samples today', '')}${tile('7', 'Pending verify', '')}${tile('3', 'Critical flags', '')}${tile('11m', 'Avg TAT', '↓ 2m')}</div>
     <div class="cols">
       <div class="panel"><h3>Worklist <span class="c">CrelioHealth</span></h3>
        <div class="tblwrap"><table><thead><tr><th>Sample</th><th>Test</th><th>Status</th></tr></thead><tbody>
         <tr><td>S-2291</td><td>CBC</td><td><span class="st ok">Verified</span></td></tr>
         <tr><td>S-2292</td><td>LFT</td><td><span class="st warn">Running</span></td></tr>
         <tr><td>S-2293</td><td>Troponin</td><td><span class="st bad">Critical</span></td></tr>
        </tbody></table></div>
       </div>
       ${mods(['Sample accessioning & barcoding', 'Analyzer interfacing (ASTM / HL7)', 'QC — Levey-Jennings & Westgard', 'Auto-verification & delta checks', 'Critical-value alerts', 'Report dispatch (print / WhatsApp / ABDM)'])}
     </div>`,
  },
  ris: {
    name: 'RIS', full: 'Radiology Information System', cat: 'Diagnostics',
    render: () => `
     ${pipe('Order → Report', ['CPOE order', 'Modality (DMWL)', 'RIS worklist', 'Report'])}
     <div class="kpis">${tile('38', 'Studies today', '')}${tile('9', 'Awaiting read', '')}${tile('2', 'STAT', '')}${tile('26m', 'Report TAT', '')}</div>
     <div class="cols">
       <div class="panel"><h3>Radiology worklist</h3>
        <div class="tblwrap"><table><thead><tr><th>Patient</th><th>Modality</th><th>Study</th><th>Status</th></tr></thead><tbody>
         <tr><td>Rajesh Kumar</td><td>CR</td><td>Chest PA</td><td><span class="st warn">Reading</span></td></tr>
         <tr><td>Sunita D.</td><td>CT</td><td>Head plain</td><td><span class="st bad">STAT</span></td></tr>
         <tr><td>Imran K.</td><td>MRI</td><td>L-spine</td><td><span class="st info">Queued</span></td></tr>
         <tr><td>Lakshmi R.</td><td>US</td><td>Abdomen</td><td><span class="st ok">Reported</span></td></tr>
        </tbody></table></div>
       </div>
       ${mods(['Modality worklist (DICOM DMWL)', 'Scheduling & technologist workflow', 'Structured reporting + voice dictation', 'Peer review & addendums', 'Radiation dose tracking', 'Result push to EMR / referrer'])}
     </div>`,
  },
  pacs: {
    name: 'PACS', full: 'Picture Archiving & Communication', cat: 'Diagnostics',
    render: () => `
     ${pipe('DICOM flow', ['Modality', 'DICOM store', 'PACS', 'qure.ai AI'])}
     <div class="cols">
       <div class="panel"><h3>Chest PA · Rajesh Kumar</h3>
        <div class="viewer"><canvas id="pacsMain" width="520" height="360"></canvas>
         <div class="vtools"><span class="vtool">W 400 / L 40</span><span class="vtool">Zoom 100%</span></div>
         <div class="vfind">⚠ qure.ai: opacity, R lower zone (0.86)</div>
        </div>
       </div>
       ${mods(['DICOM store / query / retrieve', 'Multi-modality zero-footprint viewer', 'Hanging protocols + MPR / 3D', 'Measurements & annotations', 'AI overlays (qure.ai, 5C Network)', 'Teleradiology sharing & CD import'])}
     </div>`,
    after: (root) => drawPACS(root),
  },
  /* ---------------- Operations & business ---------------- */
  practice: {
    name: 'Clinic Mgmt', full: 'Practice / Clinic Management', cat: 'Operations',
    render: () => `
     ${pipe('Front desk', ['Booking', 'Check-in', 'Consult', 'Billing'])}
     <div class="kpis">${tile('24', 'Appointments', '6 walk-ins')}${tile('₹38,400', 'Collected today', '')}${tile('12m', 'Avg wait', '')}${tile('2', 'No-shows', '')}</div>
     <div class="cols">
       <div class="panel"><h3>Today · Dr. Sanjay Anbu</h3>
        <div class="tblwrap"><table><thead><tr><th>Time</th><th>Patient</th><th>Type</th><th>Status</th></tr></thead><tbody>
         <tr><td>10:00</td><td>Meena Iyer</td><td>Follow-up</td><td><span class="st ok">Done</span></td></tr>
         <tr><td>10:20</td><td>Arjun Rao</td><td>New</td><td><span class="st warn">In room</span></td></tr>
         <tr><td>10:40</td><td>Fatima S.</td><td>Report review</td><td><span class="st info">Waiting</span></td></tr>
        </tbody></table></div>
       </div>
       ${mods(['Appointment scheduling & calendars', 'Token / queue management', 'OP billing & receipts', 'Patient CRM & recall', 'WhatsApp / SMS reminders', 'Teleconsult + e-prescription'])}
     </div>`,
  },
  rcm: {
    name: 'RCM', full: 'Billing / Claims / TPA', cat: 'Operations',
    render: () => `
     ${pipe('Claim cycle', ['Charge', 'Coding', 'TPA submit', 'Payment'])}
     <div class="kpis">${tile('₹12.6L', 'Claims in flight', '')}${tile('84%', 'Clean-claim rate', '')}${tile('6', 'Denials', '')}${tile('19d', 'Avg AR days', '')}</div>
     <div class="cols">
       <div class="panel"><h3>Claims</h3>
        <div class="tblwrap"><table><thead><tr><th>Claim</th><th>Payer / TPA</th><th>Amount</th><th>Status</th></tr></thead><tbody>
         <tr><td>C-8841</td><td>Star Health</td><td>₹1,20,000</td><td><span class="st ok">Approved</span></td></tr>
         <tr><td>C-8842</td><td>Ayushman (PMJAY)</td><td>₹45,000</td><td><span class="st warn">Query</span></td></tr>
         <tr><td>C-8843</td><td>ICICI Lombard</td><td>₹78,500</td><td><span class="st bad">Denied</span></td></tr>
        </tbody></table></div>
       </div>
       ${mods(['Charge capture & coding (ICD-10 / CPT)', 'Claim submission & tracking', 'Denial management & appeals', 'Cashless TPA + PMJAY / ABHA', 'Payment posting & reconciliation', 'AR aging & revenue dashboards'])}
     </div>`,
  },
  pharmacy: {
    name: 'Pharmacy', full: 'Pharmacy Management', cat: 'Operations',
    render: () => `
     ${pipe('e-Rx → Dispense', ['CPOE order', 'Stock check', 'Dispense', 'GST bill'])}
     <div class="kpis">${tile('31', 'Dispense queue', '')}${tile('14', 'Low stock', '')}${tile('5', 'Near expiry', '')}${tile('₹9,240', 'Sales today', '')}</div>
     <div class="cols">
       <div class="panel"><h3>Dispense queue</h3>
        <div class="list">
         <div class="li"><div class="ic">💊</div><div class="g">Metformin 1000mg ×30<small>Rajesh Kumar</small></div><span class="st ok">Ready</span></div>
         <div class="li"><div class="ic">❄️</div><div class="g">Insulin Glargine<small>cold-chain</small></div><span class="st warn">Fridge</span></div>
         <div class="li"><div class="ic">📦</div><div class="g">Amlodipine 5mg<small>8 left · reorder</small></div><span class="st bad">Low</span></div>
        </div>
       </div>
       ${mods(['e-Rx dispensing from CPOE', 'Batch, expiry & stock control', 'Purchase orders & GRN', 'Drug-interaction & duplicate checks', 'Cold-chain monitoring', 'GST billing + Schedule-H register'])}
     </div>`,
  },
  erp: {
    name: 'ERP', full: 'ERP / Back-office', cat: 'Operations',
    render: () => `
     ${pipe('Back-office', ['Inventory', 'Purchase', 'HR', 'Finance'])}
     <div class="kpis">${tile('₹86L', 'Monthly spend', '')}${tile('312', 'Staff on roll', '')}${tile('9', 'Open POs', '')}${tile('₹4.1L', 'Payroll due', '')}</div>
     <div class="cols">
       <div class="panel"><h3>Purchase orders</h3>
        <div class="tblwrap"><table><thead><tr><th>PO</th><th>Vendor</th><th>Item</th><th>Status</th></tr></thead><tbody>
         <tr><td>PO-771</td><td>Sun Pharma</td><td>Antibiotics lot</td><td><span class="st warn">Pending</span></td></tr>
         <tr><td>PO-772</td><td>GE Healthcare</td><td>CT service kit</td><td><span class="st ok">Delivered</span></td></tr>
         <tr><td>PO-773</td><td>Romsons</td><td>Consumables</td><td><span class="st info">Approved</span></td></tr>
        </tbody></table></div>
       </div>
       ${mods(['Materials & central store inventory', 'Procurement & vendor management', 'HR, attendance & payroll', 'Finance / GL & GST returns', 'Fixed-asset register', 'Biomedical equipment maintenance'])}
     </div>`,
  },
  /* ---------------- Patient-facing ---------------- */
  telemed: {
    name: 'Teleconsult', full: 'Telemedicine', cat: 'Patient-facing',
    render: () => `
     ${pipe('Video consult', ['Patient app', 'Secure room', 'EMR notes'])}
     <div class="cols">
       <div class="panel"><h3>Live consult</h3>
        <div class="viewer" style="aspect-ratio:16/10"><canvas id="tmMain" width="520" height="325"></canvas>
         <div class="vtools"><span class="vtool">● REC</span><span class="vtool">HD</span></div>
         <div class="vfind" style="background:rgba(34,176,125,.9)">Meena Iyer · connected</div>
        </div>
       </div>
       ${mods(['Secure video rooms (waiting room + queue)', 'In-consult vitals from patient app', 'e-Prescription at end of call', 'Secure chat & file share', 'Payments & auto-invoicing', 'Consult notes push to EMR / ABDM'])}
     </div>`,
    after: (root) => drawTele(root),
  },
  appt: {
    name: 'Appointments', full: 'Appointment / Queue', cat: 'Patient-facing',
    render: () => `
     ${pipe('Queue', ['Booking', 'Token', 'Counter', 'Reminder SMS'])}
     <div class="kpis">${tile('A-042', 'Now serving', 'Counter 1')}${tile('17', 'In queue', '')}${tile('~24m', 'Est. wait', '')}${tile('98%', 'SMS delivered', '')}</div>
     <div class="cols">
       <div class="panel"><h3>Counters</h3>
        <div class="list">
         <div class="li"><div class="ic">1</div><div class="g">General OPD<small>serving A-042</small></div><span class="st ok">Open</span></div>
         <div class="li"><div class="ic">2</div><div class="g">Sample collection<small>serving B-018</small></div><span class="st ok">Open</span></div>
         <div class="li"><div class="ic">3</div><div class="g">Pharmacy<small>serving P-090</small></div><span class="st warn">Slow</span></div>
        </div>
       </div>
       ${mods(['Online & walk-in booking', 'Live token display boards', 'Multi-counter management', 'SMS / WhatsApp reminders', 'Doctor availability & slots', 'Wait-time & footfall analytics'])}
     </div>`,
  },
  epharm: {
    name: 'Online Pharmacy', full: 'Online Pharmacy', cat: 'Patient-facing',
    render: () => `
     ${pipe('Order → Delivery', ['e-Rx', 'Order', 'Pack', 'Deliver'])}
     <div class="kpis">${tile('56', 'Orders today', '')}${tile('₹41,200', 'GMV', '')}${tile('12', 'Out for delivery', '')}${tile('4.7★', 'Rating', '')}</div>
     <div class="cols">
       <div class="panel"><h3>Orders</h3>
        <div class="tblwrap"><table><thead><tr><th>Order</th><th>Items</th><th>Rx</th><th>Status</th></tr></thead><tbody>
         <tr><td>#90231</td><td>Metformin, Telma</td><td><span class="st ok">Valid</span></td><td><span class="st warn">Packing</span></td></tr>
         <tr><td>#90232</td><td>Insulin (cold)</td><td><span class="st ok">Valid</span></td><td><span class="st info">Dispatched</span></td></tr>
         <tr><td>#90233</td><td>Vitamin D</td><td><span class="st info">OTC</span></td><td><span class="st ok">Delivered</span></td></tr>
        </tbody></table></div>
       </div>
       ${mods(['Catalogue & search', 'Rx upload & pharmacist validation', 'Order fulfilment & packing', 'Live delivery tracking', 'Refill reminders & subscriptions', 'Payments & GST invoices'])}
     </div>`,
  },
};

const ALIASES: Record<string, string[]> = {
  his: ['his', 'hospital information', 'hospital info', 'hospital system', 'backbone'],
  emr: ['emr', 'ehr', 'electronic medical', 'electronic health', 'records', 'patient chart', 'charts'],
  cpoe: ['cpoe', 'e-prescribing', 'eprescribing', 'e prescribing', 'prescribing', 'order entry', 'order'],
  cdss: ['cdss', 'clinical decision', 'decision support', 'clinical ai', 'ai diagnostics'],
  lis: ['lis', 'lims', 'lab', 'laboratory'],
  ris: ['ris', 'radiology information', 'radiology info', 'radiology'],
  pacs: ['pacs', 'dicom', 'imaging', 'x-ray', 'xray', 'ct scan', 'mri', 'viewer'],
  practice: ['practice', 'clinic management', 'practice management', 'clinic mgmt', 'front desk', 'clinic'],
  rcm: ['rcm', 'billing', 'claims', 'tpa', 'insurance', 'revenue cycle'],
  pharmacy: ['pharmacy', 'dispense', 'medicine stock', 'chemist'],
  erp: ['erp', 'inventory', 'back office', 'back-office', 'hr', 'finance'],
  telemed: ['telemed', 'teleconsult', 'telemedicine', 'video consult', 'online consult'],
  appt: ['appointment', 'appointments', 'queue', 'token', 'reminders'],
  epharm: ['online pharmacy', 'e-pharmacy', 'epharmacy', 'order medicine'],
};

const GROUPS: [string, string[]][] = [
  ['Core clinical', ['his', 'emr', 'cpoe', 'cdss']],
  ['Diagnostics', ['lis', 'ris', 'pacs']],
  ['Operations', ['practice', 'rcm', 'pharmacy', 'erp']],
  ['Patient-facing', ['telemed', 'appt', 'epharm']],
];

function matchCmd(raw: string): string | null {
  const s = (raw || '').toLowerCase();
  let best: string | null = null, bestLen = 0;
  for (const [k, al] of Object.entries(ALIASES)) {
    for (const a of al) {
      const re = new RegExp('\\b' + a.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&') + '\\b');
      if (re.test(s) && a.length > bestLen) { best = k; bestLen = a.length; }
    }
  }
  return best;
}

/* radiograph-ish canvas so PACS looks like a real scan */
function drawPACS(root: HTMLElement) {
  const c = root.querySelector<HTMLCanvasElement>('#pacsMain'); if (!c) return;
  const x = c.getContext('2d'); if (!x) return;
  const g = x.createRadialGradient(c.width * 0.5, c.height * 0.55, 20, c.width * 0.5, c.height * 0.55, c.width * 0.6);
  g.addColorStop(0, '#3a3f4a'); g.addColorStop(0.5, '#20242c'); g.addColorStop(1, '#05070d');
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = 'rgba(210,220,235,0.28)'; x.lineWidth = 2;
  for (let i = 0; i < 7; i++) { x.beginPath(); x.arc(c.width * 0.5, -40 + i * 46, c.width * 0.42, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke(); }
  x.fillStyle = 'rgba(230,235,245,0.35)'; for (let i = 0; i < 9; i++) x.fillRect(c.width * 0.5 - 8, 60 + i * 30, 16, 18);
  for (let i = 0; i < 2400; i++) { x.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.05) + ')'; x.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1); }
  x.strokeStyle = '#EA4335'; x.lineWidth = 2.5; x.setLineDash([6, 4]); x.strokeRect(c.width * 0.58, c.height * 0.62, 90, 70); x.setLineDash([]);
}
function drawTele(root: HTMLElement) {
  const c = root.querySelector<HTMLCanvasElement>('#tmMain'); if (!c) return;
  const x = c.getContext('2d'); if (!x) return;
  const g = x.createLinearGradient(0, 0, c.width, c.height);
  g.addColorStop(0, '#16324f'); g.addColorStop(1, '#0a1826');
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = 'rgba(180,205,235,0.55)';
  x.beginPath(); x.arc(c.width / 2, c.height * 0.42, 52, 0, 7); x.fill();
  x.beginPath(); x.ellipse(c.width / 2, c.height * 0.95, 110, 70, 0, Math.PI, 2 * Math.PI); x.fill();
}

const LOCK_OPEN = '<svg class="bic" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>';
const LOCK_CLOSED = '<svg class="bic" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

// Desktop app exposes an encrypted local SQLite store as window.mdxDB; on the
// website we fall back to localStorage (per-browser). Same call sites, one guard.
type MdxDB = { available: boolean; platform?: string; list: (sys: string) => string[][]; add: (sys: string, values: string[]) => boolean };
const mdx = (): MdxDB | null => (typeof window !== 'undefined' && (window as any).mdxDB) || null;
const isDesktop = () => !!mdx();

const REL = 'https://github.com/sanjaydoc/medicalandroid/releases/latest/download/';
const DOWNLOADS: [string, string, string][] = [
  ['win', 'Windows', 'MedDroid-Partners-Setup.exe'],
  ['mac', 'macOS', 'MedDroid-Partners.dmg'],
  ['linux', 'Linux', 'MedDroid-Partners.AppImage'],
];
function detectOS(): string {
  if (typeof navigator === 'undefined') return '';
  const p = (navigator.userAgent + ' ' + ((navigator as any).platform || '')).toLowerCase();
  if (p.includes('win')) return 'win';
  if (p.includes('mac') || p.includes('iphone') || p.includes('ipad')) return 'mac';
  if (p.includes('linux') || p.includes('android')) return 'linux';
  return '';
}
function loadRecords(sys: string): string[][] {
  const d = mdx(); if (d) { try { return d.list(sys) || []; } catch { return []; } }
  try { return JSON.parse(localStorage.getItem('mdx_data_' + sys) || '[]'); } catch { return []; }
}
function saveRecord(sys: string, values: string[]) {
  const d = mdx(); if (d) { try { d.add(sys, values); return; } catch { /* fall through */ } }
  try { const k = 'mdx_data_' + sys; const arr = JSON.parse(localStorage.getItem(k) || '[]'); arr.unshift(values); localStorage.setItem(k, JSON.stringify(arr)); } catch { /* ignore */ }
}

const esc = (s: string) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c));
// a realistic 14-digit ABHA number, displayed 2-4-4-4
const genAbha = () => { const d = () => Math.floor(Math.random() * 10); const g = (n: number) => Array.from({ length: n }, d).join(''); return `${g(2)}-${g(4)}-${g(4)}-${g(4)}`; };

// re-insert this browser's saved records for a system after it re-renders (survives refresh)
function injectSaved(mock: HTMLElement, key: string) {
  const arr = loadRecords(key);
  if (!Array.isArray(arr) || !arr.length) return;
  const tb = mock.querySelector('table tbody');
  if (tb) {
    const cols = (tb.querySelector('tr')?.children.length) || 0;
    for (let i = arr.length - 1; i >= 0; i--) {
      const cells = arr[i].map(esc);
      while (cells.length < cols - 1) cells.push('—');
      cells.push('<span class="st ok">Saved</span>');
      const tr = document.createElement('tr');
      tr.innerHTML = cells.slice(0, cols || cells.length).map((c) => `<td>${c}</td>`).join('');
      tb.insertBefore(tr, tb.firstChild);
    }
  } else {
    const list = mock.querySelector('.list');
    if (list) for (let i = arr.length - 1; i >= 0; i--) { const v = arr[i].map(esc); const d = document.createElement('div'); d.className = 'li'; d.innerHTML = `<div class="ic">＋</div><div class="g">${v[0] || 'New record'}<small>${v[1] || '—'}</small></div><span class="st ok">Saved</span>`; list.insertBefore(d, list.firstChild); }
  }
}

type Instance = { sys: string; locked: boolean };
type ModalState = { type: 'auth' | 'input' | 'custom'; reason?: string } | null;

const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

export default function Partners() {
  const { user, login, logout } = useAuth();
  const [skin, setSkin] = useState<'console' | 'dark'>('console');
  const [instances, setInstances] = useState<Instance[]>([{ sys: 'his', locked: false }]);
  const [active, setActive] = useState(0);
  const [modal, setModal] = useState<ModalState>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [accent, setAccent] = useState<string>('');
  const [logo, setLogo] = useState<string>('');
  const [inputCols, setInputCols] = useState<string[]>([]);

  const contentRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const cmdRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const curRef = useRef('his');
  const instRef = useRef(instances); instRef.current = instances;
  const activeRef = useRef(active); activeRef.current = active;
  const pendingRef = useRef<null | (() => void)>(null);
  const toastTimer = useRef<number>();

  const toast = useCallback((m: string) => {
    setToastMsg(m);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2600);
  }, []);

  /* ----- the two-stage 360° flip engine (imperative on the content div) ----- */
  const assembleMock = useCallback((sys: Sys, fast: boolean) => {
    const el = contentRef.current; if (!el) return;
    busyRef.current = true;
    el.innerHTML =
      `<div class="mock"><div class="mhead"><div><div class="mtitle">${sys.name}</div><div class="mfull">${sys.full}</div></div><span class="badge">${sys.cat}</span>${MD}</div>${sys.render()}</div>`;
    const mock = el.querySelector('.mock') as HTMLElement; if (!mock) return;
    mock.classList.add('assemble');
    const pieces: HTMLElement[] = [];
    const mh = mock.querySelector('.mhead') as HTMLElement; if (mh) { mh.classList.add('asm-hud'); pieces.push(mh); }
    const pp = mock.querySelector('.pipe') as HTMLElement; if (pp) { pp.classList.add('asm-pipe'); pieces.push(pp); }
    mock.querySelectorAll<HTMLElement>('.kpis .tile').forEach((t) => { t.classList.add('asm-flap'); pieces.push(t); });
    mock.querySelectorAll<HTMLElement>('.panel').forEach((p) => { p.classList.add('asm-flap'); pieces.push(p); });
    const step = fast ? 190 : 480;
    pieces.forEach((elp, i) => { elp.style.animationDelay = ((REDUCE ? 20 : step) * i) + 'ms'; });

    const targets = [...mock.querySelectorAll<HTMLElement>('.pipe .node, .tile .v, .tile .l, .panel h3, th, .ward .wn, tbody tr:first-child td, .mrow')];
    if (!REDUCE) targets.forEach((t) => { t.dataset.real = t.innerHTML; t.innerHTML = t.classList.contains('v') ? '——' : '···'; t.style.opacity = '.4'; });
    if (tagRef.current && !REDUCE) { tagRef.current.hidden = false; tagRef.current.textContent = '◧ ' + sys.name; }

    const flapDur = 720;
    const cardsDone = (REDUCE ? 20 : step) * Math.max(0, pieces.length - 1) + (REDUCE ? 150 : flapDur);
    window.setTimeout(() => {
      pieces.forEach((elp) => { elp.classList.remove('asm-hud', 'asm-pipe', 'asm-flap'); elp.style.animationDelay = ''; });
      if (REDUCE) { busyRef.current = false; if (tagRef.current) tagRef.current.hidden = true; injectSaved(mock, curRef.current); sys.after?.(mock); return; }
      const ts = 55;
      targets.forEach((t, i) => window.setTimeout(() => {
        if (t.dataset.real !== undefined) { t.innerHTML = t.dataset.real; delete t.dataset.real; }
        t.style.opacity = ''; t.classList.add('txt-flip');
        window.setTimeout(() => t.classList.remove('txt-flip'), 600);
      }, ts * i));
      const tdone = ts * targets.length + 640;
      window.setTimeout(() => { busyRef.current = false; if (tagRef.current) tagRef.current.hidden = true; injectSaved(mock, curRef.current); sys.after?.(mock); }, tdone);
    }, Math.max(200, cardsDone - 140));
  }, []);

  const transformTo = useCallback((key: string | null, fast = false) => {
    if (!key || !SYS[key] || busyRef.current) return;
    const inst = instRef.current[activeRef.current];
    if (inst && inst.locked && key !== inst.sys) {
      toast('This instance is locked to ' + SYS[inst.sys].name + ' — open a New instance for ' + SYS[key].name);
      return;
    }
    curRef.current = key;
    if (inst && !inst.locked) setInstances((prev) => prev.map((it, i) => (i === activeRef.current ? { ...it, sys: key } : it)));
    assembleMock(SYS[key], fast);
  }, [assembleMock, toast]);

  /* boot + voice */
  useEffect(() => {
    transformTo('his', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast('Voice not supported here — type a command instead'); cmdRef.current?.focus(); return; }
    const rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = false;
    setListening(true);
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript; if (cmdRef.current) cmdRef.current.value = t; const k = matchCmd(t); if (k) transformTo(k); else toast('Try naming a system, e.g. "transform HIS"'); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    try { rec.start(); } catch { setListening(false); }
  };
  const [listening, setListening] = useState(false);

  const runCmd = () => { const k = matchCmd(cmdRef.current?.value || ''); if (k) transformTo(k); else toast('Try naming a system, e.g. "transform HIS"'); };

  /* ----- gated partner actions (real Supabase auth) ----- */
  const gate = (reason: string, fn: () => void) => { if (user) fn(); else { pendingRef.current = fn; setModal({ type: 'auth', reason }); } };

  // Resume the gated action after auth — both in-session (email) and after a
  // Google OAuth round-trip (we stashed the intent in sessionStorage first).
  useEffect(() => {
    if (!user) return;
    if (pendingRef.current) { const fn = pendingRef.current; pendingRef.current = null; setModal(null); fn(); return; }
    try {
      // record the partner as a lead so the admin dashboard sees them (once per browser)
      const pm = sessionStorage.getItem('mdx_partner');
      if (pm) {
        sessionStorage.removeItem('mdx_partner');
        const { institution, itype } = JSON.parse(pm || '{}');
        const key = 'mdx_p_' + (user.email || user.id);
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, '1');
          saveRow('signups', { name: `${institution || user.name} · Partner${itype ? ` (${itype})` : ''}`, email: user.email, consent: true });
          // tag the account as a partner so /account shows the partner view, not patient dashboards
          supabase?.auth.updateUser({ data: { role: 'partner', institution: institution || user.name, institution_type: itype || '' } }).catch(() => { /* ignore */ });
        }
      }
      const p = sessionStorage.getItem('mdx_pending');
      if (p) {
        sessionStorage.removeItem('mdx_pending');
        setModal(null);
        if (p === 'input') setModal({ type: 'input' });
        else if (p === 'custom') setModal({ type: 'custom' });
        else if (p === 'lock') { setInstances((prev) => prev.map((it, i) => (i === activeRef.current ? { ...it, locked: true, sys: curRef.current } : it))); toast('Locked to ' + SYS[curRef.current].name); }
      }
    } catch { /* sessionStorage blocked */ }
  }, [user, toast]);

  // Google sign-in for partners: stash the pending action + partner details, return to /partners.
  const startGoogle = async (reason?: string, institution?: string, itype?: string) => {
    try {
      sessionStorage.setItem('mdx_pending', reason || '');
      sessionStorage.setItem('mdx_partner', JSON.stringify({ institution: institution || '', itype: itype || '' }));
    } catch { /* ignore */ }
    if (!supabase) { toast('Google sign-in is unavailable right now.'); return; }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/?next=partners' },
    });
    if (error) toast(error.message);
  };

  const doLock = () => {
    setInstances((prev) => prev.map((it, i) => (i === activeRef.current ? { ...it, locked: true, sys: curRef.current } : it)));
    toast('Locked to ' + SYS[curRef.current].name);
  };
  const toggleLock = () => {
    const inst = instRef.current[activeRef.current];
    if (inst.locked) { setInstances((prev) => prev.map((it, i) => (i === activeRef.current ? { ...it, locked: false } : it))); toast('Instance unlocked'); return; }
    gate('lock', doLock);
  };
  const newInstance = () => {
    setInstances((prev) => [...prev, { sys: curRef.current, locked: false }]);
    setActive(instances.length);
    toast('New instance — transform it to another system, then lock it');
  };
  const switchInst = (i: number) => {
    if (i === active || busyRef.current) return;
    setActive(i); const s = instRef.current[i].sys; curRef.current = s; assembleMock(SYS[s], true);
  };

  /* read the current system's table headers so the input form matches its columns */
  const readCols = () => {
    const root = contentRef.current;
    const ths = root?.querySelectorAll('.mock table thead th');
    return ths && ths.length ? [...ths].map((t) => (t.textContent || '').trim()) : [];
  };
  /* input a record → persist (survives refresh) + append into the current mock, column-for-column */
  const submitInput = (values: string[]) => {
    const root = contentRef.current; if (!root) { setModal(null); return; }
    const key = curRef.current;
    saveRecord(key, values);
    const mock = root.querySelector('.mock') as HTMLElement | null;
    if (mock) {
      const safe = values.map(esc);
      const tb = mock.querySelector('table tbody');
      if (tb) {
        const cols = (tb.querySelector('tr')?.children.length) || safe.length + 1;
        const cells = [...safe];
        while (cells.length < cols - 1) cells.push('—');
        cells.push('<span class="st ok">Saved</span>');
        const tr = document.createElement('tr');
        tr.innerHTML = cells.slice(0, cols).map((c) => `<td>${c}</td>`).join('');
        tr.style.animation = 'mdx-rise .4s';
        tb.insertBefore(tr, tb.firstChild);
      } else {
        const list = mock.querySelector('.list');
        if (list) { const d = document.createElement('div'); d.className = 'li'; d.innerHTML = `<div class="ic">＋</div><div class="g">${safe[0] || 'New record'}<small>${safe[1] || '—'}</small></div><span class="st ok">Saved</span>`; list.insertBefore(d, list.firstChild); }
      }
    }
    setModal(null); toast('Saved to ' + SYS[key].name);
  };

  const applyBrand = (color: string, logoData: string) => {
    if (color) setAccent(color);
    if (logoData) setLogo(logoData);
    setModal(null); toast(logoData ? 'Branding applied' : 'Accent colour applied');
  };

  const inst = instances[active];
  const os = detectOS();
  const wrapStyle = accent ? ({ ['--accent' as any]: accent, ['--accent2' as any]: accent }) : undefined;

  return (
    <div className="mdx" data-skin={skin} style={wrapStyle}>
      <style>{CSS}</style>
      <div className="wrap">
        {/* top bar */}
        <div className="top">
          <div className="logo" aria-hidden="true">
            {logo
              ? <img src={logo} alt="" />
              : <svg viewBox="0 0 64 64"><rect x="27.5" y="13" width="9" height="30" rx="4.5" fill="#EA4335" /><rect x="17" y="23.5" width="30" height="9" rx="4.5" fill="#EA4335" /><path d="M8 50 h12 l4 -10 5 18 4 -12 h23" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
          <div className="brand">
            <h1>MedDroid Transformer</h1>
            <div className="sub">One workspace · speaks into any hospital system · for partner labs, clinics &amp; hospitals</div>
          </div>
          <div className="skins" role="group" aria-label="Theme">
            <button className="skin-btn" aria-pressed={skin === 'console'} onClick={() => setSkin('console')}>
              <svg className="sic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>Light
            </button>
            <button className="skin-btn" aria-pressed={skin === 'dark'} onClick={() => setSkin('dark')}>
              <svg className="sic" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>Dark
            </button>
          </div>
        </div>

        {/* desktop app downloads (website only) */}
        {!isDesktop() && (
          <div className="dlsec">
            <div className="dlhead">
              <svg className="dlic" viewBox="0 0 24 24"><path d="M12 3v12M7 11l5 5 5-5" /><path d="M4 21h16" /></svg>
              <div><b>Get the desktop app</b><span>Runs on your own machine · hospital data stays local &amp; encrypted, never on our servers.</span></div>
            </div>
            <div className="dlrow">
              {DOWNLOADS.map(([k, label, file]) => (
                <a key={k} className={'dlopt' + (os === k ? ' primary' : '')} href={REL + file}>
                  <svg className="osic" viewBox="0 0 24 24"><path d="M12 3v12M7 11l5 5 5-5" /><path d="M4 21h16" /></svg>
                  {label}{os === k ? ' · your OS' : ''}
                </a>
              ))}
            </div>
            <a className="dlall" href="https://github.com/sanjaydoc/medicalandroid/releases/latest" target="_blank" rel="noreferrer">All downloads &amp; Linux .deb →</a>
          </div>
        )}
        {isDesktop() && (
          <div className="dlbanner local">
            <svg className="dlic" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            <span className="dltxt"><b>Desktop app</b> — all records are saved to an <b>encrypted database on this computer</b> only.</span>
          </div>
        )}

        {/* command console */}
        <div className="console">
          <div className="cmd-row">
            <div className="cmd-in">
              <svg viewBox="0 0 24 24"><path d="M4 17l6-6-6-6" /><path d="M12 19h8" /></svg>
              <input ref={cmdRef} placeholder="Type a command…  e.g.  transform HIS" autoComplete="off"
                onKeyDown={(e) => { if (e.key === 'Enter') runCmd(); }} />
            </div>
            <button className={'tbtn mic' + (listening ? ' live' : '')} onClick={startVoice} title="Voice command">
              <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></svg>
            </button>
            <button className="tbtn run" onClick={runCmd}>Transform →</button>
          </div>
          <div className="hint">Say or tap a system to transform into it</div>
          <div className="chip-groups">
            {GROUPS.map(([cat, keys]) => (
              <div className="cg" key={cat}>
                <span className="catlab">{cat}</span>
                {keys.map((k) => (
                  <button className="tchip" key={k} onClick={() => { if (cmdRef.current) cmdRef.current.value = 'transform ' + SYS[k].name; transformTo(k); }}>
                    transform {SYS[k].name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* workspace toolbar */}
        <div className="wstop">
          <span className="state">
            {user
              ? <><span className="badge">{(user.name || 'Partner')}</span> signed in</>
              : <><span className="dotfree" /> Exploring free — no login needed to try it</>}
          </span>
          {!user && <button className="wbtn" onClick={() => setModal({ type: 'auth', reason: 'generic' })}>
            <svg className="bic" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5M15 12H3" /></svg>Log in
          </button>}
          <button className="wbtn" style={{ marginLeft: 'auto' }} onClick={() => gate('input', () => { setInputCols(readCols()); setModal({ type: 'input' }); })}>
            <svg className="bic" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>Input data
          </button>
          <button className="wbtn" onClick={() => gate('custom', () => setModal({ type: 'custom' }))}>
            <svg className="bic" viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2.3" /><circle cx="9" cy="17" r="2.3" /></svg>Customise
          </button>
          <button className={'wbtn' + (inst.locked ? ' pri' : '')} onClick={toggleLock}
            dangerouslySetInnerHTML={{ __html: (inst.locked ? LOCK_CLOSED : LOCK_OPEN) + (inst.locked ? 'Locked' : 'Lock') }} />
          {user && <button className="out" onClick={logout}>Log out</button>}
        </div>

        {/* instance bar */}
        <div className="instbar">
          {instances.map((it, i) => (
            <button className="itab" key={i} aria-selected={i === active} onClick={() => switchInst(i)}>
              <span className="lk" dangerouslySetInnerHTML={{ __html: it.locked ? LOCK_CLOSED : '•' }} />
              <span className="sys">{SYS[it.sys]?.name || '—'}</span>
            </button>
          ))}
          <button className="inew" onClick={newInstance}>＋ New instance</button>
          {inst.locked && <span className="locked-note">Locked to {SYS[inst.sys].name} · commands disabled</span>}
        </div>

        {/* stage */}
        <div className="stage">
          <div className="asmtag" ref={tagRef} hidden />
          <div ref={contentRef} />
        </div>

        {/* the glue + core wedge */}
        <div className="glue">
          <div className="glab">The glue — how MedDroid connects in</div>
          <div className="gnodes">
            <span className="gn">DICOM</span><span className="gn">HL7 / FHIR</span><span className="gn red">🇮🇳 ABDM / ABHA — the one to know</span>
          </div>
          <div className="core">
            <b>MedDroid’s core:</b> Lab reports → LIS / ABDM-FHIR · X-ray/MRI/CT → PACS/DICOM · Prescriptions → EMR —
            then the layer nobody owns: <span className="own">“explain my report to me in Hindi.”</span>
          </div>
        </div>

        <div className="foot">
          Demo workspace · sample data only. Systems shown are what partners already run; MedDroid connects via ABDM / FHIR / DICOM and adds the patient layer on top.
        </div>
      </div>

      {toastMsg && <div className="toast">{toastMsg}</div>}

      {modal && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal-card">
            <button className="modal-x" onClick={() => setModal(null)} aria-label="Close">✕</button>
            {modal.type === 'auth' && <AuthForm reason={modal.reason} onLogin={login} onGoogle={(inst, itype) => startGoogle(modal.reason, inst, itype)} onDone={() => { }} toast={toast} />}
            {modal.type === 'input' && <InputForm sysName={SYS[curRef.current].name} columns={inputCols} onSave={submitInput} />}
            {modal.type === 'custom' && <CustomForm onApply={applyBrand} />}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- auth modal ----------------------------- */
function AuthForm({ reason, onLogin, onGoogle, toast }:
  { reason?: string; onLogin: (e: string, p: string) => Promise<void>; onGoogle: (inst: string, itype: string) => Promise<void>; onDone: () => void; toast: (m: string) => void; }) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [inst, setInst] = useState('');
  const [itype, setItype] = useState('Clinic');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const REASONS: Record<string, [string, string]> = {
    input: ['Log in to input & save data', "You're free to explore any system. Create a partner account to add records that stick."],
    custom: ['Log in to customise with your logo', 'Sign in to brand this workspace with your logo & colour.'],
    lock: ['Log in to lock this instance', 'Locking commits this workspace to one purpose so your team uses it with real data.'],
  };
  const [head, sub] = REASONS[reason || ''] || ['Partner sign-in', 'Create a partner account or log in to continue.'];

  const go = async () => {
    setErr(''); setBusy(true);
    try {
      if (mode === 'signup') {
        if (!supabase) throw new Error('Sign-up is not available right now.');
        const { error } = await supabase.auth.signUp({
          email, password: pass,
          options: { data: { name: inst || (itype + ' partner'), institution: inst, institution_type: itype, role: 'partner' } },
        });
        if (error) throw new Error(error.message);
        // record the partner as a lead so the admin dashboard sees them
        saveRow('signups', { name: `${inst || itype + ' partner'} · Partner (${itype})`, email, consent: true });
        toast('Account created — check your email if confirmation is required.');
      } else {
        await onLogin(email, pass);
      }
    } catch (e: any) { setErr(e?.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-card">
      <div className="lockrow">🔒 {head}</div>
      <div className="auth-tabs">
        <button className="auth-tab" aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>Sign up</button>
        <button className="auth-tab" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>Log in</button>
      </div>
      <div className="auth-h">Partner portal</div>
      <div className="auth-sub">{sub}</div>
      <div className="fields">
        {mode === 'signup' && <>
          <label className="f"><span>Institution name</span><input value={inst} onChange={(e) => setInst(e.target.value)} placeholder="e.g. Kilpauk Diagnostics" /></label>
          <div className="f"><span>Institution type</span>
            <div className="seg">
              {['Clinic', 'Lab', 'Hospital', 'Health institution'].map((t) => (
                <button key={t} aria-pressed={itype === t} onClick={() => setItype(t)}>{t}</button>
              ))}
            </div>
          </div>
        </>}
        <label className="f"><span>Work email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@institution.in" /></label>
        <label className="f"><span>Password</span><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" /></label>
      </div>
      {err && <div className="err">{err}</div>}
      <button className="tbtn run authgo" disabled={busy} onClick={go}>{busy ? 'Please wait…' : (mode === 'signup' ? 'Create account →' : 'Log in →')}</button>
      <div className="oauth">
        <button className="obtn" onClick={() => onGoogle(inst, itype).catch((e) => setErr(e.message))}>Continue with Google</button>
      </div>
      <div className="auth-foot">Your systems stay yours — MedDroid connects via ABDM / FHIR / DICOM, read-only by default.</div>
    </div>
  );
}

function InputForm({ sysName, columns, onSave }: { sysName: string; columns: string[]; onSave: (values: string[]) => void }) {
  // Fields = the current table's columns, minus the auto "Status" column.
  const statusish = (c: string) => /status|state/i.test(c);
  const fieldCols = columns.length
    ? (statusish(columns[columns.length - 1]) ? columns.slice(0, -1) : columns)
    : ['Name / reference', 'Detail'];
  const isAbha = (c: string) => /abha/i.test(c);
  const [vals, setVals] = useState<string[]>(fieldCols.map(() => ''));
  const set = (i: number, v: string) => setVals((a) => a.map((x, j) => (j === i ? v : x)));
  const ph = (c: string) => {
    const l = c.toLowerCase();
    if (isAbha(c)) return '14-19-XXXX-XXXX-XXXX · or leave blank';
    if (l.includes('patient') || l === 'name / reference' || l.includes('name')) return 'e.g. Rohan Das · 42M';
    if (l.includes('ward')) return 'e.g. Gen-B';
    if (l.includes('sample')) return 'e.g. S-2294';
    if (l.includes('test')) return 'e.g. CBC';
    if (l.includes('claim')) return 'e.g. C-8844';
    if (l.includes('payer') || l.includes('tpa')) return 'e.g. Star Health';
    if (l.includes('amount')) return 'e.g. ₹1,20,000';
    if (l.includes('modality')) return 'e.g. CT';
    if (l.includes('study')) return 'e.g. Chest PA';
    if (l.includes('time')) return 'e.g. 11:00';
    if (l.includes('detail')) return 'e.g. Ward Gen-B · admitted';
    return 'e.g. …';
  };
  const save = () => {
    const out = vals.map((v, i) => {
      const c = fieldCols[i];
      const t = v.trim();
      if (isAbha(c) && !t) return genAbha();
      return t || (i === 0 ? 'New record' : '—');
    });
    onSave(out);
  };
  return (
    <div className="auth-card">
      <div className="lockrow">＋ Input data → {sysName}</div>
      <div className="auth-h" style={{ fontSize: 18 }}>New entry</div>
      <div className="auth-sub">Fill the fields for this system. A <b>Status</b> of “Saved” is added automatically.</div>
      <div className="fields">
        {fieldCols.map((c, i) => (
          <label className="f" key={c + i}>
            <span>{c}</span>
            <input value={vals[i]} onChange={(e) => set(i, e.target.value)} placeholder={ph(c)} />
            {isAbha(c) && <small className="fhint">ABHA is the patient’s national health ID (ABDM) — enter it, or leave blank to auto-generate a demo ID.</small>}
          </label>
        ))}
      </div>
      <button className="tbtn run authgo" onClick={save}>Save to {sysName} →</button>
    </div>
  );
}

function CustomForm({ onApply }: { onApply: (color: string, logo: string) => void }) {
  const [color, setColor] = useState('#2F6FE0'); const [logo, setLogo] = useState('');
  const onFile = (f?: File) => { if (!f) return; const r = new FileReader(); r.onload = (e) => setLogo(String(e.target?.result || '')); r.readAsDataURL(f); };
  return (
    <div className="auth-card">
      <div className="lockrow">🎨 Customise workspace</div>
      <div className="auth-h" style={{ fontSize: 18 }}>Your brand</div>
      <div className="auth-sub">Add your logo and accent colour — partners see their own brand.</div>
      <div className="fields">
        <label className="f"><span>Upload logo (PNG / SVG)</span><input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} /></label>
        <label className="f"><span>Accent colour</span><input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ height: 44, padding: 4 }} /></label>
      </div>
      <button className="tbtn run authgo" onClick={() => onApply(color, logo)}>Apply branding →</button>
    </div>
  );
}

/* =============================== scoped CSS =============================== */
const CSS = `
.mdx{--r:22px;--r-sm:14px;--font:"Outfit",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;--ok:#22b07d;--warn:#f5a623;--bad:#EA4335;--tr:.5s cubic-bezier(.2,.8,.25,1);
  --bg:#fdfdfc;--panel:#ffffff;--panel2:#f6f8fb;--ink:#152038;--sub:#61708f;--line:#eceff4;--accent:#2F6FE0;--accent2:#4285F4;--accentInk:#fff;--chipbg:#eef1f7;--chipink:#1b4fae;
  --shadow-out:0 12px 30px rgba(20,32,56,.08);--shadow-out-sm:0 5px 14px rgba(20,32,56,.07);--shadow-in:inset 0 1px 3px rgba(20,32,56,.06);--pborder:1px solid rgba(20,32,56,.06);
  font-family:var(--font);color:var(--ink);background:var(--bg);min-height:100vh}
.mdx[data-skin="dark"]{--bg:#1e1e22;--panel:#2b2b31;--panel2:#232329;--ink:#f3f4f8;--sub:#9a9aa6;--line:#3a3a44;--accent:#4285F4;--accent2:#5b9bff;--accentInk:#fff;--chipbg:#33343d;--chipink:#a9c6ff;
  --shadow-out:-7px -7px 16px #34343e,7px 7px 18px #131315;--shadow-out-sm:-3px -3px 8px #34343e,4px 4px 10px #131315;--shadow-in:inset -4px -4px 9px #34343e,inset 4px 4px 10px #131315}
.mdx *{box-sizing:border-box}
.mdx .wrap{max-width:1080px;margin:0 auto;padding:0 16px;padding-block:26px 60px}
.mdx .top{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:20px}
.mdx .logo{width:46px;height:46px;flex:0 0 46px;border-radius:14px;background:var(--accent2);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 22px rgba(66,133,244,.4);overflow:hidden}
.mdx .logo svg{width:34px;height:34px}.mdx .logo img{width:100%;height:100%;object-fit:contain}
.mdx .brand h1{margin:0;font-size:21px;font-weight:800;letter-spacing:-.02em;line-height:1}
.mdx .brand .sub{color:var(--sub);font-size:12.5px;margin-top:3px}
.mdx .skins{margin-left:auto;display:flex;gap:8px;padding:6px;border-radius:999px;background:var(--panel);box-shadow:var(--shadow-in);border:var(--pborder)}
.mdx .skin-btn{display:inline-flex;align-items:center;gap:6px;border:0;cursor:pointer;font-family:var(--font);font-weight:700;font-size:12.5px;color:var(--sub);background:transparent;padding:8px 14px;border-radius:999px;transition:all .25s;white-space:nowrap}
.mdx .sic{width:15px;height:15px;flex:0 0 15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.mdx .skin-btn[aria-pressed="true"]{color:var(--accentInk);background:var(--accent);box-shadow:var(--shadow-out-sm)}
.mdx .dlbanner{display:flex;align-items:center;gap:12px;text-decoration:none;background:var(--panel);border-radius:var(--r);box-shadow:var(--shadow-out);border:var(--pborder);padding:14px 16px;margin-bottom:16px;color:var(--ink)}
.mdx .dlbanner .dlic{width:22px;height:22px;flex:0 0 22px;stroke:var(--accent);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.mdx .dlbanner .dltxt{font-size:13px;font-weight:600;color:var(--sub);line-height:1.4}
.mdx .dlbanner .dltxt b{color:var(--ink)}
.mdx .dlbanner .dlgo{margin-left:auto;flex:0 0 auto;font-weight:800;font-size:13px;color:var(--accentInk);background:var(--accent);padding:9px 15px;border-radius:999px;box-shadow:var(--shadow-out-sm);white-space:nowrap}
.mdx .dlbanner.local{cursor:default}
.mdx .dlsec{background:var(--panel);border-radius:var(--r);box-shadow:var(--shadow-out);border:var(--pborder);padding:16px 18px;margin-bottom:16px}
.mdx .dlhead{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.mdx .dlhead .dlic{width:24px;height:24px;flex:0 0 24px;stroke:var(--accent);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.mdx .dlhead b{font-size:15px;font-weight:800;display:block;color:var(--ink)}
.mdx .dlhead span{font-size:12.5px;color:var(--sub);font-weight:600}
.mdx .dlrow{display:flex;gap:10px;flex-wrap:wrap}
.mdx .dlopt{display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-family:var(--font);font-weight:800;font-size:13px;color:var(--ink);background:var(--panel2);box-shadow:var(--shadow-out-sm);border:var(--pborder);border-radius:12px;padding:11px 16px;transition:transform .12s}
.mdx .dlopt:hover{transform:translateY(-1px)}
.mdx .dlopt.primary{background:var(--accent);color:var(--accentInk)}
.mdx .dlopt .osic{width:16px;height:16px;flex:0 0 16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.mdx .dlall{display:inline-block;margin-top:10px;font-size:12px;font-weight:700;color:var(--accent);text-decoration:none}
.mdx .console{background:var(--panel);border-radius:var(--r);box-shadow:var(--shadow-out);border:var(--pborder);padding:18px;margin-bottom:16px}
.mdx .cmd-row{display:flex;gap:10px;align-items:center}
.mdx .cmd-in{flex:1;display:flex;align-items:center;gap:10px;background:var(--panel2);border-radius:var(--r-sm);box-shadow:var(--shadow-in);padding:12px 14px;border:var(--pborder)}
.mdx .cmd-in svg{width:18px;height:18px;stroke:var(--accent);fill:none;stroke-width:2;flex:0 0 18px}
.mdx .cmd-in input{flex:1;border:0;background:transparent;outline:none;font-family:var(--font);font-size:15px;color:var(--ink);font-weight:600}
.mdx .cmd-in input::placeholder{color:var(--sub);font-weight:500}
.mdx .tbtn{border:0;cursor:pointer;font-family:var(--font);font-weight:800;font-size:14px;border-radius:var(--r-sm);padding:12px 16px;transition:transform .1s,box-shadow .2s}
.mdx .tbtn:active{transform:translateY(1px)}
.mdx .tbtn.mic{background:var(--panel);color:var(--accent);box-shadow:var(--shadow-out-sm);width:46px;padding:0;height:46px;display:flex;align-items:center;justify-content:center}
.mdx .tbtn.mic svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2}
.mdx .tbtn.mic.live{background:var(--bad);color:#fff;animation:mdx-pulse 1s infinite}
@keyframes mdx-pulse{0%,100%{box-shadow:0 0 0 0 rgba(234,67,53,.5)}50%{box-shadow:0 0 0 8px rgba(234,67,53,0)}}
.mdx .tbtn.run{background:var(--accent);color:var(--accentInk);box-shadow:var(--shadow-out-sm)}
.mdx .hint{color:var(--sub);font-size:12px;margin:12px 2px 4px;font-weight:600;letter-spacing:.02em;text-transform:uppercase}
.mdx .chip-groups{display:flex;flex-direction:column;gap:10px}
.mdx .cg{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.mdx .cg .catlab{font-size:11px;font-weight:800;color:var(--sub);flex:0 0 96px;text-transform:uppercase;letter-spacing:.05em}
.mdx .tchip{border:0;cursor:pointer;font-family:var(--font);font-weight:700;font-size:12.5px;color:var(--chipink);background:var(--chipbg);border-radius:999px;padding:8px 13px;box-shadow:var(--shadow-out-sm);border:var(--pborder);transition:transform .12s}
.mdx .tchip:hover{transform:translateY(-1px)}
.mdx .wstop{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.mdx .state{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--sub);background:var(--panel);box-shadow:var(--shadow-out-sm);border:var(--pborder);padding:8px 13px;border-radius:999px}
.mdx .state .badge{margin-right:2px}
.mdx .dotfree{width:8px;height:8px;border-radius:50%;background:var(--ok)}
.mdx .wbtn{display:inline-flex;align-items:center;gap:6px;border:0;cursor:pointer;font-family:var(--font);font-weight:800;font-size:12.5px;color:var(--ink);background:var(--panel);box-shadow:var(--shadow-out-sm);border:var(--pborder);border-radius:999px;padding:9px 15px;transition:transform .12s}
.mdx .wbtn.pri{background:var(--accent);color:var(--accentInk)}
.mdx .bic{width:15px;height:15px;flex:0 0 15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.mdx .out{border:0;background:transparent;color:var(--accent);font-family:var(--font);font-weight:800;font-size:12px;cursor:pointer;padding:0 4px}
.mdx .instbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.mdx .itab{display:inline-flex;align-items:center;gap:7px;font-family:var(--font);font-weight:700;font-size:12px;color:var(--sub);background:var(--panel);box-shadow:var(--shadow-out-sm);border:var(--pborder);border-radius:999px;padding:7px 13px;cursor:pointer;transition:all .18s}
.mdx .itab[aria-selected="true"]{color:var(--accentInk);background:var(--accent)}
.mdx .itab .lk{font-size:11px;opacity:.9;display:inline-flex;align-items:center}.mdx .itab .lk .bic{width:13px;height:13px;flex:0 0 13px}.mdx .itab .sys{font-weight:800}
.mdx .inew{border:1px dashed var(--line);background:transparent;color:var(--accent);font-weight:800;border-radius:999px;padding:7px 12px;cursor:pointer;font-family:var(--font);font-size:12px}
.mdx .locked-note{font-size:11px;color:var(--sub);font-weight:700}
.mdx .stage{background:var(--panel);border-radius:var(--r);box-shadow:var(--shadow-out);border:var(--pborder);min-height:440px;padding:20px;position:relative;overflow:hidden}
.mdx .asmtag{position:absolute;top:14px;right:14px;z-index:7;pointer-events:none;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accentInk);background:var(--accent);padding:6px 12px;border-radius:999px;box-shadow:var(--shadow-out-sm)}
.mdx .mock{animation:mdx-rise .5s var(--tr)}
@keyframes mdx-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.mdx .mock.assemble{animation:none}
.mdx .asm-hud{animation:mdx-hudIn .5s both}.mdx .asm-pipe{animation:mdx-partIn .55s both}
.mdx .asm-flap{backface-visibility:visible;transform-style:preserve-3d;transform-origin:center;position:relative;animation:mdx-flapIn .72s cubic-bezier(.25,.7,.3,1) both}
@keyframes mdx-flapIn{0%{opacity:0;transform:perspective(1100px) rotateX(-360deg) scale(.88);filter:brightness(1.5)}55%{opacity:1;filter:brightness(1.1)}82%{transform:perspective(1100px) rotateX(6deg) scale(1.01)}100%{opacity:1;transform:perspective(1100px) rotateX(0deg) scale(1);filter:none}}
@keyframes mdx-hudIn{0%{opacity:0;transform:translateX(-22px) skewX(-9deg);filter:brightness(1.9)}100%{opacity:1;transform:none;filter:none}}
@keyframes mdx-partIn{0%{opacity:0;transform:scaleX(.35);filter:brightness(2.1)}70%{opacity:1;transform:scaleX(1.04)}100%{opacity:1;transform:none;filter:none}}
.mdx .txt-flip{transform-origin:center;backface-visibility:visible;animation:mdx-txtFlip .55s cubic-bezier(.25,.7,.3,1) both}
@keyframes mdx-txtFlip{0%{transform:perspective(600px) rotateX(-360deg) scale(.9);opacity:.15}55%{opacity:1}82%{transform:perspective(600px) rotateX(6deg) scale(1.02)}100%{transform:none;opacity:1}}
.mdx .mhead{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.mdx .mhead .mtitle{font-size:19px;font-weight:800;letter-spacing:-.01em}
.mdx .mhead .mfull{color:var(--sub);font-size:12.5px}
.mdx .badge{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:5px 10px;border-radius:999px;background:var(--chipbg);color:var(--chipink)}
.mdx .md-chip{margin-left:auto;display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:800;padding:8px 13px;border-radius:999px;background:var(--accent);color:var(--accentInk);box-shadow:var(--shadow-out-sm)}
.mdx .md-chip .r{width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.3)}
.mdx .pipe{display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:var(--panel2);border-radius:var(--r-sm);box-shadow:var(--shadow-in);padding:10px 12px;margin-bottom:14px;border:var(--pborder)}
.mdx .pipe .pl{font-size:10.5px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.05em;margin-right:4px}
.mdx .pipe .node{font-size:11.5px;font-weight:700;color:var(--ink);background:var(--panel);padding:5px 10px;border-radius:8px;box-shadow:var(--shadow-out-sm)}
.mdx .pipe .ar{opacity:.5}.mdx .pipe .ar svg{width:14px;height:14px;stroke:var(--accent);fill:none;stroke-width:2.5}
.mdx .pipe .live{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:var(--ok)}
.mdx .pipe .live .d{width:7px;height:7px;border-radius:50%;background:var(--ok);animation:mdx-blink 1.2s infinite}
@keyframes mdx-blink{50%{opacity:.25}}
.mdx .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
.mdx .tile{background:var(--panel2);border-radius:var(--r-sm);box-shadow:var(--shadow-out-sm);padding:12px 13px;border:var(--pborder)}
.mdx .tile .v{font-size:22px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1}
.mdx .tile .l{font-size:11px;color:var(--sub);font-weight:700;margin-top:5px}
.mdx .tile .s{font-size:10.5px;color:var(--sub);margin-top:2px}
.mdx .cols{display:grid;grid-template-columns:1.35fr 1fr;gap:12px}
.mdx .panel{background:var(--panel2);border-radius:var(--r-sm);box-shadow:var(--shadow-out-sm);padding:14px;border:var(--pborder)}
.mdx .panel h3{margin:0 0 10px;font-size:13px;font-weight:800;color:var(--ink);letter-spacing:-.01em;display:flex;align-items:center;gap:8px}
.mdx .panel h3 .c{color:var(--sub);font-weight:700;font-size:11px}
.mdx .tblwrap{overflow-x:auto}
.mdx table{width:100%;border-collapse:collapse;font-size:12.5px}
.mdx th{text-align:left;color:var(--sub);font-weight:800;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;padding:6px 8px;border-bottom:1px solid var(--line);white-space:nowrap}
.mdx td{padding:8px 8px;border-bottom:1px solid var(--line);font-weight:600}
.mdx tr:last-child td{border-bottom:0}
.mdx .st{font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:999px;white-space:nowrap}
.mdx .st.ok{background:rgba(34,176,125,.16);color:var(--ok)}.mdx .st.warn{background:rgba(245,166,35,.18);color:var(--warn)}.mdx .st.bad{background:rgba(234,67,53,.16);color:var(--bad)}.mdx .st.info{background:var(--chipbg);color:var(--chipink)}
.mdx .note{margin-top:12px;font-size:12px;font-weight:600}
.mdx .list{display:flex;flex-direction:column;gap:8px}
.mdx .li{display:flex;align-items:center;gap:10px;font-size:12.5px;font-weight:600}
.mdx .li .ic{width:30px;height:30px;flex:0 0 30px;border-radius:9px;background:var(--panel);box-shadow:var(--shadow-out-sm);display:flex;align-items:center;justify-content:center;font-size:14px}
.mdx .li .g{flex:1}.mdx .li .g small{display:block;color:var(--sub);font-weight:600;font-size:11px}
.mdx .mlist{display:flex;flex-direction:column;gap:9px}
.mdx .mrow{display:flex;align-items:flex-start;gap:9px;font-size:12.5px;font-weight:600;line-height:1.35}
.mdx .mck{width:18px;height:18px;flex:0 0 18px;border-radius:6px;background:var(--accent);display:flex;align-items:center;justify-content:center;margin-top:1px}
.mdx .mck svg{width:11px;height:11px;stroke:#fff;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.mdx .viewer{background:#05070d;border-radius:12px;overflow:hidden;position:relative;box-shadow:var(--shadow-in)}
.mdx .viewer canvas{display:block;width:100%;height:auto}
.mdx .vtools{position:absolute;top:8px;left:8px;display:flex;gap:6px}
.mdx .vtool{font-size:10px;font-weight:800;color:#bcd;background:rgba(255,255,255,.08);padding:4px 8px;border-radius:6px}
.mdx .vfind{position:absolute;left:8px;bottom:8px;font-size:11px;font-weight:800;color:#fff;background:rgba(234,67,53,.85);padding:5px 10px;border-radius:8px}
.mdx .glue{margin-top:16px;background:var(--panel);border-radius:var(--r);box-shadow:var(--shadow-out);border:var(--pborder);padding:18px}
.mdx .glab{font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px}
.mdx .gnodes{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.mdx .gn{font-size:12px;font-weight:700;color:var(--ink);background:var(--panel2);box-shadow:var(--shadow-out-sm);border:var(--pborder);padding:7px 12px;border-radius:10px}
.mdx .gn.red{background:rgba(234,67,53,.12);color:var(--bad)}
.mdx .core{font-size:13px;font-weight:600;color:var(--ink);line-height:1.6}
.mdx .core .own{color:var(--accent);font-weight:800}
.mdx .foot{margin-top:20px;color:var(--sub);font-size:12px;text-align:center;line-height:1.7}
.mdx .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:60;background:var(--ok);color:#fff;font-weight:800;font-size:13px;padding:12px 18px;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.3)}
.mdx .modal{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(8,14,30,.55);backdrop-filter:blur(4px)}
.mdx .modal-card{position:relative;width:100%;max-width:440px;max-height:90vh;overflow:auto;background:var(--panel);border-radius:var(--r);box-shadow:var(--shadow-out);border:var(--pborder);padding:24px}
.mdx .modal-x{position:absolute;top:14px;right:14px;border:0;cursor:pointer;background:var(--panel2);color:var(--sub);box-shadow:var(--shadow-out-sm);width:32px;height:32px;border-radius:50%;font-size:13px;font-weight:800}
.mdx .lockrow{display:flex;align-items:center;gap:9px;font-size:12.5px;font-weight:700;color:var(--chipink);background:var(--chipbg);border-radius:12px;padding:11px 13px;margin-bottom:16px}
.mdx .auth-tabs{display:flex;gap:6px;padding:5px;border-radius:999px;background:var(--panel2);box-shadow:var(--shadow-in);margin-bottom:18px}
.mdx .auth-tab{flex:1;border:0;cursor:pointer;font-family:var(--font);font-weight:800;font-size:13.5px;color:var(--sub);background:transparent;padding:10px;border-radius:999px;transition:all .2s}
.mdx .auth-tab[aria-pressed="true"]{color:var(--accentInk);background:var(--accent);box-shadow:var(--shadow-out-sm)}
.mdx .auth-h{font-size:22px;font-weight:800;letter-spacing:-.02em}
.mdx .auth-sub{color:var(--sub);font-size:12.5px;margin:4px 0 18px;font-weight:600}
.mdx .fields{display:flex;flex-direction:column;gap:12px}
.mdx .f{display:flex;flex-direction:column;gap:6px}
.mdx .f>span{font-size:11px;font-weight:800;color:var(--sub);text-transform:uppercase;letter-spacing:.04em}
.mdx .f input{border:0;background:var(--panel2);box-shadow:var(--shadow-in);border-radius:var(--r-sm);padding:12px 14px;font-family:var(--font);font-size:14px;font-weight:600;color:var(--ink);outline:none;border:var(--pborder)}
.mdx .f input::placeholder{color:var(--sub);font-weight:500}
.mdx .fhint{font-size:10.5px;color:var(--sub);font-weight:600;line-height:1.4;text-transform:none;letter-spacing:0}
.mdx .seg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mdx .seg button{border:0;cursor:pointer;font-family:var(--font);font-weight:700;font-size:12.5px;color:var(--ink);background:var(--panel2);box-shadow:var(--shadow-out-sm);border:var(--pborder);border-radius:var(--r-sm);padding:11px;transition:all .18s}
.mdx .seg button[aria-pressed="true"]{color:var(--accentInk);background:var(--accent)}
.mdx .authgo{width:100%;margin-top:18px;padding:14px}
.mdx .oauth{display:flex;gap:8px;margin-top:12px}
.mdx .obtn{flex:1;border:0;cursor:pointer;font-family:var(--font);font-weight:700;font-size:12.5px;color:var(--ink);background:var(--panel);box-shadow:var(--shadow-out-sm);border:var(--pborder);border-radius:var(--r-sm);padding:11px}
.mdx .err{color:var(--bad);font-size:12.5px;font-weight:700;margin-top:12px}
.mdx .auth-foot{color:var(--sub);font-size:11px;text-align:center;margin-top:14px;line-height:1.6}
/* ===== Light (Soft Console) = white flip-clock shells, dark faces, white text ===== */
.mdx[data-skin="console"] .tile,.mdx[data-skin="console"] .panel,.mdx[data-skin="console"] .pipe{background:#17191e;color:#fff;border:8px solid #ffffff;border-radius:22px;box-shadow:0 14px 32px rgba(20,32,56,.14)}
.mdx[data-skin="console"] .tile .v{color:#fff;font-weight:800}
.mdx[data-skin="console"] .tile .l,.mdx[data-skin="console"] .tile .s{color:rgba(255,255,255,.62)}
.mdx[data-skin="console"] .panel h3{color:#fff}.mdx[data-skin="console"] .panel h3 .c{color:rgba(255,255,255,.5)}
.mdx[data-skin="console"] th{color:rgba(255,255,255,.55);border-color:rgba(255,255,255,.14)}
.mdx[data-skin="console"] td{color:#fff;border-color:rgba(255,255,255,.10)}
.mdx[data-skin="console"] .li{color:#fff}.mdx[data-skin="console"] .li .g small{color:rgba(255,255,255,.55)}
.mdx[data-skin="console"] .li .ic{background:#0e1014;color:#fff;box-shadow:none;border:1px solid rgba(255,255,255,.14)}
.mdx[data-skin="console"] .mrow{color:#fff}
.mdx[data-skin="console"] .note{color:#fff}
.mdx[data-skin="console"] .pipe .pl{color:rgba(255,255,255,.6)}
.mdx[data-skin="console"] .pipe .node{background:#0e1014;color:#fff;box-shadow:none;border:1px solid rgba(255,255,255,.14)}
/* ===== Dark = charcoal flip-clock units ===== */
.mdx[data-skin="dark"] .tile,.mdx[data-skin="dark"] .panel,.mdx[data-skin="dark"] .pipe{background:#151518;color:#fff;border:8px solid #34343c;border-radius:22px;box-shadow:8px 8px 18px #101012,-8px -8px 18px #3a3a45}
.mdx[data-skin="dark"] .tile .v{color:#fff;font-weight:800}
.mdx[data-skin="dark"] .tile .l,.mdx[data-skin="dark"] .tile .s{color:rgba(255,255,255,.6)}
.mdx[data-skin="dark"] .panel h3{color:#fff}.mdx[data-skin="dark"] .panel h3 .c{color:rgba(255,255,255,.5)}
.mdx[data-skin="dark"] th{color:rgba(255,255,255,.52);border-color:rgba(255,255,255,.12)}
.mdx[data-skin="dark"] td{color:#fff;border-color:rgba(255,255,255,.08)}
.mdx[data-skin="dark"] .li{color:#fff}.mdx[data-skin="dark"] .li .g small{color:rgba(255,255,255,.5)}
.mdx[data-skin="dark"] .li .ic{background:#0d0d10;color:#fff;box-shadow:none;border:1px solid rgba(255,255,255,.12)}
.mdx[data-skin="dark"] .mrow{color:#fff}.mdx[data-skin="dark"] .note{color:#fff}
.mdx[data-skin="dark"] .pipe .pl{color:rgba(255,255,255,.55)}
.mdx[data-skin="dark"] .pipe .node{background:#0d0d10;color:#fff;box-shadow:none;border:1px solid rgba(255,255,255,.12)}
.mdx[data-skin="dark"] .hint,.mdx[data-skin="dark"] .cg .catlab,.mdx[data-skin="dark"] .tchip{color:#fff}
@media (max-width:720px){.mdx .kpis{grid-template-columns:1fr 1fr}.mdx .cols{grid-template-columns:1fr}.mdx .cg .catlab{flex-basis:100%}.mdx .skins{width:100%;justify-content:center}}
@media (prefers-reduced-motion:reduce){.mdx .asm-hud,.mdx .asm-pipe,.mdx .asm-flap,.mdx .txt-flip{animation:mdx-rise .3s both}}
`;
