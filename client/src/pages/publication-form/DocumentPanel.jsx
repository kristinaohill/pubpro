import React, { useState } from 'react';
import { Button, Icon, TextArea } from '../../ds/pubpro';
import { auditEntry } from './state';

const wordCount = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/**
 * The publication document, for now a plain text box in a floating panel docked bottom-right
 * (like a compose window). The text lives on the record; Save stores it with the publication.
 */
export default function DocumentPanel({ st, set, commit, saving, recordId, userName, onClose }) {
  const [size, setSize] = useState('docked'); // 'docked' | 'expanded' | 'minimized'
  const [status, setStatus] = useState('');
  const text = st.pubDocText || '';

  const save = async close => {
    const saved = await commit(s => ({
      pubDoc: 'new',
      audit: (s.audit || []).concat([auditEntry('Publication Document Saved', { participants: userName, comment: wordCount(s.pubDocText) + ' words' })]),
    }), { done: 'Publication document saved.' });
    if (!saved) {
      setStatus('Not saved yet: give the publication a title on the Overview tab');
      return;
    }
    setStatus('Saved ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    if (close) onClose();
  };

  const title = 'Publication Document' + (recordId && recordId !== 'NEW' ? ' · ' + recordId : '');

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
          <div className="pf-docpanel-body">
            <TextArea
              value={text}
              onChange={e => set({ pubDocText: e.target.value })}
              placeholder="Start writing the publication document here…"
              width="100%"
              height="100%"
              aria-label="Publication document text"
              autoFocus
              style={{ resize: 'none', fontSize: 15, lineHeight: 1.6, padding: '14px 16px', border: 0, borderRadius: 0 }}
            />
          </div>
          <div className="pf-docpanel-foot">
            <span className="pf-faint13">{wordCount(text)} words{status ? ' · ' + status : ''}</span>
            <div className="pf-ml-auto pf-row pf-gap10">
              <Button variant="secondary" onClick={() => save(false)} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              <Button variant="primary" onClick={() => save(true)} disabled={saving}>Save &amp; Close</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
