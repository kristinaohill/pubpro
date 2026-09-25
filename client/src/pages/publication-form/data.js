// Static data and schedule helpers for the Publication Form, ported from the
// Claude Design file "Publication Form.dc.html".

import { STUDY_PROFILES } from "./studyProfiles";

export const TABS = [
  ["overview", "OVERVIEW", "summarize"],
  ["authors", "AUTHORS", "group"],
  ["materials", "PUBLICATION", "menu_book"],
  ["details", "TARGET", "description"],
  ["study", "STUDIES", "science"],
  ["planning", "PLANNING", "calendar_month"],
  ["reviewers", "REVIEWS", "done_all"],
  ["checklist", "COMPLIANCE", "checklist"],
  ["outcome", "OUTCOME", "monitoring"],
  ["citations", "CITATIONS", "format_quote"],
  ["taskoptions", "TASK OPTIONS", "swap_horiz"],
  ["documents", "DOCUMENTS", "attach_file"],
  ["audit", "AUDIT TRAIL", "account_tree"],
];

export const STATUS_LOOK = {
  paid:     { markIcon: "check_circle", markColor: "var(--ok)", statusLabel: "PAID", statusColor: "var(--ok)", noActionLabel: "Closed" },
  queued:   { markIcon: "schedule_send", markColor: "var(--high-emphasis)", statusLabel: "PAYMENT INITIATED", statusColor: "var(--info-icon)", noActionLabel: "Queued for sync" },
  approved: { markIcon: "how_to_reg", markColor: "var(--ok)", statusLabel: "APPROVED", statusColor: "var(--ok)", noActionLabel: "" },
  pending:  { markIcon: "pending", markColor: "var(--warn-text)", statusLabel: "AWAITING APPROVAL", statusColor: "var(--warn-text)", noActionLabel: "" },
  returned: { markIcon: "undo", markColor: "var(--fatal-text)", statusLabel: "RETURNED", statusColor: "var(--fatal-text)", noActionLabel: "With vendor" },
  notmet:   { markIcon: "radio_button_unchecked", markColor: "var(--fg-disabled)", statusLabel: "NOT STARTED", statusColor: "var(--fg-faint)", noActionLabel: "Not started" },
  nocost:   { markIcon: "remove", markColor: "var(--fg-disabled)", statusLabel: "NON-BILLABLE", statusColor: "var(--fg-muted)", noActionLabel: "—" },
};

// Studies for the four products, each under its therapeutic area. NCT numbers are
// placeholders (NCT099…) so they never resolve to a real registered trial.
const DAX = ["Daxafort (Atopic Dermatitis)", "Immunology"];
const BLX = ["Biologix (All)", "Cardiovascular & Metabolism"];
const DXN = ["Daxafont (DMD)", "Neuroscience"];
const TRZ = ["Triazapam (Dermatology)", "Immunology"];

