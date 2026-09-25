import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Button, Checkbox, ConfirmModal, DataTable, DetailGrid, DropZone, EyebrowLabel, Field,
  FormActionBar, Icon, IconButton, InlineMessage, MoneyField, Pill, RecordHeader, SearchSelect,
  SectionHeading, SegmentedToggle, Select, SideTabRail, StatCard, TextArea, TextField, Tooltip,
} from '../ds/pubpro';
import DateField from '../components/DateField';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { PRODUCTS, REVIEW_THERAPEUTIC_AREA_OPTIONS, STUDY_DIRECTORY, TEMPLATE_FOR_TYPE, TODAY_STR, nowStamp } from './publication-form/data';
import {
  auditEntry as pubAuditEntry, blankState as blankPublication, stageTemplatePatch, statusOf as pubStatusOf,
  summarize as summarizePublication, toSavedData as pubSavedData,
} from './publication-form/state';
import { STATUS_TONE } from './Publications';
import useDismiss from '../components/useDismiss';
import './PublicationPlanForm.css';

/* ---------- Data from the design ---------- */

const TABS = [
  ['overview', 'OVERVIEW', 'summarize'],
  ['strategy', 'STRATEGY', 'lightbulb'],
  ['budget', 'ALLOCATION', 'payments'],
  ['studies', 'STUDIES', 'science'],
  ['timeline', 'TIMELINE', 'calendar_month'],
  ['stakeholders', 'STAKEHOLDERS', 'group'],
  ['documents', 'DOCUMENTS', 'attach_file'],
  ['audit', 'AUDIT TRAIL', 'account_tree'],
];

const PLAN_STEPS = [{ label: 'Draft' }, { label: 'Active', active: true }, { label: 'Complete' }];

const SAMPLE_AUDIT = [
  ['Plan created', 'Kristina Hill', '2/3/2026 9:14 AM', 'Draft PLAN-26-DAX-002', 'add_circle', 'var(--ok)'],
  ['Strategy updated', 'Kristina Hill', '2/11/2026 3:42 PM', 'Executive Summary, Strategic Communication Goals', 'edit', 'var(--info-icon)'],
  ['Study linked', 'Kristina Hill', '3/2/2026 10:05 AM', '100210 — DAX-301 (CLARIFY) Phase III Pivotal Trial', 'science', 'var(--info-icon)'],
  ['Plan activated', 'Dana Ruiz', '3/6/2026 8:20 AM', 'Draft to Active', 'play_circle', 'var(--ok)'],
  ['Publication added', 'Kristina Hill', '4/14/2026 1:33 PM', '26-A-DAX-004-V01', 'menu_book', 'var(--info-icon)'],
  ['Budget revised', 'Ben Cho', '5/8/2026 11:07 AM', '$450,000.00 to $500,000.00', 'payments', 'var(--warn-text)'],
  ['Stakeholder added', 'Kristina Hill', '6/1/2026 4:51 PM', 'Julius Caesar — External', 'person_add', 'var(--info-icon)'],
].map(([action, user, date, detail, icon, color]) => ({ action, user, date, detail, icon, color }));

// The design colours these chips with the same fills as the DS Pill tones.
const STUDY_STATUS_TONE = { 'In Progress': 'active', Completed: 'draft', 'On Hold': 'hold', Cancelled: 'cancelled' };

const PUBLICATION_FORM_ID = '26-A-DAX-004-V01'; // the one committed pub the design links to Publication Form

const STAGE_OPTIONS = ['Phase II', 'Phase I', 'Phase III', 'Post-Marketing'];
const DEPT_OPTIONS = ['Medical Affairs', 'Clinical Development', 'Health Economics & Outcomes Research'];
const GEO_OPTIONS = ['North America (USA, Canada)', 'Europe (EU5)', 'Global'];
const SPONSOR_OPTIONS = ['Company Sponsored', 'Investigator Initiated', 'Collaborative'];
const OBJECTIVE_OPTIONS = ['Support market access with cost-effectiveness data', 'Establish long-term efficacy and safety profile', 'Increase disease-state awareness'];
const AUDIENCE_OPTIONS = ['Dermatologists (academic and community)', 'Payers / HTA bodies', 'Patient advocacy groups'];
const IDEA_PUBTYPE_OPTIONS = ['Abstract', 'Manuscript', 'Abstract-Oral', 'Abstract-Poster', 'Editorial', 'Case Report'];
const MIX_TYPE_OPTIONS = ['Abstract', 'Abstract-Poster', 'Abstract-Oral', 'Primary Manuscript', 'Manuscript', 'Editorial', 'Case Report'];
const FEE_CATEGORY_OPTIONS = [{ value: 'Administrative', label: 'Administrative' }, { value: 'Out-of-Pocket', label: 'Out-of-Pocket' }];
const TYPE_CODE = { Abstract: 'A', Manuscript: 'M', Editorial: 'E', 'Case Report': 'CR', 'Abstract-Poster': 'AO' };

const INITIAL_OVERVIEW = {
  title: 'Daxafort Dissemination Plan',
  stage: 'Phase II',
  dept: 'Medical Affairs',
  geo: 'North America (USA, Canada)',
  sponsor: 'Company Sponsored',
  objective: 'Support market access with cost-effectiveness data',
  audience: '',
  notes: '',
  costCenter: 'MA-DERM-4402',
};

const INITIAL_STRATEGY = {
  summary: "Daxafort is a novel IL-13 inhibitor under investigation for moderate-to-severe atopic dermatitis. This dissemination plan supports publication of Phase III pivotal trial data (DAX-301, DAX-302) demonstrating sustained improvement in EASI-75 and IGA 0/1 response rates through 52 weeks. Primary objectives are to establish Daxafort's efficacy and safety profile in the peer-reviewed literature ahead of anticipated regulatory approval, and to differentiate its long-term safety data from existing biologic and JAK-inhibitor therapies in the AD treatment landscape.",
  goals: [
    "Establish Daxafort's long-term efficacy and safety profile as a differentiator versus existing IL-4/IL-13 and JAK-inhibitor therapies",
    'Communicate the durability of response through Week 52 to support payer and formulary conversations ahead of launch',
    'Target audiences: dermatologists (academic and community), allergists, payers/HTA bodies, and patient advocacy groups',
    'Key messages: rapid onset of action, sustained skin clearance, favorable long-term safety (no new safety signals through 52 weeks), and quality-of-life improvements (DLQI, Itch NRS)',
    'Support market access objectives by generating health economic and burden-of-disease publications alongside clinical efficacy data',
  ].join('\n'),
  venues: 'Primary manuscripts targeted to JAMA Dermatology and the Journal of the American Academy of Dermatology given their high impact and strong readership among prescribing dermatologists. Congress presentations planned for the American Academy of Dermatology (AAD) Annual Meeting and the European Academy of Dermatology and Venereology (EADV) Congress to reach both US and EU5 audiences ahead of respective regulatory decisions. A secondary manuscript on patient-reported outcomes is planned for a quality-of-life-focused journal (e.g., Dermatology and Therapy) to support patient advocacy engagement.',
  notes: 'Coordinate publication timing with regulatory submission milestones to avoid data disclosure conflicts. COI disclosures for all trial investigators should be finalized and locked prior to first submission per GPP3/ICMJE requirements. Flag DAX-302 subgroup analyses (pediatric cohort) for a separate, later publication pending full data maturity.',
};

