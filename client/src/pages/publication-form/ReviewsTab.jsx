import React from 'react';
import useDismiss from '../../components/useDismiss';
import usePeople, { jobTitle, oooText, personNamed, useReviewTypes } from '../../components/usePeople';
import {
  AIActionButton, BandHeader, Button, Checkbox, Icon, IconButton, InlineMessage, Pill,
  SearchSelect, Select, TextArea, TextField,
} from '../../ds/pubpro';
import DateField from '../../components/DateField';
import {
  PRIORITY_OPTIONS, REVIEW_FLOW, REVIEW_METHOD_OPTIONS, REVIEW_TYPE_OPTIONS, TODAY_STR, daysFromToday,
} from './data';
import { auditEntry, deriveReadiness, dueTone, openRoundOf, reviewer, roundOutcome } from './state';
import { ReadinessPanel, WorkflowStepLine } from './shared';
import { Card, ColHead, FormField, ListBox, ListRow, Pair, Stack, TabHead, Tag, ON_GREY } from './ui';
import './tabs-c.css';

const DEC = {
  approve: { decision: 'Approved', icon: 'check_circle', color: 'var(--ok)' },
  changes: { decision: 'Changes Requested', icon: 'edit_note', color: 'var(--warn-text)' },
  reject: { decision: 'Not Approved', icon: 'cancel', color: 'var(--fatal-text)' },
  pending: { decision: 'No response', icon: 'radio_button_unchecked', color: 'var(--fg-faint)' },
};
const DECISION_OPTIONS = [
  { value: 'approve', label: 'Approved' },
  { value: 'changes', label: 'Changes Requested' },
  { value: 'reject', label: 'Not Approved' },
];
const OUTCOME_TONE = { Approved: 'active', 'Changes Requested': 'hold', 'Not Approved': 'cancelled' };

const SecureLinkNote = ({ size = 14 }) => (
  <div className="pf-note12 pf-iconrow pf-gap4 pf-mt2"><Icon name="lock" size={size} />Secure link with one-time code</div>
);

const tallyOf = round => {
  const n = k => round.reviewers.filter(r => r.decision === k).length;
  return [
    n('approve') && n('approve') + ' approved',
    n('changes') && n('changes') + ' changes',
    n('reject') && n('reject') + ' not approved',
    n('pending') && n('pending') + ' no response',
  ].filter(Boolean).join(' · ');
};

const dueRel = due => {
  const n = daysFromToday(due);
  if (n == null) return { label: 'No due date', tone: 'outline' };
  const label = n === 0 ? 'Due today' : n < 0 ? (-n === 1 ? '1 day overdue' : -n + ' days overdue') : 'Due in ' + n + (n === 1 ? ' day' : ' days');
  return { label, tone: dueTone(n) };
};

// Who a review type brings in (System Administrator > Review Types): its required and optional
// participants, resolved for this record. Authors who declined the invitation are left out; a
// product role brings in whoever holds it on the publication's product.
const FALLBACK_TYPE = { required: [], optional: [{ kind: 'internal_authors' }, { kind: 'external_authors' }] };

function resolveSources(st, sources, staff, roleName) {
  const out = [];
  const notDeclined = a => !(a.invite && a.invite.status === 'declined');
  (sources || []).forEach(src => {
    if (src.kind === 'internal_authors') {
      st.internal.filter(notDeclined).forEach(a => out.push({ name: a.name, role: 'Internal Author', kind: 'internal', from: 'Internal authors' }));
    } else if (src.kind === 'external_authors') {
      st.external.filter(notDeclined).forEach(a => {
        const [person, ...aff] = a.name.split('-');
        out.push({ name: person, role: 'External Author · ' + aff.join('-'), kind: 'external', from: 'External authors' });
      });
    } else if (src.kind === 'role') {
      // Whoever holds this product role on the publication's product.
      staff.filter(p => st.product && (p.productRoles || {})[st.product] === src.role)
        .forEach(p => out.push({ name: p.name, role: roleName(src.role), kind: 'reviewer', from: 'By role' }));
    } else if (src.kind === 'user') {
      const p = staff.find(x => String(x.id) === String(src.userId));
      if (p) out.push({ name: p.name, role: jobTitle(p) || 'Reviewer', kind: 'reviewer', from: 'Named' });
    }
  });
  return out;
}
const dedupe = list => list.filter((x, i) => list.findIndex(y => y.name === x.name) === i);

