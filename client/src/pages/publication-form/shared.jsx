import React from 'react';
import { AIActionButton, Icon, Pill } from '../../ds/pubpro';

/**
 * The design's hand-rolled square toggle (plan rows, billable, checklist items,
 * additional products). Unlike DS Checkbox it takes a custom fill colour.
 */
export function BoxCheck({ on, onClick, size = 17, fill = 'var(--blue-chip)', border, tick = 14, title }) {
  return (
    <span
      role="checkbox"
      aria-checked={!!on}
      title={title}
      onClick={onClick}
      className="pf-boxcheck"
      style={{
        width: size,
        height: size,
        background: on ? fill : 'var(--white)',
        borderColor: border ? (on ? border : 'var(--border-input)') : 'var(--border-input)',
      }}
    >
      <Icon name="check" size={tick} color={on ? 'var(--white)' : 'transparent'} />
    </span>
  );
}

/** Label/value pair used in the target and study detail grids. */
export function DetailItem({ label, children, full }) {
  return (
    <div className={full ? 'pf-detail pf-detail--full' : 'pf-detail'}>
      <div className="pf-detail-label">{label}</div>
      <div className="pf-detail-value">{children}</div>
    </div>
  );
}

/** "Workflow step: X · If changes are requested, returns to: Y" strip under a review round. */
export function WorkflowStepLine({ step, returnsTo }) {
  return (
    <div className="pf-stepline">
      <Icon name="account_tree" size={16} color="var(--high-emphasis)" />
      <span>Workflow step: <span className="pf-strong-nav">{step}</span></span>
      <span className="pf-faint-dot">·</span>
      <span>If changes are requested, returns to: {returnsTo}</span>
    </div>
  );
}

/** Submission Readiness card (Reviews tab, Author Approval rounds; Compliance tab). */
export function ReadinessPanel({ r, onCheck }) {
  return (
    <div className="pf-card pf-readiness">
      <div className="pf-row-end">
        <div>
          <div className="pf-h3">Submission Readiness</div>
          <div className="pf-meta pf-mt2">{r.readinessCount} · {r.checklistKindLabel}</div>
        </div>
        {r.readinessHasItems && (
          <div className="pf-ml-auto">
            <AIActionButton onClick={onCheck}>AI: Check Submission Readiness</AIActionButton>
          </div>
        )}
      </div>
      {r.readinessHasItems && (
        <div className="pf-mt10">
          {r.readinessItems.map(item => (
            <div key={item.id} className="pf-readiness-row">
              <div className="pf-min0">
                <div>{item.label}</div>
                <div className="pf-note12">{item.group}</div>
              </div>
              <div className="pf-justify-end"><Pill tone={item.tone}>{item.result}</Pill></div>
            </div>
          ))}
          <div className="pf-note12 pf-mt6">{r.readinessMore} {r.readinessSummary}</div>
        </div>
      )}
    </div>
  );
}

/** Dashed empty-state box. */
export function DashedEmpty({ children }) {
  return <div className="pf-dashed-empty">{children}</div>;
}
