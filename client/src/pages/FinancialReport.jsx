import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ds/pubpro';
import DateField from '../components/DateField';
import { api } from '../api';
import { fmtDate, parseDate } from './publication-form/data';
import { finance, inBounds, planFacts, pubFacts } from './stats';
import './FinancialReport.css';

// Built from saved publications (their costed Planning milestones) and plans (budgets, fees, allocations).

const JUMP_LINKS = [
  { href: '#sec-outstanding', label: 'Portfolio Summary' },
  { href: '#sec-ta', label: 'By Therapeutic Area' },
  { href: '#sec-vendor', label: 'By Vendor' },
  { href: '#sec-pm', label: 'By Publication Manager' },
  { href: '#sec-milestones', label: 'By Publication (Milestones)' },
  { href: '#sec-unsubmitted', label: 'Awaiting Invoice', warn: true },
];

const NO_PRODUCT = 'No product';
const NO_TA = 'No therapeutic area';
const IN_HOUSE = 'In-house (no vendor)';
const UTIL_COLORS = ['var(--chart-3)', 'var(--chart-4)', 'var(--chart-2)', 'var(--chart-1)', 'var(--chart-5)', 'var(--chart-6)'];
const MILESTONE_LIMIT = 12;

// Payment status labels and tints, in order of how urgently they need attention.
const PAY_LOOK = {
  overdue: { rank: 0, bg: 'var(--tint-fatal-bg)', color: 'var(--tint-fatal-accent)' },
  returned: { rank: 1, label: 'Returned', bg: 'var(--tint-fatal-bg)', color: 'var(--tint-fatal-accent)' },
  pending: { rank: 2, label: 'Awaiting approval', bg: 'var(--tint-warning-bg)', color: 'var(--tint-warning-accent)' },
  approved: { rank: 3, label: 'Approved', bg: 'var(--tint-info-bg)', color: 'var(--tint-info-accent)' },
  queued: { rank: 4, label: 'Payment initiated', bg: 'var(--tint-info-bg)', color: 'var(--tint-info-accent)' },
  notmet: { rank: 5, label: 'Not yet due', bg: 'var(--tint-suspended-bg)', color: 'var(--tint-suspended-accent)' },
  paid: { rank: 6, label: 'Paid', bg: 'var(--tint-positive-bg)', color: 'var(--tint-positive-accent)' },
};

const money = n => '$' + Math.round(n || 0).toLocaleString('en-US');
const pctOf = (n, d) => (d ? ((n / d) * 100).toFixed(1) + '%' : '0%');
const longDate = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const toggleIn = (list, value) => (list.includes(value) ? list.filter(v => v !== value) : list.concat([value]));
const uniq = xs => [...new Set(xs)].sort((a, b) => a.localeCompare(b));

// "All x (n)" when everything is picked, otherwise a count (or the joined names).
const summarizePick = (selected, all, noun, joinNames) => {
  if (selected.length === all.length) return `All ${noun} (${all.length})`;
  if (!selected.length) return 'None selected';
  return joinNames ? selected.join(', ') : `${selected.length} selected`;
};

// ---- Report sections from the filtered records ----

function utilizationRows(plans) {
  const by = new Map();
  plans.forEach(p => {
    const k = p.ta || NO_TA;
    const cur = by.get(k) || { area: k, budget: 0, planned: 0, committed: 0 };
    cur.budget += p.budget;
    cur.planned += (p.plan.data && p.plan.data.ideas ? p.plan.data.ideas.reduce((a, i) => a + (i.cost || 0), 0) : 0);
    cur.committed += p.committed;
    by.set(k, cur);
  });
  return [...by.values()].sort((a, b) => b.budget - a.budget).map((u, i) => {
    const pct = u.budget ? Math.round((u.committed / u.budget) * 100) : 0;
    const over = u.committed > u.budget;
    return {
      ...u,
      variance: (u.committed >= u.budget ? '+' : '−') + money(Math.abs(u.committed - u.budget)),
      pct: pct + '%',
      width: Math.min(pct, 100) + '%',
      color: over ? 'var(--tint-fatal-accent)' : UTIL_COLORS[i % UTIL_COLORS.length],
      over,
    };
  });
}

