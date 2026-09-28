// System Administrator: users, roles and permissions. Everything here needs admin.users.
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { requireAuth, requirePerm, signToken } = require('../auth');
const P = require('../permissions');
const catalog = require('../products');
const people = require('../people');
const { isInternalEmail, DOMAIN } = require('../bplogixPeople');
const internalEmailError = 'Internal users need a @' + DOMAIN + ' email address.';
const { yearCode, nextSequence } = require('../recordIds');

// ---- External users: an External Author login and its author profile, kept in step -----------
const parseJson = (t, f) => { try { return JSON.parse(t || ''); } catch (e) { return f; } };
function authorInfo(profileId) {
  if (!profileId) return null;
  const a = db.prepare('SELECT id, author_id, summary, data FROM pp_authors WHERE id = ?').get(profileId);
  if (!a) return null;
  const sm = parseJson(a.summary, {});
  const d = parseJson(a.data, {});
  return { profileId: a.id, authorId: a.author_id, institution: sm.institution || (d.form && d.form.institution) || '' };
}
const nowStamp = () => new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(',', '');
const splitName = name => { const parts = name.split(/\s+/); return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') }; };
function nextAuthorId() {
  const prefix = 'EA-' + yearCode() + '-';
  const rows = db.prepare('SELECT author_id FROM pp_authors WHERE author_id LIKE ?').all(prefix + '%');
  return prefix + nextSequence(rows.map(r => r.author_id), prefix);
}
/** Creates the author profile for a new external user; returns its id. */
function createAuthorProfile(req, name, email, institution) {
  const form = { firstName: '', middleInitial: '', lastName: '', ...splitName(name), displayName: name, email, confirmEmail: email, institution, street: '', city: '', state: '', country: 'United States', zip: '' };
  const data = {
    active: true, form, na: false, manual: true, checks: [], agreements: [], coi: [], signedCoi: null, studies: [],
    audit: [{ action: 'Profile created', user: req.user.name, at: nowStamp(), detail: 'Added as an external user in System Administrator', icon: 'person_add', color: 'var(--ok)' }],
  };
  const summary = { displayName: name, institution, location: 'United States', lastCheck: '', lastCheckClear: null, pending: 0, studies: 0 };
  return db.prepare('INSERT INTO pp_authors (author_id, name, email, status, owner, summary, data, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(nextAuthorId(), name, email, 'Active', req.user.name || null, JSON.stringify(summary), JSON.stringify(data), req.user.id || null).lastInsertRowid;
}
/** Name, email or institution changed on an external user: update their author profile to match. */
function syncAuthorProfile(profileId, { name, email, institution }) {
  const a = db.prepare('SELECT summary, data FROM pp_authors WHERE id = ?').get(profileId);
  if (!a) return;
  const sm = parseJson(a.summary, {});
  const d = parseJson(a.data, {});
  d.form = { ...(d.form || {}), ...splitName(name), displayName: name, email, confirmEmail: email };
  sm.displayName = name;
  if (institution != null) { d.form.institution = institution; d.manual = true; d.na = false; sm.institution = institution; }
  db.prepare("UPDATE pp_authors SET name = ?, email = ?, summary = ?, data = ?, updated_at = datetime('now') WHERE id = ?")
    .run(name, email, JSON.stringify(sm), JSON.stringify(d), profileId);
}

router.use(requireAuth, requirePerm('admin.users'));

// Who signed in as whom, and when (System Administrator > Sign In As).
db.exec(`CREATE TABLE IF NOT EXISTS admin_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT DEFAULT (datetime('now')),
  actor_id INTEGER, actor_name TEXT, action TEXT, target_id INTEGER, target_name TEXT
)`);
const logAdmin = (req, action, target) => db.prepare('INSERT INTO admin_log (actor_id, actor_name, action, target_id, target_name) VALUES (?, ?, ?, ?, ?)')
  .run(req.user.id, req.user.name, action, target ? target.id : null, target ? target.name : null);

const USER_COLS = 'id, email, name, role, extra_roles, role_scopes, product_roles, active, pending, created_at, last_login_at, author_profile_id, title, department, phone, therapeutic_areas, ooo_from, ooo_to, ooo_note';
const userOut = ({ therapeutic_areas, ooo_from, ooo_to, ooo_note, extra_roles, role_scopes, product_roles, ...u }) => ({
  ...u, active: !!u.active, pending: !!u.pending, author: u.role === 'author' ? authorInfo(u.author_profile_id) : null,
  // Publication Managers and Reviewers: their role on each of their products.
  productRoles: P.productRolesOf({ role: u.role, product_roles }),
  allProducts: P.ALL_PRODUCTS.has(u.role),
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
/** Publication Managers and Reviewers need at least one product, each with a product role. */
function productRolesError(level, map) {
  if (P.ALL_PRODUCTS.has(level) || level === 'author') return null;
  const keys = new Set(catalog.productRoles().map(r => r.key));
  const entries = Object.entries(map || {}).filter(([p]) => P.PRODUCTS.includes(p));
  if (!entries.length) return 'Choose at least one product for them and their role on it.';
  const missing = entries.find(([, r]) => !keys.has(r));
  return missing ? 'Choose their role on ' + missing[0].split(' ')[0] + '.' : null;
}
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
  const external = roles.length === 1 && roles[0] === 'author';
  if (!roles.length || roles.some(k => !P.roleRow(k)) || (!external && roles.includes('author'))) {
    return res.status(400).json({ error: 'Choose an access level.' });
  }
  if (db.prepare('SELECT 1 FROM users WHERE lower(email) = ?').get(email)) return res.status(400).json({ error: 'Someone already uses that email address.' });
  const institution = String(req.body.institution || '').trim();
  if (external && !institution) return res.status(400).json({ error: 'Enter their institution.' });
  if (!external && !isInternalEmail(email)) return res.status(400).json({ error: internalEmailError });
  const prError = productRolesError(P.LEVEL_KEYS.find(k => roles.includes(k)), req.body.productRoles);
  if (prError) return res.status(400).json({ error: prError });
  if (external && db.prepare('SELECT 1 FROM pp_authors WHERE lower(email) = ?').get(email)) {
    return res.status(400).json({ error: 'An external author profile already uses that email. Add the email on that profile to give them a login.' });
  }
  const password = tempPassword();
  const profileId = external ? createAuthorProfile(req, name, email, institution) : null;
  const r = db.prepare('INSERT INTO users (email, password_hash, name, role, author_profile_id) VALUES (?, ?, ?, ?, ?)')
    .run(email, bcrypt.hashSync(password, 10), name, role, profileId);
  people.writeProfile(r.lastInsertRowid, cols);
  P.setRoles(r.lastInsertRowid, roles);
  if (!external) { try { P.setProductRoles(r.lastInsertRowid, req.body.productRoles); } catch (e) { /* admins and executives cover every product */ } }
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
  // Internal users need a @bplogix.com email to stay (or become) active; deactivating is always allowed.
  if (u.role !== 'author' && active && !isInternalEmail(email)) return res.status(400).json({ error: internalEmailError + (u.active ? '' : ' Change it to reactivate them.') });
  let cols;
  try { cols = people.readProfile(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  if (!roles.length) return res.status(400).json({ error: 'Give them at least one role.' });
  if (roles.some(k => !P.roleRow(k))) return res.status(400).json({ error: 'Unknown role.' });
  if (before.includes('author') !== roles.includes('author')) {
    return res.status(400).json({ error: 'External author logins keep the External Author role; they come from author profiles.' });
  }
  const changedRoles = roles.slice().sort().join() !== before.slice().sort().join();
  // Moving someone to Publication Manager or Reviewer needs their products.
  if (changedRoles && !P.ALL_PRODUCTS.has(roles[0]) && roles[0] !== 'author') {
    const prError = productRolesError(roles[0], req.body.productRoles || P.productRolesOf(u));
    if (prError) return res.status(400).json({ error: prError });
  }
  if (self && (changedRoles || !active)) {
    return res.status(400).json({ error: 'You can’t change your own role or deactivate yourself. Ask another administrator.' });
  }
  if (before.includes('admin') && u.active && (!roles.includes('admin') || !active) && activeAdmins() <= 1) {
    return res.status(400).json({ error: 'Keep at least one active System Administrator.' });
  }
  db.prepare('UPDATE users SET name = ?, email = ?, active = ? WHERE id = ?').run(name, email, active ? 1 : 0, u.id);
  if (u.role === 'author' && u.author_profile_id) {
    syncAuthorProfile(u.author_profile_id, { name, email, institution: req.body.institution == null ? null : String(req.body.institution).trim() });
  }
  people.writeProfile(u.id, cols);
  if (changedRoles) { try { P.setRoles(u.id, roles); } catch (e) { return res.status(400).json({ error: e.message }); } }
  if (req.body.productRoles && !P.ALL_PRODUCTS.has(roles[0]) && roles[0] !== 'author') {
    try { P.setProductRoles(u.id, req.body.productRoles); } catch (e) { return res.status(400).json({ error: e.message }); }
  }
  res.json(userOut(db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(u.id)));
});

// Self sign-ups waiting for approval (sign-up rule "approval"): approve, or decline (removes the account).
router.post('/users/:id/approve', (req, res) => {
  const u = db.prepare('SELECT id, pending FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const roles = rolesIn(req.body);
  if (roles) {
    if (!roles.length || roles.some(k => !P.roleRow(k) || k === 'author')) return res.status(400).json({ error: 'Choose an access level.' });
    P.setRoles(u.id, roles);
    if (req.body.productRoles) { try { P.setProductRoles(u.id, req.body.productRoles); } catch (e) { return res.status(400).json({ error: e.message }); } }
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

// ---- External users: every external author profile, with or without a login ----------------
router.get('/external', (req, res) => {
  const logins = new Map(db.prepare("SELECT id, email, name, active, pending, last_login_at, author_profile_id FROM users WHERE role = 'author' AND author_profile_id IS NOT NULL").all()
    .map(u => [u.author_profile_id, u]));
  const rows = db.prepare('SELECT id, author_id, name, email, status, summary, data, created_at FROM pp_authors ORDER BY name COLLATE NOCASE, id').all();
  res.json(rows.map(a => {
    const sm = parseJson(a.summary, {});
    const d = parseJson(a.data, {});
    const u = logins.get(a.id);
    return {
      profileId: a.id, authorId: a.author_id, name: a.name, email: a.email || '', status: a.status, created_at: a.created_at,
      institution: sm.institution || (d.form && d.form.institution) || '',
      login: u ? { userId: u.id, active: !!u.active, last_login_at: u.last_login_at } : null,
    };
  }));
});

/**
 * Edit an external author from System Administrator: { name, email, institution }. Updates the
 * profile and its login; adding an email to someone without a login gives them one (the reply
 * carries a one-time temporary password).
 */
router.put('/external/:profileId', (req, res) => {
  const a = db.prepare('SELECT id, email FROM pp_authors WHERE id = ?').get(req.params.profileId);
  if (!a) return res.status(404).json({ error: 'External author not found.' });
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const institution = req.body.institution == null ? null : String(req.body.institution).trim();
  if (!name) return res.status(400).json({ error: 'Enter a name.' });
  if (!email) return res.status(400).json({ error: 'Enter their email: external authors sign in with it.' });
  if (!emailOk(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  const login = db.prepare("SELECT * FROM users WHERE role = 'author' AND author_profile_id = ?").get(a.id);
  if (email && db.prepare('SELECT 1 FROM users WHERE lower(email) = ? AND id != ?').get(email, login ? login.id : -1)) {
    return res.status(400).json({ error: 'Someone already signs in with that email address.' });
  }
  if (login && !email) return res.status(400).json({ error: 'They sign in with their email, so it can\u2019t be removed. Deactivate their sign-in instead.' });
  syncAuthorProfile(a.id, { name, email: email || null, institution });
  let tempPw = null;
  if (login) {
    db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, login.id);
  } else if (email) {
    tempPw = tempPassword();
    db.prepare("INSERT INTO users (email, password_hash, name, role, author_profile_id) VALUES (?, ?, ?, 'author', ?)")
      .run(email, bcrypt.hashSync(tempPw, 10), name, a.id);
  }
  res.json({ tempPassword: tempPw });
});

// Review types: the whole list at once (Save on the Review Types tab).
router.put('/review-types', (req, res) => {
  try { res.json(require('../reviewTypes').save(req.body.types)); } catch (e) { res.status(400).json({ error: e.message }); }
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
  signup: people.signupRules(),
  options: { therapeuticAreas: people.therapeuticAreas(), departments: people.DEPARTMENTS, products: P.PRODUCTS, activeProducts: catalog.ACTIVE_PRODUCTS, productTa: P.PRODUCT_TA, productRoles: catalog.productRoles() },
});

router.get('/roles', (req, res) => res.json(rolesPayload()));


// Access levels are fixed; job roles are product roles (PUT /product-roles).
router.post('/roles', (req, res) => res.status(400).json({ error: 'Access levels are fixed. Add job roles on the Product roles tab.' }));

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

router.delete('/roles/:key', (req, res) => res.status(400).json({ error: 'Access levels are fixed.' }));

// ---- Catalog: products and product roles (set these up before aligning users) ----------------
router.put('/products', (req, res) => {
  try { res.json(catalog.saveProducts(req.body.products)); } catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/product-roles', (req, res) => {
  try { res.json(catalog.saveProductRoles(req.body.productRoles)); } catch (e) { res.status(400).json({ error: e.message }); }
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