// [id, title, status, [product, area], manager, expected completion, interim cut-off, data lock,
//  submission deadline, embargo lift, primary outcome, results availability, dissemination, rationale, NCT]
export const STUDY_DIRECTORY = [
  ["100210", "DAX-301 (CLARIFY): Phase III Pivotal Trial of Daxafort in Moderate-to-Severe Atopic Dermatitis", "Completed", DAX, "Kristina Hill", "6/30/2026", "3/1/2026", "5/12/2026", "10/30/2026", "11/15/2026", "Met primary endpoint", "Available", "Planned", "", "NCT09900101"],
  ["100211", "DAX-302: 52-Week Open-Label Extension of Daxafort in Atopic Dermatitis", "In Progress", DAX, "Kristina Hill", "3/31/2027", "12/15/2026", "", "", "", "Pending", "Not yet available", "Planned", "", "NCT09900102"],
  ["100212", "DAX-303: Daxafort in Children Aged 6 to 11 with Severe Atopic Dermatitis", "On Hold", DAX, "Dana Ruiz", "6/30/2028", "", "", "", "", "Pending", "Not yet available", "Under review", "", "NCT09900103"],
  ["100220", "BLX-CAD-301 (CLARITY-CAD): Biologix in Non-Obstructive Coronary Artery Disease", "Completed", BLX, "Ben Cho", "5/29/2026", "1/15/2026", "4/20/2026", "11/20/2026", "", "Met primary endpoint", "Available", "Planned", "", "NCT09900201"],
  ["100221", "BLX-310: Biologix vs. Placebo on Glycemic Control in Type 2 Diabetes", "Completed", BLX, "Ben Cho", "11/14/2025", "", "10/2/2025", "", "", "Did not meet primary endpoint", "Available", "Planned", "", "NCT09900202"],
  ["100222", "BLX-CVOT: Cardiovascular Outcomes Trial of Biologix in High-Risk Adults", "In Progress", BLX, "Lena Ortiz", "12/31/2027", "6/30/2027", "", "", "", "Pending", "Not yet available", "Planned", "", "NCT09900203"],
  ["100223", "BLX-215: Once-Weekly Biologix Pharmacokinetic Bridging Study", "Cancelled", BLX, "Tom Nakamura", "", "", "", "", "", "Not applicable", "Not available", "Not planned", "Terminated before enrollment completed after a portfolio decision", ""],
  ["100230", "DXN-301: Phase III Trial of Daxafont in Ambulatory Boys with Duchenne Muscular Dystrophy", "In Progress", DXN, "Tom Nakamura", "8/31/2027", "2/1/2027", "", "", "", "Pending", "Not yet available", "Planned", "", "NCT09900301"],
  ["100231", "DXN-201: Phase II Dystrophin Expression Study of Daxafont in DMD", "Completed", DXN, "Tom Nakamura", "2/27/2026", "", "1/9/2026", "12/4/2026", "", "Met primary endpoint", "Available", "Planned", "", "NCT09900302"],
  ["100232", "DXN-302: Long-Term Extension of Daxafont on Motor and Pulmonary Function in DMD", "In Progress", DXN, "Ina Ternal", "10/31/2028", "", "", "", "", "Pending", "Not yet available", "Planned", "", "NCT09900303"],
  ["100240", "TRZ-301: Triazapam Cream in Mild-to-Moderate Plaque Psoriasis", "Completed", TRZ, "Lena Ortiz", "4/30/2026", "", "3/18/2026", "1/15/2027", "", "Met primary endpoint", "Available", "Planned", "", "NCT09900401"],
  ["100241", "TRZ-302: Triazapam vs. Vehicle in Chronic Hand Eczema", "In Progress", TRZ, "Lena Ortiz", "9/30/2027", "3/31/2027", "", "", "", "Pending", "Not yet available", "Planned", "", "NCT09900402"],
  ["100242", "TRZ-204: Phase II Study of Triazapam in Seborrheic Dermatitis", "Completed", TRZ, "Dana Ruiz", "1/30/2026", "", "12/12/2025", "", "", "Did not meet primary endpoint", "Available", "Not planned", "Exploratory study; results will be posted to the trial registry only", "NCT09900403"],
].map(([id, title, status, [product, area], manager, expected, interim, lock, deadline, embargo, outcome, availability, dissemination, rationale, nct]) => ({
  id, title, status, product, area, manager, expected, interim, lock, deadline, embargo,
  outcome, availability, dissemination, rationale, nct,
  hasRationale: !!rationale,
  nctUrl: nct ? "https://clinicaltrials.gov/study/" + nct : "",
  altId: title.split(/[ :]/)[0],
  phase: /CVOT/.test(title) ? "3" : (title.match(/^[A-Z]+(?:-[A-Z]+)?-(\d)/) || [])[1] || "",
  studyType: "Clinical Trial",
  sponsorType: "Company",
  sponsor: "ACME",
  interventional: "Yes",
  retro: "Prospective",
  ...(STUDY_PROFILES[id] || {}),
}));

export const STUDY_STATUS_BG = {
  "In Progress": "var(--high-emphasis)",
  "Completed": "var(--status-draft)",
  "On Hold": "var(--status-hold)",
  "Cancelled": "var(--status-cancelled)",
};

export const INTERNAL_AUTHOR_DIRECTORY = ["Ina Ternal", "Kristina Hill", "Dana Ruiz", "Ben Cho", "Tom Nakamura", "Lena Ortiz"];
export const EXTERNAL_AUTHOR_DIRECTORY = [
  { name: "Steve Altschuler-UCLA School of Medicine", display: "Steve Altschuler", agreement: "Authorship_Agreement_Altschuler_Signed.pdf", agreementDate: "3/14/2025" },
  { name: "Priya Raman-Karolinska Institutet", display: "Priya Raman", agreement: "Authorship_Agreement_Raman_Signed.pdf", agreementDate: "1/8/2026" },
  { name: "Helen Marsh-Mayo Clinic", display: "Helen Marsh", agreement: "Authorship_Agreement_Marsh_Signed.pdf", agreementDate: "11/3/2025" },
  { name: "Kenji Sato-University of Tokyo", display: "Kenji Sato", agreement: "Authorship_Agreement_Sato_Signed.pdf", agreementDate: "2/20/2026" },
  { name: "Marie Dubois-Hôpital Saint-Louis", display: "Marie Dubois", agreement: "Authorship_Agreement_Dubois_Signed.pdf", agreementDate: "8/10/2026" },
  { name: "Henrik Lund-Karolinska University Hospital", display: "Henrik Lund", agreement: "Authorship_Agreement_Lund_Signed.pdf", agreementDate: "8/12/2026" },
  { name: "Raj Patel-Imperial College London", display: "Raj Patel", agreement: "Authorship_Agreement_Patel_Signed.pdf", agreementDate: "8/11/2026" },
  { name: "Amara Okafor-Imperial College London", display: "Amara Okafor", agreement: "Authorship_Agreement_Okafor_Signed.pdf", agreementDate: "4/2/2025" },
];

