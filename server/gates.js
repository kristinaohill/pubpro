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

/**
 * A1: the document can only be started (created or imported) once every author has agreed to the
 * criteria. Returns an error message, or null and stamps draftStartedAt.
 */
function draftingGate(prev, next, now = new Date()) {
  if (prev.draftStartedAt) { next.draftStartedAt = prev.draftStartedAt; return null; }
  if (prev.pubDoc || !next.pubDoc) { delete next.draftStartedAt; return null; }
  const authors = authorsOf(next);
  if (!authors.length) return 'A1 (ICMJE, GPP): add the authors and have each agree to the ICMJE authorship criteria before drafting starts.';
  const missing = criteriaMissing(next);
  if (missing.length) {
    return 'A1 (ICMJE, GPP): every author must agree to the ICMJE authorship criteria before drafting starts. Still waiting on ' + missing.join(', ') + '.';
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

module.exports = { proxyGate, PRESENTATION_TYPES, authorsOf, criteriaMissing, stampCriteria, draftingGate, ownApproval, presentationGate, personOf, usDate };
