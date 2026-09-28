import React from 'react';
import './ui.css';

/*
 * Layout kit for the publication form tabs (the redesign mockups): one column capped at the
 * form width, short related fields paired, sections as cards. Controls inside stay the DS ones
 * (TextField, Select, TextArea, DateField, MoneyField, Button, Pill...) at width="100%".
 */

/** A tab's top-level column: TabHead, then Cards, 16px apart. */
export function Stack({ children, className = '' }) {
  return <div className={'pfx-stack ' + className}>{children}</div>;
}

/** Secondary buttons sit on the grey page in a TabHead; the DS face (#F0F0F0) disappears there, so lift it to white. */
export const ON_GREY = { background: "var(--white)", boxShadow: "inset 0 0 0 1px var(--border-divider)" };

/** Tab title, one-line description, and actions on the right. */
export function TabHead({ title, sub, actions }) {
  return (
    <div className="pfx-tabhead">
      <div className="pfx-tabhead-text">
        <h2 className="pfx-tabhead-title">{title}</h2>
        {sub && <p className="pfx-tabhead-sub">{sub}</p>}
      </div>
      {actions && <div className="pfx-tabhead-actions">{actions}</div>}
    </div>
  );
}

/** A white section card with an optional title, a meta line/count and actions on the right. */
export function Card({ title, meta, actions, children, className = '' }) {
  return (
    <section className={'pfx-card ' + className}>
      {(title || meta || actions) && (
        <div className="pfx-card-head">
          {title && <h3 className="pfx-card-title">{title}</h3>}
          {(meta || actions) && (
            <div className="pfx-card-right">
              {meta && <span className="pfx-meta">{meta}</span>}
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/** Label above the control, optional counter on the right of the label, help text below. */
export function FormField({ id, label, help, counter, required, children, className = '' }) {
  return (
    <div className={'pfx-field ' + className}>
      {(label || counter) && (
        <div className="pfx-field-top">
          {label && (
            <label htmlFor={id} className="pfx-label">
              {label}{required && <span className="pfx-required" aria-hidden="true"> *</span>}
            </label>
          )}
          {counter && <span className="pfx-counter">{counter}</span>}
        </div>
      )}
      {children}
      {help && <div className="pfx-help">{help}</div>}
    </div>
  );
}

/** Two short, related fields side by side (stacks on narrow screens). Pass <div /> for an empty slot. */
export function Pair({ children }) {
  return <div className="pfx-pair">{children}</div>;
}

/** Small uppercase column labels above a list. `cols` are [label, width] (width '' = grows). */
export function ColHead({ cols }) {
  return (
    <div className="pfx-colhead" aria-hidden="true">
      {cols.map(([label, width], i) => (
        <span key={i} style={width ? { width, flex: 'none' } : { flex: 1 }}>{label}</span>
      ))}
    </div>
  );
}

/** A bordered list; rows are ListRow. */
export function ListBox({ children }) {
  return <div className="pfx-list">{children}</div>;
}

export function ListRow({ children, current, dim, className = '', ...rest }) {
  return (
    <div className={'pfx-row' + (current ? ' pfx-row--current' : '') + (dim ? ' pfx-row--dim' : '') + (className ? ' ' + className : '')} {...rest}>
      {children}
    </div>
  );
}

/** Status tag. tone: navy | blue | outline | grey | green | amber | red. */
export function Tag({ tone = 'grey', children }) {
  return <span className={'pfx-tag pfx-tag--' + tone}>{children}</span>;
}

/** Read-only label/value grid (two columns by default). items: [[label, value, full?]]. */
export function Details({ items, cols = 2 }) {
  return (
    <dl className="pfx-details" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map(([label, value, full], i) => (
        <div key={i} className="pfx-detail" style={full ? { gridColumn: '1 / -1' } : undefined}>
          <dt>{label}</dt>
          <dd className={value === '' || value == null ? 'pfx-detail-empty' : ''}>{value === '' || value == null ? 'Not recorded' : value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Single-choice pill buttons (short option lists such as Publication Sub-Type). */
export function ChipChoice({ label, options, value, onChange, disabled, help }) {
  return (
    <fieldset className="pfx-fieldset">
      {label && <legend className="pfx-label">{label}</legend>}
      <div className="pfx-chips">
        {options.map(o => {
          const v = typeof o === 'string' ? o : o.value;
          const text = typeof o === 'string' ? o : o.label;
          const on = v === value;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              className={'pfx-chip' + (on ? ' pfx-chip--on' : '')}
              onClick={() => onChange(on ? '' : v)}
            >
              {text}
            </button>
          );
        })}
      </div>
      {help && <div className="pfx-help">{help}</div>}
    </fieldset>
  );
}

/** Multi-select checkbox chips (e.g. Additional Products). */
export function ChipCheck({ label, checked, onChange, disabled }) {
  return (
    <label className={'pfx-chip pfx-chip--check' + (checked ? ' pfx-chip--on-soft' : '')}>
      <input type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled} />
      {label}
    </label>
  );
}

/** Dashed empty-state box with a next-step hint. */
export function Empty({ children }) {
  return <div className="empty-state">{children}</div>;
}
