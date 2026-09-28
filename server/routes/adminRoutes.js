// System Administrator: users, roles and permissions. Everything here needs admin.users.
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { requireAuth, requirePerm, signToken } = require('../auth');
const P = require('../permissions');
const people = require('../people');

router.use(requireAuth, requirePerm('admin.users'));

// Who signed in as whom, and when (System Administrator > Sign In As).
db.exec(`CREATE TABLE IF NOT EXISTS admin_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT DEFAULT (datetime('now')),
  actor_id INTEGER, actor_name TEXT, action TEXT, target_id INTEGER, target_name TEXT
)`);
const logAdmin = (req, action, target) => db.prepare('INSERT INTO admin_log (actor_id, actor_name, action, target_id, target_name) VALUES (?, ?, ?, ?, ?)')
  .run(req.user.id, req.user.name, action, target ? target.id : null, target ? target.name : null);

const USER_COLS = 'id, email, name, role, extra_roles, role_scopes, active, pending, created_at, last_login_at, author_profile_id, title, department, phone, therapeutic_areas, ooo_from, ooo_to, ooo_note';
const userOut = ({ therapeutic_areas, ooo_from, ooo_to, ooo_note, extra_roles, role_scopes, ...u }) => ({
  ...u, active: !!u.active, pending: !!u.pending,
  scopes: Object.fromEntries(P.scopesOf({ role: u.role, extra_roles, role_scopes }).map(sc => [sc.role, sc.products || 'all'])),
  roles: P.rolesOf({ role: u.role, extra_roles }), role_name: P.roleNamesOf({ role: u.role, extra_roles }),
  ...people.profileFields({ therapeutic_areas, ooo_from, ooo_to, ooo_note, title: u.title, department: u.department, phone: u.phone }),
});
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** A readable one-time password the admin passes on; the user changes it from the account menu. */
const tempPassword = () => {
  const words = crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 10);
  return words.slice(0, 5) + '-' + words.slice(5);
};

const activeAdmins = () => db.prepare('SELECT role, extra_roles FROM users WHERE active = 1 AND pending = 0').all().filter(u => P.rolesOf(u).includes('admin')).length;
/** The roles in a request: { roles: [..] }, or the older single { role }. */
const rolesIn = body => (Array.isArray(body.roles) ? body.roles.map(String) : body.role != null ? [String(body.role)] : null);

router.get('/users', (req, res) => {
  res.json(db.prepare(`SELECT ${USER_COLS} FROM users ORDER BY pending DESC, active DESC, lower(name)`).all().map(userOut));
});

