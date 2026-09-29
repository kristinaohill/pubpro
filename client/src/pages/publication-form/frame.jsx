import React, { useState } from 'react';
import { Pill, Tooltip } from '../../ds/pubpro';
import { CONFERENCE_DIRECTORY, STUDY_DIRECTORY, parseDate } from './data';
import { openRoundOf } from './state';
import { authorBlockers } from '../WriterDashboardPanels';
import { useExternalAuthors } from '../../components/usePeople';
import './ui.css';

/*
 * The publication form's frame from the redesign: record summary (collapsible), grouped section
 * nav, and the "At a glance" panel. Everything is worked out from the record's live state.
 */

const DAY = 86400000;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysUntil = str => { const d = parseDate(str); return d ? Math.round((d - today()) / DAY) : null; };
const relDays = n => (n === 0 ? 'today' : n === 1 ? 'in 1 day' : n === -1 ? '1 day ago' : n > 0 ? `in ${n} days` : `${-n} days ago`);

const Chevron = ({ up }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
  </svg>
);

/* ---------- Record summary ---------- */

const COLLAPSE_KEY = 'pubpro.pubform.summaryCollapsed';
const readCollapsed = () => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch (e) { return false; } };
const writeCollapsed = v => { try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); } catch (e) { /* private window */ } };

