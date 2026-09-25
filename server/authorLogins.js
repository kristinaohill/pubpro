// Logins for external authors: each author profile with an email gets a user account
// (role "author") so the author can sign in to their External Author Dashboard.
const bcrypt = require('bcryptjs');
const db = require('./db');

// Shared starting password for new author logins; authors can change it from the account menu.
const DEFAULT_AUTHOR_PASSWORD = process.env.AUTHOR_DEFAULT_PASSWORD || 'Password2';

try {
  db.exec('ALTER TABLE users ADD COLUMN author_profile_id INTEGER');
} catch (e) { /* column already exists */ }

/** Creates or updates the login for one author profile row ({ id, name, email }). */
function ensureAuthorLogin(profile) {
  const email = String(profile.email || '').trim().toLowerCase();
  const linked = db.prepare('SELECT * FROM users WHERE author_profile_id = ?').get(profile.id);
  if (!email) return linked ? { user: linked, created: false } : null;
  const byEmail = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
  // Never take over a staff account that happens to share the email.
  if (byEmail && byEmail.role !== 'author') return null;
  if (linked) {
    if (!byEmail || byEmail.id === linked.id) {
      db.prepare('UPDATE users SET email = ?, name = ? WHERE id = ?').run(email, profile.name, linked.id);
    }
    return { user: linked, created: false };
  }
  if (byEmail) {
    db.prepare('UPDATE users SET name = ?, author_profile_id = ? WHERE id = ?').run(profile.name, profile.id, byEmail.id);
    return { user: byEmail, created: false };
  }
  const hash = bcrypt.hashSync(DEFAULT_AUTHOR_PASSWORD, 10);
  const r = db.prepare('INSERT INTO users (email, password_hash, name, role, author_profile_id) VALUES (?, ?, ?, ?, ?)')
    .run(email, hash, profile.name, 'author', profile.id);
  return { user: { id: r.lastInsertRowid }, created: true };
}

function removeAuthorLogin(profileId) {
  db.prepare("DELETE FROM users WHERE role = 'author' AND author_profile_id = ?").run(profileId);
}

/** Makes sure every existing author profile has its login. */
function backfillAuthorLogins() {
  const rows = db.prepare('SELECT id, name, email FROM pp_authors').all();
  let created = 0;
  rows.forEach(p => { const r = ensureAuthorLogin(p); if (r && r.created) created += 1; });
  if (created) console.log(`Created ${created} external author login(s).`);
}

module.exports = { ensureAuthorLogin, removeAuthorLogin, backfillAuthorLogins, DEFAULT_AUTHOR_PASSWORD };
