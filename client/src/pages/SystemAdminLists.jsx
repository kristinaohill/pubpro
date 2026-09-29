import React, { useEffect, useState } from 'react';
import { Button, Icon, IconButton, TextField } from '../ds/pubpro';
import { api } from '../api';
import useCatalog, { refreshCatalog } from '../components/catalog';
import { ActiveSwitch } from './SystemAdminCatalog';

// System Administrator > Dropdown lists: the options in PubPro's dropdowns. Records store the
// option's text, so a saved option is never deleted: mark it inactive and records keep it while
// pickers stop offering it. Locked options are ones PubPro's workflow relies on.

const summary = l => {
  const on = l.items.filter(x => x.active).length;
  const off = l.items.length - on;
  return on + ' active' + (off ? ' · ' + off + ' inactive' : '');
};

export default function DropdownListsTab({ onChanged, onError }) {
  const cat = useCatalog();
  const lists = cat.picklists || [];
  const [sel, setSel] = useState(null);
  const [items, setItems] = useState(null); // the list being edited: [{ label, active, locked, was }]
  const [busy, setBusy] = useState(false);
  const [newText, setNewText] = useState('');

  const list = lists.find(l => l.key === sel) || lists[0];
  const savedItems = list ? list.items.map(x => ({ ...x, was: x.label })) : [];
  useEffect(() => { if (list) setItems(list.items.map(x => ({ ...x, was: x.label }))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [list && list.key, cat]);

  if (!list || !items) return <section className="sa-card"><div className="empty-state empty-state--inset">Loading&hellip;</div></section>;

  const dirty = JSON.stringify(items) !== JSON.stringify(savedItems);
  const patch = (i, p) => setItems(xs => xs.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i, d) => setItems(xs => {
    const j = i + d;
    if (j < 0 || j >= xs.length) return xs;
    const out = xs.slice();
    [out[i], out[j]] = [out[j], out[i]];
    return out;
  });
  const add = () => {
    const label = newText.trim();
    if (!label) return;
    if (items.some(x => x.label.toLowerCase() === label.toLowerCase())) { onError('“' + label + '” is already in ' + list.name + '.'); return; }
    setItems(xs => xs.concat([{ label, active: true, locked: false, was: null }]));
    setNewText('');
  };
  const pick = key => {
    if (dirty && !window.confirm('Discard your unsaved changes to ' + list.name + '?')) return;
    setSel(key);
    setNewText('');
  };
  const save = async () => {
    setBusy(true);
    try {
      await api.put('/admin/picklists/' + list.key, { items: items.map(({ label, active, was }) => ({ label, active, was })) });
      await refreshCatalog();
      onChanged('Saved ' + list.name + '.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const groups = [...new Set(lists.map(l => l.group))];

  return (
    <section className="sa-card">
      <div className="sa-card-head">
        <div>
          <h2 className="sa-card-title">Dropdown lists</h2>
          <p className="sa-faint">
            The options people pick from across PubPro. Records keep the text they were saved with, so options you no longer want are
            marked inactive rather than deleted. Locked options are used by PubPro&rsquo;s workflow.
          </p>
        </div>
      </div>

      <div className="sa-rt">
        <nav className="sa-rt-list" aria-label="Dropdown lists">
          {groups.map(g => (
            <React.Fragment key={g}>
              <div className="sa-dl-group">{g}</div>
              {lists.filter(l => l.group === g).map(l => (
                <button key={l.key} type="button" className="sa-rt-item" aria-current={l.key === list.key ? 'true' : undefined} onClick={() => pick(l.key)}>
                  <span className="sa-rt-name">{l.name}</span>
                  <span className="sa-faint">{summary(l)}</span>
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>

        <div className="sa-rt-edit">
          <div className="sa-rt-head">
            <div>
              <h3 className="sa-rt-title">{list.name}</h3>
              <span className="sa-faint">Used in {list.usedIn}</span>
            </div>
          </div>

          <div className="sa-rt-table" role="table" aria-label={list.name + ' options'}>
            {items.map((x, i) => (
              <div key={(x.was || 'new') + i} className={'sa-dl-row' + (x.active ? '' : ' sa-dl-row--off')} role="row">
                <span role="cell" className="sa-dl-order">
                  <IconButton icon="arrow_upward" tone="locked" size={26} title={'Move ' + x.label + ' up'} onClick={() => move(i, -1)} disabled={i === 0} />
                  <IconButton icon="arrow_downward" tone="locked" size={26} title={'Move ' + x.label + ' down'} onClick={() => move(i, 1)} disabled={i === items.length - 1} />
                </span>
                <span role="cell" className="sa-dl-label">
                  {x.locked ? (
                    <span className="sa-dl-locked"><Icon name="lock" size={16} color="var(--fg-3)" />{x.label}<span className="sa-faint">Used by PubPro</span></span>
                  ) : (
                    <TextField value={x.label} onChange={e => patch(i, { label: e.target.value })} width="100%" aria-label="Option text" />
                  )}
                  {x.was && x.label.trim() !== x.was && <span className="sa-faint">Was &ldquo;{x.was}&rdquo;. Records saved with the old text keep it.</span>}
                </span>
                <span role="cell" className="sa-dl-end">
                  {x.was ? (
                    x.locked ? <span className="sa-faint">Always on</span> : <ActiveSwitch on={x.active} label={x.label} onChange={v => patch(i, { active: v })} />
                  ) : (
                    <IconButton icon="close" tone="fatal" size={26} title={'Remove ' + x.label} onClick={() => setItems(xs => xs.filter((_, j) => j !== i))} />
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="sa-inline sa-rt-add">
            <TextField value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} placeholder={'New option for ' + list.name.toLowerCase()} width="320px" aria-label="New option" />
            <Button variant="secondary" icon="add" onClick={add} disabled={!newText.trim()}>Add Option</Button>
          </div>

          {dirty && (
            <div className="sa-savebar">
              <span>Unsaved changes to {list.name}.</span>
              <span className="sa-grow" />
              <Button variant="secondary" onClick={() => setItems(savedItems)} disabled={busy}>Discard</Button>
              <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
