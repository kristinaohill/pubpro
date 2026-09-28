import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, ConfirmModal, Field, InlineMessage, TextArea } from '../ds/pubpro';
import Flash from '../components/Flash';
import { api } from '../api';
import { STATUS_TONE } from './Publications';
import { useAuth } from '../AuthContext';
import DocumentPanel from './publication-form/DocumentPanel';
import { fold, visibleText } from './publication-form/trackChanges';
import { AtAGlance, RecordSummary, SectionNav } from './publication-form/frame';
import { TODAY_STR } from './publication-form/data';
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

/**
 * /publication/new is a blank record; /publication/:id is a saved one.
 * (/publication itself opens the design's sample record, seeded as a saved record.)
 */
export default function PublicationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user, can } = useAuth();
  const userName = (user && user.name) || 'Unknown user';
  // What this user's role allows (System Administrator > Roles & permissions; the server checks too).
  const canEditPub = can('pubs.edit');
  const canCancel = can('pubs.cancel');
  const canDoc = can('doc.edit');
  const canReview = can('doc.review');
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
  // The document as last saved (it saves separately, through /document).
  const savedDoc = useRef({ markup: [], track: true });

  useEffect(() => {
    // After the first save the URL changes to the new id; that record is already in hand.
    if (savedId && record && String(record.id) === String(savedId)) return undefined;
    setMessage(null);
    if (!savedId) {
      setRecord(null);
      setSt(blankState());
      lastSaved.current = null;
      savedDoc.current = { markup: [], track: true };
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
        savedDoc.current = { markup: next.pubDocMarkup, track: next.pubDocTrack };
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
  const persist = async (next, { close = false, done, notices, skipDoc = false } = {}) => {
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
      // Document edits typed since the last save go with the record's Save.
      if (!skipDoc && canDoc && !withLog.cancelled && docDirty(withLog)) {
        await putDocument(saved.id, withLog, auditEntry('Publication Document Saved', { comment: String(withLog.pubDocText || '').trim().split(/\s+/).filter(Boolean).length + ' words' }));
      }
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

  const docAuthor = () => ({ by: userName, uid: user ? user.id : null });
  const docDirty = x => visibleText(x.pubDocMarkup || []) !== (x.pubDocText || '')
    || JSON.stringify(x.pubDocMarkup || []) !== JSON.stringify(savedDoc.current.markup || [])
    || (x.pubDocTrack !== false) !== (savedDoc.current.track !== false);

  /** Saves the document (text + tracked changes) of saved record recId. Returns the saved doc or null. */
  const putDocument = async (recId, x, audit) => {
    const tracking = x.pubDocTrack !== false || !canReview;
    const markup = fold(x.pubDocMarkup || [], x.pubDocText || '', { ...docAuthor(), at: new Date().toISOString() }, tracking);
    setSaving(true);
    try {
      const res = await api.put('/pp-publications/' + recId + '/document', { markup, track: x.pubDocTrack !== false, audit });
      const patch = { pubDoc: res.pubDoc, pubDocMarkup: res.pubDocMarkup, pubDocText: res.pubDocText, pubDocTrack: res.pubDocTrack, audit: res.audit };
      setSt(cur => ({ ...cur, ...patch }));
      savedDoc.current = { markup: res.pubDocMarkup, track: res.pubDocTrack };
      if (lastSaved.current) lastSaved.current = { ...lastSaved.current, ...patch };
      return res;
    } catch (err) {
      setMessage({ kind: 'error', text: 'Could not save the document: ' + err.message });
      return null;
    } finally {
      setSaving(false);
    }
  };

  /** The document panel's Save: a new record is saved first (it needs a title). */
  const saveDocument = async (x, { audit } = {}) => {
    let rec = record;
    if (!rec) {
      if (!canEditPub) return null;
      rec = await persist(x, { skipDoc: true });
      if (!rec) return null;
    }
    return putDocument(rec.id, x, audit);
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
  // Roles without pubs.edit see the record read-only (they may still work in the document).
  const viewOnly = !cancelled && !canEditPub;
  const roleName = (user && user.role_name) || 'Your role';
  const prog = deriveProgress(st);
  const missing = missingFlags(st);
  const status = statusOf(st);
  const openTab = tid => set({ tab: tid });

  const TabView = TAB_VIEWS[st.tab] || OverviewTab;
  const tabProps = {
    st, set, bind, commit, saving, navigate, recordId, prog, userName, plans,
    openDocument: () => setDocOpen(true),
    layout: AUTHORS_LAYOUT,
    simulateApproval: SIMULATE_AUTHOR_APPROVAL,
    typeLocked: !!record,
  };

  return (
    <div className="pf-page pfx-page">
      <div className="pfx-shell">
        <RecordSummary
          st={st} title={title} recordId={recordId} saved={!!record} owner={owner}
          status={status} statusTone={STATUS_TONE[status]} prog={prog} onTab={openTab}
        />
        {cancelled && (
          <InlineMessage kind="warning">
            Cancelled {cancelled.on} by {cancelled.by}: {cancelled.reason}. The record is read-only{canCancel ? '; reinstate it to make changes' : ''}.
          </InlineMessage>
        )}
        {viewOnly && (
          <InlineMessage kind="info">
            View only: {roleName} can&rsquo;t {record ? 'change publication details' : 'create publications'}.
            {record && canDoc ? ' You can still suggest tracked changes in the publication document.' : ''}
          </InlineMessage>
        )}

        <div className="pfx-body">
          <SectionNav active={st.tab} flags={missing} onSelect={openTab} />
          <div className={'pfx-main' + (cancelled || viewOnly ? ' pf-panel--readonly' : '')}>
            <fieldset className="pf-fieldset pfx-main" disabled={!!cancelled || viewOnly}>
              <TabView {...tabProps} />
            </fieldset>
          </div>
          <AtAGlance st={st} record={record} recordId={recordId} onTab={openTab} />
        </div>

        {message && <Flash kind={message.kind} watch={message}>{message.text}</Flash>}

        <div className="pfx-actions">
          {cancelled || viewOnly ? (
            <Button variant="secondary" onClick={() => navigate('/publications')}>Close</Button>
          ) : (
            <>
              {record && canCancel && <Button variant="fatal" onClick={() => setCancelOpen(true)} disabled={saving}>Cancel Publication</Button>}
              <Button variant="tertiary">Send Note</Button>
            </>
          )}
          <div className="pfx-actions-right">
            {cancelled ? (
              canCancel && <Button variant="secondary" onClick={reinstate} disabled={saving}>Reinstate Publication</Button>
            ) : viewOnly ? (
              record && st.pubDoc && (
                <Button variant="primary" icon="edit_document" onClick={() => setDocOpen(true)}>
                  {canDoc ? 'Open Document' : 'View Document'}
                </Button>
              )
            ) : (
              <>
                <Button variant="secondary" onClick={() => navigate('/publications')}>Close Without Saving</Button>
                <Button variant="secondary" onClick={() => persist(st)} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                <Button variant="primary" onClick={() => persist(st, { close: true })} disabled={saving}>Save &amp; Close</Button>
              </>
            )}
          </div>
        </div>
      </div>

      {docOpen && (
        <DocumentPanel
          st={st} set={set} saveDocument={saveDocument} savedMarkup={savedDoc.current.markup} saving={saving} recordId={recordId}
          me={docAuthor()} canEdit={canDoc && !cancelled && (!!record || canEditPub)} canReview={canReview}
          onClose={() => setDocOpen(false)}
        />
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
