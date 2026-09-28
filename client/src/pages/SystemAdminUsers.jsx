import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, ConfirmModal, Field, Icon, InlineMessage, Pill, Select, TextArea, TextField } from '../ds/pubpro';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import DateField from '../components/DateField';
import { refreshPeople } from '../components/usePeople';
import { ChipCheck } from './publication-form/ui';
import { fmtSaved } from './Publications';
import { scopeLabel, shortProduct } from '../components/scope';

// System Administrator > Users (list, add, edit, approve, Sign In As) and > Sign-up.

const mdy = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? +m[2] + '/' + +m[3] + '/' + m[1] : ''; };
const iso = s => { const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : ''; };
const initials = name => String(name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const emptyScope = d => d.roles.some(r => Array.isArray(d.scopes[r]) && !d.scopes[r].length);
const copy = text => { try { navigator.clipboard.writeText(text); } catch (e) { /* ignore */ } };

const draftOf = u => ({
  name: u.name || '', email: u.email || '', roles: u.roles || (u.role ? [u.role] : ['reviewer']), scopes: u.scopes || {},
  title: u.title || '', department: u.department || '', phone: u.phone || '', therapeuticAreas: u.therapeuticAreas || [],
  oooOn: !!(u.ooo && (u.ooo.from || u.ooo.to)), oooFrom: mdy(u.ooo && u.ooo.from), oooTo: mdy(u.ooo && u.ooo.to), oooNote: (u.ooo && u.ooo.note) || '',
});
const bodyOf = d => ({
  name: d.name, email: d.email, roles: d.roles,
  scopes: Object.fromEntries(d.roles.filter(r => r !== 'admin' && r !== 'author').map(r => [r, d.scopes[r] || 'all'])),
  title: d.title, department: d.department, phone: d.phone, therapeuticAreas: d.therapeuticAreas,
  ooo: d.oooOn ? { from: iso(d.oooFrom), to: iso(d.oooTo), note: d.oooNote } : { from: '', to: '', note: '' },
});

/**
 * Which products one of the person's roles covers: all, or chosen products (a therapeutic area
 * button picks all of its products). E.g. Patent Attorney for Biologix only.
 */
function RoleScope({ roleName, value, onChange, options }) {
  const products = options.products || [];
  const byTa = {};
  products.forEach(p => { const ta = (options.productTa || {})[p] || 'Other'; (byTa[ta] = byTa[ta] || []).push(p); });
  const list = Array.isArray(value) ? value : null;
  const toggle = p => onChange(list.includes(p) ? list.filter(x => x !== p) : list.concat([p]));
  const toggleTa = ps => onChange(ps.every(p => list.includes(p)) ? list.filter(p => !ps.includes(p)) : [...new Set(list.concat(ps))]);
  return (
    <div className="sa-scope">
      <div className="sa-scope-head">
        <span className="sa-scope-role">{roleName}</span>
        <label className="sa-scope-opt"><input type="radio" checked={!list} onChange={() => onChange('all')} /> All products</label>
        <label className="sa-scope-opt"><input type="radio" checked={!!list} onChange={() => onChange(list || [])} /> Only some products</label>
        {list && list.length > 0 && <span className="sa-faint">{scopeLabel(list)}</span>}
      </div>
      {list && (
        <div className="sa-scope-tas">
          {Object.entries(byTa).map(([ta, ps]) => (
            <div key={ta} className="sa-scope-ta">
              <button type="button" className={'sa-scope-tabtn' + (ps.every(p => list.includes(p)) ? ' sa-scope-tabtn--on' : '')} onClick={() => toggleTa(ps)} aria-pressed={ps.every(p => list.includes(p))}>
                {ta}
              </button>
              <div className="pfx-chips">
                {ps.map(p => <ChipCheck key={p} label={shortProduct(p)} checked={list.includes(p)} onChange={() => toggle(p)} />)}
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="sa-scope-warn">Pick at least one product, or choose All products.</div>}
        </div>
      )}
    </div>
  );
}

/** The fields shared by Add User and Edit: identity, role, work details, out of office. */
function UserFields({ d, set, roleOptions, options, roleLocked, roleNote, withOoo }) {
  const depts = (options.departments.includes(d.department) || !d.department ? [] : [d.department]).concat(options.departments);
  return (
    <div className="sa-form">
      <div className="sa-add-grid">
        <Field label="Name" required><TextField value={d.name} onChange={e => set({ name: e.target.value })} /></Field>
        <Field label="Email (sign-in)" required><TextField type="email" value={d.email} onChange={e => set({ email: e.target.value })} /></Field>

        <Field label="Job title"><TextField value={d.title} onChange={e => set({ title: e.target.value })} placeholder="e.g. Medical Director - Immunology" /></Field>
        <Field label="Department">
          <Select options={[{ value: '', label: 'Please select' }].concat(depts.map(x => ({ value: x, label: x })))} value={d.department} onChange={e => set({ department: e.target.value })} width="100%" />
        </Field>
        <Field label="Phone"><TextField type="tel" value={d.phone} onChange={e => set({ phone: e.target.value })} /></Field>
      </div>
      <fieldset className="sa-fieldset">
        <legend className="sa-legend">Roles</legend>
        {roleLocked ? (
          <div className="sa-fixed sa-fixed--field">{roleLocked}</div>
        ) : (
          <div className="pfx-chips">
            {roleOptions.map(r => (
              <ChipCheck
                key={r.value}
                label={r.label}
                checked={d.roles.includes(r.value)}
                onChange={() => set({ roles: d.roles.includes(r.value) ? d.roles.filter(x => x !== r.value) : d.roles.concat([r.value]) })}
              />
            ))}
          </div>
        )}
        <div className="sa-faint">{roleNote || (d.roles.length > 1 ? 'They get everything each of these roles allows.' : 'Pick more than one when someone wears several hats.')}</div>
      </fieldset>
      {!roleLocked && d.roles.some(r => r !== 'admin') && (
        <fieldset className="sa-fieldset">
          <legend className="sa-legend">Products each role covers</legend>
          <div className="sa-faint">A role limited to some products only lets them edit and review those products&rsquo; publications and plans; dashboards open on them.</div>
          {d.roles.filter(r => r !== 'admin').map(r => (
            <RoleScope
              key={r}
              roleName={(roleOptions.find(o => o.value === r) || {}).label || r}
              value={d.scopes[r] || 'all'}
              onChange={v => set({ scopes: { ...d.scopes, [r]: v } })}
              options={options}
            />
          ))}
        </fieldset>
      )}
      <fieldset className="sa-fieldset">
        <legend className="sa-legend">Therapeutic areas</legend>
        <div className="pfx-chips">
          {options.therapeuticAreas.map(ta => (
            <ChipCheck
              key={ta}
              label={ta}
              checked={d.therapeuticAreas.includes(ta)}
              onChange={() => set({ therapeuticAreas: d.therapeuticAreas.includes(ta) ? d.therapeuticAreas.filter(x => x !== ta) : d.therapeuticAreas.concat([ta]) })}
            />
          ))}
        </div>
      </fieldset>
      {withOoo && (
        <div className="sa-ooo">
          <Checkbox checked={d.oooOn} onChange={() => set({ oooOn: !d.oooOn })} label="Out of office" />
          {d.oooOn && (
            <div className="sa-add-grid sa-add-grid--ooo">
              <Field label="From"><DateField value={d.oooFrom} onChange={e => set({ oooFrom: e.target.value })} width="100%" /></Field>
              <Field label="Until"><DateField value={d.oooTo} onChange={e => set({ oooTo: e.target.value })} width="100%" /></Field>
              <Field label="Message"><TextArea value={d.oooNote} onChange={e => set({ oooNote: e.target.value })} width="100%" height="38px" /></Field>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function UsersTab({ me, users, roles, options, onChanged, onError }) {
  const navigate = useNavigate();
  const { impersonate, refreshMe, impersonator } = useAuth();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(draftOf({}));
  const [editing, setEditing] = useState(null); // { id, d }
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState(null); // { name, email, password, reset }
  const [confirm, setConfirm] = useState(null); // { kind: 'deactivate' | 'reset' | 'decline', user }
  const [approveRole, setApproveRole] = useState({}); // pending user id -> role

  const opts = options || { therapeuticAreas: [], departments: [] };
  const roleOptions = roles.filter(r => r.key !== 'author').map(r => ({ value: r.key, label: r.name }));
  const q = query.trim().toLowerCase();
  const pending = (users || []).filter(u => u.pending);
  const list = (users || []).filter(u => !u.pending && (showInactive || u.active)
    && (!roleFilter || (u.roles || [u.role]).includes(roleFilter))
    && (!q || [u.name, u.email, u.title, u.department].join(' ').toLowerCase().includes(q)));
  const inactiveCount = (users || []).filter(u => !u.active && !u.pending).length;
  const replace = saved => (users || []).map(x => (x.id === saved.id ? saved : x));
  const isSelf = u => String(u.id) === String(me && me.id);

  const run = async (fn, msg) => {
    setBusy(true);
    try {
      const out = await fn();
      if (out !== false) {
        refreshPeople();
        const known = out && out.id && (users || []).some(x => x.id === out.id);
        onChanged(typeof msg === 'function' ? msg(out) : msg, known ? replace(out) : undefined);
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const createUser = () => run(async () => {
    const r = await api.post('/admin/users', bodyOf(draft));
    setSecret({ name: r.user.name, email: r.user.email, password: r.tempPassword });
    setAdding(false);
    setDraft(draftOf({ role: draft.role }));
    return r.user;
  }, u => 'Added ' + u.name + ' (' + u.role_name + ').');

  const saveEdit = u => run(async () => {
    const d = editing.d;
    if (d.oooOn && ((d.oooFrom && !iso(d.oooFrom)) || (d.oooTo && !iso(d.oooTo)))) throw new Error('Enter out-of-office dates as m/d/yyyy.');
    const body = bodyOf(d);
    if (isSelf(u) || u.role === 'author') delete body.roles;
    const saved = await api.put('/admin/users/' + u.id, body);
    setEditing(null);
    if (isSelf(u)) refreshMe();
    return saved;
  }, s => 'Saved ' + s.name + '.');

  const signInAs = u => run(async () => {
    const who = await impersonate(u.id);
    navigate(who.role === 'author' ? '/author-dashboard' : '/dashboard');
    return false;
  });

  const approve = u => run(async () => api.post('/admin/users/' + u.id + '/approve', { roles: [approveRole[u.id] || u.role] }),
    s => s.name + ' can now sign in as ' + s.role_name + '.');

  const runConfirm = async () => {
    const { kind, user: u } = confirm;
    setConfirm(null);
    if (kind === 'deactivate') {
      run(() => api.put('/admin/users/' + u.id, { active: false }), s => s.name + ' is deactivated and can no longer sign in.');
      setEditing(null);
    } else if (kind === 'decline') {
      run(async () => { await api.delete('/admin/users/' + u.id); return null; }, 'Declined ' + u.name + '’s sign-up.');
    } else {
      run(async () => {
        const r = await api.post('/admin/users/' + u.id + '/reset-password', {});
        setSecret({ name: u.name, email: u.email, password: r.tempPassword, reset: true });
        return null;
      }, '');
    }
  };

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
            <div className="sa-faint">
              Share it with them privately. They sign in with it and set their own from the account menu (Change password).
              It won&rsquo;t be shown again.
            </div>
          </div>
          <Button variant="secondary" icon="content_copy" onClick={() => copy(secret.password)}>Copy</Button>
          <button type="button" className="sa-x" aria-label="Dismiss" onClick={() => setSecret(null)}><Icon name="close" size={18} /></button>
        </div>
      )}

      {pending.length > 0 && (
        <section className="sa-card sa-card--pending">
          <h2 className="sa-card-title">Waiting for approval ({pending.length})</h2>
          <p className="sa-faint">These people created an account on the sign-in page. Approve them with a role, or decline to remove the account.</p>
          <div className="sa-table" role="table" aria-label="Sign-ups waiting for approval">
            {pending.map(u => (
              <div key={u.id} className="sa-row sa-row--pending" role="row">
                <span role="cell" className="sa-user">
                  <span className="sa-avatar" aria-hidden="true">{initials(u.name)}</span>
                  <span><span className="sa-name">{u.name}</span><span className="sa-email">{u.email} · signed up {fmtSaved(u.created_at)}</span></span>
                </span>
                <span role="cell">
                  <Select options={roleOptions} value={approveRole[u.id] || u.role} onChange={e => setApproveRole({ ...approveRole, [u.id]: e.target.value })} width="100%" aria-label={'Role for ' + u.name} />
                </span>
                <span role="cell" className="sa-actions">
                  <Button variant="primary" icon="check" onClick={() => approve(u)} disabled={busy}>Approve</Button>
                  <Button variant="secondary" onClick={() => setConfirm({ kind: 'decline', user: u })} disabled={busy}>Decline</Button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="sa-card">
        <div className="sa-toolbar">
          <TextField iconBefore="search" placeholder="Search by name, email, title or department" value={query} onChange={e => setQuery(e.target.value)} width="320px" aria-label="Search users" />
          <Select options={[{ value: '', label: 'All roles' }].concat(roles.map(r => ({ value: r.key, label: r.name })))} value={roleFilter} onChange={e => setRoleFilter(e.target.value)} width="220px" aria-label="Filter by role" />
          {inactiveCount > 0 && (
            <label className="sa-check">
              <input type="checkbox" checked={showInactive} onChange={() => setShowInactive(v => !v)} />
              Show deactivated ({inactiveCount})
            </label>
          )}
          <span className="sa-grow" />
          {!adding && <Button variant="primary" icon="person_add" onClick={() => { setAdding(true); setEditing(null); }}>Add User</Button>}
        </div>

        {adding && (
          <div className="sa-add">
            <UserFields d={draft} set={p => setDraft(x => ({ ...x, ...p }))} roleOptions={roleOptions} options={opts} />
            <div className="sa-add-foot">
              <span className="sa-faint">PubPro creates a temporary password for you to pass on. External authors get their login from their author profile instead.</span>
              <span className="sa-grow" />
              <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
              <Button variant="primary" onClick={createUser} disabled={busy || !draft.name.trim() || !draft.email.trim() || !draft.roles.length || emptyScope(draft)}>{busy ? 'Adding…' : 'Add User'}</Button>
            </div>
          </div>
        )}

        {users === null ? <div className="empty-state empty-state--inset">Loading&hellip;</div> : list.length === 0 ? (
          <div className="empty-state empty-state--inset">No users match. Clear the search or filters to see everyone.</div>
        ) : (
          <div className="sa-table" role="table" aria-label="Users">
            <div className="sa-row sa-row--head" role="row">
              <span role="columnheader">User</span>
              <span role="columnheader">Role</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Last sign-in</span>
              <span role="columnheader"><span className="sa-sr">Actions</span></span>
            </div>
            {list.map(u => {
              const self = isSelf(u);
              const author = u.role === 'author';
              const open = editing && editing.id === u.id;
              return (
                <React.Fragment key={u.id}>
                  <div className={'sa-row' + (u.active ? '' : ' sa-row--off') + (open ? ' sa-row--open' : '')} role="row">
                    <span role="cell" className="sa-user">
                      <span className="sa-avatar" aria-hidden="true">{initials(u.name)}</span>
                      <span>
                        <span className="sa-name">{u.name}{self && <span className="sa-you"> (you)</span>}</span>
                        <span className="sa-email">{[u.email, u.title].filter(Boolean).join(' · ')}</span>
                      </span>
                    </span>
                    <span role="cell" className="sa-rolecell">
                      {(u.roles || [u.role]).map(r => {
                        const name = (roles.find(x => x.key === r) || {}).name || r;
                        const sc = u.scopes && Array.isArray(u.scopes[r]) ? u.scopes[r] : null;
                        return <span key={r} className="sa-rolechip">{name}{sc ? <span className="sa-rolechip-scope"> · {scopeLabel(sc)}</span> : null}</span>;
                      })}
                      {u.oooNow && <Pill tone="hold" style={{ marginLeft: 8 }}>Out of office</Pill>}
                    </span>
                    <span role="cell">{u.active ? <Pill tone="active">Active</Pill> : <Pill tone="cancelled">Deactivated</Pill>}</span>
                    <span role="cell" className="sa-faint">{u.last_login_at ? fmtSaved(u.last_login_at) : 'Never'}</span>
                    <span role="cell" className="sa-actions">
                      <Button variant="secondary" icon={open ? 'expand_less' : 'edit'} onClick={() => { setEditing(open ? null : { id: u.id, d: draftOf(u) }); setAdding(false); }}>
                        {open ? 'Close' : 'Edit'}
                      </Button>
                      {!self && u.active && !impersonator && (
                        <Button variant="tertiary" icon="login" onClick={() => signInAs(u)} disabled={busy} title={'See PubPro exactly as ' + u.name + ' does'}>Sign In As</Button>
                      )}
                    </span>
                  </div>
                  {open && (
                    <div className="sa-edit" role="region" aria-label={'Edit ' + u.name}>
                      <UserFields
                        d={editing.d}
                        set={p => setEditing(x => ({ ...x, d: { ...x.d, ...p } }))}
                        roleOptions={roleOptions}
                        options={opts}
                        withOoo
                        roleLocked={author ? 'External Author' : self ? u.role_name : null}
                        roleNote={author ? 'Comes from their external author profile.' : self ? 'Another administrator can change your roles.' : undefined}
                      />
                      <div className="sa-add-foot">
                        {!self && (u.active ? (
                          <>
                            <Button variant="secondary" icon="key" onClick={() => setConfirm({ kind: 'reset', user: u })} disabled={busy}>Reset Password</Button>
                            <Button variant="fatal" onClick={() => setConfirm({ kind: 'deactivate', user: u })} disabled={busy}>Deactivate</Button>
                          </>
                        ) : (
                          <Button variant="secondary" onClick={() => run(() => api.put('/admin/users/' + u.id, { active: true }), s => s.name + ' can sign in again.')} disabled={busy}>Reactivate</Button>
                        ))}
                        <span className="sa-faint">Member since {fmtSaved(u.created_at)}</span>
                        <span className="sa-grow" />
                        <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                        <Button variant="primary" onClick={() => saveEdit(u)} disabled={busy || !editing.d.name.trim() || !editing.d.email.trim() || !editing.d.roles.length || emptyScope(editing.d)}>{busy ? 'Saving…' : 'Save Changes'}</Button>
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
          title={confirm.kind === 'reset' ? 'Reset ' + confirm.user.name + '’s password?'
            : confirm.kind === 'decline' ? 'Decline ' + confirm.user.name + '’s sign-up?'
              : 'Deactivate ' + confirm.user.name + '?'}
          confirmLabel={confirm.kind === 'reset' ? 'Reset Password' : confirm.kind === 'decline' ? 'Decline' : 'Deactivate'}
          cancelLabel="Keep"
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        >
          {confirm.kind === 'reset' ? 'Their current password stops working. You’ll get a temporary one to pass on.'
            : confirm.kind === 'decline' ? 'Their account is removed. They can sign up again later.'
              : 'They’re signed out and can’t sign in until you reactivate them. Their name stays on records and audit trails.'}
        </ConfirmModal>
      )}
    </>
  );
}

const MODES = [
  { value: 'open', label: 'Anyone can create an account', help: 'They can sign in straight away with the role below.' },
  { value: 'approval', label: 'Anyone can ask for an account; an administrator approves it', help: 'Requests appear at the top of the Users tab.' },
  { value: 'closed', label: 'Only administrators create accounts', help: 'The sign-in page hides “Create an account”.' },
];

/** System Administrator > Sign-up: who can create their own account on the sign-in page. */
export function SignupTab({ data, onChanged, onError }) {
  const [domains, setDomains] = useState(null); // text being edited, or null = saved value
  if (!data) return <section className="sa-card"><div className="empty-state empty-state--inset">Loading&hellip;</div></section>;
  const { signup } = data;
  const staffRoles = data.roles.filter(r => !r.locked);
  const put = async (body, msg) => {
    try {
      const res = await api.put('/admin/settings', body);
      onChanged(msg, res);
      return true;
    } catch (err) {
      onError(err.message);
      return false;
    }
  };
  const domainText = domains != null ? domains : signup.domains.join(', ');
  return (
    <section className="sa-card">
      <h2 className="sa-card-title">Creating an account</h2>
      <fieldset className="sa-fieldset">
        <legend className="sa-legend">Who can create their own account on the sign-in page?</legend>
        <div className="sa-modes">
          {MODES.map(m => (
            <label key={m.value} className={'sa-mode' + (signup.mode === m.value ? ' sa-mode--on' : '')}>
              <input type="radio" name="sa-signup-mode" checked={signup.mode === m.value} onChange={() => put({ mode: m.value }, 'Sign-up: ' + m.label.toLowerCase() + '.')} />
              <span><span className="sa-mode-label">{m.label}</span><span className="sa-faint">{m.help}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      {signup.mode !== 'closed' && (
        <div className="sa-signup-grid">
          <Field label="Allowed email domains" help="Only these work emails can sign up. Leave empty to allow any email.">
            <div className="sa-inline">
              <TextField value={domainText} onChange={e => setDomains(e.target.value)} placeholder="e.g. acme-pharma.com, acme.com" />
              {domains != null && domains !== signup.domains.join(', ') && (
                <Button variant="primary" onClick={async () => { if (await put({ domains }, domains.trim() ? 'Sign-up limited to ' + domains.trim() + '.' : 'Any email can sign up.')) setDomains(null); }}>Save</Button>
              )}
            </div>
          </Field>
          <Field label={signup.mode === 'approval' ? 'Suggested role when approving' : 'Role new accounts get'}>
            <Select
              options={staffRoles.map(r => ({ value: r.key, label: r.name }))}
              value={data.signupRole}
              onChange={e => put({ signupRole: e.target.value }, 'New sign-ups now get the ' + staffRoles.find(r => r.key === e.target.value).name + ' role.')}
              width="100%"
            />
          </Field>
        </div>
      )}
      <InlineMessage kind="info">External authors don&rsquo;t sign up here: their login comes from their external author profile.</InlineMessage>
    </section>
  );
}
