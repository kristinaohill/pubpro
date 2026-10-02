const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requirePerm, can, blockAuthors } = require('../auth');
const doc = require('../docMarkup');
const { ACTIVE_PRODUCTS } = require('../products');
// Retired (inactive) products stay on the records that have them but can't be picked for new ones.
const retired = (product, current) => product && product !== current && !ACTIVE_PRODUCTS.includes(product)
  ? product + ' is inactive, so it can\u2019t be picked for a publication.' : null;
const { productCode, yearCode, nextSequence } = require('../recordIds');
const gates = require('../gates');

// Proof files for things recorded on someone's behalf (e.g. an author's emailed confirmation).
db.exec(`CREATE TABLE IF NOT EXISTS pp_proofs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pub_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  mime TEXT,
  size INTEGER,
  data BLOB NOT NULL,
  purpose TEXT,
  subject TEXT,
  uploaded_by TEXT,
  uploaded_at TEXT DEFAULT (datetime('now'))
)`);
const PROOF_MAX = 5 * 1024 * 1024;
const PROOF_TYPES = /\.(pdf|eml|msg|txt|png|jpe?g|docx?|html?)$/i;
const isProofFor = pubId => proofId => !!db.prepare('SELECT 1 FROM pp_proofs WHERE id = ? AND pub_id = ?').get(Number(proofId), Number(pubId));

// Record IDs follow the PubPro pattern: <yy>-<type>-<product>-<seq>-V01, e.g. 26-M-DAX-015-V01.
const TYPE_CODES = { Abstract: 'A', Poster: 'AP', Manuscript: 'M', 'Congress Presentation': 'CP' };
const STATUSES = ['Draft', 'Active', 'In Review', 'Cancelled'];

// Publications saved as Draft before 'Active' existed become Active if author invitations have gone out.
for (const row of db.prepare("SELECT id, data FROM pp_publications WHERE status = 'Draft'").all()) {
  let d = {};
  try { d = JSON.parse(row.data || '{}'); } catch (e) { continue; }
  const sent = (d.internal || []).concat(d.external || []).some(a => a.invite && a.invite.status && a.invite.status !== 'none');
  if (sent) db.prepare("UPDATE pp_publications SET status = 'Active' WHERE id = ?").run(row.id);
}

// The design's example publication, seeded once so its links open a real record.
const SAMPLE_RECORD_ID = '26-A-DAX-004-V01';

function nextRecordId(pubType, product) {
  const prefix = `${yearCode()}-${TYPE_CODES[pubType] || 'X'}-${productCode(product)}-`;
  const rows = db.prepare('SELECT record_id FROM pp_publications WHERE record_id LIKE ?').all(prefix + '%');
  return prefix + nextSequence(rows.map(r => r.record_id), prefix) + '-V01';
}

// External authors only see publications that list them as an author or reviewer.
const norm = s => String(s || '').trim().toLowerCase();
function involves(dataText, person) {
  const d = parse(dataText, {});
  const who = norm(person);
  const names = (d.internal || []).map(a => a.name)
    .concat((d.external || []).map(a => String(a.name).split('-')[0]))
    .concat((d.rounds || []).flatMap(r => (r.reviewers || []).map(v => v.name)));
  return names.some(n => norm(n) === who);
}
// Anyone on one of the publication's review rounds (so they can open it to do their review).
const onRound = (dataText, person) => (parse(dataText, {}).rounds || [])
  .some(r => (r.reviewers || []).some(v => norm(v.name) === norm(person)));
// If you can see it you can edit it: staff see the publications their roles let them edit (for
// the record's product), plus, for now, Reviewers see the ones they can review, and anyone sees the
// ones they've been asked to review. External authors see the publications that list them.
const canSee = (req, row) => (req.user.role === 'author'
  ? involves(row.data, req.user.name)
  : can(req, 'pubs.edit', row.product || null) || can(req, 'doc.edit', row.product || null) || onRound(row.data, req.user.name));

const LIST_COLUMNS = 'id, record_id, title, pub_type, product, status, owner, summary, created_at, updated_at';

const parse = (text, fallback) => {
  try { return JSON.parse(text || ''); } catch { return fallback; }
};
const listRow = row => (row ? { ...row, summary: parse(row.summary, {}) } : row);
const getListRow = id => listRow(db.prepare(`SELECT ${LIST_COLUMNS} FROM pp_publications WHERE id = ?`).get(id));

