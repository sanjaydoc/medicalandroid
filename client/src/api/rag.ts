// Offline retrieval over the bundled drug reference (data/druginfo.ts). Lexical
// (name + keyword) scoring — no embedding model, so it runs fully on-device. Drug
// queries key on the drug NAME, which lexical matching handles well and reliably.
import { DRUG_KB, DRUG_SOURCE, type DrugEntry } from '../data/druginfo';

function toks(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9+ ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
}

export interface Retrieved { context: string; sources: string[]; hits: DrugEntry[]; }

/** Retrieve the top drug entries relevant to the query. */
export function retrieveDrugContext(query: string, topk = 2): Retrieved {
  const ql = ' ' + query.toLowerCase() + ' ';
  const qt = toks(query);
  const scored = DRUG_KB.map((d) => {
    let score = 0;
    for (const n of [d.name, ...d.aka]) {
      const nl = n.toLowerCase();
      if (ql.includes(' ' + nl + ' ') || ql.includes(nl)) score += 10; // exact name/brand hit
    }
    const bag = toks(d.name + ' ' + d.aka.join(' ') + ' ' + d.uses + ' ' + d.cls);
    for (const t of qt) if (bag.includes(t)) score += 1; // keyword overlap
    return { d, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, topk);

  const hits = scored.map((x) => x.d);
  const context = hits.map((d) =>
    `• ${d.name} (${d.cls})\n  Uses: ${d.uses}\n  Typical adult dose: ${d.adultDose}\n  Precautions: ${d.precautions}\n  Interactions: ${d.interactions}`,
  ).join('\n');
  return { context, sources: hits.length ? [DRUG_SOURCE] : [], hits };
}
