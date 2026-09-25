import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InlineMessage } from '../ds/pubpro';
import { api } from '../api';
import { INITIAL_STATE, statusOf, summarize, titleOf, toSavedData } from './publication-form/state';

/**
 * /publication: the example links across the app point here. Opens the design's sample
 * publication, which is saved (once) as an ordinary record so it can be edited like any other.
 */
export default function SamplePublication() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const st = INITIAL_STATE;
    api.post('/pp-publications/sample', {
      title: titleOf(st), pub_type: st.pubType, product: st.product,
      status: statusOf(st), summary: summarize(st), data: toSavedData(st),
    })
      .then(r => navigate('/publication/' + r.id, { replace: true }))
      .catch(err => setError(err.message));
  }, [navigate]);

  return (
    <div style={{ width: '95%', margin: '0 auto', paddingTop: 24 }}>
      {error
        ? <InlineMessage kind="error">Could not open the sample publication: {error}</InlineMessage>
        : <div style={{ fontSize: 13, color: 'var(--fg-faint)' }}>Opening publication…</div>}
    </div>
  );
}
