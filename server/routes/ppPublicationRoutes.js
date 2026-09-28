const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requirePerm, can, blockAuthors } = require('../auth');
const doc = require('../docMarkup');
const { ACTIVE_PRODUCTS } = require('../products');
// Retired (inactive) products stay on the records that have them but can't be picked for new ones.
const retired = (product, current) => product && product !== current && !ACTIVE_PRODUCTS.includes(product)
  ? product + ' is inactive, so it can\u2019t be picked for a publication.' : null;
const { productCode, yearCode, nextSequence } = require('../recordIds');

// Record IDs follow the PubPro pattern: <yy>-<type>-<product>-<seq>-V01, e.g. 26-M-DAX-015-V01.
const TYPE_CODES = { Abstract: 'A', Poster: 'AP', Manuscript: 'M', 'Congress Presentation': 'CP' };
const STATUSES = ['Draft', 'Active', 'In Review', 'Cancelled'];

// Publications saved as Draft before 'Active' existed become Active if author invitations have gone out.
for (const row of db.prepare("SELECT id, data FROM pp_publications WHERE status = 'Draft'").all()) {
  let d = {};
  try { d = JSON.parse(row.data || '{}'); } catch (e) { continue; }
  const sent = (d.internal || []).concat(d.external || []).some(a => a.invite && a.invite.status && a.invite.status !== 'none');
  if (sent) db.prepare("UPDATE pp_publications SET status = 'Active' WHERE id = ?").run(row.id);
}

// The design's example publication, seeded once so its links open a real record.
const SAMPLE_RECORD_ID = '26-A-DAX-004-V01';

function nextRecordId(pubType, product) {
  const prefix = `${yearCode()}-${TYPE_CODES[pubType] || 'X'}-${productCode(product)}-`;
  const rows = db.prepare('SELECT record_id FROM pp_publications WHERE record_id LIKE ?').all(prefix + '%');
  return prefix + nextSequence(rows.map(r => r.record_id), prefix) + '-V01';
}

// External authors only see publications that list them as an author or reviewer.
const norm = s => String(s || '').trim().toLowerCase();
function involves(dataText, person) {
  const d = parse(dataText, {});
  const who = norm(person);
  const names = (d.internal || []).map(a => a.name)
    .concat((d.external || []).map(a => String(a.name).split('-')[0]))
    .concat((d.rounds || []).flatMap(r => (r.reviewers || []).map(v => v.name)));
  return names.some(n => norm(n) === who);
}
// If you can see it you can edit it: staff see the publications their roles let them edit (for
// the record's product), plus, for now, Reviewers see the ones they can review. External authors see
// the publications that list them.
const canSee = (req, row) => (req.user.role === 'author'
  ? involves(row.data, req.user.name)
  : can(req, 'pubs.edit', row.product || null) || can(req, 'doc.edit', row.product || null));

const LIST_COLUMNS = 'id, record_id, title, pub_type, product, status, owner, summary, created_at, updated_at';

const parse = (text, fallback) => {
  try { return JSON.parse(text || ''); } catch { return fallback; }
};
const listRow = row => (row ? { ...row, summary: parse(row.summary, {}) } : row);
const getListRow = id => listRow(db.prepare(`SELECT ${LIST_COLUMNS} FROM pp_publications WHERE id = ?`).get(id));

// The document's text and tracked changes are only written through PUT /:id/document, so a form
// save (or one from a dashboard) never overwrites someone's document edits with a stale copy.
const DOC_KEYS = ['pubDocText', 'pubDocMarkup', 'pubDocTrack', 'pubDocVersion'];
function keepDocument(dataJson, existingData) {
  const next = parse(dataJson, {});
  const prev = existingData || {};
  DOC_KEYS.forEach(k => { if (k in prev) next[k] = prev[k]; else delete next[k]; });
  return JSON.stringify(next);
}

