// De Novo AI Synthesis — turns the deterministic optimiser result into a
// structured, buildable protocol via the EXISTING Anthropic chat Worker, with
// every step/facility/product mapped to a REAL Stemcells Protocol page.
//
// The AI is grounded: it may only reference protocol codes, products and
// facility levels we hand it (drawn from the live registries), and it must not
// invent success numbers. Anything it returns is validated back against the
// registries — hallucinated refs are dropped — and if the JSON can't be parsed
// we fall back to the plain instruction text. Honest, always-valid links.

import { PROTOCOLS, byCode } from '../protocols/registry';
import { FACILITY_SUMMARY } from '../protocols/facility';
import { PRODUCTS } from '../data/products';
import type { Optimization } from './optimize';

export interface SynthProtocolRef { code: string; name: string; category: string; route?: string; cellSource?: string; }
export interface SynthStep { title: string; instruction: string; protocol?: SynthProtocolRef; }
export interface SynthFacility { n: string; name: string; tagline?: string; }
export interface SynthProduct { name: string; category?: string; status?: string; }
export interface SynthResult {
  summary: string;
  facility?: SynthFacility;
  products: SynthProduct[];
  steps: SynthStep[];
  narrative: string;   // human-readable instructions (also the PDF/plain fallback)
}

export interface SynthCandidates {
  protocols: { code: string; name: string; category: string; route?: string; cellSource?: string }[];
  products: SynthProduct[];
  facilities: SynthFacility[];
}

