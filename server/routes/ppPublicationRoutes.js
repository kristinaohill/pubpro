const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requirePerm, can, blockAuthors } = require('../auth');
const doc = require('../docMarkup');
const { productCode, yearCode, nextSequence } = require('../recordIds');

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
const authorCanSee = (req, dataText) => req.user.role !== 'author' || involves(dataText, req.user.name);

const LIST_COLUMNS = 'id, record_id, title, pub_type, product, status, owner, summary, created_at, updated_at';

const parse = (text, fallback) => {
  try { return JSON.parse(text || ''); } catch { return fallback; }
};
const listRow = row => (row ? { ...row, summary: parse(row.summary, {}) } : row);
const getListRow = id => listRow(db.prepare(`SELECT ${LIST_COLUMNS} FROM pp_publications WHERE id = ?`).get(id));

// The document's text and tracked changes are only written through PUT /:id/document, so a form
// save (or one from a dashboard) never overwrites someone's document edits with a stale copy.
const DOC_KEYS = ['pubDocText', 'pubDocMarkup', 'pubDocTrack'];
function keepDocument(dataJson, existingData) {
  const next = parse(dataJson, {});
  const prev = existingData || {};
  DOC_KEYS.forEach(k => { if (k in prev) next[k] = prev[k]; else delete next[k]; });
  return JSON.stringify(next);
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
    .filter(r => authorCanSee(req, r.data));
  res.json(rows.map(({ data, ...r }) => (full ? { ...listRow(r), data: parse(data, {}) } : listRow(r))));
});

router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!row || !authorCanSee(req, row.data)) return res.status(404).json({ error: 'Publication not found' });
  res.json({ ...listRow(row), data: parse(row.data, {}) });
});

router.post('/', requireAuth, blockAuthors, requirePerm('pubs.edit'), (req, res) => {
  const { title, pubType, product, status, summary } = readBody(req.body);
  const data = keepDocument(readBody(req.body).data, {});
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
  const existing = db.prepare('SELECT id, data FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!existing || !authorCanSee(req, existing.data)) return res.status(404).json({ error: 'Publication not found' });
  // External authors update their own invitation and review responses (their dashboard); staff need pubs.edit.
  if (req.user.role !== 'author' && !can(req, 'pubs.edit')) return res.status(403).json({ error: 'Your role does not allow editing publications.' });
  const { title, product, status, summary } = readBody(req.body);
  if (!title) return res.status(400).json({ error: 'A title is required to save the publication.' });
  const prevData = parse(existing.data, {});
  const data = keepDocument(readBody(req.body).data, prevData);
  if (!!prevData.cancelled !== !!parse(data, {}).cancelled && !can(req, 'pubs.cancel')) {
    return res.status(403).json({ error: 'Your role does not allow cancelling or reinstating publications.' });
  }
  db.prepare(`UPDATE pp_publications SET title = ?, product = ?, status = ?, summary = ?, data = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(title, product, status, summary, data, req.params.id);
  res.json(getListRow(req.params.id));
});

/**
 * Saves the publication document: { markup, track, audit }. markup is the full list of segments
 * (text plus tracked insertions/deletions); the server derives the plain text from it and checks
 * the change against the user's permissions (docMarkup.checkEdit).
 */
router.put('/:id/document', requireAuth, blockAuthors, requirePerm('doc.edit'), (req, res) => {
  const existing = db.prepare('SELECT id, data FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Publication not found' });
  const data = parse(existing.data, {});
  if (data.cancelled) return res.status(400).json({ error: 'This publication is cancelled. Reinstate it to change the document.' });
  const next = doc.clean(req.body.markup);
  if (!next) return res.status(400).json({ error: 'Nothing to save.' });
  if (next.reduce((n, x) => n + x.t.length, 0) > doc.MAX_DOC_CHARS) return res.status(400).json({ error: 'The document is too long to save here.' });
  const canReview = can(req, 'doc.review');
  const problem = doc.checkEdit(doc.markupOf(data), next, req.user, canReview);
  if (problem) return res.status(403).json({ error: problem });
  data.pubDocMarkup = next;
  data.pubDocText = doc.visibleText(next);
  if (canReview && typeof req.body.track === 'boolean') data.pubDocTrack = req.body.track;
  if (!data.pubDoc) data.pubDoc = 'new';
  const a = req.body.audit;
  if (a && typeof a === 'object' && a.action) {
    const str = v => String(v == null ? '' : v).slice(0, 500);
    data.audit = (data.audit || []).concat([{
      action: str(a.action), participants: req.user.name, start: str(a.start), completed: str(a.completed),
      result: str(a.result), active: false, comment: str(a.comment),
    }]);
  }
  db.prepare("UPDATE pp_publications SET data = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(data), existing.id);
  res.json({ pubDoc: data.pubDoc, pubDocMarkup: data.pubDocMarkup, pubDocText: data.pubDocText, pubDocTrack: data.pubDocTrack !== false, audit: data.audit || [] });
});

router.delete('/:id', requireAuth, blockAuthors, requirePerm('pubs.edit'), (req, res) => {
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

module.exports = router;