/** Why a scoped role can't act on this product, e.g. "Your Medical Writer role covers Daxafort only." */
function outOfScope(req, perm, product) {
  const P = require('../permissions');
  const u = db.prepare('SELECT role, extra_roles, role_scopes, product_roles FROM users WHERE id = ?').get(req.user.id) || {};
  const holders = P.scopesOf(u).filter(sc => P.permissionsOf(sc.role).includes(perm) && sc.products);
  const what = product ? String(product).split(' ')[0] : 'this product';
  if (!holders.length) return 'Your role does not allow this for ' + what + '.';
  return holders.map(sc => 'As a ' + P.roleName(sc.role) + ' you work on ' + P.scopeLabel(sc.products)).join('; ') + ', not ' + what + '.';
}

function readBody(body) {
  return {
    title: String(body.title || '').trim(),
    pubType: String(body.pub_type || '').trim(),
    product: body.product || null,
    status: STATUSES.includes(body.status) ? body.status : 'Draft',
    summary: JSON.stringify(body.summary || {}),
    data: JSON.stringify(body.data || {}),
  };
}

// ?include=data adds each record's full data (the dashboard and reports chart from it).
router.get('/', requireAuth, (req, res) => {
  const full = req.query.include === 'data';
  const rows = db.prepare(`SELECT ${LIST_COLUMNS}, data FROM pp_publications ORDER BY updated_at DESC, id DESC`).all()
    .filter(r => canSee(req, r));
  res.json(rows.map(({ data, ...r }) => (full ? { ...listRow(r), data: parse(data, {}) } : listRow(r))));
});

router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!row || !canSee(req, row)) return res.status(404).json({ error: 'Publication not found' });
  res.json({ ...listRow(row), data: parse(row.data, {}) });
});

