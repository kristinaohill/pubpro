import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Checkbox, ConfirmModal, DataTable, IconButton, InlineMessage, Pill } from '../ds/pubpro';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import './Publications.css';

const COLUMNS = [
  { header: 'Publication ID', width: 'minmax(150px,1.1fr)' },
  { header: 'Title', width: 'minmax(200px,2.4fr)' },
  { header: 'Type', width: 'minmax(90px,.8fr)' },
  { header: 'Product', width: 'minmax(140px,1.2fr)' },
  { header: 'Current Step', width: 'minmax(140px,1.2fr)' },
  { header: 'Step Due', width: '130px' },
  { header: 'Status', width: '104px' },
  { header: 'Last Updated', width: '100px' },
  { header: '', width: '40px' },
];

export const STATUS_TONE = { Draft: 'draft', Active: 'active', 'In Review': 'active', Cancelled: 'cancelled' };

// SQLite stores UTC as "YYYY-MM-DD HH:MM:SS"; show it as a local US date.
export const fmtSaved = s => (s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString('en-US') : '—');

const isoToUS = iso => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${m}/${d}/${y}`;
};

/** Days from today to an ISO date (negative = past). */
export const daysUntil = iso => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
};

/** Pill for a step's due date, in the dashboards' deadline tones. */
export const duePill = iso => {
  const n = daysUntil(iso);
  if (n == null) return { tone: 'outline', label: '—' };
  return { tone: n < 0 ? 'overdue' : n <= 7 ? 'due-soon' : 'on-track', label: isoToUS(iso) };
};

/** Saved publication records (Searches › Publications). */
export default function Publications() {
  const navigate = useNavigate();
  const location = useLocation();
  const savedRecordId = location.state && location.state.savedRecordId;
  const [pubs, setPubs] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCancelled, setShowCancelled] = useState(true);
  const [toDelete, setToDelete] = useState(null);

  const load = () => api.get('/pp-publications').then(setPubs).catch(err => setError(err.message));
  useEffect(() => { load(); }, []);

  const confirmDelete = async () => {
    const p = toDelete;
    setToDelete(null);
    try {
      await api.delete('/pp-publications/' + p.id);
      setNotice(`Deleted ${p.record_id}.`);
      load();
    } catch (err) {
      setError('Could not delete: ' + err.message);
    }
  };

  const visible = (pubs || []).filter(p => showCancelled || p.status !== 'Cancelled');
  const cancelledCount = (pubs || []).filter(p => p.status === 'Cancelled').length;

  const rows = visible.map(p => {
    const sm = p.summary || {};
    const due = duePill(p.status === 'Cancelled' ? '' : sm.due);
    return {
      key: p.id,
      id: p.id,
      cells: [
        <span className="pl-id">{p.record_id}</span>,
        p.title, p.pub_type, p.product || '—',
        sm.stepName || '—',
        <Pill tone={due.tone} style={{ fontSize: 12 }}>{due.label}</Pill>,
        <Pill tone={STATUS_TONE[p.status] || 'draft'}>{p.status}</Pill>,
        fmtSaved(p.updated_at),
        <IconButton
          icon="delete"
          tone="fatal"
          size={26}
          title={'Delete ' + p.record_id}
          onClick={e => { e.stopPropagation(); setToDelete(p); }}
        />,
      ],
    };
  });

  return (
    <div className="pl-page">
      <PageHeader
        title="Publications"
        description={pubs ? `${pubs.length} saved ${pubs.length === 1 ? 'publication' : 'publications'}` : 'Saved publication records'}
        actions={(
          <>
            {cancelledCount > 0 && (
              <Checkbox checked={showCancelled} onChange={() => setShowCancelled(v => !v)} label={`Show cancelled (${cancelledCount})`} />
            )}
            <Button variant="secondary" icon="add" onClick={() => navigate('/publication/new')}>Create New Publication</Button>
          </>
        )}
      />

      {savedRecordId && !notice && <InlineMessage kind="info">Saved {savedRecordId}.</InlineMessage>}
      {notice && <InlineMessage kind="info">{notice}</InlineMessage>}
      {error && <InlineMessage kind="error">{error}</InlineMessage>}

      <div className="pl-card">
        {pubs === null && !error && <div className="pl-empty">Loading…</div>}
        {pubs && visible.length === 0 && (
          <div className="pl-empty">No publications yet. Use Create New Publication to add the first one.</div>
        )}
        {visible.length > 0 && (
          <DataTable
            columns={COLUMNS}
            rows={rows}
            headerTone="knowledge"
            onRowClick={r => navigate('/publication/' + r.id)}
          />
        )}
      </div>

      {toDelete && (
        <ConfirmModal
          title={'Delete ' + toDelete.record_id + '?'}
          confirmLabel="Delete Permanently"
          cancelLabel="Keep"
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        >
          “{toDelete.title}” and its audit trail will be removed for good. To take a publication out of
          circulation but keep its history, open it and use Cancel Publication instead.
        </ConfirmModal>
      )}
    </div>
  );
}
