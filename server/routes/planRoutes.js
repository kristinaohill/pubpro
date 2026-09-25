const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../auth');

router.get('/', requireAuth, (req, res) => {
  let q = 'SELECT pp.*, c.name as client_name FROM publication_plans pp JOIN clients c ON c.id = pp.client_id';
  const params = [];
  if (req.user.role !== 'admin' && req.user.client_id) {
    q += ' WHERE pp.client_id = ?';
    params.push(req.user.client_id);
  }
  q += ' ORDER BY pp.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/', requireAuth, (req, res) => {
  const { client_id, name, description } = req.body;
  if (!client_id || !name) return res.status(400).json({ error: 'Missing fields' });
  const r = db.prepare('INSERT INTO publication_plans (client_id, name, description) VALUES (?,?,?)').run(client_id, name, description || null);
  res.json({ id: r.lastInsertRowid, client_id, name, description });
});

router.get('/:id', requireAuth, (req, res) => {
  const plan = db.prepare('SELECT pp.*, c.name as client_name FROM publication_plans pp JOIN clients c ON c.id = pp.client_id WHERE pp.id = ?').get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Not found' });
  res.json(plan);
});

router.put('/:id', requireAuth, (req, res) => {
  const { name, description } = req.body;
  db.prepare('UPDATE publication_plans SET name = ?, description = ? WHERE id = ?').run(name, description, req.params.id);
  res.json({ success: true });
});

module.exports = router;
