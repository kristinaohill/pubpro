import React from 'react';
import { useAuth } from '../AuthContext';
import { focusProducts, scopeLabel } from './scope';
import './ScopeFocus.css';

/**
 * If you can see it you can edit it: the server only sends the publications and plans someone's
 * roles let them edit. For people whose roles cover only some products (an exec's therapeutic
 * areas, a writer's two products), dashboards and lists say which ones they're seeing.
 */
export function useScopeFocus() {
  const { user } = useAuth();
  const products = focusProducts(user);
  return { products, active: !!products, label: products ? scopeLabel(products) : '' };
}

export default function ScopeFocusBar({ focus, what = 'publications' }) {
  if (!focus.products) return null;
  return (
    <div className="sf-bar" role="status">
      <span className="material-symbols-outlined" aria-hidden="true">filter_alt</span>
      <span>Showing {what} for <strong>{focus.label}</strong>, the products your roles cover.</span>
    </div>
  );
}