function groupSpend(facts, keyOf) {
  const by = new Map();
  facts.forEach(f => {
    const k = keyOf(f);
    const cur = by.get(k) || { name: k, pubs: 0, contracted: 0, paid: 0, areas: new Set() };
    cur.pubs += 1;
    cur.contracted += f.money.contracted;
    cur.paid += f.money.paid;
    if (f.ta) cur.areas.add(f.ta);
    by.set(k, cur);
  });
  return [...by.values()].sort((a, b) => b.contracted - a.contracted)
    .map(g => ({ ...g, outstanding: g.contracted - g.paid, areas: [...g.areas].join(', ') || '—' }));
}

function milestoneRows(facts, today) {
  const rows = facts.flatMap(f => f.costed.map(r => {
    const due = parseDate(r.end || r.start);
    const late = r.status === 'notmet' && due && due < today;
    const look = late ? PAY_LOOK.overdue : PAY_LOOK[r.status] || PAY_LOOK.notmet;
    const days = late ? Math.round((today - due) / 86400000) : 0;
    return {
      key: f.id + r.id,
      milestone: r.name || 'Untitled milestone',
      pub: f.id,
      vendor: f.vendor || IN_HOUSE,
      due: due ? fmtDate(due) : '—',
      dueTime: due ? due.getTime() : Infinity,
      status: late ? `Overdue ${days}d` : look.label,
      rank: look.rank,
      bg: look.bg,
      color: look.color,
      amount: r.amount || 0,
    };
  }));
  return rows.sort((a, b) => a.rank - b.rank || a.dueTime - b.dueTime);
}

/** Costed milestones marked reached on the Planning tab that have no invoice against them yet. */
const awaitingInvoice = facts => facts.flatMap(f => f.costed
  .filter(r => r.done && r.status === 'notmet')
  .map(r => ({ key: f.id + r.id, pub: f.id, vendor: f.vendor || IN_HOUSE, milestone: r.name, hitDate: r.doneOn || r.end || '—', amount: r.amount || 0 })));

// The app's sticky chrome (TopNav + WorkspaceTabs) sits above this page; read its
// height so the sticky filter rail and the jump-to anchors land below it.
function useChromeOffset() {
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => {
    const el = document.querySelector('.layout-chrome');
    if (!el) return undefined;
    const update = () => setOffset(el.offsetHeight);
    update();
    if (typeof ResizeObserver !== 'function') return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return offset;
}

const Sym = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{name}</span>
);

const onActivate = fn => e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

// Hand-rolled multi-select dropdown from the design (trigger + checkbox list + Done).
function MultiFilter({ label, summary, open, onToggle, options, selected, onToggleOption }) {
  return (
    <div className="fr-filter">
      <div className="fr-filter-label">{label}</div>
      <div
        className="fr-filter-trigger"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={onActivate(onToggle)}
      >
        <span className="fr-filter-summary">{summary}</span>
        <Sym name={open ? 'expand_less' : 'expand_more'} className="fr-filter-chevron" />
      </div>
      {open && (
        <div className="fr-filter-menu">
          {options.length === 0 && <div className="fr-filter-option fr-faint">Nothing saved yet</div>}
          {options.map(opt => {
            const on = selected.includes(opt);
            return (
              <div
                key={opt}
                className="fr-filter-option"
                role="checkbox"
                aria-checked={on}
                tabIndex={0}
                onClick={() => onToggleOption(opt)}
                onKeyDown={onActivate(() => onToggleOption(opt))}
              >
                <span className={`fr-filter-box${on ? ' fr-filter-box--on' : ''}`}>
                  <Sym name={on ? 'check' : ''} className="fr-filter-tick" />
                </span>
                <span className="fr-filter-option-label">{opt}</span>
              </div>
            );
          })}
          <div className="fr-filter-done-row">
            <span className="fr-filter-done" role="button" tabIndex={0} onClick={onToggle} onKeyDown={onActivate(onToggle)}>Done</span>
          </div>
        </div>
      )}
    </div>
  );
}

const EmptyRow = ({ cols, children }) => (
  <tr><td colSpan={cols} className="fr-empty">{children}</td></tr>
);

