import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, DataTable, Icon, InlineMessage, Panel, Pill, SectionHeading, Select, StatCard, TextField,
} from '../ds/pubpro';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { TODAY_STR, nowStamp, toISO } from './publication-form/data';
import {
  auditEntry, deriveSteps, fromSavedData, openRoundOf, statusOf, summarize, titleOf, toSavedData,
} from './publication-form/state';
import { fromSavedAuthor, summarizeAuthor } from './ExternalAuthorProfile';
import { STATUS_TONE } from './Publications';
import './ExternalAuthorDashboard.css';

// What an external author sees: invitations, review requests and forms waiting on them.
// Authors have no app login yet, so the page previews it for a chosen author.

const DECISIONS = [
  { value: 'approve', label: 'Approve' },
  { value: 'changes', label: 'Request changes' },
  { value: 'reject', label: 'Do not approve' },
];
const DECISION_LABEL = { approve: 'Approved', changes: 'Changes Requested', reject: 'Not Approved' };

// Publication authors are stored as "Name" (internal) or "Name-Institution" (external).
const personOf = (entry, group) => (group === 'external' ? String(entry.name).split('-')[0].trim() : String(entry.name).trim());
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const ago = s => {
  if (!s) return '';
  const t = new Date(s.replace(' ', 'T') + 'Z');
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 60) return mins < 1 ? 'just now' : mins + 'm ago';
  if (mins < 1440) return Math.round(mins / 60) + 'h ago';
  return t.toLocaleDateString('en-US');
};
const isoToUS = iso => { if (!iso) return '—'; const [y, m, d] = iso.split('-').map(Number); return `${m}/${d}/${y}`; };

/** Everything waiting on `person` across saved publications and their author profile. */
function workFor(person, pubs, profile) {
  const invitations = [];
  const reviews = [];
  const mine = [];
  pubs.forEach(p => {
    if (p.status === 'Cancelled') return;
    const st = p.data || {};
    const entries = (st.internal || []).map(e => ({ e, group: 'internal' })).concat((st.external || []).map(e => ({ e, group: 'external' })));
    const me = entries.find(x => same(personOf(x.e, x.group), person));
    if (me) {
      const invite = me.e.invite || { status: 'none' };
      if (invite.status === 'sent') invitations.push({ p, entry: me, invite });
      mine.push({ p, role: me.group === 'external' ? 'External Author' : 'Internal Author', invite: invite.status });
    }
    const round = openRoundOf(st);
    const r = round && round.reviewers.find(v => same(v.name, person));
    if (r && r.decision === 'pending') reviews.push({ p, round, reviewer: r });
  });
  const forms = profile ? profile.data.agreements.map(a => ({ kind: 'agreement', item: a })).concat(profile.data.coi.map(c => ({ kind: 'coi', item: c }))) : [];
  return { invitations, reviews, mine, forms };
}

