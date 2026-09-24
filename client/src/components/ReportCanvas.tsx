import { useEffect, useMemo, useState } from 'react';
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
export interface ParsedReport {
  type: 'lab' | 'imaging';
  title?: string;
  findings?: Finding[];
  imageFindings?: ImageFinding[];
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
  return o;
}

export function parseReport(raw: string): ParsedReport | null {
  if (!raw) return null;
  try {
    let s = raw.trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    const obj = JSON.parse(s.slice(a, b + 1));
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
  report, loading, imageUrl, pages,
}: {
  report?: ParsedReport | null;
  loading?: boolean;
  imageUrl?: string;
  pages?: PageData[];
}) {
  const isImaging = report?.type === 'imaging';
  const hasPages = !!(pages && pages.length);
  const hasText = !!(pages && pages.some((p) => p.items.length));

  const boxes = useMemo(() => (report && hasText ? matchBoxes(report, pages!) : []), [report, hasText, pages]);

  // page shown in the reader
  const [pageIdx, setPageIdx] = useState(0);
  const [scanning, setScanning] = useState(true);
  const [shownBoxes, setShownBoxes] = useState(0); // boxes revealed on current page
  const [imgBoxes, setImgBoxes] = useState(0);     // illustrative imaging boxes revealed
  const [rows, setRows] = useState<Set<number>>(new Set()); // synthesized-row marks (fallback)
  const [phase, setPhase] = useState<'read' | 'cards'>('read');
  const [reveal, setReveal] = useState(0);         // card lines revealed (typewriter)

  const labRows = report?.findings || [];
  const imgFindings = (report?.imageFindings || []).filter((f) => f.status === 'flag').slice(0, SLOTS.length);
  const boxesForPage = boxes.filter((b) => b.page === pageIdx);

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

  // ---- report ready: run the marking, then reveal cards ----
  useEffect(() => {
    if (loading || !report) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    setScanning(true); setShownBoxes(0); setImgBoxes(0); setRows(new Set()); setReveal(0); setPhase('read');

    const startCards = (delay: number) => {
      timers.push(setTimeout(() => { setScanning(false); setPhase('cards'); }, delay));
      const total = (report.simple?.length || 0) + (report.serious?.length || 0) + (report.next?.length || 0);
      for (let k = 1; k <= total; k++) timers.push(setTimeout(() => setReveal(k), delay + 250 + k * 150));
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

  const totalFlag = isImaging ? imgFindings.length : (hasText ? boxes.length : labRows.filter((r) => r.status === 'flag').length);
  const headRight = loading || !report
    ? (hasPages ? `Reading page ${pageIdx + 1} of ${pages!.length}` : 'Reading report')
    : phase === 'read' ? 'Marking findings' : `${totalFlag} flagged`;

  // flat card-line reveal helper
  const nSimple = report?.simple?.length || 0;
  const nSerious = report?.serious?.length || 0;

  return (
    <div className="mt-1">
      <div className="rc-canvas">
        <div className="rc-head">
          <span>{report?.title || (isImaging ? 'Reading image' : 'Reading report')}</span>
          <span className="rc-live"><span className="rc-pip" />{headRight}</span>
        </div>

        <div className="rc-body">
          {scanning && <div className="rc-scan" />}

          {/* Real page reader (PDF pages or uploaded image) */}
          {hasPages ? (
            <div className="rc-xray">
              <img className="rc-ximg" src={pages![pageIdx]?.image || imageUrl} alt={`page ${pageIdx + 1}`} />
              {/* grounded red boxes (lab PDF) */}
              {report && hasText && boxesForPage.slice(0, shownBoxes).map((b, i) => (
                <div key={i} className="rc-box" style={{ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` }}>
                  <b>{b.label}</b>
                </div>
              ))}
              {/* illustrative boxes (imaging) */}
              {report && isImaging && imgFindings.slice(0, imgBoxes).map((f, i) => (
                <div key={i} className="rc-box" style={{ left: `${SLOTS[i].x}%`, top: `${SLOTS[i].y}%`, width: `${SLOTS[i].w}%`, height: `${SLOTS[i].h}%` }}>
                  <b>{f.label}</b>
                </div>
              ))}
            </div>
          ) : imageUrl && isImaging ? (
            <div className="rc-xray">
              <img className="rc-ximg" src={imageUrl} alt="scan" />
              {report && imgFindings.slice(0, imgBoxes).map((f, i) => (
                <div key={i} className="rc-box" style={{ left: `${SLOTS[i].x}%`, top: `${SLOTS[i].y}%`, width: `${SLOTS[i].w}%`, height: `${SLOTS[i].h}%` }}><b>{f.label}</b></div>
              ))}
            </div>
          ) : report && !isImaging && labRows.length ? (
            // synthesized rows fallback
            labRows.map((r, i) => {
              const header = i === 0 || labRows[i - 1].section !== r.section;
              const marked = rows.has(i);
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

      {/* Summary cards — typed out live */}
      {phase === 'cards' && report && (
        <div className="rc-cards">
          <div className="rc-card">
            <div className="rc-ctitle">{IC.simple} In simple terms</div>
            {report.simple.map((f, i) => i < reveal && (
              <div key={i} className="rc-find"><span className="rc-sev" style={{ background: SEV[f.sev] || SEV.mild }} /><span><b>{f.title}</b>{f.detail ? ` — ${f.detail}` : ''}</span></div>
            ))}
          </div>
          <div className="rc-card">
            <div className="rc-ctitle">{IC.serious} Is it serious?</div>
            {report.seriousLevel && reveal > nSimple && <div style={{ fontSize: 12, fontWeight: 800, color: '#d97706', marginBottom: 6 }}>{report.seriousLevel}</div>}
            {report.serious.map((t, i) => (nSimple + i) < reveal && (
              <div key={i} className="rc-find"><span className="rc-sev" style={{ background: '#d97706' }} /><span>{t}</span></div>
            ))}
          </div>
          <div className="rc-card">
            <div className="rc-ctitle">{IC.next} What to do next</div>
            {report.next.map((t, i) => (nSimple + nSerious + i) < reveal && (
              <div key={i} className="rc-step"><span className="rc-num">{i + 1}</span><span>{t}</span></div>
            ))}
            <div className="rc-disc">Illustrative model output — not a diagnosis. Please confirm with your doctor.</div>
          </div>
        </div>
      )}
    </div>
  );
}
