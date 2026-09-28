import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ConfirmModal, Field, Icon, Pill, TextField } from '../ds/pubpro';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { fmtSaved } from './Publications';

// System Administrator > External users: every external author profile, with or without a sign-in.
// Adding an email to someone without one gives them a login; the rest of their record (agreements,
// COI, debarment checks) lives on their author profile.

const initials = name => String(name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const copy = text => { try { navigator.clipboard.writeText(text); } catch (e) { /* ignore */ } };

export default function ExternalUsersTab({ onChanged, onError }) {
  const navigate = useNavigate();
  const { impersonate, impersonator } = useAuth();
  const [rows, setRows] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all | login | none
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '', institution: '' });
  const [editing, setEditing] = useState(null); // { profileId, d }
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: 'deactivate' | 'reset', row }

  const load = () => api.get('/admin/external').then(setRows).catch(err => onError(err.message));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const run = async (fn, msg) => {
    setBusy(true);
    try {
      const out = await fn();
      await load();
      onChanged(typeof msg === 'function' ? msg(out) : msg);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const q = query.trim().toLowerCase();
  const list = (rows || []).filter(r => (filter === 'all' || (filter === 'login' ? r.login : !r.login))
    && (!q || [r.name, r.email, r.institution, r.authorId].join(' ').toLowerCase().includes(q)));
  const withLogin = (rows || []).filter(r => r.login).length;

  const add = () => run(async () => {
    const r = await api.post('/admin/users', { ...draft, roles: ['author'] });
    setSecret({ name: r.user.name, email: r.user.email, password: r.tempPassword });
    setAdding(false);
    setDraft({ name: '', email: '', institution: '' });
    return r.user;
  }, u => 'Added ' + u.name + ' as an external user.');

  const save = row => run(async () => {
    const r = await api.put('/admin/external/' + row.profileId, editing.d);
    if (r.tempPassword) setSecret({ name: editing.d.name, email: editing.d.email, password: r.tempPassword });
    setEditing(null);
    return r;
  }, r => (r.tempPassword ? editing.d.name + ' can now sign in.' : 'Saved ' + editing.d.name + '.'));

  const signInAs = row => run(async () => {
    await impersonate(row.login.userId);
    navigate('/author-dashboard');
  }, '');

  const runConfirm = () => {
    const { kind, row } = confirm;
    setConfirm(null);
    if (kind === 'deactivate') {
      run(() => api.put('/admin/users/' + row.login.userId, { active: false }), row.name + '’s sign-in is deactivated.');
      setEditing(null);
    } else {
      run(async () => {
        const r = await api.post('/admin/users/' + row.login.userId + '/reset-password', {});
        setSecret({ name: row.name, email: row.email, password: r.tempPassword, reset: true });
      }, '');
    }
  };

  const fields = (d, set) => (
    <div className="sa-add-grid">
      <Field label="Name" required><TextField value={d.name} onChange={e => set({ name: e.target.value })} /></Field>
      <Field label="Email (sign-in)" help="Add one to let them sign in to their External Author Dashboard.">
        <TextField type="email" value={d.email} onChange={e => set({ email: e.target.value })} />
      </Field>
      <Field label="Institution" required><TextField value={d.institution} onChange={e => set({ institution: e.target.value })} placeholder="e.g. Mayo Clinic" /></Field>
    </div>
  );

  return (
    <>
      {secret && (
        <div className="sa-secret" role="status">
          <Icon name="key" size={20} color="var(--nav)" />
          <div className="sa-secret-text">
            <div>
              {secret.reset ? 'New temporary password for ' : 'Temporary password for '}<strong>{secret.name}</strong> ({secret.email}):{' '}
              <code className="sa-code">{secret.password}</code>
            </div>
            <div className="sa-faint">Share it with them privately. They sign in with it and set their own from the account menu. It won&rsquo;t be shown again.</div>
          </div>
          <Button variant="secondary" icon="content_copy" onClick={() => copy(secret.password)}>Copy</Button>
          <button type="button" className="sa-x" aria-label="Dismiss" onClick={() => setSecret(null)}><Icon name="close" size={18} /></button>
        </div>
      )}

      <section className="sa-card">
        <div className="sa-toolbar">
          <TextField iconBefore="search" placeholder="Search by name, email, institution or author ID" value={query} onChange={e => setQuery(e.target.value)} width="340px" aria-label="Search external users" />
          <div className="sa-seg" role="group" aria-label="Show">
            {[['all', 'All (' + (rows ? rows.length : 0) + ')'], ['login', 'Can sign in (' + withLogin + ')'], ['none', 'No sign-in (' + ((rows ? rows.length : 0) - withLogin) + ')']].map(([k, l]) => (
              <button key={k} type="button" aria-pressed={filter === k} className="sa-seg-btn" onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <span className="sa-grow" />
          {!adding && <Button variant="primary" icon="person_add" onClick={() => { setAdding(true); setEditing(null); }}>Add External User</Button>}
        </div>

        {adding && (
          <div className="sa-add">
            {fields(draft, p => setDraft(x => ({ ...x, ...p })))}
            <div className="sa-add-foot">
              <span className="sa-faint">Creates their external author profile and a sign-in. PubPro makes a temporary password for you to pass on.</span>
              <span className="sa-grow" />
              <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
              <Button variant="primary" onClick={add} disabled={busy || !draft.name.trim() || !draft.email.trim() || !draft.institution.trim()}>{busy ? 'Adding…' : 'Add External User'}</Button>
            </div>
          </div>
        )}

        {rows === null ? <div className="empty-state empty-state--inset">Loading&hellip;</div> : list.length === 0 ? (
          <div className="empty-state empty-state--inset">{rows.length ? 'No external users match.' : 'No external authors yet. Use Add External User.'}</div>
        ) : (
          <div className="sa-table" role="table" aria-label="External users">
            <div className="sa-row sa-row--head" role="row">
              <span role="columnheader">External author</span>
              <span role="columnheader">Author profile</span>
              <span role="columnheader">Sign-in</span>
              <span role="columnheader">Last sign-in</span>
              <span role="columnheader"><span className="sa-sr">Actions</span></span>
            </div>
            {list.map(r => {
              const open = editing && editing.profileId === r.profileId;
              return (
                <React.Fragment key={r.profileId}>
                  <div className={'sa-row' + (r.login && !r.login.active ? ' sa-row--off' : '') + (open ? ' sa-row--open' : '')} role="row">
                    <span role="cell" className="sa-user">
                      <span className="sa-avatar" aria-hidden="true">{initials(r.name)}</span>
                      <span>
                        <span className="sa-name">{r.name}</span>
                        <span className="sa-email">{[r.email, r.institution].filter(Boolean).join(' · ') || 'No email yet'}</span>
                      </span>
                    </span>
                    <span role="cell" className="sa-rolecell">
                      <button type="button" className="sa-link" onClick={() => navigate('/external-author/' + r.profileId)}>{r.authorId}</button>
                    </span>
                    <span role="cell">
                      {!r.login ? <Pill tone="draft">No sign-in</Pill> : r.login.active ? <Pill tone="active">Active</Pill> : <Pill tone="cancelled">Deactivated</Pill>}
                    </span>
                    <span role="cell" className="sa-faint">{r.login ? (r.login.last_login_at ? fmtSaved(r.login.last_login_at) : 'Never') : '—'}</span>
                    <span role="cell" className="sa-actions">
                      <Button variant="secondary" icon={open ? 'expand_less' : 'edit'} onClick={() => { setEditing(open ? null : { profileId: r.profileId, d: { name: r.name, email: r.email, institution: r.institution } }); setAdding(false); }}>
                        {open ? 'Close' : 'Edit'}
                      </Button>
                      {r.login && r.login.active && !impersonator && (
                        <Button variant="tertiary" icon="login" onClick={() => signInAs(r)} disabled={busy} title={'See PubPro exactly as ' + r.name + ' does'}>Sign In As</Button>
                      )}
                    </span>
                  </div>
                  {open && (
                    <div className="sa-edit" role="region" aria-label={'Edit ' + r.name}>
                      {fields(editing.d, p => setEditing(x => ({ ...x, d: { ...x.d, ...p } })))}
                      <div className="sa-add-foot">
                        {r.login && (r.login.active ? (
                          <>
                            <Button variant="secondary" icon="key" onClick={() => setConfirm({ kind: 'reset', row: r })} disabled={busy}>Reset Password</Button>
                            <Button variant="fatal" onClick={() => setConfirm({ kind: 'deactivate', row: r })} disabled={busy}>Deactivate Sign-in</Button>
                          </>
                        ) : (
                          <Button variant="secondary" onClick={() => run(() => api.put('/admin/users/' + r.login.userId, { active: true }), r.name + ' can sign in again.')} disabled={busy}>Reactivate Sign-in</Button>
                        ))}
                        <Button variant="tertiary" icon="open_in_new" onClick={() => navigate('/external-author/' + r.profileId)}>Open Author Profile</Button>
                        {!r.login && <span className="sa-faint">Add an email and save to give them a sign-in.</span>}
                        <span className="sa-grow" />
                        <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                        <Button variant="primary" onClick={() => save(r)} disabled={busy || !editing.d.name.trim() || !editing.d.institution.trim()}>
                          {busy ? 'Saving…' : !r.login && editing.d.email.trim() ? 'Save & Give Sign-in' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </section>

      {confirm && (
        <ConfirmModal
          title={confirm.kind === 'reset' ? 'Reset ' + confirm.row.name + '’s password?' : 'Deactivate ' + confirm.row.name + '’s sign-in?'}
          confirmLabel={confirm.kind === 'reset' ? 'Reset Password' : 'Deactivate'}
          cancelLabel="Keep"
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        >
          {confirm.kind === 'reset'
            ? 'Their current password stops working. You’ll get a temporary one to pass on.'
            : 'They can’t sign in until you reactivate them. Their author profile and publications stay as they are.'}
        </ConfirmModal>
      )}
    </>
  );
}
