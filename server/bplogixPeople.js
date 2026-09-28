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
  runInternal();
  runStaffSwap();
}

function runInternal() {
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

// ---- Every other sample staff person -> one of the five (once per database) --------------------
// Reviewers on rounds, mandatory/additional reviewers, checklist owners, audit lines, notifications,
// plan stakeholders and author-profile history. Priya Raman is also a real external author, so she's
// only switched where she appears as staff.
const STAFF_KEY = 'bplogix-staff-2026-09';
const STAFF_MAP = {
  'Dana Ruiz': 'Jack Bedel',
  'Ben Cho': 'Greg Vogel',
  'Tom Nakamura': 'Richa Garg',
  'Lena Ortiz': 'Richa Garg',
  'Pat Pending': 'Richa Garg',
  'Marcus Webb': 'Christy Risser-Milne',
  'Ina Ternal': 'Christy Risser-Milne',
  'Alejandra S\u00e1nchez': 'Christy Risser-Milne',
  'Sofia Almeida': 'Kristina Hill',
  'Joe Submitter': 'Kristina Hill',
};
const STAFF_ONLY = { 'Priya Raman': 'Christy Risser-Milne' }; // only in staff contexts
const FALLBACK_ORDER = ['Jack Bedel', 'Greg Vogel', 'Richa Garg', 'Christy Risser-Milne', 'Kristina Hill'];
const isExternalRole = role => /External/i.test(String(role || ''));

/** Maps the names in a list of people (reviewers), never putting the same person in twice. */
function mapPeopleList(list, getName, setName, isStaff, reserved = []) {
  const used = new Set(list.map(getName).filter(n => !STAFF_MAP[n] && !STAFF_ONLY[n]).concat(reserved));
  list.forEach(x => {
    const n = getName(x);
    const to = STAFF_MAP[n] || (isStaff(x) && STAFF_ONLY[n]);
    if (!to || !isStaff(x)) return;
    const pick = used.has(to) ? FALLBACK_ORDER.find(p => !used.has(p)) || to : to;
    setName(x, pick);
    used.add(pick);
  });
}

/** Replaces exact-match strings (names) anywhere in a JSON value. */
function mapStrings(v) {
  if (typeof v === 'string') return STAFF_MAP[v] || v;
  if (Array.isArray(v)) return v.map(mapStrings);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x)]));
  return v;
}
const mapLine = line => {
  const m = String(line).match(/^(.*?)( \[(.*)\])?$/);
  const role = m[3] || '';
  const to = STAFF_MAP[m[1]] || (!isExternalRole(role) && role && STAFF_ONLY[m[1]]);
  return to ? to + (m[2] || '') : line;
};

function swapPublication(d, sm) {
  const staff = v => v.kind !== 'external' && !isExternalRole(v.role);
  // The publication's internal authors are reviewers on its rounds too: never switch a reviewer to one.
  const authors = (d.internal || []).map(a => a.name);
  (d.rounds || []).forEach(r => mapPeopleList(r.reviewers || [], v => v.name, (v, n) => { v.name = n; }, staff, authors));
  const reviewers = (d.mandatory || []).concat(d.additional || []);
  mapPeopleList(reviewers, v => v.name, (v, n) => { v.name = n; }, v => !isExternalRole(v.role), authors);
  ['checklist', 'journalChecklist'].forEach(k => (d[k] || []).forEach(i => { if (STAFF_MAP[i.owner]) i.owner = STAFF_MAP[i.owner]; }));
  (d.audit || []).forEach(e => { if (e.participants) e.participants = String(e.participants).split('\n').map(mapLine).join('\n'); });
  // Audit notes such as "1 change by Dana Ruiz".
  (d.audit || []).forEach(e => {
    if (!e.comment) return;
    Object.entries(STAFF_MAP).forEach(([from, to]) => { e.comment = String(e.comment).split(from).join(to); });
  });
  // Tracked changes in the document: credit the real account (name and id).
  (d.pubDocMarkup || []).forEach(seg => ["ins", "del"].forEach(k => {
    const m = seg[k];
    if (!m || !STAFF_MAP[m.by]) return;
    const u = db.prepare("SELECT id FROM users WHERE name = ? AND role != 'author'").get(STAFF_MAP[m.by]);
    seg[k] = { ...m, by: STAFF_MAP[m.by], uid: u ? u.id : null };
  }));
  if (d.fields) ['delegateTo', 'reassignFrom'].forEach(k => { if (STAFF_MAP[d.fields[k]]) d.fields[k] = STAFF_MAP[d.fields[k]]; });
  if (d.cancelled && STAFF_MAP[d.cancelled.by]) d.cancelled.by = STAFF_MAP[d.cancelled.by];
  // The saved summary lists the open round's reviewers in order: take their new names from it.
  if (sm && Array.isArray(sm.people)) {
    const open = (d.rounds || []).find(r => r.status === 'open');
    if (open && open.reviewers && open.reviewers.length === sm.people.length) sm.people.forEach((p, i) => { p.name = open.reviewers[i].name; });
    else mapPeopleList(sm.people, p => p.name, (p, n) => { p.name = n; }, p => !isExternalRole(p.role), authors);
  }
}

function runStaffSwap() {
  if (db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get(STAFF_KEY)) return;
  let pubs = 0;
  for (const row of db.prepare('SELECT id, owner, data, summary FROM pp_publications').all()) {
    const d = parse(row.data, null);
    if (!d) continue;
    const sm = parse(row.summary, {});
    const before = JSON.stringify([d, sm, row.owner]);
    swapPublication(d, sm);
    const owner = STAFF_MAP[row.owner] || row.owner;
    if (JSON.stringify([d, sm, owner]) !== before) {
      db.prepare('UPDATE pp_publications SET owner = ?, data = ?, summary = ? WHERE id = ?').run(owner, JSON.stringify(d), JSON.stringify(sm), row.id);
      pubs += 1;
    }
  }
  // Plans and author profiles only name staff in plain fields (owners, stakeholders, history).
  let other = 0;
  for (const table of ['pp_plans', 'pp_authors']) {
    for (const row of db.prepare('SELECT id, owner, data FROM ' + table).all()) {
      const d = parse(row.data, null);
      const next = mapStrings(d);
      const owner = STAFF_MAP[row.owner] || row.owner;
      if (JSON.stringify(next) !== JSON.stringify(d) || owner !== row.owner) {
        db.prepare('UPDATE ' + table + ' SET owner = ?, data = ? WHERE id = ?').run(owner, JSON.stringify(next), row.id);
        other += 1;
      }
    }
  }
  // Notifications sent to or by sample staff go to the person who replaced them.
  let notes = 0;
  for (const [from, to] of Object.entries(STAFF_MAP)) {
    notes += db.prepare('UPDATE pp_notifications SET recipient = ? WHERE recipient = ?').run(to, from).changes;
    db.prepare('UPDATE pp_notifications SET sender = ? WHERE sender = ?').run(to, from);
  }
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run(STAFF_KEY);
  console.log('BP Logix people: sample staff replaced on ' + pubs + ' publication(s), ' + other + ' plan/author record(s), ' + notes + ' notification(s).');
}

module.exports = { run, DOMAIN, isInternalEmail: e => norm(e).endsWith('@' + DOMAIN) };
