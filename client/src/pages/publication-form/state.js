// Initial record state and the pure state transitions shared by several tabs.
import {
  NO_VENDOR, STAGE_TEMPLATES, RATE_CARD_TEMPLATES, JOURNAL_CHECKLIST, CONGRESS_CHECKLIST,
  READINESS_RESULTS, READINESS_TONE, CONFERENCE_DIRECTORY, TODAY, TODAY_STR,
  buildTemplateRows, scheduleTemplate, fmtDate, nowStamp, toISO, daysFromToday,
} from './data';

// ---- The design's sample record ----------------------------------------------
// Seeded as a real saved record (see SamplePublication.jsx); new records start empty.

// Planned so Author Draft Review falls due with its review round (9/22/2026).
const SAMPLE_START = '8/12/2026';
const SAMPLE_DONE = {
  'Author Invitations': '8/6/2026', 'Kick-off Complete': '8/19/2026', 'Draft Development': '8/31/2026',
  'Draft Development Complete': '8/31/2026', 'Internal Draft Review': '9/7/2026', 'Stats / Data QC': '9/8/2026',
};
const sampleRows = () => buildTemplateRows('Abstract', SAMPLE_START, 1).map(r => (SAMPLE_DONE[r.name]
  ? { ...r, done: true, doneOn: SAMPLE_DONE[r.name], pct: r.type === 'Stage' ? '100' : r.pct }
  : r));

/** A reviewer on a round. decision: pending | approve | changes | reject. */
export const reviewer = (name, role, kind, extra) => ({
  name, role, kind, decision: 'pending', on: '', comment: '', remindedOn: '', ooo: '', ...extra,
});

const SAMPLE_ROUNDS = [
  {
    num: 1, type: 'Internal Draft Review', method: 'Collaborative Edit', priority: 'Standard Review',
    due: '9/7/2026', sentOn: '9/1/2026', closedOn: '9/7/2026', status: 'closed', outcome: 'Changes Requested',
    summary: 'Round 1 closed with edits required. Kristina Hill revised the abstract before Round 2.',
    reviewers: [
      reviewer('Pat Pending', 'Patent Attorney - Daxafort', 'reviewer', { decision: 'approve', on: '9/3/2026', comment: 'No IP concerns.' }),
      reviewer('Ina Ternal', 'Internal Author', 'internal', { decision: 'approve', on: '9/4/2026' }),
      reviewer('Dana Ruiz', 'Medical Director - Immunology', 'reviewer', { decision: 'changes', on: '9/7/2026', comment: 'Tighten the Week 52 durability claim.' }),
    ],
  },
  {
    num: 2, type: 'Stats / Data QC', method: 'Collaborative Edit', priority: 'Standard Review',
    due: '9/8/2026', sentOn: '9/7/2026', closedOn: '9/8/2026', status: 'closed', outcome: 'Approved',
    summary: 'Round 2 approved. Data verified against source tables before the author draft review.',
    reviewers: [
      reviewer('Ben Cho', 'Biostatistics', 'reviewer', { decision: 'approve', on: '9/8/2026', comment: 'Week 52 figures match the source tables.' }),
      reviewer('Ina Ternal', 'Internal Author', 'internal', { decision: 'approve', on: '9/8/2026' }),
    ],
  },
  {
    num: 3, type: 'Author Draft Review', method: 'Collaborative Edit', priority: 'Standard Review',
    due: '9/22/2026', sentOn: '9/8/2026', closedOn: '', status: 'open', outcome: '',
    reviewers: [
      reviewer('Ina Ternal', 'Internal Author', 'internal', { decision: 'approve', on: '9/12/2026' }),
      reviewer('Steve Altschuler', 'External Author · UCLA School of Medicine', 'external', { decision: 'approve', on: '9/15/2026' }),
      reviewer('Priya Raman', 'External Author · Karolinska Institutet', 'external', { decision: 'approve', on: '9/17/2026' }),
      reviewer('Marie Dubois', 'External Author · Hôpital Saint-Louis', 'external', {
        remindedOn: '9/21/2026',
        ooo: 'Auto-reply received 9/21/2026: Marie Dubois is away until 10/19/2026, after the 10/14/2026 congress deadline. Reminders are paused.',
      }),
      reviewer('Henrik Lund', 'External Author · Karolinska University Hospital', 'external', { remindedOn: '9/18/2026' }),
      reviewer('Raj Patel', 'External Author · Imperial College London', 'external', { remindedOn: '9/18/2026' }),
    ],
  },
];

