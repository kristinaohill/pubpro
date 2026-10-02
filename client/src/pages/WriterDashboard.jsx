import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, DataTable, Pill, SegmentedToggle, StatCard } from '../ds/pubpro';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import PageHeader from '../components/PageHeader';
import ScopeFocusBar, { useScopeFocus } from '../components/ScopeFocus';
import Flash from '../components/Flash';
import { TODAY_STR } from './publication-form/data';
import { auditEntry, fromSavedData, openRoundOf, statusOf, summarize, titleOf, toSavedData } from './publication-form/state';
import { AuthorBlockersPanel, CongressDeadlinesPanel, ReviewsPanel } from './WriterDashboardPanels';
import './WriterDashboard.css';

// Designer Tweak (Regional): "US (M/D/YYYY)" or "International (D/M/YYYY)".
const DATE_FORMAT = 'US (M/D/YYYY)';

const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = isoOf(new Date());
// Monday of the current week.
const WEEK_START = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoOf(d); })();

const FILTERS = ['All', 'Due in 7 Days', 'Overdue', 'Waiting on Others'];
// Whose publications the whole page shows: the ones you own, or every one your products cover.
const SCOPES = ['My Publications', 'All Publications'];
const SCOPE_KEY = 'pubpro.pmDashboardScope';
const readScope = () => { try { return localStorage.getItem(SCOPE_KEY) === 'all' ? 'all' : 'mine'; } catch (e) { return 'mine'; } };
const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const firstName = n => String(n || '').trim().split(/\s+/)[0];

const PUB_COLS = [
  { header: 'Publication', width: 'minmax(220px,2fr)' },
  { header: 'Current Step', width: 'minmax(150px,1.2fr)' },
  { header: 'Step Due', width: '130px' },
  { header: 'Step Status', width: 'minmax(140px,1fr)' },
  { header: 'Next Step', width: 'minmax(140px,1fr)' },
  { header: '', width: '28px' },
];
const ROW_TEMPLATE = PUB_COLS.map(c => c.width).join(' ');

const BUCKETS = ['OVERDUE', 'THIS WEEK', 'NEXT WEEK', 'LATER'];


// Date helpers
const toDate = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const dayDiff = iso => Math.round((toDate(iso) - toDate(TODAY)) / 86400000);
const fmt = iso => {
  if (!iso || iso === '—') return '—';
  const d = toDate(iso);
  return DATE_FORMAT !== 'US (M/D/YYYY)'
    ? `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
    : `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};
const rel = n => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? '1 day overdue' : n < 0 ? `${-n} days overdue` : `In ${n} days`);
const bucket = iso => { const n = dayDiff(iso); return n < 0 ? 'OVERDUE' : n <= 3 ? 'THIS WEEK' : n <= 10 ? 'NEXT WEEK' : 'LATER'; };
const lastName = name => name.split(' ').slice(-1)[0];

const Sym = ({ name, className = '', style }) => (
  <span className={`material-symbols-outlined ${className}`} style={style} aria-hidden="true">{name}</span>
);

/** A saved record from the server, in the shape the rows below use. */
const fromSaved = p => {
  const sm = p.summary || {};
  const people = sm.people || [];
  return {
    id: p.record_id, savedId: p.id, type: p.pub_type, title: p.title, owner: p.owner || '',
    kind: people.length ? 'reviewers' : 'you', unit: 'reviewers',
    steps: sm.steps || [], people,
  };
};

function PubLink({ id, onOpen }) {
  return (
    <a
      href="/publication"
      onClick={e => { e.preventDefault(); e.stopPropagation(); onOpen(); }}
    >
      {id}
    </a>
  );
}

