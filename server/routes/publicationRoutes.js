const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../auth');

// Helper: copy template into a publication
function copyTemplateToPublication(pubId, clientId, pubTypeId) {
  const template = db.prepare('SELECT * FROM workflow_templates WHERE client_id = ? AND pub_type_id = ?').get(clientId, pubTypeId);
  if (!template) return;
  const stages = db.prepare('SELECT * FROM template_stages WHERE template_id = ? ORDER BY order_index').all(template.id);
  const insertStage = db.prepare('INSERT INTO pub_stages (publication_id, name, order_index) VALUES (?,?,?)');
  const insertItem = db.prepare('INSERT INTO pub_items (pub_stage_id, name, type, order_index, start_date, end_date, status) VALUES (?,?,?,?,?,?,?)');
  const today = new Date();

  let runningDate = new Date(today);
  for (const stage of stages) {
    const ps = insertStage.run(pubId, stage.name, stage.order_index);
    const items = db.prepare('SELECT * FROM template_items WHERE stage_id = ? ORDER BY order_index').all(stage.id);
    for (const item of items) {
      const start = runningDate.toISOString().slice(0, 10);
      const endDate = new Date(runningDate);
      endDate.setDate(endDate.getDate() + item.default_duration_days);
      const end = endDate.toISOString().slice(0, 10);
      insertItem.run(ps.lastInsertRowid, item.name, item.type, item.order_index, start, end, 'not_started');
      runningDate = new Date(endDate);
    }
  }
}

router.get('/', requireAuth, (req, res) => {
  const { plan_id, client_id } = req.query;
  let q = `SELECT p.*, pt.name as pub_type_name, c.name as client_name, pp.name as plan_name
           FROM publications p
           JOIN pub_types pt ON pt.id = p.pub_type_id
           JOIN clients c ON c.id = p.client_id
           LEFT JOIN publication_plans pp ON pp.id = p.plan_id`;
  const conds = [];
  const params = [];
  if (plan_id) { conds.push('p.plan_id = ?'); params.push(plan_id); }
  if (client_id) { conds.push('p.client_id = ?'); params.push(client_id); }
  if (req.user.role !== 'admin' && req.user.client_id) {
    conds.push('p.client_id = ?');
    params.push(req.user.client_id);
  }
  if (conds.length) q += ' WHERE ' + conds.join(' AND ');
  q += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/', requireAuth, (req, res) => {
  const { plan_id, client_id, pub_type_id, title, authors, target_journal_or_congress, status } = req.body;
  if (!client_id || !pub_type_id || !title) return res.status(400).json({ error: 'Missing required fields' });
  const r = db.prepare('INSERT INTO publications (plan_id, client_id, pub_type_id, title, authors, target_journal_or_congress, status) VALUES (?,?,?,?,?,?,?)').run(
    plan_id || null, client_id, pub_type_id, title, authors || null, target_journal_or_congress || null, status || 'draft'
  );
  copyTemplateToPublication(r.lastInsertRowid, client_id, pub_type_id);
  res.json({ id: r.lastInsertRowid });
});

router.get('/:id', requireAuth, (req, res) => {
  const pub = db.prepare(`SELECT p.*, pt.name as pub_type_name, c.name as client_name, pp.name as plan_name
    FROM publications p
    JOIN pub_types pt ON pt.id = p.pub_type_id
    JOIN clients c ON c.id = p.client_id
    LEFT JOIN publication_plans pp ON pp.id = p.plan_id
    WHERE p.id = ?`).get(req.params.id);
  if (!pub) return res.status(404).json({ error: 'Not found' });
  res.json(pub);
});

router.put('/:id', requireAuth, (req, res) => {
  const { title, authors, target_journal_or_congress, status, plan_id } = req.body;
  db.prepare('UPDATE publications SET title=?, authors=?, target_journal_or_congress=?, status=?, plan_id=? WHERE id=?').run(
    title, authors, target_journal_or_congress, status, plan_id || null, req.params.id
  );
  res.json({ success: true });
});

// Timeline: stages with items
router.get('/:id/timeline', requireAuth, (req, res) => {
  const stages = db.prepare('SELECT * FROM pub_stages WHERE publication_id = ? ORDER BY order_index').all(req.params.id);
  for (const stage of stages) {
    stage.items = db.prepare(`SELECT pi.*, u.name as assignee_name FROM pub_items pi LEFT JOIN users u ON u.id = pi.assignee_user_id WHERE pi.pub_stage_id = ? ORDER BY pi.order_index`).all(stage.id);
  }
  res.json(stages);
});

// Master gantt: all publications with their timeline items
router.get('/master/gantt', requireAuth, (req, res) => {
  const { client_id, plan_id } = req.query;
  const conds = [];
  const params = [];
  if (client_id) { conds.push('p.client_id = ?'); params.push(client_id); }
  if (plan_id) { conds.push('p.plan_id = ?'); params.push(plan_id); }
  if (req.user.role !== 'admin' && req.user.client_id) {
    conds.push('p.client_id = ?'); params.push(req.user.client_id);
  }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const pubs = db.prepare(`
    SELECT p.id, p.title, p.status, pt.name as pub_type_name, c.name as client_name, pp.name as plan_name
    FROM publications p
    JOIN pub_types pt ON pt.id = p.pub_type_id
    JOIN clients c ON c.id = p.client_id
    LEFT JOIN publication_plans pp ON pp.id = p.plan_id
    ${where}
    ORDER BY c.name, pp.name, p.title
  `).all(...params);

  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(); soon.setDate(soon.getDate() + 7);
  const soonStr = soon.toISOString().slice(0, 10);

  for (const pub of pubs) {
    const stages = db.prepare('SELECT * FROM pub_stages WHERE publication_id = ? ORDER BY order_index').all(pub.id);
    for (const stage of stages) {
      stage.items = db.prepare(`
        SELECT pi.*, u.name as assignee_name FROM pub_items pi
        LEFT JOIN users u ON u.id = pi.assignee_user_id
        WHERE pi.pub_stage_id = ? ORDER BY pi.order_index
      `).all(stage.id);
      for (const item of stage.items) {
        item.is_overdue = item.status !== 'complete' && item.end_date && item.end_date < today;
        item.is_due_soon = item.status !== 'complete' && item.end_date && item.end_date >= today && item.end_date <= soonStr;
      }
    }
    pub.stages = stages;
    const allItems = stages.flatMap(s => s.items);
    pub.overdue_count = allItems.filter(i => i.is_overdue).length;
    pub.due_soon_count = allItems.filter(i => i.is_due_soon).length;
  }

  res.json(pubs);
});

module.exports = router;
