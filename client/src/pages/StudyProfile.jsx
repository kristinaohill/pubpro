import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, DataTable, DetailGrid, FormActionBar, InlineMessage, Panel, Pill, RecordHeader } from '../ds/pubpro';
import { api } from '../api';
import { STUDY_DIRECTORY } from './publication-form/data';
import { fmtSaved } from './Publications';
import './StudyProfile.css';

export const STUDY_TONE = { 'In Progress': 'active', Completed: 'draft', 'On Hold': 'hold', Cancelled: 'cancelled' };

/** Saved publications that list this study on their Studies tab. */
export const pubsForStudy = (pubs, studyId) =>
  (pubs || []).filter(p => p.data && !p.data.noStudy && (p.data.selectedStudies || []).includes(studyId));

const outcomeOf = p => (p.status === 'Cancelled' ? 'Cancelled' : (p.data && p.data.outcomeStatus) || p.status || '—');

const PUB_COLUMNS = [
  { header: 'Publication ID', width: '170px', sortable: true },
  { header: 'Publication Title', width: 'minmax(220px,2fr)' },
  { header: 'Publication Type', width: '140px' },
  { header: 'Product', width: 'minmax(150px,1fr)' },
  { header: 'Outcome', width: '130px' },
  { header: 'Last Updated', width: '110px' },
];

const ARM_COLUMNS = [
  { header: 'Arm', width: 'minmax(160px,1fr)', bold: true },
  { header: 'Intervention', width: 'minmax(240px,2fr)' },
  { header: 'Participants', width: '120px', align: 'right' },
];

const num = n => (n == null ? '' : Number(n).toLocaleString('en-US'));

const csvCell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';

