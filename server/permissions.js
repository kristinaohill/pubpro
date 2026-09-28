// Roles and permissions, managed from the System Administrator page. Every permission listed here
// is checked on the server (see requirePerm and the routes), not only hidden in the UI.
const db = require('./db');
const { PRODUCTS, PRODUCT_TA } = require('./products');

const PERMISSIONS = [
  { key: 'pubs.edit', group: 'Publications', label: 'See and edit publications', help: 'Including the publication document. Without it, people don\u2019t see publications at all (Reviewers excepted for now).', requires: ['doc.edit'] },
  { key: 'pubs.cancel', group: 'Publications', label: 'Cancel and reinstate publications', requires: ['pubs.edit'] },
  { key: 'doc.edit', group: 'Publication document', label: 'Edit the publication document', help: 'Edits are tracked and marked with the editor’s name.' },
  { key: 'doc.review', group: 'Publication document', label: 'Accept or reject anyone’s changes', help: 'Also lets the user turn change tracking off. Everyone else can only undo their own changes.', requires: ['doc.edit'] },
  { key: 'plans.edit', group: 'Plans and authors', label: 'See and edit publication plans', help: 'Without it, people don\u2019t see plans (a publication can still name its parent plan).' },
  { key: 'authors.edit', group: 'Plans and authors', label: 'Create and edit external author profiles' },
  { key: 'admin.users', group: 'Administration', label: 'Manage users, roles and permissions' },
];
const PERM_KEYS = PERMISSIONS.map(p => p.key);

// admin always has everything; author is the external-author login: their own dashboard, plus
// tracked edits to the document of publications they're listed on (checked per record).
const LOCKED = { admin: 'all', author: 'fixed' };
const FIXED = { author: ['doc.edit'] };
const AUTHOR_DESCRIPTION = 'External authors sign in to their own dashboard and can suggest tracked changes to the documents of publications they\u2019re an author on. Logins come from external author profiles.';
// If you can see it you can edit it (2026-09-28): Executives edit what their therapeutic areas cover.
const EXEC_DESCRIPTION = 'Sees and edits publications and plans for their products or therapeutic areas; dashboards open on them.';
const EXEC_PERMS = ['pubs.edit', 'doc.edit', 'plans.edit'];
const BUILT_IN = [
  { key: 'admin', name: 'System Administrator', description: 'Full access, including users, roles and permissions.', permissions: PERM_KEYS },
  { key: 'pub_manager', name: 'Publication Manager', description: 'Runs publications and plans end to end.', permissions: ['pubs.edit', 'pubs.cancel', 'doc.edit', 'doc.review', 'plans.edit', 'authors.edit'] },
  { key: 'writer', name: 'Medical Writer', description: 'Writes and revises publications and their documents.', permissions: ['pubs.edit', 'doc.edit', 'doc.review'] },
  { key: 'reviewer', name: 'Reviewer', description: 'Reads publications and suggests tracked changes to the document.', permissions: ['doc.edit'] },
  { key: 'executive', name: 'Executive', description: EXEC_DESCRIPTION, permissions: EXEC_PERMS },
  { key: 'author', name: 'External Author', description: AUTHOR_DESCRIPTION, permissions: FIXED.author },
];

db.exec(`CREATE TABLE IF NOT EXISTS roles (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  built_in INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 100
)`);
db.exec('CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)');
// Roles whose holders are added automatically as required reviewers on publications in their scope.
try { db.exec('ALTER TABLE roles ADD COLUMN auto_review INTEGER NOT NULL DEFAULT 0'); } catch (e) { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1'); } catch (e) { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN last_login_at TEXT'); } catch (e) { /* exists */ }
// Roles beyond the first (users.role). A user can hold several; their permissions combine.
try { db.exec('ALTER TABLE users ADD COLUMN extra_roles TEXT'); } catch (e) { /* exists */ }
// Which products each of a user's roles applies to: { roleKey: [products] }; a role left out covers all.
try { db.exec('ALTER TABLE users ADD COLUMN role_scopes TEXT'); } catch (e) { /* exists */ }

