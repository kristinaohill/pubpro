import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, InlineMessage } from '../../ds/pubpro';
import { Card } from './ui';
import './YourReview.css';

// The signed-in internal author's own authorship invitation. They attest to the ICMJE criteria and
// sign the authorship agreement on the invitation page (/invitation/:id), before drafting starts
// (A1, A4). On other tabs it's a reminder.

const norm = s => String(s || '').trim().toLowerCase();

/** This person's invitation on the record, if it's waiting on them. */
export function myInvitation(st, userName) {
  const a = (st.internal || []).find(x => norm(x.name) === norm(userName));
  if (!a || !a.invite) return null;
  if (a.invite.status === 'sent') return a;
  // Accepted before PubPro recorded the signed agreement: they sign it now.
  if (a.invite.status === 'accepted' && !(a.criteria && a.criteria.at)) return { ...a, confirmOnly: true };
  return null;
}

export default function YourInvitation({ st, userName, owner, full, recordId }) {
  const navigate = useNavigate();
  const mine = myInvitation(st, userName);
  if (!mine || !recordId) return null;
  const open = () => navigate('/invitation/' + recordId);
  const text = mine.confirmOnly
    ? 'Please sign the authorship agreement for this publication. Drafting can\u2019t start until every author has.'
    : 'You\u2019re invited to be an author on this publication.';

  if (!full) {
    return (
      <InlineMessage kind="info">
        {text}{' '}<button type="button" className="yr-link" onClick={open}>Review and sign</button>
      </InlineMessage>
    );
  }
  return (
    <Card className="yr-card" title={mine.confirmOnly ? 'Sign the authorship agreement' : 'Your authorship invitation'} meta={(owner ? 'From ' + owner + ' · ' : '') + 'Sent ' + (mine.invite.sent || '—')}>
      <p className="yr-lead">{text} Read the four ICMJE authorship criteria, attest to them and sign the agreement. PubPro saves your signature with the date and time.</p>
      <div className="yr-actions">
        <Button variant="primary" icon="draw" onClick={open}>Review &amp; Sign</Button>
      </div>
    </Card>
  );
}
