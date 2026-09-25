import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, DataTable, InlineMessage, Pill, Select } from '../ds/pubpro';
import DateField from '../components/DateField';
import { api } from '../api';
import { daysUntil } from './Publications';
import {
  activity as activityOf, finance as financeOf, inBounds, outcomes as outcomesOf, pipeline as pipelineOf,
  portfolio as portfolioOf, pubFacts, rangeBounds, rangeLabel, utilization as utilizationOf,
} from './stats';
import './PubProDashboard.css';

// Accent per tab is each module's own tile colour (module identity).
const MODULES = [
  { id: 'publications', label: 'PUBLICATIONS', icon: 'menu_book', accent: 'var(--high-emphasis)' },
  { id: 'iis', label: 'IIS', icon: 'science', accent: 'var(--nav)' },
  { id: 'grants', label: 'GRANTS', icon: 'payments', accent: 'var(--bpl-purple)' },
  { id: 'medinfo', label: 'MEDINFO', icon: 'forum', accent: 'var(--bpl-teal)' },
];

const VISIBLE_TASK_ROWS = 8;

const TASK_COLUMNS = [
  { header: 'ID', width: 'minmax(0,1.5fr)' },
  { header: 'Task Name', width: 'minmax(0,1.9fr)' },
  { header: 'Title', width: 'minmax(0,2.4fr)' },
  { header: 'Type', width: 'minmax(0,.85fr)' },
  { header: 'Product', width: 'minmax(0,1.3fr)' },
  { header: 'Due Date', width: '130px', align: 'center' },
];

const PLAN_COLUMNS = [
  { header: 'Planning ID', width: 'minmax(0,1.2fr)' },
  { header: 'Plan Name', width: 'minmax(0,1.9fr)' },
  { header: 'Therapeutic Area', width: 'minmax(0,1.3fr)' },
  { header: 'Product', width: 'minmax(0,1.1fr)' },
  { header: 'Publications', width: '100px', align: 'right' },
  { header: 'Plan Budget', width: '110px', align: 'right' },
  { header: 'Committed', width: '110px', align: 'right' },
];

const RANGE_OPTIONS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Date Range' },
];

// Categorical chart ramp from brand values, ordered so adjacent slices differ in hue and lightness.
const CHART_COLORS = [
  'var(--nav)',
  'var(--bpl-teal)',
  'var(--high-emphasis)',
  'var(--bpl-purple)',
  'var(--fg-muted)',
  'var(--blue-chip)',
];

const PIPELINE_TILES = [
  { key: 'total', label: 'Total Publications', icon: 'content_copy', face: 'var(--blue-tint)', border: 'var(--blue-line)', accent: 'var(--nav)' },
  { key: 'draft', label: 'Draft', icon: 'edit_square', face: 'var(--blue-tint)', border: 'var(--blue-line)', accent: 'var(--nav)' },
  { key: 'active', label: 'Active', icon: 'play_circle', face: 'var(--blue-tint)', border: 'var(--blue-line)', accent: 'var(--ok)' },
  { key: 'inReview', label: 'In Review', icon: 'rate_review', face: 'var(--blue-tint)', border: 'var(--blue-line)', accent: 'var(--high-emphasis)' },
  { key: 'suspended', label: 'Suspended', icon: 'pause', face: 'var(--tint-suspended-bg)', border: 'var(--tint-suspended-accent)', accent: 'var(--tint-suspended-accent)' },
  { key: 'approved', label: 'Approved', icon: 'verified', face: 'var(--ok-band)', border: 'color-mix(in oklab, var(--ok) 28%, var(--white))', accent: 'var(--ok)' },
];

// "Withdrawn" is the outcome status the design's "Discarded" count stood for.
const PIPELINE_FOOTER = [
  { key: 'withdrawn', label: 'Withdrawn', color: 'var(--blue-chip)' },
  { key: 'cancelled', label: 'Cancelled', color: 'var(--nav)' },
];

