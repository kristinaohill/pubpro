import React, { useState } from 'react';
import { Icon, Pill, Tooltip } from '../../../ds/pubpro';
import { STATUS_TONE, STEPS, fmt } from './data';
import './mockups.css';

/** Page wrapper. The signed-in app Layout supplies the top bar and workspace tabs. */
export function Shell({ children }) {
  return <div className="rgm">{children}</div>;
}

/** Named status pill, one tone per status everywhere. Approved uses the positive tint. */
export function StatusPill({ status }) {
  const tone = STATUS_TONE[status] || 'draft';
  if (tone === 'approved') return <Pill tone="draft" style={{ background: 'var(--tint-positive-bg)' }}>{status}</Pill>;
  return <Pill tone={tone}>{status}</Pill>;
}

/** Hover or focus explainer anchored to an element. */
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

/** Info icon whose tooltip says what an answer triggers downstream. */
export function InfoTip({ title, children, align = 'left' }) {
  return (
    <Hover title={title} tip={children} align={align} width={280} className="rgm-info" aria-label={title}>
      <Icon name="info" size={16} color="var(--high-emphasis)" />
    </Hover>
  );
}

/**
 * Compact lifecycle chevrons: Submitted → Triage → In Review → Holding → Approved.
 * `dates` holds the date each reached step was reached; the last one is current.
 * `returnedAt` marks a step that sent the record back to the requester.
 */
export function StepChevrons({ dates = [], returnedAt = -1, size = 'sm' }) {
  const current = dates.length - 1;
  return (
    <div className={'rgm-chev rgm-chev--' + size} role="list" aria-label={'Step ' + (current + 1) + ' of ' + STEPS.length + ': ' + STEPS[current]}>
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
            title={'Step ' + (i + 1) + ': ' + name}
            tip={tip}
            align={i < 3 ? 'left' : 'right'}
            width={230}
            className={'rgm-chev-step rgm-chev-step--' + state}
            aria-label={name + ': ' + tip}
          >
            <span className="rgm-chev-seg" />
          </Hover>
        );
      })}
    </div>
  );
}
