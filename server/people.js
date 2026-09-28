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

const THERAPEUTIC_AREAS = ['Cardiovascular & Metabolism', 'Immunology', 'Neuroscience'];
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
  if (Array.isArray(body.therapeuticAreas)) out.therapeutic_areas = JSON.stringify(body.therapeuticAreas.filter(t => THERAPEUTIC_AREAS.includes(t)));
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
  return db.prepare("SELECT * FROM users WHERE active = 1 AND pending = 0 AND role != 'author' ORDER BY lower(name)").all()
    .map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, roles: P.rolesOf(u), roleName: P.roleNamesOf(u), ...profileFields(u) }));
}

// ---- Self sign-up rules (System Administrator > Sign-up) --------------------------------------
const SIGNUP_MODES = ['open', 'approval', 'closed'];
function signupRules() {
  const mode = P.getSetting('signup_mode', 'open');
  return {
    mode: SIGNUP_MODES.includes(mode) ? mode : 'open',
    domains: P.getSetting('signup_domains', '').split(',').map(d => d.trim().toLowerCase().replace(/^@/, '')).filter(Boolean),
    role: P.signupRole(),
  };
}
function setSignupRules({ mode, domains }) {
  if (mode != null) {
    if (!SIGNUP_MODES.includes(mode)) throw new Error('Unknown sign-up setting.');
    P.setSetting('signup_mode', mode);
  }
  if (domains != null) {
    const list = (Array.isArray(domains) ? domains : String(domains).split(/[\s,;]+/))
      .map(d => String(d).trim().toLowerCase().replace(/^@/, '')).filter(Boolean);
    const bad = list.find(d => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d));
    if (bad) throw new Error('“' + bad + '” isn’t an email domain (e.g. acme-pharma.com).');
    P.setSetting('signup_domains', [...new Set(list)].join(','));
  }
}

// ---- Directory people from the demo data, as real users (once per database) -------------------
// The sample records name these people as authors and reviewers; making them users connects the
// records to the pickers. They get an unguessable password: an administrator uses Reset Password
// to give someone access.
const SEED_KEY = 'directory-people-2026-09';
const SEED_PEOPLE = [
  ['Kristina Hill', 'pub_manager', 'Publication Manager', 'Publications', THERAPEUTIC_AREAS],
  ['Ina Ternal', 'writer', 'Senior Medical Writer', 'Publications', ['Immunology']],
  ['Priya Raman', 'writer', 'Medical Affairs - Publications', 'Medical Affairs', ['Immunology', 'Neuroscience']],
  ['Dana Ruiz', 'reviewer', 'Medical Director - Immunology', 'Medical Affairs', ['Immunology']],
  ['Lena Ortiz', 'reviewer', 'Regulatory Affairs', 'Regulatory Affairs', THERAPEUTIC_AREAS],
  ['Ben Cho', 'reviewer', 'Biostatistics', 'Biostatistics', THERAPEUTIC_AREAS],
  ['Tom Nakamura', 'reviewer', 'Health Economics & Outcomes Research', 'Health Economics & Outcomes Research', ['Cardiovascular & Metabolism', 'Immunology']],
  ['Marcus Webb', 'reviewer', 'Legal - Promotional Review', 'Legal', THERAPEUTIC_AREAS],
  ['Sofia Almeida', 'reviewer', 'Pharmacovigilance', 'Pharmacovigilance', THERAPEUTIC_AREAS],
];
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

module.exports = { THERAPEUTIC_AREAS, DEPARTMENTS, profileFields, readProfile, writeProfile, directory, oooNow, signupRules, setSignupRules };