const SAMPLE_AUDIT = [
  ['Initiator', 'Kristina Hill', '8/3/2026 9:02 AM', '8/3/2026', ''],
  ['Author Invitations', 'Kristina Hill → 7 authors', '8/5/2026 10:15 AM', '8/11/2026', '6 accepted'],
  ['Kick-off Complete', 'Kristina Hill', '8/19/2026 2:00 PM', '8/19/2026', 'Complete'],
  ['Draft Development Complete', 'Kristina Hill', '8/31/2026 4:40 PM', '8/31/2026', 'Complete'],
  ['Internal Draft Review (Round 1)', 'Pat Pending [Patent Attorney - Daxafort]\nIna Ternal [Internal Author]\nDana Ruiz [Medical Director - Immunology]', '9/1/2026 9:30 AM', '9/7/2026', 'Changes Requested'],
  ['Stats / Data QC (Round 2)', 'Ben Cho [Biostatistics]\nIna Ternal [Internal Author]', '9/7/2026 3:10 PM', '9/8/2026', 'Approved'],
].map(([action, participants, start, completed, result]) => ({ action, participants, start, completed, result, active: false, comment: '' }))
  .concat([{ action: 'Author Draft Review (Round 3)', participants: '6 authors · secure link with one-time code for external authors', start: '9/8/2026 11:00 AM', completed: '-', result: '', active: true, comment: '', roundNum: 3 }]);

const SAMPLE_HISTORY = [{ suffix: 'Stats Data QC-Approved.pdf', created: '9/8/2026 11:00 AM', by: 'Kristina Hill' }];

export const SAMPLE_RECORD_ID = '26-A-DAX-004-V01';