/** { required, optional } for the record's chosen review type. The record's own mandatory reviewers are required too. */
function participantsFor(st, cfg, staff, roleName) {
  const own = (st.mandatory || []).map(v => ({ name: v.name, role: v.role, kind: 'reviewer', from: 'This publication' }));
  const required = dedupe(own.concat(resolveSources(st, cfg.required, staff, roleName)));
  const optional = dedupe(resolveSources(st, cfg.optional, staff, roleName)).filter(x => !required.some(r => r.name === x.name));
  return { required, optional };
}

/** People who receive a new round: required, optional ones left ticked, and ticked additional reviewers. */
function roundRecipients(st, parts) {
  const off = st.optionalOff || [];
  const people = parts.required
    .concat(parts.optional.filter(x => !off.includes(x.name)))
    .concat(st.additional.filter(v => v.selected).map(v => ({ name: v.name, role: v.role, kind: /^External/.test(v.role || '') ? 'external' : 'reviewer' })));
  return dedupe(people).map(x => reviewer(x.name, x.role, x.kind));
}

export default function ReviewsTab({ st, set, bind, commit, saving, userName }) {
  // Reviewers are PubPro users (System Administrator); titles and out of office come from their profiles.
  const staff = usePeople();
  const directory = staff.map(p => ({ name: p.name, role: jobTitle(p), ooo: oooText(p) }));
  const rt = useReviewTypes();
  const types = rt && rt.types && rt.types.length ? rt.types : REVIEW_TYPE_OPTIONS.map(name => ({ name, ...FALLBACK_TYPE }));
  const roleName = key => ((rt && rt.roles) || []).find(r => r.key === key)?.name || key;
  const typeCfg = name => types.find(t => t.name === name) || FALLBACK_TYPE;
  const parts = participantsFor(st, typeCfg(st.reviewType), staff, roleName);
  const scopedRoleWaiting = !st.product && (typeCfg(st.reviewType).required || []).some(x => x.kind === 'role');
  const readiness = deriveReadiness(st);
  const reviewerRef = useDismiss(st.searchOpen, () => set({ searchOpen: false }), () => set({ searchOpen: true }));
  // Custom review types (added on System Administrator) have no workflow step of their own.
  const flow = REVIEW_FLOW[st.reviewType] || { step: st.reviewType, returnsTo: 'Draft Development' };
  const methodLocked = st.reviewType === 'Author Approval';
  const rounds = st.rounds || [];
  const current = openRoundOf(st);
  const earlier = rounds.filter(r => r.status === 'closed');
  const newRoundNum = rounds.reduce((m, r) => Math.max(m, r.num), 0) + 1;
  const recipients = roundRecipients(st, parts);

  const q = st.reviewerQuery.trim().toLowerCase();
  const matches = q
    ? directory.filter(p => (p.name + ' ' + p.role).toLowerCase().includes(q)).slice(0, 8)
    : directory.slice(0, 8);
  const suggestions = matches.map(p => {
    const added = st.additional.some(x => x.name === p.name) || parts.required.some(x => x.name === p.name) || parts.optional.some(x => x.name === p.name);
    const away = p.ooo ? ' · ' + p.ooo.split(':')[0] : '';
    return { name: p.name, role: p.role, label: p.name, meta: (added ? p.role + ' · already added' : p.role) + away, added };
  });
  const pickReviewer = sug => {
    if (!sug || sug.added) return;
    set(s => ({
      nextReviewerId: s.nextReviewerId + 1,
      reviewerQuery: '',
      searchOpen: false,
      additional: s.additional.concat([{ id: s.nextReviewerId, name: sug.name, role: sug.role, selected: true }]),
    }));
  };

  // ---- Round actions ---------------------------------------------------------

  // Sending, reminding and closing save the record and notify people in PubPro (no email).
  const sendRound = () => commit(s => {
    if (openRoundOf(s)) return null;
    // Anyone out of office (their profile) starts the round marked away, so reminders wait for them.
    const reviewers = roundRecipients(s, participantsFor(s, typeCfg(s.reviewType), staff, roleName)).map(r => {
      const away = oooText(personNamed(staff, r.name));
      return away && !r.ooo ? { ...r, ooo: away } : r;
    });
    if (!reviewers.length) return null;
    const method = s.reviewType === 'Author Approval' ? 'Comment Only' : s.reviewMethod;
    const due = s.fields.roundDue || '';
    const round = {
      num: newRoundNum, type: s.reviewType, method, priority: s.fields.priority || 'Standard Review',
      due, sentOn: TODAY_STR, closedOn: '', status: 'open', outcome: '', reviewers,
    };
    return {
      rounds: (s.rounds || []).concat([round]),
      newRoundOpen: false,
      optionalOff: [],
      currentRoundOpen: true,
      fields: { ...s.fields, roundDue: '' },
      audit: (s.audit || []).concat([auditEntry(`${round.type} (Round ${round.num})`, {
        participants: reviewers.map(r => `${r.name} [${r.role}]`).join('\n'),
        completed: '-', active: true, roundNum: round.num,
        comment: `Sent by ${userName} · ${method}` + (due ? ' · due ' + due : ''),
      })]),
    };
  }, {
    done: 'Review round sent. Reviewers were notified in PubPro.',
    notices: (rec, s) => {
      const round = openRoundOf(s);
      return round ? round.reviewers.map(r => ({
        recipient: r.name, kind: 'review_request', tab: 'reviewers',
        title: 'Review requested: ' + round.type,
        body: `${rec.title} (${rec.record_id}) · ${round.method}` + (round.due ? ' · due ' + round.due : ''),
      })) : [];
    },
  });

  const patchReviewer = (name, patch) => set(s => ({
    rounds: s.rounds.map(r => (r.status === 'open'
      ? { ...r, reviewers: r.reviewers.map(v => (v.name === name ? { ...v, ...patch } : v)) }
      : r)),
  }));

  const remind = names => commit(s => ({
    rounds: s.rounds.map(r => (r.status === 'open'
      ? { ...r, reviewers: r.reviewers.map(v => (names.includes(v.name) ? { ...v, remindedOn: TODAY_STR } : v)) }
      : r)),
    audit: (s.audit || []).concat([auditEntry('Reminder Sent', { participants: names.join('\n'), comment: 'Sent by ' + userName })]),
  }), {
    done: names.length === 1 ? 'Reminder sent to ' + names[0] + '.' : names.length + ' reminders sent.',
    notices: (rec, s) => {
      const round = openRoundOf(s);
      return names.map(name => ({
        recipient: name, kind: 'reminder', tab: 'reviewers',
        title: 'Reminder: ' + (round ? round.type : 'review') + ' response ' + (round && round.due ? 'due ' + round.due : 'requested'),
        body: `${rec.title} (${rec.record_id})`,
      }));
    },
  });

  const saveResponse = () => {
    const e = st.respondEdit;
    if (!e || !e.decision) return;
    patchReviewer(e.name, { decision: e.decision, comment: e.comment.trim(), on: TODAY_STR, ooo: '' });
    set({ respondEdit: null });
  };

  const closeRound = () => {
    const round = openRoundOf(st);
    if (!round) return;
    const outcome = roundOutcome(round);
    const f = REVIEW_FLOW[round.type];
    const closed = { ...round, status: 'closed', closedOn: TODAY_STR, outcome };
    const note = outcome === 'Approved' ? `${f.step} marked complete on the Planning tab` : `Returns to ${f.returnsTo}`;
    commit(s => ({
      rounds: s.rounds.map(r => (r.num === round.num ? closed : r)),
      respondEdit: null,
      // An approved round completes its workflow step on the Planning tab.
      rows: outcome === 'Approved'
        ? s.rows.map(r => (r.name === f.step && !r.done ? { ...r, done: true, doneOn: TODAY_STR, pct: r.type === 'Stage' ? '100' : r.pct } : r))
        : s.rows,
      audit: (s.audit || []).map(a => (a.roundNum === round.num && a.active
        ? { ...a, active: false, completed: TODAY_STR, result: outcome, comment: [a.comment, `Closed by ${userName}`, note].filter(Boolean).join(' · ') }
        : a)),
    }), {
      done: `Round ${round.num} closed: ${outcome}. Reviewers were notified in PubPro.`,
      notices: rec => round.reviewers.map(r => ({
        recipient: r.name, kind: 'round_closed', tab: 'reviewers',
        title: `${round.type} closed: ${outcome}`,
        body: `${rec.title} (${rec.record_id}) · Round ${round.num}`,
      })),
    });
  };


  const copyReviewers = round => set(s => ({
    newRoundOpen: true,
    nextReviewerId: s.nextReviewerId + round.reviewers.length,
    additional: round.reviewers
      .filter(v => v.kind === 'reviewer' && !(p => p.required.concat(p.optional))(participantsFor(s, typeCfg(s.reviewType), staff, roleName)).some(m => m.name === v.name))
      .map((v, i) => ({ id: s.nextReviewerId + i, name: v.name, role: v.role, selected: true })),
  }));

  // ---- Current round view model ----------------------------------------------

  const people = current ? current.reviewers.map(v => {
    const done = v.decision !== 'pending';
    const d = DEC[v.decision] || DEC.pending;
    // Out of office: noted when the round went out, or set on their profile since.
    const away = v.ooo || oooText(personNamed(staff, v.name));
    const ooo = !done && !!away;
    const reminded = v.remindedOn === TODAY_STR;
    return {
      ...v,
      ooo: away,
      done,
      isExternal: v.kind === 'external' || /^External/.test(v.role || ''),
      statusLabel: done ? d.decision + ' · ' + v.on : ooo ? 'Out of office' : reminded ? 'Reminder sent ' + TODAY_STR : 'Awaiting response',
      statusGlyph: done ? d.icon : ooo ? 'event_busy' : reminded ? 'check' : 'schedule',
      statusColor: done ? d.color : ooo ? 'var(--warn-text)' : reminded ? 'var(--ok)' : 'var(--fg-3)',
      canRemind: !done && !ooo && !reminded,
    };
  }) : [];
  const outstanding = people.filter(p => p.canRemind);
  const currentDue = current ? dueRel(current.due) : null;
  const editing = st.respondEdit;

  return (
    <Stack>
      <TabHead
        title="Reviews"
        sub="Review rounds for this publication."
        actions={(
          <>
            <AIActionButton disabled={!st.pubDoc}>AI: First Review</AIActionButton>
            {!st.newRoundOpen && (
              <Button variant="secondary" style={ON_GREY} onClick={() => set({ newRoundOpen: true })}>Start New Round</Button>
            )}
          </>
        )}
      />
      {!st.pubDoc && (
        <div className="pfxc-hint">AI: First Review becomes available once a publication document is added on the Publication tab.</div>
      )}

      {st.newRoundOpen && (
        <Card
          className="pfxc-round"
          title={<><Tag tone="navy">Round {newRoundNum}</Tag><span>New Review Round</span><Tag tone="outline">Not sent</Tag></>}
        >
          <div className="pfxc-round-meta">
            Workflow step: <span className="pf-strong-nav">{flow.step}</span> · If changes are requested, returns to: {flow.returnsTo}
          </div>

          <Pair>
            <FormField id="pf-reviewtype" label="Review Type">
              <Select
                id="pf-reviewtype"
                options={types.map(t => t.name)}
                value={st.reviewType}
                onChange={e => { const v = e.target.value; set(s => ({ reviewType: v, optionalOff: [], reviewMethod: v === 'Author Approval' ? 'Comment Only' : s.reviewMethod })); }}
                width="100%"
              />
            </FormField>
            <FormField id="pf-rounddue" label="Due Date">
              <DateField id="pf-rounddue" {...bind('roundDue')} width="100%" />
            </FormField>
          </Pair>
          <Pair>
            <FormField id="pf-priority" label="Priority">
              <Select id="pf-priority" options={PRIORITY_OPTIONS} {...bind('priority')} width="100%" />
            </FormField>
            <FormField
              id="pf-reviewmethod"
              label="Review Method"
              help={methodLocked && (
                <span className="pfxc-lockline"><Icon name="lock" size={14} />Author Approval is always Comment Only.</span>
              )}
            >
              <Select
                id="pf-reviewmethod"
                options={REVIEW_METHOD_OPTIONS}
                value={methodLocked ? 'Comment Only' : st.reviewMethod}
                onChange={e => set({ reviewMethod: e.target.value })}
                disabled={methodLocked}
                width="100%"
              />
            </FormField>
          </Pair>

          {methodLocked && <ReadinessPanel r={readiness} onCheck={() => set({ readinessChecked: true })} />}

          <div className="pfx-field">
            <span className="pfx-label">Reviewers</span>
            <div className="pfxc-rvgroup">
              <BandHeader tone="reviewer" note={'Set for ' + (st.reviewType || 'this review type') + ' on System Administrator › Review Types — cannot be removed'}>Required</BandHeader>
              {parts.required.map(v => (
                <div key={'req-' + v.name} className="pfxc-rv-row">
                  <Checkbox checked locked />
                  <div className="pfxc-rv-name">
                    <div>{v.name}</div>
                    {v.kind === 'external' && <SecureLinkNote />}
                  </div>
                  <div className="pfxc-rv-role">{v.role}<span className="pfxc-rv-auto">{v.from}</span></div>
                  <div className="pfxc-rv-end" />
                </div>
              ))}
              {parts.required.length === 0 && <div className="pfxc-rv-empty">No required reviewers for this review type.</div>}
              {scopedRoleWaiting && (
                <div className="pfxc-rv-empty">Pick a product on the Overview tab to bring in the reviewers whose roles cover it.</div>
              )}
            </div>
            {parts.optional.length > 0 && (
              <div className="pfxc-rvgroup">
                <BandHeader tone="reviewer" note="Suggested for this review type — untick anyone who shouldn’t get it">Optional</BandHeader>
                {parts.optional.map(v => {
                  const on = !(st.optionalOff || []).includes(v.name);
                  return (
                    <div key={'opt-' + v.name} className="pfxc-rv-row">
                      <Checkbox
                        checked={on}
                        onChange={() => set(s => {
                          const off = s.optionalOff || [];
                          return { optionalOff: off.includes(v.name) ? off.filter(n => n !== v.name) : off.concat([v.name]) };
                        })}
                      />
                      <div className="pfxc-rv-name">
                        <div>{v.name}</div>
                        {v.kind === 'external' && on && <SecureLinkNote />}
                      </div>
                      <div className="pfxc-rv-role">{v.role}<span className="pfxc-rv-auto">{v.from}</span></div>
                      <div className="pfxc-rv-end" />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="pfxc-rvgroup">
              <BandHeader tone="reviewer">Additional</BandHeader>
              {st.additional.map(v => (
                <div key={v.id} className="pfxc-rv-row">
                  <Checkbox
                    checked={v.selected}
                    onChange={() => set(s => ({ additional: s.additional.map(x => (x.id === v.id ? { ...x, selected: !x.selected } : x)) }))}
                  />
                  <div className="pfxc-rv-name">
                    <div>{v.name}</div>
                    {/^External/.test(v.role || '') && <SecureLinkNote />}
                  </div>
                  <div className="pfxc-rv-role">{v.role}</div>
                  <div className="pfxc-rv-end">
                    <IconButton icon="close" tone="fatal" size={26} title="Remove reviewer" onClick={() => set(s => ({ additional: s.additional.filter(x => x.id !== v.id) }))} />
                  </div>
                </div>
              ))}
            </div>
            <div className="pfxc-rv-search" ref={reviewerRef}>
              <SearchSelect
                value={st.reviewerQuery}
                placeholder="Search reviewers by name or role"
                suggestions={suggestions}
                open={st.searchOpen}
                emptyLabel="No reviewers match that search."
                width="100%"
                onChange={e => set({ reviewerQuery: e.target.value, searchOpen: true })}
                onFocus={() => set({ searchOpen: true })}
                onClear={() => set({ reviewerQuery: '', searchOpen: false })}
                onPick={pickReviewer}
                style={{ maxWidth: '100%' }}
              />
            </div>
            <div className="pfx-help">Who is required and optional comes from the review type. Authors who declined the invitation are left out.</div>
          </div>

          <FormField id="pf-roundnote" label="Additional Email Instructions">
            <TextArea id="pf-roundnote" placeholder="Optional note included in the reviewer notification" width="100%" height="68px" style={{ maxWidth: '100%' }} />
          </FormField>

          {current && (
            <InlineMessage kind="warning">Round {current.num} is still open. Close it below before sending a new round.</InlineMessage>
          )}

          <div className="pfxc-foot">
            <span className="pfxc-foot-text">{recipients.length + (recipients.length === 1 ? ' person' : ' people')} will be notified</span>
            <div className="pfxc-foot-actions">
              <Button variant="tertiary" onClick={() => set({ newRoundOpen: false })}>Cancel</Button>
              <Button variant="primary" onClick={sendRound} disabled={!!current || recipients.length === 0 || saving}>Send for Review</Button>
            </div>
          </div>
        </Card>
      )}

      {current ? (
        <Card
          className="pfxc-round"
          title={<><Tag tone="navy">Round {current.num}</Tag><span>{current.type}</span></>}
          actions={(
            <button
              type="button"
              className="pfxc-collapse"
              aria-expanded={!!st.currentRoundOpen}
              aria-label={st.currentRoundOpen ? 'Collapse round' : 'Expand round'}
              onClick={() => set(s => ({ currentRoundOpen: !s.currentRoundOpen }))}
            >
              <Icon name={st.currentRoundOpen ? 'expand_less' : 'expand_more'} size={22} color="var(--nav)" />
            </button>
          )}
        >
          <div className="pfxc-round-meta">
            <span>Sent {current.sentOn}{current.due ? ' · Due ' + current.due : ''}</span>
            <Pill tone={currentDue.tone}>{currentDue.label}</Pill>
            <span>{people.filter(p => p.done).length} of {people.length} responded</span>
          </div>
          <WorkflowStepLine step={REVIEW_FLOW[current.type].step} returnsTo={REVIEW_FLOW[current.type].returnsTo} />
          {st.currentRoundOpen && (
            <>
              <ColHead cols={[['Reviewer', ''], ['Response', '220px'], ['Last Reminder', '90px'], ['', '150px']]} />
              <ListBox>
                {people.map(m => (
                  <ListRow key={m.name} className="pfxc-stackrow">
                    <div className="pfxc-rrow">
                      <div className="pfxc-rrow-who">
                        <div className="pfxc-rrow-name">{m.name}</div>
                        <div className="pfxc-rrow-role">{m.role}</div>
                        {m.isExternal && <SecureLinkNote size={13} />}
                      </div>
                      <div className="pfxc-rrow-resp">
                        <div className="pfxc-rrow-status" style={{ color: m.statusColor }}>
                          <Icon name={m.statusGlyph} size={16} />{m.statusLabel}
                        </div>
                        {m.done && m.comment && <div className="pfxc-rrow-comment">{m.comment}</div>}
                      </div>
                      <div className="pfxc-rrow-remind">{m.remindedOn || '—'}</div>
                      <div className="pfxc-rrow-actions">
                        {m.canRemind && <Button variant="tertiary" onClick={() => remind([m.name])} disabled={saving}>Send Reminder</Button>}
                        <Button
                          variant="tertiary"
                          onClick={() => set({ respondEdit: { name: m.name, decision: m.done ? m.decision : '', comment: m.comment || '' } })}
                        >
                          {m.done ? 'Edit Response' : 'Record Response'}
                        </Button>
                      </div>
                    </div>
                    {m.decision === 'pending' && m.ooo && (
                      <InlineMessage kind="warning">{m.ooo}</InlineMessage>
                    )}
                    {editing && editing.name === m.name && (
                      <div className="pfxc-respond">
                        <FormField id={'pf-decision-' + m.name} label="Decision">
                          <Select
                            id={'pf-decision-' + m.name}
                            options={DECISION_OPTIONS}
                            placeholder="Please select"
                            value={editing.decision}
                            onChange={e => set({ respondEdit: { ...editing, decision: e.target.value } })}
                            width="100%"
                          />
                        </FormField>
                        <FormField id={'pf-comment-' + m.name} label="Comment">
                          <TextField
                            id={'pf-comment-' + m.name}
                            value={editing.comment}
                            onChange={e => set({ respondEdit: { ...editing, comment: e.target.value } })}
                            placeholder="Optional"
                            width="100%"
                          />
                        </FormField>
                        <div className="pfxc-respond-actions">
                          <Button variant="tertiary" onClick={() => set({ respondEdit: null })}>Cancel</Button>
                          <Button variant="secondary" onClick={saveResponse} disabled={!editing.decision}>Save Response</Button>
                        </div>
                      </div>
                    )}
                  </ListRow>
                ))}
              </ListBox>
              <div className="pfxc-foot pfxc-foot--plain">
                <span className="pfxc-foot-text">Closing the round records the outcome: <strong>{roundOutcome(current)}</strong>.</span>
                <div className="pfxc-foot-actions">
                  {outstanding.length > 1 && (
                    <Button variant="secondary" onClick={() => remind(outstanding.map(p => p.name))} disabled={saving}>Remind All Outstanding</Button>
                  )}
                  <Button variant="secondary" onClick={closeRound} disabled={saving}>Close Round</Button>
                </div>
              </div>
            </>
          )}
        </Card>
      ) : (
        !st.newRoundOpen && (
          <div className="pfxc-note">No review round is out right now. Use Start New Round to send one.</div>
        )
      )}

      <Card title="Earlier rounds">
        {earlier.length === 0 && <div className="pfxc-note">No closed rounds yet.</div>}
        {earlier.length > 0 && (
          <div className="pfxc-past-list">
            {earlier.map(r => {
              const open = st.openRound === r.num;
              return (
                <div key={r.num} className="pfxc-past">
                  <div
                    className="pfxc-past-head"
                    role="button"
                    tabIndex={0}
                    aria-expanded={open}
                    onClick={() => set(s => ({ openRound: s.openRound === r.num ? null : r.num }))}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(s => ({ openRound: s.openRound === r.num ? null : r.num })); } }}
                  >
                    <Tag tone="outline">Round {r.num}</Tag>
                    <span className="pfxc-past-type">{r.type}</span>
                    <span className="pfx-meta">Sent {r.sentOn} · Closed {r.closedOn}</span>
                    <span className="pfxc-past-right">
                      <span className="pfx-meta">{tallyOf(r)}</span>
                      <Pill tone={OUTCOME_TONE[r.outcome] || 'outline'}>{r.outcome}</Pill>
                      <Icon name={open ? 'expand_less' : 'expand_more'} size={22} color="var(--nav)" />
                    </span>
                  </div>
                  <WorkflowStepLine step={REVIEW_FLOW[r.type].step} returnsTo={REVIEW_FLOW[r.type].returnsTo} />
                  {open && (
                    <div className="pfxc-past-body">
                      <ColHead cols={[['Reviewer', ''], ['Decision', '240px'], ['Completed', '84px']]} />
                      <ListBox>
                        {r.reviewers.map(v => {
                          const d = DEC[v.decision] || DEC.pending;
                          return (
                            <ListRow key={v.name} className="pfxc-past-row">
                              <div className="pfxc-rrow-who">
                                <div className="pfxc-rrow-name">{v.name}</div>
                                <div className="pfxc-rrow-role">{v.role}</div>
                                {/^External/.test(v.role || '') && <SecureLinkNote size={13} />}
                              </div>
                              <div className="pfxc-past-resp">
                                <div className="pfxc-past-dec" style={{ color: d.color }}>
                                  <Icon name={d.icon} size={17} />{d.decision}
                                </div>
                                <div className="pfxc-rrow-comment">{v.comment || '—'}</div>
                              </div>
                              <div className="pfxc-past-on">{v.on || '—'}</div>
                            </ListRow>
                          );
                        })}
                      </ListBox>
                      <div className="pfxc-foot pfxc-foot--plain">
                        <span className="pfxc-foot-text">{r.summary || `Round ${r.num} closed ${r.closedOn}: ${r.outcome}.`}</span>
                        <div className="pfxc-foot-actions">
                          <Button variant="secondary" onClick={() => copyReviewers(r)}>Copy Reviewers to New Round</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </Stack>
  );
}
