import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import {
  Button, Checkbox, DataTable, EyebrowLabel, Field, FormActionBar, Icon, IconButton, InlineMessage, Panel, Pill,
  RecordHeader, SectionHeading, Select, SideTabRail, StatCard, TextField, Tooltip,
} from '../ds/pubpro';
import { STUDY_DIRECTORY } from './publication-form/data';
import './ExternalAuthorProfile.css';

const TABS = [
  { id: 'debarments', label: 'DEBARMENTS', icon: 'gavel' },
  { id: 'agreements', label: 'AGREEMENTS', icon: 'description' },
  { id: 'studies', label: 'STUDIES', icon: 'science' },
  { id: 'publications', label: 'PUBLICATIONS', icon: 'menu_book' },
  { id: 'audit', label: 'AUDIT TRAIL', icon: 'account_tree' },
];

const DAY = 86400000;
const YEAR_DAYS = 365;

const US_STATES = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy', 'Sweden', 'Japan', 'Australia', 'Other'];

const DEBARMENT_CHECKS = [
  { id: 1, sam: 0, oig: 0, fda: 0, status: 'Clear', searchedAt: '9/6/2024 12:21:53 PM', searchUser: 'Demo Submitter', show: true },
  { id: 2, sam: 0, oig: 0, fda: 0, status: 'Clear', searchedAt: '8/31/2026 5:32:35 PM', searchUser: 'Joe Submitter', show: true },
];

const PENDING_AGREEMENTS = [
  { id: 1, name: 'Kristina Oconnell', email: 'Koconnell920@gmail.com', submittedBy: 'Kristina Hill', createdOn: '5/18/2026' },
];

const SIGNED_COI = { file: 'ConflictOfInterest-Kristina Oconnell-2026-07-07.pdf', created: '7/7/2026 11:36 AM', by: 'Kristina Hill', signedOn: '7/7/2026' };

const PENDING_COI = [
  { id: 1, name: 'Kristina Oconnell', email: 'Koconnell920@gmail.com', submittedBy: 'Joe Submitter', createdOn: '8/19/2026' },
  { id: 2, name: 'Kristina Oconnell', email: 'Koconnell920@gmail.com', submittedBy: 'Kristina Hill', createdOn: '8/7/2026' },
  { id: 3, name: 'Kristina Oconnell', email: 'Koconnell920@gmail.com', submittedBy: 'Kristina Hill', createdOn: '7/7/2026' },
  { id: 4, name: 'Kristina Oconnell', email: 'Koconnell920@gmail.com', submittedBy: 'Kristina Hill', createdOn: '6/11/2026' },
  { id: 5, name: 'Kristina Oconnell', email: 'Koconnell920@gmail.com', submittedBy: 'Kristina Hill', createdOn: '5/18/2026' },
  { id: 6, name: 'Kristina Oconnell', email: 'Koconnell920@gmail.com', submittedBy: 'Kristina Hill', createdOn: '3/14/2024' },
];

const STUDY_TONE = { 'In Progress': 'active', Completed: 'draft', 'On Hold': 'hold', Cancelled: 'cancelled' };

const INITIAL_AUDIT = [
  { action: 'Profile created', user: 'Joe Submitter', at: '9/6/2024 12:20 PM', detail: 'External author record opened', icon: 'add_circle', color: 'var(--ok)' },
  { action: 'Debarment check run', user: 'Demo Submitter', at: '9/6/2024 12:21 PM', detail: 'Clear — SAM 0, OIG 0, FDA 0', icon: 'gavel', color: 'var(--info-icon)' },
  { action: 'Authorship agreement sent', user: 'Kristina Hill', at: '5/18/2026 9:05 AM', detail: 'Awaiting signature', icon: 'description', color: 'var(--info-icon)' },
  { action: 'COI form signed', user: 'Kristina Oconnell', at: '7/7/2026 11:36 AM', detail: SIGNED_COI.file, icon: 'task', color: 'var(--ok)' },
  { action: 'Debarment check run', user: 'Joe Submitter', at: '8/31/2026 5:32 PM', detail: 'Clear — SAM 0, OIG 0, FDA 0', icon: 'gavel', color: 'var(--info-icon)' },
];

const INITIAL_FORM = {
  firstName: 'Kristina',
  middleInitial: '',
  lastName: 'Oconnell',
  displayName: 'Oconnell K',
  email: 'Koconnell920@gmail.com',
  confirmEmail: 'Koconnell920@gmail.com',
  institution: '',
  street: '2326 Sunnyside Ave',
  city: 'Charleston',
  state: 'South Carolina',
  country: 'United States',
  zip: '29403',
};