// The document's text and tracked changes are only written through PUT /:id/document, so a form
// save (or one from a dashboard) never overwrites someone's document edits with a stale copy.
const DOC_KEYS = ['pubDocText', 'pubDocMarkup', 'pubDocTrack', 'pubDocVersion'];
function keepDocument(dataJson, existingData) {
  const next = parse(dataJson, {});
  const prev = existingData || {};
  DOC_KEYS.forEach(k => { if (k in prev) next[k] = prev[k]; else delete next[k]; });
  return JSON.stringify(next);
}

/** Why a scoped role can't act on this product, e.g. "Your Medical Writer role covers Daxafort only." */
function outOfScope(req, perm, product) {
  const P = require('../permissions');
  const u = db.prepare('SELECT role, extra_roles, role_scopes, product_roles FROM users WHERE id = ?').get(req.user.id) || {};
  const holders = P.scopesOf(u).filter(sc => P.permissionsOf(sc.role).includes(perm) && sc.products);
  const what = product ? String(product).split(' ')[0] : 'this product';
  if (!holders.length) return 'Your role does not allow this for ' + what + '.';
  return holders.map(sc => 'As a ' + P.roleName(sc.role) + ' you work on ' + P.scopeLabel(sc.products)).join('; ') + ', not ' + what + '.';
}

function readBody(body) {
  return {
    title: String(body.title || '').trim(),
    pubType: String(body.pub_type || '').trim(),
    product: body.product || null,
    status: STATUSES.includes(body.status) ? body.status : 'Draft',
    summary: JSON.stringify(body.summary || {}),
    data: JSON.stringify(body.data || {}),
  };
}

// ?include=data adds each record's full data (the dashboard and reports chart from it).
router.get('/', requireAuth, (req, res) => {
  const full = req.query.include === 'data';
  const rows = db.prepare(`SELECT ${LIST_COLUMNS}, data FROM pp_publications ORDER BY updated_at DESC, id DESC`).all()
    .filter(r => canSee(req, r));
  res.json(rows.map(({ data, ...r }) => (full ? { ...listRow(r), data: parse(data, {}) } : listRow(r))));
});

router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!row || !canSee(req, row)) return res.status(404).json({ error: 'Publication not found' });
  res.json({ ...listRow(row), data: parse(row.data, {}), related: relatedTo(row.id) });
});

/** Posters and slide decks made from publication id (AB9), with whether their own approval is done. */
function relatedTo(id) {
  return db.prepare('SELECT id, record_id, title, pub_type, data FROM pp_publications').all()
    .map(r => ({ r, d: parse(r.data, {}) }))
    .filter(x => x.d.sourcePub && String(x.d.sourcePub.id) === String(id))
    .map(({ r, d }) => ({ id: r.id, record_id: r.record_id, title: r.title, pub_type: r.pub_type, approved: gates.ownApproval(d).ok, cancelled: !!d.cancelled }));
}

