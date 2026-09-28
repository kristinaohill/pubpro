import React, { useEffect, useState } from 'react';
import { Button, IconButton, TextField } from '../ds/pubpro';
import { api } from '../api';
import useCatalog, { refreshCatalog } from '../components/catalog';

// System Administrator > Products and > Product roles: set these up first; internal Publication
// Managers and Reviewers are then aligned to products, with a product role on each. Saved ones are
// retired (inactive) rather than deleted, so the records and people that use them stay intact.

/** Active / Inactive toggle for a saved product, role or review type. */
export function ActiveSwitch({ on, label, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={(label || 'Item') + ' active'} className={'sa-switch' + (on ? ' sa-switch--on' : '')} onClick={() => onChange(!on)}>
      <span className="sa-switch-knob" aria-hidden="true" />
      <span className="sa-switch-text">{on ? 'Active' : 'Inactive'}</span>
    </button>
  );
}

/** Products: name, therapeutic area and the code used in record IDs (e.g. 26-M-DAX-015-V01). */
export function ProductsTab({ onChanged, onError }) {
  const cat = useCatalog();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (cat.products.length && !rows) setRows(cat.products.map(p => ({ ...p, was: p.name }))); }, [cat.products, rows]);
  if (!rows) return <section className="sa-card"><div className="empty-state empty-state--inset">Loading&hellip;</div></section>;

  const saved = JSON.stringify(cat.products.map(p => [p.name, p.ta, p.code, p.active !== false]));
  const dirty = JSON.stringify(rows.map(p => [p.name, p.ta, p.code, p.active !== false])) !== saved;
  const areas = [...new Set(rows.map(r => r.ta).filter(Boolean))];
  const patch = (i, p) => setRows(list => list.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const save = async () => {
    setBusy(true);
    try {
      await api.put('/admin/products', { products: rows });
      await refreshCatalog();
      setRows(null);
      onChanged('Saved products.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="sa-card">
      <div className="sa-card-head">
        <div>
          <h2 className="sa-card-title">Products</h2>
          <p className="sa-faint">Set these up first. Therapeutic areas group the products (picking an area narrows the product list on publications and plans); the code goes into record IDs.</p>
        </div>
        <Button variant="secondary" icon="add" onClick={() => setRows(list => list.concat([{ name: '', ta: areas[0] || '', code: '', active: true, was: null }]))}>Add Product</Button>
      </div>
      <datalist id="sa-ta-list">{areas.map(a => <option key={a} value={a} />)}</datalist>
      <div className="sa-cat" role="table" aria-label="Products">
        <div className="sa-cat-row sa-cat-row--head" role="row">
          <span role="columnheader">Product</span><span role="columnheader">Therapeutic area</span><span role="columnheader">Code</span><span role="columnheader">Active</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className={'sa-cat-row' + (r.active === false ? ' sa-cat-row--off' : '')} role="row">
            <span role="cell"><TextField value={r.name} onChange={e => patch(i, { name: e.target.value })} placeholder="e.g. Daxafort (Atopic Dermatitis)" aria-label="Product name" /></span>
            <span role="cell"><TextField value={r.ta} onChange={e => patch(i, { ta: e.target.value })} list="sa-ta-list" placeholder="e.g. Immunology" aria-label="Therapeutic area" /></span>
            <span role="cell"><TextField value={r.code} onChange={e => patch(i, { code: e.target.value.toUpperCase() })} placeholder="DAX" aria-label="Record ID code" /></span>
            <span role="cell" className="sa-cat-active">
              {r.was ? (
                <ActiveSwitch on={r.active !== false} label={r.name} onChange={v => patch(i, { active: v })} />
              ) : (
                <IconButton icon="close" tone="fatal" size={26} title="Remove this new row" onClick={() => setRows(list => list.filter((x, j) => j !== i))} />
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="sa-faint">
        Renaming a product updates its publications, plans and the people aligned to it. Saved products aren&rsquo;t deleted: mark one inactive
        and it can&rsquo;t be picked for new publications, plans or people, while everything that already uses it keeps working.
      </p>
      {dirty && (
        <div className="sa-savebar">
          <span>Unsaved changes to products.</span>
          <span className="sa-grow" />
          <Button variant="secondary" onClick={() => setRows(null)} disabled={busy}>Discard</Button>
          <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Button>
        </div>
      )}
    </section>
  );
}

/** Product roles: the job someone does on a product (Medical Reviewer, Patent Attorney...). */
export function ProductRolesTab({ onChanged, onError }) {
  const cat = useCatalog();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (cat.productRoles.length && !rows) setRows(cat.productRoles.map(r => ({ ...r }))); }, [cat.productRoles, rows]);
  if (!rows) return <section className="sa-card"><div className="empty-state empty-state--inset">Loading&hellip;</div></section>;

  const dirty = JSON.stringify(rows.map(r => [r.key, r.name, r.description, r.active !== false])) !== JSON.stringify(cat.productRoles.map(r => [r.key, r.name, r.description, r.active !== false]));
  const patch = (i, p) => setRows(list => list.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const save = async () => {
    setBusy(true);
    try {
      await api.put('/admin/product-roles', { productRoles: rows });
      await refreshCatalog();
      setRows(null);
      onChanged('Saved product roles.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="sa-card">
      <div className="sa-card-head">
        <div>
          <h2 className="sa-card-title">Product roles</h2>
          <p className="sa-faint">
            The jobs people do on a product. Each Publication Manager and Reviewer gets one of these on every product they work on, and review
            types bring people in by them (an MLR review on Biologix includes whoever is Legal Reviewer on Biologix).
          </p>
        </div>
        <Button variant="secondary" icon="add" onClick={() => setRows(list => list.concat([{ key: null, name: '', description: '', active: true }]))}>Add Role</Button>
      </div>
      <div className="sa-cat sa-cat--roles" role="table" aria-label="Product roles">
        <div className="sa-cat-row sa-cat-row--head" role="row">
          <span role="columnheader">Role</span><span role="columnheader">What they do</span><span role="columnheader">Active</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.key || 'new' + i} className={'sa-cat-row' + (r.active === false ? ' sa-cat-row--off' : '')} role="row">
            <span role="cell"><TextField value={r.name} onChange={e => patch(i, { name: e.target.value })} placeholder="e.g. Medical Reviewer" aria-label="Role name" /></span>
            <span role="cell"><TextField value={r.description} onChange={e => patch(i, { description: e.target.value })} placeholder="e.g. Reviews for medical accuracy" aria-label="What they do" /></span>
            <span role="cell" className="sa-cat-active">
              {r.key ? (
                <ActiveSwitch on={r.active !== false} label={r.name} onChange={v => patch(i, { active: v })} />
              ) : (
                <IconButton icon="close" tone="fatal" size={26} title="Remove this new row" onClick={() => setRows(list => list.filter((x, j) => j !== i))} />
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="sa-faint">
        Saved roles aren&rsquo;t deleted: mark one inactive and it can&rsquo;t be given to anyone new or added to a review type, while people who
        already have it keep it.
      </p>
      {dirty && (
        <div className="sa-savebar">
          <span>Unsaved changes to product roles.</span>
          <span className="sa-grow" />
          <Button variant="secondary" onClick={() => setRows(null)} disabled={busy}>Discard</Button>
          <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</Button>
        </div>
      )}
    </section>
  );
}

