import React from 'react';
import './TrendChart.css';

// A month-by-month line chart (the Executive Dashboard's Publication Activity and the Publication
// Manager Dashboard's Due Dates). series: [{ label, color, values }] with one value per month;
// marker: { index, label } draws a vertical line at that month (e.g. "This month").

const PLOT = { left: 46, right: 740, top: 8, bottom: 113 };
const VB_W = 760;
const VB_H = 140;
const pct = (n, d) => `${((n / d) * 100).toFixed(3)}%`;
const scale = series => {
  const peak = Math.max(1, ...series.flatMap(x => x.values));
  const step = peak <= 5 ? 1 : peak <= 10 ? 2 : Math.ceil(peak / 5);
  return { maxY: Math.ceil(peak / step) * step, step };
};
const xAt = (i, n) => +(PLOT.left + ((PLOT.right - PLOT.left) / Math.max(1, n - 1)) * i).toFixed(1);
const yAt = (v, maxY) => +(PLOT.bottom - (v / maxY) * (PLOT.bottom - PLOT.top)).toFixed(1);

export default function TrendChart({ title, icon = 'timeline', months, series, marker, note, className = '' }) {
  const { maxY, step } = scale(series);
  const n = months.length;
  const ticks = [];
  for (let v = 0; v <= maxY; v += step) ticks.push({ label: String(v), y: yAt(v, maxY) });
  return (
    <div className={'tc ' + className}>
      <div className="tc-head">
        <span className="material-symbols-outlined tc-icon" aria-hidden="true">{icon}</span>
        <div className="tc-title">{title}</div>
        {note && <div className="tc-note">{note}</div>}
      </div>
      <div className="tc-body">
        <div className="tc-plot">
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="tc-svg" role="img" aria-label={title}>
            {ticks.map(g => <line key={g.label} x1={PLOT.left} y1={g.y} x2={PLOT.right} y2={g.y} stroke="var(--border-hairline)" strokeWidth="1" />)}
            <line x1={PLOT.left} y1={PLOT.top} x2={PLOT.left} y2={PLOT.bottom} stroke="var(--border-divider)" strokeWidth="1" />
            {marker && marker.index >= 0 && (
              <line x1={xAt(marker.index, n)} y1={PLOT.top} x2={xAt(marker.index, n)} y2={PLOT.bottom} stroke="var(--fatal-text)" strokeWidth="1.5" strokeDasharray="4 3" />
            )}
            {series.map(x => (
              <polyline key={x.label} points={x.values.map((v, i) => `${xAt(i, n)},${yAt(v, maxY)}`).join(' ')}
                fill="none" stroke={x.color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={x.dashed ? '5 4' : undefined} />
            ))}
            {series.flatMap(x => x.values.map((v, i) => (
              <circle key={`${x.label}-${i}`} cx={xAt(i, n)} cy={yAt(v, maxY)} r="3.5" fill="var(--white)" stroke={x.color} strokeWidth="2">
                <title>{`${months[i]} — ${x.label}: ${v}`}</title>
              </circle>
            )))}
          </svg>
          {/* Axis labels are HTML so they keep a fixed size while the SVG scales. */}
          {ticks.map(g => <span key={g.label} className="tc-axis-y" style={{ right: pct(VB_W - 36, VB_W), top: pct(g.y, VB_H) }}>{g.label}</span>)}
          {months.map((m, i) => <span key={m + i} className="tc-axis-x" style={{ left: pct(xAt(i, n), VB_W), top: pct(128, VB_H) }}>{m}</span>)}
          {marker && marker.index >= 0 && <span className="tc-marker" style={{ left: pct(xAt(marker.index, n), VB_W) }}>{marker.label}</span>}
        </div>
        <div className="tc-legend">
          {series.map(x => (
            <div key={x.label} className="tc-legend-item">
              <span className={'tc-dot' + (x.dashed ? ' tc-dot--dashed' : '')} style={{ background: x.dashed ? 'transparent' : x.color, borderColor: x.color }} />{x.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