router.post('/users', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const roles = rolesIn(req.body) || [];
  const role = roles[0] || '';
  if (!name || !email) return res.status(400).json({ error: 'Enter a name and email address.' });
  if (!emailOk(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  let cols;
  try { cols = people.readProfile(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  if (!roles.length || roles.some(k => !P.roleRow(k) || k === 'author')) return res.status(400).json({ error: 'Choose one or more staff roles. External author logins are created from their author profile.' });
  if (db.prepare('SELECT 1 FROM users WHERE lower(email) = ?').get(email)) return res.status(400).json({ error: 'Someone already uses that email address.' });
  const password = tempPassword();
  const r = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
    .run(email, bcrypt.hashSync(password, 10), name, role);
  people.writeProfile(r.lastInsertRowid, cols);
  P.setRoles(r.lastInsertRowid, roles);
  try { P.setScopes(r.lastInsertRowid, req.body.scopes); } catch (e) { return res.status(400).json({ error: e.message }); }
  res.json({ user: userOut(db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(r.lastInsertRowid)), tempPassword: password });
});

router.put('/users/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const self = String(u.id) === String(req.user.id);
  const name = req.body.name == null ? u.name : String(req.body.name).trim();
  const before = P.rolesOf(u);
  const roles = rolesIn(req.body) || before;
  const active = req.body.active == null ? !!u.active : !!req.body.active;
  const email = req.body.email == null ? u.email : String(req.body.email).trim().toLowerCase();
  if (!name) return res.status(400).json({ error: 'Enter a name.' });
  if (!emailOk(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (email !== u.email && db.prepare('SELECT 1 FROM users WHERE lower(email) = ? AND id != ?').get(email, u.id)) return res.status(400).json({ error: 'Someone already uses that email address.' });
  let cols;
  try { cols = people.readProfile(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  if (!roles.length) return res.status(400).json({ error: 'Give them at least one role.' });
  if (roles.some(k => !P.roleRow(k))) return res.status(400).json({ error: 'Unknown role.' });
  if (before.includes('author') !== roles.includes('author')) {
    return res.status(400).json({ error: 'External author logins keep the External Author role; they come from author profiles.' });
  }
  const changedRoles = roles.slice().sort().join() !== before.slice().sort().join();
  if (self && (changedRoles || !active)) {
    return res.status(400).json({ error: 'You can’t change your own role or deactivate yourself. Ask another administrator.' });
  }
  if (before.includes('admin') && u.active && (!roles.includes('admin') || !active) && activeAdmins() <= 1) {
    return res.status(400).json({ error: 'Keep at least one active System Administrator.' });
  }
  db.prepare('UPDATE users SET name = ?, email = ?, active = ? WHERE id = ?').run(name, email, active ? 1 : 0, u.id);
  people.writeProfile(u.id, cols);
  if (changedRoles) { try { P.setRoles(u.id, roles); } catch (e) { return res.status(400).json({ error: e.message }); } }
  // Scopes can change on your own account too (they narrow, they never add roles).
  if (req.body.scopes) { try { P.setScopes(u.id, req.body.scopes); } catch (e) { return res.status(400).json({ error: e.message }); } }
  res.json(userOut(db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(u.id)));
});

// Self sign-ups waiting for approval (sign-up rule "approval"): approve, or decline (removes the account).
router.post('/users/:id/approve', (req, res) => {
  const u = db.prepare('SELECT id, pending FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const roles = rolesIn(req.body);
  if (roles) {
    if (!roles.length || roles.some(k => !P.roleRow(k) || k === 'author')) return res.status(400).json({ error: 'Choose a staff role.' });
    P.setRoles(u.id, roles);
  }
  db.prepare('UPDATE users SET pending = 0, active = 1 WHERE id = ?').run(u.id);
  res.json(userOut(db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(u.id)));
});
router.delete('/users/:id', (req, res) => {
  const u = db.prepare('SELECT id, pending FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  if (!u.pending) return res.status(400).json({ error: 'Only sign-ups waiting for approval can be removed. Deactivate other accounts instead.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
  res.json({ success: true });
});

/**
 * Sign In As: a 2-hour session as another user, to see PubPro exactly as they do. The token carries
 * the administrator (imp) so the app can show a banner and switch back; everything done in it is
 * done as that user. Not for yourself, deactivated or unapproved accounts, or from inside another
 * impersonation.
 */
router.post('/users/:id/impersonate', (req, res) => {
  if (req.impersonator) return res.status(400).json({ error: 'Return to your own account before signing in as someone else.' });
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  if (String(u.id) === String(req.user.id)) return res.status(400).json({ error: 'That\u2019s you.' });
  if (!u.active || u.pending) return res.status(400).json({ error: u.name + '\u2019s account isn\u2019t active, so you can\u2019t sign in as them.' });
  const claims = { id: u.id, email: u.email, name: u.name, role: u.role, client_id: u.client_id, author_profile_id: u.author_profile_id || null, imp: { id: req.user.id, name: req.user.name } };
  logAdmin(req, 'impersonate', u);
  res.json({
    token: signToken(claims, '2h'),
    user: { ...claims, roles: P.rolesOf(u), role_name: P.roleNamesOf(u), permissions: P.permissionsForUser(u), roleScopes: P.roleScopesOf(u) },
  });
});

router.post('/users/:id/reset-password', (req, res) => {
  const u = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const password = tempPassword();
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), u.id);
  res.json({ tempPassword: password });
});

const rolesPayload = () => ({
  roles: P.listRoles(), permissions: P.PERMISSIONS, signupRole: P.signupRole(),
  signup: people.signupRules(), options: { therapeuticAreas: people.THERAPEUTIC_AREAS, departments: people.DEPARTMENTS, products: P.PRODUCTS, productTa: P.PRODUCT_TA },
});

router.get('/roles', (req, res) => res.json(rolesPayload()));

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

router.post('/roles', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name the role.' });
  if (db.prepare('SELECT 1 FROM roles WHERE lower(name) = lower(?)').get(name)) return res.status(400).json({ error: 'A role with that name already exists.' });
  let key = slug(name) || 'role';
  for (let n = 2; P.roleRow(key); n += 1) key = slug(name) + '_' + n;
  db.prepare('INSERT INTO roles (key, name, description, permissions, built_in, sort, auto_review) VALUES (?, ?, ?, ?, 0, 100, ?)')
    .run(key, name, String(req.body.description || '').trim(), JSON.stringify(P.normalize(req.body.permissions)), req.body.autoReview ? 1 : 0);
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
  const update = db.prepare('UPDATE roles SET name = ?, description = ?, permissions = ?, auto_review = ? WHERE key = ?');
  for (const c of changes) {
    const row = P.roleRow(c.key);
    const name = c.name == null ? row.name : String(c.name).trim() || row.name;
    const description = c.description == null ? row.description : String(c.description).trim();
    const perms = c.permissions == null ? JSON.parse(row.permissions || '[]') : P.normalize(c.permissions);
    const auto = c.autoReview == null ? row.auto_review : (c.autoReview ? 1 : 0);
    update.run(name, description, JSON.stringify(perms), auto, c.key);
  }
  res.json(rolesPayload());
});

router.delete('/roles/:key', (req, res) => {
  const row = P.roleRow(req.params.key);
  if (!row) return res.status(404).json({ error: 'Role not found.' });
  if (row.built_in) return res.status(400).json({ error: 'Built-in roles can’t be deleted.' });
  const n = db.prepare('SELECT role, extra_roles FROM users').all().filter(x => P.rolesOf(x).includes(row.key)).length;
  if (n) return res.status(400).json({ error: 'Move the ' + n + ' user' + (n === 1 ? '' : 's') + ' with this role to another role first.' });
  if (P.signupRole() === row.key) P.setSetting('signup_role', 'pub_manager');
  db.prepare('DELETE FROM roles WHERE key = ?').run(row.key);
  res.json(rolesPayload());
});

// Self sign-up: { signupRole, mode: open | approval | closed, domains: [..] } (any subset).
router.put('/settings', (req, res) => {
  if (req.body.signupRole != null) {
    const role = String(req.body.signupRole);
    if (!P.roleRow(role) || P.LOCKED[role]) return res.status(400).json({ error: 'Choose a staff role other than System Administrator.' });
    P.setSetting('signup_role', role);
  }
  try { people.setSignupRules({ mode: req.body.mode, domains: req.body.domains }); } catch (e) { return res.status(400).json({ error: e.message }); }
  res.json(rolesPayload());
});

module.exports = router;