const UTIL_COLORS = ['var(--chart-3)', 'var(--chart-4)', 'var(--chart-2)', 'var(--chart-1)', 'var(--chart-5)', 'var(--chart-6)'];

const ACTIVITY_PLOT = { left: 46, right: 740, top: 8, bottom: 113 };
const VB_W = 760, VB_H = 140;

/* ---------- derived data ---------- */

const pct = (n, d) => `${((n / d) * 100).toFixed(3)}%`;

/** Y-axis top and tick step that fit the busiest month. */
const activityScale = series => {
  const peak = Math.max(1, ...series.flatMap(x => x.values));
  const step = peak <= 5 ? 1 : peak <= 10 ? 2 : Math.ceil(peak / 5);
  return { maxY: Math.ceil(peak / step) * step, step };
};
const activityX = (i, n) => {
  const { left, right } = ACTIVITY_PLOT;
  return +(left + ((right - left) / Math.max(1, n - 1)) * i).toFixed(1);
};
const activityY = (v, maxY) => {
  const { top, bottom } = ACTIVITY_PLOT;
  return +(bottom - (v / maxY) * (bottom - top)).toFixed(1);
};

const barRows = data => {
  const max = Math.max(...data.map(d => d[1])) || 1;
  return data.map(([label, value], i) => ({
    label,
    value,
    color: CHART_COLORS[i % CHART_COLORS.length],
    width: `${((value / max) * 100).toFixed(1)}%`,
    tip: `${label}: ${value}`,
  }));
};

const DONUT_R = 42;
const donutSegments = data => {
  const total = data.reduce((a, d) => a + d[1], 0) || 1;
  const circumference = 2 * Math.PI * DONUT_R;
  let used = 0;
  return data.map(([label, value], i) => {
    const length = (value / total) * circumference;
    const seg = {
      label: `${label}: ${value}`,
      color: CHART_COLORS[i % CHART_COLORS.length],
      dash: `${length.toFixed(2)} ${(circumference - length).toFixed(2)}`,
      offset: (-used).toFixed(2),
    };
    used += length;
    return seg;
  });
};

const money = n => `$${n.toLocaleString('en-US')}`;

/* ---------- small local components ---------- */

const Sym = ({ name, className = '', style, title, onClick }) => (
  <span className={`material-symbols-outlined ${className}`} style={style} title={title} onClick={onClick} aria-hidden={title ? undefined : true}>{name}</span>
);

// Blue icon badge + section heading. smallBadge = 24px badge; smallTitle = 18px heading.
function SectionTitle({ icon, title, smallBadge, smallTitle, className = '', children }) {
  return (
    <div className={`pd-section-title ${className}`}>
      <span className={`pd-badge${smallBadge ? ' pd-badge--sm' : ''}`}><Sym name={icon} /></span>
      <div className={`pd-heading${smallTitle ? ' pd-heading--sm' : ''}`}>{title}</div>
      {children}
    </div>
  );
}

function RefreshIcon({ onClick }) {
  return (
    <button type="button" className="pd-refresh" title="Refresh" aria-label="Refresh" onClick={onClick}>
      <Sym name="refresh" />
    </button>
  );
}

function PipelineFooter({ counts, onOpen, className = '' }) {
  return (
    <div className={`pd-footer-strip ${className}`}>
      {PIPELINE_FOOTER.map(f => (
        <div key={f.label} className="pd-footer-item">
          <span className="pd-swatch" style={{ background: f.color }} />
          <span className="pd-footer-label">{f.label}</span>
          <a href="/publications" onClick={e => { e.preventDefault(); onOpen(); }}>{counts[f.key]}</a>
        </div>
      ))}
    </div>
  );
}

const NoData = ({ children }) => <div className="pd-nodata">{children}</div>;

function ChartCard({ icon, title, children }) {
  return (
    <div className="pd-chart-card">
      <div className="pd-chart-head">
        <Sym name={icon} className="pd-chart-icon" />
        <div className="pd-chart-title">{title}</div>
      </div>
      {children}
    </div>
  );
}

