// Task Options, Documents and Audit Trail tabs.
import React from 'react';
import { Button, DropZone, Field, Icon, Radio, SectionHeading, Select, TextArea, TextField } from '../../ds/pubpro';
import { DELEGATE_OPTIONS, REASSIGN_FROM_OPTIONS } from './data';

export function TaskOptionsTab({ st, set, bind }) {
  return (
    <div className="pf-stack22">
      <SectionHeading>Task Options</SectionHeading>
      <div className="pf-divided-block pf-pb20">
        <SectionHeading level="subsection" style={{ marginBottom: 14 }}>Delegate</SectionHeading>
        <div className="pf-inset pf-stack14">
          <Field label="User to delegate to:" width="300px">
            <Select options={DELEGATE_OPTIONS} placeholder="Please select" {...bind('delegateTo')} width="100%" />
          </Field>
          <Field label="Comments:">
            <TextArea width="100%" height="68px" />
          </Field>
          <div className="pf-justify-end">
            <Button variant="primary">Send Delegation</Button>
          </div>
        </div>
      </div>
      <div className="pf-divided-block pf-pb20">
        <SectionHeading level="subsection" style={{ marginBottom: 14 }}>Collaborate</SectionHeading>
        <div className="pf-inset pf-stack14">
          <Field label="User to collaborate with:" width="300px">
            <TextField iconBefore="search" placeholder="Search for user" width="100%" />
          </Field>
          <Field label="Comments:">
            <TextArea width="100%" height="68px" />
          </Field>
          <div className="pf-justify-end">
            <Button variant="primary">Send Collaboration Request</Button>
          </div>
        </div>
      </div>
      <div>
        <SectionHeading level="subsection" style={{ marginBottom: 14 }}>Reassign</SectionHeading>
        <div className="pf-inset">
          <div className="pf-label pf-mb8">Reassign Type:</div>
          <div className="pf-row pf-gap26">
            <Radio checked={st.reassignType === 'current'} label="Current User" onChange={() => set({ reassignType: 'current' })} />
            <Radio checked={st.reassignType === 'owner'} label="Owner" onChange={() => set({ reassignType: 'owner' })} />
          </div>
          <div className="pf-mt14">
            <Field label="Reassign User From:" width="300px">
              <Select options={REASSIGN_FROM_OPTIONS} placeholder="Please select" {...bind('reassignFrom')} width="100%" />
            </Field>
          </div>
          <div className="pf-justify-end pf-mt14">
            <Button variant="primary">Confirm Reassignment</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentsTab() {
  return (
    <div>
      <SectionHeading style={{ marginBottom: 16 }}>Documents</SectionHeading>
      <DropZone style={{ margin: '0 22px' }} />
    </div>
  );
}

export function AuditTab({ st, recordId }) {
  const rows = (st.audit || [])
    .concat(st.rejectionHistory.map(h => ({ action: 'Rejected by ' + h.target + ' — retargeted to ' + h.next, participants: h.by || '', start: h.date, completed: h.date, result: 'Retarget', active: false, comment: '' })));
  const files = st.historyFiles || [];

  return (
    <div className="pf-stack24">
      <SectionHeading>Audit Trail</SectionHeading>
      <div className="pf-divided-block pf-pb20">
        <SectionHeading level="subsection" style={{ marginBottom: 14 }}>Publication History</SectionHeading>
        {files.map(f => (
          <div key={f.suffix} className="pf-filecard pf-ml22">
            <div>
              <div className="pf-filecard-name">{recordId}-{f.suffix}</div>
              <div className="pf-faint13 pf-mt3">Created: {f.created} {f.by}</div>
            </div>
            <Button variant="secondary">View</Button>
          </div>
        ))}
        {files.length === 0 && <div className="empty-state pf-ml22">Approved review documents appear here once rounds are signed off.</div>}
      </div>
      <div>
        <SectionHeading level="subsection" style={{ marginBottom: 16 }}>Activity Log</SectionHeading>
        <div className="pf-audit">
          <div className="pf-audit-grid pf-audit-head">
            <div className="pf-center">Status</div><div>Action</div><div>Participants</div><div>Start Date</div><div>Completed Date</div><div>Result</div><div>Comments</div>
          </div>
          {rows.map((row, i) => (
            <div key={i} className="pf-audit-grid pf-audit-row" style={{ background: row.active ? 'var(--ok-band)' : 'transparent' }}>
              <div className="pf-justify-center">
                <Icon name={row.active ? 'autorenew' : 'check_circle'} size={21} color={row.active ? 'var(--ok)' : 'var(--fg-1)'} />
              </div>
              <div className="pf-min0">{row.action}</div>
              <div className="pf-min0 pf-preline">{row.participants}</div>
              <div>{row.start}</div>
              <div>{row.completed}</div>
              <div className="pf-iconrow pf-gap6">
                {row.result && <><Icon name="check" size={18} />{row.result}</>}
              </div>
              <div className="pf-min0 pf-note12 pf-preline">{row.comment}</div>
            </div>
          ))}
          {rows.length === 0 && <div className="empty-state">No activity yet. Saving the record starts the log.</div>}
        </div>
      </div>
    </div>
  );
}
