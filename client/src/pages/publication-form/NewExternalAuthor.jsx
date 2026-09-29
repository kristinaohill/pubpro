import React, { useState } from 'react';
import { Button, InlineMessage, TextField } from '../../ds/pubpro';
import { api } from '../../api';
import { refreshExternalAuthors } from '../../components/usePeople';
import { nowStamp } from './data';
import { FormField, Pair } from './ui';
import './proof.css';

// Adding someone who isn't in PubPro yet, from a publication's Authors tab. It creates their
// external author profile (which gives them a login, so the invitation's link works) and adds them
// to this publication. Before creating anyone it checks for the same email or a similar name:
// a duplicate profile would split their COI, agreement and debarment history.

const splitName = q => {
  const parts = String(q || '').trim().split(/\s+/).filter(Boolean);
  return { first: parts.slice(0, -1).join(' ') || parts[0] || '', last: parts.length > 1 ? parts[parts.length - 1] : '' };
};
const asEntry = p => ({ profileId: p.id, display: p.displayName, institution: p.institution || '', name: p.institution ? p.displayName + '-' + p.institution : p.displayName });

export default function NewExternalAuthor({ query, recordId, userName, onAdd, onCancel }) {
  const start = splitName(query);
  const [f, setF] = useState({ first: start.first, last: start.last, email: '', institution: '', country: 'United States' });
  const [matches, setMatches] = useState(null); // { emailMatch, similar } once checked
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = p => { setF(x => ({ ...x, ...p })); setMatches(null); setError(''); };

  const create = async () => {
    const display = (f.first + ' ' + f.last).replace(/\s+/g, ' ').trim();
    const data = {
      active: true, na: true, manual: !!f.institution.trim(), checks: [], agreements: [], coi: [], signedCoi: null, studies: [],
      form: { firstName: f.first.trim(), middleInitial: '', lastName: f.last.trim(), displayName: display, email: f.email.trim(), confirmEmail: f.email.trim(), institution: f.institution.trim(), street: '', city: '', state: '', country: f.country.trim(), zip: '' },
      audit: [{ action: 'Profile created', user: userName, at: nowStamp(), detail: 'Added from the Authors tab of ' + recordId, icon: 'person_add', color: 'var(--high-emphasis)' }],
    };
    const summary = { displayName: display, institution: f.institution.trim(), location: f.country.trim(), lastCheck: '', lastCheckClear: null, pending: 0, studies: 0 };
    const made = await api.post('/pp-authors', { name: display, email: f.email.trim(), status: 'Active', summary, data });
    refreshExternalAuthors();
    return asEntry({ id: made.id, displayName: display, institution: f.institution.trim() });
  };

  const submit = async () => {
    if (!f.first.trim() || !f.last.trim()) { setError('Enter their first and last name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setError('Enter their email: they sign in with it.'); return; }
    setBusy(true);
    setError('');
    try {
      // First pass: look for the same email or a similar name before creating anyone.
      if (!matches) {
        const m = await api.get('/pp-authors/matches?' + new URLSearchParams({ email: f.email.trim(), first: f.first.trim(), last: f.last.trim() }));
        if (m.emailMatch || m.similar.length) { setMatches(m); return; }
      }
      if (matches && matches.emailMatch) return;
      onAdd(await create(), true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pf-proxy-panel">
      <div className="pfx-help">New external author. This creates their author profile and login and adds them here. Send the invitation when you&rsquo;re ready.</div>
      <Pair>
        <FormField id="nea-first" label="First name"><TextField id="nea-first" value={f.first} onChange={e => set({ first: e.target.value })} width="100%" /></FormField>
        <FormField id="nea-last" label="Last name"><TextField id="nea-last" value={f.last} onChange={e => set({ last: e.target.value })} width="100%" /></FormField>
      </Pair>
      <Pair>
        <FormField id="nea-email" label="Email"><TextField id="nea-email" type="email" value={f.email} onChange={e => set({ email: e.target.value })} placeholder="name@institution.org" width="100%" /></FormField>
        <FormField id="nea-inst" label="Institution"><TextField id="nea-inst" value={f.institution} onChange={e => set({ institution: e.target.value })} placeholder="UCLA School of Medicine" width="100%" /></FormField>
      </Pair>
      <Pair>
        <FormField id="nea-country" label="Country"><TextField id="nea-country" value={f.country} onChange={e => set({ country: e.target.value })} width="100%" /></FormField>
        <div />
      </Pair>

      {matches && matches.emailMatch && (
        <InlineMessage kind="warning">
          {matches.emailMatch.displayName}{matches.emailMatch.institution ? ' (' + matches.emailMatch.institution + ')' : ''} already has this email ({matches.emailMatch.authorId}).{' '}
          <button type="button" className="yr-link" onClick={() => onAdd(asEntry(matches.emailMatch), false)}>Add {matches.emailMatch.displayName} instead</button>
        </InlineMessage>
      )}
      {matches && !matches.emailMatch && matches.similar.length > 0 && (
        <InlineMessage kind="info">
          Did you mean one of these?
          <span className="nea-similar">
            {matches.similar.map(p => (
              <button key={p.id} type="button" className="yr-link" onClick={() => onAdd(asEntry(p), false)}>
                {p.displayName}{p.institution ? ', ' + p.institution : ''} ({p.authorId})
              </button>
            ))}
          </span>
          If not, add them as a new author.
        </InlineMessage>
      )}
      {error && <InlineMessage kind="error">{error}</InlineMessage>}
      <div className="pf-proxy-actions">
        <Button variant="tertiary" onClick={onCancel} disabled={busy}>Cancel</Button>
        {!(matches && matches.emailMatch) && (
          <Button variant="primary" icon="person_add" onClick={submit} disabled={busy}>
            {busy ? 'Checking…' : matches ? 'Add as a New Author' : 'Add Author'}
          </Button>
        )}
      </div>
    </div>
  );
}
