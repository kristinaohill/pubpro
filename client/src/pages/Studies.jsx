import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, Pill, Select, TextField } from '../ds/pubpro';
import { api } from '../api';
import PageHeader from '../components/PageHeader';
import { PRODUCTS, STUDY_DIRECTORY } from './publication-form/data';
import { STUDY_TONE, pubsForStudy } from './StudyProfile';
import './Publications.css';

const COLUMNS = [
  { header: 'Study ID', width: '100px' },
  { header: 'Title', width: 'minmax(260px,2.4fr)' },
  { header: 'Status', width: '120px' },
  { header: 'Related Product', width: 'minmax(160px,1.1fr)' },
  { header: 'Therapeutic Area', width: 'minmax(150px,1fr)' },
  { header: 'Phase', width: '70px' },
  { header: 'Responsible Manager', width: '160px' },
  { header: 'Publications', width: '110px', align: 'right' },
];

/** Every study (Searches › Studies), with how many saved publications use each. */
export default function Studies() {
  const navigate = useNavigate();
  const [pubs, setPubs] = useState(null);
  const [query, setQuery] = useState('');
  const [product, setProduct] = useState('');

  useEffect(() => { api.get('/pp-publications?include=data').then(setPubs).catch(() => setPubs([])); }, []);

  const q = query.trim().toLowerCase();
  const visible = STUDY_DIRECTORY
    .filter(s => !product || s.product === product)
    .filter(s => !q || (s.id + ' ' + s.title + ' ' + s.altId + ' ' + s.manager).toLowerCase().includes(q));

  return (
    <div className="pl-page">
      <PageHeader
        title="Studies"
        description={`${STUDY_DIRECTORY.length} studies across ${PRODUCTS.length} products`}
        actions={(
          <>
            <Select options={[{ value: '', label: 'All products' }].concat(PRODUCTS)} value={product} onChange={e => setProduct(e.target.value)} width="240px" />
            <TextField iconBefore="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search studies" width="240px" />
          </>
        )}
      />

      <div className="pl-card">
        {visible.length === 0 ? (
          <div className="empty-state">No studies match that search.</div>
        ) : (
          <DataTable
            columns={COLUMNS}
            headerTone="knowledge"
            onRowClick={r => navigate('/study/' + r.id)}
            rows={visible.map(s => ({
              key: s.id,
              id: s.id,
              cells: [
                <span className="pl-id">{s.id}</span>, s.title,
                <Pill tone={STUDY_TONE[s.status] || 'draft'}>{s.status}</Pill>,
                s.product, s.area, s.phase, s.manager,
                pubs === null ? '…' : String(pubsForStudy(pubs, s.id).length),
              ],
            }))}
          />
        )}
      </div>
    </div>
  );
}
