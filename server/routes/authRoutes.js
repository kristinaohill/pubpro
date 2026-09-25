const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth } = require('../auth');

// Per-user settings from the My Profile page, stored as JSON.
try {
  db.exec('ALTER TABLE users ADD COLUMN prefs TEXT');
} catch (e) { /* column already exists */ }

const DEFAULT_PREFS = { weeklySummary: false };
const readPrefs = raw => { try { return { ...DEFAULT_PREFS, ...JSON.parse(raw || '{}') }; } catch (e) { return { ...DEFAULT_PREFS }; } };
const claimsOf = u => ({ id: u.id, email: u.email, name: u.name, role: u.role, client_id: u.client_id, author_profile_id: u.author_profile_id || null });
const profileOf = u => ({ id: u.id, email: u.email, name: u.name, role: u.role, created_at: u.created_at, prefs: readPrefs(u.prefs) });

router.post('/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already registered' });
  const hash = bcrypt.hashSync(password, 10);
  const r = db.prepare('INSERT INTO users (email, password_hash, name, role, client_id) VALUES (?,?,?,?,?)').run(
    email, hash, name, 'user', null
  );
  res.json({ id: r.lastInsertRowid, email, name });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const claims = claimsOf(user);
  res.json({ token: signToken(claims), user: claims });
});

// Lets any signed-in user replace their password (authors start with a shared one).
router.post('/change-password', requireAuth, (req, res) => {
  const { current, next } = req.body;
  if (!current || !next) return res.status(400).json({ error: 'Enter your current and new password.' });
  if (String(next).length < 8) return res.status(400).json({ error: 'Use at least 8 characters for the new password.' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(current, user.password_hash)) return res.status(401).json({ error: 'Current password is incorrect.' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 10), user.id);
  res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(profileOf(user));
});

// My Profile: update your display name and settings. Returns a fresh token so the new name
// shows up (and is used as the owner on records you save) straight away.
router.put('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const name = req.body.name == null ? user.name : String(req.body.name).trim();
  if (!name) return res.status(400).json({ error: 'Enter your name.' });
  const incoming = req.body.prefs || {};
  const prefs = { ...readPrefs(user.prefs), ...('weeklySummary' in incoming ? { weeklySummary: !!incoming.weeklySummary } : {}) };
  db.prepare('UPDATE users SET name = ?, prefs = ? WHERE id = ?').run(name, JSON.stringify(prefs), user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const claims = claimsOf(updated);
  res.json({ token: signToken(claims), user: claims, profile: profileOf(updated) });
});

module.exports = router;
