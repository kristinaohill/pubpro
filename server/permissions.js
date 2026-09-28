// Access levels and permissions, managed from the System Administrator page. Every permission listed
// here is checked on the server (see requirePerm and the routes), not only hidden in the UI.
//
// Every user has one access level (users.role):
//   System Administrator - everything an Executive can do, plus administration; all products
//   Executive            - a super Publication Manager: the same permissions, on all products
//   Publication Manager  - their selected products
//   Reviewer             - their selected products
//   External Author      - their own dashboard and the publications that list them
//   Library User         - read-only: the Publication Library (publications with a final disposition)
// Publication Managers and Reviewers are aligned to products, with one product role on each
// (users.product_roles = { product: productRoleKey }; see products.js).
const db = require('./db');
const { PRODUCTS, ACTIVE_PRODUCTS, PRODUCT_TA, productRoles } = require('./products');

const PERMISSIONS = [
  { key: 'pubs.edit', group: 'Publications', label: 'See and edit publications', help: 'Including the publication document. Without it, people don’t see publications at all (Reviewers excepted for now).', requires: ['doc.edit'] },
  { key: 'pubs.cancel', group: 'Publications', label: 'Cancel and reinstate publications', requires: ['pubs.edit'] },
  { key: 'doc.edit', group: 'Publication document', label: 'Edit the publication document', help: 'Edits are tracked and marked with the editor’s name.' },
  { key: 'doc.review', group: 'Publication document', label: 'Accept or reject anyone’s changes', help: 'Also lets the user turn change tracking off. Everyone else can only undo their own changes.', requires: ['doc.edit'] },
  { key: 'plans.edit', group: 'Plans and authors', label: 'See and edit publication plans', help: 'Without it, people don’t see plans (a publication can still name its parent plan).' },
  { key: 'authors.edit', group: 'Plans and authors', label: 'Create and edit external author profiles' },
  { key: 'admin.users', group: 'Administration', label: 'Manage users, products, roles and permissions' },
];
const PERM_KEYS = PERMISSIONS.map(p => p.key);

// Fixed levels: admin has everything; executive always has exactly what Publication Manager has
// (on all products); author is the external-author login.
const LOCKED = { admin: 'all', executive: 'pm', author: 'fixed', library: 'fixed' };
const FIXED = { author: ['doc.edit'], library: [] };
// Levels that cover every product; the others see only the products they're aligned to.
const ALL_PRODUCTS = new Set(['admin', 'executive']);
const LEVELS = [
  { key: 'admin', name: 'System Administrator', description: 'Everything an Executive can do, plus users, products, roles and permissions. All products.', permissions: PERM_KEYS },
  { key: 'executive', name: 'Executive', description: 'A Publication Manager for every product: the same permissions, on all products.', permissions: [] },
  { key: 'pub_manager', name: 'Publication Manager', description: 'Runs publications and plans for their products.', permissions: ['pubs.edit', 'pubs.cancel', 'doc.edit', 'doc.review', 'plans.edit', 'authors.edit'] },
  { key: 'reviewer', name: 'Reviewer', description: 'Reviews publications for their products and suggests tracked changes to the document.', permissions: ['doc.edit'] },
  { key: 'library', name: 'Library User', description: 'Read-only: the Publication Library, where every publication with a final disposition (Accepted) is public. Nothing else in PubPro.', permissions: [] },
  { key: 'author', name: 'External Author', description: 'External authors sign in to their own dashboard and can suggest tracked changes to the documents of publications they’re an author on. Logins come from external author profiles.', permissions: FIXED.author },
];
const LEVEL_KEYS = LEVELS.map(l => l.key);

db.exec(`CREATE TABLE IF NOT EXISTS roles (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  built_in INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 100
)`);
db.exec('CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)');
db.exec("CREATE TABLE IF NOT EXISTS app_seeds (key TEXT PRIMARY KEY, ran_at TEXT DEFAULT (datetime('now')))");
try { db.exec('ALTER TABLE roles ADD COLUMN auto_review INTEGER NOT NULL DEFAULT 0'); } catch (e) { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1'); } catch (e) { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN last_login_at TEXT'); } catch (e) { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN extra_roles TEXT'); } catch (e) { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN role_scopes TEXT'); } catch (e) { /* exists */ }

