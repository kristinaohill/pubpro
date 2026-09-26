import React from 'react';
import useDismiss from '../../components/useDismiss';
import {
  AIActionButton, BandHeader, Button, Checkbox, EyebrowLabel, Field, Icon, IconButton, InlineMessage, Pill,
  SearchSelect, SectionHeading, Select, TextArea, TextField,
} from '../../ds/pubpro';
import DateField from '../../components/DateField';
import {
  PRIORITY_OPTIONS, REVIEWER_DIRECTORY, REVIEW_FLOW, REVIEW_METHOD_OPTIONS, REVIEW_TYPE_OPTIONS, TODAY_STR, daysFromToday,
} from './data';
import { auditEntry, deriveReadiness, dueTone, openRoundOf, reviewer, roundOutcome } from './state';
import { ReadinessPanel, WorkflowStepLine } from './shared';

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

/** People who receive a new round: mandatory reviewers, ticked reviewers, and ticked authors who haven't declined. */
function roundRecipients(st) {
  const author = kind => a => a.selected && !(a.invite && a.invite.status === 'declined');
  return st.mandatory.map(v => reviewer(v.name, v.role, 'reviewer'))
    .concat(st.additional.filter(v => v.selected).map(v => reviewer(v.name, v.role, /^External/.test(v.role || '') ? 'external' : 'reviewer')))
    .concat(st.internal.filter(author('internal')).map(a => reviewer(a.name, 'Internal Author', 'internal')))
    .concat(st.external.filter(author('external')).map(a => {
      const [person, ...aff] = a.name.split('-');
      return reviewer(person, 'External Author · ' + aff.join('-'), 'external');
    }));
}

