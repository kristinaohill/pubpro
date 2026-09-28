import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, DetailGrid, Field, FormActionBar, InlineMessage, Panel, Pill, RecordHeader, Select, TextArea, TextField } from '../ds/pubpro';
import DateField from '../components/DateField';
import { refreshPeople } from '../components/usePeople';
import { ChipCheck } from './publication-form/ui';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Flash from '../components/Flash';
import { fmtSaved } from './Publications';
import './StudyProfile.css';
import './UserProfile.css';


const mdy = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? +m[2] + '/' + +m[3] + '/' + m[1] : ''; };
const iso = s => { const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : ''; };
const detailsOf = p => ({ title: p.title || '', department: p.department || '', phone: p.phone || '', therapeuticAreas: p.therapeuticAreas || [] });
const oooOf = p => ({ on: !!(p.ooo.from || p.ooo.to), from: mdy(p.ooo.from), to: mdy(p.ooo.to), note: p.ooo.note || '' });

/** My Profile (avatar menu): your name, work details, out of office and settings, saved on your account. */
export default function UserProfile() {
  const navigate = useNavigate();
  const { updateSession } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [details, setDetails] = useState(detailsOf({}));
  const [ooo, setOoo] = useState({ on: false, from: '', to: '', note: '' });
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then(p => { setProfile(p); setName(p.name); setWeeklySummary(!!p.prefs.weeklySummary); setDetails(detailsOf(p)); setOoo(oooOf(p)); })
      .catch(err => setMessage({ kind: 'error', text: err.message }));
  }, []);

  const dirty = !!profile && (name.trim() !== profile.name || weeklySummary !== !!profile.prefs.weeklySummary
    || JSON.stringify(details) !== JSON.stringify(detailsOf(profile)) || JSON.stringify(ooo) !== JSON.stringify(oooOf(profile)));

  const save = async close => {
    setSaving(true);
    setMessage(null);
    try {
      if (ooo.on && ((ooo.from && !iso(ooo.from)) || (ooo.to && !iso(ooo.to)))) throw new Error('Enter out-of-office dates as m/d/yyyy.');
      const res = await api.put('/auth/me', {
        name, prefs: { weeklySummary }, ...details,
        ooo: ooo.on ? { from: iso(ooo.from), to: iso(ooo.to), note: ooo.note } : { from: '', to: '', note: '' },
      });
      updateSession(res.token, res.user);
      setProfile(res.profile);
      setName(res.profile.name);
      setDetails(detailsOf(res.profile));
      setOoo(oooOf(res.profile));
      refreshPeople();
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
        {message ? <InlineMessage kind="error">{message.text}</InlineMessage> : <div className="empty-state empty-state--inset">Loading…</div>}
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
        meta={[<Pill tone="active">{profile.role_name || profile.role}</Pill>]}
      />

      <div className="sp-body">
        {message && <Flash kind={message.kind} watch={message}>{message.text}</Flash>}

        <Panel icon="badge" title="Account">
          <div className="sp-endpoints" style={{ gap: 16 }}>
            <Field label="Name" required help="Shown as the owner on publications, plans and authors you save.">
              <TextField value={name} onChange={e => setName(e.target.value)} width="360px" style={{ maxWidth: '100%' }} />
            </Field>
            <DetailGrid
              columns={3}
              items={[
                { label: 'Email (sign-in)', value: profile.email },
                { label: 'Role', value: profile.role_name || profile.role },
                { label: 'Member Since', value: fmtSaved(profile.created_at) },
              ]}
            />
          </div>
        </Panel>

        <Panel icon="work" title="Work Details" description="Shown to colleagues when they pick you as an author or reviewer.">
          <div className="sp-endpoints" style={{ gap: 16 }}>
            <div className="up-grid">
              <Field label="Job title">
                <TextField value={details.title} onChange={e => setDetails({ ...details, title: e.target.value })} placeholder="e.g. Medical Director - Immunology" />
              </Field>
              <Field label="Department">
                <Select
                  options={[{ value: '', label: 'Please select' }].concat(
                    (profile.options.departments.includes(details.department) || !details.department ? [] : [details.department])
                      .concat(profile.options.departments).map(d => (typeof d === 'string' ? { value: d, label: d } : d)),
                  )}
                  value={details.department}
                  onChange={e => setDetails({ ...details, department: e.target.value })}
                  width="100%"
                />
              </Field>
              <Field label="Phone">
                <TextField type="tel" value={details.phone} onChange={e => setDetails({ ...details, phone: e.target.value })} autoComplete="tel" />
              </Field>
            </div>
            <fieldset className="up-fieldset">
              <legend className="up-legend">Therapeutic areas</legend>
              <div className="pfx-chips">
                {profile.options.therapeuticAreas.map(ta => (
                  <ChipCheck
                    key={ta}
                    label={ta}
                    checked={details.therapeuticAreas.includes(ta)}
                    onChange={() => setDetails(d => ({ ...d, therapeuticAreas: d.therapeuticAreas.includes(ta) ? d.therapeuticAreas.filter(x => x !== ta) : d.therapeuticAreas.concat([ta]) }))}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        </Panel>

        <Panel icon="event_busy" title="Out of Office" description="Review rounds sent while you're away mark you out of office, and reminders to you wait until you're back.">
          <div className="sp-endpoints" style={{ gap: 14 }}>
            <Checkbox checked={ooo.on} onChange={() => setOoo(o => ({ ...o, on: !o.on }))} label="I'm out of office" />
            {ooo.on && (
              <>
                <div className="up-grid up-grid--dates">
                  <Field label="From"><DateField value={ooo.from} onChange={e => setOoo({ ...ooo, from: e.target.value })} width="100%" /></Field>
                  <Field label="Until"><DateField value={ooo.to} onChange={e => setOoo({ ...ooo, to: e.target.value })} width="100%" /></Field>
                </div>
                <Field label="Message for colleagues" help="Shown next to your name in pickers and on review rounds.">
                  <TextArea value={ooo.note} onChange={e => setOoo({ ...ooo, note: e.target.value })} width="100%" height="60px" placeholder="e.g. At ESC Congress, then on leave. Contact Greg Vogel for urgent reviews." />
                </Field>
                {profile.oooNow && <InlineMessage kind="info">You&rsquo;re showing as out of office now.</InlineMessage>}
              </>
            )}
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
