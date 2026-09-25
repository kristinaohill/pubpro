const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

// Get pub types
router.get('/pub-types', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM pub_types').all());
});

// Templates
router.get('/', requireAuth, (req, res) => {
  const { client_id } = req.query;
  let q = 'SELECT wt.*, c.name as client_name, pt.name as pub_type_name FROM workflow_templates wt JOIN clients c ON c.id = wt.client_id JOIN pub_types pt ON pt.id = wt.pub_type_id';
  const params = [];
  if (client_id) { q += ' WHERE wt.client_id = ?'; params.push(client_id); }
  res.json(db.prepare(q).all(...params));
});

router.post('/', requireAdmin, (req, res) => {
  const { client_id, pub_type_id, name } = req.body;
  if (!client_id || !pub_type_id || !name) return res.status(400).json({ error: 'Missing fields' });
  const r = db.prepare('INSERT INTO workflow_templates (client_id, pub_type_id, name) VALUES (?,?,?)').run(client_id, pub_type_id, name);
  res.json({ id: r.lastInsertRowid, client_id, pub_type_id, name });
});

router.get('/:id', requireAuth, (req, res) => {
  const tmpl = db.prepare('SELECT wt.*, c.name as client_name, pt.name as pub_type_name FROM workflow_templates wt JOIN clients c ON c.id = wt.client_id JOIN pub_types pt ON pt.id = wt.pub_type_id WHERE wt.id = ?').get(req.params.id);
  if (!tmpl) return res.status(404).json({ error: 'Not found' });
  const stages = db.prepare('SELECT * FROM template_stages WHERE template_id = ? ORDER BY order_index').all(req.params.id);
  for (const stage of stages) {
    stage.items = db.prepare('SELECT * FROM template_items WHERE stage_id = ? ORDER BY order_index').all(stage.id);
  }
  tmpl.stages = stages;
  res.json(tmpl);
});

router.put('/:id', requireAdmin, (req, res) => {
  const { name } = req.body;
  db.prepare('UPDATE workflow_templates SET name = ? WHERE id = ?').run(name, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM workflow_templates WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Stages
router.get('/:id/stages', requireAuth, (req, res) => {
  const stages = db.prepare('SELECT * FROM template_stages WHERE template_id = ? ORDER BY order_index').all(req.params.id);
  for (const stage of stages) {
    stage.items = db.prepare('SELECT * FROM template_items WHERE stage_id = ? ORDER BY order_index').all(stage.id);
  }
  res.json(stages);
});

router.post('/:id/stages', requireAdmin, (req, res) => {
  const { name, order_index } = req.body;
  const r = db.prepare('INSERT INTO template_stages (template_id, name, order_index) VALUES (?,?,?)').run(req.params.id, name, order_index ?? 0);
  res.json({ id: r.lastInsertRowid, template_id: parseInt(req.params.id), name, order_index: order_index ?? 0 });
});

router.put('/stages/:id', requireAdmin, (req, res) => {
  const { name, order_index } = req.body;
  db.prepare('UPDATE template_stages SET name = ?, order_index = ? WHERE id = ?').run(name, order_index, req.params.id);
  res.json({ success: true });
});

router.delete('/stages/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM template_stages WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Items
router.get('/stages/:id/items', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM template_items WHERE stage_id = ? ORDER BY order_index').all(req.params.id));
});

router.post('/stages/:id/items', requireAdmin, (req, res) => {
  const { name, type, order_index, default_duration_days } = req.body;
  const r = db.prepare('INSERT INTO template_items (stage_id, name, type, order_index, default_duration_days) VALUES (?,?,?,?,?)').run(
    req.params.id, name, type || 'step', order_index ?? 0, default_duration_days ?? 7
  );
  res.json({ id: r.lastInsertRowid });
});

router.put('/items/:id', requireAdmin, (req, res) => {
  const { name, type, order_index, default_duration_days } = req.body;
  db.prepare('UPDATE template_items SET name = ?, type = ?, order_index = ?, default_duration_days = ? WHERE id = ?').run(
    name, type, order_index, default_duration_days, req.params.id
  );
  res.json({ success: true });
});

router.delete('/items/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM template_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
