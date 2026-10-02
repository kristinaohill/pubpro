import React from 'react';
import './TrendChart.css';

// A month-by-month line chart (the Executive Dashboard's Publication Activity and the Publication
// Manager Dashboard's Due Dates). series: [{ label, color, values }] with one value per month;
// marker: { index, label } draws a vertical line at that month (e.g. "This month"). A null value
// leaves a gap, so one series can cover the months behind and another the months ahead.

// The chart keeps its width; height (viewBox units) sets how tall it draws. 140 is the standard size.
const VB_W = 760;
const plotFor = h => ({ left: 46, right: 740, top: 8, bottom: h - 27, axisY: h - 12 });
const pct = (n, d) => `${((n / d) * 100).toFixed(3)}%`;
/** Runs of consecutive months that have a value: [[[i, v], ...], ...]. */
const runs = values => values.reduce((out, v, i) => {
  if (v == null) out.push([]);
  else out[out.length - 1].push([i, v]);
  return out;
}, [[]]).filter(r => r.length);
const scale = (series, height = 140) => {
  const peak = Math.max(1, ...series.flatMap(x => x.values.filter(v => v != null)));
  const lines = height < 110 ? 3 : 5;
  const step = peak <= lines ? 1 : Math.ceil(peak / lines);
  return { maxY: Math.ceil(peak / step) * step, step };
};
const xAtIn = PLOT => (i, n) => +(PLOT.left + ((PLOT.right - PLOT.left) / Math.max(1, n - 1)) * i).toFixed(1);
const yAtIn = PLOT => (v, maxY) => +(PLOT.bottom - (v / maxY) * (PLOT.bottom - PLOT.top)).toFixed(1);

export default function TrendChart({ title, icon = 'timeline', months, series, marker, note, className = '', height = 140 }) {
  const VB_H = height;
  const PLOT = plotFor(height);
  const xAt = xAtIn(PLOT);
  const yAt = yAtIn(PLOT);
  const { maxY, step } = scale(series, height);
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
            {series.flatMap(x => runs(x.values).map((run, k) => (
              <polyline key={x.label + k} points={run.map(([i, v]) => `${xAt(i, n)},${yAt(v, maxY)}`).join(' ')}
                fill="none" stroke={x.color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={x.dashed ? '5 4' : undefined} />
            )))}
            {series.flatMap(x => x.values.map((v, i) => (v == null ? null : (
              <circle key={`${x.label}-${i}`} cx={xAt(i, n)} cy={yAt(v, maxY)} r="3.5" fill="var(--white)" stroke={x.color} strokeWidth="2">
                <title>{`${months[i]} — ${x.label}: ${v}`}</title>
              </circle>
            ))))}
          </svg>
          {/* Axis labels are HTML so they keep a fixed size while the SVG scales. */}
          {ticks.map(g => <span key={g.label} className="tc-axis-y" style={{ right: pct(VB_W - 36, VB_W), top: pct(g.y, VB_H) }}>{g.label}</span>)}
          {months.map((m, i) => <span key={m + i} className="tc-axis-x" style={{ left: pct(xAt(i, n), VB_W), top: pct(PLOT.axisY, VB_H) }}>{m}</span>)}
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