router.post('/', requireAuth, blockAuthors, requirePerm('pubs.edit'), (req, res) => {
  const { title, pubType, product, status, summary } = readBody(req.body);
  if (!can(req, 'pubs.edit', product)) return res.status(403).json({ error: outOfScope(req, 'pubs.edit', product) });
  if (retired(product)) return res.status(400).json({ error: retired(product) });
  // Agreement to the criteria only comes from invitation replies (or an abstract), never a new record.
  const d = parse(keepDocument(readBody(req.body).data, {}), {});
  ["internal", "external"].forEach(g => { d[g] = (d[g] || []).map(({ criteria, ...a }) => a); });
  delete d.sourcePub;
  delete d.draftStartedAt;
  const blocked = gates.draftingGate({}, d, pubType) || gates.kickoffGate(pubType, {}, d) || gates.presentationGate(pubType, {}, d);
  if (blocked) return res.status(400).json({ error: blocked });
  const data = JSON.stringify(d);
  if (!title) return res.status(400).json({ error: 'A title is required to save the publication.' });
  if (!TYPE_CODES[pubType]) return res.status(400).json({ error: 'Choose a publication type.' });
  const recordId = nextRecordId(pubType, product);
  const r = db.prepare(`INSERT INTO pp_publications (record_id, title, pub_type, product, status, owner, summary, data, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(recordId, title, pubType, product, status, req.user.name || null, summary, data, req.user.id || null);
  res.json(getListRow(r.lastInsertRowid));
});

// Returns the sample record, creating it from the posted data the first time.
router.post('/sample', requireAuth, blockAuthors, (req, res) => {
  const existing = db.prepare('SELECT id FROM pp_publications WHERE record_id = ?').get(SAMPLE_RECORD_ID);
  if (existing) return res.json(getListRow(existing.id));
  const { title, pubType, product, status, summary, data } = readBody(req.body);
  if (!title || !TYPE_CODES[pubType]) return res.status(400).json({ error: 'The sample record needs a title and type.' });
  try {
    const r = db.prepare(`INSERT INTO pp_publications (record_id, title, pub_type, product, status, owner, summary, data, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(SAMPLE_RECORD_ID, title, pubType, product, status, 'Kristina Hill', summary, data, req.user.id || null);
    res.json(getListRow(r.lastInsertRowid));
  } catch (e) {
    // Two tabs (or a double-mounted page) raced to seed it; return the one that won.
    const won = db.prepare('SELECT id FROM pp_publications WHERE record_id = ?').get(SAMPLE_RECORD_ID);
    if (!won) throw e;
    res.json(getListRow(won.id));
  }
});

// Publication Type and the record ID are fixed once the record exists.
router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT id, data, product, pub_type FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!existing || !canSee(req, existing)) return res.status(404).json({ error: 'Publication not found' });
  // External authors update their own invitation and review responses (their dashboard); staff need pubs.edit.
  if (req.user.role !== 'author' && !can(req, 'pubs.edit')) return res.status(403).json({ error: 'Your role does not allow editing publications.' });
  const { title, product, status, summary } = readBody(req.body);
  // Roles limited to some products: the record must be in scope before and after the change.
  if (req.user.role !== 'author') {
    for (const p of [existing.product, product]) {
      if (!can(req, 'pubs.edit', p)) return res.status(403).json({ error: outOfScope(req, 'pubs.edit', p) });
    }
  }
  if (!title) return res.status(400).json({ error: 'A title is required to save the publication.' });
  if (retired(product, existing.product)) return res.status(400).json({ error: retired(product, existing.product) });
  const prevData = parse(existing.data, {});
  const d = gates.stampCriteria(prevData, parse(keepDocument(readBody(req.body).data, prevData), {}));
  if (!!prevData.cancelled !== !!d.cancelled && !can(req, 'pubs.cancel', existing.product)) {
    return res.status(403).json({ error: 'Your role does not allow cancelling or reinstating publications.' });
  }
  if (prevData.sourcePub) d.sourcePub = prevData.sourcePub;
  const proxy = gates.proxyGate(prevData, d, req.user.name, isProofFor(existing.id));
  if (proxy) return res.status(400).json({ error: proxy });
  const blocked = gates.draftingGate(prevData, d, existing.pub_type) || gates.kickoffGate(existing.pub_type, prevData, d) || gates.presentationGate(existing.pub_type, prevData, d);
  if (blocked) return res.status(400).json({ error: blocked });
  db.prepare(`UPDATE pp_publications SET title = ?, product = ?, status = ?, summary = ?, data = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(title, product, status, summary, JSON.stringify(d), req.params.id);
  // What the server decided (criteria times, when drafting started, its audit entry) goes back to the form.
  res.json({ ...getListRow(req.params.id), gated: { internal: d.internal || [], external: d.external || [], draftStartedAt: d.draftStartedAt || null, audit: d.audit || [] } });
});

// ---- Proof files -------------------------------------------------------------------------
// { name, mime, data (base64), purpose: 'criteria' | 'review', subject (the person) }. Up to 5 MB.
router.post('/:id/proofs', requireAuth, blockAuthors, requirePerm('pubs.edit'), (req, res) => {
  const row = db.prepare('SELECT id, product FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!row || !canSee(req, row)) return res.status(404).json({ error: 'Publication not found' });
  if (!can(req, 'pubs.edit', row.product)) return res.status(403).json({ error: outOfScope(req, 'pubs.edit', row.product) });
  const name = String(req.body.name || '').trim().slice(0, 200);
  if (!name || !PROOF_TYPES.test(name)) return res.status(400).json({ error: 'Upload an email (.eml, .msg), PDF, image, Word or text file.' });
  let buf;
  try { buf = Buffer.from(String(req.body.data || ''), 'base64'); } catch (e) { buf = null; }
  if (!buf || !buf.length) return res.status(400).json({ error: 'That file is empty.' });
  if (buf.length > PROOF_MAX) return res.status(400).json({ error: 'Keep proof files under 5 MB.' });
  const r = db.prepare('INSERT INTO pp_proofs (pub_id, name, mime, size, data, purpose, subject, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(row.id, name, String(req.body.mime || '').slice(0, 100), buf.length, buf, String(req.body.purpose || '').slice(0, 20), String(req.body.subject || '').slice(0, 200), req.user.name);
  res.json({ id: r.lastInsertRowid, name, size: buf.length, uploadedBy: req.user.name, uploadedAt: new Date().toISOString() });
});
router.get('/:id/proofs/:proofId', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, data, product FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!row || !canSee(req, row)) return res.status(404).json({ error: 'Publication not found' });
  const p = db.prepare('SELECT name, mime, data FROM pp_proofs WHERE id = ? AND pub_id = ?').get(Number(req.params.proofId), row.id);
  if (!p) return res.status(404).json({ error: 'Proof not found' });
  res.setHeader('Content-Type', p.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="' + p.name.replace(/[^\w.\- ]/g, '_') + '"');
  res.send(Buffer.from(p.data));
});

// ---- An author's own reply to their invitation ----------------------------------------------
// { accept, criteria }: accepting means agreeing to the four ICMJE authorship criteria (A1), which is
// recorded with the server's time. Internal authors reply here from the publication; external
// authors from their dashboard. Tells the owner in PubPro.
// What the invitation page shows the signed-in author: the publication, their invitation and the
// agreement text to attest to and sign.
router.get('/:id/invitation', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!row || !canSee(req, row)) return res.status(404).json({ error: 'Publication not found' });
  const data = parse(row.data, {});
  const group = req.user.role === 'author' ? 'external' : 'internal';
  const me = (data[group] || []).find(a => norm(gates.personOf(a, group)) === norm(req.user.name));
  if (!me) return res.status(404).json({ error: 'You aren\u2019t an author on this publication.' });
  const f = data.fields || {};
  res.json({
    publication: { id: row.id, recordId: row.record_id, title: f.pubTitle || f.abbrevTitle || row.title, type: row.pub_type, product: row.product, owner: row.owner, cancelled: !!data.cancelled },
    me: { name: req.user.name, invite: me.invite || { status: 'none' }, criteria: me.criteria || null },
    agreement: gates.AGREEMENT,
  });
});

router.post('/:id/invitation-response', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!row || !canSee(req, row)) return res.status(404).json({ error: 'Publication not found' });
  const data = parse(row.data, {});
  if (data.cancelled || row.status === 'Cancelled') return res.status(400).json({ error: 'This publication is cancelled.' });
  const accept = !!req.body.accept;
  if (accept && req.body.criteria !== true) return res.status(400).json({ error: 'Attest to each statement to sign the agreement.' });
  // The signature is the author typing their full name as it appears in PubPro.
  const squash = s => norm(s).replace(/\s+/g, ' ');
  const signature = String(req.body.signature || '').trim().replace(/\s+/g, ' ').slice(0, 200);
  if (accept && squash(signature) !== squash(req.user.name)) return res.status(400).json({ error: 'Type your full name exactly as ' + req.user.name + ' to sign.' });
  const me = norm(req.user.name);
  const group = req.user.role === 'author' ? 'external' : 'internal';
  const list = data[group] || [];
  const i = list.findIndex(a => norm(gates.personOf(a, group)) === me);
  if (i < 0) return res.status(403).json({ error: 'You aren\u2019t an author on this publication.' });
  const now = new Date();
  const on = gates.usDate(now);
  const A = gates.AGREEMENT;
  const signed = accept && !(list[i].criteria && list[i].criteria.at);
  list[i] = {
    ...list[i],
    invite: { ...(list[i].invite || {}), status: accept ? 'accepted' : 'declined', on },
    // Signing = the attestation to the criteria plus the signed authorship agreement, one timestamp.
    ...(signed ? {
      criteria: { at: now.toISOString(), on, by: req.user.name, how: 'self', signedName: signature, agreementVersion: A.version, agreementHash: A.hash },
      agreement: A.title.replace(/\s+/g, '_') + '_' + row.record_id + '_' + req.user.name.replace(/[^\w]+/g, '_') + '.pdf',
      agreementDate: on,
    } : {}),
  };
  data[group] = list;
  data.audit = (data.audit || []).concat([{
    action: accept ? 'Authorship Invitation Accepted' : 'Authorship Invitation Declined', participants: req.user.name,
    start: on, completed: on, result: accept ? 'Accepted' : 'Declined', active: false,
    comment: signed ? 'Signed the authorship agreement v' + A.version + ' and attested to the four ICMJE criteria (A1, A4) · signature "' + signature + '" · ' + now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : accept ? 'Accepted in PubPro' : 'Replied in PubPro',
  }]);
  const anySent = (data.internal || []).concat(data.external || []).some(a => a.invite && a.invite.status && a.invite.status !== 'none');
  db.prepare("UPDATE pp_publications SET data = ?, status = CASE WHEN status = 'Draft' AND ? THEN 'Active' ELSE status END, updated_at = datetime('now') WHERE id = ?")
    .run(JSON.stringify(data), anySent ? 1 : 0, row.id);
  if (row.owner && norm(row.owner) !== me) {
    db.prepare(`INSERT INTO pp_notifications (recipient, sender, pub_id, record_id, kind, title, body, tab)
      VALUES (?, ?, ?, ?, 'response', ?, ?, 'authors')`)
      .run(row.owner, req.user.name, row.id, row.record_id, req.user.name + (accept ? ' accepted' : ' declined') + ' the authorship invitation', row.title + ' (' + row.record_id + ')');
  }
  res.json({ internal: data.internal || [], external: data.external || [], audit: data.audit });
});

// ---- A poster or slide deck from an abstract (AB9) ------------------------------------------
// { pubType: 'Poster' | 'Congress Presentation' }: a separate record with the abstract's authors,
// product, studies and congress, and its own review and approval. The authors' agreement to the
// criteria carries over (it's the same work); the abstract's approval doesn't.
router.post('/:id/derive', requireAuth, blockAuthors, requirePerm('pubs.edit'), (req, res) => {
  const src = db.prepare('SELECT * FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!src || !canSee(req, src)) return res.status(404).json({ error: 'Publication not found' });
  if (!can(req, 'pubs.edit', src.product)) return res.status(403).json({ error: outOfScope(req, 'pubs.edit', src.product) });
  if (src.pub_type !== 'Abstract') return res.status(400).json({ error: 'Posters and slide decks are made from an abstract.' });
  const pubType = String(req.body.pubType || '');
  if (!gates.PRESENTATION_TYPES.includes(pubType)) return res.status(400).json({ error: 'Choose a poster or a slide deck.' });
  const s = parse(src.data, {});
  if (s.cancelled) return res.status(400).json({ error: 'This abstract is cancelled.' });
  const label = pubType === 'Poster' ? 'Poster' : 'Slides';
  const f = s.fields || {};
  const base = (f.abbrevTitle || src.title || '').trim();
  const now = new Date();
  const on = gates.usDate(now);
  const carry = a => ({ ...a, criteria: a.criteria ? { ...a.criteria, carriedFrom: src.record_id } : undefined });
  const title = (base + ' \u2014 ' + label).slice(0, 200);
  const data = {
    pubType, product: s.product || src.product, subType: '', parentPlan: s.parentPlan,
    fields: { abbrevTitle: title, pubTitle: f.pubTitle || '', therapeuticArea: f.therapeuticArea, department: f.department, sponsorType: f.sponsorType },
    internal: (s.internal || []).map(carry), external: (s.external || []).map(carry),
    correspondingAuthor: s.correspondingAuthor, presentingAuthor: s.presentingAuthor,
    selectedStudies: s.selectedStudies || [], targets: s.targets || [],
    stageTemplate: pubType === 'Poster' ? 'Poster' : 'Congress Presentation',
    sourcePub: { id: src.id, recordId: src.record_id, title: src.title },
    audit: [{
      action: 'Record Created', participants: req.user.name, start: on, completed: on, result: 'Draft', active: false,
      comment: label + ' for ' + src.record_id + '. Needs its own author review and approval (AB9); the abstract\u2019s approval doesn\u2019t carry over.',
    }],
  };
  const recordId = nextRecordId(pubType, data.product);
  const r = db.prepare(`INSERT INTO pp_publications (record_id, title, pub_type, product, status, owner, summary, data, created_by)
    VALUES (?, ?, ?, ?, 'Active', ?, '{}', ?, ?)`).run(recordId, title, pubType, data.product, req.user.name || null, JSON.stringify(data), req.user.id || null);
  s.audit = (s.audit || []).concat([{ action: label + ' Record Created', participants: req.user.name, start: on, completed: on, result: recordId, active: false, comment: title }]);
  db.prepare("UPDATE pp_publications SET data = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(s), src.id);
  res.json(getListRow(r.lastInsertRowid));
});

// ---- A reviewer's own response ------------------------------------------------------------
// Whoever is on the open review round answers for themselves: { decision: approve | changes |
// reject, comment, on (m/d/yyyy), stamp }. It saves at once (no form Save, whatever their role),
// is logged on the audit trail and tells the owner in PubPro.
const DECISIONS = { approve: 'Approved', changes: 'Changes Requested', reject: 'Not Approved' };
router.post('/:id/review-response', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!row || !canSee(req, row)) return res.status(404).json({ error: 'Publication not found' });
  const decision = String(req.body.decision || '');
  if (!DECISIONS[decision]) return res.status(400).json({ error: 'Choose Approved, Changes Requested or Not Approved.' });
  const data = parse(row.data, {});
  if (data.cancelled || row.status === 'Cancelled') return res.status(400).json({ error: 'This publication is cancelled.' });
  const round = (data.rounds || []).find(r => r.status === 'open');
  const me = norm(req.user.name);
  const mine = round && (round.reviewers || []).find(v => norm(v.name) === me);
  if (!mine) return res.status(403).json({ error: round ? 'You aren\u2019t a reviewer on the open round.' : 'There\u2019s no review round open. It may have just been closed.' });
  const d = new Date();
  const on = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(req.body.on || '') ? req.body.on : (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
  const stamp = /^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}\s?[AP]M$/i.test(req.body.stamp || '') ? req.body.stamp : on;
  const comment = String(req.body.comment || '').trim().slice(0, 4000);
  const changed = !!mine.decision && mine.decision !== 'pending';
  Object.assign(mine, { decision, comment, on, ooo: '' });
  data.audit = (data.audit || []).concat([{
    action: 'Review Response \u2014 ' + round.type + ' (Round ' + round.num + ')', participants: req.user.name,
    start: stamp, completed: on, result: DECISIONS[decision], active: false,
    comment: [changed ? 'Changed their response' : '', comment].filter(Boolean).join(' \u00b7 '),
  }]);
  db.prepare("UPDATE pp_publications SET data = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(data), row.id);
  if (row.owner && norm(row.owner) !== me) {
    db.prepare(`INSERT INTO pp_notifications (recipient, sender, pub_id, record_id, kind, title, body, tab)
      VALUES (?, ?, ?, ?, 'response', ?, ?, 'reviewers')`)
      .run(row.owner, req.user.name, row.id, row.record_id, req.user.name + ' responded: ' + DECISIONS[decision], round.type + ' \u00b7 ' + row.title + ' (' + row.record_id + ')');
  }
  res.json({ rounds: data.rounds, audit: data.audit });
});

// ---- The publication document: live co-editing -------------------------------------------
// A light stand-in for real co-authoring (the product would use Office 365): the editor autosaves
// every second or so with the version it started from, and polls /presence every ~2 seconds for
// who else is in the document and for newer versions. A save based on an older version gets a 409
// with the latest document; the client merges its edits onto it and saves again.

const docOut = d => ({
  pubDoc: d.pubDoc, pubDocMarkup: doc.markupOf(d), pubDocText: d.pubDocText || '',
  pubDocTrack: d.pubDocTrack !== false, pubDocVersion: d.pubDocVersion || 0, audit: d.audit || [],
  draftStartedAt: d.draftStartedAt || null,
});

// Who has each document open: pubId -> Map(userId -> { name, uid, section, editing, at }).
const presence = new Map();
const PRESENCE_TTL_MS = 15000;
function activeViewers(pubId) {
  const room = presence.get(String(pubId));
  if (!room) return [];
  const now = Date.now();
  for (const [k, v] of room) if (now - v.at > PRESENCE_TTL_MS) room.delete(k);
  return [...room.values()];
}

/**
 * Heartbeat from an open document: { section, editing, knownVersion, leaving }. Answers with the
 * other people in the document and, when the saved version is newer than knownVersion, the document.
 */
router.post('/:id/document/presence', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT id, data, product FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!existing || !canSee(req, existing)) return res.status(404).json({ error: 'Publication not found' });
  const key = String(existing.id);
  if (!presence.has(key)) presence.set(key, new Map());
  const room = presence.get(key);
  if (req.body.leaving) room.delete(String(req.user.id));
  else {
    room.set(String(req.user.id), {
      name: req.user.name, uid: req.user.id, at: Date.now(),
      section: String(req.body.section || '').slice(0, 80), editing: !!req.body.editing,
    });
  }
  const data = parse(existing.data, {});
  const version = data.pubDocVersion || 0;
  const others = activeViewers(key).filter(v => String(v.uid) !== String(req.user.id))
    .map(({ name, uid, section, editing }) => ({ name, uid, section, editing }));
  const newer = req.body.knownVersion != null && Number(req.body.knownVersion) !== version;
  res.json({ viewers: others, version, document: newer ? docOut(data) : undefined });
});

// Autosaves arrive every second or so: one audit entry per person per editing session (30 min).
const SESSION_MS = 30 * 60 * 1000;

/**
 * Saves the publication document: { markup, track, audit, baseVersion }. markup is the full list
 * of segments (text plus tracked insertions/deletions); the server derives the plain text and
 * checks the change against the user's permissions (docMarkup.checkEdit).
 * External authors (doc.edit is fixed on their role) may only edit publications that list them.
 */
router.put('/:id/document', requireAuth, requirePerm('doc.edit'), (req, res) => {
  const existing = db.prepare('SELECT id, data, product, pub_type FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!existing || !canSee(req, existing)) return res.status(404).json({ error: 'Publication not found' });
  if (!can(req, 'doc.edit', existing.product)) return res.status(403).json({ error: outOfScope(req, 'doc.edit', existing.product) });
  const data = parse(existing.data, {});
  if (data.cancelled) return res.status(400).json({ error: 'This publication is cancelled. Reinstate it to change the document.' });
  const version = data.pubDocVersion || 0;
  if (req.body.baseVersion != null && Number(req.body.baseVersion) !== version) {
    return res.status(409).json({ error: 'Someone else changed the document. Merging their changes\u2026', document: docOut(data) });
  }
  const next = doc.clean(req.body.markup);
  if (!next) return res.status(400).json({ error: 'Nothing to save.' });
  if (next.reduce((n, x) => n + x.t.length, 0) > doc.MAX_DOC_CHARS) return res.status(400).json({ error: 'The document is too long to save here.' });
  const canReview = can(req, 'doc.review', existing.product);
  const problem = doc.checkEdit(doc.markupOf(data), next, req.user, canReview);
  if (problem) return res.status(403).json({ error: problem });
  data.pubDocMarkup = next;
  data.pubDocText = doc.visibleText(next);
  data.pubDocVersion = version + 1;
  if (canReview && typeof req.body.track === 'boolean') data.pubDocTrack = req.body.track;
  if (!data.pubDoc) {
    const started = { ...data, pubDoc: 'new' };
    const blocked = gates.draftingGate(data, started, existing.pub_type);
    if (blocked) return res.status(400).json({ error: blocked });
    Object.assign(data, started);
  }
  const a = req.body.audit;
  if (a && typeof a === 'object' && a.action) {
    const str = v => String(v == null ? '' : v).slice(0, 500);
    const entry = {
      action: str(a.action), participants: req.user.name, start: str(a.start), completed: str(a.completed),
      result: str(a.result), active: false, comment: str(a.comment), at: new Date().toISOString(),
    };
    const log = (data.audit || []).slice();
    // Look back through the run of document saves at the end of the log for this person’s entry
    // from the same session (people editing together interleave), and update it in place.
    let k = -1;
    if (entry.action === 'Publication Document Saved') {
      for (let i = log.length - 1; i >= 0 && log[i].action === entry.action; i -= 1) {
        if (log[i].participants === entry.participants && log[i].at && Date.now() - Date.parse(log[i].at) < SESSION_MS) { k = i; break; }
      }
    }
    if (k >= 0) log[k] = { ...log[k], comment: entry.comment, completed: entry.completed, at: entry.at };
    else log.push(entry);
    data.audit = log;
  }
  db.prepare("UPDATE pp_publications SET data = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(data), existing.id);
  res.json(docOut(data));
});

router.delete('/:id', requireAuth, blockAuthors, requirePerm('pubs.edit'), (req, res) => {
  const row = db.prepare('SELECT product FROM pp_publications WHERE id = ?').get(req.params.id);
  if (row && !can(req, 'pubs.edit', row.product)) return res.status(403).json({ error: outOfScope(req, 'pubs.edit', row.product) });
  const r = db.prepare('DELETE FROM pp_publications WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Publication not found' });
  res.json({ success: true });
});

// One-time starter records (server/seeds/demo-publications.json) so the dashboards have data to
// show. Runs once per database: the key goes in app_seeds, so deleting the records keeps them gone.
const DEMO_SEED_KEY = 'demo-publications-2026-09';
db.exec("CREATE TABLE IF NOT EXISTS app_seeds (key TEXT PRIMARY KEY, ran_at TEXT DEFAULT (datetime('now')))");
if (!db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get(DEMO_SEED_KEY)) {
  const demo = require('../seeds/demo-publications.json');
  const insert = db.prepare(`INSERT INTO pp_publications (record_id, title, pub_type, product, status, owner, summary, data, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`);
  for (const r of demo) {
    insert.run(nextRecordId(r.pub_type, r.product), r.title, r.pub_type, r.product, r.status, r.owner,
      JSON.stringify(r.summary), JSON.stringify(r.data));
  }
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run(DEMO_SEED_KEY);
  console.log('Added ' + demo.length + ' demo publications.');
}

// Two accepted (published) demo publications for the Publication Library, once per database.
const LIBRARY_SEED_KEY = 'library-demo-2026-09';
if (!db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get(LIBRARY_SEED_KEY)) {
  const accepted = { status: 'accepted', sent: '5/4/2026', on: '5/6/2026' };
  const ext = (id, name, display) => ({ id, selected: true, corr: 'optional', name, display, invite: accepted });
  const int = (id, name) => ({ id, selected: true, corr: id === 1 ? 'required' : 'optional', name, display: name, invite: accepted });
  const records = [
    {
      title: 'CLARITY-CAD Primary Results', pubType: 'Manuscript', product: 'Biologix (All)',
      data: {
        pubType: 'Manuscript', product: 'Biologix (All)', subType: '', outcomeStatus: 'Accepted', selectedStudies: ['100220'],
        targets: ['Journal of the American College of Cardiology'],
        fields: { abbrevTitle: 'CLARITY-CAD Primary Results', pubTitle: 'Biologix in Non-Obstructive Coronary Artery Disease: Primary Results of the Phase 3 CLARITY-CAD Trial', therapeuticArea: 'Cardiovascular & Metabolism', dateSubmitted: '3/2/2026', statusDate: '6/15/2026' },
        internal: [int(1, 'Richa Garg'), int(2, 'Greg Vogel')],
        external: [ext(1, 'Helen Marsh-Mayo Clinic', 'Helen Marsh'), ext(2, 'Steve Altschuler-UCLA School of Medicine', 'Steve Altschuler')],
        pubDoc: 'new',
        pubDocText: 'Background\nPatients with angina and non-obstructive coronary artery disease have few evidence-based treatment options.\n\nMethods\nIn CLARITY-CAD, 1,204 adults were randomized 1:1 to Biologix or placebo for 52 weeks. The primary endpoint was change in Seattle Angina Questionnaire summary score.\n\nResults\nBiologix improved the summary score by 9.4 points versus 3.1 with placebo (difference 6.3; 95% CI 4.1 to 8.5; p<0.001). Serious adverse events were similar between groups.\n\nConclusions\nBiologix improved angina-related quality of life in patients with non-obstructive coronary artery disease.',
        audit: [],
      },
    },
    {
      title: 'DXN-301 Interim Motor Function', pubType: 'Abstract', product: 'Daxafont (DMD)',
      data: {
        pubType: 'Abstract', product: 'Daxafont (DMD)', subType: 'Poster', outcomeStatus: 'Accepted', selectedStudies: ['100230'],
        targets: ['World Muscle Society Congress'],
        fields: { abbrevTitle: 'DXN-301 Interim Motor Function', pubTitle: 'Daxafont and Motor Function in Ambulatory Boys with Duchenne Muscular Dystrophy: DXN-301 Interim Analysis', therapeuticArea: 'Neuroscience', dateSubmitted: '5/20/2026', statusDate: '9/10/2026' },
        internal: [int(1, 'Christy PM')],
        external: [ext(1, 'Kenji Sato-University of Tokyo', 'Kenji Sato')],
        pubDoc: 'new',
        pubDocText: 'Background\nDaxafont is an investigational exon-skipping therapy for Duchenne muscular dystrophy (DMD).\n\nMethods\nDXN-301 randomized 96 ambulatory boys aged 4 to 7 years to Daxafont or placebo. This interim analysis reports 48-week change in North Star Ambulatory Assessment (NSAA).\n\nResults\nNSAA declined by 0.8 points with Daxafont versus 3.2 with placebo (p=0.004). Infusion reactions were mild.\n\nConclusions\nDaxafont slowed motor function decline over 48 weeks.',
        audit: [],
      },
    },
  ];
  const insert = db.prepare(`INSERT INTO pp_publications (record_id, title, pub_type, product, status, owner, summary, data, created_by)
    VALUES (?, ?, ?, ?, 'Active', 'Kristina Hill', '{}', ?, NULL)`);
  records.forEach(r => insert.run(nextRecordId(r.pubType, r.product), r.title, r.pubType, r.product, JSON.stringify(r.data)));
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run(LIBRARY_SEED_KEY);
  console.log('Added ' + records.length + ' published publications for the library.');
}

module.exports = router;
