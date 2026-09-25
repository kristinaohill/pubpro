import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Checkbox, ConfirmModal, DataTable, IconButton, InlineMessage, Pill, SectionHeading } from '../ds/pubpro';
import { api } from '../api';
import { fmtSaved } from './Publications';
import './Publications.css';

const COLUMNS = [
  { header: 'Author ID', width: '110px' },
  { header: 'Name', width: 'minmax(160px,1.3fr)' },
  { header: 'Email', width: 'minmax(180px,1.4fr)' },
  { header: 'Location', width: 'minmax(150px,1.2fr)' },
  { header: 'Last Debarment Check', width: '170px' },
  { header: 'Pending Requests', width: '130px', align: 'right' },
  { header: 'Status', width: '96px' },
  { header: 'Last Updated', width: '100px' },
  { header: '', width: '40px' },
];

/** Saved external author profiles (Searches › External Authors). */
export default function ExternalAuthors() {
  const navigate = useNavigate();
  const location = useLocation();
  const savedAuthorId = location.state && location.state.savedAuthorId;
  const [authors, setAuthors] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [toDelete, setToDelete] = useState(null);

  const load = () => api.get('/pp-authors').then(setAuthors).catch(err => setError(err.message));
  useEffect(() => { load(); }, []);

  const confirmDelete = async () => {
    const a = toDelete;
    setToDelete(null);
    try {
      await api.delete('/pp-authors/' + a.id);
      setNotice(`Deleted ${a.author_id}.`);
      load();
    } catch (err) {
      setError('Could not delete: ' + err.message);
    }
  };

  const visible = (authors || []).filter(a => showInactive || a.status !== 'Inactive');
  const inactiveCount = (authors || []).filter(a => a.status === 'Inactive').length;

  const rows = visible.map(a => {
    const sm = a.summary || {};
    return {
      key: a.id,
      id: a.id,
      cells: [
        <span className="pl-id">{a.author_id}</span>,
        a.name, a.email || '—', sm.location || '—',
        sm.lastCheck
          ? <Pill tone={sm.lastCheckClear ? 'on-track' : 'overdue'}>{sm.lastCheck + (sm.lastCheckClear ? ' · Clear' : ' · Review')}</Pill>
          : <Pill tone="due-soon">Never checked</Pill>,
        String(sm.pending || 0),
        <Pill tone={a.status === 'Active' ? 'active' : 'draft'}>{a.status}</Pill>,
        fmtSaved(a.updated_at),
        <IconButton icon="delete" tone="fatal" size={26} title={'Delete ' + a.author_id} onClick={e => { e.stopPropagation(); setToDelete(a); }} />,
      ],
    };
  });

  return (
    <div className="pl-page">
      <div className="pl-head">
        <SectionHeading subtitle={authors ? `${authors.length} saved ${authors.length === 1 ? 'author' : 'authors'}` : 'Saved external author profiles'}>
          External Authors
        </SectionHeading>
        <div className="pl-head-actions">
          {inactiveCount > 0 && (
            <Checkbox checked={showInactive} onChange={() => setShowInactive(v => !v)} label={`Show inactive (${inactiveCount})`} />
          )}
          <Button variant="secondary" icon="person_add" onClick={() => navigate('/external-author/new')}>Create New External Author</Button>
        </div>
      </div>

      {savedAuthorId && !notice && <InlineMessage kind="info">Saved {savedAuthorId}.</InlineMessage>}
      {notice && <InlineMessage kind="info">{notice}</InlineMessage>}
      {error && <InlineMessage kind="error">{error}</InlineMessage>}

      <div className="pl-card">
        {authors === null && !error && <div className="pl-empty">Loading…</div>}
        {authors && visible.length === 0 && (
          <div className="pl-empty">No external authors yet. Use Create New External Author to add the first one.</div>
        )}
        {visible.length > 0 && (
          <DataTable columns={COLUMNS} rows={rows} headerTone="knowledge" onRowClick={r => navigate('/external-author/' + r.id)} />
        )}
      </div>

      {toDelete && (
        <ConfirmModal
          title={'Delete ' + toDelete.author_id + '?'}
          confirmLabel="Delete Permanently"
          cancelLabel="Keep"
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        >
          {toDelete.name}&rsquo;s profile, debarment checks and audit trail will be removed for good. To keep the
          history, open the profile and untick Active Author instead.
        </ConfirmModal>
      )}
    </div>
  );
}
