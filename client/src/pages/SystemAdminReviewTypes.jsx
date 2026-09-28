import React, { useEffect, useState } from 'react';
import { Button, Field, Icon, Select, TextField } from '../ds/pubpro';
import { api } from '../api';
import usePeople, { refreshReviewTypes } from '../components/usePeople';
import useCatalog from '../components/catalog';
import { ActiveSwitch } from './SystemAdminCatalog';

// System Administrator > Review Types: for each kind of review round, who is required (locked on the
// round), who is optional (listed and ticked; the publication manager can untick them) and who isn't
// included. Participants are the publication's internal or external authors, everyone holding a role
// (following their product scope), or named people.

const LEVELS = [['none', 'Not included'], ['optional', 'Optional'], ['required', 'Required']];
const idOf = x => x.kind + ':' + (x.role || x.userId || '');
const levelOf = (t, x) => (t.required.some(y => idOf(y) === idOf(x)) ? 'required' : t.optional.some(y => idOf(y) === idOf(x)) ? 'optional' : 'none');
const summary = t => [t.required.length && t.required.length + ' required', t.optional.length && t.optional.length + ' optional'].filter(Boolean).join(' · ') || 'Nobody set up yet';

export default function ReviewTypesTab({ onChanged, onError }) {
  const staff = usePeople();
  const cat = useCatalog();
  const [saved, setSaved] = useState(null); // { types, roles }
  const [types, setTypes] = useState(null);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [addPerson, setAddPerson] = useState('');

  // Each type remembers its saved name so a renamed custom type isn't taken for a removed one.
  const load = () => api.get('/review-types').then(r => { const t = r.types.map(x => ({ ...x, was: x.name })); setSaved({ ...r, types: t }); setTypes(t); }).catch(err => onError(err.message));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (!types) return <section className="sa-card"><div className="empty-state empty-state--inset">Loading&hellip;</div></section>;

  const dirty = JSON.stringify(types) !== JSON.stringify(saved.types);
  const t = types[Math.min(sel, types.length - 1)];
  // Active product roles, plus any retired one this type still uses.
  const inactiveRole = key => (cat.productRoles.find(r => r.key === key) || {}).active === false;
  const roles = saved.roles.filter(r => !inactiveRole(r.key) || t.required.concat(t.optional).some(x => x.kind === 'role' && x.role === r.key));
  const rows = [
    { src: { kind: 'internal_authors' }, label: 'Internal authors', hint: 'Everyone on the publication’s Authors tab from BP Logix' },
    { src: { kind: 'external_authors' }, label: 'External authors', hint: 'The publication’s external authors (who haven’t declined)' },
  ].concat(roles.map(r => ({ src: { kind: 'role', role: r.key }, label: r.name + (inactiveRole(r.key) ? ' (inactive role)' : ''), hint: 'Everyone with this role on the publication\u2019s product' })))
    .concat(t.required.concat(t.optional).filter(x => x.kind === 'user').map(x => {
      const p = staff.find(s => String(s.id) === String(x.userId));
      return { src: x, label: p ? p.name : 'Former user', hint: 'Named person', removable: true };
    }));

  const update = patch => setTypes(list => list.map((x, i) => (i === Math.min(sel, list.length - 1) ? { ...x, ...patch } : x)));
  const setLevel = (src, level) => {
    const drop = l => l.filter(y => idOf(y) !== idOf(src));
    update({
      required: level === 'required' ? drop(t.required).concat([src]) : drop(t.required),
      optional: level === 'optional' ? drop(t.optional).concat([src]) : drop(t.optional),
    });
  };
  const save = async () => {
    setBusy(true);
    try {
      const out = (await api.put('/admin/review-types', { types })).map(x => ({ ...x, was: x.name }));
      setSaved({ ...saved, types: out });
      setTypes(out);
      refreshReviewTypes();
      onChanged('Saved review types.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const addType = () => {
    const name = newName.trim();
    if (!name) return;
    if (types.some(x => x.name.toLowerCase() === name.toLowerCase())) { onError('There’s already a review type called ' + name + '.'); return; }
    setTypes(list => list.concat([{ name, builtIn: false, active: true, required: [], optional: [{ kind: 'internal_authors' }] }]));
    setSel(types.length);
    setAdding(false);
    setNewName('');
  };
  const people = staff.filter(p => !t.required.concat(t.optional).some(x => x.kind === 'user' && String(x.userId) === String(p.id)));

  return (
    <>
      <section className="sa-card">
        <div className="sa-card-head">
          <div>
            <h2 className="sa-card-title">Who reviews each type of review</h2>
            <p className="sa-faint">
              Required people are added to the round and can&rsquo;t be removed. Optional people are listed and ticked; whoever sends the round can untick them.
              Anyone else can still be added by hand on the Reviews tab.
            </p>
          </div>
          {!adding && <Button variant="secondary" icon="add" onClick={() => setAdding(true)}>New Review Type</Button>}
        </div>
        {adding && (
          <div className="sa-add">
            <div className="sa-inline">
              <Field label="Review type name"><TextField value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. MLR Review" autoFocus /></Field>
              <span className="sa-grow" />
              <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
              <Button variant="primary" onClick={addType} disabled={!newName.trim()}>Add</Button>
            </div>
          </div>
        )}

        <div className="sa-rt">
          <nav className="sa-rt-list" aria-label="Review types">
            {types.map((x, i) => (
              <button key={x.name + i} type="button" className="sa-rt-item" aria-current={i === Math.min(sel, types.length - 1) ? 'true' : undefined} onClick={() => setSel(i)}>
                <span className="sa-rt-name">{x.name}{x.active === false && <span className="sa-inactive">Inactive</span>}</span>
                <span className="sa-faint">{summary(x)}</span>
              </button>
            ))}
          </nav>

          <div className="sa-rt-edit">
            <div className="sa-rt-head">
              {t.builtIn ? (
                <h3 className="sa-rt-title">{t.name}</h3>
              ) : (
                <Field label="Name"><TextField value={t.name} onChange={e => update({ name: e.target.value })} width="320px" /></Field>
              )}
              <span className="sa-faint">{t.builtIn ? 'Part of the publication workflow' : 'Custom review type'}{t.active === false ? ' \u00b7 not offered for new rounds' : ''}</span>
              <span className="sa-grow" />
              {t.was ? (
                <ActiveSwitch on={t.active !== false} label={t.name} onChange={v => update({ active: v })} />
              ) : (
                <Button variant="secondary" onClick={() => { setTypes(list => list.filter(x => x !== t)); setSel(0); }}>Remove</Button>
              )}
            </div>

            <div className="sa-rt-table" role="table" aria-label={'Participants for ' + t.name}>
              {rows.map(r => {
                const level = levelOf(t, r.src);
                return (
                  <div key={idOf(r.src)} className={'sa-rt-row sa-rt-row--' + level} role="row">
                    <span role="cell" className="sa-rt-who">
                      <span className="sa-rt-label">{r.label}</span>
                      <span className="sa-faint">{r.hint}</span>
                    </span>
                    <span role="cell" className="sa-seg" aria-label={'How ' + r.label + ' take part'}>
                      {LEVELS.map(([k, l]) => (
                        <button key={k} type="button" className={'sa-seg-btn sa-seg-btn--' + k} aria-pressed={level === k} onClick={() => setLevel(r.src, k)}>{l}</button>
                      ))}
                    </span>
                    <span role="cell" className="sa-rt-x">
                      {r.removable && <button type="button" className="sa-x" aria-label={'Remove ' + r.label} onClick={() => setLevel(r.src, 'none')}><Icon name="close" size={16} /></button>}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="sa-inline sa-rt-add">
              <Select
                options={[{ value: '', label: 'Add a specific person…' }].concat(people.map(p => ({ value: String(p.id), label: p.name + (p.title ? ' · ' + p.title : '') })))}
                value={addPerson}
                onChange={e => setAddPerson(e.target.value)}
                width="320px"
                aria-label="Add a specific person"
              />
              <Button variant="secondary" onClick={() => { if (addPerson) { setLevel({ kind: 'user', userId: Number(addPerson) }, 'required'); setAddPerson(''); } }} disabled={!addPerson}>Add as Required</Button>
            </div>
          </div>
        </div>

        {dirty && (
          <div className="sa-savebar">
            <span>Unsaved changes to review types.</span>
            <span className="sa-grow" />
            <Button variant="secondary" onClick={() => setTypes(saved.types)} disabled={busy}>Discard</Button>
            <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        )}
      </section>

    </>
  );
}
