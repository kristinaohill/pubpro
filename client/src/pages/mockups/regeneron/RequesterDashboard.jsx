import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, DataTable, Icon, Panel } from '../../../ds/pubpro';
import PageHeader from '../../../components/PageHeader';
import { MY_SUBMISSIONS, REQUESTER, fmt } from './data';
import { Shell, StatusPill, StepChevrons } from './shared';

const COLS = [
  { header: 'Submission', width: 'minmax(220px, 2.2fr)' },
  { header: 'Status', width: '224px' },
  { header: 'Progress', width: 'minmax(130px, 1fr)' },
  { header: 'Next Step', width: 'minmax(220px, 1.8fr)' },
  { header: 'Requested Review Date', width: '110px' },
];
const template = COLS.map(c => c.width).join(' ');

export default function RequesterDashboard() {
  const navigate = useNavigate();
  return (
    <Shell>
      <main className="rgm-page">
        <PageHeader title={'Welcome back, ' + REQUESTER.first} description="Your clearance submissions" />

        <Panel icon="add_circle" title="Need something cleared?">
          <div className="rgm-start">
            <span>Publications, student project proposals and open-source releases all start here. Answer a few questions and we route it to the right reviewers.</span>
            <Button icon="add" onClick={() => navigate('/clearance/new-spp')}>Start New Submission</Button>
          </div>
        </Panel>

        <Panel
          icon="pending_actions"
          title="My submissions in flight"
          count={MY_SUBMISSIONS.length}
          actions={<a href="#past">View past submissions</a>}
        >
          <DataTable columns={COLS} headerTone="knowledge" style={{ overflow: 'visible' }}>
            {MY_SUBMISSIONS.map(r => (
              <div key={r.id} className="rgm-row" style={{ gridTemplateColumns: template }}>
                <span className="rgm-cell">
                  <a href={'#' + r.id} className="rgm-id">{r.id}</a> <span className="rgm-type">· {r.type}</span>
                  <span className="rgm-title">{r.title}</span>
                </span>
                <span className="rgm-cell"><StatusPill status={r.status} /></span>
                <span className="rgm-cell"><StepChevrons dates={r.stepDates} returnedAt={r.returnedAt} /></span>
                <span className="rgm-cell">
                  {r.action ? (
                    <span className="rgm-next">
                      <span className="rgm-warn"><Icon name="priority_high" size={15} />Action needed: respond to revisions</span>
                      <span className="rgm-meta">{r.next}</span>
                      <Button variant="secondary" icon="edit_note">Respond to Revisions</Button>
                    </span>
                  ) : r.next}
                </span>
                <span className="rgm-cell">{fmt(r.reviewDate)}</span>
              </div>
            ))}
          </DataTable>
        </Panel>
      </main>
    </Shell>
  );
}
