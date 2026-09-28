// One-time: bring publications saved before the signing rule (2026-09-28) in line with it. Under
// the rule, accepting an invitation IS signing the authorship agreement (A1, A4), and drafting
// can't start until every author has signed. Older sample records had authors marked "accepted"
// with nothing signed, some with a draft already. Each such author gets a signature record dated
// the day they accepted, marked how: 'backfill' (sample data, not a real signature), and a record
// with a draft gets its drafting start set after those signatures. Authors still invited, or never
// invited, are left as they are: they sign when they accept.
const db = require('./db');
const { AGREEMENT } = require('./gates');

const KEY = 'signing-backfill-2026-09';
const mdyToDate = mdy => {
  const m = String(mdy || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? new Date(Date.UTC(+m[3], +m[1] - 1, +m[2], 15, 0, 0)) : null;
};
const usDate = d => (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '/' + d.getUTCFullYear();

function run() {
  db.exec("CREATE TABLE IF NOT EXISTS app_seeds (key TEXT PRIMARY KEY, ran_at TEXT DEFAULT (datetime('now')))");
  if (db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get(KEY)) return;
  const now = new Date();
  let touched = 0;
  for (const row of db.prepare('SELECT id, record_id, created_at, data FROM pp_publications').all()) {
    let d;
    try { d = JSON.parse(row.data || '{}'); } catch (e) { continue; }
    const fallback = new Date(String(row.created_at || '').replace(' ', 'T') + 'Z');
    const names = [];
    const times = [];
    ['internal', 'external'].forEach(group => {
      d[group] = (d[group] || []).map(a => {
        if (a.criteria && a.criteria.at) { times.push(a.criteria.at); return a; }
        if (a.selected === false || !a.invite || a.invite.status !== 'accepted') return a;
        let at = mdyToDate(a.invite.on) || (isNaN(fallback) ? now : fallback);
        if (at > now) at = now;
        const person = group === 'external' ? String(a.name).split('-')[0].trim() : a.name;
        names.push(person);
        times.push(at.toISOString());
        return {
          ...a,
          criteria: { at: at.toISOString(), on: usDate(at), by: 'PubPro (sample data)', how: 'backfill', agreementVersion: AGREEMENT.version, agreementHash: AGREEMENT.hash },
          agreement: 'Authorship_Agreement_' + row.record_id + '_' + person.replace(/[^\w]+/g, '_') + '.pdf',
          agreementDate: usDate(at),
        };
      });
    });
    let started = false;
    if (d.pubDoc && !d.draftStartedAt && times.length) {
      const last = new Date(times.sort().pop());
      d.draftStartedAt = new Date(Math.min(now.getTime(), last.getTime() + 60 * 60 * 1000)).toISOString();
      started = true;
    }
    if (!names.length && !started) continue;
    const on = usDate(now);
    d.audit = (d.audit || []).concat([{
      action: 'Sample Data Updated', participants: names.join('\n') || 'PubPro', start: on, completed: on, result: 'Signing rule applied', active: false,
      comment: 'Sample record saved before authors signed from their invitation (A1, A4). '
        + (names.length ? 'Signed agreements backfilled for authors who had accepted. ' : '')
        + (started ? 'Drafting start set after those signatures.' : ''),
    }]);
    db.prepare('UPDATE pp_publications SET data = ? WHERE id = ?').run(JSON.stringify(d), row.id);
    touched += 1;
  }
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run(KEY);
  if (touched) console.log('Signing rule applied to ' + touched + ' earlier publication(s).');
}

module.exports = { run };