const INITIAL_IDEAS = [
  { id: 1, title: 'Daxafort in Pediatric Atopic Dermatitis: Feasibility Cohort', owner: 'Kristina Hill', pubType: 'Abstract', cost: 10000 },
  { id: 2, title: 'Real-World Persistence with Daxafort in AD', owner: 'Dana Ruiz', pubType: 'Manuscript', cost: 50000 },
  { id: 3, title: 'Daxafort Dosing Optimization Poster', owner: 'Ben Cho', pubType: 'Abstract-Poster', cost: 15000 },
  { id: 4, title: 'IL-13 Pathway Review in Dermatologic Disease', owner: 'Kristina Hill', pubType: 'Editorial', cost: 10000 },
  { id: 5, title: 'Daxafort Safety Update: Long-Term Extension Data', owner: 'Dana Ruiz', pubType: 'Manuscript', cost: 50000 },
  { id: 6, title: 'Patient-Reported Outcomes with Daxafort: 24-Week Analysis', owner: 'Richa Garg', pubType: 'Abstract', cost: 10000 },
  { id: 7, title: 'Daxafort in Combination Regimens: Case Series', owner: 'Pedro Pinho', pubType: 'Case Report', cost: 10000 },
  { id: 8, title: 'Health Economic Impact of Daxafort in AD', owner: 'Ben Cho', pubType: 'Manuscript', cost: 50000 },
  { id: 9, title: 'Daxafort Mechanism of Action Explainer', owner: 'Kristina Hill', pubType: 'Abstract', cost: 10000 },
  { id: 10, title: 'Daxafort Congress Roundup Poster', owner: 'Richa Garg', pubType: 'Abstract-Poster', cost: 15000 },
];

const INITIAL_STAKEHOLDERS = [
  { id: 1, type: 'Internal', name: 'Kristina Hill', role: 'Regulatory Affairs Liaison', coiDate: '', affiliation: '', email: '' },
  { id: 2, type: 'External', name: 'Steve Altschuler', role: 'Steering Committee Chair', coiDate: '8/21/2026', affiliation: 'UCLA School of Medicine', email: 'stevefakeemail@bplogix.com' },
  { id: 3, type: 'Internal', name: 'Alejandra Sánchez', role: 'Medical Writer', coiDate: '', affiliation: '', email: '' },
  { id: 4, type: 'External', name: 'Julius Caesar', role: '', coiDate: '8/13/2026', affiliation: 'University of Houston Medical Center', email: 'imperator@spqr.hmc.net' },
];

const INITIAL_ALLOCATIONS = { '26-A-DAX-004-V01': 64000 };
const INITIAL_MIX = [
  { type: 'Abstract', count: 20, unitCost: 10000 },
  { type: 'Abstract-Poster', count: 10, unitCost: 15000 },
  { type: 'Primary Manuscript', count: 2, unitCost: 50000 },
];
const INITIAL_FEES = [
  { id: 1, vendor: 'Oxford Medical Communications', description: 'Administrative retainer — FY2026', category: 'Administrative', amount: 20000 },
  { id: 2, vendor: 'Meridian Scientific', description: 'Poster printing & shipping', category: 'Out-of-Pocket', amount: 4200 },
];

/* ---------- Saved plans ---------- */

export const SAMPLE_PLAN_ID = 'PLAN-26-DAX-002';
const PLAN_STATUSES = ['Draft', 'Active', 'Complete'];
const PLAN_TA_OPTIONS = REVIEW_THERAPEUTIC_AREA_OPTIONS;
// Planned-pub types map onto the publication types a record can have.
const LAUNCH_TYPE = { Abstract: 'Abstract', 'Abstract-Oral': 'Abstract', 'Abstract-Poster': 'Poster', Manuscript: 'Manuscript', Editorial: 'Manuscript', 'Case Report': 'Manuscript' };

/** The design's example plan, seeded once as a saved record (see SamplePlan.jsx). */
export const SAMPLE_PLAN = {
  overview: { ...INITIAL_OVERVIEW, product: 'Daxafort (Atopic Dermatitis)', ta: 'Immunology' },
  strategy: INITIAL_STRATEGY,
  status: 'Active',
  planColor: '#66CC99',
  noStudy: false,
  selectedStudies: ['100210'],
  stakeholders: INITIAL_STAKEHOLDERS,
  nextStakeholderId: 5,
  planBudget: 500000,
  planStartDate: '1/1/2026',
  planEndDate: '12/31/2026',
  ideas: INITIAL_IDEAS,
  nextIdeaId: 11,
  inPlan: [],
  allocations: INITIAL_ALLOCATIONS,
  mix: INITIAL_MIX,
  fees: INITIAL_FEES,
  nextFeeId: 3,
  overrideNote: '',
  overrideApproved: false,
  audit: SAMPLE_AUDIT,
  // The design's hand-drawn roadmap; other plans chart their linked publications.
  cancelled: null,
};

export const blankPlan = () => ({
  overview: { title: '', stage: '', dept: '', geo: '', sponsor: '', objective: '', audience: '', notes: '', costCenter: '', product: '', ta: '' },
  strategy: { summary: '', goals: '', venues: '', notes: '' },
  status: 'Draft',
  planColor: '#66CC99',
  noStudy: false,
  selectedStudies: [],
  stakeholders: [],
  nextStakeholderId: 1,
  planBudget: 0,
  planStartDate: '',
  planEndDate: '',
  ideas: [],
  nextIdeaId: 1,
  inPlan: [],
  allocations: {},
  mix: [],
  fees: [],
  nextFeeId: 1,
  overrideNote: '',
  overrideApproved: false,
  audit: [],
  cancelled: null,
});

/** Rebuilds plan state from saved data, filling any keys added since it was saved. */
const fromSavedPlan = data => {
  const base = blankPlan();
  return { ...base, ...data, overview: { ...base.overview, ...(data && data.overview) }, strategy: { ...base.strategy, ...(data && data.strategy) } };
};

const planAudit = (action, user, detail, icon = 'edit', color = 'var(--info-icon)') => ({ action, user, date: nowStamp(), detail, icon, color });

const planStatus = p => (p.cancelled ? 'Cancelled' : p.status || 'Draft');

// Parts of the plan compared on save, so the audit trail can say what changed.
const PLAN_SECTIONS = {
  Overview: p => [p.overview, p.planColor, p.status],
  Strategy: p => [p.strategy],
  Allocation: p => [p.planBudget, p.planStartDate, p.planEndDate, p.ideas, p.inPlan, p.allocations, p.mix, p.fees, p.overrideNote, p.overrideApproved],
  Studies: p => [p.noStudy, p.selectedStudies],
  Stakeholders: p => [p.stakeholders],
};
const changedPlanSections = (a, b) => Object.keys(PLAN_SECTIONS).filter(k => JSON.stringify(PLAN_SECTIONS[k](a)) !== JSON.stringify(PLAN_SECTIONS[k](b)));

/** What the list and dashboard show without loading the whole plan. */
const summarizePlan = (p, linkedCount) => {
  const fees = p.fees.reduce((a, f) => a + (f.amount || 0), 0);
  const allocated = Object.values(p.allocations || {}).reduce((a, n) => a + (n || 0), 0);
  return {
    ta: p.overview.ta || '', product: p.overview.product || '',
    budget: p.planBudget || 0, committed: fees + allocated,
    pubCount: Math.max(linkedCount || 0, (p.inPlan || []).length),
    period: p.planStartDate && p.planEndDate ? p.planStartDate + ' – ' + p.planEndDate : '',
  };
};

/**
 * "From Publications" stakeholders: the submitter and selected authors of each live publication
 * linked to the plan, one row per person and role.
 */
function inheritedStakeholders(pubs) {
  const rows = new Map();
  const add = (name, role, pubId, extra) => {
    if (!name) return;
    const key = name + '|' + role;
    const row = rows.get(key) || { name, role, pubs: [], ...extra };
    if (!row.pubs.includes(pubId)) row.pubs.push(pubId);
    rows.set(key, row);
  };
  pubs.forEach(p => {
    const d = p.data || {};
    const pubId = String(p.record_id || '').replace(/-V\d+$/, '');
    add(p.owner, 'Submitter', pubId, { external: false });
    (d.internal || []).filter(a => a.selected !== false).forEach(a => add(a.name, 'Internal Author', pubId, { external: false }));
    (d.external || []).filter(a => a.selected !== false).forEach(a => {
      const cut = String(a.name || '').indexOf('-');
      const affiliation = cut > 0 ? a.name.slice(cut + 1) : '';
      add(a.display || (cut > 0 ? a.name.slice(0, cut) : a.name), 'External Author', pubId, { external: true, affiliation });
    });
  });
  return [...rows.values()].map(r => ({ ...r, pubs: r.pubs.join(', ') }));
}

