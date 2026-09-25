const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth: authOnly, blockAuthors } = require('../auth');

const requireAuth = [authOnly, blockAuthors];
const { productCode, yearCode, nextSequence } = require('../recordIds');

// Plan IDs follow PLAN-<yy>-<product>-<seq>, e.g. PLAN-26-DAX-002.
const STATUSES = ['Draft', 'Active', 'Complete', 'Cancelled'];

// The design's example plan, seeded once so its links open a real record.
const SAMPLE_PLAN_ID = 'PLAN-26-DAX-002';

function nextPlanId(product) {
  const prefix = `PLAN-${yearCode()}-${productCode(product)}-`;
  const rows = db.prepare('SELECT plan_id FROM pp_plans WHERE plan_id LIKE ?').all(prefix + '%');
  return prefix + nextSequence(rows.map(r => r.plan_id), prefix);
}

const LIST_COLUMNS = 'id, plan_id, title, product, status, owner, summary, created_at, updated_at';

const parse = (text, fallback) => {
  try { return JSON.parse(text || ''); } catch { return fallback; }
};
const listRow = row => (row ? { ...row, summary: parse(row.summary, {}) } : row);
const getListRow = id => listRow(db.prepare(`SELECT ${LIST_COLUMNS} FROM pp_plans WHERE id = ?`).get(id));

function readBody(body) {
  return {
    title: String(body.title || '').trim(),
    product: body.product || null,
    status: STATUSES.includes(body.status) ? body.status : 'Draft',
    summary: JSON.stringify(body.summary || {}),
    data: JSON.stringify(body.data || {}),
  };
}

// ?include=data adds each record's full data (the dashboard and reports chart from it).
router.get('/', requireAuth, (req, res) => {
  const full = req.query.include === 'data';
  const rows = db.prepare(`SELECT ${LIST_COLUMNS}${full ? ', data' : ''} FROM pp_plans ORDER BY updated_at DESC, id DESC`).all();
  res.json(rows.map(r => (full ? { ...listRow(r), data: parse(r.data, {}) } : listRow(r))));
});

router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM pp_plans WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Publication plan not found' });
  res.json({ ...listRow(row), data: parse(row.data, {}) });
});

router.post('/', requireAuth, (req, res) => {
  const { title, product, status, summary, data } = readBody(req.body);
  if (!title) return res.status(400).json({ error: 'A plan title is required to save the plan.' });
  const planId = nextPlanId(product);
  const r = db.prepare(`INSERT INTO pp_plans (plan_id, title, product, status, owner, summary, data, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(planId, title, product, status, req.user.name || null, summary, data, req.user.id || null);
  res.json(getListRow(r.lastInsertRowid));
});

// Returns the sample plan, creating it from the posted data the first time.
router.post('/sample', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT id FROM pp_plans WHERE plan_id = ?').get(SAMPLE_PLAN_ID);
  if (existing) return res.json(getListRow(existing.id));
  const { title, product, status, summary, data } = readBody(req.body);
  if (!title) return res.status(400).json({ error: 'The sample plan needs a title.' });
  try {
    const r = db.prepare(`INSERT INTO pp_plans (plan_id, title, product, status, owner, summary, data, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(SAMPLE_PLAN_ID, title, product, status, 'Kristina Hill', summary, data, req.user.id || null);
    res.json(getListRow(r.lastInsertRowid));
  } catch (e) {
    // Two tabs (or a double-mounted page) raced to seed it; return the one that won.
    const won = db.prepare('SELECT id FROM pp_plans WHERE plan_id = ?').get(SAMPLE_PLAN_ID);
    if (!won) throw e;
    res.json(getListRow(won.id));
  }
});

// The plan ID is fixed once the plan exists.
router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT id FROM pp_plans WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Publication plan not found' });
  const { title, product, status, summary, data } = readBody(req.body);
  if (!title) return res.status(400).json({ error: 'A plan title is required to save the plan.' });
  db.prepare(`UPDATE pp_plans SET title = ?, product = ?, status = ?, summary = ?, data = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(title, product, status, summary, data, req.params.id);
  res.json(getListRow(req.params.id));
});

router.delete('/:id', requireAuth, (req, res) => {
  const r = db.prepare('DELETE FROM pp_plans WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Publication plan not found' });
  res.json({ success: true });
});

module.exports = router;