LEVELS.forEach((r, i) => {
  db.prepare('INSERT OR IGNORE INTO roles (key, name, description, permissions, built_in, sort) VALUES (?, ?, ?, ?, 1, ?)')
    .run(r.key, r.name, r.description, JSON.stringify(r.permissions), i);
  // Names, descriptions and order of the levels are fixed; their permissions stay as saved.
  db.prepare('UPDATE roles SET name = ?, description = ?, built_in = 1, sort = ? WHERE key = ?').run(r.name, r.description, i, r.key);
});
db.prepare("UPDATE roles SET permissions = ? WHERE key = 'author'").run(JSON.stringify(FIXED.author));
db.prepare("UPDATE roles SET permissions = '[]' WHERE key = 'library'").run();
// Staff accounts from before roles existed ('user') had full staff access: they become Publication Managers.
db.prepare("UPDATE users SET role = 'pub_manager' WHERE role = 'user'").run();

const parseList = t => { try { const v = JSON.parse(t || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
const parseMap = t => { try { const v = JSON.parse(t || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; } };

// ---- One-time: roles + per-role product scopes (earlier model) -> levels + product roles ---------
// Medical Writer and custom roles (Medical Reviewer, Patent Attorney...) become product roles; each
// person gets one level and, if they're a Publication Manager or Reviewer, a role on each product
// their old roles covered.
if (!db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get('levels-products-2026-09')) {
  const productRoleKeys = () => new Set(productRoles().map(r => r.key));
  const oldRoles = db.prepare('SELECT * FROM roles').all();
  // Custom roles people created become product roles (the defaults already cover the common ones).
  oldRoles.filter(r => !LEVEL_KEYS.includes(r.key) && r.key !== 'writer' && !productRoleKeys().has(r.key)).forEach(r => {
    db.prepare('INSERT OR IGNORE INTO product_roles (key, name, description, sort) VALUES (?, ?, ?, 90)').run(r.key, r.name, r.description || '');
  });
  const functional = productRoleKeys();
  const FALLBACK = { writer: 'medical_writer', pub_manager: 'publication_lead', executive: 'publication_lead', reviewer: 'reviewer_general' };
  for (const u of db.prepare("SELECT * FROM users WHERE role != 'author'").all()) {
    const held = [...new Set([u.role].concat(parseList(u.extra_roles)))].filter(Boolean);
    const scopes = parseMap(u.role_scopes);
    const level = held.includes('admin') ? 'admin' : held.includes('executive') ? 'executive'
      : held.some(k => k === 'pub_manager' || k === 'writer') ? 'pub_manager' : 'reviewer';
    const map = {};
    if (!ALL_PRODUCTS.has(level)) {
      // A product's role: a functional role covering it first, else the one their old level implies.
      const covering = k => (Array.isArray(scopes[k]) && scopes[k].length ? scopes[k] : PRODUCTS.slice());
      const pick = (product, keys) => keys.find(k => covering(k).includes(product));
      PRODUCTS.forEach(product => {
        const fn = pick(product, held.filter(k => functional.has(k)));
        const base = pick(product, held.filter(k => FALLBACK[k]));
        if (fn) map[product] = fn;
        else if (base) map[product] = FALLBACK[base];
      });
    }
    db.prepare("UPDATE users SET role = ?, extra_roles = '[]', role_scopes = '{}', product_roles = ? WHERE id = ?").run(level, JSON.stringify(map), u.id);
  }
  db.prepare('DELETE FROM roles WHERE key NOT IN (' + LEVEL_KEYS.map(() => '?').join(',') + ')').run(...LEVEL_KEYS);
  if (!LEVEL_KEYS.includes(db.prepare("SELECT value FROM app_settings WHERE key = 'signup_role'").get()?.value || 'pub_manager')) {
    db.prepare("UPDATE app_settings SET value = 'pub_manager' WHERE key = 'signup_role'").run();
  }
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run('levels-products-2026-09');
}

/** Adds anything a permission needs (review needs edit) and drops unknown keys. */
function normalize(perms) {
  const out = new Set((perms || []).filter(p => PERM_KEYS.includes(p)));
  PERMISSIONS.forEach(p => { if (out.has(p.key)) (p.requires || []).forEach(r => out.add(r)); });
  return PERM_KEYS.filter(k => out.has(k));
}

function roleRow(key) {
  return db.prepare('SELECT * FROM roles WHERE key = ?').get(key);
}

function permissionsOf(level) {
  if (LOCKED[level] === 'all') return PERM_KEYS.slice();
  if (LOCKED[level] === 'fixed') return FIXED[level].slice();
  const row = roleRow(LOCKED[level] === 'pm' ? 'pub_manager' : level);
  return row ? normalize(parseList(row.permissions)) : [];
}

/** A user's access level, as a one-item list (older callers expect several). */
function rolesOf(u) {
  return roleRow(u.role) ? [u.role] : [];
}

/** { product: productRoleKey } for a Publication Manager or Reviewer; {} for the other levels. */
function productRolesOf(u) {
  if (ALL_PRODUCTS.has(u.role) || u.role === 'author' || u.role === 'library') return {};
  const map = parseMap(u.product_roles);
  return Object.fromEntries(Object.entries(map).filter(([p]) => PRODUCTS.includes(p)));
}

/** [{ role: level, products }] with products null for all products (admins, executives). */
function scopesOf(u) {
  return rolesOf(u).map(role => ({ role, products: ALL_PRODUCTS.has(role) || role === 'author' || role === 'library' ? null : Object.keys(productRolesOf(u)) }));
}
const covers = (scope, product) => !scope.products || !product || scope.products.includes(product);

/**
 * A user's permissions. With a product, only if their level covers it (a Publication Manager for
 * Daxafort can't edit a Biologix publication). Without one (or for a record with no product yet), all.
 */
function permissionsForUser(u, product) {
  const set = new Set();
  scopesOf(u).filter(sc => product === undefined || covers(sc, product))
    .forEach(sc => permissionsOf(sc.role).forEach(p => set.add(p)));
  return PERM_KEYS.filter(k => set.has(k));
}

/** The session's view: the level with its name, products and permissions (for the client). */
function roleScopesOf(u) {
  return scopesOf(u).map(sc => ({ role: sc.role, name: roleName(sc.role), products: sc.products, permissions: permissionsOf(sc.role) }));
}

/** "Immunology, Biologix", "All products" or "No products yet". */
function scopeLabel(products) {
  if (!products) return 'All products';
  if (!products.length) return 'No products yet';
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

/** Sets a user's access level (one of LEVEL_KEYS; if several are given, the highest counts). */
function setRoles(userId, keys) {
  const valid = LEVEL_KEYS.filter(k => (keys || []).includes(k));
  if (!valid.length) throw new Error('Choose an access level.');
  if (valid.includes('author') && valid.length > 1) throw new Error('External Author can\u2019t be combined with other levels.');
  db.prepare("UPDATE users SET role = ?, extra_roles = '[]' WHERE id = ?").run(valid[0], userId);
  if (ALL_PRODUCTS.has(valid[0]) || valid[0] === 'library') db.prepare("UPDATE users SET product_roles = '{}' WHERE id = ?").run(userId);
  return [valid[0]];
}

/** Sets which products a Publication Manager or Reviewer works on and their role on each: { product: roleKey }. */
function setProductRoles(userId, map) {
  const u = db.prepare('SELECT role, product_roles FROM users WHERE id = ?').get(userId);
  if (!u || ALL_PRODUCTS.has(u.role) || u.role === 'author' || u.role === 'library') return;
  const roles = productRoles();
  const keys = new Set(roles.map(r => r.key));
  const before = parseMap(u.product_roles);
  const clean = {};
  Object.entries(map || {}).forEach(([product, roleKey]) => {
    if (!PRODUCTS.includes(product)) return;
    if (!keys.has(roleKey)) throw new Error('Choose their role on ' + product.split(' ')[0] + '.');
    // Inactive products and roles stay with people who already have them, but can't be newly given.
    if (!ACTIVE_PRODUCTS.includes(product) && !(product in before)) throw new Error(product + ' is inactive.');
    const role = roles.find(r => r.key === roleKey);
    if (!role.active && before[product] !== roleKey) throw new Error(role.name + ' is inactive.');
    clean[product] = roleKey;
  });
  if (!Object.keys(clean).length) throw new Error('Choose at least one product and their role on it.');
  db.prepare('UPDATE users SET product_roles = ? WHERE id = ?').run(JSON.stringify(clean), userId);
}

function listRoles() {
  const counts = {};
  db.prepare('SELECT role FROM users').all().forEach(u => { counts[u.role] = (counts[u.role] || 0) + 1; });
  return db.prepare('SELECT * FROM roles ORDER BY sort, name').all().map(r => ({
    key: r.key,
    name: r.name,
    description: r.description || '',
    builtIn: true,
    allProducts: ALL_PRODUCTS.has(r.key),
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

/** Access level given to people who create their own account on the sign-in page. */
function signupRole() {
  const key = getSetting('signup_role', 'pub_manager');
  return roleRow(key) && !LOCKED[key] ? key : 'pub_manager';
}

function roleName(key) {
  const row = roleRow(key);
  return row ? row.name : key;
}

module.exports = {
  PERMISSIONS, PERM_KEYS, LOCKED, LEVEL_KEYS, ALL_PRODUCTS, PRODUCTS, PRODUCT_TA, normalize, permissionsOf, permissionsForUser,
  scopesOf, roleScopesOf, productRolesOf, setProductRoles, scopeLabel, rolesOf, roleNamesOf, setRoles, listRoles, roleRow, roleName,
  signupRole, getSetting, setSetting,
  // Kept for older callers: product scopes are set through setProductRoles now.
  setScopes: () => {},
};
