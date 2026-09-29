import { useEffect, useState } from 'react';
import { api } from '../api';
import {
  CITATION_TYPE_OPTIONS, PRIORITY_OPTIONS, PRODUCTS, PRODUCT_TA, REVIEW_DEPT_OPTIONS, REVIEW_METHOD_OPTIONS,
  REVIEW_SPONSOR_OPTIONS, REVIEW_SUBTYPE_OPTIONS, REVIEW_THERAPEUTIC_AREA_OPTIONS, TIMEZONE_OPTIONS,
} from '../pages/publication-form/data';

// The catalog set up on System Administrator (GET /api/catalog): products with their therapeutic
// area and record-ID code, product roles, and access levels. The product lists in data.js are kept
// in step (updated in place), so every picker and filter that reads them follows the admin's setup:
// PRODUCTS (what pickers offer) holds only active products; PRODUCT_TA knows every product, so
// records on a retired product still show its therapeutic area.
let current = { products: [], productRoles: [], levels: [], picklists: [] };

// Dropdown lists (System Administrator > Dropdown lists) feed these option arrays, updated in place.
const LIST_ARRAYS = {
  departments: REVIEW_DEPT_OPTIONS, sponsorTypes: REVIEW_SPONSOR_OPTIONS, citationTypes: CITATION_TYPE_OPTIONS,
  timezones: TIMEZONE_OPTIONS, reviewPriorities: PRIORITY_OPTIONS, reviewMethods: REVIEW_METHOD_OPTIONS,
};
const activeOf = (c, key) => ((c.picklists || []).find(l => l.key === key) || { items: [] }).items.filter(x => x.active).map(x => x.label);
let version = 0;
const listeners = new Set();

function apply(c) {
  current = c;
  PRODUCTS.splice(0, PRODUCTS.length, ...c.products.filter(p => p.active !== false).map(p => p.name));
  Object.keys(PRODUCT_TA).forEach(k => { delete PRODUCT_TA[k]; });
  c.products.forEach(p => { PRODUCT_TA[p.name] = p.ta; });
  REVIEW_THERAPEUTIC_AREA_OPTIONS.splice(0, REVIEW_THERAPEUTIC_AREA_OPTIONS.length, ...[...new Set(c.products.filter(p => p.active !== false).map(p => p.ta))]);
  if ((c.picklists || []).length) {
    Object.entries(LIST_ARRAYS).forEach(([key, arr]) => { const on = activeOf(c, key); if (on.length) arr.splice(0, arr.length, ...on); });
    const subs = activeOf(c, 'abstractSubTypes');
    if (subs.length) REVIEW_SUBTYPE_OPTIONS.splice(0, REVIEW_SUBTYPE_OPTIONS.length, { value: '', label: 'Please select' }, ...subs.map(v => ({ value: v, label: v })));
  }
  version += 1;
  listeners.forEach(fn => fn(version));
}

export const refreshCatalog = () => api.get('/catalog').then(apply).catch(() => {});
export const catalog = () => current;
/** A dropdown list's active options (labels). */
export const picklist = key => activeOf(current, key);
/**
 * Options plus the record's current value when it's no longer offered (inactive or renamed), so the
 * record still shows what it has. Works for plain strings and { value, label } options.
 */
export const withValue = (options, value) => {
  if (!value || options.some(o => (typeof o === 'string' ? o : o.value) === value)) return options;
  return options.concat([typeof options[0] === 'object' ? { value, label: value + ' (no longer offered)' } : value]);
};
export const productRoleName = key => (current.productRoles.find(r => r.key === key) || {}).name || key;

/** Re-renders when the catalog changes; returns it. */
export default function useCatalog() {
  const [, setV] = useState(version);
  useEffect(() => {
    listeners.add(setV);
    return () => { listeners.delete(setV); };
  }, []);
  return current;
}
