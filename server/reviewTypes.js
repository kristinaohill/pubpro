// Review types (System Administrator > Review Types): who is required and who is optional on each
// kind of review round. A participant is { kind: 'internal_authors' | 'external_authors' } (that
// publication's authors), { kind: 'role', role } (everyone holding the role whose product scope
// covers the publication) or { kind: 'user', userId }. The Reviews tab resolves them per record.
const db = require('./db');
const P = require('./permissions');
const catalog = require('./products');

const KEY = 'review_types';
// The review types the publication workflow has steps for: they can't be renamed or deleted.
const BUILT_IN = ['Internal Draft Review', 'Partner Review', 'Author Draft Review', 'Stats / Data QC', 'Compliance and IP Review', 'Author Approval', 'Internal Release Approval'];

const INTERNAL = { kind: 'internal_authors' };
const EXTERNAL = { kind: 'external_authors' };
const role = key => ({ kind: 'role', role: key });

// Reviewer roles for MLR (medical, legal, regulatory) review, added once as ordinary custom roles.
const MLR_ROLES = [
  ['medical_reviewer', 'Medical Reviewer', 'Reviews publications for medical accuracy (MLR).'],
  ['legal_reviewer', 'Legal Reviewer', 'Reviews publications for legal and promotional risk (MLR).'],
  ['regulatory_reviewer', 'Regulatory Reviewer', 'Reviews publications for regulatory compliance (MLR).'],
];

function defaults() {
  const t = (name, required, optional, builtIn = true) => ({ name, builtIn, required, optional });
  return [
    t('Internal Draft Review', [], [INTERNAL]),
    t('Partner Review', [], [INTERNAL]),
    t('Author Draft Review', [INTERNAL, EXTERNAL], []),
    t('Stats / Data QC', [], [INTERNAL]),
    t('Compliance and IP Review', [], [INTERNAL]),
    t('Author Approval', [INTERNAL, EXTERNAL], []),
    t('Internal Release Approval', [], [INTERNAL]),
    t('MLR Review', MLR_ROLES.map(([k]) => role(k)), [INTERNAL], false),
  ];
}

function clean(list) {
  if (!Array.isArray(list)) throw new Error('Nothing to save.');
  const seen = new Set();
  const part = x => {
    if (!x || typeof x !== 'object') return null;
    if (x.kind === 'internal_authors' || x.kind === 'external_authors') return { kind: x.kind };
    if (x.kind === 'role' && catalog.productRoles().some(r => r.key === String(x.role))) return { kind: 'role', role: String(x.role) };
    if (x.kind === 'user' && db.prepare("SELECT 1 FROM users WHERE id = ? AND role != 'author'").get(x.userId)) return { kind: 'user', userId: Number(x.userId) };
    return null;
  };
  const id = x => x.kind + ':' + (x.role || x.userId || '');
  const out = list.map(t => {
    const name = String(t.name || '').trim().slice(0, 60);
    if (!name) throw new Error('Name every review type.');
    if (seen.has(name.toLowerCase())) throw new Error('Two review types are called ' + name + '.');
    seen.add(name.toLowerCase());
    const required = (t.required || []).map(part).filter(Boolean);
    const reqIds = new Set(required.map(id));
    const optional = (t.optional || []).map(part).filter(Boolean).filter(x => !reqIds.has(id(x)));
    return { name, builtIn: BUILT_IN.includes(name), active: t.active !== false, required, optional };
  });
  const missing = BUILT_IN.filter(n => !out.some(t => t.name === n));
  if (missing.length) throw new Error(missing.join(', ') + ' is part of the publication workflow and can\u2019t be removed. Mark it inactive instead.');
  if (!out.some(t => t.active)) throw new Error('Keep at least one review type active.');
  return out;
}

function list() {
  const raw = P.getSetting(KEY, '');
  try { const v = JSON.parse(raw); if (Array.isArray(v)) return v; } catch (e) { /* not set yet */ }
  return defaults();
}
function save(next) {
  const out = clean(next);
  // Saved review types are marked inactive, never removed (past rounds keep their type).
  const gone = list().filter(t => !out.some(x => x.name === t.name || (t.name && next.some(n => n.was === t.name && n.name === x.name))));
  if (gone.length) throw new Error(gone.map(t => t.name).join(', ') + ' can\u2019t be removed. Mark it inactive instead.');
  P.setSetting(KEY, JSON.stringify(out));
  return out;
}

// Once per database: MLR reviewer roles, the default review types, and any role that was marked
// "Required reviewer" (the old per-role switch) becomes required on every review type.
db.exec("CREATE TABLE IF NOT EXISTS app_seeds (key TEXT PRIMARY KEY, ran_at TEXT DEFAULT (datetime('now')))");
if (!db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get('review-types-2026-09')) {
  const types = defaults();
  let flagged = [];
  try { flagged = db.prepare('SELECT key FROM roles WHERE auto_review = 1').all().map(r => r.key); } catch (e) { /* no column */ }
  flagged.forEach(k => types.forEach(t => { if (!t.required.some(x => x.role === k)) t.required.push(role(k)); }));
  P.setSetting(KEY, JSON.stringify(types));
  try { db.exec('UPDATE roles SET auto_review = 0'); } catch (e) { /* no column */ }
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run('review-types-2026-09');
}

// Once: participants that were access levels (earlier model) become the matching product role.
if (!db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get('review-types-product-roles-2026-09')) {
  const MAP = { writer: 'medical_writer', pub_manager: 'publication_lead', executive: 'publication_lead', reviewer: 'reviewer_general' };
  const keys = new Set(catalog.productRoles().map(r => r.key));
  const fix = parts => parts.map(x => (x.kind === 'role' && !keys.has(x.role) ? (MAP[x.role] ? { kind: 'role', role: MAP[x.role] } : null) : x)).filter(Boolean);
  const types = list().map(t => ({ ...t, required: fix(t.required || []), optional: fix(t.optional || []) }));
  P.setSetting(KEY, JSON.stringify(types));
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run('review-types-product-roles-2026-09');
}

module.exports = { list, save, BUILT_IN };