/** Study record (Searches › Studies): the study's details and the publications that use it. */
export default function StudyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const study = STUDY_DIRECTORY.find(s => s.id === id);
  const [pubs, setPubs] = useState(null);
  const [error, setError] = useState('');
  const [dir, setDir] = useState('asc');

  const load = () => {
    setError('');
    api.get('/pp-publications?include=data')
      .then(list => setPubs(pubsForStudy(list, id)))
      .catch(err => setError(err.message));
  };
  useEffect(() => { if (study) load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!study) {
    return (
      <div className="sp-page sp-pad">
        <InlineMessage kind="error">There is no study {id}.</InlineMessage>
        <div><Button variant="secondary" icon="arrow_back" onClick={() => navigate('/studies')}>Back to Studies</Button></div>
      </div>
    );
  }

  const sorted = (pubs || []).slice().sort((a, b) => {
    const c = String(a.record_id).localeCompare(String(b.record_id));
    return dir === 'asc' ? c : -c;
  });

  const downloadCsv = () => {
    const lines = [PUB_COLUMNS.map(c => csvCell(c.header)).join(',')]
      .concat(sorted.map(p => [p.record_id, p.title, p.pub_type, p.product, outcomeOf(p), fmtSaved(p.updated_at)].map(csvCell).join(',')));
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Publications-by-Study-' + study.id + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const blank = v => (v ? { value: v } : { value: 'Not recorded', empty: true });
  const details = [
    { label: 'ID', value: <strong>{study.id}</strong> },
    { label: 'Status', value: <Pill tone={STUDY_TONE[study.status] || 'draft'}>{study.status}</Pill> },
    { label: 'Title', value: study.title, full: true },
    { label: 'Related Product', value: study.product },
    { label: 'Product Class', value: study.area },
    { label: 'Clinical Study Type', value: study.studyType },
    { label: 'Phase', value: study.phase },
    { label: 'Responsible Manager', value: study.manager },
    { label: 'Alternate Study ID', value: study.altId },
    { label: 'Sponsor Type', value: study.sponsorType },
    { label: 'Sponsoring Company', value: study.sponsor },
    { label: 'Interventional', value: study.interventional },
    { label: 'Pro-Retrospective', value: study.retro },
    { label: 'ClinicalTrials.gov Registration Number', ...blank(study.nct) },
    { label: 'Primary Outcome Result', ...blank(study.outcome) },
  ];
  const dates = [
    { label: 'Expected Completion Date', ...blank(study.expected) },
    { label: 'Interim Data Analysis Date', ...blank(study.interim) },
    { label: 'Data Lock Date', ...blank(study.lock) },
    { label: 'Submission Deadline', ...blank(study.deadline) },
    { label: 'Results Availability Status', ...blank(study.availability) },
    { label: 'Dissemination Decision', ...blank(study.dissemination) },
  ].concat(study.hasRationale ? [{ label: 'Rationale if Not Planned', value: study.rationale, full: true }] : []);
  const pct = study.enrollTarget ? Math.round((study.enrollActual / study.enrollTarget) * 100) : null;
  const design = [
    { label: 'Study Design', ...blank(study.design), full: true },
    { label: 'Study Population', ...blank(study.population), full: true },
    { label: 'Principal Investigator', ...blank(study.pi) },
    { label: 'Study Start', ...blank(study.start) },
    { label: 'Treatment Duration', ...blank(study.duration) },
    { label: 'Planned Enrollment', ...blank(num(study.enrollTarget)) },
    { label: study.status === 'Completed' || study.status === 'Cancelled' ? 'Final Enrollment' : 'Enrolled to Date',
      ...blank(study.enrollActual != null ? num(study.enrollActual) + (pct != null ? ' (' + pct + '% of target)' : '') : '') },
    { label: 'Sites / Countries', ...blank(study.sites ? num(study.sites) + ' sites in ' + study.countries + (study.countries === 1 ? ' country' : ' countries') : '') },
  ];
  const arms = study.arms || [];

  return (
    <div className="sp-page">
      <RecordHeader
        icon="science"
        title={study.id + ': ' + study.title}
        task="Study"
        subtitle={study.product + ' · ' + study.area}
        meta={[<Pill tone={STUDY_TONE[study.status] || 'draft'}>{study.status}</Pill>, study.altId, 'Phase ' + study.phase]}
      />

      <div className="sp-body">
        <Panel icon="info" title="Study Details">
          <DetailGrid items={details} columns={2} style={{ padding: '16px 18px 20px' }} />
        </Panel>

        <Panel icon="biotech" title="Study Design" description={study.summary}>
          {study.note && <div className="sp-pad-sm"><InlineMessage kind="warning">{study.note}</InlineMessage></div>}
          <DetailGrid items={design} columns={3} style={{ padding: '16px 18px 20px' }} />
        </Panel>

        <div className="sp-two">
          <Panel icon="groups" title="Treatment Arms" count={arms.length}>
            {arms.length === 0 ? <div className="empty-state empty-state--inset">No arms recorded.</div> : (
              <DataTable
                columns={ARM_COLUMNS}
                headerTone="knowledge"
                bordered={false}
                rows={arms.map(([arm, intervention, n]) => ({ key: arm, cells: [arm, intervention, num(n)] }))}
                footer={['Total', '', num(arms.reduce((a, x) => a + (x[2] || 0), 0))]}
              />
            )}
          </Panel>

          <Panel icon="flag" title="Endpoints">
            <div className="sp-endpoints">
              <div className="sp-label">Primary Endpoint</div>
              <div>{study.primary || 'Not recorded'}</div>
              <div className="sp-label">Key Secondary Endpoints</div>
              {(study.secondary || []).length > 0
                ? <ul className="sp-list">{study.secondary.map(x => <li key={x}>{x}</li>)}</ul>
                : <div>Not recorded</div>}
            </div>
          </Panel>
        </div>

        <Panel icon="event" title="Milestones & Results">
          <DetailGrid items={dates} columns={3} style={{ padding: '16px 18px 20px' }} />
        </Panel>

        <Panel
          icon="menu_book"
          title="Publications by Study"
          count={pubs ? pubs.length : undefined}
          actions={<Button variant="tertiary" icon="download" onClick={downloadCsv} disabled={!pubs || pubs.length === 0}>CSV</Button>}
          onRefresh={load}
        >
          {error && <div className="sp-pad-sm"><InlineMessage kind="error">{error}</InlineMessage></div>}
          {pubs === null && !error && <div className="empty-state empty-state--inset">Loading…</div>}
          {pubs && pubs.length === 0 && (
            <div className="empty-state empty-state--inset">No publications use this study yet. Link it from a publication&rsquo;s Studies tab.</div>
          )}
          {pubs && pubs.length > 0 && (
            <DataTable
              columns={PUB_COLUMNS}
              headerTone="knowledge"
              bordered={false}
              sortBy={0}
              sortDir={dir}
              onSort={() => setDir(d => (d === 'asc' ? 'desc' : 'asc'))}
              onRowClick={r => navigate('/publication/' + r.id)}
              rows={sorted.map(p => ({
                key: p.id,
                id: p.id,
                cells: [<span className="sp-link">{p.record_id}</span>, p.title, p.pub_type || '—', p.product || '—', outcomeOf(p), fmtSaved(p.updated_at)],
              }))}
            />
          )}
        </Panel>
      </div>

      <FormActionBar
        className="sp-no-print"
        left={<Button variant="secondary" icon="arrow_back" onClick={() => navigate('/studies')}>Back to Studies</Button>}
        right={<Button variant="primary" icon="print" onClick={() => window.print()}>Print</Button>}
      />
    </div>
  );
}
