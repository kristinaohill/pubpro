// Staff profiles (title, department, therapeutic areas, phone, out of office) and the people
// directory the author, reviewer and task pickers draw from. Also the self sign-up rules.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const P = require('./permissions');

for (const col of [
  'title TEXT', 'department TEXT', 'phone TEXT', 'therapeutic_areas TEXT',
  'ooo_from TEXT', 'ooo_to TEXT', 'ooo_note TEXT', 'pending INTEGER NOT NULL DEFAULT 0',
]) {
  try { db.exec('ALTER TABLE users ADD COLUMN ' + col); } catch (e) { /* column already exists */ }
}

// Therapeutic areas are the products' areas (System Administrator > Products).
const therapeuticAreas = () => [...new Set(Object.values(P.PRODUCT_TA))];
const DEPARTMENTS = ['Medical Affairs', 'Clinical Development', 'Regulatory Affairs', 'Biostatistics', 'Health Economics & Outcomes Research', 'Legal', 'Pharmacovigilance', 'Publications'];

const parseList = t => { try { const v = JSON.parse(t || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
const isoDate = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const today = () => new Date().toISOString().slice(0, 10);

/** Out of office right now (dates are inclusive ISO days); null otherwise. */
function oooNow(u) {
  const from = u.ooo_from;
  const to = u.ooo_to;
  if (!from && !to) return null;
  const d = today();
  if ((from && d < from) || (to && d > to)) return null;
  return { from: from || '', to: to || '', note: u.ooo_note || '' };
}

/** The profile fields as the API shows them. */
function profileFields(u) {
  return {
    title: u.title || '',
    department: u.department || '',
    phone: u.phone || '',
    therapeuticAreas: parseList(u.therapeutic_areas),
    ooo: { from: u.ooo_from || '', to: u.ooo_to || '', note: u.ooo_note || '' },
    oooNow: oooNow(u),
  };
}

/** Validated column values from a request body (only the keys present are returned). */
function readProfile(body) {
  const out = {};
  const str = (k, max) => { if (body[k] != null) out[k] = String(body[k]).trim().slice(0, max); };
  str('title', 80);
  str('department', 80);
  str('phone', 40);
  if (Array.isArray(body.therapeuticAreas)) out.therapeutic_areas = JSON.stringify(body.therapeuticAreas.filter(t => therapeuticAreas().includes(t)));
  if (body.ooo && typeof body.ooo === 'object') {
    out.ooo_from = isoDate(body.ooo.from);
    out.ooo_to = isoDate(body.ooo.to);
    out.ooo_note = String(body.ooo.note || '').trim().slice(0, 300);
    if (out.ooo_from && out.ooo_to && out.ooo_to < out.ooo_from) throw new Error('The out-of-office end date is before the start date.');
  }
  return out;
}

function writeProfile(userId, cols) {
  const keys = Object.keys(cols);
  if (!keys.length) return;
  db.prepare('UPDATE users SET ' + keys.map(k => k + ' = ?').join(', ') + ' WHERE id = ?').run(...keys.map(k => cols[k]), userId);
}

/** Active, approved staff: who the pickers offer. */
function directory() {
  const autoRoles = new Set(db.prepare('SELECT key FROM roles WHERE auto_review = 1').all().map(r => r.key));
  return db.prepare("SELECT * FROM users WHERE active = 1 AND pending = 0 AND role NOT IN ('author', 'library') ORDER BY lower(name)").all()
    .map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role, roles: P.rolesOf(u), roleName: P.roleNamesOf(u), ...profileFields(u),
      // Their role on each of their products ({ product: productRoleKey }): review types bring in
      // whoever holds a product role on the publication's product.
      productRoles: P.productRolesOf(u),
      // Roles marked "required reviewer" and the products they cover: added to rounds automatically.
      reviewFor: P.scopesOf(u).filter(sc => autoRoles.has(sc.role))
        .map(sc => ({ role: sc.role, roleName: P.roleName(sc.role), products: sc.products, label: P.scopeLabel(sc.products) })),
    }));
}

