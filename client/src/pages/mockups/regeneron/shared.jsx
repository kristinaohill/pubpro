import React, { useState } from 'react';
import { Pill, Tooltip } from '../../../ds/pubpro';
import { STATUS_TONE, STEPS, fmt } from './data';
// The record timeline's chevron classes (pfx-tl-*), so these progress bars match it exactly.
import '../../publication-form/ui.css';
import './mockups.css';

/** Page wrapper. The signed-in app Layout supplies the top bar and workspace tabs. */
export function Shell({ children }) {
  return <div className="rgm">{children}</div>;
}

/** Named status pill, one DS tone per status everywhere. */
export function StatusPill({ status }) {
  return <Pill tone={STATUS_TONE[status] || 'draft'}>{status}</Pill>;
}

/** Hover or focus explainer: the DS Tooltip anchored to its child. */
export function Hover({ tip, title, align = 'left', width = 250, className = '', children, ...rest }) {
  const [on, setOn] = useState(false);
  return (
    <span
      className={'rgm-hover ' + className}
      tabIndex={0}
      onMouseEnter={() => setOn(true)}
      onMouseLeave={() => setOn(false)}
      onFocus={() => setOn(true)}
      onBlur={() => setOn(false)}
      {...rest}
    >
      {children}
      {on && <Tooltip title={title} align={align} width={width}>{tip}</Tooltip>}
    </span>
  );
}

/**
 * Lifecycle chevrons: Submitted → Triage → In Review → Holding → Approved, drawn with the record
 * timeline's classes. `dates` holds the date each reached step was reached; the last one is current.
 * `returnedAt` marks a step that sent the record back to the requester.
 */
export function StepChevrons({ dates = [], returnedAt = -1 }) {
  const current = dates.length - 1;
  return (
    <div className="pfx-tl rgm-tl" role="list" aria-label={'Step ' + (current + 1) + ' of ' + STEPS.length + ': ' + STEPS[current]}>
      {STEPS.map((name, i) => {
        const state = i === returnedAt ? 'returned' : i < current ? 'done' : i === current ? 'current' : 'todo';
        const tip = state === 'returned' ? 'Sent back for revisions on ' + fmt(dates[i])
          : state === 'done' ? 'Completed ' + fmt(dates[i])
          : state === 'current' ? 'Current step since ' + fmt(dates[i])
          : 'Not reached yet';
        return (
          <Hover
            key={name}
            role="listitem"
            title={'Step ' + (i + 1) + ' of ' + STEPS.length + ': ' + name}
            tip={tip}
            align={i < 3 ? 'left' : 'right'}
            width={230}
            className={'pfx-tl-step pfx-tl-step--' + (state === 'returned' ? 'current rgm-tl-returned' : state)}
            aria-label={name + ': ' + tip}
          >
            <div className="pfx-tl-seg" />
          </Hover>
        );
      })}
    </div>
  );
}
