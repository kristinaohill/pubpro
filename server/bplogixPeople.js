// BP Logix internal users (2026-09-28): internal users must have @bplogix.com emails. Runs once per
// database, after the routes have seeded their records:
//  1. the five BP Logix people become internal users (an existing account with their email or name
//     is updated, keeping its password);
//  2. internal accounts without a @bplogix.com email are cleaned up: the bootstrap admin moves to
//     admin@bplogix.com, the made-up sample staff (@acme-pharma.example) are removed, anyone else is
//     deactivated (reactivate after giving them a @bplogix.com email);
//  3. the internal authors on every publication are replaced one-for-one with the five people.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const P = require('./permissions');

const KEY = 'bplogix-internal-2026-09';
const DOMAIN = 'bplogix.com';

const PEOPLE = [
  { name: 'Kristina Hill', email: 'kristina.hill@bplogix.com', roles: ['admin', 'pub_manager'] },
  { name: 'Jack Bedel', email: 'jack.bedel@bplogix.com', roles: ['pub_manager'] },
  { name: 'Christy Risser-Milne', email: 'crissermilne@bplogix.com', roles: ['pub_manager'] },
  { name: 'Richa Garg', email: 'richa.garg@bplogix.com', roles: ['pub_manager'] },
  { name: 'Greg Vogel', email: 'greg.vogel@bplogix.com', roles: ['pub_manager'] },
];
const NEW_NAMES = PEOPLE.map(p => p.name);
// Who replaces whom on publications (anyone else gets the next person not already on that record).
const REPLACES = {
  'Ina Ternal': 'Christy Risser-Milne',
  'Lena Ortiz': 'Richa Garg',
  'Dana Ruiz': 'Jack Bedel',
  'Ben Cho': 'Greg Vogel',
  'Tom Nakamura': 'Jack Bedel',
  'Priya Raman': 'Richa Garg',
};

const norm = s => String(s || '').trim().toLowerCase();
const parse = (t, f) => { try { return JSON.parse(t || ''); } catch (e) { return f; } };

function ensurePeople() {
  for (const p of PEOPLE) {
    let u = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(p.email);
    if (!u) {
      // Same name on a staff account: prefer one someone really signed in with over a sample one.
      u = db.prepare(`SELECT * FROM users WHERE lower(name) = ? AND role != 'author'
        ORDER BY (email LIKE '%@acme-pharma.example'), (last_login_at IS NULL), id LIMIT 1`).get(norm(p.name));
      if (u) db.prepare('UPDATE users SET email = ?, name = ?, active = 1, pending = 0 WHERE id = ?').run(p.email, p.name, u.id);
    }
    if (!u) {
      const r = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
        .run(p.email, bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10), p.name, p.roles[0]);
      u = db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid);
    }
    if (u.role === 'author') continue; // never turn an external login into a staff one
    const roles = [...new Set(P.rolesOf(u).concat(p.roles))];
    P.setRoles(u.id, roles);
    db.prepare('UPDATE users SET active = 1, pending = 0 WHERE id = ?').run(u.id);
  }
}

function cleanUpAccounts() {
  const admin = db.prepare("SELECT id FROM users WHERE lower(email) = 'admin@example.com'").get();
  if (admin && !db.prepare("SELECT 1 FROM users WHERE lower(email) = 'admin@' || ?").get(DOMAIN)) {
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run('admin@' + DOMAIN, admin.id);
  }
  const outsiders = db.prepare("SELECT id, email, pending FROM users WHERE role != 'author' AND lower(email) NOT LIKE ?").all('%@' + DOMAIN);
  let removed = 0;
  let deactivated = 0;
  for (const u of outsiders) {
    if (u.pending || /@acme-pharma\.example$/i.test(u.email)) {
      try { db.prepare('DELETE FROM users WHERE id = ?').run(u.id); removed += 1; continue; } catch (e) { /* referenced: deactivate */ }
    }
    db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(u.id);
    deactivated += 1;
  }
  return { removed, deactivated };
}

