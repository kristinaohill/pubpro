// What a kick-off must produce before it can be recorded as held (V2, GPP; Kristina's kick-off
// checklist). The same rules as client/src/pages/publication-form/kickoff.js: keep the two in step.
// The client sends each author's CRediT roles as a snapshot (data.kickoff.contributions) because
// the sample authors' roles only live in the client's directory.
const { authorsOf } = require('./gates');

const filled = v => String(v == null ? '' : v).trim().length > 0;
const mdy = s => { const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? new Date(+m[3], +m[1] - 1, +m[2]) : null; };
const KICKOFF = /kick-?off/i;
const timelineRows = d => {
  const rows = (d.rows || []).filter(r => r.name && !(r.optional && !r.included));
  const i = rows.findIndex(r => KICKOFF.test(r.name));
  return i < 0 ? rows : rows.slice(i + 1);
};

/** Everything still missing from the kick-off record, as short sentences. Empty = ready. */
function kickoffMissing(pubType, d) {
  const k = d.kickoff || {};
  const prep = d.kickoffPrep || {};
  const abstract = pubType === 'Abstract';
  const out = [];
  const held = mdy(k.heldOn);
  if (!held) out.push('the date the meeting was held');
  else if (held > new Date()) out.push('a meeting date that isn’t in the future');
  if (!(k.attendees || []).length) out.push('the authors who attended');

  const authors = authorsOf(d);
  if (!authors.length) out.push('the authors');
  const unsigned = authors.filter(x => !(x.a.criteria && x.a.criteria.at)).map(x => x.person);
  if (unsigned.length) out.push('signed authorship agreements from ' + unsigned.join(', '));
  if (!prep.orderConfirmed) out.push('the confirmed author order');
  // CRediT: [{ id, degree }] per author. Every author needs a role checked; the extent is optional.
  const roles = k.contributions || {};
  const noRole = authors.filter(x => !(roles[x.person] || []).length).map(x => x.person);
  if (noRole.length) out.push('CRediT roles for ' + noRole.join(', '));

  if (!prep.coiReviewed) out.push('the COI disclosure review');
  if (!prep.transferOfValue || (prep.transferOfValue === 'yes' && !filled(prep.tovNote))) out.push('the transfer-of-value answer');

  const msgs = (d.keyMessages || []).filter(m => filled(m.text));
  if (msgs.length < 2 || msgs.length > 4 || msgs.some(m => !filled(m.endpoint))) out.push('two to four key messages, each tied to an endpoint');

  const s = d.dataScope || {};
  const analyses = (s.analyses || []).filter(x => filled(x.name));
  const outputs = (s.outputs || []).filter(x => filled(x.name));
  if (!filled(s.cut) || !analyses.length || analyses.some(x => !x.label) || !outputs.length || outputs.some(x => !filled(x.owner)) || (abstract && !mdy(s.finalBy))) {
    out.push('the data scope (data cut, labelled analyses, tables and figures with owners' + (abstract ? ', data-final date' : '') + ')');
  }

  const v = d.venuePlan || {};
  const targets = d.targets || [];
  if (!targets[0] || (!abstract && !targets[1]) || !filled(v.format) || (abstract && (!filled(v.category) || !v.presentation))) {
    out.push('the target venue' + (abstract ? ', category, presentation preference' : ' and fallback') + ' and format notes');
  }

  const rows = timelineRows(d);
  if (!rows.length || rows.some(r => !filled(r.owner) || !filled(r.end || r.start))) out.push('a dated timeline with a named owner on every step');

  const l = d.logistics || {};
  if (!filled(l.writer) || (l.writer !== 'No medical writing support' && !filled(l.writingAck)) || !filled(d.correspondingAuthor) || !filled(l.reviewMethod) || !(Number(l.turnaroundDays) > 0)) {
    out.push('roles and logistics (writer and acknowledgment, corresponding author, review method, turnaround)');
  }

  if ((d.decisions || []).some(x => filled(x.item) && (!filled(x.owner) || !mdy(x.due)))) out.push('an owner and date on every open issue');
  return out;
}

module.exports = { kickoffMissing };
