const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, blockAuthors } = require('../auth');
const { ensureAuthorLogin, removeAuthorLogin } = require('../authorLogins');

const ownProfileOnly = (req, res, next) => (req.user.role === 'author' && String(req.user.author_profile_id) !== String(req.params.id)
  ? res.status(403).json({ error: 'Authors can only update their own profile' }) : next());
const { yearCode, nextSequence } = require('../recordIds');

// Author IDs follow EA-<yy>-<seq>, e.g. EA-26-004.
const STATUSES = ['Active', 'Inactive'];

// The design's example author, seeded once so its links open a real record.
const SAMPLE_AUTHOR_ID = 'EA-24-001';

function nextAuthorId() {
  const prefix = `EA-${yearCode()}-`;
  const rows = db.prepare('SELECT author_id FROM pp_authors WHERE author_id LIKE ?').all(prefix + '%');
  return prefix + nextSequence(rows.map(r => r.author_id), prefix);
}

const LIST_COLUMNS = 'id, author_id, name, email, status, owner, summary, created_at, updated_at';

const parse = (text, fallback) => {
  try { return JSON.parse(text || ''); } catch { return fallback; }
};
const listRow = row => (row ? { ...row, summary: parse(row.summary, {}) } : row);
const getListRow = id => listRow(db.prepare(`SELECT ${LIST_COLUMNS} FROM pp_authors WHERE id = ?`).get(id));

function readBody(body) {
  return {
    name: String(body.name || '').trim(),
    email: String(body.email || '').trim() || null,
    status: STATUSES.includes(body.status) ? body.status : 'Active',
    summary: JSON.stringify(body.summary || {}),
    data: JSON.stringify(body.data || {}),
  };
}

// ?include=data adds each record's full data.
router.get('/', requireAuth, (req, res) => {
  const full = req.query.include === 'data';
  let rows = db.prepare(`SELECT ${LIST_COLUMNS}${full ? ', data' : ''} FROM pp_authors ORDER BY name COLLATE NOCASE, id`).all();
  // An external author only sees their own profile.
  if (req.user.role === 'author') rows = rows.filter(r => String(r.id) === String(req.user.author_profile_id));
  res.json(rows.map(r => (full ? { ...listRow(r), data: parse(r.data, {}) } : listRow(r))));
});

router.get('/:id', requireAuth, ownProfileOnly, (req, res) => {
  const row = db.prepare('SELECT * FROM pp_authors WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'External author not found' });
  res.json({ ...listRow(row), data: parse(row.data, {}) });
});

router.post('/', requireAuth, blockAuthors, (req, res) => {
  const { name, email, status, summary, data } = readBody(req.body);
  if (!name) return res.status(400).json({ error: 'A first and last name are required to save the author.' });
  const r = db.prepare(`INSERT INTO pp_authors (author_id, name, email, status, owner, summary, data, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(nextAuthorId(), name, email, status, req.user.name || null, summary, data, req.user.id || null);
  ensureAuthorLogin({ id: r.lastInsertRowid, name, email });
  res.json(getListRow(r.lastInsertRowid));
});

// Returns the sample author, creating it from the posted data the first time.
router.post('/sample', requireAuth, blockAuthors, (req, res) => {
  const existing = db.prepare('SELECT id FROM pp_authors WHERE author_id = ?').get(SAMPLE_AUTHOR_ID);
  if (existing) return res.json(getListRow(existing.id));
  const { name, email, status, summary, data } = readBody(req.body);
  if (!name) return res.status(400).json({ error: 'The sample author needs a name.' });
  try {
    const r = db.prepare(`INSERT INTO pp_authors (author_id, name, email, status, owner, summary, data, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, '2024-09-06 16:20:00')`).run(SAMPLE_AUTHOR_ID, name, email, status, 'Joe Submitter', summary, data, req.user.id || null);
    ensureAuthorLogin({ id: r.lastInsertRowid, name, email });
    res.json(getListRow(r.lastInsertRowid));
  } catch (e) {
    // Two tabs (or a double-mounted page) raced to seed it; return the one that won.
    const won = db.prepare('SELECT id FROM pp_authors WHERE author_id = ?').get(SAMPLE_AUTHOR_ID);
    if (!won) throw e;
    res.json(getListRow(won.id));
  }
});

router.put('/:id', requireAuth, ownProfileOnly, (req, res) => {
  const existing = db.prepare('SELECT id FROM pp_authors WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'External author not found' });
  const { name, email, status, summary, data } = readBody(req.body);
  if (!name) return res.status(400).json({ error: 'A first and last name are required to save the author.' });
  db.prepare(`UPDATE pp_authors SET name = ?, email = ?, status = ?, summary = ?, data = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(name, email, status, summary, data, req.params.id);
  ensureAuthorLogin({ id: Number(req.params.id), name, email });
  res.json(getListRow(req.params.id));
});

router.delete('/:id', requireAuth, blockAuthors, (req, res) => {
  const r = db.prepare('DELETE FROM pp_authors WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'External author not found' });
  removeAuthorLogin(Number(req.params.id));
  res.json({ success: true });
});

module.exports = router;