export default function ExternalAuthorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // A signed-in external author sees only their own work; staff preview any author.
  const isAuthor = !!user && user.role === 'author';

  const [pubs, setPubs] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [person, setPerson] = useState(isAuthor ? user.name : '');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [answer, setAnswer] = useState({}); // review key -> { decision, comment }

  const load = () => Promise.all([
    api.get('/pp-publications?include=data').catch(() => []),
    api.get('/pp-authors?include=data').catch(() => []),
  ]).then(([p, a]) => { setPubs(p); setAuthors(a.map(x => ({ ...x, data: fromSavedAuthor(x.data) }))); setLoaded(true); });
  useEffect(() => { load(); }, []);

  // Anyone with a profile or listed as an external author on a publication.
  const people = [...new Set(
    authors.map(a => a.name).concat(pubs.flatMap(p => ((p.data && p.data.external) || []).map(e => personOf(e, 'external')))),
  )].filter(Boolean).sort((a, b) => a.localeCompare(b));

  // Default to the first person with something waiting.
  useEffect(() => {
    if (person || !loaded || !people.length) return;
    const busyFirst = people.find(n => {
      const w = workFor(n, pubs, authors.find(a => same(a.name, n)));
      return w.invitations.length + w.reviews.length + w.forms.length > 0;
    });
    setPerson(busyFirst || people[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const loadInbox = name => api.get(isAuthor ? '/notifications?box=inbox' : '/notifications/for?name=' + encodeURIComponent(name)).then(setInbox).catch(() => setInbox([]));
  useEffect(() => { if (person) loadInbox(person); }, [person]);

  const profile = authors.find(a => same(a.name, person));
  const work = person ? workFor(person, pubs, profile) : { invitations: [], reviews: [], mine: [], forms: [] };
  const unread = inbox.filter(n => !n.read_at).length;

  const notify = list => (list.length ? api.post('/notifications', { notifications: list }).catch(() => {}) : Promise.resolve());

  /** Applies `mutate` to a saved publication and saves it. */
  const savePub = async (p, mutate) => {
    const next = mutate(fromSavedData(p.data));
    await api.put('/pp-publications/' + p.id, {
      title: titleOf(next) || p.title, pub_type: p.pub_type, product: next.product || p.product || null,
      status: statusOf(next), summary: summarize(next), data: toSavedData(next),
    });
  };

  const run = async (fn, done) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      await load();
      await loadInbox(person);
      setMessage({ kind: 'info', text: done });
    } catch (err) {
      setMessage({ kind: 'error', text: 'Could not update: ' + err.message });
    } finally {
      setBusy(false);
    }
  };

  const replyInvite = (inv, accept) => run(async () => {
    const { group } = inv.entry;
    await savePub(inv.p, st => ({
      ...st,
      [group]: st[group].map(e => (same(personOf(e, group), person) ? { ...e, invite: { ...(e.invite || {}), status: accept ? 'accepted' : 'declined', on: TODAY_STR } } : e)),
      audit: (st.audit || []).concat([auditEntry(accept ? 'Authorship Invitation Accepted' : 'Authorship Invitation Declined', { participants: person, result: accept ? 'Accepted' : 'Declined', comment: 'Replied in PubPro' })]),
    }));
    await notify(inv.p.owner ? [{
      recipient: inv.p.owner, kind: 'response', pub_id: inv.p.id, record_id: inv.p.record_id, tab: 'authors',
      title: `${person} ${accept ? 'accepted' : 'declined'} the authorship invitation`, body: `${inv.p.title} (${inv.p.record_id})`,
    }] : []);
  }, accept ? `You accepted the invitation for ${inv.p.record_id}.` : `You declined the invitation for ${inv.p.record_id}.`);

  const respond = rv => {
    const key = rv.p.id + ':' + rv.round.num;
    const a = answer[key] || {};
    if (!a.decision) return;
    run(async () => {
      await savePub(rv.p, st => ({
        ...st,
        rounds: st.rounds.map(r => (r.num === rv.round.num
          ? { ...r, reviewers: r.reviewers.map(v => (same(v.name, person) ? { ...v, decision: a.decision, comment: (a.comment || '').trim(), on: TODAY_STR, ooo: '' } : v)) }
          : r)),
        audit: (st.audit || []).concat([auditEntry(`Review Response — ${rv.round.type} (Round ${rv.round.num})`, { participants: person, result: DECISION_LABEL[a.decision], comment: (a.comment || '').trim() })]),
      }));
      await notify(rv.p.owner ? [{
        recipient: rv.p.owner, kind: 'response', pub_id: rv.p.id, record_id: rv.p.record_id, tab: 'reviewers',
        title: `${person} responded: ${DECISION_LABEL[a.decision]}`, body: `${rv.round.type} · ${rv.p.title} (${rv.p.record_id})`,
      }] : []);
      setAnswer(s => ({ ...s, [key]: undefined }));
    }, `Response sent for ${rv.p.record_id}.`);
  };

  /** Signing clears every pending request of that kind and records the signed form. */
  const signForm = kind => run(async () => {
    const d = profile.data;
    const isCoi = kind === 'coi';
    const requesters = [...new Set((isCoi ? d.coi : d.agreements).map(x => x.submittedBy).filter(Boolean))];
    const stampNow = nowStamp();
    const file = `${isCoi ? 'ConflictOfInterest' : 'AuthorshipAgreement'}-${person}-${toISO(TODAY_STR)}.pdf`;
    const next = {
      ...d,
      [isCoi ? 'coi' : 'agreements']: [],
      signedCoi: isCoi ? { file, created: stampNow, by: person, signedOn: TODAY_STR } : d.signedCoi,
      audit: d.audit.concat([{ action: isCoi ? 'COI form signed' : 'Authorship agreement signed', user: person, at: stampNow, detail: file, icon: 'task', color: 'var(--ok)' }]),
    };
    await api.put('/pp-authors/' + profile.id, { name: profile.name, email: profile.email, status: profile.status, summary: summarizeAuthor(next), data: next });
    // A signed agreement also covers the author's publications that were missing one.
    if (!isCoi) {
      for (const p of pubs) {
        const st = p.data || {};
        const needs = g => (st[g] || []).some(e => same(personOf(e, g), person) && !e.agreement);
        if (!needs('internal') && !needs('external')) continue;
        await savePub(p, s => {
          const fix = g => (s[g] || []).map(e => (same(personOf(e, g), person) && !e.agreement ? { ...e, agreement: file, agreementDate: TODAY_STR } : e));
          return { ...s, internal: fix('internal'), external: fix('external') };
        });
      }
    }
    await notify(requesters.map(r => ({ recipient: r, kind: 'response', title: `${person} signed the ${isCoi ? 'conflict of interest form' : 'authorship agreement'}`, body: file })));
  }, kind === 'coi' ? 'Conflict of interest form signed.' : 'Authorship agreement signed.');

  const openNote = async n => {
    if (!n.read_at) { await api.post(isAuthor ? `/notifications/${n.id}/read` : `/notifications/for/${n.id}/read`).catch(() => {}); loadInbox(person); }
  };

  const hasAgreement = work.forms.some(f => f.kind === 'agreement');
  const hasCoi = work.forms.some(f => f.kind === 'coi');
  const waiting = work.invitations.length + work.reviews.length + work.forms.length;

  return (
    <div className="ead-page">
      <div className="ead-head">
        <SectionHeading subtitle={isAuthor ? 'Invitations, review requests and forms waiting on you.' : person ? `What's waiting on ${person} across PubPro publications.` : 'Invitations, review requests and forms waiting on an external author.'}>
          {isAuthor ? 'Welcome, ' + person : 'External Author Dashboard'}
        </SectionHeading>
        {!isAuthor && <div className="ead-viewas">
          <span className="ead-viewas-label">Viewing as</span>
          <Select options={people} placeholder={people.length ? 'Choose an author' : 'No authors yet'} value={person} onChange={e => { setPerson(e.target.value); setMessage(null); }} width="240px" />
        </div>}
      </div>

      {!isAuthor && <InlineMessage kind="info">
        Preview of the author&rsquo;s view. External authors don&rsquo;t have PubPro logins yet, so you can act on their behalf here;
        each reply is logged on the record as coming from them and the publication owner is notified.
      </InlineMessage>}

      {message && <InlineMessage kind={message.kind}>{message.text}</InlineMessage>}

      {loaded && !people.length && (
        <div className="ead-empty-box">No external authors yet. Add authors on a publication&rsquo;s Authors tab or create an external author profile.</div>
      )}

      {person && (
        <>
          <div className="ead-stats">
            <StatCard label="Invitations to Answer" value={String(work.invitations.length)} icon="person_add" tone={work.invitations.length ? 'warning' : 'neutral'} />
            <StatCard label="Reviews Awaiting You" value={String(work.reviews.length)} icon="rate_review" tone={work.reviews.length ? 'warning' : 'neutral'} />
            <StatCard label="Forms to Sign" value={String((hasAgreement ? 1 : 0) + (hasCoi ? 1 : 0))} icon="draw" tone={work.forms.length ? 'warning' : 'neutral'} />
            <StatCard label="My Publications" value={String(work.mine.length)} icon="menu_book" tone="info" />
          </div>

          <div className="ead-columns">
            <div className="ead-main">
              <Panel icon="priority_high" title="Action Needed" count={waiting} description={waiting ? 'Reply to each item to keep your publications moving.' : undefined}>
                {waiting === 0 && <div className="ead-empty">You&rsquo;re all caught up. Nothing is waiting on you.</div>}

                {work.invitations.map(inv => (
                  <div key={'inv' + inv.p.id} className="ead-item">
                    <Icon name="person_add" size={22} color="var(--high-emphasis)" />
                    <div className="ead-item-body">
                      <div className="ead-item-kind">AUTHORSHIP INVITATION</div>
                      <div className="ead-item-title">{inv.p.title}</div>
                      <div className="ead-meta">{inv.p.record_id} · {inv.p.pub_type} · invited {inv.invite.sent || '—'} by {inv.p.owner || 'the publication team'}</div>
                    </div>
                    <div className="ead-item-actions">
                      <Button variant="secondary" icon="check" disabled={busy} onClick={() => replyInvite(inv, true)}>Accept</Button>
                      <Button variant="tertiary" disabled={busy} onClick={() => replyInvite(inv, false)}>Decline</Button>
                    </div>
                  </div>
                ))}

                {work.reviews.map(rv => {
                  const key = rv.p.id + ':' + rv.round.num;
                  const a = answer[key] || {};
                  return (
                    <div key={'rv' + key} className="ead-item ead-item--stack">
                      <div className="ead-item-row">
                        <Icon name="rate_review" size={22} color="var(--high-emphasis)" />
                        <div className="ead-item-body">
                          <div className="ead-item-kind">REVIEW REQUEST · ROUND {rv.round.num}</div>
                          <div className="ead-item-title">{rv.round.type}: {rv.p.title}</div>
                          <div className="ead-meta">{rv.p.record_id} · {rv.round.method} · sent {rv.round.sentOn}</div>
                        </div>
                        {rv.round.due && <Pill tone="due-soon">Due {rv.round.due}</Pill>}
                      </div>
                      <div className="ead-respond">
                        <Select options={DECISIONS} placeholder="Your decision" value={a.decision || ''} onChange={e => setAnswer(s => ({ ...s, [key]: { ...a, decision: e.target.value } }))} width="200px" />
                        <TextField value={a.comment || ''} onChange={e => setAnswer(s => ({ ...s, [key]: { ...a, comment: e.target.value } }))} placeholder="Comment for the team (optional)" />
                        <Button variant="secondary" icon="send" disabled={busy || !a.decision} onClick={() => respond(rv)}>Send Response</Button>
                      </div>
                    </div>
                  );
                })}

                {[['agreement', hasAgreement, 'Authorship Agreement', 'Confirms your authorship responsibilities (ICMJE accountability).'],
                  ['coi', hasCoi, 'Conflict of Interest Form', 'Annual disclosure of financial and non-financial interests.']]
                  .filter(([, has]) => has)
                  .map(([kind, , title, blurb]) => {
                    const items = work.forms.filter(f => f.kind === kind);
                    const first = items.map(f => f.item.createdOn).sort((x, y) => new Date(x) - new Date(y))[0];
                    return (
                      <div key={kind} className="ead-item">
                        <Icon name="draw" size={22} color="var(--high-emphasis)" />
                        <div className="ead-item-body">
                          <div className="ead-item-kind">FORM TO SIGN</div>
                          <div className="ead-item-title">{title}</div>
                          <div className="ead-meta">{blurb} Requested {items.length === 1 ? 'on ' + first : items.length + ' times since ' + first}.</div>
                        </div>
                        <div className="ead-item-actions">
                          <Button variant="secondary" icon="draw" disabled={busy} onClick={() => signForm(kind)}>Review &amp; Sign</Button>
                        </div>
                      </div>
                    );
                  })}
              </Panel>

              <Panel icon="menu_book" title="My Publications" count={work.mine.length}>
                <DataTable
                  headerTone="knowledge"
                  onRowClick={isAuthor ? undefined : r => navigate('/publication/' + r.id)}
                  columns={[
                    { header: 'Publication', width: 'minmax(220px,2fr)' },
                    { header: 'My Role', width: '130px' },
                    { header: 'Invitation', width: '110px' },
                    { header: 'Current Step', width: 'minmax(140px,1fr)' },
                    { header: 'Step Due', width: '100px' },
                    { header: 'Status', width: '100px' },
                  ]}
                  rows={work.mine.map(m => {
                    const sm = m.p.summary || {};
                    const steps = deriveSteps(fromSavedData(m.p.data));
                    return {
                      key: m.p.id,
                      id: m.p.id,
                      cells: [
                        <div className="ead-pub"><div className="ead-pub-id">{m.p.record_id}</div><div className="ead-pub-title">{m.p.title}</div></div>,
                        m.role,
                        <Pill tone={m.invite === 'accepted' ? 'active' : m.invite === 'declined' ? 'cancelled' : m.invite === 'sent' ? 'hold' : 'outline'}>
                          {{ accepted: 'Accepted', declined: 'Declined', sent: 'Pending', none: 'Not sent' }[m.invite] || '—'}
                        </Pill>,
                        sm.stepName || (steps.allDone ? 'Complete' : '—'),
                        isoToUS(sm.due),
                        <Pill tone={STATUS_TONE[m.p.status] || 'draft'}>{m.p.status}</Pill>,
                      ],
                    };
                  })}
                >
                  {work.mine.length === 0 ? <div className="ead-empty">Not listed as an author on any saved publication.</div> : undefined}
                </DataTable>
              </Panel>
            </div>

            <div className="ead-side">
              <Panel icon="notifications" title="My Notifications" count={unread} description={unread ? unread + ' unread' : 'Messages sent to you in PubPro.'}>
                {inbox.length === 0 && <div className="ead-empty">No messages yet.</div>}
                <div className="ead-notes">
                  {inbox.map(n => (
                    <div key={n.id} className={'ead-note' + (n.read_at ? '' : ' ead-note--unread')} role="button" tabIndex={0} onClick={() => openNote(n)} onKeyDown={e => { if (e.key === 'Enter') openNote(n); }}>
                      <div className="ead-note-title">{n.title}</div>
                      {n.body && <div className="ead-note-body">{n.body}</div>}
                      <div className="ead-meta">From {n.sender || 'PubPro'} · {ago(n.created_at)}</div>
                    </div>
                  ))}
                </div>
              </Panel>

              {profile ? (
                <Panel icon="badge" title="My Profile">
                  <div className="ead-profile">
                    <div><span className="ead-meta">Author ID</span> {profile.author_id}</div>
                    <div><span className="ead-meta">Email</span> {profile.email || '—'}</div>
                    <div><span className="ead-meta">COI on file</span> {profile.data.signedCoi ? 'Signed ' + profile.data.signedCoi.signedOn : 'None'}</div>
                    {!isAuthor && <Button variant="tertiary" icon="open_in_new" onClick={() => navigate('/external-author/' + profile.id)}>Open Profile</Button>}
                  </div>
                </Panel>
              ) : (
                <Panel icon="badge" title="My Profile">
                  <div className="ead-empty">No author profile yet.</div>
                  {!isAuthor && <Button variant="tertiary" icon="person_add" onClick={() => navigate('/external-author/new', { state: { name: person } })}>Create Profile</Button>}
                </Panel>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
