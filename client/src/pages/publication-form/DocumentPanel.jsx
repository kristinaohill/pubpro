import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Icon, TextArea } from '../../ds/pubpro';
import { api } from '../../api';
import { auditEntry } from './state';
import { changeStamp, fold, listChanges, personColor, rebase, resolve, resolveAll, visibleText } from './trackChanges';
import './DocumentPanel.css';

const wordCount = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
const quote = s => {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return '“' + (t.length > 60 ? t.slice(0, 57) + '…' : t) + '”';
};
const initials = name => String(name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

const AUTOSAVE_MS = 900;
const POLL_MS = 2000;

/** The heading of the part of the document at `pos` (a short line with no end punctuation). */
function sectionAt(text, pos) {
  const lines = String(text).slice(0, pos).split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const l = lines[i].trim();
    if (l && l.length <= 60 && !/[.!?,;:]$/.test(l) && i < lines.length - 1) return l;
  }
  return '';
}

/** Where the caret should go after the text changes from `before` to `after` elsewhere. */
function mapCaret(pos, before, after) {
  let p = 0;
  while (p < before.length && p < after.length && before[p] === after[p]) p += 1;
  let sfx = 0;
  while (sfx < before.length - p && sfx < after.length - p && before[before.length - 1 - sfx] === after[after.length - 1 - sfx]) sfx += 1;
  if (pos <= p) return pos;
  if (pos >= before.length - sfx) return pos + (after.length - before.length);
  return p + (after.length - p - sfx);
}

/**
 * The publication document, docked bottom-right like a compose window, edited live: it autosaves
 * as you type, shows who else has it open (and which section they're in), and pulls in other
 * people's edits every couple of seconds. Two people saving at once are merged, not overwritten.
 * (A stand-in for real co-authoring, which the product would get from Office 365.)
 *
 * Tracked changes, Word-style: Edit records your edits under your name; Changes shows everyone's
 * insertions and deletions in their colour, to accept or reject (doc.review) or undo your own.
 *
 * props: pubId (saved record id, or null before the first save), me ({ by, uid }), canEdit,
 * canReview, savedMarkup (as last synced), putDocument(body) -> saved doc (throws; a 409 carries
 * the latest document), onSynced(doc, override) applies a saved/remote document to st, optionally
 * with local { text, markup } on top (unsaved typing, or edits rebased onto someone else’s save).
 */
