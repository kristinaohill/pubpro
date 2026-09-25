import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, DataTable, Pill, SegmentedToggle, StatCard } from '../ds/pubpro';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import './WriterDashboard.css';

// Designer Tweak (Regional): "US (M/D/YYYY)" or "International (D/M/YYYY)".
const DATE_FORMAT = 'US (M/D/YYYY)';

const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = isoOf(new Date());
// Monday of the current week.
const WEEK_START = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoOf(d); })();

const FILTERS = ['All', 'Due in 7 Days', 'Overdue', 'Waiting on Others'];

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
    id: p.record_id, savedId: p.id, type: p.pub_type, title: p.title,
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

function PubRow({ r, onOpen }) {
  const withYou = r.p.kind === 'you';
  const total = r.p.people.length;
  const progressLabel = withYou ? 'With you' : `${r.done} of ${total} ${r.p.unit}`;
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
  // Saved records open by id; the design's sample rows open the sample publication.
  const { user } = useAuth();
  const openPublication = (p, tab) => navigate('/publication/' + p.savedId, { state: { tab } });
  const [saved, setSaved] = useState([]);
  useEffect(() => {
    api.get('/pp-publications')
      .then(list => setSaved(list.filter(p => p.status !== 'Cancelled').map(fromSaved).filter(p => p.steps.some(x => x.current))))
      .catch(() => setSaved([]));
  }, []);

  const [filter, setFilter] = useState('All');
  const [weeklyEmail, setWeeklyEmail] = useState(true);


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
    { label: 'Active Publications', value: model.length, icon: 'library_books' },
    { label: 'Steps Due in Next 7 Days', value: model.filter(x => x.n >= 0 && x.n <= 7).length, icon: 'schedule', tone: 'info' },
    { label: 'Overdue Steps', value: model.filter(x => x.n < 0).length, icon: 'error', tone: 'fatal' },
    { label: 'Awaiting Responses', value: outstandingAll.length, icon: 'group', tone: 'warning' },
  ];

  return (
    <div className="wd-page">
      <div className="wd-header">
        <div className="wd-header-text">
          <h1 className="wd-title">Writer Dashboard</h1>
          <div className="wd-lede">Publications where you are the assigned writer · {(user && user.name) || '—'} · Week of {fmt(WEEK_START)}</div>
        </div>
        <div className="wd-header-aside">
          <Checkbox
            checked={weeklyEmail}
            onChange={() => setWeeklyEmail(v => !v)}
            label="Email me a status summary of all my publications every Friday"
          />
        </div>
      </div>

      <div className="wd-stats">
        {stats.map(s => (
          <StatCard key={s.label} label={s.label} value={String(s.value)} icon={s.icon} tone={s.tone} />
        ))}
      </div>

      <div className="wd-columns">
        <section className="wd-card wd-main">
          <div className="wd-main-head">
            <span className="wd-badge"><Sym name="edit_note" className="wd-badge-icon" /></span>
            <h2 className="wd-main-title">My Publications</h2>
            <div className="wd-main-tools">
              <div className="wd-count">{rows.length} {rows.length === 1 ? 'publication' : 'publications'}</div>
              <SegmentedToggle options={FILTERS} value={filter} onChange={setFilter} />
            </div>
          </div>

          <div className="wd-table-scroll">
            <div className="wd-table-inner">
              <DataTable columns={PUB_COLS} headerTone="knowledge">
                {rows.map(r => <PubRow key={r.p.id} r={r} onOpen={() => openPublication(r.p)} />)}
              </DataTable>
            </div>
          </div>
          {rows.length === 0 && (
            <div className="wd-empty">{model.length ? `No publications match "${filter}".` : 'No publications yet. Create one from Create New › Publication.'}</div>
          )}
        </section>

        <div className="wd-side">
          <section className="wd-card wd-side-card">
            <div className="wd-side-head wd-side-head--attn">
              <Sym name="priority_high" className="wd-side-icon" />
              <h2 className="wd-side-title">Needs Attention</h2>
            </div>
            <div className="wd-attn-list">
              {attention.map(a => <AttentionCard key={a.key} a={a} />)}
              {attention.length === 0 && <div className="wd-empty">Nothing needs attention right now.</div>}
            </div>
          </section>

          <section className="wd-card wd-side-card">
            <div className="wd-side-head">
              <Sym name="calendar_month" className="wd-side-icon" />
              <h2 className="wd-side-title">Upcoming Deadlines</h2>
            </div>
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
          </section>
        </div>
      </div>
    </div>
  );
}
