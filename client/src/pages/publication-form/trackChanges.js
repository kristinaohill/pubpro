/*
 * Tracked changes for the publication document, Word-style: every insertion and deletion keeps
 * who made it and when, until someone accepts or rejects it.
 *
 * The document is a list of segments: { t: text, ins?: mark, del?: mark }, mark = { by, uid, at }.
 * People edit the visible text (deletions hidden, insertions shown); fold() diffs that text
 * against the markup word by word and records the difference under the editor's name.
 * The server (server/docMarkup.js) re-checks every save against the editor's permissions.
 */

// Words, runs of spaces, and each punctuation mark on its own, so a change next to a full stop or
// bracket lines up with the text on either side (and saved change boundaries always fall between tokens).
const tokenize = s => String(s || '').match(/\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) || [];

const sameMark = (a, b) => (!a && !b) || (a && b && a.uid === b.uid && a.by === b.by && a.at === b.at);
const isMine = (m, author) => !!m && m.uid != null && String(m.uid) === String(author.uid);

/** Splits segments into word/space tokens, each carrying its segment's marks. */
function toTokens(markup) {
  const out = [];
  (markup || []).forEach(seg => tokenize(seg.t).forEach(t => out.push({ t, ins: seg.ins, del: seg.del })));
  return out;
}

/** Joins neighbouring tokens with the same marks back into segments. */
function toSegments(tokens) {
  const out = [];
  tokens.forEach(tok => {
    const last = out[out.length - 1];
    if (last && sameMark(last.ins, tok.ins) && sameMark(last.del, tok.del)) last.t += tok.t;
    else {
      const seg = { t: tok.t };
      if (tok.ins) seg.ins = tok.ins;
      if (tok.del) seg.del = tok.del;
      out.push(seg);
    }
  });
  return out;
}

export const visibleText = markup => (markup || []).filter(s => !s.del).map(s => s.t).join('');

/** The markup a saved record's document starts from (records saved before tracking only have text). */
export function markupFromSaved(data) {
  if (data && Array.isArray(data.pubDocMarkup)) return data.pubDocMarkup;
  const text = data && data.pubDocText;
  return text ? [{ t: String(text) }] : [];
}

/**
 * Myers diff (O(ND): fast when few words changed, however long the document) of token lists a, b.
 * Returns [['=', i, j] | ['-', i] | ['+', j]], or null past maxD edits.
 */
function myers(a, b, maxD) {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const off = max + 1;
  const V = new Int32Array(2 * max + 3);
  const trace = [];
  let D = -1;
  for (let d = 0; d <= max && D < 0; d += 1) {
    if (d > maxD) return null;
    for (let k = -d; k <= d; k += 2) {
      let x = (k === -d || (k !== d && V[off + k - 1] < V[off + k + 1])) ? V[off + k + 1] : V[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x += 1; y += 1; }
      V[off + k] = x;
      if (x >= n && y >= m) { D = d; break; }
    }
    trace.push(V.slice(off - d, off + d + 1));
  }
  const ops = [];
  let x = n;
  let y = m;
  for (let d = D; d > 0; d -= 1) {
    const prev = trace[d - 1];
    const get = kk => prev[kk + d - 1];
    const k = x - y;
    const prevK = (k === -d || (k !== d && get(k - 1) < get(k + 1))) ? k + 1 : k - 1;
    const prevX = get(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) { ops.push(['=', x - 1, y - 1]); x -= 1; y -= 1; }
    if (x === prevX) ops.push(['+', y - 1]);
    else ops.push(['-', x - 1]);
    x = prevX;
    y = prevY;
  }
  while (x > 0 && y > 0) { ops.push(['=', x - 1, y - 1]); x -= 1; y -= 1; }
  return ops.reverse();
}

/**
 * Word-level diff of two token lists: [['=', a, b] | ['-', a] | ['+', b]] with a/b the indexes.
 * The common start and end are trimmed first; a rewrite too large to diff (thousands of separate
 * edits in one save) is recorded as delete-all/insert-all of the changed middle.
 */
function diffTokens(a, b) {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA -= 1; endB -= 1; }
  const ops = [];
  for (let i = 0; i < start; i += 1) ops.push(['=', i, i]);
  const mid = myers(a.slice(start, endA), b.slice(start, endB), 2000);
  if (mid) {
    mid.forEach(op => ops.push(op[0] === '=' ? ['=', op[1] + start, op[2] + start] : [op[0], op[1] + start]));
  } else {
    for (let i = start; i < endA; i += 1) ops.push(['-', i]);
    for (let j = start; j < endB; j += 1) ops.push(['+', j]);
  }
  for (let i = endA, j = endB; i < a.length; i += 1, j += 1) ops.push(['=', i, j]);
  return ops;
}

/**
 * Records the edits in `text` (the new visible text) onto `markup` under `author` ({ by, uid, at }).
 * track=false (reviewers only) applies them without marks. Deleting your own pending insertion
 * simply removes it; deleting anything else marks it deleted.
 */
