import React from 'react';
import {
  Button, Checkbox, CommentComposer, DropZone, Icon, MoneyField, Pill, Select,
} from '../../ds/pubpro';
import DateField from '../../components/DateField';
import { Card, Empty, FormField, ListBox, ListRow, Pair, Stack, TabHead, Tag, ON_GREY } from './ui';
import './tabs-d.css';
import { CONFERENCE_DIRECTORY, OUTCOME_STATUS_OPTIONS, PROOF_STEPS, RESPONSE_CYCLE, TIMEZONE_OPTIONS, TODAY_STR } from './data';

export default function OutcomeTab({ st, set, bind, navigate, userName }) {
  const tg = st.targets || [];
  const nextAlt = tg[1];
  const nameOf = n => (CONFERENCE_DIRECTORY.find(c => c.name === n) || { abbr: n }).abbr || n;
  const primaryTargetName = tg[0] ? nameOf(tg[0]) : 'the target';
  const rcIdx = RESPONSE_CYCLE.findIndex(s => !st.responseDone[s]);
  const proofAll = PROOF_STEPS.every(s => st.proofDone[s]);
  const proofLocked = i => st.dispositionRecorded || (i > 0 && !st.proofDone[PROOF_STEPS[i - 1]]);

  const createChild = () => set(s => ({
    nextChildId: s.nextChildId + 1,
    childPubs: s.childPubs.concat([{
      id: `26-CHILD-${String(s.nextChildId).padStart(3, '0')}-V01`,
      title: 'Daxafort in Moderate-to-Severe Atopic Dermatitis: CLARIFY (copy)',
      type: 'Abstract-Poster',
    }]),
  }));
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
        actions={<Button variant="secondary" style={ON_GREY} icon="difference" onClick={createChild}>Create Child Publication</Button>}
      />

      <Card title="Related publications">
        <div className="pfx-help">A child publication duplicates this record's document and metadata — change the title and type, then manage it (including its own vendor and financials) independently.</div>
        {st.childPubs.length > 0 ? (
          <ListBox>
            {st.childPubs.map(c => (
              <ListRow key={c.id} className="pfxd-child-row">
                <Icon name="menu_book" size={18} color="var(--high-emphasis)" />
                <a href="/publication" onClick={e => { e.preventDefault(); navigate('/publication'); }}>{c.id}</a>
                <span className="pfxd-text pfxd-ellipsis pfxd-grow">{c.title}</span>
                <Tag tone="outline">{c.type}</Tag>
              </ListRow>
            ))}
          </ListBox>
        ) : (
          <Empty>No child publications yet.</Empty>
        )}
      </Card>

      <Card title="Status and dates">
        <Pair>
          <FormField id="pfxd-outcome-status" label="Status">
            <Select
              id="pfxd-outcome-status"
              options={OUTCOME_STATUS_OPTIONS}
              placeholder="Please select"
              value={st.outcomeStatus}
              onChange={e => set({ outcomeStatus: e.target.value, returnedToSubmission: false })}
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
              {proofAll && !st.dispositionRecorded && (
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
          <FormField id="pfxd-date-submitted" label="Date Submitted"><DateField id="pfxd-date-submitted" width="100%" /></FormField>
          <FormField id="pfxd-status-date" label="Status Date"><DateField id="pfxd-status-date" width="100%" /></FormField>
        </Pair>
        <Pair>
          <FormField id="pfxd-embargo-date" label="Embargo Date"><DateField id="pfxd-embargo-date" width="100%" /></FormField>
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
