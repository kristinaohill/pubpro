const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, blockAuthors } = require('../auth');

const KINDS = ['review_request', 'reminder', 'round_closed', 'invitation', 'cancelled', 'reinstated', 'overdue', 'due_soon', 'response'];
const DUE_SOON_DAYS = 2;

const daysUntil = iso => {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
};
const fmtISO = iso => { const [y, m, d] = iso.split('-').map(Number); return `${m}/${d}/${y}`; };

/**
 * Due-date alerts for the user's own publications: one per step and due date, created the
 * first time they're noticed so they can be read and cleared like any other notification.
 */
function raiseDueAlerts(user) {
  const pubs = db.prepare(`SELECT id, record_id, title, summary FROM pp_publications
    WHERE status != 'Cancelled' AND (created_by = ? OR owner = ?)`).all(user.id || -1, user.name || '');
  const insert = db.prepare(`INSERT OR IGNORE INTO pp_notifications
    (recipient, sender, pub_id, record_id, kind, title, body, tab, dedupe_key) VALUES (?, 'PubPro', ?, ?, ?, ?, ?, 'planning', ?)`);
  for (const p of pubs) {
    let sm = {};
    try { sm = JSON.parse(p.summary || '{}'); } catch { /* ignore */ }
    const n = daysUntil(sm.due);
    if (n == null || !sm.stepName) continue;
    const body = `${p.title} (${p.record_id}) · due ${fmtISO(sm.due)}`;
    if (n < 0) {
      insert.run(user.name, p.id, p.record_id, 'overdue', `${sm.stepName} is overdue`, body, `due:${p.id}:${sm.stepName}:${sm.due}:overdue`);
    } else if (n <= DUE_SOON_DAYS) {
      const when = n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
      insert.run(user.name, p.id, p.record_id, 'due_soon', `${sm.stepName} is due ${when}`, body, `due:${p.id}:${sm.stepName}:${sm.due}:soon`);
    }
  }
}

router.get('/', requireAuth, (req, res) => {
  const box = req.query.box === 'sent' ? 'sent' : 'inbox';
  if (box === 'inbox') raiseDueAlerts(req.user);
  const rows = box === 'sent'
    ? db.prepare(`SELECT * FROM pp_notifications WHERE sender = ? ORDER BY id DESC LIMIT 100`).all(req.user.name || '')
    : db.prepare(`SELECT * FROM pp_notifications WHERE recipient = ? ORDER BY id DESC LIMIT 100`).all(req.user.name || '');
  res.json(rows);
});

// A named person's inbox, for the External Author Dashboard (authors have no app login).
router.get('/for', requireAuth, blockAuthors, (req, res) => {
  const name = String(req.query.name || '').trim();
  if (!name) return res.json([]);
  res.json(db.prepare('SELECT * FROM pp_notifications WHERE recipient = ? ORDER BY id DESC LIMIT 100').all(name));
});

// Marks one of that person's notifications read.
router.post('/for/:id/read', requireAuth, blockAuthors, (req, res) => {
  db.prepare("UPDATE pp_notifications SET read_at = datetime('now') WHERE id = ? AND read_at IS NULL").run(req.params.id);
  res.json({ success: true });
});

router.get('/unread-count', requireAuth, (req, res) => {
  raiseDueAlerts(req.user);
  const r = db.prepare('SELECT COUNT(*) AS c FROM pp_notifications WHERE recipient = ? AND read_at IS NULL').get(req.user.name || '');
  res.json({ count: r.c });
});

// Sends a batch of notifications from the signed-in user.
router.post('/', requireAuth, (req, res) => {
  const list = Array.isArray(req.body.notifications) ? req.body.notifications : [];
  const insert = db.prepare(`INSERT INTO pp_notifications (recipient, sender, pub_id, record_id, kind, title, body, tab)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  let sent = 0;
  for (const n of list) {
    const recipient = String(n.recipient || '').trim();
    const title = String(n.title || '').trim();
    if (!recipient || !title || !KINDS.includes(n.kind)) continue;
    insert.run(recipient, req.user.name || null, n.pub_id || null, n.record_id || null, n.kind, title, n.body || '', n.tab || null);
    sent += 1;
  }
  res.json({ sent });
});

router.post('/read-all', requireAuth, (req, res) => {
  db.prepare(`UPDATE pp_notifications SET read_at = datetime('now') WHERE recipient = ? AND read_at IS NULL`).run(req.user.name || '');
  res.json({ success: true });
});

router.post('/:id/read', requireAuth, (req, res) => {
  db.prepare(`UPDATE pp_notifications SET read_at = datetime('now') WHERE id = ? AND recipient = ? AND read_at IS NULL`)
    .run(req.params.id, req.user.name || '');
  res.json({ success: true });
});

module.exports = router;
