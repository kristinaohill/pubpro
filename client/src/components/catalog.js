import { useEffect, useState } from 'react';
import { api } from '../api';
import { PRODUCTS, PRODUCT_TA, REVIEW_THERAPEUTIC_AREA_OPTIONS } from '../pages/publication-form/data';

// The catalog set up on System Administrator (GET /api/catalog): products with their therapeutic
// area and record-ID code, product roles, and access levels. The product lists in data.js are kept
// in step (updated in place), so every picker and filter that reads them follows the admin's setup.
let current = { products: [], productRoles: [], levels: [] };
let version = 0;
const listeners = new Set();

function apply(c) {
  current = c;
  PRODUCTS.splice(0, PRODUCTS.length, ...c.products.map(p => p.name));
  Object.keys(PRODUCT_TA).forEach(k => { delete PRODUCT_TA[k]; });
  c.products.forEach(p => { PRODUCT_TA[p.name] = p.ta; });
  REVIEW_THERAPEUTIC_AREA_OPTIONS.splice(0, REVIEW_THERAPEUTIC_AREA_OPTIONS.length, ...[...new Set(c.products.map(p => p.ta))]);
  version += 1;
  listeners.forEach(fn => fn(version));
}

export const refreshCatalog = () => api.get('/catalog').then(apply).catch(() => {});
export const catalog = () => current;
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
