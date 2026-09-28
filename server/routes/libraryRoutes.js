// The Publication Library: every publication with a final disposition (its Outcome status is
// Accepted, and it isn't cancelled). These are public, so anyone signed in can read them, including
// Library Users, whose access is only this. Only the public parts of a record are sent.
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../auth');
const { PRODUCT_TA } = require('../products');

const parse = (t, f) => { try { return JSON.parse(t || ''); } catch (e) { return f; } };
const iso = mdy => { const m = String(mdy || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : ''; };
const today = () => new Date().toISOString().slice(0, 10);
// Public = Accepted, not cancelled, and past any embargo date (Outcome tab).
const isPublic = (row, d) => {
  if (row.status === 'Cancelled' || d.cancelled || d.outcomeStatus !== 'Accepted') return false;
  const embargo = iso(d.fields && d.fields.embargoDate);
  return !embargo || embargo <= today();
};

function authorsOf(d) {
  const internal = (d.internal || []).filter(a => !(a.invite && a.invite.status === 'declined'))
    .map(a => ({ name: a.display || a.name, affiliation: 'BP Logix' }));
  const external = (d.external || []).filter(a => !(a.invite && a.invite.status === 'declined'))
    .map(a => { const [person, ...aff] = String(a.name).split('-'); return { name: a.display || person, affiliation: aff.join('-') }; });
  return internal.concat(external);
}

function card(row, d) {
  const text = String(d.pubDocText || '').trim();
  return {
    id: row.id,
    recordId: row.record_id,
    title: (d.fields && (d.fields.pubTitle || d.fields.abbrevTitle)) || row.title,
    shortTitle: row.title,
    type: row.pub_type,
    subType: d.subType || '',
    product: row.product || '',
    therapeuticArea: PRODUCT_TA[row.product] || (d.fields && d.fields.therapeuticArea) || '',
    venue: (d.targets || [])[0] || '',
    owner: row.owner || '',
    // Date Published (the Outcome tab's status date once Accepted), as m/d/yyyy and ISO for sorting.
    published: (d.fields && d.fields.statusDate) || '',
    publishedIso: iso(d.fields && d.fields.statusDate),
    authors: authorsOf(d),
    studies: d.selectedStudies || [],
    updated: row.updated_at,
    excerpt: text.replace(/\s+/g, ' ').slice(0, 280),
  };
}

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, record_id, title, pub_type, product, status, owner, data, updated_at FROM pp_publications ORDER BY updated_at DESC').all();
  res.json(rows.map(r => ({ r, d: parse(r.data, {}) })).filter(x => isPublic(x.r, x.d)).map(x => card(x.r, x.d))
    .sort((a, b) => (b.publishedIso || '').localeCompare(a.publishedIso || '')));
});

router.get('/:id', requireAuth, (req, res) => {
  const r = db.prepare('SELECT id, record_id, title, pub_type, product, status, owner, data, updated_at FROM pp_publications WHERE id = ?').get(req.params.id);
  const d = r ? parse(r.data, {}) : null;
  if (!r || !isPublic(r, d)) return res.status(404).json({ error: 'That publication isn’t in the library.' });
  res.json({ ...card(r, d), text: String(d.pubDocText || ''), venues: d.targets || [] });
});

module.exports = router;
