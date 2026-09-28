import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Icon, TextArea } from '../../ds/pubpro';
import { auditEntry } from './state';
import { changeStamp, fold, listChanges, personColor, resolve, resolveAll, visibleText } from './trackChanges';
import './DocumentPanel.css';

const wordCount = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
const quote = s => {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return '“' + (t.length > 60 ? t.slice(0, 57) + '…' : t) + '”';
};

/**
 * The publication document in a panel docked bottom-right (like a compose window), with
 * Word-style tracked changes: Edit records your edits under your name; Changes shows everyone's
 * insertions and deletions in their colour, to accept or reject (doc.review) or undo your own.
 *
 * props: me ({ by, uid }), canEdit (doc.edit and not cancelled), canReview (doc.review),
 * savedMarkup: the markup as last saved. saveDocument(state, { audit }) -> saved data or null.
 */
export default function DocumentPanel({ st, set, saveDocument, savedMarkup, saving, recordId, me, canEdit, canReview, onClose }) {
  const [size, setSize] = useState('docked'); // 'docked' | 'expanded' | 'minimized'
  const [view, setView] = useState('edit'); // 'edit' | 'changes'
  const [who, setWho] = useState('all'); // person filter in Changes
  const [selected, setSelected] = useState(null); // change id
  const [status, setStatus] = useState('');
  const bodyRef = useRef(null);

  const text = st.pubDocText || '';
  const markup = st.pubDocMarkup || [];
  // Only reviewers can switch tracking off; everyone else's edits are always tracked.
  const tracking = st.pubDocTrack !== false || !canReview;
  const stampNow = () => ({ ...me, at: new Date().toISOString() });
  // Pending typing folded into the markup (under your name) so Changes can show it.
  const current = useMemo(
    () => (visibleText(markup) === text ? markup : fold(markup, text, { ...me, at: 'pending' }, tracking)),
    [markup, text, me, tracking],
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
  const mine = c => c.mark.uid != null && String(c.mark.uid) === String(me.uid);
  const canResolve = c => canEdit && (canReview || mine(c));

  useEffect(() => { if (who !== 'all' && !people.some(p => p.name === who)) setWho('all'); }, [people, who]);

  const openChanges = () => {
    // Record typing so far under your name, stamped now.
    if (visibleText(markup) !== text) set({ pubDocMarkup: fold(markup, text, stampNow(), tracking) });
    setView('changes');
  };

  const finish = (saved, close, msg) => {
    if (!saved) { setStatus(''); return; }
    setStatus(msg || 'Saved ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    if (close) onClose();
  };

  const save = async close => {
    const folded = fold(markup, text, stampNow(), tracking);
    const savedAts = new Set(listChanges(savedMarkup || []).map(c => c.mark.at));
    const added = listChanges(folded).filter(c => mine(c) && !savedAts.has(c.mark.at)).length;
    setStatus('Saving…');
    const saved = await saveDocument({ ...st, pubDocMarkup: folded }, {
      audit: auditEntry('Publication Document Saved', {
        comment: wordCount(text) + ' words' + (tracking ? '' : ' · tracking off') + (added ? ' · ' + plural(added, 'tracked change') : ''),
      }),
    });
    finish(saved, close);
  };

  /** Accept or reject some changes, then save straight away (like any review action). */
  const apply = async (action, list, all) => {
    if (!list.length) return;
    const base = fold(markup, text, stampNow(), tracking);
    const ids = new Set(list.map(c => c.id));
    const next = all
      ? resolveAll(base, action, c => (who === 'all' || c.mark.by === who) && (canReview || mine(c)))
      : resolve(base, listChanges(base).filter(c => ids.has(c.id)), action);
    const names = [...new Set(list.map(c => c.mark.by))].join(', ');
    const verb = action === 'accept' ? 'Accepted' : 'Rejected';
    setSelected(null);
    setStatus('Saving…');
    const saved = await saveDocument({ ...st, pubDocMarkup: next, pubDocText: visibleText(next) }, {
      audit: auditEntry('Document Changes ' + verb, { result: verb, comment: plural(list.length, 'change') + ' by ' + names }),
    });
    finish(saved, false, saved ? verb + ' ' + plural(list.length, 'change') : '');
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
    const label = (c.kind === 'ins' ? 'Inserted by ' : 'Deleted by ') + c.mark.by + (pending ? ' (not saved yet)' : ' · ' + changeStamp(c.mark.at));
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


  return (
    <div className={'pf-docpanel pf-docpanel--' + size} role="dialog" aria-label={title}>
      <div className="pf-docpanel-head" onDoubleClick={() => setSize(v => (v === 'minimized' ? 'docked' : 'minimized'))}>
        <Icon name="edit_document" size={18} color="var(--white)" />
        <div className="pf-docpanel-title">{title}</div>
        <button type="button" className="pf-docpanel-btn" title={size === 'minimized' ? 'Restore' : 'Minimize'} onClick={() => setSize(v => (v === 'minimized' ? 'docked' : 'minimized'))}>
          <span className="material-symbols-outlined" aria-hidden="true">{size === 'minimized' ? 'expand_less' : 'minimize'}</span>
        </button>
        <button type="button" className="pf-docpanel-btn" title={size === 'expanded' ? 'Dock' : 'Expand'} onClick={() => setSize(v => (v === 'expanded' ? 'docked' : 'expanded'))}>
          <span className="material-symbols-outlined" aria-hidden="true">{size === 'expanded' ? 'close_fullscreen' : 'open_in_full'}</span>
        </button>
        <button type="button" className="pf-docpanel-btn" title="Close (your text stays on the record until you save or leave)" onClick={onClose}>
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

          {view === 'edit' ? (
            <div className="pf-docpanel-body">
              <TextArea
                value={text}
                onChange={e => set({ pubDocText: e.target.value })}
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
                      <Button variant="secondary" onClick={() => apply('accept', shown.filter(canResolve), true)} disabled={saving || !canReview}>
                        Accept {who === 'all' ? 'all' : 'these'}
                      </Button>
                      <Button variant="secondary" onClick={() => apply('reject', shown.filter(canResolve), true)} disabled={saving}>
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
                        <div className="pf-faint13">{sel.mark.at === 'pending' ? 'Not saved yet' : changeStamp(sel.mark.at)}</div>
                      </div>
                      {canResolve(sel) && (
                        canReview ? (
                          <>
                            <Button variant="primary" icon="check" onClick={() => apply('accept', [sel])} disabled={saving}>Accept</Button>
                            <Button variant="secondary" icon="close" onClick={() => apply('reject', [sel])} disabled={saving}>Reject</Button>
                          </>
                        ) : (
                          <Button variant="secondary" icon="undo" onClick={() => apply('reject', [sel])} disabled={saving}>Undo</Button>
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
            <span className="pf-faint13">
              {wordCount(text)} words
              {canEdit ? (tracking ? ' · tracking as ' + me.by : ' · tracking off') : ' · read-only'}
              {status ? ' · ' + status : ''}
            </span>
            {canEdit && (
              <div className="pf-ml-auto pf-row pf-gap10">
                <Button variant="secondary" onClick={() => save(false)} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                <Button variant="primary" onClick={() => save(true)} disabled={saving}>Save &amp; Close</Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