BUILT_IN.forEach((r, i) => {
  db.prepare('INSERT OR IGNORE INTO roles (key, name, description, permissions, built_in, sort) VALUES (?, ?, ?, ?, 1, ?)')
    .run(r.key, r.name, r.description, JSON.stringify(r.permissions), i);
});
// View = edit (once per database): the Executive role, read-only before, now sees and edits.
db.exec("CREATE TABLE IF NOT EXISTS app_seeds (key TEXT PRIMARY KEY, ran_at TEXT DEFAULT (datetime('now')))");
if (!db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get('view-equals-edit-2026-09')) {
  db.prepare("UPDATE roles SET permissions = ?, description = ? WHERE key = 'executive'").run(JSON.stringify(EXEC_PERMS), EXEC_DESCRIPTION);
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run('view-equals-edit-2026-09');
}
// The External Author role's wording and permissions are fixed; keep existing databases in step.
db.prepare('UPDATE roles SET description = ?, permissions = ? WHERE key = ?').run(AUTHOR_DESCRIPTION, JSON.stringify(FIXED.author), 'author');
// Staff accounts from before roles existed ('user') had full staff access: they become Publication Managers.
db.prepare("UPDATE users SET role = 'pub_manager' WHERE role = 'user'").run();

/** Adds anything a permission needs (review needs edit) and drops unknown keys. */
function normalize(perms) {
  const out = new Set((perms || []).filter(p => PERM_KEYS.includes(p)));
  PERMISSIONS.forEach(p => { if (out.has(p.key)) (p.requires || []).forEach(r => out.add(r)); });
  return PERM_KEYS.filter(k => out.has(k));
}

const parseList = t => { try { return JSON.parse(t || '[]'); } catch (e) { return []; } };

function roleRow(key) {
  return db.prepare('SELECT * FROM roles WHERE key = ?').get(key);
}

function permissionsOf(roleKey) {
  if (LOCKED[roleKey] === 'all') return PERM_KEYS.slice();
  if (LOCKED[roleKey] === 'fixed') return FIXED[roleKey].slice();
  const row = roleRow(roleKey);
  return row ? normalize(parseList(row.permissions)) : [];
}

