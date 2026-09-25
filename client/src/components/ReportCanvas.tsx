import { useEffect, useMemo, useRef, useState } from 'react';
import type { PageData } from '../api/pdfDoc';

// ── Types (shared with ChatWidget) ────────────────────────────────
export interface Finding {
  section?: string;
  label: string;
  value?: string;
  range?: string;
  status: 'ok' | 'flag';
  note?: string;
}
export interface ImageFinding { status: 'flag' | 'ok'; label: string; note?: string; }
export interface SimpleItem { sev: 'watch' | 'mild' | 'ok'; title: string; detail: string; }
export interface Med {
  name: string;
  strength?: string;
  dose?: string;      // OD / BD / TDS / 1-0-1 as written
  freqText?: string;  // plain expansion
  food?: string;      // before / after / with food (only if stated)
  duration?: string;  // e.g. 5 days (only if stated)
  purpose?: string;   // what it's for
}
export interface ParsedReport {
  type: 'lab' | 'imaging' | 'rx';
  title?: string;
  findings?: Finding[];
  imageFindings?: ImageFinding[];
  meds?: Med[];
  simple: SimpleItem[];
  seriousLevel: string;
  serious: string[];
  next: string[];
}

// Strip emoji / pictographs so the professional 2D-only look is guaranteed.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}️‍]/gu;
export const stripEmoji = (s: string): string =>
  typeof s === 'string' ? s.replace(EMOJI, '').replace(/[ \t]{2,}/g, ' ').trim() : s;

function cleanReport(o: ParsedReport): ParsedReport {
  const c = stripEmoji;
  o.title = c(o.title || '');
  o.seriousLevel = c(o.seriousLevel || '');
  o.serious = (o.serious || []).map(c);
  o.next = (o.next || []).map(c);
  o.simple = (o.simple || []).map((f) => ({ ...f, title: c(f.title), detail: c(f.detail) }));
  if (o.findings) o.findings = o.findings.map((f) => ({ ...f, section: c(f.section || ''), label: c(f.label), value: c(f.value || ''), range: c(f.range || ''), note: c(f.note || '') }));
  if (o.imageFindings) o.imageFindings = o.imageFindings.map((f) => ({ ...f, label: c(f.label), note: c(f.note || '') }));
  if (o.meds) o.meds = o.meds.map((m) => ({ ...m, name: c(m.name), strength: c(m.strength || ''), dose: c(m.dose || ''), freqText: c(m.freqText || ''), food: c(m.food || ''), duration: c(m.duration || ''), purpose: c(m.purpose || '') }));
  return o;
}

// Best-effort repair for truncated JSON (the stream can get cut off mid-array):
// close any unclosed strings/arrays/objects so we can still render the summary +
// whatever findings arrived.
function repairJson(input: string): any | null {
  try { return JSON.parse(input); } catch { /* fall through */ }
  let s = input;
  const lastBrace = s.lastIndexOf('}');
  if (lastBrace < 0) return null;
  s = s.slice(0, lastBrace + 1).replace(/,\s*$/, '');
  let curly = 0, square = 0, inStr = false, esc = false;
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') curly++; else if (ch === '}') curly--;
    else if (ch === '[') square++; else if (ch === ']') square--;
  }
  let tail = '';
  while (square-- > 0) tail += ']';
  while (curly-- > 0) tail += '}';
  try { return JSON.parse(s.replace(/,\s*$/, '') + tail); } catch { return null; }
}

export function parseReport(raw: string): ParsedReport | null {
  if (!raw) return null;
  try {
    let s = raw.trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a < 0) return null;
    const candidate = b > a ? s.slice(a, b + 1) : s.slice(a);
    const obj = repairJson(candidate);
    if (!obj || !Array.isArray(obj.simple) || !obj.type) return null;
    return cleanReport(obj as ParsedReport);
  } catch {
    return null;
  }
}

// Illustrative box slots for imaging (the model does NOT localise — clearly
// labelled illustrative regions per the honesty guardrail).
const SLOTS = [
  { x: 14, y: 30, w: 32, h: 20 }, { x: 54, y: 32, w: 32, h: 20 },
  { x: 16, y: 60, w: 34, h: 18 }, { x: 52, y: 60, w: 34, h: 18 },
];
const SEV: Record<string, string> = { watch: '#d97706', mild: '#eab308', ok: '#16a34a' };

