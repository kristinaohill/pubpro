import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InlineMessage } from '../ds/pubpro';
import { api } from '../api';
import { SAMPLE_AUTHOR } from './ExternalAuthorProfile';

/**
 * /external-author: the example links across the app point here. Opens the design's sample
 * author, saved (once) as an ordinary record so it can be edited like any other.
 */
export default function SampleAuthor() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const a = SAMPLE_AUTHOR;
    api.post('/pp-authors/sample', {
      name: `${a.form.firstName} ${a.form.lastName}`, email: a.form.email, status: 'Active',
      summary: { displayName: a.form.displayName, location: [a.form.city, a.form.state, a.form.country].join(', '), lastCheck: '8/31/2026', lastCheckClear: true, pending: a.agreements.length + a.coi.length, studies: a.studies.length },
      data: a,
    })
      .then(r => navigate('/external-author/' + r.id, { replace: true }))
      .catch(err => setError(err.message));
  }, [navigate]);

  return (
    <div style={{ width: '95%', margin: '0 auto', paddingTop: 24 }}>
      {error
        ? <InlineMessage kind="error">Could not open the sample author: {error}</InlineMessage>
        : <div style={{ fontSize: 13, color: 'var(--fg-faint)' }}>Opening external author…</div>}
    </div>
  );
}