function PubRow({ r, onOpen, showOwner, me }) {
  const withYou = r.p.kind === 'you';
  const yours = !showOwner || sameName(r.p.owner, me);
  const total = r.p.people.length;
  const progressLabel = withYou ? (yours ? 'With you' : 'With ' + (firstName(r.p.owner) || 'the owner')) : `${r.done} of ${total} ${r.p.unit}`;
  const progressPct = withYou ? '0%' : `${Math.round((r.done / total) * 100)}%`;
  const progressNote = withYou
    ? 'No responses needed'
    : r.outstanding.length ? `Waiting on ${r.outstanding.map(m => lastName(m.name)).join(', ')}` : 'All responses in';
  const dueTone = r.n < 0 ? 'overdue' : r.n <= 7 ? 'due-soon' : 'on-track';

  return (
    <div className="wd-row" style={{ gridTemplateColumns: ROW_TEMPLATE }} onClick={onOpen}>
      <div className="wd-cell">
        <div className="wd-pub-id">
          <PubLink id={r.p.id} onOpen={onOpen} />
          <span className="wd-meta">{r.p.type}</span>
        </div>
        <div className="wd-pub-title">{r.p.title}</div>
        {showOwner && <div className="wd-meta wd-gap-2">Owner: {r.p.owner ? (yours ? r.p.owner + ' (you)' : r.p.owner) : 'Not set'}</div>}
      </div>
      <div className="wd-cell">
        <div className="wd-step-name">{r.cur.name}</div>
        <div className="wd-meta wd-gap-2">Step {r.idx + 1} of {r.p.steps.length}</div>
      </div>
      <div className="wd-due">
        <Pill tone={dueTone}>{rel(r.n)}</Pill>
        <div className="wd-meta">{fmt(r.due)}</div>
      </div>
      <div className="wd-cell">
        <div className="wd-strong">{progressLabel}</div>
        <div className="wd-bar"><div className="wd-bar-fill" style={{ width: progressPct }} /></div>
        <div className="wd-meta wd-gap-3">{progressNote}</div>
      </div>
      <div className="wd-cell">
        <div>{r.next ? r.next.name : '—'}</div>
        <div className="wd-meta wd-gap-2">Planned {r.next ? fmt(r.next.d) : '—'}</div>
      </div>
      <Sym name="chevron_right" className="wd-chevron" />
    </div>
  );
}

function AttentionCard({ a }) {
  return (
    <div className="wd-attn">
      <div className="wd-attn-head">
        <Sym name={a.glyph} className="wd-attn-glyph" style={{ color: a.glyphColor }} />
        <div className="wd-eyebrow">{a.kind}</div>
      </div>
      <div className="wd-attn-title">{a.title}</div>
      <div className="wd-attn-body">{a.body}</div>
      {a.hasDone && (
        <div className="wd-attn-done"><Sym name="check" className="wd-attn-done-icon" />{a.doneLabel}</div>
      )}
      {a.showActions && (
        <div className="wd-attn-actions">
          <Button variant="secondary" onClick={a.onPrimary}>{a.primaryLabel}</Button>
          {a.secondaryLabel && <Button variant="tertiary" onClick={a.onSecondary}>{a.secondaryLabel}</Button>}
        </div>
      )}
    </div>
  );
}

