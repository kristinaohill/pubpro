// System Administrator: users, roles and permissions. Everything here needs admin.users.
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { requireAuth, requirePerm } = require('../auth');
const P = require('../permissions');

router.use(requireAuth, requirePerm('admin.users'));

const USER_COLS = 'id, email, name, role, active, created_at, last_login_at, author_profile_id';
const userOut = u => ({ ...u, active: !!u.active, role_name: P.roleName(u.role) });

/** A readable one-time password the admin passes on; the user changes it from the account menu. */
const tempPassword = () => {
  const words = crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 10);
  return words.slice(0, 5) + '-' + words.slice(5);
};

const activeAdmins = () => db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1").get().c;

router.get('/users', (req, res) => {
  res.json(db.prepare(`SELECT ${USER_COLS} FROM users ORDER BY active DESC, lower(name)`).all().map(userOut));
});

router.post('/users', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = String(req.body.role || '');
  if (!name || !email) return res.status(400).json({ error: 'Enter a name and email address.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!P.roleRow(role) || role === 'author') return res.status(400).json({ error: 'Choose a staff role. External author logins are created from their author profile.' });
  if (db.prepare('SELECT 1 FROM users WHERE lower(email) = ?').get(email)) return res.status(400).json({ error: 'Someone already uses that email address.' });
  const password = tempPassword();
  const r = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
    .run(email, bcrypt.hashSync(password, 10), name, role);
  res.json({ user: userOut(db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(r.lastInsertRowid)), tempPassword: password });
});

router.put('/users/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const self = String(u.id) === String(req.user.id);
  const name = req.body.name == null ? u.name : String(req.body.name).trim();
  const role = req.body.role == null ? u.role : String(req.body.role);
  const active = req.body.active == null ? !!u.active : !!req.body.active;
  if (!name) return res.status(400).json({ error: 'Enter a name.' });
  if (!P.roleRow(role)) return res.status(400).json({ error: 'Unknown role.' });
  if ((u.role === 'author') !== (role === 'author')) {
    return res.status(400).json({ error: 'External author logins keep the External Author role; they come from author profiles.' });
  }
  if (self && (role !== u.role || !active)) {
    return res.status(400).json({ error: 'You can’t change your own role or deactivate yourself. Ask another administrator.' });
  }
  if (u.role === 'admin' && u.active && (role !== 'admin' || !active) && activeAdmins() <= 1) {
    return res.status(400).json({ error: 'Keep at least one active System Administrator.' });
  }
  db.prepare('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?').run(name, role, active ? 1 : 0, u.id);
  res.json(userOut(db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(u.id)));
});

router.post('/users/:id/reset-password', (req, res) => {
  const u = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const password = tempPassword();
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), u.id);
  res.json({ tempPassword: password });
});

const rolesPayload = () => ({ roles: P.listRoles(), permissions: P.PERMISSIONS, signupRole: P.signupRole() });

router.get('/roles', (req, res) => res.json(rolesPayload()));

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

router.post('/roles', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name the role.' });
  if (db.prepare('SELECT 1 FROM roles WHERE lower(name) = lower(?)').get(name)) return res.status(400).json({ error: 'A role with that name already exists.' });
  let key = slug(name) || 'role';
  for (let n = 2; P.roleRow(key); n += 1) key = slug(name) + '_' + n;
  db.prepare('INSERT INTO roles (key, name, description, permissions, built_in, sort) VALUES (?, ?, ?, ?, 0, 100)')
    .run(key, name, String(req.body.description || '').trim(), JSON.stringify(P.normalize(req.body.permissions)));
  res.json(rolesPayload());
});

// Saves several roles' permission sets at once (the matrix's Save button).
router.put('/roles', (req, res) => {
  const changes = Array.isArray(req.body.roles) ? req.body.roles : [];
  for (const c of changes) {
    const row = P.roleRow(c.key);
    if (!row) return res.status(400).json({ error: 'Unknown role: ' + c.key });
    if (P.LOCKED[c.key]) return res.status(400).json({ error: row.name + '’s permissions are fixed.' });
  }
  const update = db.prepare('UPDATE roles SET name = ?, description = ?, permissions = ? WHERE key = ?');
  for (const c of changes) {
    const row = P.roleRow(c.key);
    const name = c.name == null ? row.name : String(c.name).trim() || row.name;
    const description = c.description == null ? row.description : String(c.description).trim();
    const perms = c.permissions == null ? JSON.parse(row.permissions || '[]') : P.normalize(c.permissions);
    update.run(name, description, JSON.stringify(perms), c.key);
  }
  res.json(rolesPayload());
});

router.delete('/roles/:key', (req, res) => {
  const row = P.roleRow(req.params.key);
  if (!row) return res.status(404).json({ error: 'Role not found.' });
  if (row.built_in) return res.status(400).json({ error: 'Built-in roles can’t be deleted.' });
  const n = db.prepare('SELECT COUNT(*) AS c FROM users WHERE role = ?').get(row.key).c;
  if (n) return res.status(400).json({ error: 'Move the ' + n + ' user' + (n === 1 ? '' : 's') + ' with this role to another role first.' });
  if (P.signupRole() === row.key) P.setSetting('signup_role', 'pub_manager');
  db.prepare('DELETE FROM roles WHERE key = ?').run(row.key);
  res.json(rolesPayload());
});

router.put('/settings', (req, res) => {
  const role = String(req.body.signupRole || '');
  if (!P.roleRow(role) || P.LOCKED[role]) return res.status(400).json({ error: 'Choose a staff role other than System Administrator.' });
  P.setSetting('signup_role', role);
  res.json(rolesPayload());
});

module.exports = router;
