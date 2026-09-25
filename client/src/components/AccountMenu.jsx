import React, { useEffect, useRef, useState } from 'react';
import { ConfirmModal, Field, Icon, InlineMessage, NavMenu, TextField } from '../ds/pubpro';
import { api } from '../api';
import './AccountMenu.css';

/**
 * The avatar circle at the far right of the TopNav. The DS TopNav draws it without an action,
 * so this lays a button over it: a placeholder person icon (no profile photo yet) that opens
 * the account menu.
 */
export default function AccountMenu({ userName, onLogout }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState(null); // { current, next, confirm, error, done } while the dialog is open
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="am-wrap" ref={wrapRef}>
      <button
        type="button"
        className="am-trigger"
        title={userName ? userName + ' · account' : 'Account'}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <Icon name="person" size={22} color="var(--nav)" />
      </button>
      {open && (
        <NavMenu
          items={[{ label: 'Change password', icon: 'key' }, { label: 'Log out', icon: 'logout' }]}
          width={200}
          style={{ left: 'auto', right: 0, marginTop: 12 }}
          onSelect={label => {
            setOpen(false);
            if (label === 'Log out') onLogout();
            if (label === 'Change password') setPw({ current: '', next: '', confirm: '' });
          }}
        />
      )}
      {pw && (
        <ConfirmModal
          title={pw.done ? 'Password changed' : 'Change password'}
          confirmLabel={pw.done ? 'Done' : 'Change Password'}
          cancelLabel="Close"
          onCancel={() => setPw(null)}
          onConfirm={async () => {
            if (pw.done) { setPw(null); return; }
            if (pw.next !== pw.confirm) { setPw({ ...pw, error: 'The new passwords don' + "'" + 't match.' }); return; }
            try {
              await api.post('/auth/change-password', { current: pw.current, next: pw.next });
              setPw({ current: '', next: '', confirm: '', done: true });
            } catch (err) {
              setPw({ ...pw, error: err.message });
            }
          }}
        >
          {pw.done ? (
            <div>Your new password is set. Use it the next time you sign in.</div>
          ) : (
            <div className="am-form">
              <Field label="Current password"><TextField type="password" autoComplete="current-password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value, error: '' })} /></Field>
              <Field label="New password" help="At least 8 characters."><TextField type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value, error: '' })} /></Field>
              <Field label="Confirm new password"><TextField type="password" autoComplete="new-password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value, error: '' })} /></Field>
              {pw.error && <InlineMessage kind="error">{pw.error}</InlineMessage>}
            </div>
          )}
        </ConfirmModal>
      )}
    </div>
  );
}