export default function WriterDashboard() {
  const navigate = useNavigate();
  // Save & Close on a publication, plan, author or profile lands here with a confirmation.
  const savedNotice = (useLocation().state || {}).savedNotice;
  // Saved records open by id; the design's sample rows open the sample publication.
  const { user, can } = useAuth();
  const openPublication = (p, tab) => navigate('/publication/' + p.savedId, { state: { tab } });
  const [savedAll, setSaved] = useState([]);
  // Live (not cancelled) records with their data, for the author, congress and review panels.
  const [liveAll, setLive] = useState([]);
  // The server only sends what this person's roles cover.
  const focus = useScopeFocus();
  // My Publications / All Publications switches everything on the page.
  const [scope, setScopeState] = useState(readScope);
  const setScope = v => { const k = v === 'All Publications' ? 'all' : 'mine'; setScopeState(k); try { localStorage.setItem(SCOPE_KEY, k); } catch (e) { /* not saved */ } };
  const me = (user && user.name) || '';
  const live = scope === 'all' ? liveAll : liveAll.filter(p => sameName(p.owner, me));
  const othersCount = liveAll.length - live.length;
  const inFocus = new Set(live.map(p => p.id));
  const saved = savedAll.filter(p => inFocus.has(p.savedId));
  const [message, setMessage] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const load = () => api.get('/pp-publications?include=data')
    .then(list => {
      const open = list.filter(p => p.status !== 'Cancelled');
      setLive(open);
      setSaved(open.map(fromSaved).filter(p => p.steps.some(x => x.current)));
    })
    .catch(() => { setSaved([]); setLive([]); });
  useEffect(() => { load(); }, []);

  const openRecord = (p, tab) => navigate('/publication/' + p.id, { state: { tab } });

  /** The Reviews tab's reminder, run from here: marks them reminded, logs it and notifies them in PubPro. */
  const remind = async (p, names) => {
    setBusyId(p.id);
    setMessage(null);
    try {
      const st = fromSavedData(p.data);
      const next = {
        ...st,
        rounds: st.rounds.map(r => (r.status === 'open'
          ? { ...r, reviewers: r.reviewers.map(v => (names.includes(v.name) ? { ...v, remindedOn: TODAY_STR } : v)) }
          : r)),
        audit: (st.audit || []).concat([auditEntry('Reminder Sent', { participants: names.join('\n'), comment: 'Sent by ' + ((user && user.name) || 'PubPro') + ' from the Publication Manager Dashboard' })]),
      };
      await api.put('/pp-publications/' + p.id, {
        title: titleOf(next) || p.title, pub_type: p.pub_type, product: next.product || p.product || null,
        status: statusOf(next), summary: summarize(next), data: toSavedData(next),
      });
      const round = openRoundOf(next);
      await api.post('/notifications', { notifications: names.map(name => ({
        recipient: name, kind: 'reminder', tab: 'reviewers', pub_id: p.id, record_id: p.record_id,
        title: 'Reminder: ' + (round ? round.type : 'review') + ' response ' + (round && round.due ? 'due ' + round.due : 'requested'),
        body: p.title + ' (' + p.record_id + ')',
      })) }).catch(() => {});
      await load();
      setMessage({ kind: 'info', text: (names.length === 1 ? 'Reminder sent to ' + names[0] : names.length + ' reminders sent') + ' for ' + p.record_id + '.' });
    } catch (err) {
      setMessage({ kind: 'error', text: 'Could not send the reminder: ' + err.message });
    } finally {
      setBusyId(null);
    }
  };

  const [filter, setFilter] = useState('All');


  const model = saved.map(p => {
    const idx = p.steps.findIndex(s => s.current);
    const cur = p.steps[idx];
    const due = cur.d;
    return {
      p, idx, cur, due,
      n: dayDiff(due),
      next: p.steps[idx + 1],
      done: p.people.filter(m => m.status === 'done').length,
      outstanding: p.people.filter(m => m.status !== 'done'),
    };
  });

  const rows = model.filter(x =>
    filter === 'All' ||
    (filter === 'Due in 7 Days' && x.n >= 0 && x.n <= 7) ||
    (filter === 'Overdue' && x.n < 0) ||
    (filter === 'Waiting on Others' && x.outstanding.length > 0));

  const outstandingAll = model.flatMap(x => x.outstanding.map(m => ({ m, id: x.p.id })));

  // Needs Attention
  const attention = [];
  model.forEach(x => x.p.people.filter(m => m.status === 'ooo').forEach(m => attention.push({
    key: 'ooo-' + x.p.id + m.name,
    kind: 'OUT OF OFFICE', glyph: 'event_busy', glyphColor: 'var(--warn-text)',
    title: m.name + ' — out of office',
    body: `Blocks ${x.cur.name} on ${x.p.id} (due ${fmt(x.due)}). Decide whether to proceed without them or extend the review.`,
    primaryLabel: 'Open Reviews', onPrimary: () => openPublication(x.p, 'reviewers'), showActions: true,
  })));
  const pendingBy = {};
  model.forEach(x => x.p.people.filter(m => m.status === 'pending').forEach(m => { (pendingBy[m.name] = pendingBy[m.name] || []).push(x.p); }));
  Object.keys(pendingBy).filter(name => pendingBy[name].length > 1).forEach(name => {
    const pubs = pendingBy[name];
    attention.push({
      key: 'late-' + name,
      kind: 'REPEAT NON-RESPONDER', glyph: 'person_alert', glyphColor: 'var(--fatal-text)',
      title: `${name} — outstanding on ${pubs.length} publications`,
      body: pubs.map(p => p.id).join(', ') + '. Send reminders from each publication\'s Reviews tab.',
      primaryLabel: 'Open ' + pubs[0].id, onPrimary: () => openPublication(pubs[0], 'reviewers'), showActions: true,
    });
  });

  // Upcoming Deadlines: each publication's current step plus any open external deadline.
  const events = model.flatMap(x => {
    const ev = [{ iso: x.due, label: x.cur.name, pubId: x.p.id, pub: x.p, owner: x.p.kind === 'you' ? 'You' : `${x.done} of ${x.p.people.length} ${x.p.unit}` }];
    x.p.steps.filter(s => s.external && !s.done).forEach(s => ev.push({ iso: s.d, label: s.external, pubId: x.p.id, pub: x.p, owner: 'External deadline' }));
    return ev;
  }).sort((a, b) => a.iso.localeCompare(b.iso));
  const deadlineGroups = BUCKETS
    .map(label => ({ label, items: events.filter(e => bucket(e.iso) === label) }))
    .filter(g => g.items.length);

  const stats = [
    { label: 'Active Publications', value: model.length, icon: 'library_books', tone: 'positive' },
    { label: 'Steps Due in Next 7 Days', value: model.filter(x => x.n >= 0 && x.n <= 7).length, icon: 'schedule', tone: 'info' },
    { label: 'Overdue Steps', value: model.filter(x => x.n < 0).length, icon: 'error', tone: 'fatal' },
    { label: 'Awaiting Responses', value: outstandingAll.length, icon: 'group', tone: 'warning' },
  ];

  return (
    <div className="wd-page">
      <PageHeader
        title="Publication Manager Dashboard"
        description={scope === 'all'
          ? <>Every publication on your products · {me || '—'} · Week of {fmt(WEEK_START)}</>
          : <>Publications you own · {me || '—'} · Week of {fmt(WEEK_START)}</>}
        actions={<SegmentedToggle options={SCOPES} value={scope === 'all' ? 'All Publications' : 'My Publications'} onChange={setScope} />}
      />
      <ScopeFocusBar focus={focus} />

      {savedNotice && <Flash watch={savedNotice}>{savedNotice}</Flash>}
      {message && <Flash kind={message.kind} watch={message}>{message.text}</Flash>}

      <div className="wd-stats">
        {stats.map(s => (
          <StatCard key={s.label} label={s.label} value={String(s.value)} icon={s.icon} tone={s.tone} />
        ))}
      </div>

      {/* One three-column grid: My Publications spans two columns with the side panels in the third,
          and the lower panels sit under those same columns. Each row is one height. */}
      <div className="wd-grid">
        <section className="wd-card wd-main">
          <div className="wd-side-head wd-main-head">
            <Sym name="edit_note" className="wd-side-icon" />
            <h2 className="wd-side-title">{scope === 'all' ? 'All Publications' : 'My Publications'}</h2>
            <div className="wd-main-tools">
              <div className="wd-count">{rows.length} {rows.length === 1 ? 'publication' : 'publications'}</div>
              <SegmentedToggle options={FILTERS} value={filter} onChange={setFilter} />
            </div>
          </div>

          <div className="wd-table-scroll">
            <div className="wd-table-inner">
              <DataTable columns={PUB_COLS} headerTone="knowledge">
                {rows.map(r => <PubRow key={r.p.id} r={r} showOwner={scope === 'all'} me={me} onOpen={() => openPublication(r.p)} />)}
              </DataTable>
            </div>
          </div>
          {rows.length === 0 && (
            <div className="empty-state">
              {model.length ? `No publications match "${filter}".`
                : scope === 'mine' && othersCount > 0 ? <>You don&rsquo;t own any open publications. <button type="button" className="wd-link-btn" onClick={() => setScope('All Publications')}>Show all {othersCount} on your products</button>.</>
                  : 'No publications yet. Create one from Create New › Publication.'}
            </div>
          )}
        </section>

        <div className="wd-side">
          <section className={'wd-card wd-side-card' + (attention.length ? '' : ' wd-side-card--quiet')}>
            <div className="wd-side-head">
              <Sym name={attention.length ? 'priority_high' : 'check_circle'} className="wd-side-icon" />
              <h2 className="wd-side-title">Needs Attention</h2>
              {attention.length > 0 ? <span className="wd-count wdp-count">{attention.length}</span> : <span className="wd-meta wdp-count">Nothing right now</span>}
            </div>
            {attention.length > 0 && (
              <div className="wd-attn-list wd-scroll">
                {attention.map(a => <AttentionCard key={a.key} a={a} />)}
              </div>
            )}
          </section>

          <section className="wd-card wd-side-card wd-side-card--fill">
            <div className="wd-side-head">
              <Sym name="calendar_month" className="wd-side-icon" />
              <h2 className="wd-side-title">Upcoming Deadlines</h2>
            </div>
            <div className="wd-scroll">
            {deadlineGroups.length === 0 && <div className="empty-state">No deadlines coming up.</div>}
            {deadlineGroups.map(g => (
              <div key={g.label} className="wd-dl-group">
                <div className="wd-eyebrow wd-dl-label">{g.label}</div>
                {g.items.map(e => {
                  const n = dayDiff(e.iso);
                  return (
                    <div key={`${e.pubId}-${e.label}`} className="wd-dl-row">
                      <div>
                        <div className={`wd-dl-date${n < 0 ? ' wd-dl-date--overdue' : ''}`}>{fmt(e.iso)}</div>
                        <div className="wd-meta">{rel(n)}</div>
                      </div>
                      <div className="wd-cell">
                        <div className="wd-strong">{e.label}</div>
                        <div className="wd-meta"><PubLink id={e.pubId} onOpen={() => openPublication(e.pub)} /> · {e.owner}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            </div>
          </section>
        </div>

        <AuthorBlockersPanel pubs={live} onOpen={openRecord} />
        <CongressDeadlinesPanel pubs={live} onOpen={openRecord} />
        <ReviewsPanel pubs={live} onOpen={openRecord} onRemind={can('pubs.edit') ? remind : null} busyId={busyId} />
      </div>
    </div>
  );
}