// ---- Directory people from the demo data, as real users (once per database) -------------------
// The sample records name these people as authors and reviewers; making them users connects the
// records to the pickers. They get an unguessable password: an administrator uses Reset Password
// to give someone access.
const SEED_KEY = 'directory-people-2026-09';
// Superseded (2026-09-28): internal users are the BP Logix people set up in bplogixPeople.js.
const SEED_PEOPLE = [];
db.exec("CREATE TABLE IF NOT EXISTS app_seeds (key TEXT PRIMARY KEY, ran_at TEXT DEFAULT (datetime('now')))");
if (!db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get(SEED_KEY)) {
  let added = 0;
  for (const [name, role, title, department, tas] of SEED_PEOPLE) {
    const existing = db.prepare("SELECT * FROM users WHERE lower(name) = lower(?) AND role != 'author'").get(name);
    if (existing) {
      // Someone by that name already signed up: only fill in what they haven't.
      writeProfile(existing.id, {
        ...(existing.title ? {} : { title }),
        ...(existing.department ? {} : { department }),
        ...(existing.therapeutic_areas ? {} : { therapeutic_areas: JSON.stringify(tas) }),
      });
      continue;
    }
    const email = name.toLowerCase().replace(/[^a-z]+/g, '.') + '@acme-pharma.example';
    if (db.prepare('SELECT 1 FROM users WHERE lower(email) = ?').get(email)) continue;
    db.prepare('INSERT INTO users (email, password_hash, name, role, title, department, therapeutic_areas) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(email, bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10), name, role, title, department, JSON.stringify(tas));
    added += 1;
  }
  // Marie Dubois-style auto-replies in the sample data become a real out-of-office for one reviewer.
  db.prepare("UPDATE users SET ooo_from = ?, ooo_to = ?, ooo_note = ? WHERE lower(name) = 'tom nakamura' AND ooo_from IS NULL")
    .run('2026-09-26', '2026-10-09', 'At ISPOR Europe, then on leave. Back 10/12.');
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run(SEED_KEY);
  if (added) console.log('Added ' + added + ' directory people as users.');
}

// ---- External authors named on the sample publications, as author profiles (once) -------------
// Their names on publications are "Name-Institution", so the profile's institution matches that.
const EXT_SEED_KEY = 'external-directory-2026-09';
const EXT_PEOPLE = [
  ['Steve Altschuler', 'UCLA School of Medicine', '2/11/2026'],
  ['Priya Raman', 'Karolinska Institutet', '1/8/2026'],
  ['Helen Marsh', 'Mayo Clinic', ''],
  ['Kenji Sato', 'University of Tokyo', ''],
  ['Marie Dubois', 'H\u00f4pital Saint-Louis', '8/10/2025'],
  ['Henrik Lund', 'Karolinska University Hospital', ''],
  ['Raj Patel', 'Imperial College London', '8/11/2026'],
  ['Amara Okafor', 'Imperial College London', ''],
];
if (!db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get(EXT_SEED_KEY)) {
  const { yearCode, nextSequence } = require('./recordIds');
  let added = 0;
  for (const [name, institution, coi] of EXT_PEOPLE) {
    if (db.prepare('SELECT 1 FROM pp_authors WHERE lower(name) = lower(?)').get(name)) continue;
    const prefix = 'EA-' + yearCode() + '-';
    const ids = db.prepare('SELECT author_id FROM pp_authors WHERE author_id LIKE ?').all(prefix + '%').map(r => r.author_id);
    const [firstName, ...rest] = name.split(' ');
    const form = { firstName, middleInitial: '', lastName: rest.join(' '), displayName: name, email: '', confirmEmail: '', institution, street: '', city: '', state: '', country: '', zip: '' };
    const signedCoi = coi ? { file: 'ConflictOfInterest-' + name.replace(/\s+/g, '') + '.pdf', created: coi, by: name, signedOn: coi } : null;
    const data = { active: true, form, na: false, manual: true, checks: [], agreements: [], coi: [], signedCoi, studies: [], audit: [] };
    const summary = { displayName: name, institution, location: '', lastCheck: '', lastCheckClear: null, pending: 0, studies: 0 };
    db.prepare('INSERT INTO pp_authors (author_id, name, email, status, owner, summary, data, created_by) VALUES (?, ?, NULL, ?, ?, ?, ?, NULL)')
      .run(prefix + nextSequence(ids, prefix), name, 'Active', 'Kristina Hill', JSON.stringify(summary), JSON.stringify(data));
    added += 1;
  }
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run(EXT_SEED_KEY);
  if (added) console.log('Added ' + added + ' external author profiles.');
}

// ---- Every external author has an email (and so a sign-in) ------------------------------------
// Email is required on external authors (2026-09-28). Profiles without one get
// firstname.lastname@bpl.com; the startup backfill (authorLogins.js) then gives each a login.
const slugPart = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
function placeholderEmail(name) {
  const parts = String(name).trim().split(/\s+/);
  const base = [slugPart(parts[0]), slugPart(parts.length > 1 ? parts[parts.length - 1] : '')].filter(Boolean).join('.') || 'author';
  const taken = e => db.prepare('SELECT 1 FROM users WHERE lower(email) = ? UNION SELECT 1 FROM pp_authors WHERE lower(email) = ?').get(e, e);
  let email = base + '@bpl.com';
  for (let n = 2; taken(email); n += 1) email = base + n + '@bpl.com';
  return email;
}
const EMAIL_SEED_KEY = 'external-emails-2026-09';
if (!db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get(EMAIL_SEED_KEY)) {
  // The design's sample author (EA-24-001, Kristina Oconnell) is otherwise only created when someone
  // opens /external-author; make sure she exists. Opening the sample page later fills in the rest.
  const sampleEmail = 'koconnell920@gmail.com';
  if (!db.prepare("SELECT 1 FROM pp_authors WHERE author_id = 'EA-24-001' OR lower(email) = ?").get(sampleEmail)) {
    const form = { firstName: 'Kristina', middleInitial: '', lastName: 'Oconnell', displayName: 'Oconnell K', email: sampleEmail, confirmEmail: sampleEmail, institution: '', street: '', city: 'Charleston', state: 'South Carolina', country: 'United States', zip: '' };
    db.prepare("INSERT INTO pp_authors (author_id, name, email, status, owner, summary, data, created_by, created_at) VALUES ('EA-24-001', ?, ?, 'Active', 'Kristina Hill', ?, ?, NULL, '2024-09-06 16:20:00')")
      .run('Kristina Oconnell', sampleEmail, JSON.stringify({ displayName: 'Oconnell K', location: 'Charleston, South Carolina, United States' }),
        JSON.stringify({ active: true, form, na: true, manual: false, checks: [], agreements: [], coi: [], signedCoi: null, studies: [], audit: [], seededMinimal: true }));
  }
  let filled = 0;
  for (const a of db.prepare("SELECT id, name, data FROM pp_authors WHERE email IS NULL OR trim(email) = ''").all()) {
    const email = placeholderEmail(a.name);
    let d = {};
    try { d = JSON.parse(a.data || '{}'); } catch (e) { d = {}; }
    d.form = { ...(d.form || {}), email, confirmEmail: email };
    db.prepare("UPDATE pp_authors SET email = ?, data = ?, updated_at = datetime('now') WHERE id = ?").run(email, JSON.stringify(d), a.id);
    filled += 1;
  }
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run(EMAIL_SEED_KEY);
  if (filled) console.log('Gave ' + filled + ' external author(s) an @bpl.com email.');
}

// Sign-up is gone (2026-09-28): anyone still waiting for approval becomes a deactivated user, so an
// administrator can reactivate them from the Internal users tab if they should have access.
if (!db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get('no-signup-2026-09')) {
  const n = db.prepare('UPDATE users SET pending = 0, active = 0 WHERE pending = 1').run().changes;
  db.prepare("DELETE FROM app_settings WHERE key IN ('signup_mode', 'signup_domains', 'signup_role')").run();
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run('no-signup-2026-09');
  if (n) console.log('Sign-up removed: ' + n + ' waiting account(s) are now deactivated users.');
}

module.exports = { placeholderEmail, therapeuticAreas, DEPARTMENTS, profileFields, readProfile, writeProfile, directory, oooNow };
