import React from 'react';
import { Icon } from '../ds/pubpro';
import './PageHeader.css';

/**
 * Header for list pages and dashboards, matching the DS RecordHeader that record pages use
 * (record-title type, meta line), with an actions slot on the right. The icon tile is optional:
 * list pages and dashboards leave it off, since their panels already carry icons.
 */
export default function PageHeader({ icon, title, description, actions }) {
  return (
    <header className="ph">
      <div className="ph-main">
        {icon && <div className="ph-icon"><Icon name={icon} size={26} color="var(--nav)" /></div>}
        <div className="ph-text">
          <h1 className="ph-title">{title}</h1>
          {description && <div className="ph-desc">{description}</div>}
        </div>
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </header>
  );
}
