// CRediT contributions per author on a publication. Stored on st.authorMetaEdits[person].credit
// as [{ id, degree }]. Each role is a check-off; the degree (lead | equal | supporting) is optional.
// Older records stored role labels only. The kick-off plans them (required); final approval confirms.
import { AUTHOR_META, CREDIT_DEGREES, CREDIT_TAXONOMY } from './data';

const byId = new Map(CREDIT_TAXONOMY.map(r => [r.id, r]));
const byLabel = new Map(CREDIT_TAXONOMY.map(r => [r.label.toLowerCase(), r]));
export const degreeLabel = id => (CREDIT_DEGREES.find(d => d.id === id) || {}).label || '';
const WRITING = ['writing-original-draft', 'writing-review-editing'];

/** An author's roles: [{ id, label, degree }] in taxonomy order. */
export function contributionsOf(st, person) {
  const raw = ((st.authorMetaEdits || {})[person] || {}).credit || (AUTHOR_META[person] || {}).credit || [];
  const out = raw.map(x => {
    const r = typeof x === 'string' ? byLabel.get(x.toLowerCase()) : byId.get(x.id);
    return r ? { id: r.id, label: r.label, degree: typeof x === 'string' ? '' : (x.degree || '') } : null;
  }).filter(Boolean);
  return CREDIT_TAXONOMY.map(r => out.find(x => x.id === r.id)).filter(Boolean);
}
/** Stored form, for saving. */
export const toStored = list => list.map(x => ({ id: x.id, degree: x.degree || '' }));
export const summaryOf = list => list.map(x => x.label + (x.degree ? ' (' + degreeLabel(x.degree) + ')' : '')).join(', ');

/** What the kick-off needs (hard): every author has at least one role checked. The extent is optional. */
export function creditMissing(st, people) {
  const none = people.filter(p => !contributionsOf(st, p).length);
  return none.length ? ['CRediT roles for ' + none.join(', ') + ' (Authors tab).'] : [];
}

/** Soft flags from the taxonomy's rules: worth a look, not blocking. */
export function creditFlags(st, people) {
  const flags = [];
  CREDIT_TAXONOMY.forEach(r => {
    const leads = people.filter(p => contributionsOf(st, p).some(x => x.id === r.id && x.degree === 'lead'));
    if (leads.length > 1) flags.push('More than one lead on ' + r.label + ': ' + leads.join(', ') + '.');
  });
  people.forEach(p => {
    const list = contributionsOf(st, p);
    if (!list.length) flags.push(p + ' has no roles.');
    else if (!list.some(x => WRITING.includes(x.id))) flags.push(p + ' holds neither writing role (possible ICMJE criterion 2 gap).');
  });
  return flags;
}

/** The soft flags that concern one author: their own gaps, or a role they lead alongside others. */
export function creditFlagsFor(st, people, person) {
  const mine = contributionsOf(st, person);
  const out = [];
  if (!mine.length) out.push('No roles checked yet. The kick-off needs at least one.');
  else if (!mine.some(x => WRITING.includes(x.id))) out.push('Holds neither writing role (possible ICMJE criterion 2 gap).');
  mine.filter(x => x.degree === 'lead').forEach(x => {
    const others = people.filter(p => p !== person && contributionsOf(st, p).some(y => y.id === x.id && y.degree === 'lead'));
    if (others.length) out.push('Also marked lead on ' + x.label + ': ' + others.join(', ') + '.');
  });
  return out;
}