export const CREDIT_ROLES = ["Conceptualization", "Data curation", "Formal analysis", "Funding acquisition", "Investigation", "Methodology", "Project administration", "Resources", "Software", "Supervision", "Validation", "Visualization", "Writing – original draft", "Writing – review & editing"];
export const AUTHOR_META = {
  "Ina Ternal": { orcid: "0000-0002-4417-8810", credit: ["Conceptualization", "Methodology", "Writing – original draft"], coi: "3/2/2026", debar: "Clear" },
  "Steve Altschuler": { orcid: "0000-0001-7732-1045", credit: ["Investigation", "Writing – review & editing"], coi: "2/11/2026", debar: "Clear" },
  "Priya Raman": { orcid: "0000-0003-1190-6627", credit: ["Formal analysis", "Writing – review & editing"], coi: "1/8/2026", debar: "Clear" },
  "Marie Dubois": { orcid: "0000-0002-9054-3318", credit: ["Investigation"], coi: "8/10/2025", debar: "Clear" },
  "Henrik Lund": { orcid: "", credit: [], coi: "", debar: "Flagged" },
  "Kenji Sato": { orcid: "0000-0001-5528-9902", credit: [], coi: "", debar: "Not checked" },
  "Raj Patel": { orcid: "0000-0003-6601-2247", credit: ["Data curation", "Validation"], coi: "8/11/2026", debar: "Clear" },
};
export const DRAFT_ROUND_FEEDBACK = ["Ina Ternal"];
export const AUTHOR_APPROVALS = [];

const JC = (id, group, label, required, done) => ({ id, group, label, owner: "Unassigned", due: "", done: !!done, required: !!required });
export const JOURNAL_CHECKLIST = [
  JC(501, "Planning Stage", "Target journal confirmed against the publication plan and scope", true, true),
  JC(502, "Planning Stage", "Journal author guidelines reviewed (word count, reference style, article type)", true, true),
  JC(503, "Planning Stage", "Data sources and analysis plan agreed with the study team", true),
  JC(504, "Planning Stage", "Timeline shared with all authors, including review windows", false, true),
  JC(511, "Manuscript Content", "Abstract structured per journal requirements", true),
  JC(512, "Manuscript Content", "Data in text, tables and figures verified against source outputs", true),
  JC(513, "Manuscript Content", "Clinical trial registration number included in the abstract and methods", true),
  JC(514, "Manuscript Content", "Reporting guideline checklist completed (CONSORT, STROBE or equivalent)", true),
  JC(515, "Manuscript Content", "Cover letter drafted", false),
  JC(521, "Authors and Contributors", "All authors meet ICMJE authorship criteria", true),
  JC(522, "Authors and Contributors", "CRediT contributor roles recorded for every author", true),
  JC(523, "Authors and Contributors", "Medical writing support acknowledged, with funding source", true),
  JC(524, "Authors and Contributors", "ORCID iDs collected for all authors", false),
  JC(531, "Disclosures and Declarations", "ICMJE disclosure forms current for every author", true),
  JC(532, "Disclosures and Declarations", "Funding statement and sponsor role declared", true),
  JC(533, "Disclosures and Declarations", "Data sharing statement prepared", true),
  JC(534, "Disclosures and Declarations", "Ethics approval and informed consent statement included", true),
];
export const READINESS_RESULTS = ["Looks good", "Needs human check", "Missing"];
export const READINESS_TONE = { "Looks good": "on-track", "Needs human check": "due-soon", Missing: "overdue" };

export const PARENT_PLAN = { id: "PLAN-26-DAX-002", name: "Daxafort Dissemination Plan", budget: 850000, planned: 180000, committed: 512000 };
export const STATUS_OPTIONS = ["Submitted", "Changes Requested", "Accepted", "Rejected", "Withdrawn", "Cancelled"];
export const RESPONSE_CYCLE = ["Response Documents", "Internal Review", "Author Review", "Resubmission"];
export const PROOF_STEPS = ["PL/MW proof review", "Author proof review"];

export const PROGRESS_STEPS = {
  Abstract: [
    { name: "Author Invitations", d: "8/7/2026", done: "8/6/2026" },
    { name: "Kick-off", d: "8/19/2026", done: "8/19/2026" },
    { name: "Draft Development", d: "8/28/2026", done: "8/31/2026" },
    { name: "Internal Draft Review", d: "9/4/2026", done: "9/7/2026" },
    { name: "Stats / Data QC", d: "9/8/2026", done: "9/8/2026" },
    { name: "Author Draft Review", d: "9/22/2026", current: true },
    { name: "Final Draft Development", d: "9/29/2026" },
    { name: "Author Approval", d: "10/6/2026" },
    { name: "Internal Release Approval", d: "10/9/2026" },
    { name: "Submission", d: "10/14/2026" },
  ],
  Manuscript: [
    { name: "Author Invitations", d: "7/10/2026", done: "7/9/2026" },
    { name: "Kick-off", d: "7/17/2026", done: "7/17/2026" },
    { name: "Data and Proposal Input", d: "7/28/2026", done: "7/30/2026" },
    { name: "Outline Development", d: "8/7/2026", done: "8/7/2026" },
    { name: "Outline Review", d: "8/14/2026", done: "8/18/2026" },
    { name: "Draft Development", d: "8/28/2026", done: "8/31/2026" },
    { name: "Internal Draft Review", d: "9/4/2026", done: "9/7/2026" },
    { name: "Stats / Data QC", d: "9/8/2026", done: "9/8/2026" },
    { name: "Author Draft Review", d: "9/22/2026", current: true },
    { name: "Final Draft Development", d: "9/29/2026" },
    { name: "Author Approval", d: "10/6/2026" },
    { name: "Internal Release Approval", d: "10/9/2026" },
    { name: "Submission", d: "10/14/2026" },
  ],
  "Congress Presentation": [
    { name: "Congress Decision to Authors", d: "8/7/2026", done: "8/7/2026" },
    { name: "PWG Updates Source Docs", d: "8/19/2026", done: "8/20/2026" },
    { name: "Draft Development", d: "8/28/2026", done: "8/31/2026" },
    { name: "Internal Draft Review", d: "9/4/2026", done: "9/7/2026" },
    { name: "Stats / Data QC", d: "9/8/2026", done: "9/8/2026" },
    { name: "Author Draft Review", d: "9/22/2026", current: true },
    { name: "Final Draft Development", d: "9/29/2026" },
    { name: "Author Approval", d: "10/6/2026" },
    { name: "Internal Release Approval", d: "10/9/2026" },
    { name: "Presentation Logistics", d: "10/14/2026" },
  ],
};
PROGRESS_STEPS.Poster = PROGRESS_STEPS.Abstract;

