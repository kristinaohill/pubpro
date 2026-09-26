import React from 'react';
import { Button } from '../ds/pubpro';
import { AUTHOR_META, CONFERENCE_DIRECTORY, TODAY_STR, parseDate } from './publication-form/data';
import { openRoundOf } from './publication-form/state';

/*
 * The lower row of the Publication Manager Dashboard: author blockers, congress deadlines and
 * reviews in progress, all worked out from saved publications (list rows with their data).
 */

const DAY = 86400000;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysUntil = str => { const d = parseDate(str); return d ? Math.round((d - startOfToday()) / DAY) : null; };
const daysSince = str => { const n = daysUntil(str); return n == null ? null : -n; };
const rel = n => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : n === -1 ? '1 day ago' : n < 0 ? `${-n} days ago` : `in ${n} days`);
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');

const Sym = ({ name, color }) => (
  <span className="material-symbols-outlined wdp-glyph" style={{ color }} aria-hidden="true">{name}</span>
);
const RED = 'var(--fatal-text)';
const AMBER = 'var(--warn-text)';

function PubLink({ p, onOpen }) {
  return <a href={'/publication/' + p.id} onClick={e => { e.preventDefault(); onOpen(); }}>{p.record_id}</a>;
}

function Panel({ icon, title, count, children }) {
  return (
    <section className="wd-card wd-side-card wdp-panel">
      <div className="wd-side-head">
        <span className="material-symbols-outlined wd-side-icon" aria-hidden="true">{icon}</span>
        <h2 className="wd-side-title">{title}</h2>
        {count != null && <span className="wd-count wdp-count">{count}</span>}
      </div>
      {children}
    </section>
  );
}

const MAX_ROWS = 8;
const More = ({ n }) => (n > 0 ? <div className="wd-meta wdp-more">+ {n} more</div> : null);

/* ---------- Author blockers ---------- */

/** Problems with invited authors: no reply, declined, agreement or COI missing/expired. */
export function authorBlockers(pubs) {
  const out = [];
  pubs.forEach(p => {
    const d = p.data || {};
    const people = (d.internal || []).map(a => ({ a, ext: false })).concat((d.external || []).map(a => ({ a, ext: true })));
    people.filter(({ a }) => a.selected !== false && a.invite && a.invite.status && a.invite.status !== 'none').forEach(({ a, ext }) => {
      const person = ext ? String(a.name || '').split('-')[0] : a.name;
      const shown = a.display || person;
      const add = (issue, detail, severity) => out.push({ key: p.id + person + issue, p, person: shown, issue, detail, severity });
      const iv = a.invite;
      if (iv.status === 'declined') add('Declined authorship', 'Replace or remove them on the Authors tab.', 2);
      if (iv.status === 'sent') {
        const n = daysSince(iv.sent);
        add('No reply to invitation', 'Invited ' + (iv.sent || '—') + (n != null ? ' (' + rel(-n) + ')' : ''), n != null && n > 7 ? 2 : 1);
      }
      const signedAge = a.agreementDate ? daysSince(a.agreementDate) : null;
      if (!a.agreementDate) add('No signed author agreement', 'Needed before submission.', 1);
      else if (signedAge > 365) add('Author agreement expired', 'Signed ' + a.agreementDate + ' (over 365 days ago).', 2);
      const meta = { ...(AUTHOR_META[person] || {}), ...((d.authorMetaEdits || {})[person] || {}) };
      const coiAge = meta.coi ? daysSince(meta.coi) : null;
      if (!meta.coi) add('No COI disclosure on file', 'Needed before submission.', 1);
      else if (coiAge > 365) add('COI disclosure expired', 'Submitted ' + meta.coi + ' (over 365 days ago).', 2);
    });
  });
  return out.sort((x, y) => y.severity - x.severity || x.person.localeCompare(y.person));
}

export function AuthorBlockersPanel({ pubs, onOpen }) {
  const items = authorBlockers(pubs);
  return (
    <Panel icon="person_alert" title="Author Blockers" count={items.length ? plural(items.length, 'issue') : null}>
      {items.length === 0 ? (
        <div className="empty-state">No author issues. Invited authors have replied and their agreements and COIs are current.</div>
      ) : (
        <div className="wdp-list">
          {items.slice(0, MAX_ROWS).map(b => (
            <div key={b.key} className="wdp-row">
              <Sym name={b.severity > 1 ? 'error' : 'schedule'} color={b.severity > 1 ? RED : AMBER} />
              <div className="wdp-main">
                <div className="wd-strong">{b.person} · {b.issue}</div>
                <div className="wd-meta">{b.detail} <PubLink p={b.p} onOpen={() => onOpen(b.p, 'authors')} /></div>
              </div>
            </div>
          ))}
          <More n={items.length - MAX_ROWS} />
        </div>
      )}
    </Panel>
  );
}

/* ---------- Congress deadlines ---------- */

