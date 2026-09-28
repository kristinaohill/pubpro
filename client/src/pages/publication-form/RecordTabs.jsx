// Task Options, Documents and Audit Trail tabs.
import React from 'react';
import { Button, DropZone, Icon, Radio, Select, TextArea, TextField } from '../../ds/pubpro';
import { DELEGATE_OPTIONS, REASSIGN_FROM_OPTIONS } from './data';
import { Card, Empty, FormField, ListBox, ListRow, Pair, Stack, TabHead, Tag } from './ui';
import './tabs-d.css';

export function TaskOptionsTab({ st, set, bind }) {
  return (
    <Stack>
      <TabHead title="Task Options" sub="Hand this publication to someone else, or bring in a collaborator." />

      <Card title="Delegate">
        <FormField id="pfxd-delegate-to" label="User to delegate to:">
          <Select id="pfxd-delegate-to" options={DELEGATE_OPTIONS} placeholder="Please select" {...bind('delegateTo')} width="100%" />
        </FormField>
        <FormField id="pfxd-delegate-comments" label="Comments:">
          <TextArea id="pfxd-delegate-comments" width="100%" height="68px" />
        </FormField>
        <div className="pfxd-actions pfxd-actions--end">
          <Button variant="primary">Send Delegation</Button>
        </div>
      </Card>

      <Card title="Collaborate">
        <FormField id="pfxd-collab-with" label="User to collaborate with:">
          <TextField id="pfxd-collab-with" iconBefore="search" placeholder="Search for user" width="100%" />
        </FormField>
        <FormField id="pfxd-collab-comments" label="Comments:">
          <TextArea id="pfxd-collab-comments" width="100%" height="68px" />
        </FormField>
        <div className="pfxd-actions pfxd-actions--end">
          <Button variant="primary">Send Collaboration Request</Button>
        </div>
      </Card>

      <Card title="Reassign">
        <fieldset className="pfx-fieldset">
          <legend className="pfx-label">Reassign Type:</legend>
          <div className="pfxd-radios">
            <Radio checked={st.reassignType === 'current'} label="Current User" onChange={() => set({ reassignType: 'current' })} />
            <Radio checked={st.reassignType === 'owner'} label="Owner" onChange={() => set({ reassignType: 'owner' })} />
          </div>
        </fieldset>
        <Pair>
          <FormField id="pfxd-reassign-from" label="Reassign User From:">
            <Select id="pfxd-reassign-from" options={REASSIGN_FROM_OPTIONS} placeholder="Please select" {...bind('reassignFrom')} width="100%" />
          </FormField>
          <div />
        </Pair>
        <div className="pfxd-actions pfxd-actions--end">
          <Button variant="primary">Confirm Reassignment</Button>
        </div>
      </Card>
    </Stack>
  );
}

export function DocumentsTab() {
  return (
    <Stack>
      <TabHead title="Documents" sub="Files attached to this publication." />
      <Card title="Upload">
        <DropZone />
      </Card>
    </Stack>
  );
}

/** Tag colour for an Activity Log result (display only). */
const resultTone = result => {
  if (/approv|complete|accept|reinstat/i.test(result)) return 'green';
  if (/change|pending/i.test(result)) return 'amber';
  if (/reject|cancel|declin|retarget/i.test(result)) return 'red';
  return 'grey';
};

export function AuditTab({ st, recordId }) {
  const rows = (st.audit || [])
    .concat(st.rejectionHistory.map(h => ({ action: 'Rejected by ' + h.target + ' — retargeted to ' + h.next, participants: h.by || '', start: h.date, completed: h.date, result: 'Retarget', active: false, comment: '' })));
  const files = st.historyFiles || [];

  return (
    <Stack>
      <TabHead title="Audit Trail" sub="Every action taken on this record, newest last." />

      <Card title="Publication history">
        {files.length > 0 && (
          <ListBox>
            {files.map(f => (
              <ListRow key={f.suffix} className="pfxd-file-row">
                <Icon name="description" size={22} color="var(--high-emphasis)" />
                <div className="pfxd-grow">
                  <span className="pfxd-strong">{recordId}-{f.suffix}</span>
                  <span className="pfxd-note">Created: {f.created} {f.by}</span>
                </div>
                <Button variant="secondary">View</Button>
              </ListRow>
            ))}
          </ListBox>
        )}
        {files.length === 0 && <Empty>Approved review documents appear here once rounds are signed off.</Empty>}
      </Card>

      <Card title="Activity log" meta={`${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`}>
        {rows.length > 0 && (
          <div className="pfxd-timeline">
            {rows.map((row, i) => {
              const hasCompleted = row.completed && row.completed !== '-';
              return (
                <div key={i} className={'pfxd-entry' + (row.active ? ' pfxd-entry--active' : '')}>
                  <div className="pfxd-entry-rail" aria-hidden="true">
                    <span className="pfxd-entry-dot">
                      <Icon name={row.active ? 'autorenew' : 'check_circle'} size={18} />
                    </span>
                    {i < rows.length - 1 && <span className="pfxd-entry-line" />}
                  </div>
                  <div className="pfxd-entry-body">
                    <div className="pfxd-entry-title">
                      <span className="pfxd-entry-action">{row.action}</span>
                      {row.result
                        ? <Tag tone={resultTone(row.result)}>{row.result}</Tag>
                        : row.active && <Tag tone="green">In progress</Tag>}
                    </div>
                    <span className="pfxd-text">
                      {row.start ? 'Started ' + row.start + ' · ' : ''}{hasCompleted ? 'Completed ' + row.completed : 'Not completed'}
                    </span>
                    {row.participants && <span className="pfxd-entry-people pfxd-preline">{row.participants}</span>}
                    {row.comment && <span className="pfxd-note pfxd-preline">{row.comment}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {rows.length === 0 && <Empty>No activity yet. Saving the record starts the log.</Empty>}
      </Card>
    </Stack>
  );
}
