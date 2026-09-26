import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, ConfirmModal, Field, FormActionBar, Icon, InlineMessage, Pill, SideTabRail, TextArea, Tooltip } from '../ds/pubpro';
import Flash from '../components/Flash';
import { api } from '../api';
import { STATUS_TONE } from './Publications';
import { useAuth } from '../AuthContext';
import DocumentPanel from './publication-form/DocumentPanel';
import { TABS, TODAY_STR } from './publication-form/data';
import {
  FIELD_DEFAULTS, auditEntry, blankState, changedSections, deriveProgress, fromSavedData, missingFlags,
  openRoundOf, statusOf, summarize, titleOf, toSavedData,
} from './publication-form/state';
import OverviewTab from './publication-form/OverviewTab';
import AuthorsTab from './publication-form/AuthorsTab';
import PublicationTab from './publication-form/PublicationTab';
import TargetTab from './publication-form/TargetTab';
import StudiesTab from './publication-form/StudiesTab';
import PlanningTab from './publication-form/PlanningTab';
import ReviewsTab from './publication-form/ReviewsTab';
import ComplianceTab from './publication-form/ComplianceTab';
import OutcomeTab from './publication-form/OutcomeTab';
import CitationsTab from './publication-form/CitationsTab';
import { AuditTab, DocumentsTab, TaskOptionsTab } from './publication-form/RecordTabs';
import './PublicationForm.css';

// Design tweaks (defaults from the design file).
const AUTHORS_LAYOUT = 'Knowledge View'; // or 'Split Tables'
const SIMULATE_AUTHOR_APPROVAL = false;

const TAB_VIEWS = {
  overview: OverviewTab,
  authors: AuthorsTab,
  materials: PublicationTab,
  details: TargetTab,
  study: StudiesTab,
  planning: PlanningTab,
  reviewers: ReviewsTab,
  checklist: ComplianceTab,
  outcome: OutcomeTab,
  citations: CitationsTab,
  taskoptions: TaskOptionsTab,
  documents: DocumentsTab,
  audit: AuditTab,
};

