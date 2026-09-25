import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, DetailGrid, Field, FormActionBar, InlineMessage, Panel, Pill, RecordHeader, TextField } from '../ds/pubpro';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { fmtSaved } from './Publications';
import './StudyProfile.css';

const ROLE_LABEL = { admin: 'Administrator', user: 'Staff', author: 'External Author' };

/** My Profile (avatar menu): your name and settings, saved on your account. */
export default function UserProfile() {
  const navigate = useNavigate();
  const { updateSession } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then(p => { setProfile(p); setName(p.name); setWeeklySummary(!!p.prefs.weeklySummary); })
      .catch(err => setMessage({ kind: 'error', text: err.message }));
  }, []);

  const dirty = !!profile && (name.trim() !== profile.name || weeklySummary !== !!profile.prefs.weeklySummary);

  const save = async close => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put('/auth/me', { name, prefs: { weeklySummary } });
      updateSession(res.token, res.user);
      setProfile(res.profile);
      setName(res.profile.name);
      if (close) { navigate('/dashboard', { state: { savedNotice: 'Saved your profile.' } }); return; }
      setMessage({ kind: 'info', text: 'Profile saved.' });
    } catch (err) {
      setMessage({ kind: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="sp-page sp-pad">
        {message ? <InlineMessage kind="error">{message.text}</InlineMessage> : <div className="sp-empty">Loading…</div>}
      </div>
    );
  }

  return (
    <div className="sp-page">
      <RecordHeader
        icon="account_circle"
        title={profile.name}
        task="My Profile"
        subtitle={profile.email}
        meta={[<Pill tone="active">{ROLE_LABEL[profile.role] || profile.role}</Pill>]}
      />

      <div className="sp-body">
        {message && <InlineMessage kind={message.kind}>{message.text}</InlineMessage>}

        <Panel icon="badge" title="Account">
          <div className="sp-endpoints" style={{ gap: 16 }}>
            <Field label="Name" required help="Shown as the owner on publications, plans and authors you save.">
              <TextField value={name} onChange={e => setName(e.target.value)} width="360px" style={{ maxWidth: '100%' }} />
            </Field>
            <DetailGrid
              columns={3}
              items={[
                { label: 'Email (sign-in)', value: profile.email },
                { label: 'Role', value: ROLE_LABEL[profile.role] || profile.role },
                { label: 'Member Since', value: fmtSaved(profile.created_at) },
              ]}
            />
          </div>
        </Panel>

        <Panel icon="notifications" title="Notifications">
          <div className="sp-endpoints">
            <Checkbox
              checked={weeklySummary}
              onChange={() => setWeeklySummary(v => !v)}
              label="Email me a status summary of all my publications every Friday"
            />
          </div>
        </Panel>
      </div>

      <FormActionBar
        left={<Button variant="secondary" onClick={() => navigate('/dashboard')}>Close</Button>}
        right={(
          <>
            <Button variant="secondary" onClick={() => save(false)} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button variant="primary" onClick={() => save(true)} disabled={saving}>Save &amp; Close</Button>
          </>
        )}
      />
    </div>
  );
}
