import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { focusProducts, scopeLabel } from './scope';
import './ScopeFocus.css';

/**
 * Dashboards and lists open on the products someone's roles cover (an exec's therapeutic areas, a
 * writer's two products), with a switch to show everything. People whose roles cover all products
 * see everything and no bar. The choice is remembered per person in this browser.
 */
export function useScopeFocus() {
  const { user } = useAuth();
  const products = focusProducts(user);
  const key = 'pubpro.focusAll.' + (user ? user.id : '');
  const [all, setAll] = useState(() => { try { return localStorage.getItem(key) === '1'; } catch (e) { return false; } });
  const active = !!products && !all;
  const toggle = () => setAll(v => {
    try { localStorage.setItem(key, v ? '0' : '1'); } catch (e) { /* private mode */ }
    return !v;
  });
  /** Keeps records whose product is in focus (records without a product always show). */
  const filter = (list, productOf = x => x.product) => (active ? (list || []).filter(x => !productOf(x) || products.includes(productOf(x))) : list);
  return { products, active, toggle, filter, label: products ? scopeLabel(products) : '' };
}

export default function ScopeFocusBar({ focus, hidden = 0 }) {
  if (!focus.products) return null;
  return (
    <div className="sf-bar" role="status">
      <span className="material-symbols-outlined" aria-hidden="true">filter_alt</span>
      {focus.active ? (
        <span>
          Showing your products: <strong>{focus.label}</strong>
          {hidden > 0 ? ' · ' + hidden + ' other' + (hidden === 1 ? '' : 's') + ' hidden' : ''}
        </span>
      ) : (
        <span>Showing all products. Your roles cover <strong>{focus.label}</strong>.</span>
      )}
      <button type="button" className="sf-btn" onClick={focus.toggle}>{focus.active ? 'Show all products' : 'Show only mine'}</button>
    </div>
  );
}
