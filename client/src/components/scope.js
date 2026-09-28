import { PRODUCTS, PRODUCT_TA } from '../pages/publication-form/data';

// Product scopes on roles (System Administrator > Users > Edit): helpers shared by the dashboards,
// lists and the scope editor.

export { PRODUCTS, PRODUCT_TA };
export const THERAPEUTIC_AREAS = [...new Set(Object.values(PRODUCT_TA))];
export const productsOfTa = ta => PRODUCTS.filter(p => PRODUCT_TA[p] === ta);
export const shortProduct = p => String(p || '').split(' ')[0];

/** "Immunology, Biologix" or "All products": therapeutic areas named when a scope covers all of one. */
export function scopeLabel(products) {
  if (!products) return 'All products';
  const left = new Set(products);
  const parts = [];
  THERAPEUTIC_AREAS.forEach(ta => {
    const ps = productsOfTa(ta);
    if (ps.length > 1 && ps.every(p => left.has(p))) { parts.push(ta); ps.forEach(p => left.delete(p)); }
  });
  return parts.concat([...left].map(shortProduct)).join(', ');
}

/**
 * The products a user's work focuses on: every product any of their roles covers, or null when a
 * role covers all products (or they're a System Administrator). Dashboards open filtered to these.
 */
export function focusProducts(user) {
  const scopes = user && Array.isArray(user.roleScopes) ? user.roleScopes.filter(r => r.role !== 'author') : [];
  if (!scopes.length || scopes.some(r => !r.products)) return null;
  return [...new Set(scopes.flatMap(r => r.products))];
}
