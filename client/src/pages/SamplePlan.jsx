import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InlineMessage } from '../ds/pubpro';
import { api } from '../api';
import { SAMPLE_PLAN } from './PublicationPlanForm';

/**
 * /publication-plan: the example links across the app point here. Opens the design's sample
 * plan, saved (once) as an ordinary record so it can be edited like any other.
 */
export default function SamplePlan() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const p = SAMPLE_PLAN;
    api.post('/pp-plans/sample', {
      title: p.overview.title, product: p.overview.product, status: p.status,
      summary: { ta: p.overview.ta, product: p.overview.product, budget: p.planBudget, committed: 148200, pubCount: p.inPlan.length, period: p.planStartDate + ' – ' + p.planEndDate },
      data: p,
    })
      .then(r => navigate('/publication-plan/' + r.id, { replace: true }))
      .catch(err => setError(err.message));
  }, [navigate]);

  return (
    <div style={{ width: '95%', margin: '0 auto', paddingTop: 24 }}>
      {error
        ? <InlineMessage kind="error">Could not open the sample plan: {error}</InlineMessage>
        : <div style={{ fontSize: 13, color: 'var(--fg-faint)' }}>Opening publication plan…</div>}
    </div>
  );
}
