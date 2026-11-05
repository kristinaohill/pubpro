import React, { useEffect, useMemo, useState } from 'react';
import { Button, DataTable, Icon, InlineMessage, NavMenu, Panel, Pill, SegmentedToggle, StatCard } from '../../../ds/pubpro';
import PageHeader from '../../../components/PageHeader';
import { AWAITING, COORDINATOR, IN_REVIEW, TODAY, daysFrom, dueLabel, fmt, fmtLong } from './data';
import { Hover, Shell } from './shared';

const TYPES = ['All', 'Publication', 'SPP', 'OSS'];
const byDue = (a, b) => a.due - b.due; // due date only: expedited never changes the order

const QUEUE_COLS = [
  { header: 'Submission', width: 'minmax(190px, 2.2fr)' },
  { header: 'Requester', width: 'minmax(86px, 1fr)' },
  { header: 'Department / Subdepartment', width: 'minmax(116px, 1.3fr)' },
  { header: 'Submitted', width: '64px' },
  { header: 'Due Date', width: '104px' },
  { header: 'Expedited', width: '66px' },
  { header: 'Approvia AI Check', width: 'minmax(140px, 1.4fr)' },
  { header: '', width: '180px' },
];
const REVIEW_COLS = [
  { header: 'Submission', width: 'minmax(240px, 2.4fr)' },
  { header: 'Requester', width: 'minmax(100px, 1fr)' },
  { header: 'Reviewers', width: '120px' },
  { header: 'Due Date', width: '110px' },
  { header: '', width: 'minmax(220px, 1.8fr)' },
];
const template = cols => cols.map(c => c.width).join(' ');

const ROW_MENU = [
  { label: 'Edit fields', icon: 'edit' },
  { label: 'Send back for revisions', icon: 'undo' },
  { label: 'Add reviewer', icon: 'person_add' },
  { label: 'Cancel submission', icon: 'block' },
];

/** Record ID link with its type, title underneath (the dashboard's Publication column). */
function Submission({ r }) {
  return (
    <span className="rgm-cell">
      <a href={'#' + r.id} className="rgm-id">{r.id}</a> <span className="rgm-type">· {r.type}</span>
      <span className="rgm-title">{r.title}</span>
    </span>
  );
}

/** Due pill then date, as on the Publication Manager Dashboard. */
function Due({ date }) {
  const d = dueLabel(date);
  return (
    <span className="rgm-due">
      <Pill tone={d.tone}>{d.text}</Pill>
      <span className="rgm-meta">{fmt(date)}</span>
    </span>
  );
}

