// What a kick-off must produce before it can be recorded as held (V2, GPP; Kristina's kick-off
// checklist). Each section reports what's still missing. server/kickoff.js applies the same rules
// when the kick-off is saved, so keep the two in step.
import { AUTHOR_META, CONFERENCE_DIRECTORY, parseDate } from './data';
import { bylineAuthors } from './state';

export const KICKOFF = /kick-?off/i;
export const needsKickoff = st => st.pubType === 'Abstract' || st.pubType === 'Manuscript';
export const kickoffRowOf = st => (st.rows || []).find(r => r.name && KICKOFF.test(r.name) && !(r.optional && !r.included));
export const ANALYSIS_LABELS = ['Primary', 'Secondary', 'Post hoc'];
export const PRESENTATION_PREFS = ['Oral', 'Poster', 'Either'];
export const NO_WRITER = 'No medical writing support';

const filled = v => String(v == null ? '' : v).trim().length > 0;
/** An author's CRediT roles: what's been set on the Authors tab, else the sample directory. */
export const creditOf = (st, person) => ((st.authorMetaEdits || {})[person] || {}).credit || (AUTHOR_META[person] || {}).credit || [];
export const coiOf = (st, person) => ((st.authorMetaEdits || {})[person] || {}).coi || (AUTHOR_META[person] || {}).coi || '';
/** Plan rows after the kick-off: the timeline the meeting sets. */
export const timelineRows = st => {
  const rows = (st.rows || []).filter(r => r.name && !(r.optional && !r.included));
  const i = rows.findIndex(r => KICKOFF.test(r.name));
  return i < 0 ? rows : rows.slice(i + 1);
};
const isCongress = name => { const c = CONFERENCE_DIRECTORY.find(x => x.name === name); return c ? c.kind !== 'Journal' : false; };

/** The eight sections, each { key, title, missing: [text] }. Ready when every missing list is empty. */
export function kickoffChecklist(st) {
  const prep = st.kickoffPrep || {};
  const authors = bylineAuthors(st);
  const abstract = st.pubType === 'Abstract';
  const msgs = st.keyMessages || [];
  const scope = st.dataScope || {};
  const venue = st.venuePlan || {};
  const log = st.logistics || {};
  const targets = st.targets || [];
  const out = [];

  const a = [];
  if (!authors.length) a.push('Add the authors on the Authors tab.');
  const unsigned = authors.filter(x => !(x.a.criteria && x.a.criteria.at)).map(x => x.person);
  if (unsigned.length) a.push('Signed authorship agreement (ICMJE criteria) from ' + unsigned.join(', ') + '.');
  if (!prep.orderConfirmed) a.push('Confirm the author order (at least first and senior author).');
  const noRole = authors.filter(x => !creditOf(st, x.person).length).map(x => x.person);
  if (noRole.length) a.push('Expected contribution (CRediT roles, Authors tab) for ' + noRole.join(', ') + '.');
  out.push({ key: 'authorship', title: 'Authorship and criteria', missing: a });

  const d = [];
  if (!prep.coiReviewed) d.push('Review every author’s COI disclosure status.');
  if (!prep.transferOfValue) d.push('Say whether any external author receives support (writing, travel, honoraria).');
  if (prep.transferOfValue === 'yes' && !filled(prep.tovNote)) d.push('Describe the support so it can be reported.');
  out.push({ key: 'disclosure', title: 'Disclosures', missing: d });

  const k = [];
  const written = msgs.filter(m => filled(m.text));
  if (written.length < 2) k.push('Write at least two key messages (two to four).');
  if (written.length > 4) k.push('Keep it to four key messages at most.');
  if (written.some(m => !filled(m.endpoint))) k.push('Tie each key message to an endpoint or analysis.');
  out.push({ key: 'messages', title: 'Key messages', missing: k });

  const s = [];
  if (!filled(scope.cut)) s.push('Name the data cut.');
  if (!(scope.analyses || []).some(x => filled(x.name) && x.label)) s.push('List the analyses, labelled primary, secondary or post hoc.');
  if ((scope.analyses || []).some(x => filled(x.name) && !x.label)) s.push('Label every analysis.');
  if (!(scope.outputs || []).some(x => filled(x.name))) s.push('List the tables and figures in scope.');
  if ((scope.outputs || []).some(x => filled(x.name) && !filled(x.owner))) s.push('Give every table and figure an owner.');
  if (abstract && !parseDate(scope.finalBy)) s.push('Confirm the date the data will be final and approved.');
  out.push({ key: 'data', title: 'Data scope and source', missing: s });

  const v = [];
  if (!targets[0]) v.push('Choose the target ' + (abstract ? 'congress' : 'journal') + ' on the Target tab.');
  if (!abstract && !targets[1]) v.push('Add a fallback journal on the Target tab.');
  if (!filled(venue.format)) v.push(abstract ? 'Note the word and character limits and embargo rules.' : 'Note the format: word count, reporting guideline (CONSORT, STROBE, PRISMA), open access.');
  if (abstract && !filled(venue.category)) v.push('Note the abstract category.');
  if (abstract && !venue.presentation) v.push('Choose the presentation preference (oral or poster).');
  if (abstract && targets[0] && !isCongress(targets[0])) v.push('The target for an abstract should be a congress.');
  out.push({ key: 'venue', title: 'Target venue and fallback', missing: v });

  const t = [];
  const rows = timelineRows(st);
  if (!rows.length) t.push('Set up the plan on the Planning tab.');
  const unowned = rows.filter(r => !filled(r.owner)).map(r => r.name);
  if (unowned.length) t.push('Name an owner (a person) for ' + unowned.join(', ') + '.');
  const undated = rows.filter(r => !filled(r.end || r.start)).map(r => r.name);
  if (undated.length) t.push('Date ' + undated.join(', ') + ' on the Planning tab.');
  out.push({ key: 'timeline', title: 'Timeline with owners', missing: t });

  const r = [];
  if (!filled(log.writer)) r.push('Name the medical writer, or say there’s no writing support.');
  if (filled(log.writer) && log.writer !== NO_WRITER && !filled(log.writingAck)) r.push('Say how writing support will be acknowledged.');
  if (!filled(st.correspondingAuthor)) r.push('Choose the corresponding author (Authors tab).');
  if (!filled(log.reviewMethod)) r.push('Agree how authors will review.');
  if (!(Number(log.turnaroundDays) > 0)) r.push('Agree the turnaround per review round (days).');
  out.push({ key: 'roles', title: 'Roles and logistics', missing: r });

  const o = [];
  const bad = (st.decisions || []).filter(x => filled(x.item) && (!filled(x.owner) || !parseDate(x.due)));
  if (bad.length) o.push('Give every open issue an owner and a date.');
  out.push({ key: 'decisions', title: 'Open issues and decisions', missing: o });

  return out;
}

/** The meeting itself: held on a real date (not in the future), with at least one author there. */
export function meetingMissing(form) {
  const m = [];
  const held = parseDate(form.heldOn);
  if (!held) m.push('Enter the date the meeting was held.');
  else if (held > new Date()) m.push('The meeting date can’t be in the future.');
  if (!(form.attendees || []).length) m.push('Tick the authors who attended.');
  return m;
}
