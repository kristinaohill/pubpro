// Roles and permissions, managed from the System Administrator page. Every permission listed here
// is checked on the server (see requirePerm and the routes), not only hidden in the UI.
const db = require('./db');

const PERMISSIONS = [
  { key: 'pubs.edit', group: 'Publications', label: 'Create and edit publications', help: 'Details, authors, targets, reviews and planning. Without it, publications open read-only.' },
  { key: 'pubs.cancel', group: 'Publications', label: 'Cancel and reinstate publications', requires: ['pubs.edit'] },
  { key: 'doc.edit', group: 'Publication document', label: 'Edit the publication document', help: 'Edits are tracked and marked with the editor’s name.' },
  { key: 'doc.review', group: 'Publication document', label: 'Accept or reject anyone’s changes', help: 'Also lets the user turn change tracking off. Everyone else can only undo their own changes.', requires: ['doc.edit'] },
  { key: 'plans.edit', group: 'Plans and authors', label: 'Create and edit publication plans' },
  { key: 'authors.edit', group: 'Plans and authors', label: 'Create and edit external author profiles' },
  { key: 'admin.users', group: 'Administration', label: 'Manage users, roles and permissions' },
];
const PERM_KEYS = PERMISSIONS.map(p => p.key);

// admin always has everything; author is the external-author login: their own dashboard, plus
// tracked edits to the document of publications they're listed on (checked per record).
const LOCKED = { admin: 'all', author: 'fixed' };
const FIXED = { author: ['doc.edit'] };
const AUTHOR_DESCRIPTION = 'External authors sign in to their own dashboard and can suggest tracked changes to the documents of publications they\u2019re an author on. Logins come from external author profiles.';
const BUILT_IN = [
  { key: 'admin', name: 'System Administrator', description: 'Full access, including users, roles and permissions.', permissions: PERM_KEYS },
  { key: 'pub_manager', name: 'Publication Manager', description: 'Runs publications and plans end to end.', permissions: ['pubs.edit', 'pubs.cancel', 'doc.edit', 'doc.review', 'plans.edit', 'authors.edit'] },
  { key: 'writer', name: 'Medical Writer', description: 'Writes and revises publications and their documents.', permissions: ['pubs.edit', 'doc.edit', 'doc.review'] },
  { key: 'reviewer', name: 'Reviewer', description: 'Reads publications and suggests tracked changes to the document.', permissions: ['doc.edit'] },
  { key: 'executive', name: 'Executive', description: 'Read-only access to publications, plans and dashboards.', permissions: [] },
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
try { db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1'); } catch (e) { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN last_login_at TEXT'); } catch (e) { /* exists */ }
// Roles beyond the first (users.role). A user can hold several; their permissions combine.
try { db.exec('ALTER TABLE users ADD COLUMN extra_roles TEXT'); } catch (e) { /* exists */ }

BUILT_IN.forEach((r, i) => {
  db.prepare('INSERT OR IGNORE INTO roles (key, name, description, permissions, built_in, sort) VALUES (?, ?, ?, ?, 1, ?)')
    .run(r.key, r.name, r.description, JSON.stringify(r.permissions), i);
});
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
/** The combined permissions of all of a user's roles. */
function permissionsForUser(u) {
  const set = new Set();
  rolesOf(u).forEach(k => permissionsOf(k).forEach(p => set.add(p)));
  return PERM_KEYS.filter(k => set.has(k));
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

module.exports = { PERMISSIONS, PERM_KEYS, LOCKED, normalize, permissionsOf, permissionsForUser, rolesOf, roleNamesOf, setRoles, listRoles, roleRow, roleName, signupRole, getSetting, setSetting };