/** Replaces a publication's internal authors with the five people, one-for-one. Returns true if changed. */
function replaceInternalAuthors(d, summary) {
  const internal = Array.isArray(d.internal) ? d.internal : [];
  if (!internal.length) return false;
  const taken = new Set(internal.map(a => a.name).filter(n => NEW_NAMES.includes(n)));
  const map = {};
  internal.forEach(a => {
    if (NEW_NAMES.includes(a.name) || map[a.name]) return;
    let to = REPLACES[a.name];
    if (!to || taken.has(to)) to = NEW_NAMES.find(n => !taken.has(n));
    if (!to) return; // more internal authors than people: leave the rest
    map[a.name] = to;
    taken.add(to);
  });
  if (!Object.keys(map).length) return false;
  const last = n => n.split(' ').slice(-1)[0];
  d.internal = internal.map(a => {
    const to = map[a.name];
    if (!to) return a;
    const agreement = a.agreement ? String(a.agreement).replace(last(a.name), last(to)) : a.agreement;
    return { ...a, name: to, display: to, agreement };
  });
  for (const k of ['presentingAuthor', 'correspondingAuthor']) if (map[d[k]]) d[k] = map[d[k]];
  if (d.authorMetaEdits && typeof d.authorMetaEdits === 'object') {
    Object.keys(map).forEach(from => {
      if (d.authorMetaEdits[from]) { d.authorMetaEdits[map[from]] = d.authorMetaEdits[from]; delete d.authorMetaEdits[from]; }
    });
  }
  // Their places in review rounds (as authors) and in the audit trail's participant lists.
  (d.rounds || []).forEach(r => (r.reviewers || []).forEach(v => { if (v.kind === 'internal' && map[v.name]) v.name = map[v.name]; }));
  // Audit lines: rename where marked [Internal Author], or where the name isn't also a reviewer here.
  const reviewers = new Set((d.rounds || []).flatMap(r => (r.reviewers || []).filter(v => v.kind !== 'internal').map(v => v.name))
    .concat((d.mandatory || []).map(v => v.name), (d.additional || []).map(v => v.name)));
  (d.audit || []).forEach(e => {
    if (!e.participants) return;
    e.participants = String(e.participants).split('\n').map(line => {
      const m = line.match(/^(.*?)( \[Internal Author\])?$/);
      return map[m[1]] && (m[2] || !reviewers.has(m[1])) ? map[m[1]] + (m[2] || '') : line;
    }).join('\n');
  });
  ['checklist', 'journalChecklist'].forEach(k => (d[k] || []).forEach(item => { if (map[item.owner]) item.owner = map[item.owner]; }));
  if (summary && Array.isArray(summary.people)) {
    summary.people.forEach(p => { if (map[p.name] && /Internal Author/.test(p.role || '')) p.name = map[p.name]; });
  }
  return true;
}

function run() {
  db.exec("CREATE TABLE IF NOT EXISTS app_seeds (key TEXT PRIMARY KEY, ran_at TEXT DEFAULT (datetime('now')))");
  if (db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get(KEY)) return;
  ensurePeople();
  const { removed, deactivated } = cleanUpAccounts();
  let pubs = 0;
  for (const row of db.prepare('SELECT id, data, summary FROM pp_publications').all()) {
    const d = parse(row.data, null);
    if (!d) continue;
    const sm = parse(row.summary, {});
    if (replaceInternalAuthors(d, sm)) {
      db.prepare('UPDATE pp_publications SET data = ?, summary = ? WHERE id = ?').run(JSON.stringify(d), JSON.stringify(sm), row.id);
      pubs += 1;
    }
  }
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run(KEY);
  console.log(`BP Logix people: ${PEOPLE.length} internal users set up; ${removed} sample account(s) removed, ${deactivated} deactivated; internal authors replaced on ${pubs} publication(s).`);
}

module.exports = { run, DOMAIN, isInternalEmail: e => norm(e).endsWith('@' + DOMAIN) };
