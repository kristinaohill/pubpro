import React from 'react';
import { Pill, InlineMessage } from '../ds/pubpro';
import PageHeader from '../components/PageHeader';
import './PublicationWorkflows.css';

// Display options from the design. Flip to hide parts of the stage cards.
const SHOW_DURATIONS = true;
const SHOW_LOOPS = true;
const SHOW_CLOCK = true;
const FLAG_MANUSCRIPT_ONLY = true;

const ST = (name, days, x) => Object.assign({ name, kind: 'stage', days }, x || {});
const MS = (name, x) => Object.assign({ name, kind: 'milestone' }, x || {});
const DEV = { clock: 'dev', owner: 'Writer / agency' };
const REV = (owner, mode) => ({ clock: 'rev', owner, mode });
const L = (loop, x) => Object.assign({ loop }, x);
const MARKUP = 'Markup (track changes)', COMMENT = 'Comment only';

const PLANNED = [
  MS('Record Created', { sub: 'Title is the only required field' }),
  ST('Setup', null, { note: 'Enter metadata, run routing rules to preview assigned reviewers, adjust and rerun as often as needed. No clock is running.' }),
  MS('Start', { core: true, sub: 'Clock starts; GPP requirements apply from here' }),
];
const SETUP = [
  ST('Author Invitations', 5, Object.assign(REV('Authors'), { note: 'Recorded in the system: authors accept or decline, no editing. Uploading an offline invitation is allowed but weaker for audit.' })),
  MS('Kick-off Complete', { core: true }),
];
const DRAFT = [
  ST('Draft Development', 14, DEV), MS('Draft Development Complete', { core: true }),
  ST('Internal Draft Review', 7, L('Draft Development', REV('Internal reviewers', MARKUP))),
  ST('Partner Review', 5, L('Draft Development', Object.assign({ optional: true, included: false }, REV('Partner', MARKUP)))),
  ST('Stats / Data QC', 5, L('Draft Development', Object.assign({ optional: true, included: true }, REV('Biostatistics', MARKUP)))),
  ST('Author Draft Review', 10, L('Draft Development', REV('Authors', MARKUP))),
];
const RELEASE = [
  ST('Final Draft Development', 5, DEV),
  ST('Compliance and IP Review', 5, L('Draft Development', Object.assign({ optional: true, included: false }, REV('Legal / IP', COMMENT)))),
  MS('Author Approval', { core: true, loop: 'Final Draft Development', sub: 'Comment only' }),
  ST('Internal Release Approval', 3, L('Draft Development', REV('Internal approvers', COMMENT))),
  ST('Pub Manager Review', 2, Object.assign({ optional: true, included: false, note: 'Correctness and completeness check before submission. Some companies add it after an audit finding.' }, REV('Publication manager', COMMENT))),
];
const OUTLINE = [
  ST('Data and Proposal Input', 10, DEV), ST('Outline Development', 10, DEV),
  ST('Outline Review', 7, REV('Authors', MARKUP)),
].map(n => Object.assign(n, { onlyHere: true }));

const PHASES = [
  { name: 'Planned', note: 'Record set up ahead of time, not yet live. Only Publication Type is locked.', ab: PLANNED, ms: PLANNED },
  { name: 'Author Onboarding', note: 'First activity after Start. Kick-off closes the phase.', ab: SETUP, ms: SETUP },
  { name: 'Outline', note: 'Agree data sources and structure before drafting.', ab: [], abEmpty: 'Abstracts go straight from kick-off to drafting.', ms: OUTLINE },
  { name: 'Drafting & Review', note: 'Draft reviews are markup rounds. Optional stages are toggled per publication.', ab: DRAFT, ms: DRAFT },
  { name: 'Approval & Release', note: 'Approvals are comment only: reviewers can comment and annotate but not edit text.', ab: RELEASE, ms: RELEASE },
  { name: 'Submission', note: 'Sent to the primary target on the Target tab. The target is chosen here, not at record creation.', ab: [MS('Submission', { core: true, sub: 'to congress' })], ms: [MS('Submission', { core: true, sub: 'to primary journal, within the 18-month disclosure deadline' })] },
  {
    name: 'Outcome', note: 'Recorded on the Outcome tab.',
    abBranches: [
      { status: 'Accepted', tone: 'on-track', note: 'A linked Congress Presentation publication is created.', steps: ['Congress Decision to Authors', 'Presentation Development', 'Presentation Logistics'] },
      { status: 'Rejected', tone: 'overdue', note: 'Retarget to the next alternate congress on the shortlist; returns to Final Draft Development.', steps: [] },
      { status: 'Withdrawn', tone: 'cancelled', note: 'Closes the publication. Reason is kept on the audit trail.', steps: [] },
    ],
    msBranches: [
      { status: 'Accepted', tone: 'on-track', note: 'Proofs are checked before publication.', steps: ['PL/MW Proof Review', 'Author Proof Review', 'Published'] },
      { status: 'Changes Requested', tone: 'due-soon', note: 'Response cycle, then resubmission to the same journal.', steps: ['Response Documents', 'Internal Review', 'Author Review', 'Resubmission'] },
      { status: 'Rejected', tone: 'overdue', note: 'Retarget to the next-ranked alternate journal; reformat, then resubmit.', steps: ['Reformat for Journal', 'Author Approval', 'Submission'] },
      { status: 'Withdrawn', tone: 'cancelled', note: 'Closes the publication. Reason is kept on the audit trail.', steps: [] },
    ],
  },
];