// Pick the real registry items most relevant to this run, to offer the AI.
export function synthCandidates(opt: Optimization): SynthCandidates {
  const dz = opt.ctx.disease;
  const q = `${dz.disease} ${dz.department} ${dz.tissue}`.toLowerCase();
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const score = (name: string, extra: string) => {
    const t = `${name} ${extra}`.toLowerCase();
    return words.filter((w) => t.includes(w)).length;
  };
  const protocols = [...PROTOCOLS]
    .map((p) => ({ p, s: score(p.name, p.indication || '') }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 10)
    .map(({ p }) => ({ code: p.code, name: p.name, category: p.category, route: p.route, cellSource: p.cellSource }));

  const catKey = String(opt.ctx.category || '').toLowerCase().slice(0, 3);
  const matchedProducts = PRODUCTS.filter((pr) => String(pr.category || '').toLowerCase().includes(catKey));
  const products = (matchedProducts.length ? matchedProducts : PRODUCTS)
    .slice(0, 6)
    .map((pr) => ({ name: pr.name, category: (pr as any).category, status: pr.status }));

  const facilities = FACILITY_SUMMARY.map((f) => ({ n: f.n, name: f.name, tagline: (f as any).costNote || (f as any).cumulative || undefined }));
  return { protocols, products, facilities };
}

export function buildSynthesisPrompt(opt: Optimization, cand: SynthCandidates): string {
  const b = opt.best;
  const protoList = cand.protocols.map((p) => `${p.code} — ${p.name} (${p.route || 'route n/a'}; ${p.cellSource || ''})`).join('\n');
  const prodList = cand.products.map((p) => `- ${p.name} [${p.status}]`).join('\n');
  const facList = cand.facilities.map((f) => `Level ${f.n} — ${f.name} (${f.tagline || ''})`).join('\n');
  return (
`You are a cell-therapy manufacturing & delivery protocol designer for StemCells Protocol. An in-browser ILLUSTRATIVE model already optimised a formulation. Design the buildable De Novo protocol for it.

STRICT RULES
- Do NOT invent or change success numbers.
- You may ONLY reference protocol codes, products and facility levels from the lists below. If unsure, omit the reference (set "protocolCode" to null) — never invent a code or product.
- Output ONE JSON object and NOTHING else (no prose, no markdown fences).

FORMULATION (illustrative)
- Condition: ${opt.ctx.disease.disease} (${opt.ctx.disease.department} · ${opt.ctx.disease.tissue})
- Patient epigenetic (DNAm) age: ${opt.ctx.dnamAge.toFixed(1)} yr
- Cell source: ${b.cellSourceLabel}${b.cellSource === 'allogeneic' ? ` (${b.hla})` : ''} · Route: ${b.route} · Protocol enhancer: ${b.protocolLabel}
- Success levers applied: age-matched donor selection${b.hlaMatched ? ', HLA-matched donor' : ''}, ${b.protocolLabel}.
- Modelled success: ${Math.round(b.success * 100)}% (baseline ${Math.round(opt.baseline.success * 100)}%) · ~${b.weeks} wk prep

DESIGN NOTES (reflect these in the protocol)
- Donor choice is age-dependent: a young patient's own (autologous) cells are potent, but an OLDER patient's own cells are senescent, so a young-donor ALLOGENEIC graft raises success.
- For allogeneic grafts, prefer an HLA-matched donor (raises success, lowers rejection/GvHD).

AVAILABLE PROTOCOL CODES
${protoList}

AVAILABLE PRODUCTS
${prodList}

FACILITY LEVELS
${facList}

Return JSON with EXACTLY this shape:
{
  "summary": "one sentence describing the novel protocol",
  "facilityLevel": "1" | "2" | "3",
  "products": ["<exact product name from the list>", ...],
  "steps": [
    { "title": "short step name", "protocolCode": "<code from the list or null>", "instruction": "2-3 sentence buildable instruction (culture, dose, delivery, monitoring)" }
  ]
}
Provide 5-7 steps, ordered from sourcing to delivery to follow-up. Keep instructions concrete and clinical.`
  );
}

// Strip fences/prose and parse the first JSON object.
function extractJson(raw: string): any | null {
  if (!raw) return null;
  let s = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch { return null; }
}

// Validate the AI JSON against the live registries; return a SynthResult (or
// null → caller shows the raw text as instructions).
export function parseSynthesis(raw: string): SynthResult | null {
  const j = extractJson(raw);
  if (!j || !Array.isArray(j.steps)) return null;

  const facility = FACILITY_SUMMARY.find((f) => f.n === String(j.facilityLevel));
  const fac: SynthFacility | undefined = facility ? { n: facility.n, name: facility.name, tagline: (facility as any).costNote || (facility as any).cumulative || undefined } : undefined;

  const wantProducts: string[] = Array.isArray(j.products) ? j.products.map((x: any) => String(x)) : [];
  const products: SynthProduct[] = PRODUCTS
    .filter((pr) => wantProducts.some((w) => w.toLowerCase().includes(pr.name.toLowerCase().split(' (')[0]) || pr.name.toLowerCase().includes(w.toLowerCase())))
    .map((pr) => ({ name: pr.name, category: (pr as any).category, status: pr.status }));

  const steps: SynthStep[] = j.steps.slice(0, 8).map((st: any) => {
    const code = st?.protocolCode ? String(st.protocolCode) : '';
    const p = code ? byCode(code) : undefined;
    return {
      title: String(st?.title || 'Step').slice(0, 80),
      instruction: String(st?.instruction || '').slice(0, 600),
      protocol: p ? { code: p.code, name: p.name, category: p.category, route: p.route, cellSource: p.cellSource } : undefined,
    };
  }).filter((s: SynthStep) => s.title || s.instruction);

  if (!steps.length) return null;

  const narrative = steps.map((s, i) => `${i + 1}. ${s.title}${s.protocol ? ` [${s.protocol.code}]` : ''}\n   ${s.instruction}`).join('\n');
  return {
    summary: String(j.summary || opt_summaryFallback()).slice(0, 240),
    facility: fac,
    products,
    steps,
    narrative,
  };
}

function opt_summaryFallback() { return 'De Novo build protocol (illustrative).'; }

// Plain-text instructions (for PDF export / onAiBrief / fallback).
export function synthNarrative(r: SynthResult): string {
  const head = r.summary ? `${r.summary}\n` : '';
  const fac = r.facility ? `Facility: Level ${r.facility.n} — ${r.facility.name}\n` : '';
  const prod = r.products.length ? `Products: ${r.products.map((p) => p.name).join(', ')}\n` : '';
  return `${head}${fac}${prod}\n${r.narrative}\n\nIllustrative AI-generated build protocol — not a validated therapy or clinical success rate.`;
}
