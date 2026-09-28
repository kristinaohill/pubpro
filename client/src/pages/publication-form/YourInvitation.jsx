import React, { useState } from 'react';
import { Button, Checkbox, InlineMessage } from '../../ds/pubpro';
import { ICMJE_CRITERIA } from './data';
import { Card } from './ui';
import './YourReview.css';

// The signed-in internal author's own authorship invitation. Accepting means agreeing to the four
// ICMJE authorship criteria (A1, ICMJE and GPP), recorded with the server's time. On other tabs
// it's a reminder that points to the Authors tab.

const norm = s => String(s || '').trim().toLowerCase();

/** This person's invitation on the record, if it's waiting on them. */
export function myInvitation(st, userName) {
  const a = (st.internal || []).find(x => norm(x.name) === norm(userName));
  if (!a || !a.invite) return null;
  if (a.invite.status === 'sent') return a;
  // Accepted before PubPro recorded criteria agreement: they confirm it now.
  if (a.invite.status === 'accepted' && !(a.criteria && a.criteria.at)) return { ...a, confirmOnly: true };
  return null;
}

export default function YourInvitation({ st, userName, owner, full, onReply, onTab }) {
  const mine = myInvitation(st, userName);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!mine) return null;

  if (!full) {
    return (
      <InlineMessage kind="info">
        {mine.confirmOnly ? 'Please confirm the ICMJE authorship criteria for this publication.' : 'You\u2019re invited to be an author on this publication.'}{' '}
        <button type="button" className="yr-link" onClick={() => onTab('authors')}>Open the Authors tab to reply</button>
      </InlineMessage>
    );
  }

  const reply = async accept => {
    setBusy(true);
    setError('');
    try {
      await onReply(accept, accept && agree);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="yr-card" title={mine.confirmOnly ? 'Confirm the ICMJE authorship criteria' : 'Your authorship invitation'} meta={(owner ? 'From ' + owner + ' · ' : '') + 'Sent ' + (mine.invite.sent || '—')}>
      <p className="yr-lead">
        {mine.confirmOnly
          ? 'You accepted authorship before PubPro recorded agreement to the criteria. Confirm it so drafting can go ahead.'
          : 'To be an author you must meet all four ICMJE authorship criteria. Accepting records your agreement before drafting starts.'}
      </p>
      <ol className="yr-criteria">
        {ICMJE_CRITERIA.map(c => <li key={c}>{c}</li>)}
      </ol>
      <Checkbox checked={agree} onChange={() => setAgree(v => !v)} label="I agree to meet all four ICMJE authorship criteria for this publication." />
      {error && <InlineMessage kind="error">{error}</InlineMessage>}
      <div className="yr-actions">
        {!mine.confirmOnly && <Button variant="tertiary" onClick={() => reply(false)} disabled={busy}>Decline</Button>}
        <Button variant="primary" icon="check" onClick={() => reply(true)} disabled={!agree || busy}>{busy ? 'Saving…' : mine.confirmOnly ? 'Confirm' : 'Accept Invitation'}</Button>
      </div>
    </Card>
  );
}
