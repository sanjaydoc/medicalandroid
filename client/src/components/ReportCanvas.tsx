import { useEffect, useState } from 'react';

// ── Types (shared with ChatWidget) ────────────────────────────────
export interface Finding {
  section?: string;
  label: string;
  value?: string;
  range?: string;
  status: 'ok' | 'flag';
  note?: string;
}
export interface ImageFinding {
  status: 'flag' | 'ok';
  label: string;
  note?: string;
}
export interface SimpleItem {
  sev: 'watch' | 'mild' | 'ok';
  title: string;
  detail: string;
}
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

// Strip emoji / pictographs so the professional 2D-only look is guaranteed
// regardless of what the model returns.
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

// Extract a ParsedReport from a model reply that should be a JSON object
// (optionally wrapped in a ```json fence). Returns null if it isn't valid.
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

// Illustrative box slots for imaging (the model does NOT localise; these are
// clearly-labelled illustrative regions, per the honesty guardrail).
const SLOTS = [
  { x: 14, y: 30, w: 32, h: 20 },
  { x: 54, y: 32, w: 32, h: 20 },
  { x: 16, y: 60, w: 34, h: 18 },
  { x: 52, y: 60, w: 34, h: 18 },
];

const SEV: Record<string, string> = { watch: '#d97706', mild: '#eab308', ok: '#16a34a' };

const IC = {
  simple: (
    <svg viewBox="0 0 24 24" style={{ color: '#2f6fe0' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
  ),
  serious: (
    <svg viewBox="0 0 24 24" style={{ color: '#d97706' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9 16H3z" /><path d="M12 9v5M12 17h.01" /></svg>
  ),
  next: (
    <svg viewBox="0 0 24 24" style={{ color: '#16a34a' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
  ),
};

export default function ReportCanvas({
  report,
  loading,
  imageUrl,
}: {
  report?: ParsedReport | null;
  loading?: boolean;
  imageUrl?: string;
}) {
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [scanning, setScanning] = useState(true);
  const [showCards, setShowCards] = useState(false);
  const [count, setCount] = useState(0);

  const isImaging = report?.type === 'imaging';
  const rows = report?.findings || [];
  const boxes = (report?.imageFindings || []).filter((f) => f.status === 'flag').slice(0, SLOTS.length);

  useEffect(() => {
    setMarked(new Set());
    setScanning(true);
    setShowCards(false);
    setCount(0);
    if (loading || !report) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const flagged = isImaging
      ? boxes.map((_, i) => i)
      : rows.map((r, i) => (r.status === 'flag' ? i : -1)).filter((i) => i >= 0);
    const start = isImaging ? 700 : 500;
    const step = isImaging ? 650 : 380;

    flagged.forEach((idx, k) => {
      timers.push(
        setTimeout(() => {
          setMarked((prev) => new Set(prev).add(idx));
          setCount(k + 1);
        }, start + k * step),
      );
    });
    timers.push(
      setTimeout(() => {
        setScanning(false);
        setShowCards(true);
      }, start + flagged.length * step + 450),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, report]);

  const totalFlag = isImaging ? boxes.length : rows.filter((r) => r.status === 'flag').length;
  const headText = loading || !report
    ? (isImaging ? 'Reading image…' : 'Reading report…')
    : scanning
      ? `${count} finding${count === 1 ? '' : 's'} flagged`
      : `${totalFlag} flagged`;

  return (
    <div className="mt-1">
      <div className="rc-canvas">
        <div className="rc-head">
          <span>{report?.title || (isImaging ? 'Reading image' : 'Reading report')}</span>
          <span className="rc-live"><span className="rc-pip" />{headText}</span>
        </div>
        <div className="rc-body">
          {scanning && <div className="rc-scan" />}

          {/* Loading skeleton (canvas opens instantly, no blank loader) */}
          {(loading || !report) && (
            <>
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="rc-skel" style={{ width: `${90 - i * 8}%` }} />)}
            </>
          )}

          {/* Lab report — real value-vs-range rows */}
          {report && !isImaging && rows.map((r, i) => {
            const header = i === 0 || rows[i - 1].section !== r.section;
            const isMarked = marked.has(i);
            return (
              <div key={i}>
                {header && r.section && <div className="rc-sec">{r.section}</div>}
                <div className={`rc-row${isMarked ? ' rc-marked' : ''}`} style={{ animationDelay: `${i * 35}ms` }}>
                  <span className="rc-lab">{r.label}</span>
                  <span className={`rc-val${r.status === 'flag' ? '' : ' rc-ok'}`}>{r.value}</span>
                  <span className="rc-rng">{r.range}</span>
                  {isMarked && r.note && <span className="rc-tag">{r.note}</span>}
                </div>
              </div>
            );
          })}

          {/* Imaging — illustrative boxes over the uploaded scan */}
          {report && isImaging && (
            <div className="rc-xray">
              {imageUrl
                ? <img className="rc-ximg" src={imageUrl} alt="uploaded scan" />
                : <div style={{ aspectRatio: '1/1', background: '#0a0d14' }} />}
              {boxes.map((b, i) => marked.has(i) && (
                <div key={i} className="rc-box" style={{ left: `${SLOTS[i].x}%`, top: `${SLOTS[i].y}%`, width: `${SLOTS[i].w}%`, height: `${SLOTS[i].h}%` }}>
                  <b>{b.label}</b>
                </div>
              ))}
            </div>
          )}
        </div>
        {report && isImaging && (
          <div className="rc-xcap">Illustrative regions — the AI describes the image but does not pinpoint exact locations.</div>
        )}
      </div>

      {/* Summary cards */}
      {showCards && report && (
        <div className="rc-cards">
          <div className="rc-card" style={{ animationDelay: '0ms' }}>
            <div className="rc-ctitle">{IC.simple} In simple terms</div>
            {report.simple.map((f, i) => (
              <div key={i} className="rc-find">
                <span className="rc-sev" style={{ background: SEV[f.sev] || SEV.mild }} />
                <span><b>{f.title}</b>{f.detail ? ` — ${f.detail}` : ''}</span>
              </div>
            ))}
          </div>

          <div className="rc-card" style={{ animationDelay: '160ms' }}>
            <div className="rc-ctitle">{IC.serious} Is it serious?</div>
            {report.seriousLevel && (
              <div style={{ fontSize: 12, fontWeight: 800, color: '#d97706', marginBottom: 6 }}>{report.seriousLevel}</div>
            )}
            {report.serious.map((t, i) => (
              <div key={i} className="rc-find"><span className="rc-sev" style={{ background: '#d97706' }} /><span>{t}</span></div>
            ))}
          </div>

          <div className="rc-card" style={{ animationDelay: '320ms' }}>
            <div className="rc-ctitle">{IC.next} What to do next</div>
            {report.next.map((t, i) => (
              <div key={i} className="rc-step"><span className="rc-num">{i + 1}</span><span>{t}</span></div>
            ))}
            <div className="rc-disc">Illustrative model output — not a diagnosis. Please confirm with your doctor.</div>
          </div>
        </div>
      )}
    </div>
  );
}
