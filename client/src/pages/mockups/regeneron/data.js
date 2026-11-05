// Static sample data for the clearance mockups. Every name and record ID is fictional.
// "Today" is fixed so the screens read the same on any day they are opened or captured.

export const TODAY = new Date(2026, 10, 5); // Thu Nov 5, 2026

export const COORDINATOR = { first: 'Jordan', name: 'Jordan Ellis' };
export const REQUESTER = { first: 'Priya', name: 'Priya Natarajan', email: 'priya.natarajan@example.com' };

export const STEPS = ['Submitted', 'Triage', 'In Review', 'Holding', 'Approved'];

export const STATUS_TONE = {
  Draft: 'draft',
  'Submitted, Awaiting Validation': 'outline',
  'Revisions Required': 'nav',
  'In Review': 'active',
  Holding: 'hold',
  Approved: 'outline',
  Cancelled: 'cancelled',
};

const d = (m, day) => new Date(2026, m - 1, day);

/** Section A: the coordinator's validation queue. Kept unsorted on purpose; the page sorts by due date. */
export const AWAITING = [
  {
    id: 'CLR-2026-1416', title: 'Complement inhibition in geographic atrophy (manuscript)', type: 'Publication',
    requester: 'Marcus Webb', dept: 'Therapeutic Focus Area', sub: 'Ophthalmology', submitted: d(10, 30), due: d(11, 12),
  },
  {
    id: 'CLR-2026-1425', title: 'Bispecific T-cell engager dose escalation (AACR abstract)', type: 'Publication',
    requester: 'Dana Whitfield', dept: 'Therapeutic Focus Area', sub: 'Oncology', submitted: d(11, 4), due: d(11, 10), expedited: true,
    flags: [{ text: 'Expedited justification missing', field: 'Reason for expedited review', detail: 'Expedited review is set to Yes, but the reason field is empty.' }],
  },
  {
    id: 'CLR-2026-1419', title: 'Lentiviral delivery in murine retinal models (poster)', type: 'Publication',
    requester: 'Marcus Webb', dept: 'Therapeutic Focus Area', sub: 'Ophthalmology', submitted: d(11, 2), due: d(11, 6),
    flags: [{ text: "Attachment doesn't match publication type", field: 'Publication type', detail: 'Publication type is Manuscript, but the attached file is a one-page poster PDF.' }],
    open: true,
  },
  {
    id: 'CLR-2026-1427', title: 'Antibody half-life modeling (ASH abstract)', type: 'Publication',
    requester: 'Priya Natarajan', dept: 'Therapeutic Focus Area', sub: 'Hematology', submitted: d(11, 5), due: d(11, 5), expedited: true,
    flags: [{ text: 'Due date is same day as submission', field: 'Requested review date', detail: 'Submitted and due today. Confirm the date with the requester before routing.' }],
  },
  {
    id: 'CLR-2026-1423', title: 'Summer intern project: CRISPR screen in hepatocytes', type: 'SPP',
    requester: 'Elena Ruiz', dept: 'Tech Center', sub: 'Genomics', submitted: d(11, 3), due: d(11, 6),
  },
  {
    id: 'CLR-2026-1421', title: 'Open-source release: image segmentation pipeline', type: 'OSS',
    requester: 'Tom Okafor', dept: 'Tech Center', sub: 'Imaging', submitted: d(11, 2), due: d(11, 9),
  },
  {
    id: 'CLR-2026-1424', title: 'High school mentorship: protein folding visualization', type: 'SPP',
    requester: 'Priya Natarajan', dept: 'Research Operations', sub: 'Education Outreach', submitted: d(11, 4), due: d(11, 13),
  },
  {
    id: 'CLR-2026-1418', title: 'IL-33 signaling in airway inflammation (ATS poster)', type: 'Publication',
    requester: 'Elena Ruiz', dept: 'Therapeutic Focus Area', sub: 'Immunology', submitted: d(10, 29), due: d(11, 16),
    flags: [{ text: 'Same title as CLR-2026-1398', field: 'Title', detail: 'A record with this title was approved on Oct 2. Check whether this is a resubmission.' }],
  },
  {
    id: 'CLR-2026-1426', title: 'Open-source release: variant calling utilities', type: 'OSS',
    requester: 'Dana Whitfield', dept: 'Tech Center', sub: 'Genomics', submitted: d(11, 5), due: d(11, 19),
  },
  {
    id: 'CLR-2026-1428', title: 'Lipid outcomes in a cardiometabolic cohort (AHA slides)', type: 'Publication',
    requester: 'Tom Okafor', dept: 'Therapeutic Focus Area', sub: 'Cardiovascular', submitted: d(11, 5), due: d(11, 20),
  },
];