router.post('/', requireAuth, blockAuthors, requirePerm('pubs.edit'), (req, res) => {
  const { title, pubType, product, status, summary } = readBody(req.body);
  if (!can(req, 'pubs.edit', product)) return res.status(403).json({ error: outOfScope(req, 'pubs.edit', product) });
  if (retired(product)) return res.status(400).json({ error: retired(product) });
  const data = keepDocument(readBody(req.body).data, {});
  if (!title) return res.status(400).json({ error: 'A title is required to save the publication.' });
  if (!TYPE_CODES[pubType]) return res.status(400).json({ error: 'Choose a publication type.' });
  const recordId = nextRecordId(pubType, product);
  const r = db.prepare(`INSERT INTO pp_publications (record_id, title, pub_type, product, status, owner, summary, data, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(recordId, title, pubType, product, status, req.user.name || null, summary, data, req.user.id || null);
  res.json(getListRow(r.lastInsertRowid));
});

// Returns the sample record, creating it from the posted data the first time.
router.post('/sample', requireAuth, blockAuthors, (req, res) => {
  const existing = db.prepare('SELECT id FROM pp_publications WHERE record_id = ?').get(SAMPLE_RECORD_ID);
  if (existing) return res.json(getListRow(existing.id));
  const { title, pubType, product, status, summary, data } = readBody(req.body);
  if (!title || !TYPE_CODES[pubType]) return res.status(400).json({ error: 'The sample record needs a title and type.' });
  try {
    const r = db.prepare(`INSERT INTO pp_publications (record_id, title, pub_type, product, status, owner, summary, data, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(SAMPLE_RECORD_ID, title, pubType, product, status, 'Kristina Hill', summary, data, req.user.id || null);
    res.json(getListRow(r.lastInsertRowid));
  } catch (e) {
    // Two tabs (or a double-mounted page) raced to seed it; return the one that won.
    const won = db.prepare('SELECT id FROM pp_publications WHERE record_id = ?').get(SAMPLE_RECORD_ID);
    if (!won) throw e;
    res.json(getListRow(won.id));
  }
});

// Publication Type and the record ID are fixed once the record exists.
router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT id, data, product FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!existing || !canSee(req, existing)) return res.status(404).json({ error: 'Publication not found' });
  // External authors update their own invitation and review responses (their dashboard); staff need pubs.edit.
  if (req.user.role !== 'author' && !can(req, 'pubs.edit')) return res.status(403).json({ error: 'Your role does not allow editing publications.' });
  const { title, product, status, summary } = readBody(req.body);
  // Roles limited to some products: the record must be in scope before and after the change.
  if (req.user.role !== 'author') {
    for (const p of [existing.product, product]) {
      if (!can(req, 'pubs.edit', p)) return res.status(403).json({ error: outOfScope(req, 'pubs.edit', p) });
    }
  }
  if (!title) return res.status(400).json({ error: 'A title is required to save the publication.' });
  if (retired(product, existing.product)) return res.status(400).json({ error: retired(product, existing.product) });
  const prevData = parse(existing.data, {});
  const data = keepDocument(readBody(req.body).data, prevData);
  if (!!prevData.cancelled !== !!parse(data, {}).cancelled && !can(req, 'pubs.cancel', existing.product)) {
    return res.status(403).json({ error: 'Your role does not allow cancelling or reinstating publications.' });
  }
  db.prepare(`UPDATE pp_publications SET title = ?, product = ?, status = ?, summary = ?, data = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(title, product, status, summary, data, req.params.id);
  res.json(getListRow(req.params.id));
});

// ---- The publication document: live co-editing -------------------------------------------
// A light stand-in for real co-authoring (the product would use Office 365): the editor autosaves
// every second or so with the version it started from, and polls /presence every ~2 seconds for
// who else is in the document and for newer versions. A save based on an older version gets a 409
// with the latest document; the client merges its edits onto it and saves again.

const docOut = d => ({
  pubDoc: d.pubDoc, pubDocMarkup: doc.markupOf(d), pubDocText: d.pubDocText || '',
  pubDocTrack: d.pubDocTrack !== false, pubDocVersion: d.pubDocVersion || 0, audit: d.audit || [],
});

// Who has each document open: pubId -> Map(userId -> { name, uid, section, editing, at }).
const presence = new Map();
const PRESENCE_TTL_MS = 15000;
function activeViewers(pubId) {
  const room = presence.get(String(pubId));
  if (!room) return [];
  const now = Date.now();
  for (const [k, v] of room) if (now - v.at > PRESENCE_TTL_MS) room.delete(k);
  return [...room.values()];
}

/**
 * Heartbeat from an open document: { section, editing, knownVersion, leaving }. Answers with the
 * other people in the document and, when the saved version is newer than knownVersion, the document.
 */
router.post('/:id/document/presence', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT id, data, product FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!existing || !canSee(req, existing)) return res.status(404).json({ error: 'Publication not found' });
  const key = String(existing.id);
  if (!presence.has(key)) presence.set(key, new Map());
  const room = presence.get(key);
  if (req.body.leaving) room.delete(String(req.user.id));
  else {
    room.set(String(req.user.id), {
      name: req.user.name, uid: req.user.id, at: Date.now(),
      section: String(req.body.section || '').slice(0, 80), editing: !!req.body.editing,
    });
  }
  const data = parse(existing.data, {});
  const version = data.pubDocVersion || 0;
  const others = activeViewers(key).filter(v => String(v.uid) !== String(req.user.id))
    .map(({ name, uid, section, editing }) => ({ name, uid, section, editing }));
  const newer = req.body.knownVersion != null && Number(req.body.knownVersion) !== version;
  res.json({ viewers: others, version, document: newer ? docOut(data) : undefined });
});

// Autosaves arrive every second or so: one audit entry per person per editing session (30 min).
const SESSION_MS = 30 * 60 * 1000;

/**
 * Saves the publication document: { markup, track, audit, baseVersion }. markup is the full list
 * of segments (text plus tracked insertions/deletions); the server derives the plain text and
 * checks the change against the user's permissions (docMarkup.checkEdit).
 * External authors (doc.edit is fixed on their role) may only edit publications that list them.
 */
router.put('/:id/document', requireAuth, requirePerm('doc.edit'), (req, res) => {
  const existing = db.prepare('SELECT id, data, product FROM pp_publications WHERE id = ?').get(req.params.id);
  if (!existing || !canSee(req, existing)) return res.status(404).json({ error: 'Publication not found' });
  if (!can(req, 'doc.edit', existing.product)) return res.status(403).json({ error: outOfScope(req, 'doc.edit', existing.product) });
  const data = parse(existing.data, {});
  if (data.cancelled) return res.status(400).json({ error: 'This publication is cancelled. Reinstate it to change the document.' });
  const version = data.pubDocVersion || 0;
  if (req.body.baseVersion != null && Number(req.body.baseVersion) !== version) {
    return res.status(409).json({ error: 'Someone else changed the document. Merging their changes\u2026', document: docOut(data) });
  }
  const next = doc.clean(req.body.markup);
  if (!next) return res.status(400).json({ error: 'Nothing to save.' });
  if (next.reduce((n, x) => n + x.t.length, 0) > doc.MAX_DOC_CHARS) return res.status(400).json({ error: 'The document is too long to save here.' });
  const canReview = can(req, 'doc.review', existing.product);
  const problem = doc.checkEdit(doc.markupOf(data), next, req.user, canReview);
  if (problem) return res.status(403).json({ error: problem });
  data.pubDocMarkup = next;
  data.pubDocText = doc.visibleText(next);
  data.pubDocVersion = version + 1;
  if (canReview && typeof req.body.track === 'boolean') data.pubDocTrack = req.body.track;
  if (!data.pubDoc) data.pubDoc = 'new';
  const a = req.body.audit;
  if (a && typeof a === 'object' && a.action) {
    const str = v => String(v == null ? '' : v).slice(0, 500);
    const entry = {
      action: str(a.action), participants: req.user.name, start: str(a.start), completed: str(a.completed),
      result: str(a.result), active: false, comment: str(a.comment), at: new Date().toISOString(),
    };
    const log = (data.audit || []).slice();
    // Look back through the run of document saves at the end of the log for this person’s entry
    // from the same session (people editing together interleave), and update it in place.
    let k = -1;
    if (entry.action === 'Publication Document Saved') {
      for (let i = log.length - 1; i >= 0 && log[i].action === entry.action; i -= 1) {
        if (log[i].participants === entry.participants && log[i].at && Date.now() - Date.parse(log[i].at) < SESSION_MS) { k = i; break; }
      }
    }
    if (k >= 0) log[k] = { ...log[k], comment: entry.comment, completed: entry.completed, at: entry.at };
    else log.push(entry);
    data.audit = log;
  }
  db.prepare("UPDATE pp_publications SET data = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(data), existing.id);
  res.json(docOut(data));
});

router.delete('/:id', requireAuth, blockAuthors, requirePerm('pubs.edit'), (req, res) => {
  const row = db.prepare('SELECT product FROM pp_publications WHERE id = ?').get(req.params.id);
  if (row && !can(req, 'pubs.edit', row.product)) return res.status(403).json({ error: outOfScope(req, 'pubs.edit', row.product) });
  const r = db.prepare('DELETE FROM pp_publications WHERE id = ?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Publication not found' });
  res.json({ success: true });
});

// One-time starter records (server/seeds/demo-publications.json) so the dashboards have data to
// show. Runs once per database: the key goes in app_seeds, so deleting the records keeps them gone.
const DEMO_SEED_KEY = 'demo-publications-2026-09';
db.exec("CREATE TABLE IF NOT EXISTS app_seeds (key TEXT PRIMARY KEY, ran_at TEXT DEFAULT (datetime('now')))");
if (!db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get(DEMO_SEED_KEY)) {
  const demo = require('../seeds/demo-publications.json');
  const insert = db.prepare(`INSERT INTO pp_publications (record_id, title, pub_type, product, status, owner, summary, data, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`);
  for (const r of demo) {
    insert.run(nextRecordId(r.pub_type, r.product), r.title, r.pub_type, r.product, r.status, r.owner,
      JSON.stringify(r.summary), JSON.stringify(r.data));
  }
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run(DEMO_SEED_KEY);
  console.log('Added ' + demo.length + ' demo publications.');
}

// Two accepted (published) demo publications for the Publication Library, once per database.
const LIBRARY_SEED_KEY = 'library-demo-2026-09';
if (!db.prepare('SELECT 1 FROM app_seeds WHERE key = ?').get(LIBRARY_SEED_KEY)) {
  const accepted = { status: 'accepted', sent: '5/4/2026', on: '5/6/2026' };
  const ext = (id, name, display) => ({ id, selected: true, corr: 'optional', name, display, invite: accepted });
  const int = (id, name) => ({ id, selected: true, corr: id === 1 ? 'required' : 'optional', name, display: name, invite: accepted });
  const records = [
    {
      title: 'CLARITY-CAD Primary Results', pubType: 'Manuscript', product: 'Biologix (All)',
      data: {
        pubType: 'Manuscript', product: 'Biologix (All)', subType: '', outcomeStatus: 'Accepted', selectedStudies: ['100220'],
        targets: ['Journal of the American College of Cardiology'],
        fields: { abbrevTitle: 'CLARITY-CAD Primary Results', pubTitle: 'Biologix in Non-Obstructive Coronary Artery Disease: Primary Results of the Phase 3 CLARITY-CAD Trial', therapeuticArea: 'Cardiovascular & Metabolism', dateSubmitted: '3/2/2026', statusDate: '6/15/2026' },
        internal: [int(1, 'Richa Garg'), int(2, 'Greg Vogel')],
        external: [ext(1, 'Helen Marsh-Mayo Clinic', 'Helen Marsh'), ext(2, 'Steve Altschuler-UCLA School of Medicine', 'Steve Altschuler')],
        pubDoc: 'new',
        pubDocText: 'Background\nPatients with angina and non-obstructive coronary artery disease have few evidence-based treatment options.\n\nMethods\nIn CLARITY-CAD, 1,204 adults were randomized 1:1 to Biologix or placebo for 52 weeks. The primary endpoint was change in Seattle Angina Questionnaire summary score.\n\nResults\nBiologix improved the summary score by 9.4 points versus 3.1 with placebo (difference 6.3; 95% CI 4.1 to 8.5; p<0.001). Serious adverse events were similar between groups.\n\nConclusions\nBiologix improved angina-related quality of life in patients with non-obstructive coronary artery disease.',
        audit: [],
      },
    },
    {
      title: 'DXN-301 Interim Motor Function', pubType: 'Abstract', product: 'Daxafont (DMD)',
      data: {
        pubType: 'Abstract', product: 'Daxafont (DMD)', subType: 'Poster', outcomeStatus: 'Accepted', selectedStudies: ['100230'],
        targets: ['World Muscle Society Congress'],
        fields: { abbrevTitle: 'DXN-301 Interim Motor Function', pubTitle: 'Daxafont and Motor Function in Ambulatory Boys with Duchenne Muscular Dystrophy: DXN-301 Interim Analysis', therapeuticArea: 'Neuroscience', dateSubmitted: '5/20/2026', statusDate: '9/10/2026' },
        internal: [int(1, 'Christy Risser-Milne')],
        external: [ext(1, 'Kenji Sato-University of Tokyo', 'Kenji Sato')],
        pubDoc: 'new',
        pubDocText: 'Background\nDaxafont is an investigational exon-skipping therapy for Duchenne muscular dystrophy (DMD).\n\nMethods\nDXN-301 randomized 96 ambulatory boys aged 4 to 7 years to Daxafont or placebo. This interim analysis reports 48-week change in North Star Ambulatory Assessment (NSAA).\n\nResults\nNSAA declined by 0.8 points with Daxafont versus 3.2 with placebo (p=0.004). Infusion reactions were mild.\n\nConclusions\nDaxafont slowed motor function decline over 48 weeks.',
        audit: [],
      },
    },
  ];
  const insert = db.prepare(`INSERT INTO pp_publications (record_id, title, pub_type, product, status, owner, summary, data, created_by)
    VALUES (?, ?, ?, ?, 'Active', 'Kristina Hill', '{}', ?, NULL)`);
  records.forEach(r => insert.run(nextRecordId(r.pubType, r.product), r.title, r.pubType, r.product, JSON.stringify(r.data)));
  db.prepare('INSERT INTO app_seeds (key) VALUES (?)').run(LIBRARY_SEED_KEY);
  console.log('Added ' + records.length + ' published publications for the library.');
}

module.exports = router;