export const INITIAL_STATE = {
  tab: 'overview',
  reassignType: 'current',
  childPubs: [],
  nextChildId: 1,
  correspondingAuthor: 'Ina Ternal',
  presentingAuthor: 'Steve Altschuler',
  authorMetaEdits: {},
  creditOpen: null,
  internalAuthorPick: '',
  progReminded: {},
  internalSort: { by: 0, dir: 'asc' },
  kvSort: { by: 0, dir: 'asc' },
  authorFilter: 'All',
  authorQuery: '',
  authorSearchOpen: false,
  externalSort: { by: 0, dir: 'asc' },
  externalAuthorPick: '',
  targets: ['American Academy of Dermatology (AAD) Annual Meeting', 'European Academy of Dermatology and Venereology (EADV) Congress', 'European Pain Federation - Congress'],
  dragTarget: null,
  targetQuery: '',
  targetOpen: false,
  reviewerQuery: '',
  searchOpen: false,
  studyQuery: '',
  studyOpen: false,
  noStudy: false,
  pubDoc: false,
  selectedStudies: ['100210'],
  openRound: null,
  newRoundOpen: false,
  currentRoundOpen: true,
  reviewType: 'Internal Draft Review',
  reviewMethod: 'Collaborative Edit',
  internal: [
    { invite: { status: 'accepted', sent: '8/5/2026', on: '8/6/2026' }, id: 1, name: 'Ina Ternal', display: 'Demo Internal Author', agreement: 'Authorship_Agreement_Ternal_Signed.pdf', agreementDate: '4/2/2025', selected: true, corr: 'required' },
  ],
  external: [
    { invite: { status: 'accepted', sent: '8/5/2026', on: '8/5/2026' }, id: 1, name: 'Steve Altschuler-UCLA School of Medicine', display: 'Steve Altschuler', agreement: 'Authorship_Agreement_Altschuler_Signed.pdf', agreementDate: '3/14/2025', selected: true, corr: 'required' },
    { invite: { status: 'accepted', sent: '8/5/2026', on: '8/7/2026' }, id: 2, name: 'Priya Raman-Karolinska Institutet', display: 'Priya Raman', agreement: 'Authorship_Agreement_Raman_Signed.pdf', agreementDate: '1/8/2026', selected: true, corr: 'optional' },
    { invite: { status: 'accepted', sent: '8/5/2026', on: '8/8/2026' }, id: 3, name: 'Marie Dubois-Hôpital Saint-Louis', display: 'Marie Dubois', agreement: 'Authorship_Agreement_Dubois_Signed.pdf', agreementDate: '8/10/2026', selected: true, corr: 'optional' },
    { invite: { status: 'accepted', sent: '8/5/2026', on: '8/11/2026' }, id: 4, name: 'Henrik Lund-Karolinska University Hospital', display: 'Henrik Lund', agreement: 'Authorship_Agreement_Lund_Signed.pdf', agreementDate: '8/12/2026', selected: true, corr: 'optional' },
    { invite: { status: 'none' }, id: 6, name: 'Kenji Sato-University of Tokyo', display: 'Kenji Sato', agreement: '', agreementDate: '', selected: true, corr: 'optional' },
    { invite: { status: 'accepted', sent: '8/5/2026', on: '8/6/2026' }, id: 5, name: 'Raj Patel-Imperial College London', display: 'Raj Patel', agreement: 'Authorship_Agreement_Patel_Signed.pdf', agreementDate: '8/11/2026', selected: true, corr: 'optional' },
  ],
  mandatory: [
    { id: 1, name: 'Pat Pending', role: 'Patent Attorney - Daxafort' },
  ],
  additional: [
    { id: 1, name: 'Dana Ruiz', role: 'Medical Director - Immunology', selected: true },
  ],
  nextReviewerId: 2,
  subType: '',
  parentPlan: { id: 'PLAN-26-DAX-002', name: 'Daxafort Dissemination Plan' },
  planQuery: '',
  planFocused: false,
  product: 'Daxafort (Atopic Dermatitis)',
  additionalProducts: [],
  checklist: CONGRESS_CHECKLIST,
  planBudget: 64000,
  journalChecklist: JOURNAL_CHECKLIST,
  readinessChecked: false,
  citationsVerified: false,
  outcomeStatus: '',
  responseDone: {},
  proofDone: {},
  dispositionRecorded: false,
  returnedToSubmission: false,
  rejectionHistory: [],
  poNumber: 'PO-40217',
  vendor: NO_VENDOR,
  rateCard: '',
  stageTemplate: 'Abstract',
  pubType: 'Abstract',
  pubStart: SAMPLE_START,
  priorVendorName: 'Nucleus Global',
  priorVendorDate: '7/30/2026',
  nextRowId: 100,
  rows: sampleRows(),
  rounds: SAMPLE_ROUNDS,
  audit: SAMPLE_AUDIT,
  historyFiles: SAMPLE_HISTORY,
  pubDocOn: '',
  pubDocBy: '',
  cancelled: null,
  respondEdit: null,
  // Values the design shows as static defaults; kept here so the inputs stay editable.
  fields: {},
};

/** Defaults for the design's static (non-bound) inputs, keyed by field name. */
export const FIELD_DEFAULTS = {
  abbrevTitle: 'Daxafort in Moderate-to-Severe Atopic Dermatitis: CLARIFY',
  pubTitle: 'Daxafort in Moderate-to-Severe Atopic Dermatitis: Week 52 Results of the CLARIFY Trial',
  therapeuticArea: 'Immunology',
  department: 'Medical Affairs',
  sponsorType: 'Company Sponsored',
  roundDue: '10/8/2026',
  priority: 'Standard Review',
  timezone: 'ET',
  actualCost: '0.00',
  citationType: 'Journal Article',
  delegateTo: '',
  reassignFrom: '',
};

// ---- New and saved records ---------------------------------------------------

/**
 * Starting point for a new publication: the design's templates (stage plan, checklists)
 * stay, but everything specific to the sample record is cleared.
 */
export function blankState() {
  const start = fmtDate(new Date());
  return {
    ...INITIAL_STATE,
    childPubs: [],
    correspondingAuthor: '',
    presentingAuthor: '',
    internal: [],
    external: [],
    mandatory: [],
    additional: [],
    targets: [],
    selectedStudies: [],
    pubDoc: false,
    parentPlan: null,
    product: '',
    additionalProducts: [],
    poNumber: '',
    priorVendorName: '',
    priorVendorDate: '',
    pubStart: start,
    rows: buildTemplateRows('Abstract', start, 1),
    rounds: [],
    audit: [],
    historyFiles: [],
    cancelled: null,
    fields: {
      abbrevTitle: '',
      pubTitle: '',
      therapeuticArea: '',
      department: '',
      sponsorType: '',
      roundDue: '',
    },
  };
}

