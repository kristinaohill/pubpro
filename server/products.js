// The catalog set up first on System Administrator: products (with their therapeutic area and the
// code used in record IDs) and product roles (the job someone does on a product, e.g. Medical
// Reviewer). Internal Publication Managers and Reviewers are then aligned to products, one role each.
//
// PRODUCTS and PRODUCT_TA are live: they're updated in place when products are saved, so modules that
// imported them see the change.
const db = require('./db');

db.exec('CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)');
// Which role an internal Publication Manager or Reviewer has on each of their products: { product: roleKey }.
try { db.exec('ALTER TABLE users ADD COLUMN product_roles TEXT'); } catch (e) { /* exists */ }
db.exec(`CREATE TABLE IF NOT EXISTS product_roles (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort INTEGER NOT NULL DEFAULT 100
)`);

// Retired roles are marked inactive rather than deleted, so people who hold them keep them.
try { db.exec('ALTER TABLE product_roles ADD COLUMN active INTEGER NOT NULL DEFAULT 1'); } catch (e) { /* exists */ }

const DEFAULT_PRODUCTS = [
  { name: 'Biologix (All)', ta: 'Cardiovascular & Metabolism', code: 'BLX' },
  { name: 'Daxafont (DMD)', ta: 'Neuroscience', code: 'DAXN' },
  { name: 'Daxafort (Atopic Dermatitis)', ta: 'Immunology', code: 'DAX' },
  { name: 'Triazapam (Dermatology)', ta: 'Immunology', code: 'TRZ' },
];
const DEFAULT_PRODUCT_ROLES = [
  ['publication_lead', 'Publication Lead', 'Owns the publications for the product.'],
  ['medical_writer', 'Medical Writer', 'Writes and revises the product’s publications.'],
  ['medical_reviewer', 'Medical Reviewer', 'Reviews for medical accuracy (MLR).'],
  ['legal_reviewer', 'Legal Reviewer', 'Reviews for legal and promotional risk (MLR).'],
  ['regulatory_reviewer', 'Regulatory Reviewer', 'Reviews for regulatory compliance (MLR).'],
  ['patent_attorney', 'Patent Attorney', 'Reviews for patent and IP disclosure risk.'],
  ['outcomes_reviewer', 'Outcomes Reviewer', 'Reviews health economics and outcomes content.'],
  ['reviewer_general', 'Reviewer', 'Reviews the product\u2019s publications.'],
];

const getSetting = (k, f) => { const r = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(k); return r ? r.value : f; };
const setSetting = (k, v) => db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, v);

// PRODUCTS holds every product (existing records and alignments keep working when one is retired);
// ACTIVE_PRODUCTS only the ones that can be picked for something new.
const PRODUCTS = [];
const ACTIVE_PRODUCTS = [];
const PRODUCT_TA = {};
let catalog = [];

function load() {
  let list = null;
  try { list = JSON.parse(getSetting('products', 'null')); } catch (e) { list = null; }
  catalog = (Array.isArray(list) && list.length ? list : DEFAULT_PRODUCTS).map(p => ({ ...p, active: p.active !== false }));
  PRODUCTS.splice(0, PRODUCTS.length, ...catalog.map(p => p.name));
  ACTIVE_PRODUCTS.splice(0, ACTIVE_PRODUCTS.length, ...catalog.filter(p => p.active).map(p => p.name));
  Object.keys(PRODUCT_TA).forEach(k => delete PRODUCT_TA[k]);
  catalog.forEach(p => { PRODUCT_TA[p.name] = p.ta; });
}
load();

const products = () => catalog.map(p => ({ ...p }));
const codeOf = name => (catalog.find(p => p.name === name) || {}).code || null;

/**
 * Saves the product list: [{ name, ta, code, active, was? }]. `was` is the old name of a renamed
 * product; its publications, plans and user alignments follow the new name. Saved products are
 * never removed: mark them inactive instead, so nothing that uses them breaks.
 */