function QueueRow({ r, open, onToggle, menuOpen, onMenu }) {
  const flags = r.flags || [];
  return (
    <>
      <div className="rgm-row" style={{ gridTemplateColumns: template(QUEUE_COLS) }}>
        <Submission r={r} />
        <span className="rgm-cell">{r.requester}</span>
        <span className="rgm-cell">{r.dept}<span className="rgm-meta">{r.sub}</span></span>
        <span className="rgm-cell">{fmt(r.submitted)}</span>
        <span className="rgm-cell"><Due date={r.due} /></span>
        <span className="rgm-cell">
          {r.expedited && (
            <Hover title="Expedited" tip="The requester asked for an expedited review. It does not change the queue order." width={220}>
              <span className="rgm-exp"><Icon name="bolt" size={15} />Yes</span>
            </Hover>
          )}
        </span>
        <span className="rgm-cell">
          {flags.length ? flags.map(f => (
            <Hover key={f.text} title={'Check: ' + f.field} tip={f.detail} align="right" width={260}>
              <button type="button" className="rgm-warn rgm-flag" aria-expanded={open} onClick={onToggle}>
                <Icon name="flag" size={15} />{f.text}
              </button>
            </Hover>
          )) : (
            <Hover title="Approvia AI" tip="No issues found in the fields or attachments." width={210}>
              <Icon name="check_circle" size={18} color="var(--fg-disabled)" />
            </Hover>
          )}
        </span>
        <span className="rgm-cell rgm-actions">
          <Button>Validate &amp; Start</Button>
          <Button variant="ghost" icon="more_horiz" aria-label="More actions" aria-expanded={menuOpen} onClick={onMenu} />
          {menuOpen && <NavMenu items={ROW_MENU} style={{ left: 'auto', right: 0, marginTop: 4 }} onSelect={onMenu} />}
        </span>
      </div>
      {open && flags.map(f => (
        <div key={f.text} className="rgm-flag-detail">
          <InlineMessage kind="warning">
            <strong>Approvia AI: check the {f.field} field.</strong> {f.detail}
            <span className="rgm-inline-actions">
              <Button variant="secondary">Open {f.field}</Button>
              <Button variant="tertiary" onClick={onToggle}>Dismiss</Button>
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
      <Submission r={r} />
      <span className="rgm-cell">{r.requester}</span>
      <span className="rgm-cell">{approved} of {total} approved</span>
      <span className="rgm-cell">{fmt(r.due)}{daysFrom(r.due) < 0 && <span className="rgm-meta">{dueLabel(r.due).text}</span>}</span>
      <span className="rgm-cell">
        {risky && (
          <span className="rgm-risk">
            <Pill tone={r.risk === 'Overdue' ? 'overdue' : 'due-soon'}>{r.risk}</Pill>
            {total - approved} of {total} reviewers outstanding
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
  const [showAllQueue, setShowAllQueue] = useState(false);

  useEffect(() => {
    if (!menu) return undefined;
    const close = e => { if (!e.target.closest('.rgm-actions')) setMenu(null); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menu]);

  const match = r => type === 'All' || r.type === type;
  const queue = useMemo(() => AWAITING.filter(match).sort(byDue), [type]);
  const review = useMemo(() => IN_REVIEW.filter(match).sort(byDue), [type]);
  const QUEUE_SHOWN = 5; // keeps the dashboard on one screen; the rest sit behind "Show more"
  const shownQueue = showAllQueue ? queue : queue.slice(0, QUEUE_SHOWN);
  const shownReview = showAll ? review : review.slice(0, 6);

  const weekEnd = new Date(TODAY); weekEnd.setDate(TODAY.getDate() + (7 - TODAY.getDay()) % 7);
  const dueThisWeek = [...AWAITING, ...IN_REVIEW].filter(r => daysFrom(r.due) >= 0 && r.due <= weekEnd).length;
  const overdue = IN_REVIEW.filter(r => r.risk === 'Overdue').length;

  // SegmentedToggle options are plain strings: label each type with its count.
  const label = t => t + ' (' + AWAITING.filter(r => t === 'All' || r.type === t).length + ')';
  const fromLabel = l => TYPES.find(t => label(t) === l) || 'All';

  const toggleFlag = id => setOpenFlags(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Shell>
      <main className="rgm-page">
        <PageHeader title={'Good morning, ' + COORDINATOR.first} description={'Clearance queue · ' + fmtLong(TODAY)} />

        <div className="rgm-stats">
          <StatCard label="Awaiting Validation" value={String(AWAITING.length)} tone="info" icon="inbox" />
          <StatCard label="Due This Week" value={String(dueThisWeek)} tone="warning" icon="schedule" />
          <StatCard label="Overdue Reviews" value={String(overdue)} tone="fatal" icon="error" />
          <StatCard label="In Review" value={String(IN_REVIEW.length)} tone="positive" icon="rate_review" />
        </div>

        <Panel
          icon="inbox"
          title="Awaiting your validation"
          count={queue.length}
          description="Sorted by due date, soonest first. Expedited requests are marked but don't move up the queue."
          actions={(
            <>
              <SegmentedToggle options={TYPES.map(label)} value={label(type)} onChange={l => setType(fromLabel(l))} aria-label="Quick filters by submission type" />
              <Button variant="ghost" icon="tune">Edit Filters</Button>
            </>
          )}
        >
          <DataTable columns={QUEUE_COLS} headerTone="knowledge" style={{ overflow: 'visible' }}>
            {shownQueue.map(r => (
              <QueueRow
                key={r.id}
                r={r}
                open={openFlags.has(r.id)}
                onToggle={() => toggleFlag(r.id)}
                menuOpen={menu === r.id}
                onMenu={() => setMenu(m => (m === r.id ? null : r.id))}
              />
            ))}
            {queue.length > QUEUE_SHOWN && (
              <div className="rgm-more">
                <button type="button" className="rgm-linkbtn" onClick={() => setShowAllQueue(v => !v)}>{showAllQueue ? 'Show fewer' : 'Show ' + (queue.length - QUEUE_SHOWN) + ' more'}</button>
              </div>
            )}
          </DataTable>
        </Panel>

        <Panel
          className="rgm-quiet"
          icon="rate_review"
          iconColor="var(--blue-chip)"
          title="In review"
          count={review.length}
          description="Sorted by due date. Only records at risk are highlighted."
          actions={<button type="button" className="rgm-linkbtn" aria-expanded={reviewOpen} onClick={() => setReviewOpen(o => !o)}>{reviewOpen ? 'Collapse' : 'Expand'}</button>}
        >
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
        </Panel>
      </main>
    </Shell>
  );
}