// UI-only keys (open menus, search boxes, the current tab) that aren't saved with the record.
const TRANSIENT_KEYS = [
  'tab', 'creditOpen', 'authorSearchOpen', 'authorQuery', 'dragTarget', 'targetQuery', 'targetOpen',
  'reviewerQuery', 'searchOpen', 'studyQuery', 'studyOpen', 'planQuery', 'planFocused',
  'newRoundOpen', 'openRound', 'respondEdit',
];

/** The record state to persist. */
export function toSavedData(st) {
  const data = { ...st, fields: { ...FIELD_DEFAULTS, ...st.fields } };
  TRANSIENT_KEYS.forEach(k => { delete data[k]; });
  return data;
}

/** Rebuilds form state from a saved record, filling any keys added since it was saved. */
export function fromSavedData(data) {
  const base = blankState();
  return { ...base, ...data, fields: { ...base.fields, ...(data && data.fields) }, tab: 'overview' };
}

/** The title a record is listed under: the abbreviated title, else the full title. */
export const titleOf = st => (st.fields.abbrevTitle ?? FIELD_DEFAULTS.abbrevTitle).trim()
  || (st.fields.pubTitle ?? FIELD_DEFAULTS.pubTitle).trim();

// ---- Record identity ---------------------------------------------------------

export const recordIdOf = st => (st.pubType === 'Manuscript' ? '26-M-DAX-004-V01' : '26-A-DAX-004-V01');
export const checklistKey = st => (st.pubType === 'Manuscript' ? 'journalChecklist' : 'checklist');
export const activeChecklist = st => st[checklistKey(st)];

// ---- Planning rows -----------------------------------------------------------

/** Replaces the plan rows with a stage template, scheduled from the start date. */
export function stageTemplatePatch(s, name, startStr) {
  if (!STAGE_TEMPLATES[name]) return {};
  const rows = buildTemplateRows(name, startStr != null ? startStr : s.pubStart, s.nextRowId);
  return { nextRowId: s.nextRowId + rows.length, rows };
}

/** Replaces the plan rows with a vendor rate card's payable milestones. */
export function rateCardPatch(s, vendor, rateCard, startStr) {
  const tmpl = RATE_CARD_TEMPLATES[rateCard];
  if (!vendor || vendor === NO_VENDOR || !tmpl) return {};
  const sched = scheduleTemplate(tmpl, startStr != null ? startStr : s.pubStart);
  return {
    nextRowId: s.nextRowId + sched.length,
    rows: sched.map((m, i) => ({
      id: s.nextRowId + i,
      name: m.name, type: m.type, done: false, pct: m.type === 'Stage' ? '0' : '',
      days: m.days, start: m.start, end: m.end,
      costed: m.costed, amount: m.amount, paidAmount: 0,
      status: m.costed ? 'pending' : 'notmet',
    })),
  };
}

// ---- Shared derivations ------------------------------------------------------

/** Tabs that carry a "required fields missing" dot on the rail. */
export const missingFlags = st => ({
  checklist: activeChecklist(st).some(i => i.required && !i.done),
  planning: st.rows.some(r => r.type === 'Stage' && (!r.start || !r.end)),
});

/** The review round currently out for responses, if any. */
export const openRoundOf = st => (st.rounds || []).find(r => r.status === 'open') || null;

/** Review outcome from the decisions given: any rejection, else any changes, else approved. */
export const roundOutcome = round => {
  const d = round.reviewers.map(r => r.decision);
  if (d.includes('reject')) return 'Not Approved';
  if (d.includes('changes')) return 'Changes Requested';
  return 'Approved';
};

const relLabel = n => (n == null ? 'No date' : n === 0 ? 'Due today' : n === 1 ? 'Due tomorrow'
  : n === -1 ? '1 day overdue' : n < 0 ? -n + ' days overdue' : 'In ' + n + ' days');
