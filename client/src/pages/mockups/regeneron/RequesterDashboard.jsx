import React from 'react';
import { Link } from 'react-router-dom';
import { Button, DataTable, Icon } from '../../../ds/pubpro';
import { MY_SUBMISSIONS, REQUESTER, fmt } from './data';
import { Shell, StatusPill, StepChevrons } from './shared';

const COLS = [
  { header: 'Record ID', width: '108px' },
  { header: 'Title', width: 'minmax(180px, 2.2fr)' },
  { header: 'Type', width: '88px' },
  { header: 'Status', width: '214px' },
  { header: 'Progress', width: 'minmax(120px, 1fr)' },
  { header: 'Next step', width: 'minmax(200px, 1.8fr)' },
  { header: 'Requested review date', width: '96px' },
];
const template = COLS.map(c => c.width).join(' ');

export default function RequesterDashboard() {
  return (
    <Shell>
      <main className="rgm-page">
        <section className="rgm-hero" aria-label="Start a submission">
          <div className="rgm-hero-copy">
            <span className="pp-eyebrow">Welcome back, {REQUESTER.first}</span>
            <span className="pp-section">Need something cleared?</span>
            <p>Publications, student project proposals and open-source releases all start here. Answer a few questions and we route it to the right reviewers.</p>
          </div>
          <Link to="/clearance/new-spp" tabIndex={-1}>
            <Button icon="add_circle" className="rgm-start">Start New Submission</Button>
          </Link>
        </section>

        <section className="rgm-group" aria-labelledby="rgm-mine">
          <div className="rgm-section-head">
            <span id="rgm-mine" className="pp-subsection">My submissions in flight ({MY_SUBMISSIONS.length})</span>
          </div>
          <DataTable columns={COLS} style={{ overflow: 'visible' }}>
            {MY_SUBMISSIONS.map(r => {
              const action = !!r.action;
              return (
                <div key={r.id} className={'rgm-row' + (action ? ' rgm-row--action' : '')} style={{ gridTemplateColumns: template }}>
                  <span className="rgm-cell rgm-id">{r.id}</span>
                  <span className="rgm-cell rgm-title">{r.title}</span>
                  <span className="rgm-cell">{r.type}</span>
                  <span className="rgm-cell"><StatusPill status={r.status} /></span>
                  <span className="rgm-cell"><StepChevrons dates={r.stepDates} returnedAt={r.returnedAt} /></span>
                  <span className="rgm-cell">
                    {action ? (
                      <span className="rgm-next">
                        <span className="rgm-action-label"><Icon name="priority_high" size={16} color="var(--warn-text)" />Action needed: respond to revisions</span>
                        <span className="rgm-sub">{r.next}</span>
                        <Button icon="edit_note">Respond to revisions</Button>
                      </span>
                    ) : r.next}
                  </span>
                  <span className="rgm-cell">{fmt(r.reviewDate)}</span>
                </div>
              );
            })}
          </DataTable>
          <a className="rgm-past" href="#past">View past submissions</a>
        </section>
      </main>
    </Shell>
  );
}
