import React, { useEffect, useMemo, useState } from 'react';
import { Button, DataTable, Icon, InlineMessage, NavMenu, Pill, StatCard } from '../../../ds/pubpro';
import { AWAITING, COORDINATOR, IN_REVIEW, TODAY, daysFrom, dueLabel, fmt, fmtLong } from './data';
import { Hover, Shell } from './shared';

const TYPES = ['All', 'Publication', 'SPP', 'OSS'];
const byDue = (a, b) => a.due - b.due; // due date only: expedited never changes the order

const QUEUE_COLS = [
  { header: 'Record ID', width: '100px' },
  { header: 'Title', width: 'minmax(120px, 2fr)' },
  { header: 'Type', width: '78px' },
  { header: 'Requester', width: 'minmax(84px, 1fr)' },
  { header: 'Department / Subdepartment', width: 'minmax(110px, 1.3fr)' },
  { header: 'Submitted', width: '58px' },
  { header: <span>Due date <Icon name="arrow_upward" size={14} color="var(--nav)" /></span>, width: '96px' },
  { header: 'Expedited', width: '64px' },
  { header: <span className="rgm-label"><Icon name="auto_awesome" size={15} color="var(--nav)" />Approvia AI check</span>, width: 'minmax(120px, 1.4fr)' },
  { header: '', width: '162px' },
];
const REVIEW_COLS = [
  { header: 'Record ID', width: '100px' },
  { header: 'Title', width: 'minmax(160px, 2.4fr)' },
  { header: 'Type', width: '78px' },
  { header: 'Requester', width: 'minmax(90px, 1fr)' },
  { header: 'Reviewers', width: '112px' },
  { header: <span>Due date <Icon name="arrow_upward" size={14} color="var(--nav)" /></span>, width: '96px' },
  { header: '', width: 'minmax(220px, 1.8fr)' },
];
const template = cols => cols.map(c => c.width).join(' ');

const ROW_MENU = [
  { label: 'Edit fields', icon: 'edit' },
  { label: 'Send back for revisions', icon: 'undo' },
  { label: 'Add reviewer', icon: 'person_add' },
  { label: 'Cancel submission', icon: 'block' },
];

function Due({ date }) {
  const d = dueLabel(date);
  return (
    <span className="rgm-due">
      <span className="rgm-date-text">{fmt(date)}</span>
      <Pill tone={d.tone} style={{ padding: '2px 9px' }}>{d.text}</Pill>
    </span>
  );
}

function QueueRow({ r, open, onToggle, menuOpen, onMenu }) {
  const flags = r.flags || [];
  return (
    <>
      <div className="rgm-row rgm-queue-row" style={{ gridTemplateColumns: template(QUEUE_COLS) }}>
        <span className="rgm-cell rgm-id">{r.id}</span>
        <span className="rgm-cell rgm-title">{r.title}</span>
        <span className="rgm-cell">{r.type}</span>
        <span className="rgm-cell">{r.requester}</span>
        <span className="rgm-cell">{r.dept}<span className="rgm-sub">{r.sub}</span></span>
        <span className="rgm-cell">{fmt(r.submitted)}</span>
        <span className="rgm-cell"><Due date={r.due} /></span>
        <span className="rgm-cell">
          {r.expedited && (
            <Hover title="Expedited" tip="The requester asked for an expedited review. It does not change the queue order." width={220}>
              <span className="rgm-exp"><Icon name="bolt" size={15} color="var(--text-meta)" />Yes</span>
            </Hover>
          )}
        </span>
        <span className="rgm-cell">
          {flags.length ? flags.map(f => (
            <Hover key={f.text} title={'Check: ' + f.field} tip={f.detail} align="right" width={260}>
              <button type="button" className="rgm-flag" aria-expanded={open} onClick={onToggle}>
                <Icon name="flag" size={14} color="var(--warn-text)" />{f.text}
              </button>
            </Hover>
          )) : (
            <Hover title="Approvia AI" tip="No issues found in the fields or attachments." width={210}>
              <span className="rgm-clear"><Icon name="check_circle" size={18} color="var(--fg-disabled)" /></span>
            </Hover>
          )}
        </span>
        <span className="rgm-cell rgm-actions">
          <Button>Validate &amp; Start</Button>
          <Button variant="ghost" icon="more_horiz" aria-label="More actions" aria-expanded={menuOpen} onClick={onMenu} style={{ padding: '0 6px' }} />
          {menuOpen && <NavMenu items={ROW_MENU} width={230} style={{ left: 'auto', right: 0, marginTop: 4 }} onSelect={onMenu} />}
        </span>
      </div>
      {open && flags.map(f => (
        <div key={f.text} className="rgm-flag-detail">
          <InlineMessage kind="warning">
            <span className="rgm-flag-detail-inner">
              <span><strong>Approvia AI: check the {f.field} field.</strong> {f.detail}</span>
              <Button variant="ghost" icon="edit">Open {f.field}</Button>
              <Button variant="ghost" onClick={onToggle}>Dismiss</Button>
            </span>
          </InlineMessage>
        </div>
      ))}
    </>
  );
}