/** Pill tone for a due date: overdue, due within a week, or on track. */
export const dueTone = n => (n == null ? 'outline' : n < 0 ? 'overdue' : n <= 7 ? 'due-soon' : 'on-track');

/** Workflow steps from the Planning tab: included rows in order, the first not-done row is current. */
export function deriveSteps(st) {
  const rows = (st.rows || []).filter(r => r.name && !(r.optional && !r.included));
  if (!rows.length) return { steps: [], ci: -1, allDone: false };
  const ci = st.returnedToSubmission ? rows.length - 1 : rows.findIndex(r => !r.done);
  const doneDate = r => r.doneOn || r.end || r.start || '—';
  const steps = rows.map((r, i) => ({
    name: r.name,
    type: r.type,
    start: r.start || r.end || '',
    pct: r.done ? 100 : parseInt(r.pct, 10) || 0,
    d: r.end || r.start || '—',
    done: (st.returnedToSubmission ? i < ci : r.done) ? doneDate(r) : undefined,
    current: i === ci,
  }));
  return { steps, ci, allDone: ci === -1 };
}

/** Current step, review responses and the submission deadline for the record header. */
export function deriveProgress(st) {
  const { steps, ci, allDone } = deriveSteps(st);
  const cur = ci >= 0 ? steps[ci] : null;
  const nx = ci >= 0 ? steps.slice(ci + 1).find(x => !x.done) : null;
  const n = cur ? daysFromToday(cur.d) : null;
  const round = openRoundOf(st);
  const rvs = round ? round.reviewers : [];
  const doneN = rvs.filter(r => r.decision !== 'pending').length;
  const oooN = rvs.filter(r => r.decision === 'pending' && r.ooo).length;

  const deadline = (() => {
    const pt = CONFERENCE_DIRECTORY.find(c => c.name === (st.targets || [])[0]);
    if (!pt) return { progDeadline: 'No target selected', progDeadlineNote: 'Add one on the Target tab' };
    if (pt.kind === 'Journal') return { progDeadline: pt.abbr, progDeadlineNote: 'Continuous submission' };
    const days = Math.round((new Date(pt.close) - TODAY) / 86400000);
    return { progDeadline: pt.abbr + ' ' + pt.end.split('/')[2] + ' · ' + pt.close, progDeadlineNote: days >= 0 ? days + ' days away' : -days + ' days past' };
  })();

  return {
    progStepOf: !steps.length ? 'NO PLAN YET' : allDone ? 'ALL ' + steps.length + ' STEPS DONE' : 'STEP ' + (ci + 1) + ' OF ' + steps.length,
    progStepName: cur ? cur.name : allDone ? 'All steps complete' : 'Add stages on the Planning tab',
    progDue: cur ? cur.d : '—',
    progDueRel: cur ? relLabel(n) : allDone ? 'Complete' : 'Not scheduled',
    progDueTone: cur ? dueTone(n) : allDone ? 'on-track' : 'outline',
    progHasRound: !!round,
    progRoundLabel: round ? 'Round ' + round.num + ' · ' + round.type : '',
    progDoneLabel: round ? doneN + ' of ' + rvs.length + ' responded' : 'No review in progress',
    progPct: rvs.length ? Math.round(doneN / rvs.length * 100) + '%' : '0%',
    progOooLabel: round ? oooN + ' out of office' : 'Start a round on the Reviews tab',
    progNextName: nx ? nx.name : '—',
    progNextDate: nx ? nx.d : '—',
    currentStepName: cur ? cur.name : allDone ? 'Complete' : 'Not started',
    progSteps: steps.map(x => ({
      name: x.name,
      tip: x.done ? 'Completed ' + x.done + ' (planned ' + x.d + ')' : (x.current ? 'Due ' : 'Planned ') + x.d,
      glyph: x.done ? 'check_circle' : x.current ? 'radio_button_checked' : 'radio_button_unchecked',
      glyphColor: x.done ? 'var(--ok)' : x.current ? 'var(--high-emphasis)' : 'var(--fg-disabled)',
      weight: x.current ? 700 : 400,
      color: x.current ? 'var(--nav)' : x.done ? 'var(--fg-3)' : 'var(--text-body)',
    })),
    ...deadline,
  };
}