function ProgressStrip({ prog, onOpenReviews, onOpenPlanning }) {
  // Full-width timeline under the cards: one segment per step, labels only on the current and
  // next step, and every step's name and date in a tooltip on hover or keyboard focus.
  const [hover, setHover] = useState(null);
  const steps = prog.progSteps;
  const doneCount = steps.filter(s => s.state === 'done').length;
  const currentIdx = steps.findIndex(s => s.state === 'current');
  const nextIdx = currentIdx < 0 ? -1 : steps.findIndex((s, i) => i > currentIdx && s.state !== 'done');
  return (
    <>
      <div className="pf-prog">
        <div className="pf-prog-cell pf-prog-cell--link" onClick={onOpenPlanning} title="Open the Planning tab">
          <div className="pf-eyebrow">{prog.progStepOf}</div>
          <div className="pf-prog-step">{prog.progStepName}</div>
          <div className="pf-prog-due">
            <Pill tone={prog.progDueTone}>{prog.progDueRel}</Pill>
            {prog.progDue !== '—' && <span className="pf-nowrap-text">Due {prog.progDue}</span>}
          </div>
        </div>
        <div className="pf-prog-cell pf-prog-cell--link" onClick={onOpenReviews} title="Open the Reviews tab">
          <div className="pf-eyebrow">{prog.progHasRound ? 'RESPONSES · ' + prog.progRoundLabel.toUpperCase() : 'RESPONSES'}</div>
          <div className="pf-prog-val16">{prog.progDoneLabel}</div>
          <div className="pf-prog-bar"><div className="pf-prog-bar-fill" style={{ width: prog.progPct }} /></div>
          <div className="pf-prog-ooo">
            <Icon name={prog.progHasRound ? 'event_busy' : 'rate_review'} size={14} />{prog.progOooLabel}
          </div>
        </div>
        <div className="pf-prog-cell">
          <div className="pf-eyebrow">NEXT STEP</div>
          <div className="pf-prog-val14">{prog.progNextName}</div>
          {prog.progNextDate !== '—' && <div className="pf-meta">Planned {prog.progNextDate}</div>}
        </div>
        <div className="pf-prog-cell">
          <div className="pf-eyebrow">SUBMISSION DEADLINE</div>
          <div className="pf-prog-val14">{prog.progDeadline}</div>
          <div className="pf-meta">{prog.progDeadlineNote}</div>
        </div>
      </div>
      {steps.length > 0 && (
        <div className="pf-tl" role="list" aria-label={doneCount + ' of ' + steps.length + ' steps done'}>
          {steps.map((s, i) => {
            const label = i === currentIdx ? 'Now' : i === nextIdx ? 'Next' : '';
            return (
              <div
                key={s.name + i}
                role="listitem"
                tabIndex={0}
                aria-label={s.name + ': ' + s.tip}
                className={'pf-tl-step pf-tl-step--' + s.state + (label ? ' pf-tl-step--labelled' : '')}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <div className="pf-tl-seg" />
                {label && (
                  <div className="pf-tl-label">
                    <span className="pf-tl-eyebrow">{label}</span>
                    {s.name}
                  </div>
                )}
                {hover === i && (
                  <Tooltip title={s.name} align={i < steps.length / 2 ? 'left' : 'right'} width={230}>
                    {'Step ' + (i + 1) + ' of ' + steps.length + ' · ' + s.tip}
                  </Tooltip>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/**
 * /publication/new is a blank record; /publication/:id is a saved one.
 * (/publication itself opens the design's sample record, seeded as a saved record.)
 */
export default function PublicationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();
  const userName = (user && user.name) || 'Unknown user';
  const isNew = id === 'new';
  const savedId = isNew ? null : id;

  const [st, setSt] = useState(blankState);
  const [record, setRecord] = useState(null);
  const [loadState, setLoadState] = useState(savedId ? 'loading' : 'ready');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [docOpen, setDocOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  // Saved publication plans for the Parent Planning ID picker.
  const [plans, setPlans] = useState([]);
  useEffect(() => {
    // With their data so the Planning tab can show the parent plan's real budget figures.
    api.get('/pp-plans?include=data')
      .then(list => setPlans(list.filter(p => p.status !== 'Cancelled').map(p => {
        const d = p.data || {};
        const sum = (xs, k) => (xs || []).reduce((a, x) => a + ((k ? x[k] : x) || 0), 0);
        return {
          id: p.plan_id, name: p.title, savedId: p.id,
          budget: d.planBudget || 0,
          planned: sum(d.ideas, 'cost'),
          committed: sum(Object.values(d.allocations || {})) + sum(d.fees, 'amount'),
        };
      })))
      .catch(() => setPlans([]));
  }, []);
  // What was last saved, so each save can log which tabs changed.
  const lastSaved = useRef(null);

  useEffect(() => {
    // After the first save the URL changes to the new id; that record is already in hand.
    if (savedId && record && String(record.id) === String(savedId)) return undefined;
    setMessage(null);
    if (!savedId) {
      setRecord(null);
      setSt(blankState());
      lastSaved.current = null;
      setLoadState('ready');
      return undefined;
    }
    let cancelled = false;
    setLoadState('loading');
    api.get('/pp-publications/' + savedId)
      .then(r => {
        if (cancelled) return;
        const { data, ...meta } = r;
        const next = fromSavedData(data);
        // Opened from a notification: land on the tab it points to.
        if (location.state && location.state.tab) next.tab = location.state.tab;
        setRecord(meta);
        setSt(next);
        lastSaved.current = toSavedData(next);
        setLoadState('ready');
      })
      .catch(err => { if (!cancelled) { setLoadState('error'); setMessage({ kind: 'error', text: err.message }); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // A notification for the record that is already open: switch to its tab.
  useEffect(() => {
    if (record && location.state && location.state.tab) setSt(s => ({ ...s, tab: location.state.tab }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  /**
   * Saves `next` (the current state plus any final changes). close: go back to the list afterwards.
   * notices(savedRecord, next): in-app notifications to send once the save succeeds (never email).
   */
  const persist = async (next, { close = false, done, notices } = {}) => {
    const title = titleOf(next);
    if (!title) {
      setSt(s => ({ ...s, tab: 'overview' }));
      setMessage({ kind: 'error', text: 'Add an Abbreviated Title or Publication Title on the Overview tab. A title is the only field required to save.' });
      return;
    }
    let log = next.audit || [];
    if (!record) {
      log = log.concat([auditEntry('Record Created', { participants: userName, result: 'Draft' })]);
    } else if (lastSaved.current) {
      const changed = changedSections(lastSaved.current, toSavedData(next));
      if (changed.length) log = log.concat([auditEntry('Record Saved', { participants: userName, comment: 'Changed: ' + changed.join(', ') })]);
    }
    const withLog = { ...next, audit: log };
    const data = toSavedData(withLog);
    setSaving(true);
    setMessage(null);
    const body = { title, pub_type: next.pubType, product: next.product || null, status: statusOf(withLog), summary: summarize(withLog), data };
    try {
      const saved = record
        ? await api.put('/pp-publications/' + record.id, body)
        : await api.post('/pp-publications', body);
      setRecord(saved);
      setSt(withLog);
      lastSaved.current = data;
      if (notices) {
        const list = notices({ record_id: saved.record_id, title }, withLog)
          .map(n => ({ ...n, pub_id: saved.id, record_id: saved.record_id }));
        if (list.length) await api.post('/notifications', { notifications: list }).catch(() => {});
      }
      if (close) {
        navigate('/dashboard', { state: { savedNotice: 'Saved ' + saved.record_id + '.' } });
        return;
      }
      setMessage({ kind: 'info', text: done || (record ? 'Saved ' : 'Created ') + saved.record_id + '.' });
      if (!record) navigate('/publication/' + saved.id, { replace: true });
      return saved;
    } catch (err) {
      setMessage({ kind: 'error', text: 'Could not save: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  /** Applies a change and saves it at once, sending any notifications. Used by actions that notify people. */
  const commit = (patch, opts) => {
    const p = typeof patch === 'function' ? patch(st) : patch;
    return p ? persist({ ...st, ...p }, opts) : Promise.resolve(null);
  };

  // People on the open round hear when the record is withdrawn or restored; so does the owner, if someone else did it.
  const roundAndOwner = s => {
    const round = openRoundOf(s);
    const names = round ? round.reviewers.map(r => r.name) : [];
    if (record && record.owner && record.owner !== userName) names.push(record.owner);
    return [...new Set(names)];
  };

  const cancelPublication = () => {
    const reason = cancelReason.trim();
    if (!reason) return;
    setCancelOpen(false);
    setCancelReason('');
    persist({
      ...st,
      cancelled: { on: TODAY_STR, by: userName, reason },
      audit: (st.audit || []).concat([auditEntry('Publication Cancelled', { participants: userName, result: 'Cancelled', comment: reason })]),
    }, {
      done: 'Publication cancelled. It stays on file with its audit trail.',
      notices: (rec, s) => roundAndOwner(s).map(name => ({
        recipient: name, kind: 'cancelled', title: rec.record_id + ' was cancelled',
        body: rec.title + ' · ' + reason + '. Any open review request is withdrawn.', tab: 'overview',
      })),
    });
  };

  const reinstate = () => persist({
    ...st,
    cancelled: null,
    audit: (st.audit || []).concat([auditEntry('Publication Reinstated', { participants: userName, result: 'Reinstated' })]),
  }, {
    done: 'Publication reinstated.',
    notices: (rec, s) => roundAndOwner(s).map(name => ({
      recipient: name, kind: 'reinstated', title: rec.record_id + ' was reinstated', body: rec.title, tab: 'overview',
    })),
  });

  /** Class-style setState: merges a patch (or the result of patch(state)); null means no change. */
  const set = useCallback(patch => setSt(s => {
    const p = typeof patch === 'function' ? patch(s) : patch;
    return p ? { ...s, ...p } : s;
  }), []);

  /** value/onChange for inputs the design shows with a static default. */
  const bind = key => ({
    value: st.fields[key] ?? FIELD_DEFAULTS[key] ?? '',
    onChange: e => {
      const v = e.target.value;
      set(s => ({ fields: { ...s.fields, [key]: v } }));
    },
  });

  if (loadState !== 'ready') {
    return (
      <div className="pf-page">
        <div className="pf-shell pf-status">
          {loadState === 'loading'
            ? <div className="pf-faint13">Loading publication…</div>
            : <InlineMessage kind="error">{message ? message.text : 'Could not load this publication.'}</InlineMessage>}
        </div>
      </div>
    );
  }

  const recordId = record ? record.record_id : 'NEW';
  const title = titleOf(st) || 'New Publication';
  const owner = record ? record.owner : userName;
  const cancelled = st.cancelled;
  const prog = deriveProgress(st);
  const missing = missingFlags(st);
  const tabs = TABS.map(([tid, label, icon]) => ({ id: tid, label: label.toUpperCase(), icon, flagged: !!missing[tid] }));

  const TabView = TAB_VIEWS[st.tab] || OverviewTab;
  const tabProps = {
    st, set, bind, commit, saving, navigate, recordId, prog, userName, plans,
    openDocument: () => setDocOpen(true),
    layout: AUTHORS_LAYOUT,
    simulateApproval: SIMULATE_AUTHOR_APPROVAL,
    typeLocked: !!record,
  };

  return (
    <div className="pf-page">
      <div className="pf-shell pf-head">
        <div className="pf-head-top">
          <img src="/ds/assets/icons/icon-pubpro.svg" alt="PubPro" className="pf-head-icon" />
          <div className="pf-head-titles">
            <div className="pf-title">{title}</div>
            <div className="pf-subtitle">
              {record ? prog.currentStepName + ' ' + recordId : 'Not saved yet · the record ID is assigned on first save'}
            </div>
          </div>
          <div className="pf-head-owner">
            <div>Owner: {owner}</div>
            <div>Product: <strong>{st.product || '—'}</strong></div>
            {record && <div className="pf-mt3"><Pill tone={STATUS_TONE[statusOf(st)]}>{statusOf(st)}</Pill></div>}
          </div>
        </div>
        {cancelled && (
          <div className="pf-mb12">
            <InlineMessage kind="warning">
              Cancelled {cancelled.on} by {cancelled.by}: {cancelled.reason}. The record is read-only; reinstate it to make changes.
            </InlineMessage>
          </div>
        )}
        <ProgressStrip prog={prog} onOpenReviews={() => set({ tab: 'reviewers' })} onOpenPlanning={() => set({ tab: 'planning' })} />
      </div>

      <div className="pf-shell pf-body">
        <div className="pf-rail">
          <SideTabRail tabs={tabs} active={st.tab} onSelect={tid => set({ tab: tid })} style={{ alignSelf: 'stretch' }} />
        </div>
        <div className={'pf-panel' + (cancelled ? ' pf-panel--readonly' : '')}>
          <fieldset className="pf-fieldset" disabled={!!cancelled}>
            <TabView {...tabProps} />
          </fieldset>
        </div>
      </div>

      {message && (
        <Flash kind={message.kind} watch={message} className="pf-shell pf-status">{message.text}</Flash>
      )}

      <FormActionBar
        style={{ padding: '26px var(--page-gutter) 30px', gap: 12 }}
        left={cancelled ? (
          <Button variant="secondary" onClick={() => navigate('/publications')}>Close</Button>
        ) : (
          <>
            {record && <Button variant="fatal" onClick={() => setCancelOpen(true)} disabled={saving}>Cancel Publication</Button>}
            <Button variant="secondary" onClick={() => navigate('/publications')}>Close Without Saving</Button>
            <Button variant="tertiary">Send Note</Button>
          </>
        )}
        right={cancelled ? (
          <Button variant="secondary" onClick={reinstate} disabled={saving}>Reinstate Publication</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => persist(st)} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button variant="primary" onClick={() => persist(st, { close: true })} disabled={saving}>Save &amp; Close</Button>
          </>
        )}
      />

      {docOpen && (
        <DocumentPanel st={st} set={set} commit={commit} saving={saving} recordId={recordId} userName={userName} onClose={() => setDocOpen(false)} />
      )}

      {cancelOpen && (
        <ConfirmModal
          title={'Cancel ' + recordId + '?'}
          confirmLabel="Cancel Publication"
          cancelLabel="Keep Working"
          onConfirm={cancelPublication}
          onCancel={() => { setCancelOpen(false); setCancelReason(''); }}
        >
          <div className="pf-stack12">
            <div>The publication stays on file with its audit trail, marked Cancelled. Any changes not yet saved are saved with it.</div>
            <Field label="Reason (required)">
              <TextArea value={cancelReason} onChange={e => setCancelReason(e.target.value)} width="100%" height="64px" />
            </Field>
            {!cancelReason.trim() && <div className="pf-faint13">Enter a reason to cancel.</div>}
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