const REQUIRED = ['firstName', 'lastName', 'displayName', 'email', 'confirmEmail', 'state', 'country'];

const today = () => new Date(new Date().toDateString());
const daysSince = mdy => Math.round((today() - new Date(mdy)) / DAY);
const stamp = () => new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const addYear = mdy => { const d = new Date(mdy); d.setFullYear(d.getFullYear() + 1); return d.toLocaleDateString('en-US'); };
const ago = n => (n <= 0 ? 'today' : n === 1 ? '1 day ago' : n < 60 ? n + ' days ago' : Math.round(n / 30) + ' months ago');

/* ---------- small pieces ---------- */

function InfoTip({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="eap-tip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} tabIndex={0}>
      <Icon name="info" size={16} color="var(--high-emphasis)" />
      {open && <Tooltip title={title} align="left">{children}</Tooltip>}
    </span>
  );
}

const PersonCell = ({ name }) => (
  <span className="eap-person"><Icon name="article" size={17} color="var(--text-meta)" />{name}</span>
);

/** Pending-request table with a sortable Created On column (newest first by default). */
function RequestTable({ rows, empty }) {
  const [dir, setDir] = useState('desc');
  const sorted = rows.slice().sort((a, b) => (new Date(a.createdOn) - new Date(b.createdOn)) * (dir === 'asc' ? 1 : -1));
  return (
    <DataTable
      headerTone="knowledge"
      columns={[
        { header: 'Name', width: 'minmax(160px,1.2fr)' },
        { header: 'Email', width: 'minmax(180px,1.4fr)' },
        { header: 'Submitted By', width: 'minmax(120px,1fr)' },
        { header: 'Created On', width: '120px', sortable: true },
        { header: 'Status', width: '170px' },
      ]}
      sortBy={3}
      sortDir={dir}
      onSort={() => setDir(d => (d === 'asc' ? 'desc' : 'asc'))}
      rows={sorted.map(r => {
        const n = daysSince(r.createdOn);
        const stale = n > YEAR_DAYS;
        return {
          key: r.id,
          cells: [
            <PersonCell name={r.name} />,
            r.email,
            r.submittedBy,
            r.createdOn,
            <Pill tone={stale ? 'cancelled' : 'hold'}>{stale ? 'Request expired' : 'Awaiting · ' + ago(n)}</Pill>,
          ],
        };
      })}
    >
      {rows.length === 0 ? <div className="eap-empty">{empty}</div> : undefined}
    </DataTable>
  );
}

/* ---------- Author details (always visible, above the tabs) ---------- */