export default function ReviewsTab({ st, set, bind, commit, saving, userName }) {
  const readiness = deriveReadiness(st);
  const reviewerRef = useDismiss(st.searchOpen, () => set({ searchOpen: false }), () => set({ searchOpen: true }));
  const flow = REVIEW_FLOW[st.reviewType];
  const methodLocked = st.reviewType === 'Author Approval';
  const rounds = st.rounds || [];
  const current = openRoundOf(st);
  const earlier = rounds.filter(r => r.status === 'closed');
  const newRoundNum = rounds.reduce((m, r) => Math.max(m, r.num), 0) + 1;
  const recipients = roundRecipients(st);

  const q = st.reviewerQuery.trim().toLowerCase();
  const matches = q
    ? REVIEWER_DIRECTORY.filter(p => (p.name + ' ' + p.role).toLowerCase().includes(q)).slice(0, 6)
    : REVIEWER_DIRECTORY.slice(0, 6);
  const suggestions = matches.map(p => {
    const added = st.additional.some(x => x.name === p.name) || st.mandatory.some(x => x.name === p.name);
    return { name: p.name, role: p.role, label: p.name, meta: added ? p.role + ' · already added' : p.role, added };
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
    const reviewers = roundRecipients(s);
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
      .filter(v => v.kind === 'reviewer' && !s.mandatory.some(m => m.name === v.name))
      .map((v, i) => ({ id: s.nextReviewerId + i, name: v.name, role: v.role, selected: true })),
  }));

  // ---- Current round view model ----------------------------------------------

  const people = current ? current.reviewers.map(v => {
    const done = v.decision !== 'pending';
    const d = DEC[v.decision] || DEC.pending;
    const ooo = !done && !!v.ooo;
    const reminded = v.remindedOn === TODAY_STR;
    return {
      ...v,
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
    <div className="pf-stack22">
      <div className="pf-row-end pf-nowrap">
        <SectionHeading>Reviews</SectionHeading>
        <div className="pf-ml-auto pf-row pf-gap10">
          <AIActionButton disabled={!st.pubDoc}>AI: First Review</AIActionButton>
          {!st.newRoundOpen && (
            <Button variant="secondary" onClick={() => set({ newRoundOpen: true })}>Start New Round</Button>
          )}
        </div>
      </div>
      {!st.pubDoc && (
        <div className="pf-faint13 pf-mt-neg8">AI: First Review becomes available once a publication document is added on the Publication tab.</div>
      )}

      {st.newRoundOpen && (
        <div className="pf-card pf-newround">
          <div className="pf-row pf-gap10">
            <Pill tone="nav">Round {newRoundNum}</Pill>
            <SectionHeading level="subsection">New Review Round</SectionHeading>
            <Pill tone="outline">Not sent</Pill>
          </div>
          <div className="pf-meta pf-mt-neg8">
            Workflow step: <span className="pf-strong-nav">{flow.step}</span> · If changes are requested, returns to: {flow.returnsTo}
          </div>

          <div className="pf-round-grid">
            <Field label="Review Type">
              <Select
                options={REVIEW_TYPE_OPTIONS}
                value={st.reviewType}
                onChange={e => { const v = e.target.value; set(s => ({ reviewType: v, reviewMethod: v === 'Author Approval' ? 'Comment Only' : s.reviewMethod })); }}
                width="100%"
              />
            </Field>
            <Field label="Due Date">
              <DateField {...bind('roundDue')} width="100%" />
            </Field>
            <Field label="Priority">
              <Select options={PRIORITY_OPTIONS} {...bind('priority')} width="100%" />
            </Field>
            <Field label="Review Method">
              <Select
                options={REVIEW_METHOD_OPTIONS}
                value={methodLocked ? 'Comment Only' : st.reviewMethod}
                onChange={e => set({ reviewMethod: e.target.value })}
                disabled={methodLocked}
                width="100%"
              />
              {methodLocked && (
                <div className="pf-faint13 pf-iconrow pf-gap4 pf-mt5"><Icon name="lock" size={15} />Author Approval is always Comment Only.</div>
              )}
            </Field>
          </div>

          {methodLocked && <ReadinessPanel r={readiness} onCheck={() => set({ readinessChecked: true })} />}

          <div>
            <div className="pf-h3 pf-mb8">Reviewers</div>
            <BandHeader tone="reviewer" note="Set by review type — cannot be removed">Mandatory</BandHeader>
            {st.mandatory.map(v => (
              <div key={v.id} className="pf-reviewer-row">
                <Checkbox checked locked />
                <div className="pf-min0">{v.name}</div>
                <div className="pf-min0 pf-fg3">{v.role}</div>
                <div />
              </div>
            ))}
            {st.mandatory.length === 0 && <div className="pf-faint13 pf-italic pf-pad8">No mandatory reviewers for this record.</div>}
            <div className="pf-mt12">
              <BandHeader tone="reviewer">Additional</BandHeader>
            </div>
            {st.additional.map(v => (
              <div key={v.id} className="pf-reviewer-row">
                <Checkbox
                  checked={v.selected}
                  onChange={() => set(s => ({ additional: s.additional.map(x => (x.id === v.id ? { ...x, selected: !x.selected } : x)) }))}
                />
                <div className="pf-min0">
                  <div>{v.name}</div>
                  {/^External/.test(v.role || '') && <SecureLinkNote />}
                </div>
                <div className="pf-min0 pf-fg3">{v.role}</div>
                <div className="pf-justify-end">
                  <IconButton icon="close" tone="fatal" size={26} title="Remove reviewer" onClick={() => set(s => ({ additional: s.additional.filter(x => x.id !== v.id) }))} />
                </div>
              </div>
            ))}
            <div className="pf-mt12" ref={reviewerRef}>
              <SearchSelect
                value={st.reviewerQuery}
                placeholder="Search reviewers by name or role"
                suggestions={suggestions}
                open={st.searchOpen}
                emptyLabel="No reviewers match that search."
                width="320px"
                onChange={e => set({ reviewerQuery: e.target.value, searchOpen: true })}
                onFocus={() => set({ searchOpen: true })}
                onClear={() => set({ reviewerQuery: '', searchOpen: false })}
                onPick={pickReviewer}
                style={{ maxWidth: '100%' }}
              />
            </div>
            <div className="pf-faint13 pf-mt8">Authors ticked on the Authors tab are included too, unless they declined the invitation.</div>
          </div>

          <Field label="Additional Email Instructions">
            <TextArea placeholder="Optional note included in the reviewer notification" width="626px" height="68px" style={{ maxWidth: '100%' }} />
          </Field>

          {current && (
            <InlineMessage kind="warning">Round {current.num} is still open. Close it below before sending a new round.</InlineMessage>
          )}

          <div className="pf-round-foot">
            <span className="pf-faint13">{recipients.length + (recipients.length === 1 ? ' person' : ' people')} will be notified</span>
            <div className="pf-ml-auto pf-row pf-gap10">
              <Button variant="tertiary" onClick={() => set({ newRoundOpen: false })}>Cancel</Button>
              <Button variant="primary" onClick={sendRound} disabled={!!current || recipients.length === 0 || saving}>Send for Review</Button>
            </div>
          </div>
        </div>
      )}

      {current ? (
        <div className="pf-round">
          <div className="pf-round-head pf-round-head--current" onClick={() => set(s => ({ currentRoundOpen: !s.currentRoundOpen }))}>
            <Pill tone="nav">Round {current.num}</Pill>
            <span className="pf-strong-nav pf-14">{current.type}</span>
            <span className="pf-meta">Sent {current.sentOn}{current.due ? ' · Due ' + current.due : ''}</span>
            <span className="pf-ml-auto pf-row pf-gap8">
              <span className="pf-meta">{people.filter(p => p.done).length} of {people.length} responded</span>
              <Pill tone={currentDue.tone}>{currentDue.label}</Pill>
              <Icon name={st.currentRoundOpen ? 'expand_less' : 'expand_more'} size={22} color="var(--nav)" />
            </span>
          </div>
          <WorkflowStepLine step={REVIEW_FLOW[current.type].step} returnsTo={REVIEW_FLOW[current.type].returnsTo} />
          {st.currentRoundOpen && (
            <div className="pf-round-body">
              <div className="pf-resp-grid pf-caps-head">
                <div>Reviewer</div><div>Response</div><div>Last Reminder</div><div />
              </div>
              {people.map(m => (
                <div key={m.name} className="pf-resp-item">
                  <div className="pf-resp-grid pf-14 pf-center-items">
                    <div className="pf-min0">
                      <div className="pf-strong">{m.name}</div>
                      <div className="pf-note12">{m.role}</div>
                      {m.isExternal && <SecureLinkNote size={13} />}
                    </div>
                    <div className="pf-min0">
                      <div className="pf-iconrow pf-13" style={{ color: m.statusColor }}>
                        <Icon name={m.statusGlyph} size={16} />{m.statusLabel}
                      </div>
                      {m.done && m.comment && <div className="pf-note12 pf-mt2">{m.comment}</div>}
                    </div>
                    <div className="pf-note13">{m.remindedOn || '—'}</div>
                    <div className="pf-justify-end pf-row pf-gap8">
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
                    <div className="pf-mt8">
                      <InlineMessage kind="warning">{m.ooo}</InlineMessage>
                    </div>
                  )}
                  {editing && editing.name === m.name && (
                    <div className="pf-card pf-respond">
                      <Field label="Decision">
                        <Select
                          options={DECISION_OPTIONS}
                          placeholder="Please select"
                          value={editing.decision}
                          onChange={e => set({ respondEdit: { ...editing, decision: e.target.value } })}
                          width="220px"
                        />
                      </Field>
                      <Field label="Comment">
                        <TextField
                          value={editing.comment}
                          onChange={e => set({ respondEdit: { ...editing, comment: e.target.value } })}
                          placeholder="Optional"
                          width="100%"
                        />
                      </Field>
                      <div className="pf-row pf-gap10 pf-respond-actions">
                        <Button variant="tertiary" onClick={() => set({ respondEdit: null })}>Cancel</Button>
                        <Button variant="secondary" onClick={saveResponse} disabled={!editing.decision}>Save Response</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div className="pf-row pf-wrap pf-gap10 pf-mt12">
                <div className="pf-faint13">Closing the round records the outcome: {roundOutcome(current)}.</div>
                <div className="pf-ml-auto pf-row pf-gap10">
                  {outstanding.length > 1 && (
                    <Button variant="secondary" onClick={() => remind(outstanding.map(p => p.name))} disabled={saving}>Remind All Outstanding</Button>
                  )}
                  <Button variant="secondary" onClick={closeRound} disabled={saving}>Close Round</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        !st.newRoundOpen && (
          <div className="empty-state">No review round is out right now. Use Start New Round to send one.</div>
        )
      )}

      <div>
        <EyebrowLabel style={{ marginBottom: 8 }}>Earlier Rounds</EyebrowLabel>
        {earlier.length === 0 && <div className="pf-faint13 pf-italic">No closed rounds yet.</div>}
        {earlier.map(r => {
          const open = st.openRound === r.num;
          return (
            <div key={r.num} className="pf-round pf-mb8">
              <div className="pf-round-head pf-round-head--past" onClick={() => set(s => ({ openRound: s.openRound === r.num ? null : r.num }))}>
                <Pill tone="outline">Round {r.num}</Pill>
                <span className="pf-strong-nav pf-14">{r.type}</span>
                <span className="pf-meta">Sent {r.sentOn} · Closed {r.closedOn}</span>
                <span className="pf-ml-auto pf-row pf-gap8">
                  <span className="pf-meta">{tallyOf(r)}</span>
                  <Pill tone={OUTCOME_TONE[r.outcome] || 'outline'}>{r.outcome}</Pill>
                  <Icon name={open ? 'expand_less' : 'expand_more'} size={22} color="var(--nav)" />
                </span>
              </div>
              <WorkflowStepLine step={REVIEW_FLOW[r.type].step} returnsTo={REVIEW_FLOW[r.type].returnsTo} />
              {open && (
                <div className="pf-round-body">
                  <div className="pf-scroll-x">
                    <div className="pf-past-grid pf-caps-head">
                      <div>Reviewer</div><div>Role</div><div>Decision</div><div>Completed</div><div>Comment</div>
                    </div>
                    {r.reviewers.map(v => {
                      const d = DEC[v.decision] || DEC.pending;
                      return (
                        <div key={v.name} className="pf-past-grid pf-past-row">
                          <div className="pf-min0">{v.name}</div>
                          <div className="pf-min0">
                            <div className="pf-ellipsis">{v.role}</div>
                            {/^External/.test(v.role || '') && <SecureLinkNote size={13} />}
                          </div>
                          <div className="pf-iconrow pf-gap6 pf-strong" style={{ color: d.color }}>
                            <Icon name={d.icon} size={17} />{d.decision}
                          </div>
                          <div>{v.on || '—'}</div>
                          <div className="pf-min0 pf-ellipsis pf-fg3">{v.comment || '—'}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pf-row pf-wrap pf-gap12 pf-mt12">
                    <div className="pf-faint13">{r.summary || `Round ${r.num} closed ${r.closedOn}: ${r.outcome}.`}</div>
                    <div className="pf-ml-auto">
                      <Button variant="secondary" onClick={() => copyReviewers(r)}>Copy Reviewers to New Round</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
