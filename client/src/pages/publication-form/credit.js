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
  people.forEach(p => {
    const ids = contributionsOf(st, p).map(x => x.id);
    if (ids.length && ids.every(id => ['funding-acquisition', 'supervision', 'resources', 'project-administration'].includes(id))) flags.push(p + ' holds only acknowledgment-type roles (ICMJE).');
  });
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

// ---- ICMJE criteria from the evidence (Kristina's mapping, 2026-10-02) ----------------------
// 1 Substantial contribution: a CRediT role among these.
// 2 Drafting or critical revision: a writing role, backed by the review record.
// 3 Final approval: the final Author Approval step, timestamped.
// 4 Accountability: the authorship agreement signed at kick-off.
export const C1_ROLES = ['conceptualization', 'methodology', 'investigation', 'formal-analysis', 'data-curation'];
// ICMJE's examples of contributions that alone go in the acknowledgments, not authorship.
export const ACK_ONLY_ROLES = ['funding-acquisition', 'supervision', 'resources', 'project-administration'];
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/**
 * The four criteria for one author: [{ n, k, status: 'met' | 'planned' | 'missing', src }].
 * entry is their byline entry (for the signed agreement); approved = approval given at Author Approval.
 */
export function icmjeCriteria(st, person, entry) {
  const roles = contributionsOf(st, person);
  const ids = roles.map(x => x.id);
  const c1 = roles.filter(x => C1_ROLES.includes(x.id)).map(x => x.label);
  const writing = roles.filter(x => WRITING.includes(x.id)).map(x => x.label);
  const rounds = st.rounds || [];
  const reviewed = rounds.find(r => r.type !== 'Author Approval' && r.reviewers.some(v => same(v.name, person) && v.decision && v.decision !== 'pending'));
  const approval = rounds.map(r => r.type === 'Author Approval' && r.reviewers.find(v => same(v.name, person) && v.decision === 'approve')).find(Boolean);
  const c = entry && entry.criteria;
  const signedOn = c && c.at ? c.on : entry && entry.agreementDate ? entry.agreementDate : '';
  return [
    c1.length
      ? { n: 1, k: 'Substantial contribution', status: 'met', src: 'CRediT: ' + c1.join(', ') }
      : { n: 1, k: 'Substantial contribution', status: 'missing', src: 'Needs a CRediT role among Conceptualization, Methodology, Investigation, Formal analysis or Data curation' },
    writing.length && reviewed
      ? { n: 2, k: 'Drafting or critical revision', status: 'met', src: 'CRediT: ' + writing.join(', ') + ', and feedback in ' + reviewed.type + ' (round ' + reviewed.num + ')' }
      : writing.length
        ? { n: 2, k: 'Drafting or critical revision', status: 'planned', src: 'CRediT: ' + writing.join(', ') + '. Met once they give feedback in a draft review round' }
        : reviewed
          ? { n: 2, k: 'Drafting or critical revision', status: 'planned', src: 'Gave feedback in ' + reviewed.type + '. Add their writing role (CRediT)' }
          : { n: 2, k: 'Drafting or critical revision', status: 'missing', src: 'Needs a writing role (CRediT), backed by feedback in a draft review round' },
    approval
      ? { n: 3, k: 'Final approval', status: 'met', src: 'Approved at Author Approval' + (approval.on ? ' on ' + approval.on : '') }
      : { n: 3, k: 'Final approval', status: 'missing', src: 'Given at the final Author Approval step' },
    signedOn
      ? { n: 4, k: 'Accountability', status: 'met', src: 'Authorship agreement signed ' + signedOn }
      : { n: 4, k: 'Accountability', status: 'missing', src: 'The authorship agreement, signed at kick-off' },
  ].map(x => ({ ...x, ids }));
}

/** ICMJE flags for one author: acknowledgment-only roles, and a missed chance to meet criteria 2-4. */
export function icmjeFlagsFor(st, person) {
  const ids = contributionsOf(st, person).map(x => x.id);
  const out = [];
  if (ids.length && ids.every(id => ACK_ONLY_ROLES.includes(id))) {
    out.push('Holds only roles ICMJE treats as acknowledgment (funding, supervision, resources, administration). Consider the acknowledgments instead of the byline.');
  }
  const drafting = !!(st.draftStartedAt || st.pubDoc);
  const draftRounds = (st.rounds || []).filter(r => r.type !== 'Author Approval');
  if (drafting && draftRounds.length && ids.some(id => C1_ROLES.includes(id)) && !draftRounds.some(r => r.reviewers.some(v => same(v.name, person)))) {
    out.push('Meets criterion 1 but hasn’t been sent a draft to review. ICMJE: give them the chance to meet criteria 2 to 4.');
  }
  return out;
}