const IC = {
  simple: <svg viewBox="0 0 24 24" style={{ color: '#2f6fe0' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>,
  serious: <svg viewBox="0 0 24 24" style={{ color: '#d97706' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9 16H3z" /><path d="M12 9v5M12 17h.01" /></svg>,
  next: <svg viewBox="0 0 24 24" style={{ color: '#16a34a' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  meds: <svg viewBox="0 0 24 24" style={{ color: '#2f6fe0' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="8" rx="4" /><path d="M12 8v8" /></svg>,
};

// Expand a frequency code into a plain badge label (falls back to the raw code).
const FREQ: Record<string, string> = {
  od: 'once a day', bd: 'twice a day', bds: 'twice a day', tds: '3 times a day',
  tid: '3 times a day', qid: '4 times a day', hs: 'at night', sos: 'if needed', stat: 'now, once',
};
const freqLabel = (dose?: string, freqText?: string): string => {
  const d = (dose || '').trim();
  const key = d.toLowerCase().replace(/[^a-z]/g, '');
  if (FREQ[key]) return FREQ[key];
  if (freqText && freqText.trim()) return freqText.trim();
  return d;
};

// A red box placed on a real page (percentages of the page image).
interface PageBox { page: number; left: number; top: number; width: number; height: number; label: string; }

const norm = (s: string) => (s || '').toLowerCase().replace(/[^0-9a-z.+/%-]/g, '');

// Match each flagged finding to its actual position on the rendered PDF pages
// using the text layer, so red boxes land on the real values.
function matchBoxes(report: ParsedReport, pages: PageData[]): PageBox[] {
  const boxes: PageBox[] = [];
  const flagged = (report.findings || []).filter((f) => f.status === 'flag');
  for (const f of flagged) {
    const v = norm(f.value || '');
    if (v.length < 2) continue;
    let best: { pi: number; it: PageData['items'][number] } | null = null;
    for (let pi = 0; pi < pages.length; pi++) {
      for (const it of pages[pi].items) {
        const n = norm(it.str);
        if (!n) continue;
        if (n === v || (n.length >= 2 && (n.includes(v) || v.includes(n)))) {
          best = { pi, it };
          if (n === v) break;
        }
      }
      if (best && norm(best.it.str) === v) break;
    }
    if (!best) continue;
    const pg = pages[best.pi];
    const padX = pg.w * 0.006, padY = pg.h * 0.004;
    boxes.push({
      page: best.pi,
      left: Math.max(0, (best.it.x - padX) / pg.w) * 100,
      top: Math.max(0, (best.it.y - padY) / pg.h) * 100,
      width: Math.min(100, ((best.it.w + padX * 2) / pg.w) * 100),
      height: ((best.it.h + padY * 2) / pg.h) * 100,
      label: f.note || f.label,
    });
  }
  return boxes;
}

export default function ReportCanvas({
  report, loading, imageUrl, pages, instant,
}: {
  report?: ParsedReport | null;
  loading?: boolean;
  imageUrl?: string;
  pages?: PageData[];
  instant?: boolean; // restored from history — show final state, skip animation
}) {
  const isImaging = report?.type === 'imaging';
  const isRx = report?.type === 'rx';
  const meds = report?.meds || [];
  const hasPages = !!(pages && pages.length);
  const hasText = !!(pages && pages.some((p) => p.items.length));

  const boxes = useMemo(() => (report && hasText ? matchBoxes(report, pages!) : []), [report, hasText, pages]);

  // page shown in the reader
  const [pageIdx, setPageIdx] = useState(0);
  const [scanning, setScanning] = useState(!instant);
  const [shownBoxes, setShownBoxes] = useState(0); // boxes revealed on current page
  const [imgBoxes, setImgBoxes] = useState(0);     // illustrative imaging boxes revealed
  const [rows, setRows] = useState<Set<number>>(new Set()); // synthesized-row marks (fallback)
  const [phase, setPhase] = useState<'read' | 'cards'>(instant ? 'cards' : 'read');
  const [collapsed, setCollapsed] = useState(!!instant); // scan canvas folded into a clickable card
  const [segIdx, setSegIdx] = useState(instant ? 1e9 : 0); // typewriter: which segment (all shown when restored)
  const [wIdx, setWIdx] = useState(0);               // typewriter: words shown in current segment

  const labRows = report?.findings || [];
  // Imaging: prefer the flagged findings; if the read is clean (no flags), still
  // mark the first few regions the AI described so the live marking always shows.
  const imgFlagged = (report?.imageFindings || []).filter((f) => f.status === 'flag');
  const imgFindings = (imgFlagged.length ? imgFlagged : (report?.imageFindings || [])).slice(0, SLOTS.length);
  const shortLabel = (s: string) => {
    const t = (s || '').split(/[:—-]/)[0].trim(); // take the region part before a colon/dash
    return t.length > 26 ? t.slice(0, 24) + '…' : t;
  };
  const boxesForPage = boxes.filter((b) => b.page === pageIdx);

  // Flat, ordered list of card segments to type out word-by-word (simple →
  // serious → next), so the cards fill in like a normal chat reply.
  interface Seg { card: 'meds' | 'simple' | 'serious' | 'next'; sev?: string; num?: number; level?: boolean; medIdx?: number; head: string[]; body: string[]; }
  const segs = useMemo<Seg[]>(() => {
    if (!report) return [];
    const out: Seg[] = [];
    // Prescriptions: reveal each medicine row first (name drives the tick count).
    (report.meds || []).forEach((m, i) => out.push({
      card: 'meds', medIdx: i,
      head: (m.name || 'Medicine').split(/\s+/).filter(Boolean),
      body: [],
    }));
    (report.simple || []).forEach((f) => out.push({
      card: 'simple', sev: SEV[f.sev] || SEV.mild,
      head: (f.title || '').split(/\s+/).filter(Boolean),
      body: (f.detail || '').split(/\s+/).filter(Boolean),
    }));
    if (report.seriousLevel) out.push({ card: 'serious', level: true, head: [], body: report.seriousLevel.split(/\s+/).filter(Boolean) });
    (report.serious || []).forEach((t) => out.push({ card: 'serious', head: [], body: (t || '').split(/\s+/).filter(Boolean) }));
    (report.next || []).forEach((t, i) => out.push({ card: 'next', num: i + 1, head: [], body: (t || '').split(/\s+/).filter(Boolean) }));
    return out;
  }, [report]);
  // Meds reveal as whole rows; give each a small minimum so they pop in sequence.
  const segTotal = (s: Seg) => (s.card === 'meds' ? Math.max(3, s.head.length) : s.head.length + s.body.length);

  // ---- loading: cycle through the real pages, scanning ----
  useEffect(() => {
    if (!loading || !hasPages) return;
    setScanning(true);
    if (pages!.length < 2) return;
    let i = pageIdx;
    const t = setInterval(() => { i = (i + 1) % pages!.length; setPageIdx(i); }, 2200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasPages]);

  // ---- report ready: run the marking, then (in a second effect) type the cards ----
  useEffect(() => {
    if (loading || !report || instant) return; // restored reports show final state, no animation
    const timers: ReturnType<typeof setTimeout>[] = [];
    setScanning(true); setShownBoxes(0); setImgBoxes(0); setRows(new Set()); setCollapsed(false); setPhase('read');

    // When the marking finishes: collapse the scan into a tappable card and flip
    // to the cards phase (the typewriter effect below then types them out).
    const startCards = (delay: number) => {
      timers.push(setTimeout(() => { setScanning(false); setCollapsed(true); setPhase('cards'); }, delay));
    };

    if (hasText && boxes.length) {
      // Real PDF pages + grounded red boxes — walk through each page that has
      // findings, scanning it and popping its red boxes live, then the next page.
      const pagesWithBoxes = Array.from(new Set(boxes.map((b) => b.page))).sort((a, b) => a - b);
      let t = 500;
      const STEP = 500;   // per box
      const GAP = 900;    // pause between pages
      pagesWithBoxes.forEach((p) => {
        const cnt = boxes.filter((b) => b.page === p).length;
        timers.push(setTimeout(() => { setPageIdx(p); setShownBoxes(0); }, t));
        for (let k = 1; k <= cnt; k++) timers.push(setTimeout(() => setShownBoxes(k), t + k * STEP));
        t += cnt * STEP + GAP;
      });
      startCards(t);
    } else if (isImaging && (hasPages || imageUrl)) {
      imgFindings.forEach((_, k) => timers.push(setTimeout(() => setImgBoxes(k + 1), 700 + k * 650)));
      startCards(700 + imgFindings.length * 650 + 700);
    } else if (!hasPages && labRows.length) {
      // fallback: synthesized rows reveal (image-lab or PDF text unavailable)
      const flaggedIdx = labRows.map((r, i) => (r.status === 'flag' ? i : -1)).filter((i) => i >= 0);
      flaggedIdx.forEach((idx, k) => timers.push(setTimeout(() => setRows((p) => new Set(p).add(idx)), 500 + k * 400)));
      startCards(500 + flaggedIdx.length * 400 + 600);
    } else {
      startCards(400);
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, report]);

  // ---- typewriter: reveal the cards word by word, one segment after another ----
  useEffect(() => {
    if (phase !== 'cards' || !segs.length || instant) return; // restored: already fully shown
    let si = 0, wi = 0, alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    setSegIdx(0); setWIdx(0);
    const WORD = 45;   // ms per word
    const PAUSE = 190; // ms between segments
    const step = () => {
      if (!alive) return;
      const seg = segs[si];
      if (!seg) return;
      if (wi < segTotal(seg)) {
        wi++; setSegIdx(si); setWIdx(wi);
        timers.push(setTimeout(step, WORD));
      } else {
        si++; wi = 0;
        if (si < segs.length) { setSegIdx(si); setWIdx(0); timers.push(setTimeout(step, PAUSE)); }
        else { setSegIdx(si); } // done
      }
    };
    timers.push(setTimeout(step, 140));
    return () => { alive = false; timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, segs]);

  // Keep the newest typed line in view as the cards fill in — but scroll ONLY
  // the chat's own scroll container (never bubble to the window, which caused the
  // view to jitter), and only when the user is already near the bottom, so we
  // don't yank them if they've scrolled up to re-read.
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase !== 'cards' || instant) return; // don't move the view for restored reports
    const el = endRef.current;
    if (!el) return;
    let sp: HTMLElement | null = el.parentElement;
    while (sp) {
      const oy = getComputedStyle(sp).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && sp.scrollHeight > sp.clientHeight + 4) break;
      sp = sp.parentElement;
    }
    if (!sp) return;
    const nearBottom = sp.scrollHeight - sp.scrollTop - sp.clientHeight < 240;
    if (nearBottom) sp.scrollTop = sp.scrollHeight;
  }, [phase, segIdx, collapsed]);

  // Once marking is done we show every box/row at once (so re-opening the scan
  // shows the complete markup, not a mid-animation frame).
  const done = phase === 'cards';
  const boxLimit = done ? boxesForPage.length : shownBoxes;
  const imgLimit = done ? imgFindings.length : imgBoxes;

  const totalFlag = isImaging ? imgFindings.length : (hasText ? boxes.length : labRows.filter((r) => r.status === 'flag').length);
  const headRight = loading || !report
    ? (hasPages ? `Reading page ${pageIdx + 1} of ${pages!.length}` : (isRx ? 'Reading prescription' : 'Reading report'))
    : phase === 'read'
      ? (isRx ? 'Reading medicines' : 'Marking findings')
      : isRx ? `${meds.length} medicine${meds.length !== 1 ? 's' : ''}` : `${totalFlag} flagged`;

  // typewriter render helpers
  const started = (gi: number) => gi < segIdx || (gi === segIdx && wIdx > 0);
  const wordsFor = (gi: number, s: Seg) => (gi < segIdx ? segTotal(s) : gi === segIdx ? wIdx : 0);
  const typing = (gi: number, s: Seg) => gi === segIdx && wIdx < segTotal(s);
  // segment layout: [meds…][simple…][serious…][next…]
  const medEnd = meds.length;
  const simpleEnd = medEnd + (report?.simple?.length || 0);
  const serEnd = simpleEnd + (report?.seriousLevel ? 1 : 0) + (report?.serious?.length || 0);
  const showMeds = medEnd > 0 && started(0);
  const showSimple = (report?.simple?.length || 0) > 0 && started(medEnd);
  const showSerious = serEnd > simpleEnd && started(simpleEnd);
  const showNext = (report?.next?.length || 0) > 0 && started(serEnd);

  // Render one segment's revealed words (bold head, then " — " + body).
  const renderSeg = (gi: number, s: Seg) => {
    const k = wordsFor(gi, s);
    const hn = Math.min(k, s.head.length);
    const bn = Math.max(0, k - s.head.length);
    const headTxt = s.head.slice(0, hn).join(' ');
    const bodyTxt = s.body.slice(0, bn).join(' ');
    const cur = typing(gi, s);
    return (
      <>
        {headTxt && <b>{headTxt}</b>}
        {bn > 0 && (s.head.length ? ` — ${bodyTxt}` : bodyTxt)}
        {cur && <span className="rc-cursor" />}
      </>
    );
  };

  return (
    <div className="mt-1">
      {collapsed ? (
        <button type="button" className="rc-fold" onClick={() => setCollapsed(false)} aria-expanded={false}>
          <span className="rc-fico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V5a1 1 0 0 1 1-1h2M20 7V5a1 1 0 0 0-1-1h-2M4 17v2a1 1 0 0 0 1 1h2M20 17v2a1 1 0 0 1-1 1h-2" /><path d="M4 12h16" /></svg>
          </span>
          <span className="rc-ftxt">
            <b>{report?.title || (isRx ? 'Prescription reviewed' : isImaging ? 'Scan reviewed' : 'Report reviewed')}</b>
            <span>
              {isRx
                ? `${meds.length} medicine${meds.length !== 1 ? 's' : ''} · tap to view the prescription`
                : `${totalFlag} finding${totalFlag !== 1 ? 's' : ''} marked · tap to view the marked ${isImaging ? 'scan' : 'report'}`}
            </span>
          </span>
          <span className="rc-fchev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg></span>
        </button>
      ) : (
        <div className="rc-canvas">
          <div className="rc-head">
            <span>{report?.title || (isRx ? 'Reading prescription' : isImaging ? 'Reading image' : 'Reading report')}</span>
            {done ? (
              <button type="button" className="rc-hide" onClick={() => setCollapsed(true)}>Hide</button>
            ) : (
              <span className="rc-live"><span className="rc-pip" />{headRight}</span>
            )}
          </div>

          <div className="rc-body">
            {scanning && <div className="rc-scan" />}

            {/* Centered loader while the AI is still reading (before findings return) */}
            {(loading || !report) && (
              <div className="rc-loader">
                <span className="rc-spin" />
                <span>{isImaging ? 'Reading your scan…' : 'Reading your report…'}</span>
              </div>
            )}

            {/* Real page reader (PDF pages or uploaded image) */}
            {hasPages ? (
              <div className="rc-xray">
                <img className="rc-ximg" src={pages![pageIdx]?.image || imageUrl} alt={`page ${pageIdx + 1}`} />
                {/* grounded red boxes (lab PDF) */}
                {report && hasText && boxesForPage.slice(0, boxLimit).map((b, i) => (
                  <div key={i} className="rc-box" style={{ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` }}>
                    <b>{b.label}</b>
                  </div>
                ))}
                {/* illustrative boxes (imaging) — red for flagged, amber for plain observations */}
                {report && isImaging && imgFindings.slice(0, imgLimit).map((f, i) => (
                  <div key={i} className={`rc-box${f.status === 'flag' ? '' : ' rc-box-obs'}`} style={{ left: `${SLOTS[i].x}%`, top: `${SLOTS[i].y}%`, width: `${SLOTS[i].w}%`, height: `${SLOTS[i].h}%` }}>
                    <b>{shortLabel(f.label)}</b>
                  </div>
                ))}
              </div>
            ) : imageUrl && isImaging ? (
              <div className="rc-xray">
                <img className="rc-ximg" src={imageUrl} alt="scan" />
                {report && imgFindings.slice(0, imgLimit).map((f, i) => (
                  <div key={i} className={`rc-box${f.status === 'flag' ? '' : ' rc-box-obs'}`} style={{ left: `${SLOTS[i].x}%`, top: `${SLOTS[i].y}%`, width: `${SLOTS[i].w}%`, height: `${SLOTS[i].h}%` }}><b>{shortLabel(f.label)}</b></div>
                ))}
              </div>
            ) : report && !isImaging && labRows.length ? (
              // synthesized rows fallback
              labRows.map((r, i) => {
                const header = i === 0 || labRows[i - 1].section !== r.section;
                const marked = done ? r.status === 'flag' : rows.has(i);
                return (
                  <div key={i}>
                    {header && r.section && <div className="rc-sec">{r.section}</div>}
                    <div className={`rc-row${marked ? ' rc-marked' : ''}`} style={{ animationDelay: `${i * 35}ms` }}>
                      <span className="rc-lab">{r.label}</span>
                      <span className={`rc-val${r.status === 'flag' ? '' : ' rc-ok'}`}>{r.value}</span>
                      <span className="rc-rng">{r.range}</span>
                      {marked && r.note && <span className="rc-tag">{r.note}</span>}
                    </div>
                  </div>
                );
              })
            ) : report && isRx && meds.length ? (
              // restored prescription (photo not kept in storage): list the medicines
              meds.map((m, i) => (
                <div key={i} className="rc-row">
                  <span className="rc-lab">{m.name}{m.strength ? ` ${m.strength}` : ''}</span>
                  <span className="rc-val rc-ok">{(m.dose || '').trim()}</span>
                  <span className="rc-rng">{[m.food, m.duration].filter(Boolean).join(' · ')}</span>
                </div>
              ))
            ) : report && isImaging && (report.imageFindings || []).length ? (
              // restored imaging (scan image not kept in storage): list findings
              (report.imageFindings || []).map((f, i) => (
                <div key={i} className={`rc-row${f.status === 'flag' ? ' rc-marked' : ''}`}>
                  <span className="rc-lab">{f.label}</span>
                  <span className={`rc-val${f.status === 'flag' ? '' : ' rc-ok'}`}>{f.status === 'flag' ? 'flagged' : 'ok'}</span>
                  {f.status === 'flag' && f.note && <span className="rc-tag">{f.note}</span>}
                </div>
              ))
            ) : (
              // pre-data skeleton
              [0, 1, 2, 3, 4].map((i) => <div key={i} className="rc-skel" style={{ width: `${90 - i * 8}%` }} />)
            )}
          </div>

          {hasPages && pages!.length > 1 && (
            <div className="rc-pages">
              {pages!.map((_, i) => (
                <button key={i} type="button" aria-label={`page ${i + 1}`} className={`rc-dot${i === pageIdx ? ' on' : ''}`} onClick={() => { setPageIdx(i); }} />
              ))}
            </div>
          )}
          {report && isImaging && (
            <div className="rc-xcap">Illustrative regions — the AI describes the image but does not pinpoint exact locations.</div>
          )}
        </div>
      )}

      {/* Summary cards — typed out live, word by word */}
      {phase === 'cards' && report && (
        <div className="rc-cards">
          {showMeds && (
            <div className="rc-card">
              <div className="rc-ctitle">{IC.meds} Medicines prescribed</div>
              {segs.map((s, gi) => {
                if (s.card !== 'meds' || !started(gi)) return null;
                const m = meds[s.medIdx ?? -1];
                if (!m) return null;
                const dose = (m.dose || '').trim();
                const freq = freqLabel(m.dose, m.freqText);
                return (
                  <div key={gi} className="rc-med">
                    <div className="rc-med-h">
                      <span className="rc-med-name">{m.name}{m.strength ? ` ${m.strength}` : ''}</span>
                      {dose && <span className="rc-med-dose">{dose}</span>}
                    </div>
                    <div className="rc-med-tags">
                      {freq && <span className="rc-tagp rc-tagp-b">{freq}</span>}
                      {m.food && <span className="rc-tagp rc-tagp-a">{m.food}</span>}
                      {m.duration && <span className="rc-tagp rc-tagp-d">{m.duration}</span>}
                    </div>
                    {m.purpose && <div className="rc-med-use">{m.purpose}</div>}
                  </div>
                );
              })}
            </div>
          )}
          {showSimple && (
            <div className="rc-card">
              <div className="rc-ctitle">{IC.simple} In simple terms</div>
              {segs.map((s, gi) => s.card === 'simple' && started(gi) && (
                <div key={gi} className="rc-find"><span className="rc-sev" style={{ background: s.sev }} /><span>{renderSeg(gi, s)}</span></div>
              ))}
            </div>
          )}
          {showSerious && (
            <div className="rc-card">
              <div className="rc-ctitle">{IC.serious} Is it serious?</div>
              {segs.map((s, gi) => s.card === 'serious' && started(gi) && (
                s.level
                  ? <div key={gi} style={{ fontSize: 12, fontWeight: 800, color: '#d97706', marginBottom: 6 }}>{renderSeg(gi, s)}</div>
                  : <div key={gi} className="rc-find"><span className="rc-sev" style={{ background: '#d97706' }} /><span>{renderSeg(gi, s)}</span></div>
              ))}
            </div>
          )}
          {showNext && (
            <div className="rc-card">
              <div className="rc-ctitle">{IC.next} What to do next</div>
              {segs.map((s, gi) => s.card === 'next' && started(gi) && (
                <div key={gi} className="rc-step"><span className="rc-num">{s.num}</span><span>{renderSeg(gi, s)}</span></div>
              ))}
              {segIdx >= segs.length && <div className="rc-disc">Illustrative model output — not a diagnosis. Please confirm with your doctor.</div>}
            </div>
          )}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
