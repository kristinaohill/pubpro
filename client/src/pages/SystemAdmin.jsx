import React, { useEffect, useMemo, useState } from 'react';
import { Button, ConfirmModal, Field, Icon, InlineMessage, Pill, Select, TextField } from '../ds/pubpro';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import PageHeader from '../components/PageHeader';
import Flash from '../components/Flash';
import { UsersTab } from './SystemAdminUsers';
import ExternalUsersTab from './SystemAdminExternal';
import ReviewTypesTab from './SystemAdminReviewTypes';
import DropdownListsTab from './SystemAdminLists';
import { ProductRolesTab, ProductsTab } from './SystemAdminCatalog';
import './SystemAdmin.css';

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');

/** System Administrator (Workspaces menu): users, roles and what each role can do. Needs admin.users. */
export default function SystemAdmin() {
  const { user, can } = useAuth();
  const [tab, setTab] = useState('internal');
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
        description="Set up products and product roles first, then add people and align them to products. Changes apply as soon as they're saved."
      />
      <div className="sa-tabs" role="tablist" aria-label="System Administrator sections">
        <button type="button" role="tab" aria-selected={tab === 'products'} className="sa-tab" onClick={() => setTab('products')}>
          Products
        </button>
        <button type="button" role="tab" aria-selected={tab === 'productRoles'} className="sa-tab" onClick={() => setTab('productRoles')}>
          Product roles
        </button>
        <button type="button" role="tab" aria-selected={tab === 'internal'} className="sa-tab" onClick={() => setTab('internal')}>
          Internal users{users ? <span className="sa-tab-n">{users.filter(x => x.role !== 'author' && x.role !== 'library').length}</span> : null}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'external'} className="sa-tab" onClick={() => setTab('external')}>
          External users
        </button>
        <button type="button" role="tab" aria-selected={tab === 'library'} className="sa-tab" onClick={() => setTab('library')}>
          Library users{users ? <span className="sa-tab-n">{users.filter(x => x.role === 'library').length}</span> : null}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'roles'} className="sa-tab" onClick={() => setTab('roles')}>
          Access levels
        </button>
        <button type="button" role="tab" aria-selected={tab === 'reviews'} className="sa-tab" onClick={() => setTab('reviews')}>
          Review types
        </button>
        <button type="button" role="tab" aria-selected={tab === 'lists'} className="sa-tab" onClick={() => setTab('lists')}>
          Dropdown lists
        </button>
      </div>

      {notice && <Flash watch={notice}>{notice}</Flash>}
      {error && <InlineMessage kind="error">{error}</InlineMessage>}

      {tab === 'products' ? (
        <ProductsTab onChanged={msg => { setError(''); if (msg) setNotice(msg); loadRoles(); }} onError={setError} />
      ) : tab === 'productRoles' ? (
        <ProductRolesTab onChanged={msg => { setError(''); if (msg) setNotice(msg); loadRoles(); }} onError={setError} />
      ) : tab === 'external' ? (
        <ExternalUsersTab
          onChanged={msg => { setError(''); if (msg) setNotice(msg); loadUsers(); }}
          onError={setError}
        />
      ) : tab === 'internal' || tab === 'library' ? (
        <UsersTab
          key={tab}
          kind={tab}
          me={user} users={users} roles={roleData ? roleData.roles : []} options={roleData && roleData.options}
          onChanged={(msg, list) => { setError(''); if (msg) setNotice(msg); if (list) setUsers(list); else loadUsers(); loadRoles(); }}
          onError={setError}
        />
      ) : tab === 'lists' ? (
        <DropdownListsTab onChanged={msg => { setError(''); if (msg) setNotice(msg); }} onError={setError} />
      ) : tab === 'reviews' ? (
        <ReviewTypesTab onChanged={msg => { setError(''); if (msg) setNotice(msg); }} onError={setError} />
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

  const cols = data.roles;
  const grid = { gridTemplateColumns: 'minmax(240px, 1.6fr) repeat(' + cols.length + ', minmax(112px, 1fr))' };

  return (
    <>
      <section className="sa-card">
        <div className="sa-card-head">
          <div>
            <h2 className="sa-card-title">What each access level can do</h2>
            <p className="sa-faint">
              System Administrators and Executives cover every product; Publication Managers and Reviewers only the products they&rsquo;re aligned to.
              Executives always have exactly what Publication Managers have. The server checks each of these, not only the screens.
            </p>
          </div>
        </div>

        <div className="sa-matrix-wrap">
          <div className="sa-matrix" role="table" aria-label="Permissions by role" style={{ minWidth: 260 + cols.length * 112 }}>
            <div className="sa-mrow sa-mrow--head" role="row" style={grid}>
              <span role="columnheader" className="sa-mperm">Permission</span>
              {cols.map(r => (
                <span key={r.key} role="columnheader" className="sa-mrole" title={r.description}>
                  <span className="sa-mrole-name">{r.name}</span>
                  <span className="sa-faint">{plural(r.users, 'user')}</span>
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
                          ) : r.locked === 'pm' ? (
                            on
                              ? <span role="img" aria-label="Same as Publication Manager" title="Executives always have what Publication Managers have, on every product."><Icon name="lock" size={16} color="var(--fg-3)" /></span>
                              : <span className="sa-faint" title="Publication Managers don\u2019t have this either.">&mdash;</span>
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
        <h2 className="sa-card-title">Access levels</h2>
        <ul className="sa-rolelist">
          {cols.map(r => (
            <li key={r.key}>
              <span className="sa-rolelist-name">
                <span className="sa-mrole-name">{r.name}</span>
                {r.key !== 'author' && <Pill tone={r.allProducts ? 'active' : 'draft'}>{r.allProducts ? 'All products' : 'Chosen products'}</Pill>}
              </span>
              <span className="sa-faint">{r.description || 'No description.'}</span>
            </li>
          ))}
        </ul>
      </section>

    </>
  );
}
