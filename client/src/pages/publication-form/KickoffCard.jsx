import React, { useState } from 'react';
import { Button, Checkbox, Icon, InlineMessage, TextArea, TextField } from '../../ds/pubpro';
import DateField from '../../components/DateField';
import { TODAY_STR, parseDate } from './data';
import { auditEntry, bylineAuthors } from './state';
import { ProofField, uploadProof, openProof } from './proof';
import { Card, FormField, Pair } from './ui';

// V2 (GPP): abstracts and manuscripts hold a kick-off with the authors (key messages, target
// venue, timeline) before drafting starts. Recording the meeting here ticks the kick-off milestone
// on the plan; the milestone can't be ticked any other way, and later steps stay locked until it is.

export const KICKOFF = /kick-?off/i;
export const needsKickoff = st => st.pubType === 'Abstract' || st.pubType === 'Manuscript';
export const kickoffRowOf = st => (st.rows || []).find(r => r.name && KICKOFF.test(r.name) && !(r.optional && !r.included));

const AGREED = [
  ['messages', 'Key messages'],
  ['venue', 'Target congress or journal'],
  ['timeline', 'Timeline'],
];

export default function KickoffCard({ st, commit, saving, userName, record }) {
  const authors = bylineAuthors(st);
  const row = kickoffRowOf(st);
  const k = st.kickoff;
  const [f, setF] = useState({ heldOn: TODAY_STR, attendees: [], others: '', agreed: {}, notes: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!needsKickoff(st)) return null;

  if (k && k.heldOn) {
    return (
      <Card title="Kick-off meeting" meta="V2 · GPP">
        <div className="pfxc-kick-done">
          <Icon name="check_circle" size={22} color="var(--ok)" />
          <div>
            <div className="pf-strong">Held {k.heldOn}</div>
            <div className="pfx-meta">Attended by {k.attendees.concat(k.others ? [k.others] : []).join(', ') || '—'} · recorded by {k.recordedBy} on {k.recordedOn}</div>
            <div className="pfx-meta">Agreed: {AGREED.filter(([key]) => k.agreed[key]).map(([, l]) => l.toLowerCase()).join(', ')}</div>
            {k.notes && <div className="pfx-meta">{k.notes}</div>}
            {k.minutes && record && (
              <button type="button" className="yr-link" onClick={() => openProof(record.id, k.minutes).catch(err => setError(err.message))}>Minutes: {k.minutes.name}</button>
            )}
          </div>
        </div>
        {error && <InlineMessage kind="error">{error}</InlineMessage>}
      </Card>
    );
  }

  const set = p => { setF(x => ({ ...x, ...p })); setError(''); };
  const toggleAttendee = n => set({ attendees: f.attendees.includes(n) ? f.attendees.filter(x => x !== n) : f.attendees.concat([n]) });
  const allAgreed = AGREED.every(([key]) => f.agreed[key]);
  const ready = !!parseDate(f.heldOn) && f.attendees.length > 0 && allAgreed && !!row;

  const save = async () => {
    if (!record) { setError('Save the publication first.'); return; }
    const held = parseDate(f.heldOn);
    if (!held) { setError('Enter the date the meeting was held (m/d/yyyy).'); return; }
    if (held > new Date()) { setError('The meeting date can’t be in the future.'); return; }
    setBusy(true);
    try {
      const up = file ? await uploadProof(record.id, file, 'kickoff', 'Kick-off meeting') : null;
      const kickoff = {
        heldOn: f.heldOn, attendees: f.attendees, others: f.others.trim(), agreed: f.agreed, notes: f.notes.trim(),
        minutes: up ? { id: up.id, name: up.name } : null, recordedBy: userName, recordedOn: TODAY_STR,
      };
      await commit(s => ({
        kickoff,
        rows: s.rows.map(r => (r.id === row.id ? { ...r, done: true, doneOn: f.heldOn } : r)),
        audit: (s.audit || []).concat([auditEntry('Kick-off Meeting Held', {
          participants: f.attendees.concat(kickoff.others ? [kickoff.others] : []).join('\n'), result: 'Held ' + f.heldOn,
          comment: ['Agreed key messages, target venue and timeline (V2)', 'recorded by ' + userName, up ? 'minutes: ' + up.name : '', kickoff.notes].filter(Boolean).join(' · '),
        })]),
      }), { done: 'Kick-off recorded. Drafting can start once every author has signed.' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Kick-off meeting" meta="V2 · GPP">
      <div className="pfx-help">
        Hold the kick-off with the authors before drafting: agree the key messages, the target congress or journal, and the timeline.
        Recording it here completes the {row ? '“' + row.name + '”' : 'kick-off'} milestone. Drafting stays locked until it&rsquo;s done.
      </div>
      {!row && <InlineMessage kind="warning">This plan has no kick-off milestone. Add one below (for example &ldquo;Kick-off Complete&rdquo;) to record the meeting.</InlineMessage>}
      <Pair>
        <FormField id="pfxc-kick-date" label="Date held"><DateField id="pfxc-kick-date" value={f.heldOn} onChange={e => set({ heldOn: e.target.value })} width="100%" /></FormField>
        <FormField id="pfxc-kick-others" label="Others who attended"><TextField id="pfxc-kick-others" value={f.others} onChange={e => set({ others: e.target.value })} placeholder="Medical writer, sponsor team…" width="100%" /></FormField>
      </Pair>
      <div className="pfx-field">
        <span className="pfx-label">Authors who attended</span>
        {authors.length === 0 ? <div className="pfx-meta">Add the authors on the Authors tab first.</div> : (
          <div className="pfxc-kick-checks">
            {authors.map(x => <Checkbox key={x.group + x.person} checked={f.attendees.includes(x.person)} onChange={() => toggleAttendee(x.person)} label={x.person} />)}
          </div>
        )}
      </div>
      <div className="pfx-field">
        <span className="pfx-label">Agreed at the meeting</span>
        <div className="pfxc-kick-checks">
          {AGREED.map(([key, label]) => <Checkbox key={key} checked={!!f.agreed[key]} onChange={() => set({ agreed: { ...f.agreed, [key]: !f.agreed[key] } })} label={label} />)}
        </div>
      </div>
      <FormField id="pfxc-kick-notes" label="Notes"><TextArea id="pfxc-kick-notes" value={f.notes} onChange={e => set({ notes: e.target.value })} width="100%" height="60px" /></FormField>
      <div className="pfxc-kick-minutes">
        <ProofField id="pfxc-kick-minutes" label="Minutes" file={file} onFile={setFile} help="Optional: the meeting minutes or agenda." />
      </div>
      {error && <InlineMessage kind="error">{error}</InlineMessage>}
      <div className="pf-proxy-actions">
        <Button variant="primary" icon="event_available" onClick={save} disabled={!ready || busy || saving}>{busy ? 'Saving…' : 'Record Kick-off'}</Button>
      </div>
    </Card>
  );
}