const LOCKS = [
  { field: 'Title', editable: 'Always. Required to save the record.', fix: 'Edit in place.' },
  { field: 'Publication Type', editable: 'Locked at creation. It routes the record onto the Abstract or Manuscript workflow.', fix: 'Cancel the record and create a new one.' },
  { field: 'Product, Additional Products, Therapeutic Area', editable: 'While Planned. Locks at Start.', fix: 'Cancel the record and create a new one.' },
  { field: 'Target Congress / Journal', editable: 'Not set at creation. Chosen on the Target tab before Submission; changes on retargeting.', fix: 'Retarget from the Outcome tab.' },
  { field: 'Internal Reviewers', editable: 'Set by routing rules, which can be run and rerun on demand while Planned.', fix: 'Rerun routing rules after correcting metadata.' },
];

const inc = n => n.kind === 'stage' && n.days && (!n.optional || n.included);
const sum = (key, clock) => PHASES.reduce((t, p) => t + (p[key] || []).reduce((a, n) => a + (inc(n) && n.clock === clock ? n.days : 0), 0), 0);
const total = key => `${sum(key, 'dev')} development + ${sum(key, 'rev')} review days to submission`;

const Sym = ({ name, className = '', title }) => (
  <span className={`material-symbols-outlined ${className}`} title={title} aria-hidden={title ? undefined : true}>{name}</span>
);

function StageNode({ n, isMs }) {
  return (
    <div className={`pw-stage${n.optional ? ' pw-stage--optional' : ''}`}>
      <div className="pw-stage-head">
        <span className="pw-name">{n.name}</span>
        {SHOW_DURATIONS && <span className="pw-days">{n.days ? `${n.days} days` : 'No clock'}</span>}
        <span className="pw-stage-pills">
          {isMs && FLAG_MANUSCRIPT_ONLY && n.onlyHere && <Pill tone="draft">Manuscript only</Pill>}
          {n.optional && <Pill tone="outline">{n.included ? 'Optional · on by default' : 'Optional · off by default'}</Pill>}
        </span>
      </div>
      {SHOW_CLOCK && n.clock && (
        <div className="pw-stage-clock">
          <span className="pw-iconrow">
            <Sym name={n.clock === 'dev' ? 'edit_note' : 'forum'} className="pw-meta-icon" />
            {(n.clock === 'dev' ? 'Development · ' : 'Review · ') + (n.owner || '')}
          </span>
          {n.mode && (
            <span className="pw-iconrow">
              <Sym name={n.mode === COMMENT ? 'lock' : 'edit'} className="pw-meta-icon" />
              {n.mode}
            </span>
          )}
        </div>
      )}
      {n.note && <div className="pw-note">{n.note}</div>}
    </div>
  );
}

function Node({ n, first, isMs }) {
  return (
    <div className="pw-node">
      {!first && <div className="pw-connector" />}
      {n.kind === 'stage' && <StageNode n={n} isMs={isMs} />}
      {n.kind === 'milestone' && (
        <div className="pw-milestone">
          <span className="pw-diamond" />
          <span className="pw-name">{n.name}</span>
          {n.core && <Sym name="lock" className="pw-lock" title="Core milestone" />}
          <span className="pw-milestone-sub">{n.sub || ''}</span>
        </div>
      )}
      {SHOW_LOOPS && n.loop && (
        <div className="pw-loop">
          <Sym name="undo" className="pw-loop-icon" />
          <span>Changes requested: returns to <span className="pw-loop-target">{n.loop}</span></span>
        </div>
      )}
    </div>
  );
}

