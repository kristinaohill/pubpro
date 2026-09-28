// Review types (System Administrator > Review Types): who is required and who is optional on each
// kind of review round. A participant is { kind: 'internal_authors' | 'external_authors' } (that
// publication's authors, all of them), { kind: 'role', role } (one person holding that product role on
// the publication's product, round robin) or { kind: 'user', userId }. The Reviews tab resolves them.
// Admins can remove any review type: past rounds keep their type's name, so history is unaffected.
const db = require('./db');
const P = require('./permissions');
const catalog = require('./products');

const KEY = 'review_types';
// The review types the publication workflow has named steps for: they can't be renamed.
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
  if (!out.length) throw new Error('Keep at least one review type.');
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

// Round robin for product roles: who got the last review, per product and role ("product|role").
const ROTATION_KEY = 'review_rotation';
function rotation() {
  try { const v = JSON.parse(P.getSetting(ROTATION_KEY, '{}')); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
/** Records who was given a new round: picks = { roleKey: userId } on product. */
function recordPicks(product, picks) {
  if (!P.PRODUCTS.includes(product)) throw new Error('Unknown product.');
  const keys = new Set(catalog.productRoles().map(r => r.key));
  const r = rotation();
  Object.entries(picks || {}).forEach(([role, id]) => {
    if (keys.has(role) && db.prepare('SELECT 1 FROM users WHERE id = ?').get(Number(id))) r[product + '|' + role] = Number(id);
  });
  P.setSetting(ROTATION_KEY, JSON.stringify(r));
  return r;
}

module.exports = { list, save, rotation, recordPicks, BUILT_IN };