function Timeline({ steps }) {
  const [hover, setHover] = useState(null);
  if (!steps.length) return null;
  const doneCount = steps.filter(s => s.state === 'done').length;
  const currentIdx = steps.findIndex(s => s.state === 'current');
  const nextIdx = currentIdx < 0 ? -1 : steps.findIndex((s, i) => i > currentIdx && s.state !== 'done');
  return (
    <div className="pfx-tl" role="list" aria-label={doneCount + ' of ' + steps.length + ' steps done'}>
      {steps.map((s, i) => {
        const label = i === currentIdx ? 'Now' : i === nextIdx ? 'Next' : '';
        return (
          <div
            key={s.name + i}
            role="listitem"
            tabIndex={0}
            aria-label={s.name + ': ' + s.tip}
            className={'pfx-tl-step pfx-tl-step--' + s.state + (label ? ' pfx-tl-step--labelled' : '')}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <div className="pfx-tl-seg" />
            {label && <div className="pfx-tl-label"><span className="pfx-tl-eyebrow">{label}</span>{s.name}</div>}
            {hover === i && (
              <Tooltip title={s.name} align={i < steps.length / 2 ? 'left' : 'right'} width={230}>
                {'Step ' + (i + 1) + ' of ' + steps.length + ' · ' + s.tip}
              </Tooltip>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The record card: title, key facts, four summary cards and the timeline. Collapse shrinks it to a
 * one-line bar so there is more room for fields; the choice is remembered in this browser.
 */
export function RecordSummary({ st, title, recordId, saved, owner, status, statusTone, prog, onTab }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = v => { setCollapsed(v); writeCollapsed(v); };
  const round = openRoundOf(st);
  const typeLine = [st.pubType, st.pubType === 'Abstract' ? st.subType : ''].filter(Boolean).join(' · ');
  const steps = prog.progSteps;
  const overdue = prog.progDueTone === 'overdue';

  if (collapsed) {
    return (
      <section className="pfx-sumbar" aria-label="Record summary (collapsed)">
        <div className="pfx-sumbar-titles">
          <span className="pfx-sumbar-title">{title}</span>
          <span className="pfx-sumbar-meta">{[saved ? recordId : 'Not saved yet', typeLine].filter(Boolean).join(' · ')}</span>
        </div>
        {saved && <Pill tone={statusTone}>{status}</Pill>}
        <div className="pfx-sumbar-right">
          {steps.length > 0 && (
            <>
              <span className="pfx-sumbar-step">{prog.progStepOf.charAt(0) + prog.progStepOf.slice(1).toLowerCase()} · <strong>{prog.progStepName}</strong></span>
              <Pill tone={prog.progDueTone}>{prog.progDueRel}</Pill>
              <span className="pfx-mini-tl" role="img" aria-label={steps.filter(s => s.state === 'done').length + ' of ' + steps.length + ' steps done'}>
                {steps.map((s, i) => <span key={i} className={s.state === 'done' ? 'is-done' : s.state === 'current' ? 'is-current' : ''} />)}
              </span>
              <span className="pfx-divider-v" aria-hidden="true" />
            </>
          )}
          <button type="button" className="pfx-toggle" aria-expanded="false" onClick={() => toggle(false)}>Expand <Chevron /></button>
        </div>
      </section>
    );
  }

  return (
    <section className="pfx-summary" aria-label="Record summary">
      <div className="pfx-sum-head">
        <img src="/ds/assets/icons/icon-pubpro.svg" alt="" className="pfx-sum-icon" />
        <div className="pfx-sum-titles">
          <h1 className="pfx-sum-title">{title}</h1>
          <div className="pfx-sum-meta">
            <strong>{saved ? recordId : 'Not saved yet · the record ID is assigned on first save'}</strong>
            {typeLine && <span>{typeLine}</span>}
            <span>{st.product || 'No product'}</span>
            <span>Owner: {owner}</span>
          </div>
        </div>
        <div className="pfx-sum-right">
          {saved && <Pill tone={statusTone}>{status}</Pill>}
          <button type="button" className="pfx-toggle" aria-expanded="true" onClick={() => toggle(true)}>Collapse <Chevron up /></button>
        </div>
      </div>

      <div className="pfx-facts">
        <button type="button" className={'pfx-fact' + (overdue ? ' pfx-fact--alert' : '')} onClick={() => onTab('planning')} title="Open the Planning tab">
          <span className="pfx-fact-eyebrow">{prog.progStepOf.replace(/^STEP (\d+) OF (\d+)$/, 'Current step · $1 of $2')}</span>
          <span className="pfx-fact-value">{prog.progStepName}</span>
          <span className="pfx-fact-note"><Pill tone={prog.progDueTone}>{prog.progDueRel}</Pill>{prog.progDue !== '—' && <span>Due {prog.progDue}</span>}</span>
        </button>
        <button type="button" className="pfx-fact" onClick={() => onTab('reviewers')} title="Open the Reviews tab">
          <span className="pfx-fact-eyebrow">{round ? 'Responses · Round ' + round.num : 'Responses'}</span>
          <span className="pfx-fact-value">{prog.progDoneLabel}</span>
          {round && <span className="pfx-bar"><span style={{ width: prog.progPct }} /></span>}
          <span className="pfx-fact-note">{round ? round.type + ' · ' + prog.progOooLabel : prog.progOooLabel}</span>
        </button>
        <div className="pfx-fact">
          <span className="pfx-fact-eyebrow">Next step</span>
          <span className="pfx-fact-value">{prog.progNextName}</span>
          {prog.progNextDate !== '—' && <span className="pfx-fact-note">Planned {prog.progNextDate}</span>}
        </div>
        <button type="button" className="pfx-fact" onClick={() => onTab('details')} title="Open the Target tab">
          <span className="pfx-fact-eyebrow">Submission deadline</span>
          <span className="pfx-fact-value">{prog.progDeadline}</span>
          <span className="pfx-fact-note">{prog.progDeadlineNote}</span>
        </button>
      </div>

      <Timeline steps={steps} />
    </section>
  );
}

/* ---------- Section nav ---------- */

const NAV_GROUPS = [
  ['Record', [['overview', 'Overview'], ['authors', 'Authors'], ['materials', 'Publication'], ['details', 'Target'], ['study', 'Studies']]],
  ['Workflow', [['planning', 'Planning'], ['reviewers', 'Reviews'], ['checklist', 'Compliance'], ['outcome', 'Outcome']]],
  ['Records', [['citations', 'Citations'], ['taskoptions', 'Task Options'], ['documents', 'Documents'], ['audit', 'Audit Trail']]],
];
const NAV_ICONS = {
  overview: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  authors: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.1a4 4 0 0 1 0 7.8M22 21a7 7 0 0 0-4-6.3',
  materials: 'M2 5h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2zM22 5h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z',
  details: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  study: 'M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7 15h10',
  planning: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  reviewers: 'M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12zM8.5 12l2.5 2.5 4.5-5',
  checklist: 'M9 3h6v3H9zM9 5H5v16h14V5h-4M8.5 14l2.5 2.5 4.5-5',
  outcome: 'M5 21V4M5 4h12l-2.5 4 2.5 4H5',
  citations: 'M6 8h5v5c0 3-2 5-4.5 5.5M14 8h5v5c0 3-2 5-4.5 5.5',
  taskoptions: 'M7 4L3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7',
  documents: 'M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7',
  audit: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2',
};

/** Grouped section tabs: pages have icons, group headings are plain labels with a divider. */
export function SectionNav({ active, flags, onSelect }) {
  return (
    <nav className="pfx-nav" aria-label="Record sections">
      {NAV_GROUPS.map(([group, items]) => (
        <div key={group} role="group" aria-label={group} className="pfx-nav-group">
          <span className="pfx-nav-heading">{group}</span>
          {items.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="pfx-nav-item"
              aria-current={active === id ? 'page' : undefined}
              onClick={() => onSelect(id)}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={NAV_ICONS[id]} /></svg>
              {label}
              {flags[id] && <span className="pfx-nav-dot" role="img" aria-label="Needs attention" title="Required fields missing" />}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

/* ---------- At a glance ---------- */

const MAX_BLOCKERS = 5;

/** Study, targets, author blockers and the open review for this record, each linking to its tab. */
export function AtAGlance({ st, record, recordId, onTab }) {
  const studies = st.noStudy ? [] : (st.selectedStudies || []).map(id => STUDY_DIRECTORY.find(s => s.id === id)).filter(Boolean);
  const targets = (st.targets || []).map((name, i) => ({ c: CONFERENCE_DIRECTORY.find(x => x.name === name) || { name, abbr: '', kind: '' }, primary: i === 0 }));
  const externals = useExternalAuthors();
  const blockers = authorBlockers([{ id: record ? record.id : 0, record_id: recordId, data: st }], externals);
  const round = openRoundOf(st);
  const waiting = round ? round.reviewers.filter(v => !v.decision || v.decision === 'pending') : [];
  const answered = round ? round.reviewers.length - waiting.length : 0;
  const roundDue = round && round.due ? daysUntil(round.due) : null;

  return (
    <aside className="pfx-rail" aria-label="At a glance">
      <span className="pfx-rail-eyebrow">AT A GLANCE</span>

      <section className="pfx-rail-card">
        <div className="pfx-rail-head"><h3 className="pfx-rail-title">Study</h3><button type="button" className="pfx-link" onClick={() => onTab('study')}>Studies tab</button></div>
        {st.noStudy && <div className="pfx-rail-text">No study is associated with this publication.</div>}
        {!st.noStudy && studies.length === 0 && <div className="pfx-rail-text">No study linked yet.</div>}
        {studies.map(s => (
          <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="pfx-rail-strong">{s.id}{s.altId ? ' · ' + s.altId : ''}</div>
            <div className="pfx-rail-text">{s.title.includes(': ') ? s.title.split(': ').slice(1).join(': ') : s.title}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="pfx-tag pfx-tag--grey">{s.status}</span>
              {s.outcome && s.outcome !== 'Pending' && s.outcome !== 'Not applicable' && (
                <span className={'pfx-tag ' + (/did not/i.test(s.outcome) ? 'pfx-tag--amber' : 'pfx-tag--green')}>{s.outcome}</span>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="pfx-rail-card">
        <div className="pfx-rail-head"><h3 className="pfx-rail-title">Targets</h3><button type="button" className="pfx-link" onClick={() => onTab('details')}>Target tab</button></div>
        {targets.length === 0 && <div className="pfx-rail-text">No targets yet. Add them on the Target tab.</div>}
        {targets.map(({ c, primary }, i) => {
          const n = c.kind === 'Congress' && c.close ? daysUntil(c.close) : null;
          return (
            <div key={c.name} className={i ? 'pfx-rail-sep' : ''} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div className="pfx-rail-strong">{c.abbr || c.name} <span style={{ fontWeight: 400, color: 'var(--pfx-meta)' }}>· {primary ? 'primary' : 'alternate'}</span></div>
              <div className="pfx-rail-text">
                {c.kind === 'Journal' ? 'Continuous submission'
                  : c.close ? `Abstracts close ${c.close}` + (n != null ? ' · ' + (n >= 0 ? `${n} days` : 'closed') : '') : c.kind || ''}
              </div>
              {c.prevClose && <div className="pfx-rail-warn">Moved earlier from {c.prevClose}</div>}
            </div>
          );
        })}
      </section>

      <section className="pfx-rail-card">
        <div className="pfx-rail-head">
          <h3 className="pfx-rail-title">Author blockers</h3>
          {blockers.length > 0 && <span className="pfx-count-red">{blockers.length}</span>}
        </div>
        {blockers.length === 0 && <div className="pfx-rail-text">No author issues. Invited authors have replied and their agreements and COIs are current.</div>}
        {blockers.slice(0, MAX_BLOCKERS).map(b => (
          <div key={b.key} className="pfx-blocker">
            <span className={'pfx-blocker-dot' + (b.severity > 1 ? ' pfx-blocker-dot--high' : '')} aria-hidden="true" />
            <div><strong style={{ fontWeight: 600, color: 'var(--pfx-text)' }}>{b.person}</strong> · {b.issue}<small>{b.detail}</small></div>
          </div>
        ))}
        {blockers.length > MAX_BLOCKERS && <div className="pfx-rail-text">+ {blockers.length - MAX_BLOCKERS} more</div>}
        <button type="button" className="pfx-link" onClick={() => onTab('authors')}>Open Authors tab</button>
      </section>

      <section className="pfx-rail-card">
        <div className="pfx-rail-head"><h3 className="pfx-rail-title">Open review</h3><button type="button" className="pfx-link" onClick={() => onTab('reviewers')}>Reviews tab</button></div>
        {!round && <div className="pfx-rail-text">No review round is out.</div>}
        {round && (
          <>
            <div className="pfx-rail-strong">Round {round.num} · {round.type}</div>
            {round.due && <div className="pfx-rail-text">Due {round.due}{roundDue != null ? ' · ' + relDays(roundDue) : ''}</div>}
            <span className="pfx-bar"><span style={{ width: (round.reviewers.length ? Math.round((answered / round.reviewers.length) * 100) : 0) + '%' }} /></span>
            <div className="pfx-rail-text">
              {answered} of {round.reviewers.length} responded{waiting.length ? ' · waiting on ' + waiting.map(v => v.name).join(', ') : ''}
            </div>
          </>
        )}
      </section>
    </aside>
  );
}