function OutstandingSummary({ fin }) {
  const split = [
    { label: 'Paid to date', amount: fin.paid, accent: 'var(--tint-positive-accent)' },
    { label: 'Awaiting approval', amount: fin.awaiting, accent: 'var(--tint-warning-accent)' },
    { label: 'Not yet due', amount: fin.notDue, accent: 'var(--tint-suspended-accent)' },
  ];
  return (
    <div className="fr-summary">
      <div className="fr-summary-stats">
        <div>
          <div className="fr-stat-label">AMOUNT OUTSTANDING</div>
          <div className="fr-stat-value">{money(fin.outstanding)}</div>
          <div className="fr-stat-sub">{pctOf(fin.outstanding, fin.contracted)} of contracted value</div>
        </div>
        <div className="fr-stat-divider" />
        <div>
          <div className="fr-stat-label">PAID TO DATE</div>
          <div className="fr-stat-value fr-stat-value--ok">{money(fin.paid)}</div>
          <div className="fr-stat-sub">{pctOf(fin.paid, fin.contracted)} of contracted value</div>
        </div>
        <div className="fr-stat-total">
          <div className="fr-stat-label">TOTAL CONTRACTED</div>
          <div className="fr-stat-value fr-stat-value--sm">{money(fin.contracted)}</div>
          <div className="fr-stat-sub">
            {fin.pubCount} {fin.pubCount === 1 ? 'publication' : 'publications'} · {fin.vendorCount} {fin.vendorCount === 1 ? 'vendor' : 'vendors'}
          </div>
        </div>
      </div>
      <div className="fr-split">
        {split.map(r => (
          <div key={r.label} className="fr-split-row">
            <div className="fr-split-label">
              <span className="fr-split-swatch" style={{ background: r.accent }} />
              {r.label}
            </div>
            <div className="fr-split-amount">{money(r.amount)}</div>
            <div className="fr-split-pct">{pctOf(r.amount, fin.contracted)}</div>
            <div className="fr-split-track">
              <div className="fr-split-fill" style={{ width: pctOf(r.amount, fin.contracted), background: r.accent }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UtilizationTable({ rows }) {
  return (
    <table className="fr-table fr-table--noted">
      <thead>
        <tr>
          <th>Therapeutic area</th>
          <th className="fr-r">Budget</th>
          <th className="fr-r">Planned</th>
          <th className="fr-r">Actual (Committed)</th>
          <th className="fr-r">Variance</th>
          <th className="fr-util-col">Utilization</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <EmptyRow cols={6}>No publication plans in scope.</EmptyRow>}
        {rows.map(u => (
          <tr key={u.area} className={u.over ? 'fr-util-row--over' : undefined}>
            <td className={`fr-nav${u.over ? ' fr-b7' : ''}`}>
              {u.area}
              {u.over && <> <span className="fr-over">▲ over</span></>}
            </td>
            <td className="fr-r">{money(u.budget)}</td>
            <td className="fr-r fr-muted">{money(u.planned)}</td>
            <td className="fr-r fr-b7">{money(u.committed)}</td>
            <td className={`fr-r fr-b7 ${u.over ? 'fr-fatal' : 'fr-positive'}`}>{u.variance}</td>
            <td>
              <div className="fr-util">
                <div className="fr-util-track"><div className="fr-util-fill" style={{ width: u.width, background: u.color }} /></div>
                <span className="fr-util-pct" style={{ color: u.color }}>{u.pct}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function VendorTable({ rows }) {
  const total = rows.reduce((a, v) => ({ pubs: a.pubs + v.pubs, contracted: a.contracted + v.contracted, paid: a.paid + v.paid }), { pubs: 0, contracted: 0, paid: 0 });
  const withTotal = rows.length ? rows.concat([{ ...total, name: 'Total', outstanding: total.contracted - total.paid, total: true }]) : [];
  return (
    <table className="fr-table">
      <thead>
        <tr>
          <th>Vendor / agency</th>
          <th className="fr-r">Pubs</th>
          <th className="fr-r">Contracted</th>
          <th className="fr-r">Paid</th>
          <th className="fr-r">Outstanding</th>
          <th className="fr-r">% Paid</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <EmptyRow cols={6}>No publications with costed milestones in scope.</EmptyRow>}
        {withTotal.map(v => {
          const muted = v.name === IN_HOUSE;
          const tone = muted ? 'fr-faint' : 'fr-nav';
          const weight = v.total ? 'fr-b7' : muted ? '' : 'fr-b6';
          return (
            <tr key={v.name} className={v.total ? 'fr-row--total' : undefined}>
              <td className={`${tone} ${weight}`}>{v.name}</td>
              <td className={`fr-r ${tone}`}>{v.pubs}</td>
              <td className={`fr-r ${tone}`}>{money(v.contracted)}</td>
              <td className={`fr-r ${weight} ${muted ? 'fr-faint' : 'fr-positive'}`}>{money(v.paid)}</td>
              <td className={`fr-r ${weight} ${muted ? 'fr-faint' : 'fr-accent'}`}>{money(v.outstanding)}</td>
              <td className={`fr-r ${tone} ${weight}`}>{v.contracted ? Math.round((v.paid / v.contracted) * 100) + '%' : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PubManagerTable({ rows }) {
  return (
    <table className="fr-table">
      <thead>
        <tr>
          <th>Publication manager</th>
          <th>Therapeutic area(s)</th>
          <th className="fr-r">Pubs</th>
          <th className="fr-r">Contracted</th>
          <th className="fr-r">Paid</th>
          <th className="fr-r">Outstanding</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <EmptyRow cols={6}>No publications with costed milestones in scope.</EmptyRow>}
        {rows.map(p => (
          <tr key={p.name}>
            <td className="fr-nav fr-b6">{p.name}</td>
            <td className="fr-muted">{p.areas}</td>
            <td className="fr-r fr-nav">{p.pubs}</td>
            <td className="fr-r fr-nav">{money(p.contracted)}</td>
            <td className="fr-r fr-positive fr-b6">{money(p.paid)}</td>
            <td className="fr-r fr-accent fr-b6">{money(p.outstanding)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MilestoneTable({ rows }) {
  return (
    <table className="fr-table fr-table--noted fr-table--dense">
      <thead>
        <tr>
          <th>Milestone</th>
          <th>Publication</th>
          <th>Vendor</th>
          <th className="fr-r fr-col-due">Due</th>
          <th className="fr-col-status">Status</th>
          <th className="fr-r fr-col-amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <EmptyRow cols={6}>No costed milestones in scope.</EmptyRow>}
        {rows.map(m => (
          <tr key={m.key}>
            <td>{m.milestone}</td>
            <td className="fr-muted">{m.pub}</td>
            <td className="fr-muted">{m.vendor}</td>
            <td className="fr-r">{m.due}</td>
            <td><span className="fr-status" style={{ background: m.bg, color: m.color }}>{m.status}</span></td>
            <td className="fr-r fr-b7" style={{ color: m.color }}>{money(m.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AwaitingInvoiceTable({ rows }) {
  return (
    <table className="fr-table fr-table--noted">
      <thead>
        <tr>
          <th>Publication</th>
          <th>Vendor</th>
          <th>Milestone reached</th>
          <th className="fr-r">Hit date</th>
          <th className="fr-r">Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <EmptyRow cols={5}>Nothing awaiting an invoice.</EmptyRow>}
        {rows.map(u => (
          <tr key={u.key}>
            <td className="fr-nav fr-b6">{u.pub}</td>
            <td className="fr-muted">{u.vendor}</td>
            <td>{u.milestone}</td>
            <td className="fr-r">{u.hitDate}</td>
            <td className="fr-r fr-b7 fr-warning">{money(u.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function FinancialReport() {
  const navigate = useNavigate();
  const chromeOffset = useChromeOffset();
  const [generated] = useState(() => new Date());
  const today = new Date(generated.getFullYear(), generated.getMonth(), generated.getDate());
  const defaultFrom = fmtDate(new Date(today.getFullYear(), 0, 1));
  const defaultTo = fmtDate(today);

  const [pubs, setPubs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    Promise.all([
      api.get('/pp-publications?include=data').catch(() => []),
      api.get('/pp-plans?include=data').catch(() => []),
    ]).then(([p, pl]) => { setPubs(p); setPlans(pl); setLoaded(true); });
  }, []);

  // Filters hold what is switched off, so options that appear later start switched on.
  const [offProducts, setOffProducts] = useState([]);
  const [offTa, setOffTa] = useState([]);
  const [offVendors, setOffVendors] = useState([]);
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [openFilter, setOpenFilter] = useState(null); // 'product' | 'ta' | 'vendor' | null

  const facts = pubs.map(pubFacts).filter(f => !f.cancelled);
  const pfacts = plans.map(planFacts).filter(p => p.status !== 'Cancelled');
  const productOf = x => x.product || NO_PRODUCT;
  const taOf = x => x.ta || NO_TA;
  const vendorOf = f => f.vendor || IN_HOUSE;
  const productOptions = uniq(facts.map(productOf).concat(pfacts.map(productOf)));
  const taOptions = uniq(facts.map(taOf).concat(pfacts.map(taOf)));
  const vendorOptions = uniq(facts.map(vendorOf));
  const products = productOptions.filter(x => !offProducts.includes(x));
  const tas = taOptions.filter(x => !offTa.includes(x));
  const vendors = vendorOptions.filter(x => !offVendors.includes(x));

  // Publications count when created inside the date range.
  const from = parseDate(dateFrom);
  const toDay = parseDate(dateTo);
  const bounds = [from, toDay ? new Date(toDay.getFullYear(), toDay.getMonth(), toDay.getDate() + 1) : null];
  const scoped = facts.filter(f => products.includes(productOf(f)) && tas.includes(taOf(f)) && vendors.includes(vendorOf(f)) && inBounds(f.created, bounds));
  const scopedPlans = pfacts.filter(p => products.includes(productOf(p)) && tas.includes(taOf(p)));
  const costedPubs = scoped.filter(f => f.costed.length);

  const fin = finance(scoped);
  const util = utilizationRows(scopedPlans);
  const vendorRows = groupSpend(costedPubs, vendorOf);
  const pmRows = groupSpend(costedPubs, f => f.owner || 'Unassigned');
  const allMilestones = milestoneRows(scoped, today);
  const milestones = allMilestones.slice(0, MILESTONE_LIMIT);
  const invoices = awaitingInvoice(scoped);
  const utilTotal = util.reduce((a, u) => a + u.committed, 0);

  const toggleOpen = key => setOpenFilter(cur => (cur === key ? null : key));
  const applyFilters = () => setOpenFilter(null);
  const resetFilters = () => {
    setOffProducts([]);
    setOffTa([]);
    setOffVendors([]);
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
  };

  const goDashboard = e => {
    e.preventDefault();
    navigate('/dashboard');
  };

  const period = from && toDay ? `${longDate(from)} – ${longDate(toDay)}` : from ? 'Since ' + longDate(from) : toDay ? 'Through ' + longDate(toDay) : 'All dates';
  const generatedLabel = longDate(generated) + ', ' + generated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="fr-page" style={{ '--fr-sticky-top': `${chromeOffset}px` }}>
      <div className="fr-topbar">
        <a href="/dashboard" onClick={goDashboard} className="fr-back">
          <Sym name="arrow_back" className="fr-back-icon" />Back to Dashboard
        </a>
        <div className="fr-topbar-actions">
          <Button variant="primary" icon="picture_as_pdf" onClick={() => window.print()}>Export PDF</Button>
        </div>
      </div>

      <div className="fr-jumpbar">
        <span className="fr-jumpbar-label">Jump to level</span>
        {JUMP_LINKS.map(l => (
          <a key={l.href} href={l.href} className={`fr-jump${l.warn ? ' fr-jump--warn' : ''}`}>{l.label}</a>
        ))}
      </div>

      <div className="fr-body">
        <aside className="fr-rail fr-no-print">
          <div className="fr-rail-title">Filter Report</div>

          <MultiFilter
            label="Product"
            summary={summarizePick(products, productOptions, 'products')}
            open={openFilter === 'product'}
            onToggle={() => toggleOpen('product')}
            options={productOptions}
            selected={products}
            onToggleOption={name => setOffProducts(s => toggleIn(s, name))}
          />
          <MultiFilter
            label="Therapeutic Area"
            summary={summarizePick(tas, taOptions, 'areas')}
            open={openFilter === 'ta'}
            onToggle={() => toggleOpen('ta')}
            options={taOptions}
            selected={tas}
            onToggleOption={name => setOffTa(s => toggleIn(s, name))}
          />
          <MultiFilter
            label="Vendor"
            summary={summarizePick(vendors, vendorOptions, 'vendors')}
            open={openFilter === 'vendor'}
            onToggle={() => toggleOpen('vendor')}
            options={vendorOptions}
            selected={vendors}
            onToggleOption={name => setOffVendors(s => toggleIn(s, name))}
          />

          <div className="fr-filter">
            <div className="fr-filter-label">Date Range</div>
            <div className="fr-dates">
              <DateField value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From m/d/yyyy" width="100%" />
              <DateField value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To m/d/yyyy" width="100%" />
            </div>
            <div className="fr-filter-note">Publications created in this range.</div>
          </div>

          <div className="fr-rail-actions">
            <Button variant="primary" onClick={applyFilters} style={{ flex: 1, justifyContent: 'center' }}>Apply</Button>
            <Button variant="secondary" onClick={resetFilters} style={{ flex: 1, justifyContent: 'center' }}>Reset</Button>
          </div>
        </aside>

        <div className="fr-main">
          {/* On-screen look of the design's <doc-page margin="0.6in">: a letter-width sheet on a desk.
              The thead/tfoot carry the running header/footer, which browsers repeat on each printed page. */}
          <div className="fr-desk">
            <div className="fr-sheet">
              <table className="fr-frame" role="presentation">
                <thead>
                  <tr><th>
                    <div className="fr-doc-header">
                      <span className="fr-doc-brand">BPLOGIX</span>
                      <span className="fr-doc-sep">|</span>
                      <span>PubPro Financial Report — Publication Portfolio</span>
                      <span className="fr-doc-conf">Confidential — Internal Use Only</span>
                    </div>
                  </th></tr>
                </thead>
                <tbody>
                  <tr><td>
                    <div className="fr-titleblock">
                      <div className="fr-eyebrow">MEDICAL AFFAIRS — PUBLICATION FINANCE</div>
                      <h1 className="fr-title">Publication Portfolio Financial Report</h1>
                      <div className="fr-meta">
                        <div><span className="fr-meta-label">Reporting period</span>{period}</div>
                        <div><span className="fr-meta-label">Generated</span>{generatedLabel}</div>
                      </div>
                    </div>

                    <div className="fr-scope">
                      <div className="fr-scope-title">APPLIED SCOPE</div>
                      <div className="fr-scope-grid">
                        <div><span className="fr-scope-key">Product</span> · {summarizePick(products, productOptions, 'products', true)}</div>
                        <div><span className="fr-scope-key">Therapeutic area</span> · {summarizePick(tas, taOptions, 'areas', true)}</div>
                        <div><span className="fr-scope-key">Vendor</span> · {summarizePick(vendors, vendorOptions, 'vendors')}</div>
                        <div className="fr-scope-wide"><span className="fr-scope-key">Date range</span> · {`Custom — ${dateFrom || '…'} to ${dateTo || '…'}`}</div>
                      </div>
                    </div>

                    {!loaded && <div className="fr-footnote fr-footnote--gap">Loading saved records…</div>}

                    <h2 className="fr-h2" id="sec-outstanding">Outstanding vs. Paid</h2>
                    <OutstandingSummary fin={fin} />

                    <h2 className="fr-h2" id="sec-ta">Budget Utilization by Therapeutic Area</h2>
                    <UtilizationTable rows={util} />
                    <div className="fr-footnote fr-footnote--gap">
                      Budget = plan budget. Planned = projected cost of each plan&rsquo;s planned pubs not yet launched.
                      Actual (Committed) = allocations to launched publications plus plan-level fees; {money(utilTotal)} across the plans in scope.
                    </div>

                    <h2 className="fr-h2" id="sec-vendor">Spend by Vendor</h2>
                    <VendorTable rows={vendorRows} />

                    <h2 className="fr-h2" id="sec-pm">Spend by Publication Manager</h2>
                    <PubManagerTable rows={pmRows} />

                    <h2 className="fr-h2" id="sec-milestones">Milestone Payment Status — By Publication</h2>
                    <MilestoneTable rows={milestones} />
                    <div className="fr-footnote fr-footnote--gap">
                      {allMilestones.length > MILESTONE_LIMIT
                        ? `Showing the ${MILESTONE_LIMIT} most urgent of ${allMilestones.length} costed milestones, ordered by urgency.`
                        : `All ${allMilestones.length} costed ${allMilestones.length === 1 ? 'milestone' : 'milestones'} in scope, ordered by urgency.`}
                    </div>

                    <h2 className="fr-h2" id="sec-unsubmitted">Payable Milestones Awaiting Invoice</h2>
                    <AwaitingInvoiceTable rows={invoices} />
                    <div className="fr-footnote">Costed milestones marked reached on the Planning tab that are still not started for payment (no invoice submitted).</div>
                  </td></tr>
                </tbody>
                <tfoot>
                  <tr><td>
                    <div className="fr-doc-footer">
                      <span>Generated by PubPro on {generatedLabel}</span>
                    </div>
                  </td></tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
