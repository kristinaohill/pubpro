const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth } = require('../auth');
const { permissionsForUser, rolesOf, roleNamesOf, roleScopesOf } = require('../permissions');
const people = require('../people');

// Per-user settings from the My Profile page, stored as JSON.
try {
  db.exec('ALTER TABLE users ADD COLUMN prefs TEXT');
} catch (e) { /* column already exists */ }

const DEFAULT_PREFS = { weeklySummary: false };
const readPrefs = raw => { try { return { ...DEFAULT_PREFS, ...JSON.parse(raw || '{}') }; } catch (e) { return { ...DEFAULT_PREFS }; } };
const claimsOf = u => ({ id: u.id, email: u.email, name: u.name, role: u.role, client_id: u.client_id, author_profile_id: u.author_profile_id || null });
const profileOf = u => ({
  id: u.id, email: u.email, name: u.name, role: u.role, roles: rolesOf(u), role_name: roleNamesOf(u), created_at: u.created_at,
  prefs: readPrefs(u.prefs), permissions: permissionsForUser(u), roleScopes: roleScopesOf(u), ...people.profileFields(u),
  options: { therapeuticAreas: people.therapeuticAreas(), departments: people.DEPARTMENTS },
});
// What the client keeps about the signed-in user: the token claims plus what their role allows.
const sessionOf = u => ({ ...claimsOf(u), roles: rolesOf(u), role_name: roleNamesOf(u), permissions: permissionsForUser(u), roleScopes: roleScopesOf(u) });

// There is no self sign-up: an administrator creates internal and library users, and external
// authors get their login from their author profile (the invitation).
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (!user.active) return res.status(403).json({ error: 'This account has been deactivated. Contact your system administrator.' });
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
  res.json({ token: signToken(claimsOf(user)), user: sessionOf(user) });
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
  res.json({ ...profileOf(user), impersonator: req.impersonator });
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
  let cols;
  try { cols = people.readProfile(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  db.prepare('UPDATE users SET name = ?, prefs = ? WHERE id = ?').run(name, JSON.stringify(prefs), user.id);
  people.writeProfile(user.id, cols);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const claims = req.impersonator ? { ...claimsOf(updated), imp: req.impersonator } : claimsOf(updated);
  res.json({ token: signToken(claims, req.impersonator ? '2h' : '7d'), user: { ...sessionOf(updated), imp: req.impersonator || undefined }, profile: profileOf(updated) });
});

module.exports = router;
