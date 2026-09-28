// Server-side checks for the publication document's tracked changes. The document is a list of
// segments: { t: text, ins?: { by, uid, at }, del?: { by, uid, at } }. The editor (client
// trackChanges.js) records insertions and deletions; these rules stop a save from rewriting
// history it isn't allowed to.

const MAX_DOC_CHARS = 400000;

function clean(markup) {
  if (!Array.isArray(markup)) return null;
  const mark = m => (m && typeof m === 'object'
    ? { by: String(m.by || ''), uid: m.uid == null ? null : m.uid, at: String(m.at || '') }
    : undefined);
  return markup
    .filter(s => s && typeof s.t === 'string' && s.t.length)
    .map(s => {
      const out = { t: s.t };
      if (s.ins) out.ins = mark(s.ins);
      if (s.del) out.del = mark(s.del);
      return out;
    });
}

const visibleText = markup => markup.filter(s => !s.del).map(s => s.t).join('');
const markKey = (kind, m) => kind + '|' + (m.uid == null ? 'name:' + m.by : m.uid) + '|' + m.at;
const mine = (m, user) => m.uid != null && String(m.uid) === String(user.id);

/** Characters per tracked change (kind + person + save time), and in untracked ("plain") text. */
function tally(markup) {
  const keys = new Map();
  let plain = 0;
  for (const s of markup) {
    if (!s.ins) plain += s.t.length;
    for (const kind of ['ins', 'del']) {
      if (!s[kind]) continue;
      const k = markKey(kind, s[kind]);
      const cur = keys.get(k) || { len: 0, mark: s[kind] };
      cur.len += s.t.length;
      keys.set(k, cur);
    }
  }
  return { keys, plain };
}

/**
 * Returns an error message, or null when `next` is an allowed successor of `prev` for this user.
 * - New changes must carry the saving user's id (nobody can edit in someone else's name).
 * - Without doc.review: untracked text can't grow or shrink (edits are always tracked, nothing is
 *   accepted), and other people's changes can't be resolved. Undoing your own changes is fine.
 */
function checkEdit(prev, next, user, canReview) {
  const before = tally(prev);
  const after = tally(next);
  for (const [k, v] of after.keys) {
    if (!before.keys.has(k) && !mine(v.mark, user)) return 'Changes can only be saved under your own name.';
  }
  if (canReview) return null;
  if (after.plain !== before.plain) return 'Your role’s edits are always tracked, and only a reviewer can accept changes.';
  for (const [k, v] of before.keys) {
    if (mine(v.mark, user)) continue;
    const now = after.keys.get(k);
    if (!now || now.len < v.len) return 'Only a reviewer can accept or reject other people’s changes.';
  }
  return null;
}

/** The markup a saved record's document starts from (older records only have text). */
function markupOf(data) {
  const m = clean(data && data.pubDocMarkup);
  if (m) return m;
  const text = data && data.pubDocText;
  return text ? [{ t: String(text) }] : [];
}

module.exports = { clean, visibleText, checkEdit, markupOf, MAX_DOC_CHARS };