function ReviewRow({ r }) {
  const [approved, total] = r.reviewers;
  const risky = !!r.risk;
  return (
    <div className={'rgm-row' + (risky ? ' rgm-row--risk' : '')} style={{ gridTemplateColumns: template(REVIEW_COLS) }}>
      <span className="rgm-cell rgm-id">{r.id}</span>
      <span className="rgm-cell rgm-title">{r.title}</span>
      <span className="rgm-cell">{r.type}</span>
      <span className="rgm-cell">{r.requester}</span>
      <span className="rgm-cell">{approved} of {total} approved</span>
      <span className="rgm-cell">{fmt(r.due)}{daysFrom(r.due) < 0 && <span className="rgm-sub">{dueLabel(r.due).text}</span>}</span>
      <span className="rgm-cell">
        {risky && (
          <span className="rgm-risk">
            <Pill tone={r.risk === 'Overdue' ? 'overdue' : 'due-soon'} style={{ padding: '2px 10px' }}>{r.risk}</Pill>
            <span className="rgm-risk-note">{total - approved} of {total} reviewers outstanding</span>
          </span>
        )}
      </span>
    </div>
  );
}

export default function CoordinatorDashboard() {
  const params = new URLSearchParams(window.location.search);
  const [type, setType] = useState('All');
  const [openFlags, setOpenFlags] = useState(() => new Set(AWAITING.filter(r => r.open).map(r => r.id)));
  const [menu, setMenu] = useState(params.get('menu'));
  const [reviewOpen, setReviewOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!menu) return undefined;
    const close = e => { if (!e.target.closest('.rgm-actions')) setMenu(null); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menu]);

  const match = r => type === 'All' || r.type === type;
  const queue = useMemo(() => AWAITING.filter(match).sort(byDue), [type]);
  const review = useMemo(() => IN_REVIEW.filter(match).sort(byDue), [type]);
  const shownReview = showAll ? review : review.slice(0, 6);

  const weekEnd = new Date(TODAY); weekEnd.setDate(TODAY.getDate() + (7 - TODAY.getDay()) % 7);
  const dueThisWeek = [...AWAITING, ...IN_REVIEW].filter(r => daysFrom(r.due) >= 0 && r.due <= weekEnd).length;
  const overdue = IN_REVIEW.filter(r => r.risk === 'Overdue').length;
  const typeCount = t => AWAITING.filter(r => t === 'All' || r.type === t).length;

  const toggleFlag = id => setOpenFlags(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Shell
      nav={['Home', 'Submissions', 'Reviewers', 'Settings']}
      activeNav="Home"
      workspace="Clearance Coordinator"
      tabs={['Dashboard', 'All Submissions', 'Reviewer Assignments', { label: 'Searches', menu: true }]}
      activeTab="Dashboard"
    >
      <main className="rgm-page">
        <header className="rgm-head">
          <div>
            <div className="rgm-greet">Good morning, {COORDINATOR.first}</div>
            <div className="rgm-date">{fmtLong(TODAY)}</div>
          </div>
        </header>

        <div className="rgm-stats">
          <StatCard label="Awaiting Validation" value={AWAITING.length} tone="info" icon="inbox" />
          <StatCard label="Due This Week" value={dueThisWeek} tone="warning" icon="event" />
          <StatCard label="Overdue Reviews" value={overdue} tone="fatal" icon="schedule" />
          <StatCard label="In Review" value={IN_REVIEW.length} icon="rate_review" />
        </div>

        <section className="rgm-group" aria-labelledby="rgm-a">
          <div className="rgm-section-head">
            <span id="rgm-a" className="pp-section">Awaiting your validation</span>
            <Pill tone="nav">{queue.length}</Pill>
            <span className="rgm-hint"><Icon name="sort" size={16} />Sorted by due date, soonest first</span>
            <div className="rgm-filters" role="group" aria-label="Quick filters by submission type">
              <span className="rgm-filter-label">Quick filters</span>
              {TYPES.map(t => (
                <Button key={t} variant={type === t ? 'primary' : 'secondary'} aria-pressed={type === t} onClick={() => setType(t)}>
                  {t} <span className="rgm-count">{typeCount(t)}</span>
                </Button>
              ))}
              <Button variant="ghost" icon="tune">Edit filters</Button>
            </div>
          </div>
          <DataTable columns={QUEUE_COLS} style={{ overflow: 'visible', border: '2px solid var(--high-emphasis)' }}>
            {queue.map(r => (
              <QueueRow
                key={r.id}
                r={r}
                open={openFlags.has(r.id)}
                onToggle={() => toggleFlag(r.id)}
                menuOpen={menu === r.id}
                onMenu={() => setMenu(m => (m === r.id ? null : r.id))}
              />
            ))}
          </DataTable>
        </section>

        <section className="rgm-group rgm-quiet" aria-labelledby="rgm-b">
          <div className="rgm-quiet-head">
            <span id="rgm-b" className="pp-subsection">In review ({review.length})</span>
            <span className="rgm-hint pp-help">Sorted by due date · only records at risk are highlighted</span>
            <button type="button" className="rgm-linkbtn" aria-expanded={reviewOpen} onClick={() => setReviewOpen(o => !o)}>{reviewOpen ? 'Collapse' : 'Expand'}</button>
          </div>
          {reviewOpen && (
            <DataTable columns={REVIEW_COLS} headerTone="knowledge" style={{ overflow: 'visible' }}>
              {shownReview.map(r => <ReviewRow key={r.id} r={r} />)}
              {review.length > 6 && (
                <div className="rgm-more">
                  <button type="button" className="rgm-linkbtn" onClick={() => setShowAll(s => !s)}>{showAll ? 'Show fewer' : 'Show ' + (review.length - 6) + ' more'}</button>
                </div>
              )}
            </DataTable>
          )}
        </section>
      </main>
    </Shell>
  );
}
