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

// admin always has everything; author is the external-author login (their own dashboard only).
const LOCKED = { admin: 'all', author: 'none' };
const BUILT_IN = [
  { key: 'admin', name: 'System Administrator', description: 'Full access, including users, roles and permissions.', permissions: PERM_KEYS },
  { key: 'pub_manager', name: 'Publication Manager', description: 'Runs publications and plans end to end.', permissions: ['pubs.edit', 'pubs.cancel', 'doc.edit', 'doc.review', 'plans.edit', 'authors.edit'] },
  { key: 'writer', name: 'Medical Writer', description: 'Writes and revises publications and their documents.', permissions: ['pubs.edit', 'doc.edit', 'doc.review'] },
  { key: 'reviewer', name: 'Reviewer', description: 'Reads publications and suggests tracked changes to the document.', permissions: ['doc.edit'] },
  { key: 'executive', name: 'Executive', description: 'Read-only access to publications, plans and dashboards.', permissions: [] },
  { key: 'author', name: 'External Author', description: 'External authors sign in to their own dashboard only. Logins come from external author profiles.', permissions: [] },
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

BUILT_IN.forEach((r, i) => {
  db.prepare('INSERT OR IGNORE INTO roles (key, name, description, permissions, built_in, sort) VALUES (?, ?, ?, ?, 1, ?)')
    .run(r.key, r.name, r.description, JSON.stringify(r.permissions), i);
});
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
  if (LOCKED[roleKey] === 'none') return [];
  const row = roleRow(roleKey);
  return row ? normalize(parseList(row.permissions)) : [];
}

function listRoles() {
  const counts = Object.fromEntries(db.prepare('SELECT role, COUNT(*) AS c FROM users GROUP BY role').all().map(r => [r.role, r.c]));
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

module.exports = { PERMISSIONS, PERM_KEYS, LOCKED, normalize, permissionsOf, listRoles, roleRow, roleName, signupRole, getSetting, setSetting };
