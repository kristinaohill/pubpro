import React, { useEffect, useMemo, useState } from 'react';
import { Button, ConfirmModal, Field, Icon, InlineMessage, Pill, Select, TextField } from '../ds/pubpro';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import PageHeader from '../components/PageHeader';
import Flash from '../components/Flash';
import { SignupTab, UsersTab } from './SystemAdminUsers';
import './SystemAdmin.css';

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');

/** System Administrator (Workspaces menu): users, roles and what each role can do. Needs admin.users. */
export default function SystemAdmin() {
  const { user, can } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState(null);
  const [roleData, setRoleData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUsers = () => api.get('/admin/users').then(setUsers).catch(err => setError(err.message));
  const loadRoles = () => api.get('/admin/roles').then(setRoleData).catch(err => setError(err.message));
  const allowed = can('admin.users');
  useEffect(() => {
    if (!allowed) return;
    loadUsers();
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  if (!allowed) {
    return (
      <div className="sa-page">
        <PageHeader title="System Administrator" />
        <InlineMessage kind="warning">Only System Administrators can manage users, roles and permissions. Ask one of them if you need access.</InlineMessage>
      </div>
    );
  }

  return (
    <div className="sa-page">
      <PageHeader
        title="System Administrator"
        description="Who can sign in, their roles, and what each role can do. Changes apply as soon as they're saved."
      />
      <div className="sa-tabs" role="tablist" aria-label="System Administrator sections">
        <button type="button" role="tab" aria-selected={tab === 'users'} className="sa-tab" onClick={() => setTab('users')}>
          Users{users ? <span className="sa-tab-n">{users.filter(x => !x.pending).length}</span> : null}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'roles'} className="sa-tab" onClick={() => setTab('roles')}>
          Roles &amp; permissions{roleData ? <span className="sa-tab-n">{roleData.roles.length}</span> : null}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'signup'} className="sa-tab" onClick={() => setTab('signup')}>
          Sign-up{users && users.some(x => x.pending) ? <span className="sa-tab-n sa-tab-n--alert">{users.filter(x => x.pending).length} waiting</span> : null}
        </button>
      </div>

      {notice && <Flash watch={notice}>{notice}</Flash>}
      {error && <InlineMessage kind="error">{error}</InlineMessage>}

      {tab === 'users' ? (
        <UsersTab
          me={user} users={users} roles={roleData ? roleData.roles : []} options={roleData && roleData.options}
          onChanged={(msg, list) => { setError(''); if (msg) setNotice(msg); if (list) setUsers(list); else loadUsers(); loadRoles(); }}
          onError={setError}
        />
      ) : tab === 'signup' ? (
        <SignupTab
          data={roleData}
          onChanged={(msg, data) => { setError(''); if (msg) setNotice(msg); if (data) setRoleData(data); else loadRoles(); }}
          onError={setError}
        />
      ) : (
        <RolesTab
          data={roleData}
          onChanged={(msg, data) => { setError(''); if (msg) setNotice(msg); if (data) setRoleData(data); else loadRoles(); }}
          onError={setError}
        />
      )}
    </div>
  );
}

// ---- Roles & permissions ---------------------------------------------------

function RolesTab({ data, onChanged, onError }) {
  const [edits, setEdits] = useState({}); // roleKey -> Set of permissions
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', description: '', copyFrom: 'reviewer' });
  const [toDelete, setToDelete] = useState(null);

  const groups = useMemo(() => {
    if (!data) return [];
    const out = [];
    data.permissions.forEach(p => {
      const g = out.find(x => x.name === p.group);
      if (g) g.items.push(p); else out.push({ name: p.group, items: [p] });
    });
    return out;
  }, [data]);

  if (!data) return <section className="sa-card"><div className="empty-state empty-state--inset">Loading&hellip;</div></section>;

  const permsOf = r => edits[r.key] || new Set(r.permissions);
  const dirtyKeys = data.roles.filter(r => edits[r.key] && [...edits[r.key]].sort().join() !== r.permissions.slice().sort().join()).map(r => r.key);
  const byKey = Object.fromEntries(data.permissions.map(p => [p.key, p]));

  const toggle = (r, key) => {
    const next = new Set(permsOf(r));
    if (next.has(key)) {
      next.delete(key);
      // Anything that needs this goes too (reviewing needs editing).
      data.permissions.forEach(p => { if ((p.requires || []).includes(key)) next.delete(p.key); });
    } else {
      next.add(key);
      (byKey[key].requires || []).forEach(k => next.add(k));
    }
    setEdits({ ...edits, [r.key]: next });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/admin/roles', { roles: dirtyKeys.map(k => ({ key: k, permissions: [...edits[k]] })) });
      setEdits({});
      onChanged('Saved permissions for ' + dirtyKeys.map(k => data.roles.find(r => r.key === k).name).join(', ') + '.', res);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const createRole = async () => {
    const from = data.roles.find(r => r.key === draft.copyFrom);
    try {
      const res = await api.post('/admin/roles', { name: draft.name, description: draft.description, permissions: from ? from.permissions : [] });
      setAdding(false);
      setDraft({ name: '', description: '', copyFrom: 'reviewer' });
      onChanged('Added the ' + draft.name.trim() + ' role. Adjust its permissions below.', res);
    } catch (err) {
      onError(err.message);
    }
  };

  const deleteRole = async () => {
    const r = toDelete;
    setToDelete(null);
    try {
      const res = await api.delete('/admin/roles/' + r.key);
      onChanged('Deleted the ' + r.name + ' role.', res);
    } catch (err) {
      onError(err.message);
    }
  };

  const cols = data.roles;
  const grid = { gridTemplateColumns: 'minmax(240px, 1.6fr) repeat(' + cols.length + ', minmax(112px, 1fr))' };

  return (
    <>
      <section className="sa-card">
        <div className="sa-card-head">
          <div>
            <h2 className="sa-card-title">What each role can do</h2>
            <p className="sa-faint">Everyone signed in can view publications, plans, studies and dashboards. The server checks each of these too, not only the screens.</p>
          </div>
          {!adding && <Button variant="secondary" icon="add" onClick={() => setAdding(true)}>New Role</Button>}
        </div>

        {adding && (
          <div className="sa-add">
            <div className="sa-add-grid">
              <Field label="Role name"><TextField value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} autoFocus placeholder="e.g. Compliance Reviewer" /></Field>
              <Field label="Description"><TextField value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Who has it and why" /></Field>
              <Field label="Start from"><Select options={cols.filter(r => !r.locked).map(r => ({ value: r.key, label: r.name + '’s permissions' })).concat([{ value: '', label: 'No permissions (view only)' }])} value={draft.copyFrom} onChange={e => setDraft({ ...draft, copyFrom: e.target.value })} width="100%" /></Field>
            </div>
            <div className="sa-add-foot">
              <span className="sa-grow" />
              <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
              <Button variant="primary" onClick={createRole} disabled={!draft.name.trim()}>Add Role</Button>
            </div>
          </div>
        )}

        <div className="sa-matrix-wrap">
          <div className="sa-matrix" role="table" aria-label="Permissions by role" style={{ minWidth: 260 + cols.length * 112 }}>
            <div className="sa-mrow sa-mrow--head" role="row" style={grid}>
              <span role="columnheader" className="sa-mperm">Permission</span>
              {cols.map(r => (
                <span key={r.key} role="columnheader" className="sa-mrole" title={r.description}>
                  <span className="sa-mrole-name">{r.name}</span>
                  <span className="sa-faint">{plural(r.users, 'user')}</span>
                  {!r.builtIn && r.users === 0 && (
                    <button type="button" className="sa-mdel" onClick={() => setToDelete(r)} aria-label={'Delete the ' + r.name + ' role'} title="Delete role">
                      <Icon name="delete" size={16} />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {groups.map(g => (
              <React.Fragment key={g.name}>
                <div className="sa-mgroup" role="row"><span role="cell">{g.name}</span></div>
                {g.items.map(p => (
                  <div key={p.key} className="sa-mrow" role="row" style={grid}>
                    <span role="rowheader" className="sa-mperm">
                      <span className="sa-mperm-label">{p.label}</span>
                      {p.help && <span className="sa-faint">{p.help}</span>}
                    </span>
                    {cols.map(r => {
                      const on = permsOf(r).has(p.key);
                      const changed = edits[r.key] && on !== r.permissions.includes(p.key);
                      return (
                        <span key={r.key} role="cell" className={'sa-mcell' + (changed ? ' sa-mcell--changed' : '')}>
                          {r.locked === 'all' ? (
                            <span role="img" aria-label="Always allowed" title="System Administrators always have every permission."><Icon name="lock" size={16} color="var(--fg-3)" /></span>
                          ) : r.locked === 'fixed' ? (
                            on
                              ? <span role="img" aria-label="Always allowed" title="On publications they\u2019re listed on as an author; always tracked."><Icon name="lock" size={16} color="var(--fg-3)" /></span>
                              : <span className="sa-faint" title="External authors can\u2019t do this.">&mdash;</span>
                          ) : (
                            <input type="checkbox" checked={on} onChange={() => toggle(r, p.key)} aria-label={r.name + ': ' + p.label} />
                          )}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {dirtyKeys.length > 0 && (
          <div className="sa-savebar">
            <span>Unsaved changes to {dirtyKeys.map(k => data.roles.find(r => r.key === k).name).join(', ')}.</span>
            <span className="sa-grow" />
            <Button variant="secondary" onClick={() => setEdits({})} disabled={saving}>Discard</Button>
            <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        )}
      </section>

      <section className="sa-card">
        <h2 className="sa-card-title">Roles</h2>
        <ul className="sa-rolelist">
          {cols.map(r => (
            <li key={r.key}>
              <span className="sa-rolelist-name"><span className="sa-mrole-name">{r.name}</span>{!r.builtIn && <Pill tone="draft">Custom</Pill>}</span>
              <span className="sa-faint">{r.description || 'No description.'}</span>
            </li>
          ))}
        </ul>
      </section>

      {toDelete && (
        <ConfirmModal
          title={'Delete the ' + toDelete.name + ' role?'}
          confirmLabel="Delete Role"
          cancelLabel="Keep"
          onConfirm={deleteRole}
          onCancel={() => setToDelete(null)}
        >
          Nobody has this role, so no one loses access.
        </ConfirmModal>
      )}
    </>
  );
}
