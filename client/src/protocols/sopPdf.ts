// Downloadable Standard Operating Procedure (SOP) sheet for one coded protocol.
// Client-side (jsPDF) — a clean, printable clinical SOP a facility can file/follow.
import { jsPDF } from 'jspdf';
import type { Protocol } from './registry';
import { CATEGORIES, slug } from './registry';
import { COMMON_PRECHECKS, DISCLAIMER } from './standards';

type RGB = [number, number, number];
const PRIMARY: RGB = [66, 133, 244];
const INK: RGB = [15, 23, 42];
const SUB: RGB = [100, 116, 139];
const BORDER: RGB = [226, 232, 240];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [22, 163, 74];
const AMBER: RGB = [245, 158, 11];

// jsPDF's core Helvetica lacks many glyphs — map unicode to safe ASCII.
function clean(s: string): string {
  if (s == null) return '';
  const sup: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
  const sub: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
  return String(s)
    .replace(/[⁰¹²³⁴-⁹]/g, (c) => '^' + (sup[c] || ''))
    .replace(/[₀-₉]/g, (c) => sub[c] || '')
    .replace(/×/g, 'x').replace(/≥/g, '>=').replace(/≤/g, '<=')
    .replace(/[–—]/g, '-').replace(/µ/g, 'u').replace(/Δ/g, 'D').replace(/±/g, '+/-')
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/↔/g, '<->').replace(/→/g, '->').replace(/·/g, '-')
    .replace(/✓/g, '[x]').replace(/β/g, 'beta').replace(/α/g, 'alpha')
    .replace(/[^\x00-\x7F]/g, '');
}

