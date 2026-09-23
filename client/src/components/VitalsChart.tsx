// Lightweight, dependency-free SVG line chart for vitals (BP / glucose / weight).
// Themed to MedDroid; responsive (scales to container width via viewBox).

export interface ChartSeries {
  label: string;
  color: string;
  points: { t: number; v: number }[]; // t = epoch ms, v = value
}
export interface ChartBand {
  from: number;
  to: number;
  color: string; // rgba
  label?: string;
}

const W = 340;
const H = 170;
const P = { top: 14, right: 12, bottom: 26, left: 34 };

export default function VitalsChart({
  series,
  unit,
  bands = [],
}: {
  series: ChartSeries[];
  unit: string;
  bands?: ChartBand[];
}) {
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return null;

  const ts = all.map((p) => p.t);
  const vs = all.map((p) => p.v).concat(bands.flatMap((b) => [b.from, b.to]));
  let vMin = Math.min(...vs);
  let vMax = Math.max(...vs);
  const pad = (vMax - vMin) * 0.12 || 5;
  vMin = Math.floor(vMin - pad);
  vMax = Math.ceil(vMax + pad);
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);

  const x = (t: number) =>
    tMax === tMin ? (W - P.left - P.right) / 2 + P.left : P.left + ((t - tMin) / (tMax - tMin)) * (W - P.left - P.right);
  const y = (v: number) => P.top + (1 - (v - vMin) / (vMax - vMin)) * (H - P.top - P.bottom);

  const yTicks = [vMin, Math.round((vMin + vMax) / 2), vMax];
  const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${series.map((s) => s.label).join(', ')} chart`} style={{ display: 'block' }}>
        {/* reference bands */}
        {bands.map((b, i) => (
          <rect key={i} x={P.left} y={y(b.to)} width={W - P.left - P.right} height={Math.max(0, y(b.from) - y(b.to))} fill={b.color} />
        ))}
        {/* y gridlines + labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={P.left} y1={y(t)} x2={W - P.right} y2={y(t)} stroke="#e2e9f4" strokeWidth="1" />
            <text x={P.left - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#8a99b5" fontFamily="Inter,sans-serif">{t}</text>
          </g>
        ))}
        {/* x labels (first & last) */}
        <text x={P.left} y={H - 8} textAnchor="start" fontSize="9" fill="#8a99b5" fontFamily="Inter,sans-serif">{fmtDate(tMin)}</text>
        {tMax !== tMin && (
          <text x={W - P.right} y={H - 8} textAnchor="end" fontSize="9" fill="#8a99b5" fontFamily="Inter,sans-serif">{fmtDate(tMax)}</text>
        )}
        {/* series */}
        {series.map((s, si) => {
          const pts = [...s.points].sort((a, b) => a.t - b.t);
          const d = pts.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
          return (
            <g key={si}>
              {pts.length > 1 && <polyline points={d} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />}
              {pts.map((p, pi) => (
                <circle key={pi} cx={x(p.t)} cy={y(p.v)} r={pts.length === 1 ? 4 : 3} fill="#fff" stroke={s.color} strokeWidth="2.2" />
              ))}
            </g>
          );
        })}
      </svg>
      {/* legend */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
        {series.map((s, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5a6b8a', fontWeight: 600 }}>
            <span style={{ width: 12, height: 3, borderRadius: 2, background: s.color, display: 'inline-block' }} />
            {s.label}
          </span>
        ))}
        <span style={{ fontSize: 12, color: '#8a99b5', marginLeft: 'auto' }}>{unit}</span>
      </div>
    </div>
  );
}
