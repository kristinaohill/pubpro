import React, { useState } from 'react';
import { Button, Icon, InlineMessage, Pill, TextArea } from '../../ds/pubpro';
import { dueTone, openRoundOf } from './state';
import { daysFromToday } from './data';
import { Card } from './ui';
import './YourReview.css';

// The signed-in person's own part in the open review round: pick a decision, add a comment and
// submit. It saves straight away (no Save needed, whatever their role) and tells the owner. On
// other tabs it's a reminder that points to the Reviews tab.

const CHOICES = [
  { key: 'approve', label: 'Approved', icon: 'check_circle', help: 'Ready to go as it is.' },
  { key: 'changes', label: 'Changes Requested', icon: 'edit_note', help: 'Needs changes before it moves on.' },
  { key: 'reject', label: 'Not Approved', icon: 'cancel', help: 'Shouldn’t move forward.' },
];
const labelOf = k => (CHOICES.find(c => c.key === k) || {}).label || k;
const norm = s => String(s || '').trim().toLowerCase();

/** The open round and this person's entry on it, or null. */
export function myReview(st, userName) {
  const round = openRoundOf(st);
  const mine = round && (round.reviewers || []).find(v => norm(v.name) === norm(userName));
  return mine ? { round, mine, done: !!mine.decision && mine.decision !== 'pending' } : null;
}

const dueText = due => {
  const n = daysFromToday(due);
  if (n == null) return { label: 'No due date', tone: 'outline' };
  return { label: n === 0 ? 'Due today' : n < 0 ? (-n === 1 ? '1 day overdue' : -n + ' days overdue') : 'Due ' + due, tone: dueTone(n) };
};

export default function YourReview({ st, userName, owner, full, onSubmit, onTab, onOpenDocument }) {
  const r = myReview(st, userName);
  const [editing, setEditing] = useState(false);
  const [decision, setDecision] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!r) return null;
  const { round, mine, done } = r;
  const due = dueText(round.due);

  if (!full) {
    if (done) return null;
    return (
      <InlineMessage kind="info">
        Your review is waiting: {round.type} (Round {round.num}){round.due ? ', due ' + round.due : ''}.{' '}
        <button type="button" className="yr-link" onClick={() => onTab('reviewers')}>Open the Reviews tab to respond</button>
      </InlineMessage>
    );
  }

  const open = !done || editing;
  const submit = async () => {
    if (!decision) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(decision, comment.trim());
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const startEdit = () => { setDecision(mine.decision); setComment(mine.comment || ''); setEditing(true); };

  return (
    <Card
      className="yr-card"
      title="Your review"
      meta={round.type + ' · Round ' + round.num + ' · ' + round.method + ' · Sent ' + round.sentOn}
      actions={!done && <Pill tone={due.tone}>{due.label}</Pill>}
    >
      {!open ? (
        <div className="yr-done">
          <Icon name={CHOICES.find(c => c.key === mine.decision)?.icon || 'check_circle'} size={22} color="var(--ok)" />
          <div className="yr-done-text">
            <div><strong>You responded: {labelOf(mine.decision)}</strong> on {mine.on}. {owner ? owner + ' was notified.' : ''}</div>
            {mine.comment && <div className="yr-comment">&ldquo;{mine.comment}&rdquo;</div>}
          </div>
          <Button variant="secondary" onClick={startEdit}>Change Response</Button>
        </div>
      ) : (
        <>
          <p className="yr-lead">
            {round.method === 'Collaborative Edit'
              ? 'Read the publication and make any edits in the document (they’re tracked), then record your decision.'
              : 'Read the publication, leave comments in the document if you need to, then record your decision.'}
            {onOpenDocument && <> <button type="button" className="yr-link" onClick={onOpenDocument}>Open the document</button></>}
          </p>
          <div className="yr-choices" role="radiogroup" aria-label="Your decision">
            {CHOICES.map(c => (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={decision === c.key}
                className={'yr-choice yr-choice--' + c.key + (decision === c.key ? ' yr-choice--on' : '')}
                onClick={() => setDecision(c.key)}
              >
                <Icon name={c.icon} size={20} />
                <span><span className="yr-choice-label">{c.label}</span><span className="yr-choice-help">{c.help}</span></span>
              </button>
            ))}
          </div>
          <label className="yr-label" htmlFor="yr-comment">Comment{decision === 'changes' || decision === 'reject' ? ' (say what needs to change)' : ' (optional)'}</label>
          <TextArea id="yr-comment" value={comment} onChange={e => setComment(e.target.value)} width="100%" height="72px" />
          {error && <InlineMessage kind="error">{error}</InlineMessage>}
          <div className="yr-actions">
            {editing && <Button variant="tertiary" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>}
            <Button variant="primary" icon="send" onClick={submit} disabled={!decision || busy}>{busy ? 'Submitting…' : editing ? 'Update Response' : 'Submit Review'}</Button>
          </div>
        </>
      )}
    </Card>
  );
}