function saveProducts(list) {
  if (!Array.isArray(list) || !list.length) throw new Error('Keep at least one product.');
  const names = new Set();
  const codes = new Set();
  const clean = list.map(p => {
    const name = String(p.name || '').trim().slice(0, 80);
    const ta = String(p.ta || '').trim().slice(0, 80);
    const code = String(p.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (!name || !ta || !code) throw new Error('Every product needs a name, a therapeutic area and a code.');
    if (names.has(name.toLowerCase())) throw new Error('Two products are called ' + name + '.');
    if (codes.has(code)) throw new Error('Two products use the code ' + code + '.');
    names.add(name.toLowerCase());
    codes.add(code);
    return { name, ta, code, active: p.active !== false, was: p.was && String(p.was) !== name ? String(p.was) : null };
  });
  const kept = new Set(clean.map(p => p.was || p.name));
  for (const old of catalog) {
    if (!kept.has(old.name)) throw new Error(old.name + ' can\u2019t be removed. Mark it inactive instead: its publications, plans and people keep it.');
  }
  if (!clean.some(p => p.active)) throw new Error('Keep at least one product active.');
  // Renames: records and alignments follow the new name.
  for (const p of clean.filter(x => x.was)) {
    db.prepare('UPDATE pp_publications SET product = ? WHERE product = ?').run(p.name, p.was);
    db.prepare('UPDATE pp_plans SET product = ? WHERE product = ?').run(p.name, p.was);
    for (const row of db.prepare("SELECT id, data FROM pp_publications WHERE data LIKE ?").all('%' + p.was + '%')) {
      let d; try { d = JSON.parse(row.data); } catch (e) { continue; }
      let changed = false;
      if (d.product === p.was) { d.product = p.name; changed = true; }
      if (Array.isArray(d.additionalProducts)) { d.additionalProducts = d.additionalProducts.map(x => (x === p.was ? (changed = true, p.name) : x)); }
      if (changed) db.prepare('UPDATE pp_publications SET data = ? WHERE id = ?').run(JSON.stringify(d), row.id);
    }
    for (const u of db.prepare('SELECT id, product_roles FROM users WHERE product_roles LIKE ?').all('%' + p.was + '%')) {
      let m; try { m = JSON.parse(u.product_roles); } catch (e) { continue; }
      if (m[p.was]) { m[p.name] = m[p.was]; delete m[p.was]; db.prepare('UPDATE users SET product_roles = ? WHERE id = ?').run(JSON.stringify(m), u.id); }
    }
  }
  setSetting('products', JSON.stringify(clean.map(({ name, ta, code, active }) => ({ name, ta, code, active }))));
  load();
  return products();
}

// ---- Product roles ----------------------------------------------------------------------------
if (!db.prepare('SELECT COUNT(*) AS c FROM product_roles').get().c) {
  DEFAULT_PRODUCT_ROLES.forEach(([key, name, description], i) => {
    db.prepare('INSERT OR IGNORE INTO product_roles (key, name, description, sort) VALUES (?, ?, ?, ?)').run(key, name, description, i);
  });
}
const productRoles = () => db.prepare('SELECT key, name, description, active FROM product_roles ORDER BY sort, name').all().map(r => ({ ...r, active: !!r.active }));
const productRoleName = key => (db.prepare('SELECT name FROM product_roles WHERE key = ?').get(key) || {}).name || key;
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'role';

/** Saves the product roles: [{ key?, name, description, active }]. Saved roles are marked inactive, never removed. */
function saveProductRoles(list) {
  if (!Array.isArray(list)) throw new Error('Nothing to save.');
  const seen = new Set();
  const clean = list.map(r => {
    const name = String(r.name || '').trim().slice(0, 60);
    if (!name) throw new Error('Name every role.');
    if (seen.has(name.toLowerCase())) throw new Error('Two roles are called ' + name + '.');
    seen.add(name.toLowerCase());
    return { key: r.key ? String(r.key) : null, name, description: String(r.description || '').trim().slice(0, 200), active: r.active !== false };
  });
  const keep = new Set(clean.filter(r => r.key).map(r => r.key));
  const held = new Set();
  db.prepare("SELECT product_roles FROM users WHERE product_roles IS NOT NULL AND active = 1").all()
    .forEach(u => { try { Object.values(JSON.parse(u.product_roles)).forEach(k => held.add(k)); } catch (e) { /* skip */ } });
  for (const r of productRoles()) {
    if (!keep.has(r.key)) throw new Error(r.name + ' can\u2019t be removed. Mark it inactive instead: people who have it keep it.');
  }
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM product_roles WHERE key NOT IN (' + [...keep].map(() => '?').join(',') + (keep.size ? ')' : "'')")).run(...keep);
    clean.forEach((r, i) => {
      let key = r.key;
      if (!key) { key = slug(r.name); for (let n = 2; db.prepare('SELECT 1 FROM product_roles WHERE key = ?').get(key); n += 1) key = slug(r.name) + '_' + n; }
      db.prepare('INSERT INTO product_roles (key, name, description, sort, active) VALUES (?, ?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET name = excluded.name, description = excluded.description, sort = excluded.sort, active = excluded.active')
        .run(key, r.name, r.description, i, r.active ? 1 : 0);
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return productRoles();
}

module.exports = { PRODUCTS, ACTIVE_PRODUCTS, PRODUCT_TA, products, codeOf, saveProducts, productRoles, productRoleName, saveProductRoles };
