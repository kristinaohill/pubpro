import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Checkbox, Icon, InlineMessage, TextField } from '../ds/pubpro';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { contributionsOf } from './publication-form/credit';
import './AuthorInvitation.css';

// Where an authorship invitation's link lands (/invitation/:id): the author reads the ICMJE
// criteria and the agreement, attests to each statement and signs by typing their name. The server
// records the signature with its own timestamp (A1, A4), and drafting can't start until every
// author has signed.

const when = iso => (iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : '');

export default function AuthorInvitation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthor = !!user && user.role === 'author';
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [checks, setChecks] = useState({});
  const [signature, setSignature] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const load = () => api.get('/pp-publications/' + id + '/invitation').then(setInfo).catch(err => setError(err.message));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const back = () => navigate(isAuthor ? '/author-dashboard' : '/publication/' + id, isAuthor ? undefined : { state: { tab: 'authors' } });
  if (error) return <div className="ai-page"><InlineMessage kind="error">{error}</InlineMessage><Button variant="secondary" onClick={() => navigate(isAuthor ? '/author-dashboard' : '/publication-manager')}>Back</Button></div>;
  if (!info) return <div className="ai-page"><div className="empty-state">Loading&hellip;</div></div>;

  const { publication: p, me, agreement: A } = info;
  // Who does what (ICMJE criterion 4): co-authors' CRediT roles, read like the Authors tab does.
  const teamSt = { authorMetaEdits: Object.fromEntries((info.team || []).filter(t => t.credit).map(t => [t.person, { credit: t.credit }])) };
  const team = (info.team || []).map(t => ({ person: t.person, roles: contributionsOf(teamSt, t.person).map(r => r.label) }));
  const TeamCard = team.length > 0 && (
    <div className="ai-team">
      <h3 className="ai-h3">Who does what</h3>
      <p className="ai-meta">ICMJE asks each author to know which co-authors are responsible for which parts of the work (criterion 4). Planned CRediT roles:</p>
      <div className="ai-team-list">
        {team.map(t => (
          <div key={t.person} className="ai-team-row">
            <span className="ai-team-name">{t.person}{t.person === me.name ? ' (you)' : ''}</span>
            <span className="ai-meta">{t.roles.length ? t.roles.join(', ') : 'Roles not set yet'}</span>
          </div>
        ))}
      </div>
    </div>
  );
  const signed = me.criteria && me.criteria.at;
  const declined = me.invite.status === 'declined';
  const allChecked = A.attestations.every((_, i) => checks[i]);
  const sameName = signature.trim().toLowerCase().replace(/\s+/g, ' ') === String(me.name).trim().toLowerCase().replace(/\s+/g, ' ');

  const reply = async accept => {
    setBusy(true);
    setProblem('');
    try {
      await api.post('/pp-publications/' + id + '/invitation-response', accept ? { accept: true, criteria: allChecked, signature } : { accept: false });
      await load();
    } catch (err) {
      setProblem(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ai-page">
      <div className="ai-card">
        <div className="ai-eyebrow">AUTHORSHIP INVITATION</div>
        <h1 className="ai-title">{p.title}</h1>
        <div className="ai-meta">{p.recordId} · {p.type}{p.product ? ' · ' + p.product : ''}{p.owner ? ' · from ' + p.owner : ''}{me.invite.sent ? ' · sent ' + me.invite.sent : ''}</div>

        {signed ? (
          <div className="ai-done">
            <Icon name="verified" size={28} color="var(--ok)" />
            <div>
              <div className="ai-done-title">{me.criteria.how === 'recorded' ? 'Your acceptance was recorded' : 'You signed the authorship agreement'}</div>
              <div className="ai-meta">
                {me.criteria.how === 'recorded'
                  ? 'Recorded by ' + me.criteria.by + ' on ' + me.criteria.on + ', with your written confirmation attached.'
                  : 'Signed as “' + me.criteria.signedName + '” on ' + when(me.criteria.at) + ' · agreement version ' + me.criteria.agreementVersion + '.'}
              </div>
            </div>
            <Button variant="secondary" onClick={back}>{isAuthor ? 'Go to My Dashboard' : 'Open the Publication'}</Button>
          </div>
        ) : declined ? (
          <div className="ai-done">
            <Icon name="cancel" size={28} color="var(--fatal-text)" />
            <div><div className="ai-done-title">You declined this invitation</div><div className="ai-meta">Declined {me.invite.on}. Contact {p.owner || 'the publication team'} if that was a mistake.</div></div>
            <Button variant="secondary" onClick={back}>{isAuthor ? 'Go to My Dashboard' : 'Open the Publication'}</Button>
          </div>
        ) : p.cancelled ? (
          <InlineMessage kind="warning">This publication was cancelled, so the invitation can&rsquo;t be accepted.</InlineMessage>
        ) : (
          <>
            <h2 className="ai-h2">{A.title}</h2>
            <p className="ai-text">{A.intro}</p>
            <ol className="ai-criteria">
              {A.criteria.map(c => <li key={c}>{c}</li>)}
            </ol>

            {TeamCard}

            <h3 className="ai-h3">By signing, you attest that:</h3>
            <div className="ai-attest">
              {A.attestations.map((t, i) => (
                <Checkbox key={t} checked={!!checks[i]} onChange={() => setChecks(c => ({ ...c, [i]: !c[i] }))} label={t} />
              ))}
            </div>

            <div className="ai-sign">
              <label className="ai-sign-label" htmlFor="ai-signature">Signature</label>
              <TextField id="ai-signature" value={signature} onChange={e => setSignature(e.target.value)} placeholder={'Type your full name: ' + me.name} width="100%" autoComplete="name" />
              <div className="ai-meta">Typing your name is your electronic signature. PubPro saves it with the date and time, and the agreement version (v{A.version}).</div>
            </div>

            {problem && <InlineMessage kind="error">{problem}</InlineMessage>}
            <div className="ai-actions">
              <Button variant="tertiary" onClick={() => reply(false)} disabled={busy}>Decline Invitation</Button>
              <Button variant="primary" icon="draw" onClick={() => reply(true)} disabled={busy || !allChecked || !sameName}>{busy ? 'Signing…' : 'Sign and Accept'}</Button>
            </div>
          </>
        )}
        {signed && TeamCard}
      </div>
    </div>
  );
}
