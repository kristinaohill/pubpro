import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Checkbox, ConfirmModal, DataTable, IconButton, InlineMessage, Pill, SectionHeading } from '../ds/pubpro';
import { api } from '../api';
import { fmtSaved } from './Publications';
import './Publications.css';

const COLUMNS = [
  { header: 'Planning ID', width: 'minmax(140px,1fr)' },
  { header: 'Plan Name', width: 'minmax(200px,2.2fr)' },
  { header: 'Therapeutic Area', width: 'minmax(130px,1.1fr)' },
  { header: 'Product', width: 'minmax(140px,1.2fr)' },
  { header: 'Publications', width: '100px', align: 'right' },
  { header: 'Plan Budget', width: '110px', align: 'right' },
  { header: 'Committed', width: '110px', align: 'right' },
  { header: 'Status', width: '100px' },
  { header: 'Last Updated', width: '100px' },
  { header: '', width: '40px' },
];

const PLAN_TONE = { Draft: 'draft', Active: 'active', Complete: 'outline', Cancelled: 'cancelled' };
const money = n => '$' + Math.round(n || 0).toLocaleString('en-US');

/** Saved publication plans (Searches › Publication Plans). */
export default function PublicationPlans() {
  const navigate = useNavigate();
  const location = useLocation();
  const savedPlanId = location.state && location.state.savedPlanId;
  const [plans, setPlans] = useState(null);
  const [pubCounts, setPubCounts] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCancelled, setShowCancelled] = useState(true);
  const [toDelete, setToDelete] = useState(null);

  const load = () => {
    api.get('/pp-plans').then(setPlans).catch(err => setError(err.message));
    // Publications count toward a plan when they name it as their parent.
    api.get('/pp-publications').then(pubs => {
      const counts = {};
      pubs.forEach(p => { const k = p.summary && p.summary.parentPlanId; if (k) counts[k] = (counts[k] || 0) + 1; });
      setPubCounts(counts);
    }).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const confirmDelete = async () => {
    const p = toDelete;
    setToDelete(null);
    try {
      await api.delete('/pp-plans/' + p.id);
      setNotice(`Deleted ${p.plan_id}.`);
      load();
    } catch (err) {
      setError('Could not delete: ' + err.message);
    }
  };

  const visible = (plans || []).filter(p => showCancelled || p.status !== 'Cancelled');
  const cancelledCount = (plans || []).filter(p => p.status === 'Cancelled').length;

  const rows = visible.map(p => {
    const sm = p.summary || {};
    return {
      key: p.id,
      id: p.id,
      cells: [
        <span className="pl-id">{p.plan_id}</span>,
        p.title, sm.ta || '—', p.product || '—',
        String(Math.max(pubCounts[p.plan_id] || 0, sm.pubCount || 0)),
        money(sm.budget), money(sm.committed),
        <Pill tone={PLAN_TONE[p.status] || 'draft'}>{p.status}</Pill>,
        fmtSaved(p.updated_at),
        <IconButton
          icon="delete"
          tone="fatal"
          size={26}
          title={'Delete ' + p.plan_id}
          onClick={e => { e.stopPropagation(); setToDelete(p); }}
        />,
      ],
    };
  });

  return (
    <div className="pl-page">
      <div className="pl-head">
        <SectionHeading subtitle={plans ? `${plans.length} saved ${plans.length === 1 ? 'plan' : 'plans'}` : 'Saved publication plans'}>
          Publication Plans
        </SectionHeading>
        <div className="pl-head-actions">
          {cancelledCount > 0 && (
            <Checkbox checked={showCancelled} onChange={() => setShowCancelled(v => !v)} label={`Show cancelled (${cancelledCount})`} />
          )}
          <Button variant="secondary" icon="add" onClick={() => navigate('/publication-plan/new')}>Create New Publication Plan</Button>
        </div>
      </div>

      {savedPlanId && !notice && <InlineMessage kind="info">Saved {savedPlanId}.</InlineMessage>}
      {notice && <InlineMessage kind="info">{notice}</InlineMessage>}
      {error && <InlineMessage kind="error">{error}</InlineMessage>}

      <div className="pl-card">
        {plans === null && !error && <div className="pl-empty">Loading…</div>}
        {plans && visible.length === 0 && (
          <div className="pl-empty">No publication plans yet. Use Create New Publication Plan to add the first one.</div>
        )}
        {visible.length > 0 && (
          <DataTable columns={COLUMNS} rows={rows} headerTone="knowledge" onRowClick={r => navigate('/publication-plan/' + r.id)} />
        )}
      </div>

      {toDelete && (
        <ConfirmModal
          title={'Delete ' + toDelete.plan_id + '?'}
          confirmLabel="Delete Permanently"
          cancelLabel="Keep"
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        >
          “{toDelete.title}” and its audit trail will be removed for good. Its publications stay, but lose the link
          to this plan. To keep the history, open the plan and use Cancel Publication Plan instead.
        </ConfirmModal>
      )}
    </div>
  );
}
