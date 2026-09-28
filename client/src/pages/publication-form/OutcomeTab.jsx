import React, { useState } from 'react';
import {
  Button, Checkbox, CommentComposer, DropZone, Icon, InlineMessage, MoneyField, Pill, Select,
} from '../../ds/pubpro';
import { api } from '../../api';
import { ownApproval } from './state';
import DateField from '../../components/DateField';
import { Card, Empty, FormField, ListBox, ListRow, Pair, Stack, TabHead, Tag, ON_GREY } from './ui';
import './tabs-d.css';
import { CONFERENCE_DIRECTORY, OUTCOME_STATUS_OPTIONS, PRESENTATION_TYPES, PROOF_STEPS, RESPONSE_CYCLE, TIMEZONE_OPTIONS, TODAY_STR } from './data';

export default function OutcomeTab({ st, set, bind, navigate, userName, record }) {
  const tg = st.targets || [];
  const nextAlt = tg[1];
  const nameOf = n => (CONFERENCE_DIRECTORY.find(c => c.name === n) || { abbr: n }).abbr || n;
  const primaryTargetName = tg[0] ? nameOf(tg[0]) : 'the target';
  const rcIdx = RESPONSE_CYCLE.findIndex(s => !st.responseDone[s]);
  const proofAll = PROOF_STEPS.every(s => st.proofDone[s]);
  const proofLocked = i => st.dispositionRecorded || (i > 0 && !st.proofDone[PROOF_STEPS[i - 1]]);

  // AB9 (GPP): a poster or slide deck is its own record with its own author review and approval.
  const isAbstract = st.pubType === 'Abstract';
  const isPresentation = PRESENTATION_TYPES.includes(st.pubType);
  const approval = ownApproval(st);
  const [related, setRelated] = useState(() => (record && record.related) || []);
  const [making, setMaking] = useState('');
  const [gateMsg, setGateMsg] = useState('');
  const what = st.pubType === 'Poster' ? 'poster' : 'slide deck';
  const needsOwnApproval = isPresentation && !approval.ok;
  const ab9Text = 'AB9 (GPP): this ' + what + ' needs its own Author Approval before it can be marked Accepted. The abstract\u2019s approval doesn\u2019t carry over.'
    + (approval.waiting.length ? ' Waiting on ' + approval.waiting.join(', ') + '.' : '');
  const derive = async pubType => {
    setMaking(pubType);
    setGateMsg('');
    try {
      const made = await api.post('/pp-publications/' + record.id + '/derive', { pubType });
      setRelated(list => list.concat([{ ...made, approved: false }]));
    } catch (err) {
      setGateMsg(err.message);
    } finally {
      setMaking('');
    }
  };
  const onStatus = v => {
    if (v === 'Accepted' && needsOwnApproval) { setGateMsg(ab9Text); return; }
    setGateMsg('');
    set({ outcomeStatus: v, returnedToSubmission: false });
  };
  const openPub = p => navigate('/publication/' + p.id);
  const retarget = () => set(s => {
    const list = s.targets || [];
    if (list.length < 2) return null;
    return {
      rejectionHistory: s.rejectionHistory.concat([{ target: list[0], next: list[1], date: TODAY_STR, by: userName }]),
      targets: list.slice(1),
      outcomeStatus: '',
      returnedToSubmission: true,
    };
  });

  return (
    <Stack>
      <TabHead
        title="Outcome"
        sub="What happened to this publication after submission."
        actions={isAbstract && record && (
          <>
            <Button variant="secondary" style={ON_GREY} icon="dashboard" onClick={() => derive('Poster')} disabled={!!making}>{making === 'Poster' ? 'Creating…' : 'Create Poster'}</Button>
            <Button variant="secondary" style={ON_GREY} icon="slideshow" onClick={() => derive('Congress Presentation')} disabled={!!making}>{making === 'Congress Presentation' ? 'Creating…' : 'Create Slide Deck'}</Button>
          </>
        )}
      />

      {isAbstract && (
        <Card title="Posters and slide decks">
          <div className="pfx-help">
            A poster or slide deck is its own record, with the same authors, product, studies and congress. It gets its own author review and approval, separate from the abstract&rsquo;s (AB9, GPP).
          </div>
          {related.length > 0 ? (
            <ListBox>
              {related.map(c => (
                <ListRow key={c.id} className="pfxd-child-row">
                  <Icon name={c.pub_type === 'Poster' ? 'dashboard' : 'slideshow'} size={18} color="var(--high-emphasis)" />
                  <a href={'/publication/' + c.id} onClick={e => { e.preventDefault(); openPub(c); }}>{c.record_id}</a>
                  <span className="pfxd-text pfxd-ellipsis pfxd-grow">{c.title}</span>
                  <Tag tone={c.approved ? 'green' : 'outline'}>{c.approved ? 'Authors approved' : 'Needs author approval'}</Tag>
                </ListRow>
              ))}
            </ListBox>
          ) : (
            <Empty>{['Poster', 'Oral', 'Late Breaker'].includes(st.subType) ? 'This abstract is a ' + st.subType.toLowerCase() + '. Create its ' + (st.subType === 'Poster' ? 'poster' : 'slide deck') + ' once it\u2019s accepted.' : 'No posters or slide decks yet.'}</Empty>
          )}
        </Card>
      )}

      {isPresentation && (
        <Card title={'This ' + what}>
          {st.sourcePub && (
            <div className="pfx-help">
              Made from abstract{' '}
              <a href={'/publication/' + st.sourcePub.id} onClick={e => { e.preventDefault(); openPub(st.sourcePub); }}>{st.sourcePub.recordId}</a>{' '}
              ({st.sourcePub.title}).
            </div>
          )}
          {approval.ok ? (
            <div className="pfxd-iconline pfxd-iconline--ok"><Icon name="check_circle" size={16} />Every author approved this {what} in its own Author Approval round (AB9).</div>
          ) : (
            <InlineMessage kind="warning">{ab9Text} Send an Author Approval round on the Reviews tab.</InlineMessage>
          )}
        </Card>
      )}

      <Card title="Status and dates">
        <Pair>
          <FormField id="pfxd-outcome-status" label="Status">
            <Select
              id="pfxd-outcome-status"
              options={OUTCOME_STATUS_OPTIONS}
              placeholder="Please select"
              value={st.outcomeStatus}
              onChange={e => onStatus(e.target.value)}
              width="100%"
            />
            {st.returnedToSubmission && (
              <div className="pfxd-iconline">
                <Icon name="undo" size={16} color="var(--high-emphasis)" />Returned to Submission — now targeting {primaryTargetName}.
              </div>
            )}
          </FormField>
          <div />
        </Pair>
        {gateMsg && <InlineMessage kind="error">{gateMsg}</InlineMessage>}

        {st.outcomeStatus === 'Changes Requested' && (
          <div className="pfxd-sub">
            <div className="pfxd-grow">
              <h4 className="pfxd-sub-title">Response Cycle</h4>
              <span className="pfxd-text">{rcIdx < 0 ? 'Response cycle complete — ready to resubmit.' : 'Current: ' + RESPONSE_CYCLE[rcIdx]}</span>
            </div>
            <div className="pfxd-steps">
              {RESPONSE_CYCLE.map((s, i) => (
                <div key={s} className="pfxd-step">
                  <Checkbox
                    checked={!!st.responseDone[s]}
                    onChange={() => set(x => ({ responseDone: { ...x.responseDone, [s]: !x.responseDone[s] } }))}
                    label={(i + 1) + '. ' + s}
                  />
                  {i === rcIdx && <Pill tone="active">Current</Pill>}
                </div>
              ))}
            </div>
          </div>
        )}

        {st.outcomeStatus === 'Rejected' && (
          <div className="pfxd-sub">
            <div className="pfxd-sub-head">
              <div className="pfxd-grow">
                <h4 className="pfxd-sub-title">Rejected by {primaryTargetName}</h4>
                <span className="pfxd-text">
                  {nextAlt
                    ? 'Next alternate on the Target shortlist: ' + nextAlt + '. The record stays the same and returns to Submission.'
                    : 'No alternates on the Target shortlist. Add one on the Target tab.'}
                </span>
              </div>
              <Button variant="secondary" onClick={retarget} disabled={!nextAlt}>Retarget to Next Journal</Button>
            </div>
          </div>
        )}

        {st.outcomeStatus === 'Accepted' && (
          <div className="pfxd-sub">
            <div className="pfxd-sub-head">
              <div className="pfxd-grow">
                <h4 className="pfxd-sub-title">Proof Review</h4>
                <span className="pfxd-text">Both proof reviews must be complete before the final disposition is recorded.</span>
              </div>
              {proofAll && !st.dispositionRecorded && !needsOwnApproval && (
                <Button variant="secondary" onClick={() => set({ dispositionRecorded: true, dispositionOn: TODAY_STR, dispositionBy: userName })}>Record Final Disposition</Button>
              )}
            </div>
            <div className="pfxd-steps">
              {PROOF_STEPS.map((s, i) => (
                <Checkbox
                  key={s}
                  checked={!!st.proofDone[s]}
                  locked={proofLocked(i)}
                  onChange={() => {
                    if (proofLocked(i)) return;
                    set(x => ({ proofDone: { ...x.proofDone, [s]: !x.proofDone[s] } }));
                  }}
                  label={(i + 1) + '. ' + s}
                />
              ))}
            </div>
            {st.dispositionRecorded && (
              <div className="pfxd-iconline pfxd-iconline--ok">
                <Icon name="check_circle" size={16} />Final disposition recorded {st.dispositionOn || '9/24/2026'} by {st.dispositionBy || 'Kristina Hill'}.
              </div>
            )}
          </div>
        )}

        {st.rejectionHistory.length > 0 && (
          <div className="pfx-field">
            <span className="pfxd-eyebrow">Rejection History</span>
            <ListBox>
              {st.rejectionHistory.map((h, i) => (
                <ListRow key={i} className="pfxd-history-row">
                  <Icon name="cancel" size={16} color="var(--fatal-text)" />
                  <span className="pfxd-strong">{h.target}</span>
                  <span className="pfxd-text">Rejected {h.date} · retargeted to {h.next}</span>
                </ListRow>
              ))}
            </ListBox>
          </div>
        )}

        <Pair>
          <FormField id="pfxd-date-submitted" label="Date Submitted"><DateField id="pfxd-date-submitted" {...bind('dateSubmitted')} width="100%" /></FormField>
          {/* Accepted: the date it was published or presented (the Publication Library shows and filters by it). */}
          <FormField id="pfxd-status-date" label={st.outcomeStatus === 'Accepted' ? 'Date Published' : 'Status Date'}><DateField id="pfxd-status-date" {...bind('statusDate')} width="100%" /></FormField>
        </Pair>
        <Pair>
          <FormField id="pfxd-embargo-date" label="Embargo Date" help="Stays out of the Publication Library until this date."><DateField id="pfxd-embargo-date" {...bind('embargoDate')} width="100%" /></FormField>
          <FormField id="pfxd-embargo-time" label="Embargo Time">
            <div className="pfxd-time">
              <DateField id="pfxd-embargo-time" time width="100%" />
              <Select options={TIMEZONE_OPTIONS} {...bind('timezone')} width="100%" aria-label="Time zone" />
            </div>
          </FormField>
        </Pair>
      </Card>

      <Card title="Cost">
        <Pair>
          <FormField label="Planned Cost">
            <div className="pfxd-money">
              {'$' + (st.planBudget || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </FormField>
          <FormField id="pfxd-actual-cost" label="Actual Cost">
            <MoneyField id="pfxd-actual-cost" {...bind('actualCost')} width="100%" />
          </FormField>
        </Pair>
      </Card>

      <Card title="Outcome comments">
        <CommentComposer layout="stacked" width="100%" height="76px" />
      </Card>

      <Card
        title={(
          <>
            Attach final publication
            <span className="pfxd-title-icon"><Icon name="info" size={16} color="var(--high-emphasis)" title="Attach Final Publication" /></span>
          </>
        )}
      >
        <DropZone newDocumentLabel="" />
      </Card>
    </Stack>
  );
}
