// One-time people renames. PubPro matches people by name in many places (authors, reviewers,
// owners, notifications, audit trails), so a rename rewrites the exact text everywhere it's stored.
// Emails are left alone.
const db = require('./db');

const RENAMES = [
  // Kristina, 2026-10-01: shown as "Christy PM" rather than her full last name.
  { key: 'rename-christy-pm-2026-10', pairs: [
    ['Christy Risser-Milne', 'Christy PM'],
    ['Christy_Risser_Milne', 'Christy_PM'], // generated agreement file names
    ['Authorship_Agreement_Risser-Milne_Signed', 'Authorship_Agreement_Christy_PM_Signed'],
  ] },
];

function run() {
  db.exec("CREATE TABLE IF NOT EXISTS app_seeds (key TEXT PRIMARY KEY, ran_at TEXT DEFAULT (datetime('now')))");
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all().map(t => t.name);
  for (const r of RENAMES) {
    if (db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get(r.key)) continue;
    let changed = 0;
    for (const t of tables) {
      const cols = db.prepare('PRAGMA table_info(' + t + ')').all().filter(c => /TEXT/i.test(c.type) && c.name !== 'email');
      for (const c of cols) {
        for (const [from, to] of r.pairs) {
          changed += db.prepare('UPDATE ' + t + ' SET ' + c.name + ' = REPLACE(' + c.name + ', ?, ?) WHERE ' + c.name + ' LIKE ?')
            .run(from, to, '%' + from + '%').changes;
        }
      }
    }
    db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run(r.key);
    if (changed) console.log('Rename ' + r.key + ': ' + changed + ' value(s) updated.');
  }
}

module.exports = { run };