/** Lifecycle status stored with the record. */
export const statusOf = st => (st.cancelled ? 'Cancelled' : openRoundOf(st) ? 'In Review' : 'Draft');

/**
 * What the dashboards need without loading the whole record. Dates are ISO (YYYY-MM-DD);
 * steps and people use the Writer Dashboard's shape.
 */
export function summarize(st) {
  const { steps, ci } = deriveSteps(st);
  const idx = ci >= 0 ? ci : steps.length - 1;
  const iso = d => toISO(d) || toISO(TODAY_STR);
  const round = openRoundOf(st);
  const cur = steps[idx];
  return {
    stepName: cur ? cur.name : '',
    stepNum: idx + 1,
    stepTotal: steps.length,
    due: cur ? iso(cur.d) : '',
    steps: steps.map((x, i) => ({
      name: x.name, type: x.type, start: iso(x.start || x.d), d: iso(x.d), pct: x.pct,
      done: x.done ? iso(x.done) : undefined, current: i === idx,
    })),
    // Links the record to its publication plan (the plan lists and charts its publications).
    parentPlanId: st.parentPlan ? st.parentPlan.id : '',
    roundType: round ? round.type : '',
    people: round ? round.reviewers.map(r => ({
      name: r.name, role: r.role,
      status: r.decision !== 'pending' ? 'done' : r.ooo ? 'ooo' : 'pending',
      last: toISO(r.remindedOn) || '—',
    })) : [],
  };
}

// ---- Audit trail -------------------------------------------------------------

/** An Activity Log row. Completed defaults to today; pass active: true for work still under way. */
export const auditEntry = (action, extra) => ({
  action, participants: '', start: nowStamp(), completed: TODAY_STR, result: '', active: false, comment: '', ...extra,
});

// Parts of the record compared on save, so the log can say what changed.
const SECTIONS = {
  Overview: x => [x.fields.abbrevTitle, x.fields.pubTitle, x.pubType, x.subType, x.parentPlan, x.fields.therapeuticArea, x.product, x.additionalProducts, x.fields.department, x.fields.sponsorType],
  Authors: x => [x.internal, x.external, x.correspondingAuthor, x.presentingAuthor, x.authorMetaEdits],
  Publication: x => [x.pubDoc, x.pubDocText],
  Target: x => [x.targets],
  Studies: x => [x.selectedStudies, x.noStudy],
  Planning: x => [x.rows, x.vendor, x.rateCard, x.stageTemplate, x.pubStart, x.poNumber],
  Reviews: x => [x.mandatory, x.additional],
  Compliance: x => [x.checklist, x.journalChecklist],
  Outcome: x => [x.outcomeStatus, x.responseDone, x.proofDone, x.dispositionRecorded, x.childPubs, x.fields.actualCost],
  Citations: x => [x.citationsVerified, x.fields.citationType],
};

/** Tab names whose saved content differs between two saved-data snapshots. */
export const changedSections = (before, after) => Object.keys(SECTIONS)
  .filter(k => JSON.stringify(SECTIONS[k](before)) !== JSON.stringify(SECTIONS[k](after)));

/** Outstanding required checklist items, with the advisory AI readiness results. */
export function deriveReadiness(st) {
  const KEY = checklistKey(st);
  const out = activeChecklist(st).filter(i => i.required && !i.done);
  return {
    checklistKindLabel: KEY === 'journalChecklist' ? 'Journal checklist · loaded for Manuscript' : 'Congress checklist · loaded for ' + st.pubType,
    readinessCount: out.length ? out.length + ' required item' + (out.length === 1 ? '' : 's') + ' outstanding' : 'All required items complete',
    readinessHasItems: out.length > 0,
    readinessItems: out.slice(0, 12).map((i, n) => {
      const r = READINESS_RESULTS[(i.id * 7 + n) % 3];
      return { id: i.id, label: i.label, group: i.group, result: st.readinessChecked ? r : 'Not checked', tone: st.readinessChecked ? READINESS_TONE[r] : 'outline' };
    }),
    readinessMore: out.length > 12 ? '+ ' + (out.length - 12) + ' more on the Compliance tab' : '',
    readinessSummary: st.readinessChecked ? 'Checked ' + TODAY_STR + ' · results are advisory — confirm each item before submission.' : '',
  };
}