/** Abstract close dates for congresses on your shortlists, soonest first (and up to a week past). */
export function congressDeadlines(pubs) {
  const by = {};
  pubs.forEach(p => ((p.data && p.data.targets) || []).forEach((name, i) => {
    const c = CONFERENCE_DIRECTORY.find(x => x.name === name && x.kind === 'Congress');
    if (!c || !c.close) return;
    (by[name] = by[name] || { c, pubs: [] }).pubs.push({ p, primary: i === 0 });
  }));
  return Object.values(by)
    .map(({ c, pubs: list }) => ({ c, pubs: list, n: daysUntil(c.close) }))
    .filter(x => x.n != null && x.n >= -7)
    .sort((a, b) => a.n - b.n);
}

export function CongressDeadlinesPanel({ pubs, onOpen }) {
  const items = congressDeadlines(pubs);
  return (
    <Panel icon="event" title="Congress Deadlines" count={items.length ? plural(items.length, 'congress', 'congresses') : null}>
      {items.length === 0 ? (
        <div className="empty-state">No upcoming abstract deadlines. Add congresses to a publication&rsquo;s shortlist on its Target tab.</div>
      ) : (
        <div className="wdp-list">
          {items.slice(0, MAX_ROWS).map(({ c, pubs: list, n }) => (
            <div key={c.name} className="wdp-row">
              <Sym name={n < 0 ? 'event_busy' : c.prevClose ? 'warning' : 'event'} color={n < 0 || n <= 14 ? RED : c.prevClose ? AMBER : 'var(--high-emphasis)'} />
              <div className="wdp-main">
                <div className="wd-strong">{c.abbr || c.name} · abstracts close {c.close}</div>
                <div className="wd-meta">
                  {n < 0 ? 'Closed ' + rel(n) : 'Closes ' + rel(n)}
                  {c.lateBreaker ? ' · late breakers ' + c.lateBreaker : ''}
                </div>
                {c.prevClose && <div className="wdp-warn">Moved earlier from {c.prevClose}{c.closeChanged ? ' (changed ' + c.closeChanged + ')' : ''}</div>}
                <div className="wd-meta wdp-pubs">
                  {list.map(({ p, primary }, i) => (
                    <span key={p.id}>{i > 0 && ', '}<PubLink p={p} onOpen={() => onOpen(p, 'details')} /> {primary ? '(primary)' : '(alternate)'}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <More n={items.length - MAX_ROWS} />
        </div>
      )}
    </Panel>
  );
}

/* ---------- Reviews in progress ---------- */

/** Open review rounds with who has and hasn't responded. */
export function reviewsInProgress(pubs) {
  return pubs.map(p => {
    const round = openRoundOf(p.data || {});
    if (!round) return null;
    const reviewers = round.reviewers || [];
    const waiting = reviewers.filter(v => !v.decision || v.decision === 'pending');
    return {
      p, round, reviewers, waiting,
      remindable: waiting.filter(v => !v.ooo && v.remindedOn !== TODAY_STR),
      n: round.due ? daysUntil(round.due) : null,
    };
  }).filter(Boolean).sort((a, b) => (a.n == null ? 1e9 : a.n) - (b.n == null ? 1e9 : b.n));
}

export function ReviewsPanel({ pubs, onOpen, onRemind, busyId }) {
  const items = reviewsInProgress(pubs);
  return (
    <Panel icon="rate_review" title="Reviews in Progress" count={items.length ? plural(items.length, 'round') : null}>
      {items.length === 0 ? (
        <div className="empty-state">No review rounds are out. Start one from a publication&rsquo;s Reviews tab.</div>
      ) : (
        <div className="wdp-list">
          {items.slice(0, MAX_ROWS).map(r => {
            const answered = r.reviewers.length - r.waiting.length;
            const overdue = r.n != null && r.n < 0;
            return (
              <div key={r.p.id} className="wdp-row">
                <Sym name={overdue ? 'error' : 'forum'} color={overdue ? RED : 'var(--high-emphasis)'} />
                <div className="wdp-main">
                  <div className="wd-strong">Round {r.round.num} · {r.round.type}</div>
                  <div className="wd-meta">
                    <PubLink p={r.p} onOpen={() => onOpen(r.p, 'reviewers')} />
                    {r.round.due ? ' · due ' + r.round.due + ' (' + rel(r.n) + ')' : ''}
                  </div>
                  <div className="wd-meta">
                    {answered} of {r.reviewers.length} responded
                    {r.waiting.length > 0 && ' · waiting on ' + r.waiting.map(v => v.name + (v.ooo ? ' (out of office)' : '')).join(', ')}
                  </div>
                  {r.waiting.length > 0 && (
                    <div className="wdp-actions">
                      <Button
                        variant="secondary"
                        disabled={!r.remindable.length || busyId === r.p.id}
                        onClick={() => onRemind(r.p, r.remindable.map(v => v.name))}
                      >
                        {busyId === r.p.id ? 'Sending…' : r.remindable.length ? 'Remind ' + plural(r.remindable.length, 'reviewer') : 'Reminded today'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <More n={items.length - MAX_ROWS} />
        </div>
      )}
    </Panel>
  );
}
