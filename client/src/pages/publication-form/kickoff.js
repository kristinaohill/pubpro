// What a kick-off must produce before it can be recorded as held (V2, GPP; Kristina's kick-off
// checklist). Each section reports what's still missing. server/kickoff.js applies the same rules
// when the kick-off is saved, so keep the two in step.
import { AUTHOR_META, CONFERENCE_DIRECTORY, parseDate } from './data';
import { bylineAuthors } from './state';
import { contributionsOf, creditMissing, toStored } from './credit';

export const KICKOFF = /kick-?off/i;
export const needsKickoff = st => st.pubType === 'Abstract' || st.pubType === 'Manuscript';
export const kickoffRowOf = st => (st.rows || []).find(r => r.name && KICKOFF.test(r.name) && !(r.optional && !r.included));
export const ANALYSIS_LABELS = ['Primary', 'Secondary', 'Post hoc'];
export const PRESENTATION_PREFS = ['Oral', 'Poster', 'Either'];
export const NO_WRITER = 'No medical writing support';

const filled = v => String(v == null ? '' : v).trim().length > 0;
/** An author's CRediT roles: what's been set on the Authors tab, else the sample directory. */
export const creditOf = (st, person) => contributionsOf(st, person).map(x => x.label);
/** What the kick-off stores as each author's planned contributions. */
export const creditSnapshot = (st, person) => toStored(contributionsOf(st, person));
export const coiOf = (st, person) => ((st.authorMetaEdits || {})[person] || {}).coi || (AUTHOR_META[person] || {}).coi || '';
/** Plan rows after the kick-off: the timeline the meeting sets. */
export const timelineRows = st => {
  const rows = (st.rows || []).filter(r => r.name && !(r.optional && !r.included));
  const i = rows.findIndex(r => KICKOFF.test(r.name));
  return i < 0 ? rows : rows.slice(i + 1);
};
const isCongress = name => { const c = CONFERENCE_DIRECTORY.find(x => x.name === name); return c ? c.kind !== 'Journal' : false; };

/**
 * The eight sections, each { key, title, missing: [{ text, cta, go }] }. go is where the fix is:
 * '#field-id' (a field on the Kick-off tab) or 'tab:<id>' (another tab). Ready when nothing's missing.
 */
