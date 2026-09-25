const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../auth');

router.put('/:id', requireAuth, (req, res) => {
  const { name, start_date, end_date, status, assignee_user_id, type, order_index, percent_complete } = req.body;
  const item = db.prepare('SELECT * FROM pub_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE pub_items SET name=?, start_date=?, end_date=?, status=?, assignee_user_id=?, type=?, order_index=?, percent_complete=? WHERE id=?').run(
    name ?? item.name,
    start_date ?? item.start_date,
    end_date ?? item.end_date,
    status ?? item.status,
    assignee_user_id !== undefined ? assignee_user_id : item.assignee_user_id,
    type ?? item.type,
    order_index ?? item.order_index,
    percent_complete !== undefined ? percent_complete : (item.percent_complete ?? 0),
    req.params.id
  );
  res.json({ success: true });
});

module.exports = router;
