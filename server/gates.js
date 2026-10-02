// Compliance gates PubPro enforces on publications (GPP 2022 / ICMJE hard rules). Each gate names
// its checkpoint ID and source so the message says why, and the audit trail keeps the proof.
//
//   A1  (ICMJE, GPP)  Every author agrees to the four ICMJE authorship criteria before drafting
//                     starts. Agreement is timestamped by the server; the time drafting started
//                     is stamped once and never changes, so the order can be shown to an auditor.
//   AB9 (GPP)         A poster or slide deck gets its own author review and approval. The
//                     abstract's approval never carries over.
//   Proxy records     Someone recording an author's acceptance and criteria agreement, or a
//                     reviewer's response, for them (say the link didn't work and they replied by
//                     email) must attach proof: the author's written confirmation, uploaded to PubPro.

// The authorship agreement an author attests to and signs from their invitation (A1 criteria + A4
// accountability). Signed before drafting starts. The version and a hash of the text are stored
// with each signature, so the record shows exactly what was signed.
const crypto = require('crypto');
const AGREEMENT = {
  version: '2026-09',
  title: 'Authorship Agreement',
  intro: 'To be listed as an author on this publication you must meet all four ICMJE authorship criteria:',
  criteria: [
    'Substantial contributions to the conception or design of the work, or to acquiring, analyzing or interpreting its data',
    'Drafting the work or revising it critically for important intellectual content',
    'Final approval of the version to be published',
    'Agreement to be accountable for all aspects of the work, including questions of accuracy and integrity',
  ],
  attestations: [
    'I agree to meet all four ICMJE authorship criteria for this publication.',
    'I accept accountability for the parts of the work I contribute to, and I can identify which co-authors are responsible for the other parts.',
    'I will direct the content of this publication, and I will disclose any conflicts of interest on the ICMJE form.',
  ],
};
AGREEMENT.hash = crypto.createHash('sha256').update(JSON.stringify([AGREEMENT.version, AGREEMENT.criteria, AGREEMENT.attestations])).digest('hex').slice(0, 16);

// Publication types that are a presentation of an abstract.
const PRESENTATION_TYPES = ['Poster', 'Congress Presentation'];

const norm = s => String(s || '').trim().toLowerCase();
const personOf = (a, group) => (group === 'external' ? String(a.name || '').split('-')[0].trim() : String(a.name || '').trim());
const keyOf = (a, group) => group + ':' + (a.id != null ? a.id : norm(a.name));

/** The authors on the byline: listed, not removed from it, and not declined. */
function authorsOf(d) {
  return ['internal', 'external'].flatMap(group => (d[group] || [])
    .filter(a => a.selected !== false && !(a.invite && a.invite.status === 'declined'))
    .map(a => ({ group, a, person: personOf(a, group), key: keyOf(a, group) })));
}

/** People on the byline who haven't agreed to the ICMJE criteria. */
function criteriaMissing(d) {
  return authorsOf(d).filter(x => !(x.a.criteria && x.a.criteria.at)).map(x => x.person);
}