/** A saved publication linked to this plan, as a Committed Publications row. */
const linkedRow = pub => ({
  id: pub.record_id, savedId: pub.id, title: pub.title, product: pub.product || '—', type: pub.pub_type,
  submitter: pub.owner || '—', status: pub.status, vendor: '',
});

const isoDate = iso => { const [y, m, d] = String(iso || '').split('-').map(Number); return y ? new Date(y, m - 1, d) : null; };
const ganttDate = d => d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

/**
 * Timeline rows (same shape as the design's GANTT) built from linked publications' planned steps.
 * Returns null when nothing is scheduled yet.
 */
function buildGantt(planTitle, pubs) {
  const items = pubs.map(p => ({
    p,
    steps: ((p.summary && p.summary.steps) || [])
      .map(x => ({ ...x, s: isoDate(x.start), e: isoDate(x.d) }))
      .filter(x => x.s && x.e),
  })).filter(x => x.steps.length);
  if (!items.length) return null;
  const all = items.flatMap(x => x.steps);
  const min = new Date(Math.min(...all.map(x => x.s)));
  const max = new Date(Math.max(...all.map(x => x.e)));
  const from = new Date(min.getFullYear(), min.getMonth(), 1);
  const to = new Date(max.getFullYear(), max.getMonth() + 1, 1);
  const span = to - from;
  const pos = d => Math.max(0, Math.min(100, ((d - from) / span) * 100));
  const avg = xs => Math.round(xs.reduce((a, x) => a + (x.pct || 0), 0) / (xs.length || 1));
  const range = (a, b) => (a - b === 0 ? ganttDate(a) : ganttDate(a) + ' – ' + ganttDate(b));

  const rows = [[planTitle || 'This plan', 0, 'group', pos(min), pos(max) - pos(min), avg(all), range(min, max), '']];
  items.forEach(({ p, steps }) => {
    const pMin = new Date(Math.min(...steps.map(x => x.s)));
    const pMax = new Date(Math.max(...steps.map(x => x.e)));
    const name = `Publication ${p.record_id} (${p.status})`;
    rows.push([name, 1, 'group', pos(pMin), pos(pMax) - pos(pMin), avg(steps), range(pMin, pMax), planTitle]);
    steps.forEach(x => {
      const milestone = x.type === 'Milestone';
      rows.push([x.name, 2, milestone ? 'milestone' : 'bar', pos(milestone ? x.e : x.s), milestone ? 0 : pos(x.e) - pos(x.s), x.pct || 0, milestone ? ganttDate(x.e) : range(x.s, x.e), name]);
    });
  });

  const months = [];
  for (let d = new Date(from); d < to; d.setMonth(d.getMonth() + 1)) {
    months.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
  }
  // Up to 12 evenly spaced week labels across the same span.
  const weekOf = d => { const t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7)); const w1 = new Date(t.getFullYear(), 0, 4); return 1 + Math.round(((t - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7); };
  const weekCount = Math.max(1, Math.round(span / (7 * 86400000)));
  const step = Math.max(1, Math.ceil(weekCount / 12));
  const weeks = [];
  for (let i = 0; i < weekCount; i += step) weeks.push('Wk ' + weekOf(new Date(from.getTime() + i * 7 * 86400000)));
  return { rows, months, weeks };
}

/* ---------- Helpers ---------- */

const money = n => '$' + (n || 0).toLocaleString('en-US');
const toInt = v => {
  const n = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? 0 : n;
};

const lighten = (hex, amt) => {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return hex;
  const mix = i => {
    const v = parseInt(h.slice(i, i + 2), 16);
    return Math.round(v + (255 - v) * amt).toString(16).padStart(2, '0');
  };
  return '#' + mix(0) + mix(2) + mix(4);
};