export const PROGRESS = {
  oldSteps: [
    { name: "Author Invitations", d: "8/7/2026", done: "8/6/2026" },
    { name: "Author Agreements & COI", d: "8/14/2026", done: "8/12/2026" },
    { name: "Kickoff Call", d: "8/19/2026", done: "8/19/2026" },
    { name: "Outline Development", d: "8/26/2026", done: "8/25/2026" },
    { name: "Outline Review", d: "8/31/2026", done: "9/2/2026" },
    { name: "Abstract Draft", d: "9/4/2026", done: "9/8/2026" },
    { name: "Author Review", d: "9/22/2026", current: true },
    { name: "Final Approval", d: "10/1/2026" },
    { name: "Congress Submission", d: "10/14/2026" },
  ],
  responses: {
    "Steve Altschuler": { status: "done", on: "9/15/2026" },
    "Priya Raman": { status: "done", on: "9/17/2026" },
    "Ina Ternal": { status: "done", on: "9/12/2026" },
    "Marie Dubois": { status: "ooo", last: "9/21/2026", oooNote: "Auto-reply received 9/21/2026: Marie Dubois is away until 10/19/2026, after the 10/14/2026 congress deadline. Reminders are paused." },
    "Henrik Lund": { status: "pending", last: "9/18/2026" },
    "Raj Patel": { status: "pending", last: "9/18/2026" },
  },
};

export const REVIEWER_DIRECTORY = [
  { name: "Dana Ruiz", role: "Medical Director - Immunology" },
  { name: "Lena Ortiz", role: "Regulatory Affairs" },
  { name: "Ben Cho", role: "Biostatistics" },
  { name: "Priya Raman", role: "Medical Affairs - Publications" },
  { name: "Marcus Webb", role: "Legal - Promotional Review" },
  { name: "Sofia Almeida", role: "Pharmacovigilance" },
  { name: "Tom Nakamura", role: "Health Economics & Outcomes Research" },
  { name: "Ina Ternal", role: "Internal Author" },
];

export const PUBTYPE_OPTIONS = ["Abstract", "Poster", "Manuscript", "Congress Presentation"];
export const REVIEW_SUBTYPE_OPTIONS = [{ value: "", label: "Please select" }, { value: "Encore", label: "Encore" }, { value: "Late Breaker", label: "Late Breaker" }];
// One per product: Biologix, Daxafort and Triazapam, Daxafont.
export const REVIEW_THERAPEUTIC_AREA_OPTIONS = ["Cardiovascular & Metabolism", "Immunology", "Neuroscience"];
export const REVIEW_DEPT_OPTIONS = ["Medical Affairs", "Clinical Development"];
export const REVIEW_SPONSOR_OPTIONS = ["Company Sponsored", "Investigator Sponsored"];
export const STAGE_TEMPLATE_OPTIONS = ["Abstract", "Manuscript", "Congress Presentation"];
export const NO_VENDOR = "No Vendor (In-house)";
export const VENDOR_OPTIONS = [NO_VENDOR, "Caudex Health", "Oxford Medical Communications", "Meridian Scientific"];
export const RATE_CARD_OPTIONS = ["FY26 Standard Rate Card", "FY26 Preferred Partner Rate Card", "FY25 Standard Rate Card", "Custom / Statement of Work"];
export const RATE_CARD_COSTS = { "FY26 Standard Rate Card": 64000, "FY26 Preferred Partner Rate Card": 58500, "FY25 Standard Rate Card": 61000, "Custom / Statement of Work": null };
const ST = (name, days, x) => Object.assign({ name, type: "Stage", days, costed: false, amount: 0 }, x || {});
const MS = (name, x) => Object.assign({ name, type: "Milestone", days: 0, costed: false, amount: 0 }, x || {});
const CORE = { core: true };
const OPT = { optional: true, included: false };
const DRAFT_ROUNDS = [
  ST("Draft Development", 14), MS("Draft Development Complete", CORE),
  ST("Internal Draft Review", 7),
  ST("Partner Review", 5, OPT), ST("Stats / Data QC", 5, { optional: true, included: true }),
  ST("Author Draft Review", 10),
  ST("Final Draft Development", 5),
  ST("Compliance and IP Review", 5, OPT),
  MS("Author Approval", CORE),
  ST("Internal Release Approval", 3),
];
export const STAGE_TEMPLATES = {
  "Abstract": [ST("Author Invitations", 5), MS("Kick-off Complete", CORE)].concat(DRAFT_ROUNDS, [MS("Submission", CORE)]),
  "Manuscript": [ST("Author Invitations", 5), MS("Kick-off Complete", CORE), ST("Data and Proposal Input", 10), ST("Outline Development", 10), ST("Outline Review", 7)].concat(DRAFT_ROUNDS, [MS("Submission", CORE)]),
  "Congress Presentation": [MS("Congress Decision to Authors"), ST("PWG Updates Source Docs", 7)].concat(DRAFT_ROUNDS, [ST("Presentation Logistics (printing, upload)", 7)]),
};
export const TRACK_TARGETS = {
  Abstract: ["American Academy of Dermatology (AAD) Annual Meeting", "European Academy of Dermatology and Venereology (EADV) Congress", "European Pain Federation - Congress"],
  Manuscript: ["Journal of the American Academy of Dermatology", "British Journal of Dermatology", "Journal of Cardiometabolic Medicine"],
};
export const TEMPLATE_FOR_TYPE = { Abstract: "Abstract", Poster: "Abstract", Manuscript: "Manuscript", "Congress Presentation": "Congress Presentation" };