const usDate = d => (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();

/**
 * Criteria agreements are write-once and timestamped here, whatever the client sent: a new
 * agreement gets the server's time; an existing one can't be edited or backdated.
 */
function stampCriteria(prev, next, now = new Date()) {
  const before = new Map();
  ['internal', 'external'].forEach(group => (prev[group] || []).forEach(a => { if (a.criteria && a.criteria.at) before.set(keyOf(a, group), a.criteria); }));
  ['internal', 'external'].forEach(group => {
    next[group] = (next[group] || []).map(a => {
      const had = before.get(keyOf(a, group));
      if (had) return { ...a, criteria: had };
      if (!a.criteria) return a;
      return { ...a, criteria: { ...a.criteria, at: now.toISOString(), on: usDate(now) } };
    });
  });
  return next;
}

// ---- V2 (GPP): the kick-off --------------------------------------------------------------
// Abstracts and manuscripts hold a kick-off with the authors (key messages, target venue,
// timeline) before drafting. The kick-off milestone is ticked only by recording the meeting
// (data.kickoff), and no later step can be completed before it. Posters and slide decks follow
// their abstract's kick-off.
const KICKOFF = /kick-?off/i;
const needsKickoff = pubType => pubType === 'Abstract' || pubType === 'Manuscript';
const planRows = d => (d.rows || []).filter(r => r.name && !(r.optional && !r.included));
function kickoffOf(d) {
  const rows = planRows(d);
  const i = rows.findIndex(r => KICKOFF.test(r.name));
  return { rows, i, row: rows[i], done: i >= 0 && !!rows[i].done, recorded: !!(d.kickoff && d.kickoff.heldOn) };
}
function kickoffGate(pubType, prev, next) {
  if (!needsKickoff(pubType)) return null;
  const k = kickoffOf(next);
  if (k.i < 0) return null;
  const before = new Map(planRows(prev).map(r => [r.id, r]));
  if (k.done && !(before.get(k.row.id) || {}).done) {
    if (!k.recorded) return 'V2 (GPP): record the kick-off meeting on the Kick-off tab to complete the kick-off.';
    // Everything the kick-off must produce (server/kickoff.js; required lazily, it uses this file).
    const missing = require('./kickoff').kickoffMissing(pubType, next);
    if (missing.length) return 'V2 (GPP): the kick-off can’t be completed yet. Still needed: ' + missing.join('; ') + '.';
  }
  if (k.done) return null;
  const jumped = k.rows.slice(k.i + 1).find(r => r.done && !(before.get(r.id) || {}).done);
  return jumped ? 'V2 (GPP): record the kick-off meeting before completing “' + jumped.name + '”. Drafting starts after the kick-off.' : null;
}

/**
 * A1, A4 and V2: the document can only be started (created or imported) once every author has
 * signed and, for abstracts and manuscripts, the kick-off is done. Returns an error message, or
 * null and stamps draftStartedAt.
 */
function draftingGate(prev, next, pubType, now = new Date()) {
  if (prev.draftStartedAt) { next.draftStartedAt = prev.draftStartedAt; return null; }
  if (prev.pubDoc || !next.pubDoc) { delete next.draftStartedAt; return null; }
  const authors = authorsOf(next);
  if (!authors.length) return 'A1 (ICMJE, GPP): add the authors and have each agree to the ICMJE authorship criteria before drafting starts.';
  const missing = criteriaMissing(next);
  if (missing.length) {
    return 'A1, A4 (ICMJE, GPP): every author must sign the authorship agreement, attesting to the ICMJE criteria, before drafting starts. Still waiting on ' + missing.join(', ') + '.';
  }
  if (needsKickoff(pubType)) {
    const k = kickoffOf(next);
    if (k.i < 0) return 'V2 (GPP): add the kick-off milestone on the Planning tab and record the kick-off meeting on the Kick-off tab before drafting starts.';
    if (!k.done) return 'V2 (GPP): record the kick-off meeting on the Kick-off tab before drafting starts.';
  }
  next.draftStartedAt = now.toISOString();
  const latest = authors.map(x => x.a.criteria.at).sort().pop();
  next.audit = (next.audit || []).concat([{
    action: 'Drafting Started', participants: authors.map(x => x.person).join('\n'),
    start: usDate(now), completed: usDate(now), result: 'Authorship criteria agreed first', active: false,
    comment: 'All ' + authors.length + ' authors agreed to the ICMJE criteria before drafting (last agreement ' + latest.replace('T', ' ').slice(0, 16) + ' UTC).',
  }]);
  return null;
}

/**
 * AB9: who has approved this record's own content: every author on the byline must approve in a
 * closed Author Approval round on this record.
 */
function ownApproval(d) {
  const approvedBy = new Set((d.rounds || [])
    .filter(r => r.type === 'Author Approval' && r.status === 'closed')
    .flatMap(r => (r.reviewers || []).filter(v => v.decision === 'approve').map(v => norm(v.name))));
  const authors = authorsOf(d);
  const waiting = authors.filter(x => !approvedBy.has(norm(x.person))).map(x => x.person);
  return { ok: authors.length > 0 && waiting.length === 0, waiting };
}

/** AB9: a poster or slide deck can't be marked Accepted (presented) without its own approval. */
function presentationGate(pubType, prev, next) {
  if (!PRESENTATION_TYPES.includes(pubType)) return null;
  const nowAccepted = next.outcomeStatus === 'Accepted' || next.dispositionRecorded;
  const wasAccepted = prev.outcomeStatus === 'Accepted' || prev.dispositionRecorded;
  if (!nowAccepted || wasAccepted) return null;
  const { ok, waiting } = ownApproval(next);
  if (ok) return null;
  const what = pubType === 'Poster' ? 'poster' : 'slide deck';
  return 'AB9 (GPP): this ' + what + ' needs its own Author Approval before it can be marked Accepted; the abstract’s approval doesn’t carry over. '
    + (waiting.length ? 'Waiting on ' + waiting.join(', ') + '.' : 'Add the authors first.');
}

/**
 * Recording for someone else needs proof (see above). Compares the saved record with the incoming
 * one: every new criteria agreement and every changed review decision must be the signed-in
 * person's own, or carry proof uploaded to this publication. Returns an error message or null.
 */
function proxyGate(prev, next, userName, isProof) {
  const me = norm(userName);
  const proven = x => !!(x && x.proof && x.proof.id && isProof(x.proof.id));
  const had = new Set();
  ['internal', 'external'].forEach(group => (prev[group] || []).forEach(a => { if (a.criteria && a.criteria.at) had.add(keyOf(a, group)); }));
  for (const group of ['internal', 'external']) {
    for (const a of next[group] || []) {
      if (!a.criteria || had.has(keyOf(a, group))) continue;
      if (norm(personOf(a, group)) === me || proven(a.criteria)) continue;
      return 'To record ' + personOf(a, group) + '\u2019s acceptance and agreement to the ICMJE criteria for them, upload their written confirmation (for example, their email) as proof.';
    }
  }
  const before = new Map((prev.rounds || []).map(r => [r.num, new Map((r.reviewers || []).map(v => [norm(v.name), v]))]));
  for (const r of next.rounds || []) {
    const old = before.get(r.num) || new Map();
    for (const v of r.reviewers || []) {
      const was = old.get(norm(v.name));
      const decided = v.decision && v.decision !== 'pending';
      if (!decided || (was && was.decision === v.decision)) continue;
      if (norm(v.name) === me || proven(v.proxy)) continue;
      return 'To record ' + v.name + '\u2019s review response for them, upload their written response (for example, their email) as proof.';
    }
  }
  return null;
}

module.exports = { AGREEMENT, kickoffGate, needsKickoff, proxyGate, PRESENTATION_TYPES, authorsOf, criteriaMissing, stampCriteria, draftingGate, ownApproval, presentationGate, personOf, usDate };