function AuthorDetails({ form, setField, active, onToggleActive, na, manual, onToggleNa, onToggleManual, missing }) {
  const bind = key => ({ value: form[key], onChange: e => setField(key, e.target.value) });
  const req = key => REQUIRED.includes(key);
  const flag = key => (missing.includes(key) ? 'Required' : undefined);
  const emailMismatch = form.email && form.confirmEmail && form.email.trim().toLowerCase() !== form.confirmEmail.trim().toLowerCase();

  return (
    <section className="eap-details">
      <div className="eap-details-head">
        <SectionHeading subtitle="Who this author is and where to reach them. Changes to name or institution call for a fresh debarment check.">
          Author Details
        </SectionHeading>
        <div className="eap-push">
          <Checkbox checked={active} onChange={onToggleActive} label="Active Author" />
        </div>
      </div>

      <div className="eap-groups">
        <div className="eap-group">
          <EyebrowLabel>Name</EyebrowLabel>
          <div className="eap-grid eap-grid--name">
            <Field label="First Name" required={req('firstName')} help={flag('firstName')}><TextField {...bind('firstName')} /></Field>
            <Field label="Middle Initial"><TextField {...bind('middleInitial')} maxLength={1} /></Field>
            <Field label="Last Name" required={req('lastName')} help={flag('lastName')}><TextField {...bind('lastName')} /></Field>
          </div>
          <Field
            label={<span className="eap-label-row">Display Name <InfoTip title="Display Name">How the author appears in bylines and author lists, e.g. “Oconnell K”.</InfoTip></span>}
            required={req('displayName')}
            help={flag('displayName')}
          >
            <TextField {...bind('displayName')} />
          </Field>
        </div>

        <div className="eap-group">
          <EyebrowLabel>Contact</EyebrowLabel>
          <Field label="Email" required={req('email')} help={flag('email')}>
            <TextField {...bind('email')} iconBefore="mail" type="email" />
          </Field>
          <Field label="Confirm Email" required={req('confirmEmail')} help={flag('confirmEmail')}>
            <TextField {...bind('confirmEmail')} iconBefore="mail" type="email" />
          </Field>
          {emailMismatch && <InlineMessage kind="error">The two email addresses don&rsquo;t match.</InlineMessage>}

          <div className="eap-affil">
            <div className="eap-affil-label">Institution/Affiliation</div>
            <div className="eap-affil-options">
              <Checkbox checked={na} onChange={onToggleNa} label="N/A" />
              <Checkbox checked={manual} onChange={onToggleManual} label="Manually enter institution/affiliation" />
            </div>
            {manual && (
              <Field label="Institution/Affiliation" required>
                <TextField {...bind('institution')} placeholder="e.g. UCLA School of Medicine" />
              </Field>
            )}
          </div>
        </div>

        <div className="eap-group eap-group--wide">
          <EyebrowLabel>Mailing Address</EyebrowLabel>
          <div className="eap-grid eap-grid--address">
            <div className="eap-span2"><Field label="Street Address"><TextField {...bind('street')} /></Field></div>
            <Field label="City"><TextField {...bind('city')} /></Field>
            <Field label="State/Province" required={req('state')} help={flag('state')}>
              <Select options={US_STATES} placeholder="Please select" {...bind('state')} width="100%" />
            </Field>
            <Field label="Country" required={req('country')} help={flag('country')}>
              <Select options={COUNTRIES} placeholder="Please select" {...bind('country')} width="100%" />
            </Field>
            <Field label="Zip/Postal Code"><TextField {...bind('zip')} /></Field>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Tabs ---------- */

function DebarmentsTab({ checks, authorName, onRun, onRemove, onToggleShow }) {
  const latest = checks[checks.length - 1];
  const hits = c => c.sam + c.oig + c.fda;
  const lastAge = latest ? daysSince(latest.searchedAt.split(' ')[0]) : null;
  const overdue = lastAge == null || lastAge > YEAR_DAYS;
  return (
    <div className="eap-stack">
      <SectionHeading subtitle="Screening against the SAM, OIG and FDA exclusion lists.">Exclusions &amp; Debarments</SectionHeading>

      <div className="eap-stats">
        <StatCard label="Last Checked" value={latest ? latest.searchedAt.split(' ')[0] : 'Never'} icon="event" tone={overdue ? 'warning' : 'info'} />
        <StatCard label="Latest Result" value={latest ? (hits(latest) ? hits(latest) + ' possible matches' : 'Clear') : '—'} icon={latest && hits(latest) ? 'error' : 'verified'} tone={latest && hits(latest) ? 'fatal' : 'positive'} />
        <StatCard label="Checks on File" value={String(checks.length)} icon="history" tone="neutral" />
      </div>
      {overdue && <InlineMessage kind="warning">No debarment check in the last 12 months. Run one before this author is added to a publication.</InlineMessage>}

      <Panel
        icon="gavel"
        title="Debarment Check Possible Matches"
        count={checks.length}
        description="Tick Show Detail to see the matches found in each source."
        actions={<Button variant="secondary" icon="policy" onClick={onRun}>Run Debarment Checks</Button>}
      >
        <DataTable
          headerTone="knowledge"
          columns={[
            { header: 'Show Detail', width: '96px' },
            { header: 'Result', width: 'minmax(240px,2fr)' },
            { header: 'Status', width: '110px' },
            { header: 'Search Date & Time', width: '190px' },
            { header: 'Search User', width: 'minmax(120px,1fr)' },
            { header: '', width: '44px' },
          ]}
          rows={checks.slice().reverse().map(c => ({
            key: c.id,
            cells: [
              <Checkbox checked={!!c.show} onChange={() => onToggleShow(c.id)} title="Show detail" />,
              <div className="eap-result">
                <div>Found {hits(c)} possible {hits(c) === 1 ? 'match' : 'matches'} for {c.name || authorName}</div>
                {c.show && (
                  <div className="eap-sources">
                    {[['SAM', c.sam], ['OIG', c.oig], ['FDA', c.fda]].map(([src, n]) => (
                      <span key={src} className={'eap-source' + (n ? ' eap-source--hit' : '')}>{src} <strong>{n}</strong></span>
                    ))}
                  </div>
                )}
              </div>,
              <Pill tone={hits(c) ? 'overdue' : 'on-track'}>{hits(c) ? 'Review' : c.status}</Pill>,
              c.searchedAt,
              c.searchUser,
              <IconButton icon="close" tone="fatal" size={26} title="Remove check" onClick={() => onRemove(c.id)} />,
            ],
          }))}
        >
          {checks.length === 0 ? <div className="eap-empty">No checks on file. Use Run Debarment Checks to screen this author.</div> : undefined}
        </DataTable>
      </Panel>
    </div>
  );
}

function AgreementsTab({ agreements, coi, signedCoi, saving, onSendAgreement, onSendCoi }) {
  const coiCurrent = !!signedCoi && daysSince(signedCoi.signedOn) <= YEAR_DAYS;
  return (
    <div className="eap-stack">
      <SectionHeading subtitle="Authorship agreements and conflict-of-interest disclosures sent to this author.">Agreements</SectionHeading>

      <Panel
        icon="description"
        title="Pending Authorship Agreements"
        count={agreements.length}
        onRefresh={() => {}}
        actions={<Button variant="secondary" icon="send" onClick={onSendAgreement} disabled={saving}>Send Authorship Agreement</Button>}
      >
        <RequestTable rows={agreements} empty="No agreements waiting on this author." />
      </Panel>

      <Panel
        icon="verified_user"
        title="Conflict of Interest Forms"
        description="The signed form on file, and requests still awaiting the author."
        actions={<Button variant="secondary" icon="send" onClick={onSendCoi} disabled={saving}>Send Conflict of Interest Form</Button>}
      >
        {signedCoi ? (
          <div className="eap-filecard">
            <Icon name="picture_as_pdf" size={30} color="var(--fatal-text)" />
            <div className="eap-filecard-body">
              <div className="eap-filecard-name">{signedCoi.file}</div>
              <div className="eap-meta">Created {signedCoi.created} · {signedCoi.by}</div>
            </div>
            <Pill tone={coiCurrent ? 'active' : 'cancelled'}>{coiCurrent ? 'Current · expires ' + addYear(signedCoi.signedOn) : 'Expired'}</Pill>
            <Button variant="secondary" icon="visibility">View</Button>
          </div>
        ) : (
          <div className="eap-filecard eap-filecard--empty">
            <Icon name="warning" size={24} color="var(--warn-text)" />
            <div className="eap-filecard-body">No signed COI form on file. Send one to the author for signature.</div>
          </div>
        )}
        <div className="eap-subtable-title">Pending COI Requests <span className="eap-count">({coi.length})</span></div>
        <RequestTable rows={coi} empty="No COI requests waiting on this author." />
      </Panel>
    </div>
  );
}

function StudiesTab({ query, onQuery, selected, available, onAdd, onRemove }) {
  return (
    <div className="eap-stack">
      <SectionHeading subtitle="Studies this external author has contributed to or is linked with.">Studies</SectionHeading>

      <Panel icon="science" title="Linked Studies" count={selected.length}>
        <DataTable
          headerTone="knowledge"
          columns={[
            { header: 'Study ID', width: '100px', bold: true },
            { header: 'Title', width: 'minmax(220px,2fr)' },
            { header: 'Status', width: '130px' },
            { header: 'Submission Deadline', width: '160px' },
            { header: '', width: '44px' },
          ]}
          rows={selected.map(s => ({
            key: s.id,
            cells: [<Link to={'/study/' + s.id}>{s.id}</Link>, s.title, <Pill tone={STUDY_TONE[s.status] || 'draft'}>{s.status}</Pill>, s.deadline,
              <IconButton icon="close" tone="fatal" size={26} title="Unlink study" onClick={() => onRemove(s.id)} />],
          }))}
        >
          {selected.length === 0 ? <div className="eap-empty">No studies linked yet. Add one from the list below.</div> : undefined}
        </DataTable>
      </Panel>

      <Panel
        icon="search"
        title="Add a Study"
        actions={<div className="eap-search"><TextField iconBefore="search" value={query} onChange={onQuery} placeholder="Search by study ID, title, or product" /></div>}
      >
        <DataTable
          headerTone="knowledge"
          columns={[
            { header: 'Study ID', width: '100px', bold: true },
            { header: 'Study Title', width: 'minmax(220px,2fr)' },
            { header: 'Status', width: '130px' },
            { header: 'Related Product', width: '140px' },
            { header: 'Therapeutic Area', width: '140px' },
            { header: '', width: '90px' },
          ]}
          rows={available.map(s => ({
            key: s.id,
            cells: [<Link to={'/study/' + s.id}>{s.id}</Link>, s.title, <Pill tone={STUDY_TONE[s.status] || 'draft'}>{s.status}</Pill>, s.product, s.area,
              <Button variant="tertiary" icon="add" onClick={() => onAdd(s)}>Link</Button>],
          }))}
        >
          {available.length === 0 ? <div className="eap-empty">No studies match that search.</div> : undefined}
        </DataTable>
      </Panel>
    </div>
  );
}

function PublicationsTab({ rows, onOpen }) {
  return (
    <div className="eap-stack">
      <SectionHeading subtitle="Publications that list this person as an author.">Publications</SectionHeading>
      <Panel icon="menu_book" title="Publications for External Author" count={rows.length}>
        <DataTable
          headerTone="knowledge"
          onRowClick={onOpen}
          columns={[
            { header: 'Publication ID', width: '160px', bold: true },
            { header: 'Publication Title', width: 'minmax(220px,2fr)' },
            { header: 'Product', width: '130px' },
            { header: 'Publication Type', width: '130px' },
            { header: 'Review Status', width: '120px' },
            { header: 'Submitted By', width: '120px' },
          ]}
          rows={rows.map(p => ({
            key: p.id,
            savedId: p.savedId,
            cells: [<span className="eap-link">{p.id}</span>, p.title, p.product, p.type, <Pill tone={p.tone}>{p.status}</Pill>, p.submittedBy],
          }))}
        >
          {rows.length === 0 ? <div className="eap-empty">No saved publications list this author yet. Add them on a publication&rsquo;s Authors tab.</div> : undefined}
        </DataTable>
      </Panel>
    </div>
  );
}

function AuditTab({ rows }) {
  return (
    <div className="eap-stack">
      <SectionHeading subtitle="Every change and request on this author profile, newest first.">Audit Trail</SectionHeading>
      <DataTable
        headerTone="knowledge"
        columns={[
          { header: '', width: '44px' },
          { header: 'Action', width: 'minmax(180px,1fr)' },
          { header: 'User', width: '150px' },
          { header: 'Date', width: '170px' },
          { header: 'Detail', width: 'minmax(200px,1.4fr)' },
        ]}
        rows={rows.slice().reverse().map((r, i) => ({
          key: i,
          cells: [<Icon name={r.icon} size={20} color={r.color} />, r.action, r.user, r.at, <span className="eap-meta">{r.detail}</span>],
        }))}
      />
    </div>
  );
}

/* ---------- Page ---------- */

/* ---------- Saved profiles ---------- */

/** The design's example author, seeded once as a saved record (see SampleAuthor.jsx). */
export const SAMPLE_AUTHOR = {
  active: true,
  form: INITIAL_FORM,
  na: true,
  manual: false,
  checks: DEBARMENT_CHECKS,
  agreements: PENDING_AGREEMENTS,
  coi: PENDING_COI,
  signedCoi: SIGNED_COI,
  studies: [],
  audit: INITIAL_AUDIT,
  // The design's example publication rows; other authors list the saved publications that name them.
};

const blankAuthor = () => ({
  active: true,
  form: { firstName: '', middleInitial: '', lastName: '', displayName: '', email: '', confirmEmail: '', institution: '', street: '', city: '', state: '', country: 'United States', zip: '' },
  na: true,
  manual: false,
  checks: [],
  agreements: [],
  coi: [],
  signedCoi: null,
  studies: [],
  audit: [],
});

export const fromSavedAuthor = data => {
  const base = blankAuthor();
  return { ...base, ...data, form: { ...base.form, ...(data && data.form) } };
};

const nameOf = a => `${a.form.firstName} ${a.form.lastName}`.replace(/\s+/g, ' ').trim();

// Parts of the profile compared on save, so the audit trail can say what changed.
const SECTIONS = {
  Details: a => [a.form, a.active, a.na, a.manual],
  Debarments: a => [a.checks],
  Agreements: a => [a.agreements, a.coi],
  Studies: a => [a.studies],
};
const changedSections = (x, y) => Object.keys(SECTIONS).filter(k => JSON.stringify(SECTIONS[k](x)) !== JSON.stringify(SECTIONS[k](y)));

export const summarizeAuthor = a => {
  const last = a.checks[a.checks.length - 1];
  return {
    displayName: a.form.displayName,
    institution: a.manual ? a.form.institution : '',
    location: [a.form.city, a.form.state, a.form.country].filter(Boolean).join(', '),
    lastCheck: last ? last.searchedAt.split(' ')[0] : '',
    lastCheckClear: last ? last.sam + last.oig + last.fda === 0 : null,
    pending: a.agreements.length + a.coi.length,
    studies: a.studies.length,
  };
};

// Publication authors are stored as "Name" (internal) or "Name-Institution" (external).
const PUB_TONE = { Draft: 'draft', 'In Review': 'hold', Cancelled: 'cancelled' };
function authoredPubs(pubs, person) {
  const who = person.toLowerCase();
  if (!who) return [];
  return pubs.filter(p => {
    const d = p.data || {};
    const names = (d.internal || []).map(x => x.name).concat((d.external || []).map(x => String(x.name).split('-')[0]));
    return names.some(n => String(n).trim().toLowerCase() === who);
  }).map(p => ({ id: p.record_id, savedId: p.id, title: p.title, product: p.product || '—', type: p.pub_type, status: p.status, tone: PUB_TONE[p.status] || 'draft', submittedBy: p.owner || '—' }));
}

/* ---------- Page ---------- */

/**
 * /external-author/new is a blank profile; /external-author/:id is a saved one.
 * (/external-author itself opens the design's sample author, seeded as a saved record.)
 */
export default function ExternalAuthorProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();
  const userName = (user && user.name) || 'Unknown user';
  const isNew = id === 'new';
  const savedId = isNew ? null : id;

  const [author, setAuthor] = useState(blankAuthor);
  const [record, setRecord] = useState(null);
  const [loadState, setLoadState] = useState(savedId ? 'loading' : 'ready');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [tab, setTab] = useState('debarments');
  const [studyQuery, setStudyQuery] = useState('');
  const [pubs, setPubs] = useState([]);
  const lastSaved = useRef(null);

  useEffect(() => {
    api.get('/pp-publications?include=data').then(setPubs).catch(() => setPubs([]));
  }, []);

  useEffect(() => {
    if (savedId && record && String(record.id) === String(savedId)) return undefined;
    setNotice(null);
    if (!savedId) {
      setRecord(null);
      // Opened from a publication's author list: start with that name filled in.
      const start = blankAuthor();
      const name = location.state && location.state.name;
      if (name) {
        const parts = name.split(/\s+/);
        const last = parts.length > 1 ? parts.pop() : '';
        start.form = { ...start.form, firstName: parts.join(' '), lastName: last, displayName: last ? last + ' ' + parts[0][0] : '' };
      }
      setAuthor(start);
      lastSaved.current = null;
      setLoadState('ready');
      return undefined;
    }
    let stop = false;
    setLoadState('loading');
    api.get('/pp-authors/' + savedId)
      .then(r => {
        if (stop) return;
        const { data, ...meta } = r;
        const next = fromSavedAuthor(data);
        setRecord(meta);
        setAuthor(next);
        lastSaved.current = next;
        setLoadState('ready');
      })
      .catch(err => { if (!stop) { setLoadState('error'); setNotice({ kind: 'error', text: err.message }); } });
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = patch => setAuthor(a => ({ ...a, ...(typeof patch === 'function' ? patch(a) : patch) }));
  const { active, form, na, manual, checks, agreements, coi, signedCoi, studies, audit } = author;
  const setField = (key, value) => set(a => ({ form: { ...a.form, [key]: value } }));
  const fullName = nameOf(author);
  const authorName = fullName || 'New External Author';
  const missing = REQUIRED.filter(k => !String(form[k] || '').trim());
  const emailMismatch = !!form.email && !!form.confirmEmail && form.email.trim().toLowerCase() !== form.confirmEmail.trim().toLowerCase();
  const entry = (action, detail, icon = 'edit', color = 'var(--info-icon)') => ({ action, user: userName, at: stamp(), detail, icon, color });
  const log = (...args) => set(a => ({ audit: a.audit.concat([entry(...args)]) }));

  /** Saves `next`. close: back to the author list. notices: in-app notifications to send after saving. */
  const persist = async (next, { close = false, done, notices } = {}) => {
    const miss = REQUIRED.filter(k => !String(next.form[k] || '').trim());
    if (miss.length) {
      setNotice({ kind: 'error', text: 'Fill in the required Author Details fields before saving.' });
      return false;
    }
    if (next.form.email.trim().toLowerCase() !== next.form.confirmEmail.trim().toLowerCase()) {
      setNotice({ kind: 'error', text: 'Email and Confirm Email must match.' });
      return false;
    }
    let log2 = next.audit;
    if (!record) log2 = log2.concat([entry('Profile created', 'Saved as a new external author', 'add_circle', 'var(--ok)')]);
    else if (lastSaved.current) {
      const changed = changedSections(lastSaved.current, next);
      if (changed.length) log2 = log2.concat([entry('Profile saved', 'Changed: ' + changed.join(', '))]);
    }
    const withLog = { ...next, audit: log2 };
    const body = { name: nameOf(withLog), email: withLog.form.email, status: withLog.active ? 'Active' : 'Inactive', summary: summarizeAuthor(withLog), data: withLog };
    setSaving(true);
    setNotice(null);
    try {
      const saved = record ? await api.put('/pp-authors/' + record.id, body) : await api.post('/pp-authors', body);
      setRecord(saved);
      setAuthor(withLog);
      lastSaved.current = withLog;
      if (notices) {
        const list = notices(saved).map(n => ({ ...n, tab: null }));
        if (list.length) await api.post('/notifications', { notifications: list }).catch(() => {});
      }
      if (close) { navigate('/external-authors', { state: { savedAuthorId: saved.author_id } }); return true; }
      setNotice({ kind: 'info', text: done || (record ? 'Saved ' : 'Created ') + saved.author_id + '.' });
      if (!record) navigate('/external-author/' + saved.id, { replace: true });
      return true;
    } catch (err) {
      setNotice({ kind: 'error', text: 'Could not save: ' + err.message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // N/A and "Manually enter" are mutually exclusive: switching one on clears the other.
  const onToggleNa = () => set(a => ({ na: !a.na, manual: a.na ? a.manual : false }));
  const onToggleManual = () => set(a => ({ manual: !a.manual, na: a.manual ? a.na : false }));

  const newRequest = () => ({
    id: Date.now(),
    name: fullName,
    email: form.email,
    submittedBy: userName,
    createdOn: new Date().toLocaleDateString('en-US'),
  });

  // Sending saves the profile and reaches the author in PubPro (no email).
  const sendRequest = (kind) => {
    const isCoi = kind === 'coi';
    const label = isCoi ? 'Conflict of interest form' : 'Authorship agreement';
    persist({
      ...author,
      [isCoi ? 'coi' : 'agreements']: author[isCoi ? 'coi' : 'agreements'].concat([newRequest()]),
      audit: author.audit.concat([entry(label + ' sent', 'Sent to ' + fullName + ' in PubPro', isCoi ? 'verified_user' : 'description')]),
    }, {
      done: label + ' sent to ' + fullName + '.',
      notices: () => [{ recipient: fullName, kind: 'invitation', title: label + ' to sign', body: 'Please review and sign your ' + label.toLowerCase() + ' in PubPro.' }],
    });
  };

  const runDebarmentCheck = () => {
    set(a => ({
      checks: a.checks.concat([{
        id: Date.now(), name: fullName, sam: 0, oig: 0, fda: 0, status: 'Clear',
        searchedAt: new Date().toLocaleDateString('en-US') + ' ' + new Date().toLocaleTimeString('en-US'), searchUser: userName, show: true,
      }]),
      audit: a.audit.concat([entry('Debarment check run', 'Clear — SAM 0, OIG 0, FDA 0', 'gavel')]),
    }));
    setTab('debarments');
    setNotice({ kind: 'info', text: `Debarment check complete for ${authorName}: no matches in SAM, OIG or FDA. Save to keep it on file.` });
  };

  if (loadState !== 'ready') {
    return (
      <div className="eap-page">
        <div className="eap-shell eap-shell--stack">
          {loadState === 'loading'
            ? <div className="eap-meta">Loading external author…</div>
            : <InlineMessage kind="error">{notice ? notice.text : 'Could not load this author.'}</InlineMessage>}
        </div>
      </div>
    );
  }

  const q = studyQuery.toLowerCase();
  const availableStudies = STUDY_DIRECTORY
    .filter(s => !studies.some(sel => sel.id === s.id))
    .filter(s => !studyQuery || (s.id + ' ' + s.title + ' ' + s.product).toLowerCase().includes(q));

  const pubRows = authoredPubs(pubs, fullName);
  const lastCheck = checks[checks.length - 1];
  const checkOverdue = !lastCheck || daysSince(lastCheck.searchedAt.split(' ')[0]) > YEAR_DAYS;
  const tabs = TABS.map(t => ({
    ...t,
    flagged: (t.id === 'debarments' && checkOverdue) || (t.id === 'agreements' && agreements.length + coi.length > 0),
  }));
  const created = record && record.created_at ? new Date(record.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('en-US') : null;
  const blocked = missing.length > 0 || emailMismatch || saving;

  return (
    <div className="eap-page">
      <RecordHeader
        icon="badge"
        title={authorName}
        task="External Author Profile"
        subtitle={manual && form.institution ? form.institution : 'External Author'}
        meta={[
          <Pill tone={active ? 'active' : 'draft'}>{active ? 'Active' : 'Inactive'}</Pill>,
          record ? record.author_id : 'Not saved yet',
          'Owner: ' + (record ? record.owner : userName),
          created ? 'Profile created ' + created : 'Profile not yet created',
        ]}
      />

      <div className="eap-shell eap-shell--stack">
        <InlineMessage kind="info">
          Fill in the required fields (marked) before saving. Run a debarment check whenever the author&rsquo;s name or institution changes.
        </InlineMessage>

        <AuthorDetails
          form={form}
          setField={setField}
          active={active}
          onToggleActive={() => set(a => ({ active: !a.active }))}
          na={na}
          manual={manual}
          onToggleNa={onToggleNa}
          onToggleManual={onToggleManual}
          missing={missing}
        />

        <div className="eap-tabs">
          <div className="eap-rail">
            <SideTabRail tabs={tabs} active={tab} onSelect={setTab} />
          </div>
          <div className="eap-panel">
            {tab === 'debarments' && (
              <DebarmentsTab
                checks={checks}
                authorName={authorName}
                onRun={runDebarmentCheck}
                onRemove={cid => set(a => ({ checks: a.checks.filter(x => x.id !== cid), audit: a.audit.concat([entry('Debarment check removed', 'Removed from the profile', 'delete', 'var(--fatal-text)')]) }))}
                onToggleShow={cid => set(a => ({ checks: a.checks.map(x => (x.id === cid ? { ...x, show: !x.show } : x)) }))}
              />
            )}
            {tab === 'agreements' && (
              <AgreementsTab
                agreements={agreements}
                coi={coi}
                signedCoi={signedCoi}
                saving={saving}
                onSendAgreement={() => sendRequest('agreement')}
                onSendCoi={() => sendRequest('coi')}
              />
            )}
            {tab === 'studies' && (
              <StudiesTab
                query={studyQuery}
                onQuery={e => setStudyQuery(e.target.value)}
                selected={studies}
                available={availableStudies}
                onAdd={s => { set(a => ({ studies: a.studies.concat([{ id: s.id, title: s.title, status: s.status, deadline: s.deadline || '—' }]) })); log('Study linked', s.id + ' — ' + s.title, 'science'); }}
                onRemove={sid => { set(a => ({ studies: a.studies.filter(x => x.id !== sid) })); log('Study unlinked', sid, 'link_off'); }}
              />
            )}
            {tab === 'publications' && (
              <PublicationsTab rows={pubRows} onOpen={r => navigate(r.savedId ? '/publication/' + r.savedId : '/publication')} />
            )}
            {tab === 'audit' && <AuditTab rows={audit} />}
          </div>
        </div>

        {notice && <InlineMessage kind={notice.kind}>{notice.text}</InlineMessage>}
      </div>

      <FormActionBar
        left={(
          <>
            <Button
              variant="secondary"
              onClick={() => { setAuthor(lastSaved.current || blankAuthor()); setNotice({ kind: 'info', text: 'Unsaved changes discarded.' }); }}
            >
              Cancel Changes
            </Button>
            <Button variant="secondary" icon="policy" onClick={runDebarmentCheck} disabled={!fullName}>Run Debarment Checks</Button>
            <Button variant="tertiary" icon="history" onClick={() => setTab('audit')}>Audit Details</Button>
          </>
        )}
        right={(
          <>
            <Button variant="secondary" onClick={() => persist(author)} disabled={blocked}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button variant="primary" onClick={() => persist(author, { close: true })} disabled={blocked}>Save &amp; Close</Button>
          </>
        )}
      />
    </div>
  );
}