export const fmtDate = d => (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
export const parseDate = s => {
  const p = String(s || "").split("/");
  if (p.length !== 3) return null;
  const d = new Date(+p[2], +p[0] - 1, +p[1]);
  return isNaN(d) ? null : d;
};
/** Walks a template in order, chaining each stage's duration off the previous end. */
export const scheduleTemplate = (tmpl, startStr) => {
  const start = parseDate(startStr);
  if (!start) return tmpl.map(m => ({ ...m, start: "", end: "" }));
  let cursor = new Date(start);
  return tmpl.map(m => {
    if (m.type === "Stage" && m.days > 0) {
      const s = new Date(cursor);
      const e = new Date(cursor);
      e.setDate(e.getDate() + m.days);
      cursor = new Date(e);
      return { ...m, start: fmtDate(s), end: fmtDate(e) };
    }
    return { ...m, start: fmtDate(cursor), end: "" };
  });
};
/** Chains stage-template rows from the start date, skipping optional rows that are switched off. */
export const rescheduleRows = (rows, startStr) => {
  const start = parseDate(startStr);
  if (!start) return rows;
  let cursor = new Date(start);
  return rows.map(r => {
    if (r.optional && !r.included) return Object.assign({}, r, { start: "", end: "" });
    if (r.days == null) return r;
    if (r.type === "Stage" && r.days > 0) {
      const s = new Date(cursor), e = new Date(cursor);
      e.setDate(e.getDate() + r.days);
      cursor = new Date(e);
      return Object.assign({}, r, { start: fmtDate(s), end: fmtDate(e) });
    }
    return Object.assign({}, r, { start: fmtDate(cursor), end: "" });
  });
};
export const buildTemplateRows = (name, startStr, idStart) => rescheduleRows((STAGE_TEMPLATES[name] || []).map((m, i) => ({
  id: idStart + i, name: m.name, type: m.type, done: false, pct: m.type === "Stage" ? "0" : "",
  days: m.days, start: "", end: "", core: !!m.core, optional: !!m.optional, included: m.optional ? !!m.included : true,
  costed: false, amount: 0, paidAmount: 0, status: "notmet",
})), startStr);

export const RATE_CARD_TEMPLATES = {
  "FY26 Standard Rate Card": [
    { name: "Publication Kick-off", type: "Milestone", days: 0, costed: false, amount: 0 },
    { name: "Abstract Development", type: "Stage", days: 12, costed: true, amount: 24000 },
    { name: "Internal Review", type: "Stage", days: 7, costed: true, amount: 12500 },
    { name: "Leadership Review", type: "Milestone", days: 0, costed: true, amount: 27500 },
    { name: "Submission Due", type: "Milestone", days: 0, costed: false, amount: 0 },
  ],
  "FY26 Preferred Partner Rate Card": [
    { name: "Publication Kick-off", type: "Milestone", days: 0, costed: false, amount: 0 },
    { name: "Abstract Development", type: "Stage", days: 9, costed: true, amount: 22000 },
    { name: "Internal Review", type: "Stage", days: 5, costed: true, amount: 11000 },
    { name: "Leadership Review", type: "Milestone", days: 0, costed: true, amount: 25500 },
    { name: "Submission Due", type: "Milestone", days: 0, costed: false, amount: 0 },
  ],
  "FY25 Standard Rate Card": [
    { name: "Publication Kick-off", type: "Milestone", days: 0, costed: false, amount: 0 },
    { name: "Abstract Development", type: "Stage", days: 14, costed: true, amount: 23000 },
    { name: "Internal Review", type: "Stage", days: 8, costed: true, amount: 12000 },
    { name: "Leadership Review", type: "Milestone", days: 0, costed: true, amount: 26000 },
    { name: "Submission Due", type: "Milestone", days: 0, costed: false, amount: 0 },
  ],
};
export const MILESTONE_TYPE_OPTIONS = [{ value: "Milestone", label: "Milestone" }, { value: "Stage", label: "Stage" }];
export const REVIEW_TYPE_OPTIONS = ["Internal Draft Review", "Partner Review", "Author Draft Review", "Stats / Data QC", "Compliance and IP Review", "Author Approval", "Internal Release Approval"];
export const REVIEW_FLOW = {
  "Internal Draft Review": { step: "Internal Draft Review", returnsTo: "Draft Development" },
  "Partner Review": { step: "Partner Review", returnsTo: "Draft Development" },
  "Author Draft Review": { step: "Author Draft Review", returnsTo: "Draft Development" },
  "Stats / Data QC": { step: "Stats / Data QC", returnsTo: "Draft Development" },
  "Compliance and IP Review": { step: "Compliance and IP Review", returnsTo: "Draft Development" },
  "Author Approval": { step: "Author Approval", returnsTo: "Final Draft Development" },
  "Internal Release Approval": { step: "Internal Release Approval", returnsTo: "Draft Development" },
};
export const CURRENT_ROUND_TYPE = "Author Draft Review";
export const PRIORITY_OPTIONS = ["Standard Review", "Expedited Review"];
export const REVIEW_METHOD_OPTIONS = ["Collaborative Edit", "Comment Only", "Read Only"];
export const OUTCOME_STATUS_OPTIONS = STATUS_OPTIONS;
export const OUTCOME_OPTIONS = [{ value: "", label: "Please select" }, { value: "Accepted", label: "Accepted" }, { value: "Declined", label: "Declined" }];
export const TIMEZONE_OPTIONS = ["ET", "CT", "PT", "GMT", "CET"];
export const CITATION_TYPE_OPTIONS = ["Journal Article", "Congress Abstract", "Poster", "Book Chapter"];
export const DELEGATE_OPTIONS = ["Kristina Hill", "Ina Ternal", "Ben Cho", "Dana Ruiz"];
export const REASSIGN_FROM_OPTIONS = ["Kristina Hill", "Ina Ternal", "Ben Cho", "Dana Ruiz"];

export const PLANS = [
  { id: "PLAN-26-DAX-002", name: "Daxafort Dissemination Plan" },
];

export const PRODUCTS = [
  "Biologix (All)",
  "Daxafont (DMD)",
  "Daxafort (Atopic Dermatitis)",
  "Triazapam (Dermatology)",
];

/** Each product's therapeutic area; picking an area narrows the Product list to its products. */
export const PRODUCT_TA = {
  "Biologix (All)": "Cardiovascular & Metabolism",
  "Daxafont (DMD)": "Neuroscience",
  "Daxafort (Atopic Dermatitis)": "Immunology",
  "Triazapam (Dermatology)": "Immunology",
};
export const productsForTA = ta => (ta ? PRODUCTS.filter(p => PRODUCT_TA[p] === ta) : PRODUCTS);

export const CONFERENCE_DIRECTORY = [
  { name: "European Pain Federation - Congress", abbr: "EFIC", kind: "Congress", dates: "4/21/2027 - 4/23/2027 · Glasgow, UK",
    start: "4/21/2027", end: "4/23/2027", open: "9/1/2026", close: "1/22/2027", lateBreaker: "2/1/2027",
    venue: "Scottish Event Campus (SEC), Exhibition Way, Glasgow G3 8YW", city: "Glasgow", country: "United Kingdom (Scotland)" },
  { name: "European Academy of Dermatology and Venereology (EADV) Congress", abbr: "EADV", kind: "Congress", dates: "9/29/2027 - 10/2/2027 · Vienna, Austria",
    start: "9/29/2027", end: "10/2/2027", open: "3/1/2027", close: "5/12/2027", lateBreaker: "6/30/2027", venue: "Messe Wien Exhibition & Congress Center", city: "Vienna", country: "Austria" },
  { name: "American Academy of Dermatology (AAD) Annual Meeting", abbr: "AAD", kind: "Congress", dates: "3/6/2027 - 3/10/2027 · Orlando, FL",
    start: "3/6/2027", end: "3/10/2027", open: "8/15/2026", close: "10/14/2026", prevClose: "10/28/2026", closeChanged: "9/23/2026", lateBreaker: "1/15/2027", venue: "Orange County Convention Center", city: "Orlando, FL", country: "United States" },
  { name: "Journal of the American Academy of Dermatology", abbr: "JAAD", kind: "Journal", dates: "Continuous submission" },
  { name: "British Journal of Dermatology", abbr: "BJD", kind: "Journal", dates: "Continuous submission" },
  { name: "Journal of Cardiometabolic Medicine", abbr: "J Cardiometab Med", kind: "Journal", dates: "Continuous submission" },
];

/** Congress abstract checklist (loaded for Abstract / Poster / Congress Presentation). */
export const CONGRESS_CHECKLIST = [
  { id: 1, group: "Compliance", label: "ICMJE authorship criteria confirmed for all authors", owner: "Kristina Hill", due: "8/14/2026", done: true, required: true },
  { id: 2, group: "Compliance", label: "Author agreements on file for external authors", owner: "Kristina Hill", due: "8/14/2026", done: true, required: true },
  { id: 3, group: "Compliance", label: "Conflict of interest disclosures collected", owner: "Ina Ternal", due: "9/18/2026", done: false, required: true },
  { id: 4, group: "Content", label: "Data on file matches source tables and figures", owner: "Ben Cho", due: "9/18/2026", done: false, required: true },
  { id: 5, group: "Content", label: "Statistical review complete", owner: "Ben Cho", due: "9/18/2026", done: false, required: false },
  { id: 6, group: "Content", label: "Plain language summary drafted", owner: "Kristina Hill", due: "9/29/2026", done: false, required: false },
  { id: 7, group: "Submission", label: "Congress formatting and word count requirements met", owner: "Kristina Hill", due: "10/9/2026", done: false, required: true },
  { id: 8, group: "Submission", label: "Trial registration number included", owner: "Dana Ruiz", due: "10/9/2026", done: true, required: true },
  { id: 9, group: "Submission", label: "Copyright and licensing terms reviewed", owner: "Lena Ortiz", due: "10/9/2026", done: false, required: false },

  // Congress Abstract Submission Readiness Checklist — Christy Risser-Milne, Sept 2026
  { id: 101, group: "Authorship & Presenting Author", label: "Each author made a substantial contribution to the conception/design of the work, or the acquisition, analysis, or interpretation of data", owner: "Unassigned", due: "", done: false, required: true },
  { id: 102, group: "Authorship & Presenting Author", label: "Presenting author identified (frequently distinct from the corresponding author; some congress portals grant upload permissions only to the presenting author)", owner: "Unassigned", due: "", done: false, required: true },
  { id: 103, group: "Authorship & Presenting Author", label: "Author order and affiliations confirmed by all authors", owner: "Unassigned", due: "", done: false, required: true },
  { id: 104, group: "Authorship & Presenting Author", label: "A single author agreement covers both the abstract and its subsequent presentation", owner: "Unassigned", due: "", done: false, required: false },
  { id: 105, group: "Authorship & Presenting Author", label: "Non-author contributors and any professional medical writer identified and disclosed by name", owner: "Unassigned", due: "", done: false, required: true },

  { id: 110, group: "Abstract Content Preparation", label: "Abstract follows the congress's required structure", owner: "Unassigned", due: "", done: false, required: true },
  { id: 111, group: "Abstract Content Preparation", label: "Word or character count confirmed against the current submission portal limit", owner: "Unassigned", due: "", done: false, required: true },
  { id: 112, group: "Abstract Content Preparation", label: "Table/figure count confirmed against the congress limit", owner: "Unassigned", due: "", done: false, required: true },
  { id: 113, group: "Abstract Content Preparation", label: "Content is final as submitted", owner: "Unassigned", due: "", done: false, required: true },
  { id: 114, group: "Abstract Content Preparation", label: "Results are reported completely and are not overstated relative to the underlying data's maturity", owner: "Unassigned", due: "", done: false, required: true },
  { id: 115, group: "Abstract Content Preparation", label: "Sex/gender and other reporting conventions consistent with the sponsor's standard manuscript practice, where applicable", owner: "Unassigned", due: "", done: false, required: false },
  { id: 116, group: "Abstract Content Preparation", label: "Submission made to only one appropriate section/category/program track", owner: "Unassigned", due: "", done: false, required: true },

  { id: 120, group: "Disclosures and Conflict of Interest", label: "Every listed author has completed the congress's own COI disclosure inside its submission portal (separate from any ICMJE COI form already on file)", owner: "Unassigned", due: "", done: false, required: true },
  { id: 121, group: "Disclosures and Conflict of Interest", label: "Funding source and sponsor's role disclosed per the congress's required format", owner: "Unassigned", due: "", done: false, required: true },
  { id: 122, group: "Disclosures and Conflict of Interest", label: "Professional medical writing support disclosed by name and funding source, consistent with GPP 2022", owner: "Unassigned", due: "", done: false, required: true },
  { id: 123, group: "Disclosures and Conflict of Interest", label: "Any AI tool used in preparing the abstract or presentation materials disclosed", owner: "Unassigned", due: "", done: false, required: false },

  { id: 130, group: "Prior Publication and Encore Declaration", label: "Prior presentation/publication status accurately declared in the submission portal (Original / Encore / Adaptation)", owner: "Unassigned", due: "", done: false, required: true },
  { id: 131, group: "Prior Publication and Encore Declaration", label: "If an Encore: confirmed the target congress accepts encore abstracts, and any required additional notice has been sent", owner: "Unassigned", due: "", done: false, required: false },
  { id: 132, group: "Prior Publication and Encore Declaration", label: "If data will also be submitted as a journal manuscript around the same time: publication timing coordinated so it does not violate the congress's embargo policy", owner: "Unassigned", due: "", done: false, required: false },
  { id: 133, group: "Prior Publication and Encore Declaration", label: "Copyright status of any previously published abstract content clarified before reuse", owner: "Unassigned", due: "", done: false, required: false },

  { id: 140, group: "Embargo Compliance", label: "Exact embargo lift date and time confirmed directly from the current congress policy", owner: "Unassigned", due: "", done: false, required: true },
  { id: 141, group: "Embargo Compliance", label: "All internal stakeholders (medical affairs, corporate communications, investor relations, social media) briefed on the embargo date and what it covers", owner: "Unassigned", due: "", done: false, required: true },
  { id: 142, group: "Embargo Compliance", label: "Confirmed the embargo applies to all release formats (press materials, investor communications, websites, social media, conference itinerary planner/app), not just formal press releases", owner: "Unassigned", due: "", done: false, required: true },
  { id: 143, group: "Embargo Compliance", label: "If a simultaneous journal publication is planned, its publication date is coordinated to align with the congress embargo lift", owner: "Unassigned", due: "", done: false, required: false },
  { id: 144, group: "Embargo Compliance", label: "Any planned exception to the embargo (e.g. a required regulatory disclosure) reviewed against the congress's exception policy, with advance notice given where required", owner: "Unassigned", due: "", done: false, required: false },

  { id: 150, group: "Late-Breaking Abstracts (If Applicable)", label: "Eligibility for the late-breaking track confirmed", owner: "Unassigned", due: "", done: false, required: false },
  { id: 151, group: "Late-Breaking Abstracts (If Applicable)", label: "Late-breaking-specific submission deadline and data-cutoff requirements confirmed separately from the standard track", owner: "Unassigned", due: "", done: false, required: false },
  { id: 152, group: "Late-Breaking Abstracts (If Applicable)", label: "Any placeholder or partial submission requirements met, if the congress allows a placeholder abstract pending final data", owner: "Unassigned", due: "", done: false, required: false },
  { id: 153, group: "Late-Breaking Abstracts (If Applicable)", label: "Confirmed the late-breaking abstract remains subject to the same confidentiality/embargo policy as standard abstracts from the point of submission, even before formal acceptance", owner: "Unassigned", due: "", done: false, required: false },

  { id: 160, group: "Submission Portal and Format Requirements", label: "Correct submission category/section selected", owner: "Unassigned", due: "", done: false, required: true },
  { id: 161, group: "Submission Portal and Format Requirements", label: "File format requirements confirmed for any required supporting files (structured data tables, supplementary figures)", owner: "Unassigned", due: "", done: false, required: true },
  { id: 162, group: "Submission Portal and Format Requirements", label: "All author COI disclosures completed inside the portal by every listed author before the submission deadline", owner: "Unassigned", due: "", done: false, required: true },
  { id: 163, group: "Submission Portal and Format Requirements", label: "Submission confirmation retained and logged against the internal publication plan", owner: "Unassigned", due: "", done: false, required: true },
  { id: 164, group: "Submission Portal and Format Requirements", label: "If corrections are needed after submission: the congress's specific correction/withdrawal process confirmed", owner: "Unassigned", due: "", done: false, required: false },

  { id: 170, group: "Poster / Oral Presentation Preparation (Post-Acceptance)", label: "Poster or slide format specifications confirmed", owner: "Unassigned", due: "", done: false, required: true },
  { id: 171, group: "Poster / Oral Presentation Preparation (Post-Acceptance)", label: "Disclosure slide prepared for oral presentations, listing COI and funding consistent with the abstract's own disclosures", owner: "Unassigned", due: "", done: false, required: true },
  { id: 172, group: "Poster / Oral Presentation Preparation (Post-Acceptance)", label: "Only the designated presenting author used to upload materials, where the congress portal restricts this permission", owner: "Unassigned", due: "", done: false, required: false },
  { id: 173, group: "Poster / Oral Presentation Preparation (Post-Acceptance)", label: "Accessibility considerations addressed in poster/slide design (font size, color contrast, alt text) per GPCAP's 2026 update", owner: "Unassigned", due: "", done: false, required: false },
  { id: 174, group: "Poster / Oral Presentation Preparation (Post-Acceptance)", label: "Patient engagement considerations reviewed, where relevant, per GPCAP's patient engagement section", owner: "Unassigned", due: "", done: false, required: false },
  { id: 175, group: "Poster / Oral Presentation Preparation (Post-Acceptance)", label: "Congress branding and any required disclaimers (e.g. \"data on file,\" trademark symbols) included per the congress's own material guidelines", owner: "Unassigned", due: "", done: false, required: true },

  { id: 180, group: "Post-Conference", label: "Poster or slide deck made available post-conference exactly as the congress's own reuse/reprint policy permits", owner: "Unassigned", due: "", done: false, required: false },
  { id: 181, group: "Post-Conference", label: "Any enhanced content (plain-language summary, infographic) prepared and reviewed consistent with GPP 2022's enhanced-content standards", owner: "Unassigned", due: "", done: false, required: false },
  { id: 182, group: "Post-Conference", label: "Presentation logged in the internal publication tracking system, including final abstract number/ID assigned by the congress", owner: "Unassigned", due: "", done: false, required: true },
  { id: 183, group: "Post-Conference", label: "If underlying data will subsequently be submitted as a full manuscript: prior presentation at this congress disclosed transparently in the manuscript per ICMJE requirements", owner: "Unassigned", due: "", done: false, required: false },
  { id: 184, group: "Post-Conference", label: "Citation metrics/attention data (if tracked) linked back to this record for ongoing impact monitoring", owner: "Unassigned", due: "", done: false, required: false },
];

export const money = n => "$" + (n || 0).toLocaleString("en-US");

/** Today at midnight, local time. */
export const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
export const TODAY_STR = fmtDate(TODAY);

/** M/D/YYYY h:mm AM, the timestamp format the audit trail uses. */
export const nowStamp = () => {
  const d = new Date();
  return fmtDate(d) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

/** M/D/YYYY to YYYY-MM-DD, for places that sort or diff dates. */
export const toISO = mdy => {
  const d = parseDate(mdy);
  return d ? d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") : "";
};

/** Whole days from today to an M/D/YYYY date (negative = past). */
export const daysFromToday = mdy => {
  const d = parseDate(mdy);
  return d ? Math.round((d - TODAY) / 86400000) : null;
};