export function exportSopPdf(p: Protocol) {
  const c = CATEGORIES.find((x) => x.key === p.category);
  const accent: RGB = c ? hexToRgb(c.accent) : PRIMARY;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 42; const CW = W - 2 * M;
  let y = 0;
  const fill = (col: RGB) => doc.setFillColor(col[0], col[1], col[2]);
  const txt = (col: RGB) => doc.setTextColor(col[0], col[1], col[2]);
  const stroke = (col: RGB) => doc.setDrawColor(col[0], col[1], col[2]);
  const need = (h: number) => { if (y + h > H - 54) { doc.addPage(); y = M; } };

  // Header band
  fill(accent); doc.rect(0, 0, W, 74, 'F');
  txt(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('STEMCELLS PROTOCOL', M, 26);
  doc.setFontSize(15); doc.text('Standard Operating Procedure', M, 46);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text('Coded therapy protocol - draft standard v0.1', M, 60);
  // code chip on the right
  fill(WHITE); doc.roundedRect(W - M - 92, 20, 92, 34, 6, 6, 'F');
  txt(accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
  doc.text(clean(p.code), W - M - 46, 43, { align: 'center' });
  y = 92;

  // Title + status
  txt(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  const titleLines = doc.splitTextToSize(clean(p.name), CW - 120);
  doc.text(titleLines, M, y);
  const statusCol = p.status === 'established' ? GREEN : AMBER;
  fill([statusCol[0], statusCol[1], statusCol[2]]);
  const stW = 96; doc.roundedRect(W - M - stW, y - 12, stW, 18, 9, 9, 'F');
  txt(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text(p.status === 'established' ? 'ESTABLISHED' : 'INVESTIGATIONAL', W - M - stW / 2, y + 1, { align: 'center' });
  y += titleLines.length * 17 + 6;
  if (p.aka) { txt(SUB); doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.text(clean(p.aka), M, y); y += 14; }

  // Meta table
  const meta: [string, string][] = [
    ['Category', c ? `${p.category} - ${c.name}` : p.category],
    ['Indication', p.indication],
    ['Cell / product source', p.cellSource],
  ];
  if (p.route) meta.push(['Delivery route', p.route]);
  if (p.regions) meta.push(['Notably practised', p.regions]);
  y += 4; kvTable(meta);

  // Sections
  const kvRows = (rows: [string, string][]) => kvTable(rows);
  const bullets = (items: string[], ordered = false) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); txt(INK);
    items.forEach((it, i) => {
      const prefix = ordered ? `${i + 1}. ` : '-  ';
      const lines = doc.splitTextToSize(prefix + clean(it), CW - 6);
      need(lines.length * 12 + 2);
      doc.text(lines, M + 4, y + 9);
      y += lines.length * 12 + 3;
    });
    y += 4;
  };
  const para = (t: string) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); txt(INK); const l = doc.splitTextToSize(clean(t), CW); need(l.length * 12); doc.text(l, M, y + 9); y += l.length * 12 + 6; };

  let n = 0;
  const section = (title: string) => {
    n += 1; need(28);
    fill(accent); doc.roundedRect(M, y, 16, 16, 3, 3, 'F');
    txt(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(String(n), M + 8, y + 11.5, { align: 'center' });
    txt(INK); doc.setFontSize(11.5); doc.text(clean(title), M + 24, y + 12);
    stroke(tint(accent, 0.5)); doc.setLineWidth(0.8); doc.line(M, y + 20, M + CW, y + 20);
    y += 28;
  };

  section('Purpose & indication'); para(p.indication);
  section('Product, mechanism & identity');
  const pm: [string, string][] = [['Cell / product', p.cellSource], ['Mechanism', p.mechanism]];
  if (p.identity) pm.push(['Identity / potency / release', p.identity]);
  kvRows(pm);
  if (p.dose || p.schedule) {
    section('Dose & schedule');
    const ds: [string, string][] = [];
    if (p.dose) ds.push(['Dose (typical published range)', p.dose]);
    if (p.schedule) ds.push(['Schedule / intervals', p.schedule]);
    kvRows(ds);
    para('Ranges are typical/illustrative and validation-required - not fixed instructions.');
  }
  section('Pre-procedure checks');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); txt(SUB); need(14); doc.text('Universal pre-checks', M, y + 8); y += 14;
  bullets(COMMON_PRECHECKS, true);
  if (p.preScreen && p.preScreen.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); txt(SUB); need(14); doc.text('Therapy-specific screening', M, y + 8); y += 14;
    bullets(p.preScreen);
  }
  section('Administration procedure');
  if (p.steps && p.steps.length) bullets(p.steps, true); else para('Route-standard administration per institutional SOP.');
  if (p.consumables && p.consumables.length) {
    section('Consumables, products & disposables');
    bullets(p.consumables.map((x) => x.examples ? `${x.item} - e.g. ${x.examples}` : x.item));
    para('Brands are representative categories, not endorsements or mandates - select per your regulator & supply chain.');
  }
  if (p.qcRelease) { section('QC / release criteria'); bullets(p.qcRelease); }
  if (p.monitoring) { section('Monitoring'); bullets(p.monitoring); }
  if (p.adverse) { section('Safety & adverse events'); bullets(p.adverse); para('Run the StemCells Protocol Simulator for a per-patient immune / adverse-event risk read before treatment.'); }
  if (p.contraindications) { section('Contraindications & precautions'); bullets(p.contraindications); }
  if (p.storage) { section('Storage & handling'); para(p.storage); }
  if (p.governance) { section('Governance & standards'); bullets(p.governance); }
  if (p.evidence || (p.references && p.references.length)) {
    section('Evidence & references');
    if (p.evidence) para(p.evidence);
    if (p.references) bullets(p.references.map((r) => `${r.label} - ${r.note}`));
  }

  // Disclaimer box
  need(58);
  fill(tint(accent, 0.08)); doc.roundedRect(M, y, CW, 50, 5, 5, 'F'); stroke(tint(accent, 0.4)); doc.setLineWidth(0.5); doc.roundedRect(M, y, CW, 50, 5, 5);
  txt(SUB); doc.setFont('helvetica', 'italic'); doc.setFontSize(7.6);
  doc.text(doc.splitTextToSize(clean(DISCLAIMER), CW - 16), M + 8, y + 12);
  y += 58;

  // Signature block (SOP convention)
  need(64);
  txt(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('Local adoption sign-off', M, y + 8); y += 16;
  const cols = ['Prepared by', 'Reviewed by (clinical)', 'Approved by (QA/medical director)'];
  const cwid = (CW - 20) / 3;
  cols.forEach((label, i) => {
    const x = M + i * (cwid + 10);
    stroke(BORDER); doc.setLineWidth(0.5); doc.line(x, y + 22, x + cwid, y + 22);
    txt(SUB); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(clean(label), x, y + 32);
    doc.line(x, y + 46, x + cwid, y + 46);
    doc.text('Signature / date', x, y + 56);
  });
  y += 64;

  // Footers on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    stroke(BORDER); doc.setLineWidth(0.5); doc.line(M, H - 34, W - M, H - 34);
    txt(SUB); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(clean(`${p.code} - ${p.name}  -  StemCells Protocol Standard v0.1 (draft)  -  not medical advice`), M, H - 22);
    doc.text(`Page ${i} / ${pages}`, W - M, H - 22, { align: 'right' });
  }

  doc.save(`SOP-${p.code}-${slug(p.name)}.pdf`);

  function kvTable(rows: [string, string][]) {
    const kw = 150; const lh = 12;
    rows.forEach(([k, v]) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const lines = doc.splitTextToSize(clean(v), CW - kw - 12);
      const rh = Math.max(18, lines.length * lh + 6);
      need(rh);
      fill(tint(accent, 0.1)); doc.rect(M, y, kw, rh, 'F');
      fill(WHITE); doc.rect(M + kw, y, CW - kw, rh, 'F');
      stroke(BORDER); doc.setLineWidth(0.4); doc.rect(M, y, CW, rh);
      txt([26, 86, 219]); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(clean(k), M + 6, y + 12);
      txt(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(lines, M + kw + 6, y + 12);
      y += rh;
    });
    y += 8;
  }
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function tint(c: RGB, f: number): RGB {
  return [Math.round(255 - (255 - c[0]) * f), Math.round(255 - (255 - c[1]) * f), Math.round(255 - (255 - c[2]) * f)];
}