export function fold(markup, text, author, track = true) {
  if (visibleText(markup) === text) return markup;
  const all = toTokens(markup);
  const visIdx = [];
  all.forEach((tok, i) => { if (!tok.del) visIdx.push(i); });
  const oldVis = visIdx.map(i => all[i].t);
  const newToks = tokenize(text);
  const mark = { by: author.by, uid: author.uid, at: author.at };
  const out = [];
  let cursor = 0; // next index in `all` not yet copied
  const copyHiddenUpTo = idx => { for (; cursor < idx; cursor += 1) out.push(all[cursor]); };
  diffTokens(oldVis, newToks).forEach(op => {
    if (op[0] === '+') {
      out.push(track ? { t: newToks[op[1]], ins: mark } : { t: newToks[op[1]] });
      return;
    }
    const idx = visIdx[op[1]];
    copyHiddenUpTo(idx);
    cursor = idx + 1;
    const tok = all[idx];
    if (op[0] === '=') { out.push(tok); return; }
    if (!track || isMine(tok.ins, author)) return; // gone
    out.push({ ...tok, del: mark });
  });
  copyHiddenUpTo(all.length);
  return toSegments(out);
}

/**
 * The pending changes, in document order: { id, kind: 'ins'|'del', mark, text, segs: [indexes] }.
 * A segment that is both inserted and deleted counts as a deletion (the later action).
 */
export function listChanges(markup) {
  const out = [];
  (markup || []).forEach((seg, i) => {
    const kind = seg.del ? 'del' : seg.ins ? 'ins' : null;
    if (!kind) return;
    const mark = seg[kind];
    const last = out[out.length - 1];
    const adjacent = last && last.segs[last.segs.length - 1] === i - 1;
    if (adjacent && last.kind === kind && sameMark(last.mark, mark)) {
      last.segs.push(i);
      last.text += seg.t;
    } else out.push({ id: kind + ':' + i, kind, mark, text: seg.t, segs: [i] });
  });
  return out;
}

/** Accepts or rejects the given changes (from listChanges). */
export function resolve(markup, changes, action) {
  const plan = new Map();
  changes.forEach(c => c.segs.forEach(i => plan.set(i, c.kind)));
  const out = [];
  (markup || []).forEach((seg, i) => {
    const kind = plan.get(i);
    if (!kind) { out.push(seg); return; }
    const keep = { ...seg };
    if (kind === 'ins') {
      if (action === 'reject') return; // drop the inserted text
      delete keep.ins;
    } else {
      if (action === 'accept') return; // the deletion stands
      delete keep.del;
    }
    out.push(keep);
  });
  return toSegments(toTokens(out));
}

// Colours for people's changes (like Word's per-reviewer colours), readable on white.
const PALETTE = ['#1F6FB2', '#8A3FB5', '#0F7B72', '#B35C00', '#B0306A', '#3E6B1F', '#5B4BC4', '#8C5A12'];
export function personColor(name) {
  let h = 0;
  String(name || '').split('').forEach(ch => { h = (h * 31 + ch.charCodeAt(0)) >>> 0; });
  return PALETTE[h % PALETTE.length];
}

export const changeStamp = at => {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US') + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

/**
 * Accept all / Reject all (optionally only changes matching `pick`). Repeats because resolving a
 * deletion can uncover the insertion under it (text one person added and another deleted).
 */
export function resolveAll(markup, action, pick = () => true) {
  let out = markup;
  for (let pass = 0; pass < 3; pass += 1) {
    const todo = listChanges(out).filter(pick);
    if (!todo.length) break;
    out = resolve(out, todo, action);
  }
  return out;
}

/**
 * Rebases my unsaved edits onto a newer saved document (someone else saved first). My edits are
 * what changed from baseText (the version I started from) to mineText; they are applied straight
 * onto `latest` (its markup), anchored to the base text, so the other person’s insertions and
 * deletions are kept exactly as they saved them. Where we both inserted at one spot, mine go first.
 */
export function rebase(latest, baseText, mineText, author, track = true) {
  if (baseText === mineText) return latest;
  const all = toTokens(latest);
  const visIdx = [];
  all.forEach((tok, i) => { if (!tok.del) visIdx.push(i); });
  const vis = visIdx.map(i => all[i].t);
  const b = tokenize(baseText);
  const m = tokenize(mineText);
  const mineDel = new Set();
  const mineIns = new Map(); // base index the insertion follows (-1 = start) -> tokens
  let anchor = -1;
  diffTokens(b, m).forEach(op => {
    if (op[0] === "+") {
      if (!mineIns.has(anchor)) mineIns.set(anchor, []);
      mineIns.get(anchor).push(m[op[1]]);
      return;
    }
    if (op[0] === "-") mineDel.add(op[1]);
    anchor = op[1];
  });
  const mark = { by: author.by, uid: author.uid, at: author.at };
  const out = [];
  let cursor = 0;
  const copyHiddenUpTo = idx => { for (; cursor < idx; cursor += 1) out.push(all[cursor]); };
  const insertAfter = k => {
    if (!mineIns.has(k)) return;
    mineIns.get(k).forEach(t => out.push(track ? { t, ins: mark } : { t }));
    mineIns.delete(k);
  };
  insertAfter(-1);
  diffTokens(b, vis).forEach(op => {
    if (op[0] === "+") { // their insertion: keep as saved
      const idx = visIdx[op[1]];
      copyHiddenUpTo(idx);
      cursor = idx + 1;
      out.push(all[idx]);
      return;
    }
    if (op[0] === "=") {
      const idx = visIdx[op[2]];
      copyHiddenUpTo(idx);
      cursor = idx + 1;
      const tok = all[idx];
      if (!mineDel.has(op[1])) out.push(tok);
      else if (track && !isMine(tok.ins, author)) out.push({ ...tok, del: mark });
    }
    insertAfter(op[1]); // after a kept base token, or where one they deleted used to be
  });
  copyHiddenUpTo(all.length);
  mineIns.forEach(list => list.forEach(t => out.push(track ? { t, ins: mark } : { t })));
  return toSegments(out);
}