export function kickoffChecklist(st) {
  const prep = st.kickoffPrep || {};
  const authors = bylineAuthors(st);
  const abstract = st.pubType === 'Abstract';
  const msgs = st.keyMessages || [];
  const scope = st.dataScope || {};
  const venue = st.venuePlan || {};
  const log = st.logistics || {};
  const targets = st.targets || [];
  const it = (text, cta, go) => ({ text, cta, go });
  const out = [];

  const a = [];
  if (!authors.length) a.push(it('No authors on the byline yet.', 'Add authors', 'tab:authors'));
  const unsigned = authors.filter(x => !(x.a.criteria && x.a.criteria.at)).map(x => x.person);
  if (unsigned.length) a.push(it('Waiting on signed authorship agreements from ' + unsigned.join(', ') + '. They sign from their invitation.', 'Open Authors tab', 'tab:authors'));
  if (!prep.orderConfirmed) a.push(it('Confirm the author order agreed at the meeting.', 'Confirm order', '#kx-f-order'));
  const noRole = authors.filter(x => !contributionsOf(st, x.person).length).map(x => x.person);
  if (noRole.length) a.push(it('Tick the CRediT roles for ' + noRole.join(', ') + '.', 'Tick roles on Authors tab', 'tab:authors'));
  out.push({ key: 'authorship', title: 'Authorship and criteria', missing: a });

  const d = [];
  if (!prep.coiReviewed) d.push(it('Confirm you reviewed every author’s COI status.', 'Confirm review', '#kx-f-coi'));
  if (!prep.transferOfValue) d.push(it('Answer whether any external author gets support (writing, travel, honoraria).', 'Answer', '#kx-tov'));
  if (prep.transferOfValue === 'yes' && !filled(prep.tovNote)) d.push(it('Describe the support so it can be reported.', 'Describe support', '#kx-tov-note'));
  out.push({ key: 'disclosure', title: 'Disclosures', missing: d });

  const k = [];
  const written = msgs.filter(m => filled(m.text));
  if (written.length < 2) k.push(it(written.length ? 'Add at least one more key message (two to four).' : 'Write two to four key messages.', 'Add a key message', '#kx-f-msgs'));
  if (written.length > 4) k.push(it('Keep it to four key messages at most.', 'Edit messages', '#kx-f-msgs'));
  if (written.some(m => !filled(m.endpoint))) k.push(it('Tie each key message to an endpoint or analysis.', 'Add endpoints', '#kx-f-msgs'));
  out.push({ key: 'messages', title: 'Key messages', missing: k });

  const s = [];
  if (!filled(scope.cut)) s.push(it('Name the data cut.', 'Enter data cut', '#kx-cut'));
  if (!(scope.analyses || []).some(x => filled(x.name) && x.label)) s.push(it('List the analyses, labelled primary, secondary or post hoc.', 'Add an analysis', '#kx-f-analyses'));
  if ((scope.analyses || []).some(x => filled(x.name) && !x.label)) s.push(it('Label every analysis.', 'Label analyses', '#kx-f-analyses'));
  if (!(scope.outputs || []).some(x => filled(x.name))) s.push(it('List the tables and figures in scope.', 'Add a table or figure', '#kx-f-outputs'));
  if ((scope.outputs || []).some(x => filled(x.name) && !filled(x.owner))) s.push(it('Give every table and figure an owner.', 'Choose owners', '#kx-f-outputs'));
  if (abstract && !parseDate(scope.finalBy)) s.push(it('Enter the date the data will be final and approved.', 'Enter date', '#kx-final'));
  out.push({ key: 'data', title: 'Data scope and source', missing: s });

  const v = [];
  if (!targets[0]) v.push(it('Choose the target ' + (abstract ? 'congress' : 'journal') + '.', 'Open Target tab', 'tab:details'));
  if (!abstract && !targets[1]) v.push(it('Add a fallback journal.', 'Open Target tab', 'tab:details'));
  if (abstract && targets[0] && !isCongress(targets[0])) v.push(it('The target for an abstract should be a congress.', 'Open Target tab', 'tab:details'));
  if (!filled(venue.format)) v.push(it(abstract ? 'Note the word and character limits and embargo rules.' : 'Note the format: word count, reporting guideline (CONSORT, STROBE, PRISMA), open access.', 'Enter format notes', '#kx-format'));
  if (abstract && !filled(venue.category)) v.push(it('Note the abstract category.', 'Enter category', '#kx-cat'));
  if (abstract && !venue.presentation) v.push(it('Choose oral or poster.', 'Choose preference', '#kx-pres'));
  out.push({ key: 'venue', title: 'Target venue and fallback', missing: v });

  const t = [];
  const rows = timelineRows(st);
  if (!rows.length) t.push(it('Set up the plan.', 'Open Planning tab', 'tab:planning'));
  const unowned = rows.filter(r => !filled(r.owner));
  if (unowned.length) t.push(it('Choose an owner for ' + (unowned.length === 1 ? unowned[0].name : unowned.length + ' steps') + '.', 'Choose owners', '#kx-f-timeline'));
  const undated = rows.filter(r => !filled(r.end || r.start)).map(r => r.name);
  if (undated.length) t.push(it('Date ' + undated.join(', ') + '.', 'Open Planning tab', 'tab:planning'));
  out.push({ key: 'timeline', title: 'Timeline with owners', missing: t });

  const r = [];
  if (!filled(log.writer)) r.push(it('Choose the medical writer, or no writing support.', 'Choose writer', '#kx-writer'));
  if (filled(log.writer) && log.writer !== NO_WRITER && !filled(log.writingAck)) r.push(it('Say how writing support will be acknowledged.', 'Enter acknowledgment', '#kx-ack'));
  if (!filled(st.correspondingAuthor)) r.push(it('Choose the corresponding author.', 'Open Authors tab', 'tab:authors'));
  if (!filled(log.reviewMethod)) r.push(it('Choose how authors will review.', 'Choose method', '#kx-method'));
  if (!(Number(log.turnaroundDays) > 0)) r.push(it('Enter the turnaround per review round, in days.', 'Enter days', '#kx-turn'));
  out.push({ key: 'roles', title: 'Roles and logistics', missing: r });

  const o = [];
  const bad = (st.decisions || []).filter(x => filled(x.item) && (!filled(x.owner) || !parseDate(x.due)));
  if (bad.length) o.push(it('Give every open issue an owner and a date.', 'Complete issues', '#kx-f-decisions'));
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