/** Every role a user holds (users.role first, then extra_roles), known roles only. */
function rolesOf(u) {
  const out = [u.role].concat(parseList(u.extra_roles)).filter(k => k && roleRow(k));
  return [...new Set(out)];
}
const parseMap = t => { try { const v = JSON.parse(t || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; } };

/**
 * Each of a user's roles with the products it covers: [{ role, products }] where products is null
 * for all products. System Administrator always covers everything.
 */
function scopesOf(u) {
  const map = parseMap(u.role_scopes);
  return rolesOf(u).map(role => {
    const list = role === 'admin' || !Array.isArray(map[role]) ? null : map[role].filter(p => PRODUCTS.includes(p));
    return { role, products: list && list.length ? list : null };
  });
}
const covers = (scope, product) => !scope.products || !product || scope.products.includes(product);

/**
 * The combined permissions of a user's roles. With a product, only the roles whose scope includes it
 * count (a Daxafort-only writer can't edit a Biologix publication). Without one (or for a record that
 * has no product yet), every role counts.
 */
function permissionsForUser(u, product) {
  const set = new Set();
  scopesOf(u).filter(sc => product === undefined || covers(sc, product))
    .forEach(sc => permissionsOf(sc.role).forEach(p => set.add(p)));
  return PERM_KEYS.filter(k => set.has(k));
}

/** The session's view of scopes: each role with its name, products and permissions (for the client). */
function roleScopesOf(u) {
  return scopesOf(u).map(sc => ({ role: sc.role, name: roleName(sc.role), products: sc.products, permissions: permissionsOf(sc.role) }));
}

/** Sets which products each role covers: { roleKey: 'all' | [products] }. Unknown products are dropped. */
function setScopes(userId, scopes) {
  const u = db.prepare('SELECT role, extra_roles, role_scopes FROM users WHERE id = ?').get(userId);
  if (!u) return;
  const held = rolesOf(u);
  const map = parseMap(u.role_scopes);
  Object.entries(scopes || {}).forEach(([role, v]) => {
    if (v === 'all' || v == null) { delete map[role]; return; }
    if (!Array.isArray(v)) return;
    const list = [...new Set(v.filter(p => PRODUCTS.includes(p)))];
    if (!list.length) throw new Error('Pick at least one product for ' + roleName(role) + ', or choose All products.');
    map[role] = list;
  });
  Object.keys(map).forEach(k => { if (!held.includes(k) || k === 'admin') delete map[k]; });
  db.prepare('UPDATE users SET role_scopes = ? WHERE id = ?').run(JSON.stringify(map), userId);
}

/** "Daxafort, Triazapam" or "All products" (therapeutic areas named when a scope covers all of one). */
function scopeLabel(products) {
  if (!products) return 'All products';
  const byTa = {};
  PRODUCTS.forEach(p => { (byTa[PRODUCT_TA[p]] = byTa[PRODUCT_TA[p]] || []).push(p); });
  const parts = [];
  const left = new Set(products);
  Object.entries(byTa).forEach(([ta, ps]) => {
    if (ps.length > 1 && ps.every(p => left.has(p))) { parts.push(ta); ps.forEach(p => left.delete(p)); }
  });
  return parts.concat([...left].map(p => p.split(' ')[0])).join(', ');
}
const roleNamesOf = u => rolesOf(u).map(roleName).join(', ');

/**
 * Sets a user's roles. External Author can't be combined with staff roles. The first role (by the
 * roles' order, so System Administrator leads) is stored in users.role, which older checks read.
 */
function setRoles(userId, keys) {
  const valid = [...new Set((keys || []).filter(k => roleRow(k)))];
  if (!valid.length) throw new Error('Give them at least one role.');
  if (valid.includes('author') && valid.length > 1) throw new Error('External Author can\u2019t be combined with other roles.');
  const order = Object.fromEntries(db.prepare('SELECT key, sort FROM roles').all().map(r => [r.key, r.sort]));
  valid.sort((a, b) => (order[a] ?? 100) - (order[b] ?? 100));
  db.prepare('UPDATE users SET role = ?, extra_roles = ? WHERE id = ?').run(valid[0], JSON.stringify(valid.slice(1)), userId);
  return valid;
}

function listRoles() {
  const counts = {};
  db.prepare('SELECT role, extra_roles FROM users').all().forEach(u => rolesOf(u).forEach(k => { counts[k] = (counts[k] || 0) + 1; }));
  return db.prepare('SELECT * FROM roles ORDER BY sort, name').all().map(r => ({
    key: r.key,
    name: r.name,
    description: r.description || '',
    builtIn: !!r.built_in,
    autoReview: !!r.auto_review,
    locked: LOCKED[r.key] || null,
    permissions: permissionsOf(r.key),
    users: counts[r.key] || 0,
  }));
}

function getSetting(key, fallback) {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}
function setSetting(key, value) {
  db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

/** Role given to people who create their own account on the sign-in page. */
function signupRole() {
  const key = getSetting('signup_role', 'pub_manager');
  return roleRow(key) && !LOCKED[key] ? key : 'pub_manager';
}

function roleName(key) {
  const row = roleRow(key);
  return row ? row.name : key;
}

module.exports = { PERMISSIONS, PERM_KEYS, LOCKED, PRODUCTS, PRODUCT_TA, normalize, permissionsOf, permissionsForUser, scopesOf, roleScopesOf, setScopes, scopeLabel, rolesOf, roleNamesOf, setRoles, listRoles, roleRow, roleName, signupRole, getSetting, setSetting };
