// Dropdown lists System Administrators manage (System Administrator > Dropdown lists). Each list has
// PubPro's defaults; the saved version lives in app_settings ('picklists'). Records store the option's
// text, so options are never deleted once saved (mark them inactive: records keep them, pickers stop
// offering them). "Locked" options are ones PubPro's own workflow relies on: they can't be renamed or
// turned off, but the list can still grow.
const P = require('./permissions');

const KEY = 'picklists';

const LISTS = [
  {
    key: 'departments', name: 'Departments', group: 'People and publications',
    usedIn: 'User profiles and the publication Overview tab',
    defaults: ['Medical Affairs', 'Clinical Development', 'Regulatory Affairs', 'Biostatistics', 'Health Economics & Outcomes Research', 'Legal', 'Pharmacovigilance', 'Publications'],
  },
  {
    key: 'authorSelectionReasons', name: 'Author selection reasons', group: 'Authors',
    usedIn: 'Authors tab: why each author was chosen (A2, GPP)',
    defaults: ['Principal or site investigator', 'Steering committee member', 'Study statistician or data analyst', 'Clinical or scientific expert', 'Sponsor medical or clinical lead', 'Other'],
    locked: ['Other'],
  },
  {
    key: 'abstractSubTypes', name: 'Abstract sub-types', group: 'Publications',
    usedIn: 'Publication Overview tab, for abstracts',
    defaults: ['Poster', 'Oral', 'Encore', 'Late Breaker'],
  },
  {
    key: 'sponsorTypes', name: 'Sponsor types', group: 'Publications',
    usedIn: 'Publication Overview tab',
    defaults: ['Company Sponsored', 'Investigator Sponsored'],
  },
  {
    key: 'citationTypes', name: 'Citation types', group: 'Publications',
    usedIn: 'Publication Citations tab',
    defaults: ['Journal Article', 'Congress Abstract', 'Poster', 'Book Chapter'],
  },
  {
    key: 'timezones', name: 'Embargo time zones', group: 'Publications',
    usedIn: 'Publication Outcome tab, embargo time',
    defaults: ['ET', 'CT', 'PT', 'GMT', 'CET'],
  },
  {
    key: 'reviewPriorities', name: 'Review priorities', group: 'Reviews',
    usedIn: 'Reviews tab, when sending a round',
    defaults: ['Standard Review', 'Expedited Review'],
    locked: ['Standard Review'],
  },
  {
    key: 'reviewMethods', name: 'Review methods', group: 'Reviews',
    usedIn: 'Reviews tab, when sending a round',
    defaults: ['Collaborative Edit', 'Comment Only', 'Read Only'],
    locked: ['Collaborative Edit', 'Comment Only', 'Read Only'],
  },
];

const defOf = key => LISTS.find(l => l.key === key);
const lockedIn = (def, label) => (def.locked || []).includes(label);

function saved() {
  try { const v = JSON.parse(P.getSetting(KEY, '{}')); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}

/** One list's options: [{ label, active, locked }], saved order, with any missing locked defaults kept. */
function items(key) {
  const def = defOf(key);
  if (!def) return [];
  const list = Array.isArray(saved()[key]) ? saved()[key] : def.defaults.map(label => ({ label, active: true }));
  const out = list.map(x => ({ label: x.label, active: x.active !== false, locked: lockedIn(def, x.label) }));
  (def.locked || []).forEach(l => { if (!out.some(x => x.label === l)) out.push({ label: l, active: true, locked: true }); });
  return out;
}
const active = key => items(key).filter(x => x.active).map(x => x.label);

/** Everything the app needs: each list's definition and options. */
function all() {
  return LISTS.map(({ key, name, group, usedIn }) => ({ key, name, group, usedIn, items: items(key) }));
}

/**
 * Saves one list: [{ label, active, was }] in order (was = its saved text, for a rename). Saved
 * options can't be removed (mark them inactive); locked ones can't be renamed or turned off.
 */
function save(key, next) {
  const def = defOf(key);
  if (!def) throw new Error('Unknown list.');
  if (!Array.isArray(next)) throw new Error('Nothing to save.');
  const before = items(key);
  const seen = new Set();
  const out = next.map(x => {
    const label = String(x.label || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!label) throw new Error('Every option needs text.');
    if (seen.has(label.toLowerCase())) throw new Error('“' + label + '” is in the list twice.');
    seen.add(label.toLowerCase());
    const was = x.was != null ? String(x.was) : null;
    if (was && was !== label && lockedIn(def, was)) throw new Error('“' + was + '” is used by PubPro’s workflow and can’t be renamed.');
    if (lockedIn(def, label) && x.active === false) throw new Error('“' + label + '” is used by PubPro’s workflow and can’t be turned off.');
    return { label, active: x.active !== false, was };
  });
  const gone = before.filter(b => !out.some(o => o.label === b.label || o.was === b.label));
  if (gone.length) throw new Error(gone.map(g => '“' + g.label + '”').join(', ') + ' can’t be removed: mark it inactive instead, so records that use it keep it.');
  if (!out.some(o => o.active)) throw new Error('Keep at least one option active.');
  const all = saved();
  all[key] = out.map(({ label, active: on }) => ({ label, active: on }));
  P.setSetting(KEY, JSON.stringify(all));
  return items(key);
}

module.exports = { LISTS, items, active, all, save };