/** Section B: records out with reviewers. Only at-risk rows carry a tag. */
export const IN_REVIEW = [
  { id: 'CLR-2026-1407', title: 'Allergen immunotherapy biomarkers (EAACI poster)', type: 'Publication', requester: 'Marcus Webb', due: d(11, 10), reviewers: [2, 2] },
  { id: 'CLR-2026-1405', title: 'Myostatin pathway modeling in sarcopenia (manuscript)', type: 'Publication', requester: 'Priya Natarajan', due: d(11, 3), reviewers: [2, 3], risk: 'Overdue' },
  { id: 'CLR-2026-1408', title: 'Open-source release: flow cytometry gating toolkit', type: 'OSS', requester: 'Tom Okafor', due: d(11, 6), reviewers: [1, 3], risk: 'Falling behind' },
  { id: 'CLR-2026-1412', title: 'Retinal organoid imaging (ARVO abstract)', type: 'Publication', requester: 'Elena Ruiz', due: d(11, 4), reviewers: [1, 2], risk: 'Overdue' },
  { id: 'CLR-2026-1410', title: 'Summer intern project: single-cell atlas of tonsil tissue', type: 'SPP', requester: 'Elena Ruiz', due: d(11, 9), reviewers: [1, 2] },
  { id: 'CLR-2026-1413', title: 'Complement C5 dynamics in myasthenia models (abstract)', type: 'Publication', requester: 'Dana Whitfield', due: d(11, 11), reviewers: [3, 4] },
  { id: 'CLR-2026-1409', title: 'Summer intern project: organoid imaging', type: 'SPP', requester: 'Priya Natarajan', due: d(11, 12), reviewers: [2, 3] },
  { id: 'CLR-2026-1415', title: 'Tumor microenvironment profiling in NSCLC (encore poster)', type: 'Publication', requester: 'Marcus Webb', due: d(11, 17), reviewers: [0, 3] },
  { id: 'CLR-2026-1417', title: 'Open-source release: plate reader QC scripts', type: 'OSS', requester: 'Dana Whitfield', due: d(11, 18), reviewers: [1, 2] },
  { id: 'CLR-2026-1420', title: 'Hepatic fibrosis scoring with deep learning (manuscript)', type: 'Publication', requester: 'Tom Okafor', due: d(11, 24), reviewers: [0, 3] },
];

/** The requester's own records in flight. `steps` holds the date each step was reached. */
export const MY_SUBMISSIONS = [
  {
    id: 'CLR-2026-1414', title: 'Tumor microenvironment profiling (SITC poster)', type: 'Publication', status: 'Revisions Required',
    reviewDate: d(11, 13), stepDates: [d(10, 28), d(11, 2)], returnedAt: 1, action: 'Respond to revisions',
    next: 'The coordinator asked for a corrected author list.',
  },
  {
    id: 'CLR-2026-1427', title: 'Antibody half-life modeling (ASH abstract)', type: 'Publication', status: 'Submitted, Awaiting Validation',
    reviewDate: d(11, 5), stepDates: [d(11, 5)], next: 'Coordinator checks and routes it to reviewers',
  },
  {
    id: 'CLR-2026-1409', title: 'Summer intern project: organoid imaging', type: 'SPP', status: 'In Review',
    reviewDate: d(11, 12), stepDates: [d(10, 26), d(10, 27), d(10, 28)], next: '2 of 3 reviewers have approved',
  },
  {
    id: 'CLR-2026-1424', title: 'High school mentorship: protein folding visualization', type: 'SPP', status: 'Holding',
    reviewDate: d(11, 13), stepDates: [d(10, 20), d(10, 21), d(10, 22), d(11, 3)], next: 'All reviewers approved. Approves on your requested date.',
  },
];

export const DEPARTMENTS = {
  'Therapeutic Focus Area': ['Cardiovascular', 'Rheumatology', 'Immunology', 'Oncology', 'Ophthalmology'],
  'Tech Center': ['Genomics', 'Imaging', 'Data Science'],
  'Research Operations': ['Education Outreach', 'Lab Operations'],
  Manufacturing: ['Process Development', 'Quality'],
};

/* ---------- dates ---------- */

const DAY = 86400000;
export const fmt = date => (date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
export const fmtLong = date => date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
export const daysFrom = date => Math.round((date - TODAY) / DAY);

/** Calendar-day countdown in words, plus the deadline tone the design system uses for it. */
export function dueLabel(date) {
  const n = daysFrom(date);
  if (n < 0) return { text: -n === 1 ? '1 day overdue' : -n + ' days overdue', tone: 'overdue' };
  if (n === 0) return { text: 'Due today', tone: 'due-soon' };
  if (n <= 2) return { text: n === 1 ? '1 day left' : n + ' days left', tone: 'due-soon' };
  return { text: n + ' days left', tone: 'on-track' };
}

/** Business days from TODAY to `date` (weekends skipped). */
export function businessDaysUntil(date) {
  let n = 0;
  const cur = new Date(TODAY);
  while (cur < date) {
    cur.setDate(cur.getDate() + 1);
    const wd = cur.getDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}

/** m/d/yyyy text to a Date, or null. */
export function parseDate(s) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((s || '').trim());
  if (!m) return null;
  const dt = new Date(+m[3], +m[1] - 1, +m[2]);
  return isNaN(dt) ? null : dt;
}
