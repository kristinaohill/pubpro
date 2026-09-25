const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

router.get('/', requireAuth, (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY name').all();
  res.json(clients);
});

router.post('/', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const r = db.prepare('INSERT INTO clients (name) VALUES (?)').run(name);
  res.json({ id: r.lastInsertRowid, name });
});

router.get('/:id', requireAuth, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  res.json(client);
});

router.put('/:id', requireAdmin, (req, res) => {
  const { name } = req.body;
  db.prepare('UPDATE clients SET name = ? WHERE id = ?').run(name, req.params.id);
  res.json({ success: true });
});

module.exports = router;
