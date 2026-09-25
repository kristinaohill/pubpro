import React from 'react';
import {
  Button, Checkbox, CommentComposer, DropZone, EyebrowLabel, Field, Icon, MoneyField, Pill,
  SectionHeading, Select,
} from '../../ds/pubpro';
import DateField from '../../components/DateField';
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
    <div>
      <div className="pf-row-end pf-mb14">
        <SectionHeading>Outcome</SectionHeading>
        <div className="pf-ml-auto">
          <Button variant="secondary" icon="difference" onClick={createChild}>Create Child Publication</Button>
        </div>
      </div>

      <div className="pf-related">
        <div className="pf-h3 pf-mb4">Related Publications</div>
        <div className="pf-related-note">A child publication duplicates this record's document and metadata — change the title and type, then manage it (including its own vendor and financials) independently.</div>
        {st.childPubs.length > 0 ? (
          <div className="pf-col pf-gap6">
            {st.childPubs.map(c => (
              <div key={c.id} className="pf-child-row">
                <Icon name="menu_book" size={18} color="var(--high-emphasis)" />
                <a href="/publication" className="pf-strong pf-13" onClick={e => { e.preventDefault(); navigate('/publication'); }}>{c.id}</a>
                <span className="pf-meta pf-ellipsis-1">{c.title}</span>
                <span className="pf-faint12 pf-ml-auto pf-nowrap-text">{c.type}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="pf-faint13 pf-italic">No child publications yet.</div>
        )}
      </div>

      <div className="pf-stack16 pf-pl22">
        <Field label="Status">
          <Select
            options={OUTCOME_STATUS_OPTIONS}
            placeholder="Please select"
            value={st.outcomeStatus}
            onChange={e => set({ outcomeStatus: e.target.value, returnedToSubmission: false })}
            width="300px"
          />
          {st.returnedToSubmission && (
            <div className="pf-iconrow pf-meta pf-mt6">
              <Icon name="undo" size={16} color="var(--high-emphasis)" />Returned to Submission — now targeting {primaryTargetName}.
            </div>
          )}
        </Field>

        {st.outcomeStatus === 'Changes Requested' && (
          <div className="pf-outcome-card">
            <div className="pf-h3">Response Cycle</div>
            <div className="pf-meta pf-cycle-note">{rcIdx < 0 ? 'Response cycle complete — ready to resubmit.' : 'Current: ' + RESPONSE_CYCLE[rcIdx]}</div>
            <div className="pf-col pf-gap8">
              {RESPONSE_CYCLE.map((s, i) => (
                <div key={s} className="pf-row pf-gap10">
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
          <div className="pf-outcome-card">
            <div className="pf-row-end">
              <div>
                <div className="pf-h3">Rejected by {primaryTargetName}</div>
                <div className="pf-meta pf-mt2">
                  {nextAlt
                    ? 'Next alternate on the Target shortlist: ' + nextAlt + '. The record stays the same and returns to Submission.'
                    : 'No alternates on the Target shortlist. Add one on the Target tab.'}
                </div>
              </div>
              <div className="pf-ml-auto">
                <Button variant="secondary" onClick={retarget} disabled={!nextAlt}>Retarget to Next Journal</Button>
              </div>
            </div>
          </div>
        )}

        {st.outcomeStatus === 'Accepted' && (
          <div className="pf-outcome-card">
            <div className="pf-row-end">
              <div>
                <div className="pf-h3">Proof Review</div>
                <div className="pf-meta pf-mt2">Both proof reviews must be complete before the final disposition is recorded.</div>
              </div>
              {proofAll && !st.dispositionRecorded && (
                <div className="pf-ml-auto">
                  <Button variant="secondary" onClick={() => set({ dispositionRecorded: true, dispositionOn: TODAY_STR, dispositionBy: userName })}>Record Final Disposition</Button>
                </div>
              )}
            </div>
            <div className="pf-col pf-gap8 pf-mt10">
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
              <div className="pf-iconrow pf-ok13 pf-mt10">
                <Icon name="check_circle" size={16} />Final disposition recorded {st.dispositionOn || '9/24/2026'} by {st.dispositionBy || 'Kristina Hill'}.
              </div>
            )}
          </div>
        )}

        {st.rejectionHistory.length > 0 && (
          <div className="pf-maxw640">
            <EyebrowLabel style={{ marginBottom: 6 }}>Rejection History</EyebrowLabel>
            {st.rejectionHistory.map((h, i) => (
              <div key={i} className="pf-history-row">
                <Icon name="cancel" size={16} color="var(--fatal-text)" />
                <span className="pf-strong">{h.target}</span>
                <span className="pf-fg3">Rejected {h.date} · retargeted to {h.next}</span>
              </div>
            ))}
          </div>
        )}

        <Field label="Date Submitted"><DateField width="178px" /></Field>
        <Field label="Status Date"><DateField width="178px" /></Field>
        <Field label="Embargo Date"><DateField width="178px" /></Field>
        <Field label="Embargo Time">
          <div className="pf-row pf-gap8">
            <DateField time width="178px" />
            <Select options={TIMEZONE_OPTIONS} {...bind('timezone')} width="100px" />
          </div>
        </Field>
        <div>
          <div className="pf-label pf-mb0">Planned Cost</div>
          <div className="pf-14 pf-mt2">
            {'$' + (st.planBudget || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <Field label="Actual Cost">
          <MoneyField {...bind('actualCost')} width="150px" />
        </Field>
        <div>
          <div className="pf-label pf-mb6">Outcome Comments</div>
          <CommentComposer layout="stacked" width="100%" height="76px" />
        </div>
        <div>
          <div className="pf-label pf-label--bold pf-mb10">
            Attach Final Publication <Icon name="info" size={16} color="var(--high-emphasis)" title="Attach Final Publication" />
          </div>
          <DropZone newDocumentLabel="" />
        </div>
      </div>
    </div>
  );
}
