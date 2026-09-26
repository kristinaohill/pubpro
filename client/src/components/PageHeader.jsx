import React from 'react';
import { Icon } from '../ds/pubpro';
import './PageHeader.css';

/**
 * Header for list pages and dashboards, matching the DS RecordHeader that record pages use
 * (44px icon tile, record-title type, meta line), with an actions slot on the right.
 */
export default function PageHeader({ icon = 'library_books', title, description, actions }) {
  return (
    <header className="ph">
      <div className="ph-main">
        <div className="ph-icon"><Icon name={icon} size={26} color="var(--nav)" /></div>
        <div className="ph-text">
          <h1 className="ph-title">{title}</h1>
          {description && <div className="ph-desc">{description}</div>}
        </div>
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </header>
  );
}