function HBars({ rows }) {
  if (!rows.length) return <NoData>No publications yet.</NoData>;
  return (
    <div className="pd-chart-body pd-chart-body--center">
      <div className="pd-hbars">
        {rows.map(b => (
          <div key={b.label}>
            <div className="pd-hbar-label">
              <span className="pd-hbar-name">{b.label}</span>
              <span className="pd-hbar-value">{b.value}</span>
            </div>
            <div className="pd-hbar" title={b.tip} style={{ background: b.color, width: b.width }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityChart({ data }) {
  const { months, series, range } = data;
  const { maxY, step } = activityScale(series);
  const n = months.length;
  const ticks = [];
  for (let v = 0; v <= maxY; v += step) {
    const y = activityY(v, maxY);
    ticks.push({ label: String(v), y, right: pct(VB_W - 36, VB_W), top: pct(y, VB_H) });
  }
  return (
    <div className="pd-activity">
      <div className="pd-activity-head">
        <Sym name="timeline" className="pd-chart-icon pd-chart-icon--md" />
        <div className="pd-chart-title">Drafts Started vs Submitted — {range}</div>
      </div>
      <div className="pd-activity-body">
        <div className="pd-activity-plot">
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="pd-activity-svg">
            {ticks.map(g => (
              <line key={g.label} x1={ACTIVITY_PLOT.left} y1={g.y} x2={ACTIVITY_PLOT.right} y2={g.y} stroke="var(--border-hairline)" strokeWidth="1" />
            ))}
            <line x1={ACTIVITY_PLOT.left} y1={ACTIVITY_PLOT.top} x2={ACTIVITY_PLOT.left} y2={ACTIVITY_PLOT.bottom} stroke="var(--border-divider)" strokeWidth="1" />
            {series.map(x => (
              <polyline
                key={x.label}
                points={x.values.map((v, i) => `${activityX(i, n)},${activityY(v, maxY)}`).join(' ')}
                fill="none"
                stroke={x.color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {series.flatMap(x => x.values.map((v, i) => (
              <circle key={`${x.label}-${i}`} cx={activityX(i, n)} cy={activityY(v, maxY)} r="3.5" fill="var(--white)" stroke={x.color} strokeWidth="2">
                <title>{`${months[i]} — ${x.label}: ${v}`}</title>
              </circle>
            )))}
          </svg>
          {/* Axis labels are HTML so they keep a fixed size while the SVG scales. */}
          {ticks.map(g => (
            <span key={g.label} className="pd-axis-y" style={{ right: g.right, top: g.top }}>{g.label}</span>
          ))}
          {months.map((m, i) => (
            <span key={m + i} className="pd-axis-x" style={{ left: pct(activityX(i, n), VB_W), top: pct(128, VB_H) }}>{m}</span>
          ))}
        </div>
        <div className="pd-legend">
          {series.map(x => (
            <div key={x.label} className="pd-legend-item">
              <span className="pd-dot" style={{ background: x.color }} />{x.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Donut({ segments, empty }) {
  if (!segments.length) return <NoData>{empty}</NoData>;
  return (
    <div className="pd-donut-body">
      <svg viewBox="0 0 120 120" className="pd-donut-svg">
        {segments.map(s => (
          <circle key={s.label} cx="60" cy="60" r={DONUT_R} fill="none" stroke={s.color} strokeWidth="30" strokeDasharray={s.dash} strokeDashoffset={s.offset} />
        ))}
      </svg>
      <div className="pd-donut-legend">
        {segments.map(s => (
          <div key={s.label} className="pd-donut-legend-item">
            <span className="pd-dot" style={{ background: s.color }} />
            <span className="pd-wrap">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// DataTable accepts a maxHeight; measure the live rows so exactly N rows (plus header) show.
function useRowWindow(visible) {
  const ref = useRef(null);
  const [maxHeight, setMaxHeight] = useState();
  useLayoutEffect(() => {
    const wrap = ref.current;
    if (!wrap) return undefined;
    const measure = () => {
      const scroller = wrap.firstElementChild && wrap.firstElementChild.firstElementChild;
      if (!scroller) return;
      const [header, ...rows] = scroller.children;
      if (!header || rows.length <= visible) { setMaxHeight(undefined); return; }
      const span = rows[visible].offsetTop - rows[0].offsetTop;
      setMaxHeight(`${header.offsetHeight + span}px`);
    };
    measure();
    const ro = window.ResizeObserver ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(wrap);
    window.addEventListener('resize', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [visible]);
  return [ref, maxHeight];
}

/* ---------- page ---------- */

export default function PubProDashboard() {
  const navigate = useNavigate();
  // Save & Close on a publication, plan or author lands here with a confirmation.
  const savedNotice = (useLocation().state || {}).savedNotice;
  const [module, setModule] = useState('publications');
  const [range, setRange] = useState('this_month');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [, setTick] = useState(0);
  const [saved, setSaved] = useState([]);
  const [savedPlans, setSavedPlans] = useState([]);
  const loadSaved = () => {
    api.get('/pp-publications?include=data').then(setSaved).catch(() => setSaved([]));
    api.get('/pp-plans?include=data').then(setSavedPlans).catch(() => setSavedPlans([]));
  };
  useEffect(() => { loadSaved(); }, []);
  const refresh = () => { setTick(t => t + 1); loadSaved(); };
  const [taskWrapRef, taskMaxHeight] = useRowWindow(VISIBLE_TASK_ROWS);

  const isPublications = module === 'publications';

  // Figures from saved records. The range picker filters by the date a publication was created;
  // the activity chart always covers the last 12 months.
  const facts = saved.map(pubFacts);
  const bounds = rangeBounds(range, rangeFrom, rangeTo);
  const scoped = facts.filter(f => inBounds(f.created, bounds));
  const scopeText = rangeLabel(bounds);
  const counts = pipelineOf(scoped);
  const fin = financeOf(scoped);
  const finPct = n => (fin.contracted ? ((n / fin.contracted) * 100).toFixed(1) + '%' : '0%');
  const finRows = [
    { label: 'Paid to date', amount: fin.paid, accent: 'var(--tint-positive-accent)' },
    { label: 'Awaiting approval', amount: fin.awaiting, accent: 'var(--tint-warning-accent)' },
    { label: 'Not yet due', amount: fin.notDue, accent: 'var(--tint-suspended-accent)' },
  ];
  const util = utilizationOf(savedPlans);
  const activityData = activityOf(facts);
  const mix = portfolioOf(scoped);
  const maxType = Math.max(1, ...mix.types.map(t => t[1]));
  const donuts = outcomesOf(scoped);
  const openList = () => navigate('/publications');
  const activeModule = MODULES.find(m => m.id === module);

  // Saved records sit above the sample tasks, newest first; the task is the record's current step.
  const savedRows = saved.filter(p => p.status !== 'Cancelled').map(p => {
    const sm = p.summary || {};
    const n = daysUntil(sm.due);
    const [y, m, d] = (sm.due || '').split('-').map(Number);
    return {
      key: 'saved-' + p.id,
      savedId: p.id,
      cells: [
        <span className="pd-id-cell">
          <Sym name="description" className="pd-id-icon" />
          <span className="pd-ellipsis">{p.record_id}</span>
        </span>,
        sm.stepName || 'New Draft Publication', p.title, p.pub_type, p.product || '—',
        <Pill tone={n == null ? 'outline' : n < 0 ? 'cancelled' : n <= 7 ? 'hold' : 'outline'} style={{ fontSize: 12 }}>
          {sm.due ? `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}` : '—'}
        </Pill>,
      ],
    };
  });
  const taskCount = savedRows.length;

  const taskRows = savedRows;

  // Saved plans (the seeded sample plan among them, once it has been opened).
  const money = n => '$' + Math.round(n || 0).toLocaleString('en-US');
  const livePlans = savedPlans.filter(p => p.status !== 'Cancelled');
  const planRows = livePlans.map(p => {
    const sm = p.summary || {};
    const linked = saved.filter(x => x.summary && x.summary.parentPlanId === p.plan_id).length;
    return {
      key: 'saved-' + p.id,
      savedId: p.id,
      cells: [p.plan_id, p.title, sm.ta || '—', p.product || '—', String(Math.max(linked, sm.pubCount || 0)), money(sm.budget), money(sm.committed)],
    };
  });

  return (
    <div className="pd-page">
      {savedNotice && <InlineMessage kind="info">{savedNotice}</InlineMessage>}

      {/* My Task List */}
      <div className="pd-card">
        <SectionTitle icon="checklist" title={`My Task List (${taskCount} items)`} className="pd-section-title--mb16">
          <RefreshIcon onClick={refresh} />
        </SectionTitle>
        <div className="pd-count">{taskCount} items</div>
        <div ref={taskWrapRef}>
          <DataTable
            columns={TASK_COLUMNS}
            rows={taskRows}
            onRowClick={r => navigate('/publication/' + r.savedId)}
            headerTone="knowledge"
            zebra={false}
            maxHeight={taskMaxHeight}
          >
            {taskRows.length === 0 ? <div className="pd-empty-row">No tasks yet. Saved publications show up here with their current step.</div> : undefined}
          </DataTable>
        </div>
      </div>

      {/* Module tabs + dashboard */}
      <div>
        <div className="pd-tabbar">
          <div className="pd-tabs">
            {MODULES.map(m => {
              const on = m.id === module;
              return (
                <div
                  key={m.id}
                  role="tab"
                  aria-selected={on}
                  className={`pd-tab${on ? ' pd-tab--on' : ''}`}
                  style={{ color: m.accent, borderColor: m.accent }}
                  onClick={() => setModule(m.id)}
                >
                  <Sym name={m.icon} className="pd-tab-icon" />
                  {m.label}
                </div>
              );
            })}
          </div>

          {isPublications && (
            <div className="pd-range">
              {range === 'custom' && (
                <>
                  <DateField width={132} value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} />
                  <span className="pd-range-to">to</span>
                  <DateField width={132} value={rangeTo} onChange={e => setRangeTo(e.target.value)} />
                </>
              )}
              <Select width={160} options={RANGE_OPTIONS} value={range} onChange={e => setRange(e.target.value)} />
            </div>
          )}
        </div>

        <div className="pd-module">
          {isPublications ? (
            <div className="pd-stack">

              <SectionTitle icon="bar_chart" title="Publication Progress" className="pd-section-title--mb4">
                <div className="pd-push">
                  <Button variant="secondary">Review on Behalf of External Authors</Button>
                </div>
              </SectionTitle>

              {/* Pipeline By Status */}
              <div className="pd-block pd-block--tight">
                <div className="pd-subhead">
                  <Sym name="filter_alt" className="pd-chart-icon pd-chart-icon--md" />
                  <div className="pd-subtitle">Pipeline By Status</div>
                </div>
                <div className="pd-lede">Track publications as they move from draft through approval. Monitor bottlenecks in review or suspension, and see what's been withdrawn or cancelled along the way. Counts cover publications created {scopeText}.</div>
                <div className="pd-pipeline">
                  {PIPELINE_TILES.map(s => (
                    <div key={s.label} className="pd-tile" style={{ background: s.face, borderColor: s.border }}>
                      <div className="pd-tile-head" style={{ color: s.accent }}>
                        <Sym name={s.icon} className="pd-tile-icon" />
                        <div className="pd-tile-label">{s.label}</div>
                      </div>
                      {s.key === 'total'
                        ? <div className="pd-tile-value" style={{ color: s.accent }}>{counts.total}</div>
                        : <a href="/publications" onClick={e => { e.preventDefault(); openList(); }} className="pd-tile-value pd-tile-value--link" style={{ color: s.accent }}>{counts[s.key]}</a>}
                    </div>
                  ))}
                </div>
                <PipelineFooter counts={counts} onOpen={openList} />
              </div>

              {/* Financial Overview */}
              <div className="pd-block">
                <SectionTitle icon="account_balance_wallet" title="Financial Overview">
                  <div className="pd-push">
                    <Button variant="secondary" icon="summarize" onClick={() => navigate('/financial-report')}>Generate Financial Report</Button>
                  </div>
                </SectionTitle>
                <div className="pd-lede">Track contracted value against what has been paid, from the costed milestones on each publication's Planning tab. Figures cover publications created {scopeText}.</div>

                <div className="pd-fin">
                  <div className="pd-fin-kpis">
                    <div>
                      <div className="pd-kpi-label"><Sym name="hourglass_top" className="pd-kpi-icon" style={{ color: 'var(--high-emphasis)' }} />Amount Outstanding</div>
                      <div className="pd-kpi-value">{money(fin.outstanding)}</div>
                      <div className="pd-kpi-sub">{finPct(fin.outstanding)} of contracted value</div>
                    </div>
                    <div className="pd-kpi-rule" />
                    <div>
                      <div className="pd-kpi-label"><Sym name="check_circle" className="pd-kpi-icon" style={{ color: 'var(--ok)' }} />Paid to Date</div>
                      <div className="pd-kpi-value" style={{ color: 'var(--ok)' }}>{money(fin.paid)}</div>
                      <div className="pd-kpi-sub">{finPct(fin.paid)} of contracted value</div>
                    </div>
                    <div className="pd-kpi-total">
                      <div className="pd-kpi-label">Total Contracted Value</div>
                      <div className="pd-kpi-value pd-kpi-value--sm">{money(fin.contracted)}</div>
                      <div className="pd-kpi-sub">{fin.pubCount} {fin.pubCount === 1 ? 'publication' : 'publications'}, {fin.vendorCount} {fin.vendorCount === 1 ? 'vendor' : 'vendors'}</div>
                    </div>
                  </div>
                  <div className="pd-fin-rows">
                    {finRows.map(r => (
                      <div key={r.label} className="pd-fin-row">
                        <div className="pd-fin-label"><span className="pd-swatch" style={{ background: r.accent }} />{r.label}</div>
                        <div className="pd-fin-amount">{money(r.amount)}</div>
                        <div className="pd-fin-pct">{finPct(r.amount)}</div>
                        <div className="pd-track pd-track--round"><div className="pd-fill" style={{ width: finPct(r.amount), background: r.accent }} /></div>
                      </div>
                    ))}
                    {!fin.contracted && <NoData>No costed milestones yet. Add a vendor rate card or costed rows on a publication&rsquo;s Planning tab.</NoData>}
                  </div>
                </div>

                <SectionTitle icon="bar_chart" title="Budget Utilization by Therapeutic Area" smallBadge smallTitle className="pd-section-title--util" />
                <div className="pd-util">
                  {util.length === 0 && <NoData>No plan budgets yet. Set a Plan Budget on a publication plan&rsquo;s Allocation tab.</NoData>}
                  {util.map((u, i) => {
                    const p = u.budget ? Math.round((u.committed / u.budget) * 100) : 0;
                    const over = u.committed > u.budget;
                    const color = over ? 'var(--tint-fatal-accent)' : UTIL_COLORS[i % UTIL_COLORS.length];
                    return (
                      <div key={u.area}>
                        <div className="pd-util-label">
                          <span className="pd-util-area">{u.area}</span>
                          {over && <span className="pd-over"><Sym name="priority_high" />Over budget</span>}
                          <span className="pd-util-note">{u.plans} {u.plans === 1 ? 'plan' : 'plans'}</span>
                        </div>
                        <div className="pd-util-bar">
                          <div className="pd-track pd-track--util"><div className="pd-fill" style={{ width: `${Math.min(p, 100)}%`, background: color }} /></div>
                          <span className="pd-util-amounts">{money(u.committed)} of {money(u.budget)}</span>
                          <span className="pd-util-pct" style={{ color }}>{p}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pd-right">
                <Button variant="secondary">Planning Dashboard</Button>
              </div>

              {/* My Publication Plans */}
              <div className="pd-block">
                <SectionTitle icon="calendar_month" title={`My Publication Plans (${planRows.length} items)`} className="pd-section-title--mb14">
                  <RefreshIcon onClick={refresh} />
                </SectionTitle>
                <div className="pd-count">{planRows.length} items</div>
                <DataTable
                  columns={PLAN_COLUMNS}
                  rows={planRows}
                  onRowClick={r => navigate('/publication-plan/' + r.savedId)}
                  headerTone="knowledge"
                  zebra={false}
                >
                  {planRows.length === 0 ? <div className="pd-empty-row">No publication plans yet. Create one from Create New › Publication Planning.</div> : undefined}
                </DataTable>
              </div>

              {/* Publication Activity */}
              <div className="pd-block">
                <SectionTitle icon="show_chart" title="Publication Activity" />
                <div className="pd-lede">Compare drafts started against submissions across a rolling twelve months. Watch for months where drafting outpaces submission.</div>
                <ActivityChart data={activityData} />
              </div>

              {/* Publication Portfolio Overview */}
              <div className="pd-block">
                <SectionTitle icon="grid_view" title="Publication Portfolio Overview" smallBadge />
                <div className="pd-lede">Track how your publication plan breaks down by product, therapeutic area, and type. Monitor portfolio balance and spot where your plan is concentrated. Covers publications created {scopeText}, excluding cancelled ones.</div>
                <div className="pd-chart-grid">
                  <ChartCard icon="medication" title="Publication by Product">
                    <HBars rows={barRows(mix.products)} />
                  </ChartCard>
                  <ChartCard icon="dashboard" title="Therapeutic Area Distribution">
                    <HBars rows={barRows(mix.areas)} />
                  </ChartCard>
                  <ChartCard icon="description" title="Publication Type Mix">
                    <div className="pd-chart-body">
                      {mix.types.length === 0 && <NoData>No publications yet.</NoData>}
                      <div className="pd-typemix">
                        {mix.types.map(([label, total, approved]) => (
                          <div key={label}>
                            <div className="pd-typemix-label">{label}</div>
                            <div className="pd-typemix-bars">
                              <div className="pd-typemix-bar" title={`${label}: ${total}`} style={{ background: 'var(--nav)', width: `${((total / maxType) * 100).toFixed(1)}%` }} />
                              <div className="pd-typemix-bar" title={`${label} approved: ${approved}`} style={{ background: 'var(--high-emphasis)', width: `${((approved / maxType) * 100).toFixed(1)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pd-legend pd-legend--foot">
                        <div className="pd-legend-item"><span className="pd-dot" style={{ background: 'var(--nav)' }} />By Publication Type</div>
                        <div className="pd-legend-item"><span className="pd-dot" style={{ background: 'var(--high-emphasis)' }} />Approved By Publication Type</div>
                      </div>
                    </div>
                  </ChartCard>
                </div>
                <PipelineFooter counts={counts} onOpen={openList} className="pd-footer-strip--mt14" />
              </div>

              {/* Publication Outcomes Breakdown */}
              <div className="pd-block">
                <SectionTitle icon="monitoring" title="Publication Outcomes Breakdown" smallBadge />
                <div className="pd-lede">Track publication outcomes from submission through final disposition. Monitor acceptance rates, publication success, and identify publications requiring follow-up action. Outcomes come from each publication&rsquo;s Outcome tab.</div>
                <div className="pd-chart-grid">
                  {donuts.map(c => (
                    <ChartCard key={c.title} icon={c.icon} title={c.title}>
                      <Donut segments={donutSegments(c.data)} empty="No outcomes recorded yet." />
                    </ChartCard>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="pd-empty">
              <div className="pd-empty-title">{activeModule.label}</div>
              <div className="pd-empty-sub">No {activeModule.label} dashboard has been built yet.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