// Relative-luminance text pick so a bar label stays readable against any user-chosen plan colour.
const readableTextOn = hex => {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return 'var(--fg-1)';
  const toLin = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const r = toLin(parseInt(h.slice(0, 2), 16)), g = toLin(parseInt(h.slice(2, 4), 16)), b = toLin(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5 ? 'var(--fg-1)' : 'var(--white)';
};

// Right-aligned DataTable header (its header cells are flex, so text-align alone has no effect).
const RightHead = ({ children }) => <span className="ppf-th-right">{children}</span>;

function Label({ children }) {
  return <div className="ppf-label">{children}</div>;
}

/* ---------- Tabs ---------- */

function OverviewTab({ overview, setField, planColor, setPlanColor, status, setStatus }) {
  const bind = key => ({ value: overview[key], onChange: e => setField(key, e.target.value) });
  return (
    <div className="ppf-stack ppf-stack--narrow">
      <SectionHeading subtitle="Core record details for this publication plan.">Overview</SectionHeading>

      <div className="ppf-group">
        <EyebrowLabel>Plan Identity</EyebrowLabel>
        <Field label="Publication Plan Title">
          <TextField {...bind('title')} width="620px" style={{ maxWidth: '100%' }} />
        </Field>
        <Field label="Plan Color">
          <div className="ppf-color-row">
            <TextField value={planColor} onChange={e => setPlanColor(e.target.value)} width="130px" />
            <span className="ppf-swatch" style={{ background: planColor }} />
            <span className="ppf-hint">Used for this plan's bars on the timeline.</span>
          </div>
        </Field>
        <Field label="Therapeutic Area">
          <Select options={PLAN_TA_OPTIONS} placeholder="Please select" {...bind('ta')} width="300px" />
        </Field>
        <Field label="Product">
          <Select options={PRODUCTS} placeholder="Please select" {...bind('product')} width="300px" />
        </Field>
        <Field label="Plan Status">
          <Select options={PLAN_STATUSES} value={status} onChange={e => setStatus(e.target.value)} width="200px" />
        </Field>
      </div>

      <div className="ppf-group">
        <EyebrowLabel>Classification</EyebrowLabel>
        <Field label="Development Program Stage"><Select options={STAGE_OPTIONS} placeholder="Please select" {...bind('stage')} width="200px" /></Field>
        <Field label="Department"><Select options={DEPT_OPTIONS} placeholder="Please select" {...bind('dept')} width="300px" /></Field>
        <Field label="Geographic Area"><Select options={GEO_OPTIONS} placeholder="Please select" {...bind('geo')} width="300px" /></Field>
        <Field label="Sponsor Type"><Select options={SPONSOR_OPTIONS} placeholder="Please select" {...bind('sponsor')} width="300px" /></Field>
      </div>

      <div className="ppf-group">
        <EyebrowLabel>Scope</EyebrowLabel>
        <Field label="Objectives">
          <Select options={OBJECTIVE_OPTIONS} placeholder="Please select" {...bind('objective')} width="440px" style={{ maxWidth: '100%' }} />
        </Field>
        <Field label="Target Audience">
          <Select options={AUDIENCE_OPTIONS} placeholder="Please select" {...bind('audience')} width="300px" />
        </Field>
        <Field label="Notes">
          <TextArea {...bind('notes')} width="620px" height="84px" style={{ maxWidth: '100%' }} />
        </Field>
      </div>
    </div>
  );
}

function StrategyTab({ strategy, setField }) {
  const bind = key => ({ value: strategy[key], onChange: e => setField(key, e.target.value) });
  return (
    <div className="ppf-stack">
      <SectionHeading subtitle="Narrative rationale that guides every publication in this plan.">Strategy</SectionHeading>
      <div className="ppf-stack ppf-stack--strategy">
        <Field label="Executive Summary"><TextArea {...bind('summary')} height="160px" /></Field>
        <Field label="Strategic Communication Goals"><TextArea {...bind('goals')} height="175px" /></Field>
        <Field label="Audience & Venue Rationale"><TextArea {...bind('venues')} height="150px" /></Field>
        <Field label="Additional Notes"><TextArea {...bind('notes')} height="130px" /></Field>
      </div>
    </div>
  );
}

function StudyCard({ s, onRemove }) {
  return (
    <div className="ppf-card">
      <div className="ppf-card-head">
        <div className="ppf-card-heading">
          <Label><Link to={'/study/' + s.id}>Study {s.id}</Link></Label>
          <div className="ppf-card-title">{s.title}</div>
        </div>
        <Pill tone={STUDY_STATUS_TONE[s.status] || 'draft'} style={{ flex: 'none', fontWeight: 'var(--fw-bold)' }}>{s.status}</Pill>
        <IconButton icon="close" tone="fatal" size={30} title="Remove study" onClick={onRemove} />
      </div>
      <DetailGrid
        style={{ padding: 14 }}
        items={[
          { label: 'Related Product', value: s.product },
          { label: 'Therapeutic Area', value: s.area },
          { label: 'Responsible Manager', value: s.manager },
          { label: 'Submission Deadline', value: s.deadline },
          { label: 'Interim Analysis Cut-Off', value: s.interim },
          { label: 'Data Lock Date', value: s.lock },
          { label: 'Embargo Lift Date', value: s.embargo },
          { label: 'ClinicalTrials.gov Registration Number', value: <a href={s.nctUrl} target="_blank" rel="noreferrer">{s.nct}</a> },
        ]}
      />
    </div>
  );
}

function StudiesTab({ noStudy, onToggleNoStudy, studyQuery, setStudyQuery, studyOpen, setStudyOpen, selectedStudies, setSelectedStudies }) {
  const sq = studyQuery.trim().toLowerCase();
  const matches = STUDY_DIRECTORY
    .filter(s => !selectedStudies.includes(s.id))
    .filter(s => !sq || (s.id + ' ' + s.title + ' ' + s.product).toLowerCase().includes(sq))
    .slice(0, 6);
  const selected = selectedStudies.map(id => STUDY_DIRECTORY.find(s => s.id === id)).filter(Boolean);
  const studyRef = useDismiss(studyOpen, () => setStudyOpen(false));

  return (
    <div>
      <SectionHeading subtitle="Studies whose data this plan disseminates." style={{ marginBottom: 20 }}>Studies</SectionHeading>
      <div className="ppf-mb20">
        <Checkbox checked={noStudy} onChange={onToggleNoStudy} label="No study is associated with this plan" />
      </div>

      {!noStudy && (
        <div>
          <div ref={studyRef} style={{ display: 'contents' }}>
          <Field label="Add Study" style={{ maxWidth: 640 }}>
            <SearchSelect
              width="100%"
              value={studyQuery}
              placeholder="Search by study ID, title, or product"
              open={studyOpen}
              suggestions={matches.map(s => ({ id: s.id, label: s.title, meta: s.product }))}
              emptyLabel={`No studies match “${studyQuery}”.`}
              onChange={e => { setStudyQuery(e.target.value); setStudyOpen(true); }}
              onFocus={() => setStudyOpen(true)}
              onClear={() => { setStudyQuery(''); setStudyOpen(false); }}
              onPick={s => { setSelectedStudies(xs => xs.concat([s.id])); setStudyQuery(''); setStudyOpen(false); }}
            />
          </Field>
          </div>

          <SectionHeading level="subsection" style={{ marginTop: 26, marginBottom: 10 }}>Selected Studies</SectionHeading>
          {selected.length > 0 ? (
            <div className="ppf-list">
              {selected.map(s => (
                <StudyCard key={s.id} s={s} onRemove={() => setSelectedStudies(xs => xs.filter(x => x !== s.id))} />
              ))}
            </div>
          ) : (
            <div className="ppf-empty-box">No studies linked to this plan yet. Use the search above to add one.</div>
          )}
        </div>
      )}
    </div>
  );
}

function TimelineTab({ planColor, scale, setScale, gantt }) {
  const [hoverRow, setHoverRow] = useState(null);
  if (!gantt) {
    return (
      <div>
        <SectionHeading subtitle="Every publication in this plan, on one roadmap." style={{ marginBottom: 16 }}>Timeline</SectionHeading>
        <div className="ppf-empty-box">
          Nothing to chart yet. Publications show up here once they name this plan as their Parent Planning ID
          (on the publication&rsquo;s Overview tab) or are launched from Planned Pubs on the Allocation tab.
        </div>
      </div>
    );
  }
  const periods = scale === 'Month' ? gantt.months : gantt.weeks;
  const cols = periods.length;
  const trackBg = {
    backgroundImage: 'linear-gradient(to right, var(--border-hairline) 1px, transparent 1px)',
    backgroundSize: `${100 / cols}% 100%`,
  };

  return (
    <div>
      <SectionHeading subtitle="Every publication in this plan, on one roadmap." style={{ marginBottom: 16 }}>Timeline</SectionHeading>
      <div className="ppf-toolbar">
        <Button variant="secondary"><Icon name="picture_as_pdf" size={16} />Export to PDF</Button>
        <Button variant="secondary"><Icon name="slideshow" size={16} />Export to PowerPoint</Button>
        <Button variant="secondary"><Icon name="unfold_more" size={16} />Expand All</Button>
        <SegmentedToggle options={['Week', 'Month']} value={scale} onChange={setScale} style={{ marginLeft: 'auto' }} />
      </div>

      <div className="ppf-gantt">
        <div className="ppf-gantt-row ppf-gantt-row--head">
          <div className="ppf-gantt-taskhead">Task Name</div>
          <div className="ppf-gantt-periods" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {periods.map(p => <div key={p} className="ppf-gantt-period">{p}</div>)}
          </div>
        </div>
        {gantt.rows.map(([name, level, kind, start, width, pct, dates, parent], i) => {
          const isGroup = kind === 'group';
          const flipTip = start > 55;
          return (
            <div key={i} className="ppf-gantt-row">
              <div
                className="ppf-gantt-task"
                style={{ paddingLeft: 12 + level * 20, fontWeight: level === 0 || isGroup ? 700 : 400 }}
              >
                {isGroup && <Icon name="arrow_drop_down" size={16} color="var(--text-meta)" />}
                <span className="ppf-ellipsis">{name}</span>
              </div>
              <div
                className="ppf-gantt-track"
                style={trackBg}
                onMouseEnter={() => setHoverRow(i)}
                onMouseLeave={() => setHoverRow(null)}
              >
                {hoverRow === i && (
                  <Tooltip
                    width={320}
                    style={{
                      top: 'auto', bottom: 26, marginTop: 0, padding: '12px 14px', color: 'var(--text-body)',
                      left: flipTip ? 'auto' : start + '%', right: flipTip ? (100 - start) + '%' : 'auto',
                    }}
                  >
                    <div className="ppf-gantt-tip-title">{name}</div>
                    <div className="ppf-gantt-tip-grid">
                      <div className="ppf-tip-key">{kind === 'milestone' ? 'Milestone date' : 'Duration'}</div>
                      <div className="ppf-tip-dates">{dates}</div>
                      <div className="ppf-tip-key">Progress</div>
                      <div>{(pct || 0) + '%'}</div>
                      <div className="ppf-tip-key">Parent Task</div>
                      <div className="ppf-pretty">{parent || '—'}</div>
                    </div>
                  </Tooltip>
                )}
                {kind === 'milestone' ? (
                  <div className="ppf-gantt-diamond" style={{ left: start + '%' }} />
                ) : (
                  <div className="ppf-gantt-bar" style={{ left: start + '%', width: (width || 0) + '%', background: lighten(planColor, 0.62) }}>
                    <div className="ppf-gantt-fill" style={{ width: (pct || 0) + '%', background: planColor }} />
                    <div className="ppf-gantt-label" style={{ color: readableTextOn(planColor) }}>{isGroup ? name : ''}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StakeholdersTab({ inherited, stakeholders, patchStakeholder, removeStakeholder, addStakeholder, goToProfile }) {
  const [hoverTip, setHoverTip] = useState(null);
  const tip = key => ({ onMouseEnter: () => setHoverTip(key), onMouseLeave: () => setHoverTip(null) });

  return (
    <div>
      <SectionHeading subtitle="People attached to this plan, inherited and added." style={{ marginBottom: 16 }}>Stakeholders</SectionHeading>

      <SectionHeading level="subsection" style={{ marginBottom: 8 }}>From Publications</SectionHeading>
      <div className="ppf-sh-table">
        <div className="ppf-sh-row ppf-sh-row--head">
          <div>User Name</div><div>Role</div><div>Publication ID(s)</div><div>COI Date*</div><div>Affiliation*</div><div>Email*</div>
        </div>
        {inherited.length === 0 && (
          <div className="ppf-sh-row"><div className="ppf-pretty" style={{ gridColumn: '1 / -1' }}>No one yet. Submitters and authors of this plan&rsquo;s live publications appear here.</div></div>
        )}
        {inherited.map((s, i) => (
          <div key={s.name} className="ppf-sh-row">
            <div className="ppf-pretty">{s.name}</div>
            <div className="ppf-pretty">{s.role}</div>
            <div className="ppf-pretty">{s.pubs}</div>
            <div className="ppf-rel">
              {s.external && !s.coi && '—'}
              {s.external && s.coi && (
                <div className="ppf-coi">
                  <span className="ppf-dotted" {...tip('coi' + i)}>{s.coi}</span>
                  <span {...tip('st' + i)} className="ppf-help">
                    <Icon name={s.coiOk ? 'check_circle' : 'error'} size={17} color={s.coiOk ? 'var(--ok)' : 'var(--fatal-text)'} />
                  </span>
                </div>
              )}
              {hoverTip === 'st' + i && (
                <Tooltip title="Debarment status">
                  {s.coiOk
                    ? 'PASS: The debarment check passed for this external author.'
                    : 'REVIEW: The debarment check has not been re-run since the last COI submission.'}
                </Tooltip>
              )}
              {hoverTip === 'coi' + i && (
                <Tooltip title="Conflict of interest">
                  {s.coiOk
                    ? 'This COI verification is less than 365 days old and does not need to be renewed.'
                    : 'This COI verification is more than 365 days old and must be renewed before submission.'}
                </Tooltip>
              )}
            </div>
            <div className="ppf-pretty">{s.affiliation || ''}</div>
            <div className="ppf-ellipsis">{s.email || ''}</div>
          </div>
        ))}
      </div>
      <div className="ppf-footnote">*External authors only. Reviewers appear here only after they have been assigned a task on the publication.</div>

      <SectionHeading level="subsection" style={{ marginBottom: 8 }}>Additional Stakeholders</SectionHeading>
      <div className="ppf-list ppf-list--tight">
        {stakeholders.map(s => (
          <div key={s.id} className="ppf-card ppf-card--pad">
            <div className="ppf-sh-top">
              <SegmentedToggle options={['Internal', 'External']} value={s.type} onChange={v => patchStakeholder(s.id, { type: v })} />
              <TextField value={s.name} onChange={e => patchStakeholder(s.id, { name: e.target.value })} placeholder="Search for user" width="200px" style={{ flex: 1 }} />
              <TextField value={s.role} onChange={e => patchStakeholder(s.id, { role: e.target.value })} placeholder="Role" width="210px" />
              <div className="ppf-push">
                <IconButton icon="close" tone="fatal" size={30} title="Remove stakeholder" onClick={() => removeStakeholder(s.id)} />
              </div>
            </div>
            {s.type === 'External' && (
              <div className="ppf-sh-detail">
                <div className="ppf-rel">
                  <Label>Debarment Status</Label>
                  <div className="ppf-sh-status" {...tip('ast' + s.id)}>
                    <Icon name="check_circle" size={16} color="var(--ok)" />On file
                  </div>
                  {hoverTip === 'ast' + s.id && (
                    <Tooltip title="Debarment status">PASS: The debarment check passed for this external author.</Tooltip>
                  )}
                </div>
                <div className="ppf-rel ppf-min0">
                  <Label>COI Date</Label>
                  <div className="ppf-value ppf-dotted ppf-inline" {...tip('acoi' + s.id)}>{s.coiDate}</div>
                  {hoverTip === 'acoi' + s.id && (
                    <Tooltip title="Conflict of interest">
                      Disclosure on file and current — signed {s.coiDate}, valid for 365 days.
                    </Tooltip>
                  )}
                </div>
                <div className="ppf-min0">
                  <Label>Affiliation</Label>
                  <div className="ppf-value ppf-pretty">{s.affiliation}</div>
                </div>
                <div className="ppf-min0">
                  <Label>Email</Label>
                  <div className="ppf-value ppf-ellipsis">{s.email}</div>
                </div>
                <div className="ppf-sh-link">
                  <a href="/external-author" onClick={goToProfile}>View profile</a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="ppf-mt16">
        <Button variant="tertiary" onClick={addStakeholder}><Icon name="add" size={16} />Add Stakeholder</Button>
      </div>
    </div>
  );
}

function AllocationTab(props) {
  const {
    planBudget, setPlanBudget, planStartDate, setPlanStartDate, planEndDate, setPlanEndDate, costCenter, setCostCenter,
    ideas, setIdeas, addIdea, launchIdea, inPlan, allocations, mix, setMix, fees, setFees, addFee,
    overrideNote, setOverrideNote, overrideApproved, setOverrideApproved, pubLink,
  } = props;

  const committedPubs = inPlan.reduce((a, p) => a + (allocations[p.id] || 0), 0);
  const feeTotal = fees.reduce((a, f) => a + (f.amount || 0), 0);
  const committed = committedPubs + feeTotal;
  const plannedTotal = ideas.reduce((a, idea) => a + (idea.cost || 0), 0);
  const remaining = (planBudget || 0) - (plannedTotal + committed);
  const mixTotal = mix.reduce((a, m) => a + (m.count || 0) * (m.unitCost || 0), 0);
  const planBudgetDisplay = money(planBudget) + '.00';

  const patchMix = (i, patch) => setMix(xs => xs.map((x, xi) => (xi === i ? { ...x, ...patch } : x)));
  const patchFee = (id, patch) => setFees(xs => xs.map(x => (x.id === id ? { ...x, ...patch } : x)));
  const patchIdea = (id, patch) => setIdeas(xs => xs.map(x => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <div>
      <SectionHeading subtitle="Plan budget and how it is allocated across publications." style={{ marginBottom: 18 }}>Allocation</SectionHeading>

      <div className="ppf-stack ppf-stack--form">
        <Field label="Plan Budget">
          <TextField
            value={planBudgetDisplay}
            // Cents are display-only, so drop them before reading the digits back.
            onChange={e => setPlanBudget(toInt(String(e.target.value).split('.')[0]))}
            width="180px"
            align="right"
          />
        </Field>
        <Field label="Plan Period">
          <div className="ppf-period">
            <DateField value={planStartDate} onChange={e => setPlanStartDate(e.target.value)} width="140px" />
            <span className="ppf-meta">–</span>
            <DateField value={planEndDate} onChange={e => setPlanEndDate(e.target.value)} width="140px" />
          </div>
        </Field>
        <Field label="Cost Center">
          <TextField value={costCenter} onChange={e => setCostCenter(e.target.value)} width="260px" />
        </Field>
      </div>

      <div className="ppf-stats">
        <StatCard label="Plan Budget" value={planBudgetDisplay} tone="info" />
        <StatCard label="Planned" value={money(plannedTotal)} tone="suspended" />
        <StatCard label="Committed" value={money(committed)} tone={remaining < 0 ? 'fatal' : 'suspended'} />
        <StatCard
          label="Remaining"
          value={money(remaining)}
          tone={remaining < 0 ? 'fatal' : remaining / (planBudget || 1) < 0.15 ? 'warning' : 'positive'}
        />
      </div>
      <div className="ppf-hint ppf-mt8 ppf-pretty">
        Committed = {money(committedPubs)} across committed publications + {money(feeTotal)} in administrative &amp; out-of-pocket fees.
      </div>

      <SectionHeading
        level="subsection"
        subtitle="What this budget is expected to fund this year. Estimated totals project the committed cost before publications are created."
        style={{ marginTop: 26, marginBottom: 10 }}
      >
        Planned Publication Mix
      </SectionHeading>
      <DataTable
        columns={[
          { header: 'Publication Type', width: 'minmax(0,1.4fr)' },
          { header: <RightHead>Planned Count</RightHead>, width: '120px', align: 'right' },
          { header: <RightHead>Est. Unit Cost</RightHead>, width: '140px', align: 'right' },
          { header: <RightHead>Est. Total</RightHead>, width: 'minmax(0,140px)', align: 'right', bold: true },
          { header: '', width: '36px' },
        ]}
        rows={mix.map((m, i) => ({
          key: i,
          cells: [
            <Select options={MIX_TYPE_OPTIONS} value={m.type} onChange={e => patchMix(i, { type: e.target.value })} width="100%" />,
            <TextField value={m.count} onChange={e => patchMix(i, { count: toInt(e.target.value) })} width="100%" align="right" />,
            <TextField value={money(m.unitCost)} onChange={e => patchMix(i, { unitCost: toInt(e.target.value) })} width="100%" align="right" />,
            money((m.count || 0) * (m.unitCost || 0)),
            <IconButton icon="close" tone="fatal" size={22} title="Remove line item" onClick={() => setMix(xs => xs.filter((x, xi) => xi !== i))} />,
          ],
        }))}
        footer={['Estimated Mix Total', '', '', money(mixTotal), '']}
      />
      <div className="ppf-mt12">
        <Button variant="tertiary" onClick={() => setMix(xs => xs.concat([{ type: 'Abstract', count: 0, unitCost: 0 }]))}>
          <Icon name="add" size={16} />Add Publication Type
        </Button>
      </div>

      {remaining < 0 && (
        <div className="ppf-mt18">
          {overrideApproved ? (
            <InlineMessage kind="info"><strong>Approved to exceed budget:</strong> {overrideNote}</InlineMessage>
          ) : (
            <InlineMessage kind="error">
              <div className="ppf-override">
                <div>This plan's planned and committed amounts exceed its budget. Record who approved the overage before proceeding.</div>
                <div className="ppf-override-row">
                  <TextField
                    value={overrideNote}
                    onChange={e => setOverrideNote(e.target.value)}
                    placeholder="e.g. Approved by CMO — rush Congress abstract"
                    width="320px"
                    style={{ flex: 1 }}
                  />
                  <Button variant="secondary" onClick={() => setOverrideApproved(!!overrideNote)}>Record Approval</Button>
                </div>
              </div>
            </InlineMessage>
          )}
        </div>
      )}

      <SectionHeading
        level="subsection"
        subtitle="Not-yet-launched concepts under consideration for this plan. Launch one to move it into Committed Publications with a pub ID."
        style={{ marginTop: 26, marginBottom: 8 }}
      >
        Planned Pubs
      </SectionHeading>
      <DataTable
        columns={[
          { header: 'Title', width: 'minmax(130px,1fr)' },
          { header: 'Owner', width: '110px' },
          { header: 'Pub Type', width: '125px' },
          { header: <RightHead>Projected Cost</RightHead>, width: '95px', align: 'right' },
          { header: '', width: '122px' },
        ]}
        rows={ideas.map(idea => ({
          key: idea.id,
          cells: [
            <TextField value={idea.title} onChange={e => patchIdea(idea.id, { title: e.target.value })} placeholder="Idea title" width="100%" style={{ height: 32 }} />,
            <TextField value={idea.owner} onChange={e => patchIdea(idea.id, { owner: e.target.value })} placeholder="Owner" width="100%" style={{ height: 32 }} />,
            <Select options={IDEA_PUBTYPE_OPTIONS} value={idea.pubType} onChange={e => patchIdea(idea.id, { pubType: e.target.value })} width="100%" style={{ height: 32 }} />,
            <MoneyField
              value={idea.cost ? idea.cost.toLocaleString('en-US') : ''}
              onChange={e => patchIdea(idea.id, { cost: toInt(e.target.value) })}
              placeholder="0"
              width="100%"
              style={{ height: 32 }}
            />,
            <div className="ppf-row-actions">
              <Button variant="secondary" onClick={() => launchIdea(idea)}>Launch</Button>
              <IconButton icon="close" tone="fatal" size={28} title="Remove idea" onClick={() => setIdeas(xs => xs.filter(x => x.id !== idea.id))} />
            </div>,
          ],
        }))}
        footer={ideas.length > 0 ? ['Total Planned', '', '', money(plannedTotal), ''] : undefined}
      >
        {ideas.length === 0 ? <div className="ppf-empty-row">No planned pubs logged yet.</div> : undefined}
      </DataTable>
      <div className="ppf-mt16">
        <Button variant="tertiary" onClick={addIdea}><Icon name="add" size={18} />Add Planned Pub</Button>
      </div>

      <SectionHeading
        level="subsection"
        subtitle="Launched publications with a pub ID. Amounts are locked here — edit them on the publication record."
        style={{ marginTop: 26, marginBottom: 8 }}
      >
        Committed Publications
      </SectionHeading>
      <DataTable
        columns={[
          { header: 'Publication ID', width: 'minmax(0,100px)', bold: true },
          { header: 'Title', width: 'minmax(120px,1.3fr)' },
          { header: 'Product', width: 'minmax(0,100px)' },
          { header: 'Pub Type', width: 'minmax(0,90px)' },
          { header: 'Vendor', width: 'minmax(0,90px)' },
          { header: 'Owner', width: 'minmax(0,90px)' },
          { header: 'Status', width: 'minmax(0,90px)' },
          { header: <RightHead>Allocated</RightHead>, width: 'minmax(0,90px)', align: 'right', bold: true },
        ]}
        rows={inPlan.map(p => ({
          key: p.id,
          cells: [
            pubLink(p),
            <span className="ppf-pretty">{p.title}</span>,
            p.product,
            p.type,
            p.vendor || '—',
            p.submitter,
            <Pill tone={STATUS_TONE[p.status] || 'draft'}>{p.status}</Pill>,
            <span title="Editable only on the publication record">{money(allocations[p.id] || 0)}</span>,
          ],
        }))}
        footer={['Total', '', '', '', '', '', '', <span className="ppf-pr8">{money(committedPubs)}</span>]}
      />

      <SectionHeading
        level="subsection"
        subtitle="Agency costs that sit at the plan level rather than any single publication — administrative retainers, printing, postage, and similar pass-through costs."
        style={{ marginTop: 26, marginBottom: 10 }}
      >
        Administrative &amp; Out-of-Pocket Fees
      </SectionHeading>
      <DataTable
        columns={[
          { header: 'Vendor', width: 'minmax(0,150px)' },
          { header: 'Description', width: 'minmax(0,1.2fr)' },
          { header: 'Category', width: 'minmax(0,150px)' },
          { header: <RightHead>Amount</RightHead>, width: 'minmax(0,140px)', align: 'right' },
          { header: '', width: '36px' },
        ]}
        rows={fees.map(f => ({
          key: f.id,
          cells: [
            f.vendor,
            <TextField value={f.description} onChange={e => patchFee(f.id, { description: e.target.value })} width="100%" />,
            <Select options={FEE_CATEGORY_OPTIONS} value={f.category} onChange={e => patchFee(f.id, { category: e.target.value })} width="100%" />,
            <TextField value={money(f.amount)} onChange={e => patchFee(f.id, { amount: toInt(e.target.value) })} width="100%" align="right" />,
            <IconButton icon="close" tone="fatal" size={22} title="Remove line item" onClick={() => setFees(xs => xs.filter(x => x.id !== f.id))} />,
          ],
        }))}
        footer={['Total', '', '', money(feeTotal), '']}
      />
      <div className="ppf-mt16">
        <Button variant="tertiary" onClick={addFee}><Icon name="add" size={16} />Add Line Item</Button>
      </div>
    </div>
  );
}

function DocumentsTab() {
  return (
    <div>
      <SectionHeading subtitle="Plan-level files, separate from publication documents." style={{ marginBottom: 18 }}>Documents</SectionHeading>
      <div className="ppf-stack">
        <Field label="Documents in this Plan"><DropZone /></Field>
        <Field label="Planning Materials"><DropZone /></Field>
      </div>
    </div>
  );
}

function AuditTab({ rows }) {
  return (
    <div>
      <SectionHeading subtitle="Every change made to this publication plan." style={{ marginBottom: 18 }}>Audit Trail</SectionHeading>
      <DataTable
        headerTone="knowledge"
        columns={[
          { header: '', width: '54px' },
          { header: 'Action', width: 'minmax(180px,1fr)' },
          { header: 'User', width: '150px' },
          { header: 'Date', width: '170px' },
          { header: 'Detail', width: 'minmax(180px,1.2fr)' },
        ]}
        rows={rows.map(({ action, user, date, detail, icon, color: iconColor }, i) => ({
          key: i,
          cells: [
            <Icon name={icon} size={20} color={iconColor} />,
            <span className="ppf-pretty">{action}</span>,
            user,
            date,
            <span className="ppf-muted ppf-pretty">{detail}</span>,
          ],
        }))}
      >
        {rows.length === 0 ? <div className="ppf-empty-row">No activity yet. Saving the plan starts the log.</div> : undefined}
      </DataTable>
    </div>
  );
}

/* ---------- Page ---------- */

/**
 * /publication-plan/new is a blank plan; /publication-plan/:id is a saved one.
 * (/publication-plan itself opens the design's sample plan, seeded as a saved record.)
 */
export default function PublicationPlanForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const userName = (user && user.name) || 'Unknown user';
  const isNew = id === 'new';
  const savedId = isNew ? null : id;

  const [plan, setPlan] = useState(blankPlan);
  const [record, setRecord] = useState(null);
  const [loadState, setLoadState] = useState(savedId ? 'loading' : 'ready');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [linked, setLinked] = useState([]);
  const lastSaved = useRef(null);

  // UI-only state.
  const [tab, setTab] = useState('overview');
  const [studyQuery, setStudyQuery] = useState('');
  const [studyOpen, setStudyOpen] = useState(false);
  const [scale, setScale] = useState('Month');

  // Setters with the same shape as useState's, one per saved field, so the tabs stay unchanged.
  const setter = key => v => setPlan(p => ({ ...p, [key]: typeof v === 'function' ? v(p[key]) : v }));
  const {
    overview, strategy, planColor, noStudy, selectedStudies, stakeholders, nextStakeholderId, planBudget,
    planStartDate, planEndDate, ideas, nextIdeaId, inPlan, allocations, mix, fees, nextFeeId,
    overrideNote, overrideApproved, status, audit, cancelled,
  } = plan;
  const setOverview = setter('overview');
  const setStrategy = setter('strategy');
  const setPlanColor = setter('planColor');
  const setNoStudy = setter('noStudy');
  const setSelectedStudies = setter('selectedStudies');
  const setStakeholders = setter('stakeholders');
  const setPlanBudget = setter('planBudget');
  const setPlanStartDate = setter('planStartDate');
  const setPlanEndDate = setter('planEndDate');
  const setIdeas = setter('ideas');
  const setMix = setter('mix');
  const setFees = setter('fees');
  const setOverrideNote = setter('overrideNote');
  const setOverrideApproved = setter('overrideApproved');
  const setStatus = setter('status');

  // Saved publications that name this plan as their parent.
  const loadLinked = planId => {
    if (!planId) { setLinked([]); return; }
    api.get('/pp-publications?include=data')
      .then(list => setLinked(list.filter(p => p.summary && p.summary.parentPlanId === planId)))
      .catch(() => setLinked([]));
  };

  useEffect(() => {
    if (savedId && record && String(record.id) === String(savedId)) return undefined;
    setMessage(null);
    setTab('overview');
    if (!savedId) {
      setRecord(null);
      setPlan(blankPlan());
      setLinked([]);
      lastSaved.current = null;
      setLoadState('ready');
      return undefined;
    }
    let stop = false;
    setLoadState('loading');
    api.get('/pp-plans/' + savedId)
      .then(r => {
        if (stop) return;
        const { data, ...meta } = r;
        const next = fromSavedPlan(data);
        setRecord(meta);
        setPlan(next);
        lastSaved.current = next;
        loadLinked(meta.plan_id);
        setLoadState('ready');
      })
      .catch(err => { if (!stop) { setLoadState('error'); setMessage({ kind: 'error', text: err.message }); } });
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Saves `next`. close: back to the plan list afterwards. */
  const persist = async (next, { close = false, done } = {}) => {
    const title = (next.overview.title || '').trim();
    if (!title) {
      setTab('overview');
      setMessage({ kind: 'error', text: 'Add a Publication Plan Title on the Overview tab. It is the only field required to save.' });
      return;
    }
    let log = next.audit || [];
    if (!record) {
      log = log.concat([planAudit('Plan created', userName, 'Draft', 'add_circle', 'var(--ok)')]);
    } else if (lastSaved.current) {
      const changed = changedPlanSections(lastSaved.current, next);
      if (changed.length) log = log.concat([planAudit('Plan saved', userName, 'Changed: ' + changed.join(', '))]);
    }
    const withLog = { ...next, audit: log };
    setSaving(true);
    setMessage(null);
    const body = {
      title, product: next.overview.product || null, status: planStatus(withLog),
      summary: summarizePlan(withLog, linked.length), data: withLog,
    };
    try {
      const saved = record ? await api.put('/pp-plans/' + record.id, body) : await api.post('/pp-plans', body);
      setRecord(saved);
      setPlan(withLog);
      lastSaved.current = withLog;
      if (close) {
        navigate('/publication-plans', { state: { savedPlanId: saved.plan_id } });
        return;
      }
      setMessage({ kind: 'info', text: done || (record ? 'Saved ' : 'Created ') + saved.plan_id + '.' });
      if (!record) navigate('/publication-plan/' + saved.id, { replace: true });
    } catch (err) {
      setMessage({ kind: 'error', text: 'Could not save: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const cancelPlan = () => {
    const reason = cancelReason.trim();
    if (!reason) return;
    setCancelOpen(false);
    setCancelReason('');
    persist({
      ...plan,
      cancelled: { on: TODAY_STR, by: userName, reason },
      audit: plan.audit.concat([planAudit('Plan cancelled', userName, reason, 'block', 'var(--fatal-text)')]),
    }, { done: 'Publication plan cancelled. It stays on file with its audit trail.' });
  };

  const reinstate = () => persist({
    ...plan,
    cancelled: null,
    audit: plan.audit.concat([planAudit('Plan reinstated', userName, 'Back to ' + (plan.status || 'Draft'), 'restore', 'var(--ok)')]),
  }, { done: 'Publication plan reinstated.' });

  const tabs = TABS.map(([tid, label, icon]) => ({
    id: tid, label, icon,
    flagged: tid === 'stakeholders' && stakeholders.some(s => !s.role),
  }));

  const go = path => e => { e.preventDefault(); navigate(path); };
  const pubLink = p => (p.savedId
    ? <a href={'/publication/' + p.savedId} onClick={go('/publication/' + p.savedId)}>{p.id}</a>
    : p.id === PUBLICATION_FORM_ID
      ? <a href="/publication" onClick={go('/publication')}>{p.id}</a>
      : <a href="#" onClick={e => e.preventDefault()}>{p.id}</a>);

  const patchStakeholder = (sid, patch) => setStakeholders(xs => xs.map(x => (x.id === sid ? { ...x, ...patch } : x)));
  const addStakeholder = () => setPlan(p => ({
    ...p,
    stakeholders: p.stakeholders.concat([{ id: p.nextStakeholderId, type: 'Internal', name: '', role: '', coiDate: '', affiliation: '', email: '' }]),
    nextStakeholderId: p.nextStakeholderId + 1,
  }));
  const addIdea = () => setPlan(p => ({
    ...p,
    ideas: p.ideas.concat([{ id: p.nextIdeaId, title: '', owner: '', pubType: 'Abstract', cost: 0 }]),
    nextIdeaId: p.nextIdeaId + 1,
  }));
  const addFee = () => setPlan(p => ({
    ...p,
    fees: p.fees.concat([{ id: p.nextFeeId, vendor: 'New Vendor', description: '', category: 'Administrative', amount: 0 }]),
    nextFeeId: p.nextFeeId + 1,
  }));

  /** Launch creates a real draft publication linked to this plan, then saves the plan. */
  const launchIdea = async idea => {
    if (!record) {
      setMessage({ kind: 'error', text: 'Save the plan first; launched publications are linked to its Plan ID.' });
      return;
    }
    const title = (idea.title || '').trim();
    if (!title) {
      setMessage({ kind: 'error', text: 'Give the planned pub a title before launching it.' });
      return;
    }
    const pubType = LAUNCH_TYPE[idea.pubType] || 'Abstract';
    let pub = blankPublication();
    pub = {
      ...pub,
      pubType,
      product: overview.product || '',
      parentPlan: { id: record.plan_id, name: overview.title },
      fields: { ...pub.fields, abbrevTitle: title, therapeuticArea: '' },
      audit: [pubAuditEntry('Record Created', { participants: userName, result: 'Draft', comment: 'Launched from ' + record.plan_id })],
    };
    const tmpl = TEMPLATE_FOR_TYPE[pubType];
    pub = { ...pub, stageTemplate: tmpl, ...stageTemplatePatch(pub, tmpl) };
    setSaving(true);
    try {
      const saved = await api.post('/pp-publications', {
        title, pub_type: pubType, product: pub.product || null, status: pubStatusOf(pub),
        summary: summarizePublication(pub), data: pubSavedData(pub),
      });
      setSaving(false);
      await persist({
        ...plan,
        ideas: plan.ideas.filter(x => x.id !== idea.id),
        allocations: { ...plan.allocations, [saved.record_id]: idea.cost || 0 },
        audit: plan.audit.concat([planAudit('Publication launched', userName, saved.record_id + ' — ' + title, 'menu_book')]),
      }, { done: `Launched ${saved.record_id}. It's a draft publication linked to this plan.` });
      loadLinked(record.plan_id);
    } catch (err) {
      setSaving(false);
      setMessage({ kind: 'error', text: 'Could not launch: ' + err.message });
    }
  };

  if (loadState !== 'ready') {
    return (
      <div className="ppf-page">
        <div className="ppf-shell ppf-status">
          {loadState === 'loading'
            ? <div className="ppf-hint">Loading publication plan…</div>
            : <InlineMessage kind="error">{message ? message.text : 'Could not load this publication plan.'}</InlineMessage>}
        </div>
      </div>
    );
  }

  // Committed publications: saved records linked to the plan, then anything else recorded on it.
  const linkedRows = linked.map(linkedRow);
  const committed = linkedRows.concat(inPlan.filter(p => !linkedRows.some(l => l.id === p.id)));
  const gantt = buildGantt(overview.title, linked.filter(p => p.status !== 'Cancelled'));
  const inherited = inheritedStakeholders(linked.filter(p => p.status !== 'Cancelled'));
  const currentStatus = planStatus(plan);
  const steps = PLAN_STATUSES.map(label => ({ label, active: label === (plan.status || 'Draft') }));
  const readOnly = !!cancelled;

  return (
    <div className="ppf-page">
      <div className="ppf-shell">
        <RecordHeader
          title={overview.title || 'New Publication Plan'}
          task="Manage Publication Plan"
          subtitle={overview.product ? 'Publication plan for ' + overview.product : 'Publication plan'}
          steps={steps}
          meta={[
            record ? record.plan_id : 'Not saved yet',
            'Owner: ' + (record ? record.owner : userName),
            <>Product: <strong>{overview.product || '—'}</strong></>,
          ].concat(cancelled ? [<Pill tone="cancelled">Cancelled</Pill>] : [])}
          style={{ padding: '14px 18px 10px' }}
        />
        {cancelled && (
          <div className="ppf-banner">
            <InlineMessage kind="warning">
              Cancelled {cancelled.on} by {cancelled.by}: {cancelled.reason}. The plan is read-only; reinstate it to make changes.
            </InlineMessage>
          </div>
        )}
      </div>

      <div className="ppf-shell ppf-body">
        <div className="ppf-rail">
          <SideTabRail tabs={tabs} active={tab} onSelect={setTab} />
        </div>

        <div className={'ppf-panel' + (readOnly ? ' ppf-panel--readonly' : '')}>
          <fieldset className="ppf-fieldset" disabled={readOnly}>
            {tab === 'overview' && (
              <OverviewTab
                overview={overview}
                setField={(k, v) => setOverview(o => ({ ...o, [k]: v }))}
                planColor={planColor}
                setPlanColor={setPlanColor}
                status={plan.status || 'Draft'}
                setStatus={setStatus}
              />
            )}
            {tab === 'strategy' && (
              <StrategyTab strategy={strategy} setField={(k, v) => setStrategy(o => ({ ...o, [k]: v }))} />
            )}
            {tab === 'studies' && (
              <StudiesTab
                noStudy={noStudy}
                onToggleNoStudy={() => { setNoStudy(v => !v); setStudyOpen(false); }}
                studyQuery={studyQuery}
                setStudyQuery={setStudyQuery}
                studyOpen={studyOpen}
                setStudyOpen={setStudyOpen}
                selectedStudies={selectedStudies}
                setSelectedStudies={setSelectedStudies}
              />
            )}
            {tab === 'timeline' && <TimelineTab planColor={planColor} scale={scale} setScale={setScale} gantt={gantt} />}
            {tab === 'stakeholders' && (
              <StakeholdersTab
                inherited={inherited}
                stakeholders={stakeholders}
                patchStakeholder={patchStakeholder}
                removeStakeholder={sid => setStakeholders(xs => xs.filter(x => x.id !== sid))}
                addStakeholder={addStakeholder}
                goToProfile={go('/external-author')}
              />
            )}
            {tab === 'budget' && (
              <AllocationTab
                planBudget={planBudget} setPlanBudget={setPlanBudget}
                planStartDate={planStartDate} setPlanStartDate={setPlanStartDate}
                planEndDate={planEndDate} setPlanEndDate={setPlanEndDate}
                costCenter={overview.costCenter} setCostCenter={v => setOverview(o => ({ ...o, costCenter: v }))}
                ideas={ideas} setIdeas={setIdeas} addIdea={addIdea} launchIdea={launchIdea}
                inPlan={committed} allocations={allocations}
                mix={mix} setMix={setMix}
                fees={fees} setFees={setFees} addFee={addFee}
                overrideNote={overrideNote} setOverrideNote={setOverrideNote}
                overrideApproved={overrideApproved} setOverrideApproved={setOverrideApproved}
                pubLink={pubLink}
              />
            )}
            {tab === 'documents' && <DocumentsTab />}
            {tab === 'audit' && <AuditTab rows={audit} />}
          </fieldset>
        </div>
      </div>

      {message && (
        <div className="ppf-shell ppf-status">
          <InlineMessage kind={message.kind}>{message.text}</InlineMessage>
        </div>
      )}

      <FormActionBar
        left={readOnly ? (
          <Button variant="secondary" onClick={() => navigate('/publication-plans')}>Close</Button>
        ) : (
          <>
            {record && <Button variant="fatal" onClick={() => setCancelOpen(true)} disabled={saving}>Cancel Publication Plan</Button>}
            <Button variant="secondary" onClick={() => navigate('/publication-plans')}>Close Without Saving</Button>
          </>
        )}
        right={readOnly ? (
          <Button variant="secondary" onClick={reinstate} disabled={saving}>Reinstate Publication Plan</Button>
        ) : (
          <>
            <Button variant="tertiary" onClick={() => persist(plan)} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button variant="primary" onClick={() => persist(plan, { close: true })} disabled={saving}>Save &amp; Close</Button>
          </>
        )}
      />

      {cancelOpen && (
        <ConfirmModal
          title={'Cancel ' + record.plan_id + '?'}
          confirmLabel="Cancel Publication Plan"
          cancelLabel="Keep Working"
          onConfirm={cancelPlan}
          onCancel={() => { setCancelOpen(false); setCancelReason(''); }}
        >
          <div className="ppf-stack12">
            <div>The plan stays on file with its audit trail, marked Cancelled. Its publications are not changed. Unsaved changes are saved with it.</div>
            <Field label="Reason (required)">
              <TextArea value={cancelReason} onChange={e => setCancelReason(e.target.value)} width="100%" height="64px" />
            </Field>
            {!cancelReason.trim() && <div className="ppf-hint">Enter a reason to cancel.</div>}
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