export default function DocumentPanel({ st, set, putDocument, onSynced, pubId, savedMarkup, recordId, me, canEdit, canReview, onClose }) {
  const [size, setSize] = useState('docked'); // 'docked' | 'expanded' | 'minimized'
  const [view, setView] = useState('edit'); // 'edit' | 'changes'
  const [who, setWho] = useState('all'); // person filter in Changes
  const [selected, setSelected] = useState(null); // change id
  const [sync, setSync] = useState({ state: 'saved', error: '' }); // saved | saving | error
  const [viewers, setViewers] = useState([]);
  const [activity, setActivity] = useState(''); // "Dana Ruiz edited Results" after a remote update
  const bodyRef = useRef(null);
  const editorRef = useRef(null);

  const text = st.pubDocText || '';
  const markup = st.pubDocMarkup || [];
  const version = st.pubDocVersion || 0;
  // Only reviewers can switch tracking off; everyone else's edits are always tracked.
  const tracking = st.pubDocTrack !== false || !canReview;
  const dirty = canEdit && (visibleText(markup) !== text || markup !== savedMarkup);

  // Latest values for timers and async saves.
  const live = useRef({});
  live.current = { st, text, markup, version, tracking, savedMarkup, dirty, putDocument, onSynced };
  const inFlight = useRef(false);
  const again = useRef(false);
  const nextAudit = useRef(null); // accept/reject: logged with the next save
  const sessionBase = useRef(savedMarkup); // for "N tracked changes" in this editing session
  const caret = useRef(null); // { start, end, before } while applying someone else's edit

  const stampNow = () => ({ ...me, at: new Date().toISOString() });
  const mine = c => c.mark.uid != null && String(c.mark.uid) === String(me.uid);

  // ---- Saving -----------------------------------------------------------------------------
  const textarea = () => editorRef.current && editorRef.current.querySelector('textarea');

  /** Applies a document from the server, keeping the caret where it was relative to the text. */
  const applyDoc = (doc, override) => {
    const ta = textarea();
    if (ta && document.activeElement === ta) caret.current = { start: ta.selectionStart, end: ta.selectionEnd, before: live.current.text };
    live.current.onSynced(doc, override);
  };
  useLayoutEffect(() => {
    const c = caret.current;
    const ta = textarea();
    if (!c || !ta) return;
    caret.current = null;
    ta.setSelectionRange(mapCaret(c.start, c.before, text), mapCaret(c.end, c.before, text));
  }, [text]);

  const save = useCallback(async () => {
    if (!canEdit) return;
    if (inFlight.current) { again.current = true; return; }
    const cur = live.current;
    if (!cur.dirty && !nextAudit.current) return;
    inFlight.current = true;
    setSync({ state: 'saving', error: '' });
    const folded = fold(cur.markup, cur.text, stampNow(), cur.tracking);
    const baseAts = new Set(listChanges(sessionBase.current || []).map(c => c.mark.at));
    const added = listChanges(folded).filter(c => mine(c) && !baseAts.has(c.mark.at)).length;
    const audit = nextAudit.current || auditEntry('Publication Document Saved', {
      comment: wordCount(visibleText(folded)) + ' words' + (cur.tracking ? '' : ' · tracking off') + (added ? ' · ' + plural(added, 'tracked change') : ''),
    });
    try {
      const res = await cur.putDocument({ markup: folded, track: cur.st.pubDocTrack !== false, audit, baseVersion: cur.version });
      nextAudit.current = null;
      // Keep anything typed while the save was on its way.
      const typedSince = live.current.text !== cur.text;
      applyDoc(res, typedSince ? { text: live.current.text } : undefined);
      if (typedSince) again.current = true;
      setSync({ state: 'saved', error: '' });
    } catch (err) {
      if (err.status === 409 && err.data && err.data.document) {
        // Someone saved first: put my edits on top of theirs, then save again.
        const latest = err.data.document;
        const now = live.current;
        const rebased = rebase(latest.pubDocMarkup, visibleText(now.savedMarkup || []), now.text, stampNow(), now.tracking);
        applyDoc(latest, { markup: rebased, text: visibleText(rebased) });
        if (nextAudit.current) {
          // An accept/reject made against the older version isn’t carried over.
          nextAudit.current = null;
          setSync({ state: 'error', error: 'someone else edited at the same moment. Please accept or reject that change again.' });
        } else {
          again.current = true;
          setSync({ state: 'saving', error: '' });
        }
      } else {
        setSync({ state: 'error', error: err.message });
      }
    } finally {
      inFlight.current = false;
      if (again.current) { again.current = false; setTimeout(() => save(), 50); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  // Autosave shortly after typing stops.
  useEffect(() => {
    if (!dirty) return undefined;
    const t = setTimeout(save, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [text, markup, dirty, save]);

  // ---- Presence and other people's edits ----------------------------------------------------
  const [section, setSection] = useState('');
  const noteCaret = () => { const ta = textarea(); if (ta) setSection(sectionAt(ta.value, ta.selectionStart)); };

  useEffect(() => {
    if (!pubId) return undefined;
    let stopped = false;
    const beat = async () => {
      const cur = live.current;
      try {
        const r = await api.post('/pp-publications/' + pubId + '/document/presence', {
          section: sectionRef.current, editing: canEdit && viewRef.current === 'edit', knownVersion: cur.version,
        });
        if (stopped) return;
        setViewers(r.viewers || []);
        if (r.document && r.document.pubDocVersion !== cur.version) {
          if (cur.dirty || inFlight.current) {
            save(); // our save will get a 409 and merge
          } else {
            const before = new Set(listChanges(cur.markup).map(c => c.mark.at));
            const by = [...new Set(listChanges(r.document.pubDocMarkup).filter(c => !before.has(c.mark.at) && !mine(c)).map(c => c.mark.by))];
            applyDoc(r.document);
            if (by.length) {
              const where = (r.viewers || []).find(v => by.includes(v.name));
              setActivity(by.join(', ') + ' edited ' + (where && where.section ? where.section : 'the document') + ' just now');
            }
          }
        }
      } catch (e) { /* offline for a moment; the next beat retries */ }
    };
    beat();
    const t = setInterval(beat, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(t);
      api.post('/pp-publications/' + pubId + '/document/presence', { leaving: true }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pubId]);
  const sectionRef = useRef('');
  sectionRef.current = section;
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    if (!activity) return undefined;
    const t = setTimeout(() => setActivity(''), 4000);
    return () => clearTimeout(t);
  }, [activity]);

  // ---- Tracked changes -----------------------------------------------------------------------
  // Pending typing folded into the markup (under your name) so Changes can show it.
  const current = useMemo(
    () => (visibleText(markup) === text ? markup : fold(markup, text, { ...me, at: 'pending' }, tracking)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markup, text, me.uid, tracking],
  );
  const changes = useMemo(() => listChanges(current), [current]);
  const people = useMemo(() => {
    const m = new Map();
    changes.forEach(c => {
      const p = m.get(c.mark.by) || { name: c.mark.by, count: 0 };
      p.count += 1;
      m.set(c.mark.by, p);
    });
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [changes]);
  const shown = changes.filter(c => who === 'all' || c.mark.by === who);
  const sel = shown.find(c => c.id === selected) || null;
  const canResolve = c => canEdit && (canReview || mine(c));

  useEffect(() => { if (who !== 'all' && !people.some(p => p.name === who)) setWho('all'); }, [people, who]);

  const openChanges = () => {
    // Record typing so far under your name, stamped now.
    if (visibleText(markup) !== text) set({ pubDocMarkup: fold(markup, text, stampNow(), tracking) });
    setView('changes');
  };

  /** Accept or reject some changes; saved straight away with its own audit entry. */
  const apply = (action, list, all) => {
    if (!list.length) return;
    const base = fold(markup, text, stampNow(), tracking);
    const ids = new Set(list.map(c => c.id));
    const next = all
      ? resolveAll(base, action, c => (who === 'all' || c.mark.by === who) && (canReview || mine(c)))
      : resolve(base, listChanges(base).filter(c => ids.has(c.id)), action);
    const names = [...new Set(list.map(c => c.mark.by))].join(', ');
    const verb = action === 'accept' ? 'Accepted' : 'Rejected';
    nextAudit.current = auditEntry('Document Changes ' + verb, { result: verb, comment: plural(list.length, 'change') + ' by ' + names });
    setSelected(null);
    set({ pubDocMarkup: next, pubDocText: visibleText(next) });
    setTimeout(() => save(), 0);
  };

  const step = dir => {
    if (!shown.length) return;
    const i = sel ? shown.indexOf(sel) : -1;
    const next = shown[(i + dir + shown.length) % shown.length];
    setSelected(next.id);
    const el = bodyRef.current && bodyRef.current.querySelector('[data-change="' + next.id + '"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  };

  const toggleTracking = () => {
    if (!canReview || !canEdit) return;
    // Fold what's typed so far under the old setting before switching.
    set(s => ({ pubDocMarkup: fold(s.pubDocMarkup || [], s.pubDocText || '', stampNow(), s.pubDocTrack !== false), pubDocTrack: s.pubDocTrack === false }));
  };

  /** Close once anything unsaved is saved. */
  const close = async () => {
    if (live.current.dirty || inFlight.current) {
      await save();
      for (let i = 0; i < 20 && (inFlight.current || live.current.dirty); i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 150));
      }
    }
    onClose();
  };

  const title = 'Publication Document' + (recordId && recordId !== 'NEW' ? ' · ' + recordId : '');

  // Segment index -> its change, for rendering the markup.
  const changeOfSeg = new Map();
  changes.forEach(c => c.segs.forEach(i => changeOfSeg.set(i, c)));

  const renderMarkup = () => current.map((seg, i) => {
    const c = changeOfSeg.get(i);
    if (!c) return <span key={i}>{seg.t}</span>;
    const inFilter = who === 'all' || c.mark.by === who;
    const color = inFilter ? personColor(c.mark.by) : 'var(--fg-3)';
    const pending = c.mark.at === 'pending';
    const label = (c.kind === 'ins' ? 'Inserted by ' : 'Deleted by ') + c.mark.by + (pending ? ' (saving)' : ' · ' + changeStamp(c.mark.at));
    return (
      <span
        key={i}
        data-change={c.id}
        role="button"
        tabIndex={inFilter ? 0 : -1}
        title={label}
        aria-label={label + ': ' + seg.t}
        className={'pf-doc-mark pf-doc-mark--' + c.kind + (sel && sel.id === c.id ? ' pf-doc-mark--sel' : '') + (inFilter ? '' : ' pf-doc-mark--muted')}
        style={{ color, textDecorationColor: color }}
        onClick={() => inFilter && setSelected(c.id)}
        onKeyDown={e => { if (inFilter && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSelected(c.id); } }}
      >
        {seg.t}
      </span>
    );
  });

  const syncLabel = !canEdit ? 'Live · read-only'
    : sync.state === 'error' ? 'Couldn’t save: ' + sync.error
      : sync.state === 'saving' || dirty ? 'Saving…'
        : 'All changes saved';

  return (
    <div className={'pf-docpanel pf-docpanel--' + size} role="dialog" aria-label={title}>
      <div className="pf-docpanel-head" onDoubleClick={() => setSize(v => (v === 'minimized' ? 'docked' : 'minimized'))}>
        <Icon name="edit_document" size={18} color="var(--white)" />
        <div className="pf-docpanel-title">{title}</div>
        {viewers.length > 0 && size === 'minimized' && <span className="pf-doc-headcount">{plural(viewers.length + 1, 'person', 'people')} here</span>}
        <button type="button" className="pf-docpanel-btn" title={size === 'minimized' ? 'Restore' : 'Minimize'} onClick={() => setSize(v => (v === 'minimized' ? 'docked' : 'minimized'))}>
          <span className="material-symbols-outlined" aria-hidden="true">{size === 'minimized' ? 'expand_less' : 'minimize'}</span>
        </button>
        <button type="button" className="pf-docpanel-btn" title={size === 'expanded' ? 'Dock' : 'Expand'} onClick={() => setSize(v => (v === 'expanded' ? 'docked' : 'expanded'))}>
          <span className="material-symbols-outlined" aria-hidden="true">{size === 'expanded' ? 'close_fullscreen' : 'open_in_full'}</span>
        </button>
        <button type="button" className="pf-docpanel-btn" title="Close" onClick={close}>
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      {size !== 'minimized' && (
        <>
          <div className="pf-doc-bar">
            <div className="pf-doc-tabs" role="tablist" aria-label="Document view">
              <button type="button" role="tab" aria-selected={view === 'edit'} className="pf-doc-tab" onClick={() => setView('edit')}>
                {canEdit ? 'Edit' : 'Text'}
              </button>
              <button type="button" role="tab" aria-selected={view === 'changes'} className="pf-doc-tab" onClick={openChanges}>
                Changes{changes.length ? <span className="pf-doc-count">{changes.length}</span> : null}
              </button>
            </div>

            <div className="pf-doc-presence" aria-label={'In this document: you' + viewers.map(v => ', ' + v.name).join('')}>
              {viewers.map(v => (
                <span
                  key={v.uid}
                  className={'pf-doc-avatar' + (v.editing ? ' pf-doc-avatar--editing' : '')}
                  style={{ background: personColor(v.name) }}
                  title={v.name + (v.editing ? ' — editing' + (v.section ? ' ' + v.section : '') : ' — viewing')}
                >
                  {initials(v.name)}
                </span>
              ))}
              <span className="pf-doc-avatar pf-doc-avatar--me" style={{ background: personColor(me.by) }} title={me.by + ' (you)'}>{initials(me.by)}</span>
            </div>

            {canEdit && (
              <label
                className={'pf-doc-track' + (canReview ? '' : ' pf-doc-track--locked')}
                title={canReview ? 'When on, your edits are marked with your name until someone accepts them.' : 'Your role’s edits are always tracked.'}
              >
                <input type="checkbox" checked={tracking} disabled={!canReview} onChange={toggleTracking} />
                <span>Track changes</span>
                {!canReview && <Icon name="lock" size={14} color="var(--fg-3)" />}
              </label>
            )}
          </div>

          {(viewers.length > 0 || activity) && (
            <div className="pf-doc-live" aria-live="polite">
              {activity ? (
                <span className="pf-doc-live-activity"><Icon name="bolt" size={15} />{activity}</span>
              ) : viewers.map(v => (
                <span key={v.uid} className="pf-doc-live-who">
                  <span className="pf-doc-dot" style={{ background: personColor(v.name) }} aria-hidden="true" />
                  {v.name} {v.editing ? (v.section ? 'is editing ' + v.section : 'is editing') : 'is viewing'}
                </span>
              ))}
            </div>
          )}

          {view === 'edit' ? (
            <div className="pf-docpanel-body" ref={editorRef}>
              <TextArea
                value={text}
                onChange={e => { set({ pubDocText: e.target.value }); noteCaret(); }}
                onKeyUp={noteCaret}
                onClick={noteCaret}
                readOnly={!canEdit}
                placeholder={canEdit ? 'Start writing the publication document here…' : 'No text yet.'}
                width="100%"
                height="100%"
                aria-label="Publication document text"
                autoFocus={canEdit}
                style={{ resize: 'none', fontSize: 15, lineHeight: 1.6, padding: '14px 16px', border: 0, borderRadius: 0 }}
              />
            </div>
          ) : (
            <div className="pf-doc-review">
              {changes.length > 0 && (
                <div className="pf-doc-people" role="group" aria-label="Show changes by">
                  <button type="button" className="pf-doc-person" aria-pressed={who === 'all'} onClick={() => setWho('all')}>
                    Everyone <span className="pf-doc-person-n">{changes.length}</span>
                  </button>
                  {people.map(p => (
                    <button key={p.name} type="button" className="pf-doc-person" aria-pressed={who === p.name} onClick={() => setWho(p.name)}>
                      <span className="pf-doc-dot" style={{ background: personColor(p.name) }} aria-hidden="true" />
                      {p.name} <span className="pf-doc-person-n">{p.count}</span>
                    </button>
                  ))}
                  {canEdit && shown.some(canResolve) && (
                    <span className="pf-doc-bulk">
                      <Button variant="secondary" onClick={() => apply('accept', shown.filter(canResolve), true)} disabled={!canReview}>
                        Accept {who === 'all' ? 'all' : 'these'}
                      </Button>
                      <Button variant="secondary" onClick={() => apply('reject', shown.filter(canResolve), true)}>
                        {canReview ? 'Reject ' + (who === 'all' ? 'all' : 'these') : 'Undo all mine'}
                      </Button>
                    </span>
                  )}
                </div>
              )}
              <div className="pf-doc-markup" ref={bodyRef}>
                {current.length ? renderMarkup() : <span className="pf-faint13">No text yet.</span>}
              </div>
              {changes.length === 0 ? (
                <div className="pf-doc-card pf-doc-card--empty">No tracked changes. {tracking ? 'Edits made in Edit are marked here with the editor’s name.' : 'Tracking is off, so edits aren’t marked.'}</div>
              ) : (
                <div className="pf-doc-card" aria-live="polite">
                  {sel ? (
                    <>
                      <span className="pf-doc-dot" style={{ background: personColor(sel.mark.by) }} aria-hidden="true" />
                      <div className="pf-doc-card-text">
                        <div><strong>{sel.mark.by}</strong> {sel.kind === 'ins' ? 'inserted' : 'deleted'} {quote(sel.text)}</div>
                        <div className="pf-faint13">{sel.mark.at === 'pending' ? 'Saving…' : changeStamp(sel.mark.at)}</div>
                      </div>
                      {canResolve(sel) && (
                        canReview ? (
                          <>
                            <Button variant="primary" icon="check" onClick={() => apply('accept', [sel])}>Accept</Button>
                            <Button variant="secondary" icon="close" onClick={() => apply('reject', [sel])}>Reject</Button>
                          </>
                        ) : (
                          <Button variant="secondary" icon="undo" onClick={() => apply('reject', [sel])}>Undo</Button>
                        )
                      )}
                    </>
                  ) : (
                    <div className="pf-doc-card-text pf-faint13">
                      {plural(shown.length, 'change')}{who === 'all' ? '' : ' by ' + who}. Select one in the text, or step through them.
                      {!canReview && canEdit ? ' You can undo your own; a reviewer accepts or rejects the rest.' : ''}
                    </div>
                  )}
                  <span className="pf-doc-nav">
                    <button type="button" className="pf-doc-navbtn" onClick={() => step(-1)} title="Previous change" aria-label="Previous change"><Icon name="chevron_left" size={18} /></button>
                    <button type="button" className="pf-doc-navbtn" onClick={() => step(1)} title="Next change" aria-label="Next change"><Icon name="chevron_right" size={18} /></button>
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="pf-docpanel-foot">
            <span className={'pf-doc-sync pf-doc-sync--' + (canEdit ? sync.state : 'ro')}>
              <Icon name={sync.state === 'error' ? 'cloud_off' : sync.state === 'saving' || dirty ? 'sync' : 'cloud_done'} size={16} />
              {syncLabel}
            </span>
            <span className="pf-faint13">
              {wordCount(text)} words{canEdit ? (tracking ? ' · tracking as ' + me.by : ' · tracking off') : ''}
            </span>
            <div className="pf-ml-auto pf-row pf-gap10">
              {sync.state === 'error' && <Button variant="secondary" onClick={save}>Try Again</Button>}
              <Button variant="primary" onClick={close}>Done</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