function Branch({ b }) {
  return (
    <div className="pw-branch">
      <div className="pw-branch-head">
        <Pill tone={b.tone}>{b.status}</Pill>
        <span className="pw-branch-note">{b.note}</span>
      </div>
      {b.steps.length > 0 && (
        <div className="pw-steps">
          {b.steps.map((s, i) => (
            <div key={s} className="pw-step-wrap">
              {i > 0 && <Sym name="arrow_forward" className="pw-meta-icon" />}
              <span className="pw-step">{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrackCell({ nodes = [], branches = [], emptyText, isMs }) {
  return (
    <div className="pw-cell">
      {emptyText && <div className="pw-empty">{emptyText}</div>}
      {nodes.map((n, i) => <Node key={n.name} n={n} first={i === 0} isMs={isMs} />)}
      {branches.map(b => <Branch key={b.status} b={b} />)}
    </div>
  );
}

export default function PublicationWorkflows() {
  return (
    <div className="pw-page">
      <PageHeader
        title="Publication Workflows"
        description="Stage templates applied on the Planning tab of a publication. Both tracks share the drafting, review and release rounds; manuscripts add an outline phase and a journal response cycle."
      />
      <div className="pw-header">
        <div className="pw-legend">
          <div className="pw-legend-item"><span className="pw-swatch" />Stage</div>
          <div className="pw-legend-item"><span className="pw-diamond pw-diamond--sm" />Milestone</div>
          <div className="pw-legend-item"><span className="pw-swatch pw-swatch--dashed" />Optional</div>
          <div className="pw-legend-item"><Sym name="lock" className="pw-legend-lock" />Core, cannot be removed</div>
          <div className="pw-legend-item"><Sym name="undo" className="pw-loop-icon" />Return on changes requested</div>
          {SHOW_CLOCK && (
            <>
              <div className="pw-legend-item"><Sym name="edit_note" className="pw-meta-icon" />Development time</div>
              <div className="pw-legend-item"><Sym name="forum" className="pw-meta-icon" />Review time</div>
            </>
          )}
        </div>
      </div>

      <div className="pw-narrow">
        <InlineMessage kind="info">Plans change after Start. Stages can be inserted at any point (for example a second Author Draft Review, or a new Author Invitation when the lead author changes); each insertion requires a reason, kept on the audit trail.</InlineMessage>
      </div>

      <div className="pw-board">
        <div className="pw-row pw-row--head">
          <div className="pw-head-cell">Phase</div>
          <div className="pw-head-cell pw-head-cell--track">
            <Sym name="summarize" />Abstract <span className="pw-total">· {total('ab')}</span>
          </div>
          <div className="pw-head-cell pw-head-cell--track">
            <Sym name="description" />Manuscript <span className="pw-total">· {total('ms')}</span>
          </div>
        </div>

        {PHASES.map((p, i) => (
          <div key={p.name} className="pw-row">
            <div className="pw-phase">
              <div className="pw-eyebrow">PHASE {i}</div>
              <div className="pw-phase-name">{p.name}</div>
              <div className="pw-note">{p.note}</div>
            </div>
            <TrackCell nodes={p.ab} branches={p.abBranches} emptyText={p.abEmpty} isMs={false} />
            <TrackCell nodes={p.ms} branches={p.msBranches} isMs />
          </div>
        ))}
      </div>

      <div className="pw-locking">
        <h2 className="pw-subtitle">Field Locking</h2>
        <p className="pw-lede">What can change while a record is Planned and what locks once Start is pressed. Only a title is required to save a record.</p>
        <div className="pw-locks pw-narrow">
          <div className="pw-lock-row pw-lock-row--head">
            <div>Field</div>
            <div>Editable</div>
            <div>If Wrong After Lock</div>
          </div>
          {LOCKS.map(l => (
            <div key={l.field} className="pw-lock-row">
              <div className="pw-lock-field">{l.field}</div>
              <div>{l.editable}</div>
              <div className="pw-lock-fix">{l.fix}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
