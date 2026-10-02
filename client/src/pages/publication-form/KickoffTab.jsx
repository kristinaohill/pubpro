import React, { useState } from 'react';
import { Button, Checkbox, Icon, IconButton, InlineMessage, Pill, Select, TextArea, TextField } from '../../ds/pubpro';
import DateField from '../../components/DateField';
import usePeople from '../../components/usePeople';
import { REVIEW_METHOD_OPTIONS, TODAY, TODAY_STR } from './data';
import { auditEntry, bylineAuthors } from './state';
import {
  ANALYSIS_LABELS, NO_WRITER, PRESENTATION_PREFS, coiOf, creditOf, kickoffChecklist, kickoffRowOf,
  meetingMissing, needsKickoff, timelineRows,
} from './kickoff';
import { ProofField, openProof, uploadProof } from './proof';
import { Card, FormField, Pair, Stack, TabHead } from './ui';
import './kickoff.css';

// Kick-off (V2, GPP): everything the kick-off has to produce, section by section, and the meeting
// itself. The kick-off can only be recorded as held once every section is ready; recording it
// completes the kick-off milestone on the plan, which unlocks the steps after it and drafting.
// Key messages, the data scope and the decisions log stay on the publication afterwards.

const blankRow = () => ({ id: Date.now() + Math.random() });
const daysSince = mdy => { const d = new Date(mdy); return isNaN(d) ? null : Math.round((TODAY - d) / 86400000); };

function Section({ n, item, children, help }) {
  const ready = item.missing.length === 0;
  return (
    <Card
      title={<span className="kx-title"><span className={'kx-num' + (ready ? ' kx-num--ok' : '')}>{ready ? <Icon name="check" size={14} /> : n}</span>{item.title}</span>}
      actions={<Pill tone={ready ? 'active' : 'hold'}>{ready ? 'Ready' : item.missing.length + ' to do'}</Pill>}
    >
      {help && <div className="pfx-help">{help}</div>}
      {children}
      {!ready && (
        <ul className="kx-missing">
          {item.missing.map(m => <li key={m}><Icon name="radio_button_unchecked" size={14} />{m}</li>)}
        </ul>
      )}
    </Card>
  );
}

export default function KickoffTab({ st, set, commit, saving, userName, record, navigate }) {
  const staff = usePeople();
  const authors = bylineAuthors(st);
  const row = kickoffRowOf(st);
  const done = !!(st.kickoff && st.kickoff.heldOn);
  const [meet, setMeet] = useState({ heldOn: TODAY_STR, attendees: [], others: '', notes: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!needsKickoff(st)) {
    return (
      <Stack>
        <TabHead title="Kick-off" sub="The kick-off with the authors, before drafting." />
        <Card><div className="pfx-help">{st.pubType ? st.pubType + 's follow the kick-off of the abstract they’re made from.' : 'Choose the publication type on the Overview tab.'}</div></Card>
      </Stack>
    );
  }

  const list = kickoffChecklist(st);
  const ready = list.filter(x => !x.missing.length).length;
  const sec = key => list.find(x => x.key === key);
  const meetMissing = meetingMissing(meet);
  const canRecord = !done && !!row && ready === list.length && !meetMissing.length;

  const prep = st.kickoffPrep || {};
  const setPrep = p => set(s => ({ kickoffPrep: { ...(s.kickoffPrep || {}), ...p } }));
  const setIn = (key, p) => set(s => ({ [key]: { ...(s[key] || {}), ...p } }));
  const listOps = key => ({
    add: () => set(s => ({ [key]: (s[key] || []).concat([blankRow()]) })),
    patch: (id, p) => set(s => ({ [key]: (s[key] || []).map(x => (x.id === id ? { ...x, ...p } : x)) })),
    remove: id => set(s => ({ [key]: (s[key] || []).filter(x => x.id !== id) })),
  });
  const scopeOps = key => ({
    add: () => set(s => ({ dataScope: { ...(s.dataScope || {}), [key]: ((s.dataScope || {})[key] || []).concat([blankRow()]) } })),
    patch: (id, p) => set(s => ({ dataScope: { ...(s.dataScope || {}), [key]: ((s.dataScope || {})[key] || []).map(x => (x.id === id ? { ...x, ...p } : x)) } })),
    remove: id => set(s => ({ dataScope: { ...(s.dataScope || {}), [key]: ((s.dataScope || {})[key] || []).filter(x => x.id !== id) } })),
  });
  const people = [...new Set(staff.map(p => p.name).concat(authors.map(x => x.person)))].sort((a, b) => a.localeCompare(b));
  const personOpts = (cur, extra = []) => [{ value: '', label: 'Choose a person' }].concat(extra, [...new Set(people.concat(cur ? [cur] : []))].map(p => ({ value: p, label: p })));
  const msgs = st.keyMessages || [];
  const scope = st.dataScope || {};
  const venue = st.venuePlan || {};
  const log = st.logistics || {};
  const abstract = st.pubType === 'Abstract';
  const tl = timelineRows(st);
  const toggleAtt = n => setMeet(m => ({ ...m, attendees: m.attendees.includes(n) ? m.attendees.filter(x => x !== n) : m.attendees.concat([n]) }));
  const go = tab => set({ tab });

  const recordKickoff = async () => {
    if (!record || !canRecord) return;
    setBusy(true);
    setError('');
    try {
      const up = file ? await uploadProof(record.id, file, 'kickoff', 'Kick-off meeting') : null;
      const contributions = Object.fromEntries(authors.map(x => [x.person, creditOf(st, x.person)]));
      const kickoff = { ...meet, others: meet.others.trim(), notes: meet.notes.trim(), minutes: up ? { id: up.id, name: up.name } : null, recordedBy: userName, recordedOn: TODAY_STR, contributions };
      await commit(s => ({
        kickoff,
        rows: s.rows.map(r => (r.id === row.id ? { ...r, done: true, doneOn: meet.heldOn } : r)),
        audit: (s.audit || []).concat([auditEntry('Kick-off Meeting Held', {
          participants: meet.attendees.concat(kickoff.others ? [kickoff.others] : []).join('\n'), result: 'Held ' + meet.heldOn,
          comment: [(s.keyMessages || []).filter(m => m.text).length + ' key messages', 'data scope, venue, timeline owners and roles agreed (V2)', 'recorded by ' + userName, up ? 'minutes: ' + up.name : ''].filter(Boolean).join(' · '),
        })]),
      }), { done: 'Kick-off recorded. The plan moves on to drafting.' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack>
      <TabHead title="Kick-off" sub="What the kick-off with the authors has to settle before drafting starts (V2, GPP)." />

      <Card title={done ? 'Kick-off held' : 'Kick-off meeting'} meta={done ? 'Recorded' : ready + ' of ' + list.length + ' sections ready'}>
        {done ? (
          <div className="kx-held">
            <Icon name="check_circle" size={22} color="var(--ok)" />
            <div>
              <div className="pf-strong">Held {st.kickoff.heldOn}</div>
              <div className="pfx-meta">Attended by {st.kickoff.attendees.concat(st.kickoff.others ? [st.kickoff.others] : []).join(', ')} · recorded by {st.kickoff.recordedBy} on {st.kickoff.recordedOn}</div>
              {st.kickoff.notes && <div className="pfx-meta">{st.kickoff.notes}</div>}
              {st.kickoff.minutes && record && <button type="button" className="yr-link" onClick={() => openProof(record.id, st.kickoff.minutes).catch(err => setError(err.message))}>Minutes: {st.kickoff.minutes.name}</button>}
              <div className="pfx-meta">Key messages, the data scope and the decisions log below stay with the publication; keep them up to date.</div>
            </div>
          </div>
        ) : (
          <>
            <div className="kx-progress" aria-hidden="true">{list.map(x => <span key={x.key} className={'kx-seg' + (x.missing.length ? '' : ' kx-seg--ok')} title={x.title} />)}</div>
            {!row && <InlineMessage kind="warning">This plan has no kick-off milestone. Add one on the Planning tab (for example &ldquo;Kick-off Complete&rdquo;).</InlineMessage>}
            <Pair>
              <FormField id="kx-date" label="Date held"><DateField id="kx-date" value={meet.heldOn} onChange={e => setMeet(m => ({ ...m, heldOn: e.target.value }))} width="100%" /></FormField>
              <FormField id="kx-others" label="Others who attended"><TextField id="kx-others" value={meet.others} onChange={e => setMeet(m => ({ ...m, others: e.target.value }))} placeholder="Medical writer, sponsor team…" width="100%" /></FormField>
            </Pair>
            <div className="pfx-field">
              <span className="pfx-label">Authors who attended</span>
              {authors.length ? (
                <div className="kx-checks">{authors.map(x => <Checkbox key={x.group + x.person} checked={meet.attendees.includes(x.person)} onChange={() => toggleAtt(x.person)} label={x.person} />)}</div>
              ) : <div className="pfx-meta">Add the authors on the Authors tab.</div>}
            </div>
            <FormField id="kx-notes" label="Meeting notes"><TextArea id="kx-notes" value={meet.notes} onChange={e => setMeet(m => ({ ...m, notes: e.target.value }))} width="100%" height="56px" /></FormField>
            <div className="kx-minutes"><ProofField id="kx-minutes" label="Minutes" file={file} onFile={setFile} help="Optional: the minutes or agenda." /></div>
            {error && <InlineMessage kind="error">{error}</InlineMessage>}
            <div className="kx-record">
              <span className="pfx-meta">
                {canRecord ? 'Everything the kick-off has to settle is in place.'
                  : ready < list.length ? (list.length - ready) + ' section' + (list.length - ready === 1 ? '' : 's') + ' below still need work.'
                    : meetMissing.join(' ')}
              </span>
              <Button variant="primary" icon="event_available" onClick={recordKickoff} disabled={!canRecord || busy || saving}>{busy ? 'Saving…' : 'Record Kick-off'}</Button>
            </div>
          </>
        )}
      </Card>

      <Section n={1} item={sec('authorship')} help="Named authors, their order, each one's signed agreement to the ICMJE criteria and their expected contribution. Being invited to the meeting isn't agreement.">
        <div className="kx-table">
          {authors.map((x, i) => {
            const roles = creditOf(st, x.person);
            return (
              <div key={x.group + x.person} className="kx-row">
                <span className="kx-cell kx-strong">{i + 1}. {x.person}{i === 0 ? ' · first author' : i === authors.length - 1 && authors.length > 1 ? ' · senior author' : ''}</span>
                <span className="kx-cell">{x.a.criteria && x.a.criteria.at ? <><Icon name="verified" size={14} color="var(--ok)" /> Signed {x.a.criteria.on}</> : <><Icon name="schedule" size={14} color="var(--warn-text)" /> Not signed</>}</span>
                <span className="kx-cell kx-faint">{roles.length ? roles.join(', ') : 'No CRediT roles yet'}</span>
              </div>
            );
          })}
        </div>
        <div className="kx-actions">
          <Checkbox checked={!!prep.orderConfirmed} onChange={() => setPrep({ orderConfirmed: !prep.orderConfirmed })} label="Author order agreed (first and senior author as shown)" />
          <button type="button" className="yr-link" onClick={() => go('authors')}>Order, roles and invitations are on the Authors tab</button>
        </div>
      </Section>

      <Section n={2} item={sec('disclosure')} help="Current COI disclosures, or who needs to update before submission, and any transfer of value to external authors.">
        <div className="kx-table">
          {authors.map(x => {
            const coi = coiOf(st, x.person);
            const age = coi ? daysSince(coi) : null;
            return (
              <div key={x.group + x.person} className="kx-row kx-row--2">
                <span className="kx-cell kx-strong">{x.person}</span>
                <span className="kx-cell">{!coi ? <><Icon name="flag" size={14} color="var(--warn-text)" /> No COI on file: update before submission</> : age > 365 ? <><Icon name="flag" size={14} color="var(--warn-text)" /> COI from {coi}: update before submission</> : <><Icon name="verified" size={14} color="var(--ok)" /> COI current ({coi})</>}</span>
              </div>
            );
          })}
        </div>
        <div className="kx-actions">
          <Checkbox checked={!!prep.coiReviewed} onChange={() => setPrep({ coiReviewed: !prep.coiReviewed })} label="COI status reviewed; anyone flagged updates before submission" />
        </div>
        <Pair>
          <FormField id="kx-tov" label="Does any external author receive support (writing, travel, honoraria)?">
            <Select id="kx-tov" options={[{ value: '', label: 'Choose' }, { value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} value={prep.transferOfValue || ''} onChange={e => setPrep({ transferOfValue: e.target.value })} width="100%" />
          </FormField>
          {prep.transferOfValue === 'yes' ? (
            <FormField id="kx-tov-note" label="What support, for whom"><TextField id="kx-tov-note" value={prep.tovNote || ''} onChange={e => setPrep({ tovNote: e.target.value })} placeholder="Travel and registration for the presenter" width="100%" /></FormField>
          ) : <div />}
        </Pair>
      </Section>

      <Section n={3} item={sec('messages')} help="Two to four statements of what this publication will say, each tied to an endpoint or analysis.">
        {msgs.map((m, i) => (
          <div key={m.id} className="kx-msg">
            <span className="kx-msg-n">{i + 1}</span>
            <TextArea value={m.text || ''} onChange={e => listOps('keyMessages').patch(m.id, { text: e.target.value })} placeholder="Biologix improved angina-related quality of life versus placebo" width="100%" height="48px" aria-label={'Key message ' + (i + 1)} />
            <TextField value={m.endpoint || ''} onChange={e => listOps('keyMessages').patch(m.id, { endpoint: e.target.value })} placeholder="Endpoint: SAQ summary score, week 52" width="100%" aria-label={'Endpoint for key message ' + (i + 1)} />
            <IconButton icon="close" tone="fatal" size={26} title="Remove key message" onClick={() => listOps('keyMessages').remove(m.id)} />
          </div>
        ))}
        {msgs.length < 4 && <Button variant="secondary" icon="add" onClick={listOps('keyMessages').add}>Add Key Message</Button>}
      </Section>

      <Section n={4} item={sec('data')} help="Which data cut and analyses, which tables and figures, and who produces them.">
        <Pair>
          <FormField id="kx-cut" label="Data cut"><TextField id="kx-cut" value={scope.cut || ''} onChange={e => setIn('dataScope', { cut: e.target.value })} placeholder="Week 52 database lock, 3/14/2026" width="100%" /></FormField>
          <FormField id="kx-final" label={abstract ? 'Data final and approved by' : 'Data final and approved by (optional)'}><DateField id="kx-final" value={scope.finalBy || ''} onChange={e => setIn('dataScope', { finalBy: e.target.value })} width="100%" /></FormField>
        </Pair>
        <div className="pfx-field">
          <span className="pfx-label">Analyses</span>
          {(scope.analyses || []).map(x => (
            <div key={x.id} className="kx-line">
              <TextField value={x.name || ''} onChange={e => scopeOps('analyses').patch(x.id, { name: e.target.value })} placeholder="Change from baseline in SAQ summary score" width="100%" aria-label="Analysis" />
              <Select options={[{ value: '', label: 'Label' }].concat(ANALYSIS_LABELS.map(l => ({ value: l, label: l })))} value={x.label || ''} onChange={e => scopeOps('analyses').patch(x.id, { label: e.target.value })} width="150px" aria-label="Primary, secondary or post hoc" />
              <IconButton icon="close" tone="fatal" size={26} title="Remove analysis" onClick={() => scopeOps('analyses').remove(x.id)} />
            </div>
          ))}
          <Button variant="tertiary" icon="add" onClick={scopeOps('analyses').add}>Add Analysis</Button>
        </div>
        <div className="pfx-field">
          <span className="pfx-label">Tables and figures</span>
          {(scope.outputs || []).map(x => (
            <div key={x.id} className="kx-line">
              <TextField value={x.name || ''} onChange={e => scopeOps('outputs').patch(x.id, { name: e.target.value })} placeholder="Table 1: baseline characteristics" width="100%" aria-label="Table or figure" />
              <Select options={personOpts(x.owner)} value={x.owner || ''} onChange={e => scopeOps('outputs').patch(x.id, { owner: e.target.value })} width="200px" aria-label="Owner" />
              <IconButton icon="close" tone="fatal" size={26} title="Remove table or figure" onClick={() => scopeOps('outputs').remove(x.id)} />
            </div>
          ))}
          <Button variant="tertiary" icon="add" onClick={scopeOps('outputs').add}>Add Table or Figure</Button>
        </div>
      </Section>

      <Section n={5} item={sec('venue')} help={abstract ? 'The congress, category, oral or poster, word and character limits, and embargo rules.' : 'The primary journal and a fallback, with the format each needs.'}>
        <div className="kx-table">
          <div className="kx-row kx-row--2"><span className="kx-cell kx-strong">Target</span><span className="kx-cell">{(st.targets || [])[0] || 'Not chosen'}</span></div>
          <div className="kx-row kx-row--2"><span className="kx-cell kx-strong">Fallback</span><span className="kx-cell">{(st.targets || [])[1] || (abstract ? 'None (optional for abstracts)' : 'Not chosen')}</span></div>
        </div>
        <div className="kx-actions"><button type="button" className="yr-link" onClick={() => go('details')}>Targets are set on the Target tab</button></div>
        {abstract && (
          <Pair>
            <FormField id="kx-cat" label="Abstract category"><TextField id="kx-cat" value={venue.category || ''} onChange={e => setIn('venuePlan', { category: e.target.value })} placeholder="Clinical research: cardiology" width="100%" /></FormField>
            <FormField id="kx-pres" label="Presentation preference">
              <Select id="kx-pres" options={[{ value: '', label: 'Choose' }].concat(PRESENTATION_PREFS.map(p => ({ value: p, label: p })))} value={venue.presentation || ''} onChange={e => setIn('venuePlan', { presentation: e.target.value })} width="100%" />
            </FormField>
          </Pair>
        )}
        <FormField id="kx-format" label={abstract ? 'Limits and embargo rules' : 'Format: word count, reporting guideline, open access'}>
          <TextArea id="kx-format" value={venue.format || ''} onChange={e => setIn('venuePlan', { format: e.target.value })} placeholder={abstract ? '300 words, 2,500 characters; embargo until presentation time' : '3,500 words; CONSORT; open access required by the sponsor'} width="100%" height="52px" />
        </FormField>
      </Section>

      <Section n={6} item={sec('timeline')} help="Every step after the kick-off, with its date and a named person (not a function). Dates are set on the Planning tab.">
        <div className="kx-table">
          {tl.map(r => (
            <div key={r.id} className="kx-row kx-row--tl">
              <span className="kx-cell kx-strong">{r.name}</span>
              <span className="kx-cell kx-faint">{r.end || r.start || 'No date'}</span>
              <Select options={personOpts(r.owner)} value={r.owner || ''} onChange={e => { const v = e.target.value; set(s => ({ rows: s.rows.map(x => (x.id === r.id ? { ...x, owner: v } : x)) })); }} width="100%" aria-label={'Owner of ' + r.name} />
            </div>
          ))}
        </div>
        <div className="kx-actions"><button type="button" className="yr-link" onClick={() => go('planning')}>Dates and steps are on the Planning tab</button></div>
      </Section>

      <Section n={7} item={sec('roles')} help="The medical writer and how writing support is acknowledged, the corresponding author, how authors review, and the turnaround per round.">
        <Pair>
          <FormField id="kx-writer" label="Medical writer">
            <Select id="kx-writer" options={personOpts(log.writer === NO_WRITER ? '' : log.writer, [{ value: NO_WRITER, label: NO_WRITER }])} value={log.writer || ''} onChange={e => setIn('logistics', { writer: e.target.value })} width="100%" />
          </FormField>
          <FormField id="kx-ack" label="How writing support is acknowledged">
            <TextField id="kx-ack" value={log.writingAck || ''} onChange={e => setIn('logistics', { writingAck: e.target.value })} placeholder="Medical writing support funded by the sponsor, per GPP" width="100%" disabled={log.writer === NO_WRITER} />
          </FormField>
        </Pair>
        <Pair>
          <FormField id="kx-method" label="How authors will review">
            <Select id="kx-method" options={[{ value: '', label: 'Choose' }].concat(REVIEW_METHOD_OPTIONS.map(m => ({ value: m, label: m })))} value={log.reviewMethod || ''} onChange={e => setIn('logistics', { reviewMethod: e.target.value })} width="100%" />
          </FormField>
          <FormField id="kx-turn" label="Turnaround per review round (days)">
            <TextField id="kx-turn" type="number" value={log.turnaroundDays || ''} onChange={e => setIn('logistics', { turnaroundDays: e.target.value })} placeholder="10" width="100%" />
          </FormField>
        </Pair>
        <div className="kx-table">
          <div className="kx-row kx-row--2"><span className="kx-cell kx-strong">Corresponding author</span><span className="kx-cell">{st.correspondingAuthor || 'Not chosen (Authors tab)'}</span></div>
        </div>
      </Section>

      <Section n={8} item={sec('decisions')} help="Anything unresolved (a disputed analysis, an unconfirmed author, a pending data release) gets an owner and a date. The log stays with the publication.">
        {(st.decisions || []).map(x => (
          <div key={x.id} className="kx-line kx-line--log">
            <TextField value={x.item || ''} onChange={e => listOps('decisions').patch(x.id, { item: e.target.value })} placeholder="Confirm whether the post hoc subgroup is in scope" width="100%" aria-label="Issue or decision" />
            <Select options={personOpts(x.owner)} value={x.owner || ''} onChange={e => listOps('decisions').patch(x.id, { owner: e.target.value })} width="180px" aria-label="Owner" />
            <DateField value={x.due || ''} onChange={e => listOps('decisions').patch(x.id, { due: e.target.value })} width="150px" aria-label="Due" />
            <Select options={['Open', 'Resolved'].map(v => ({ value: v, label: v }))} value={x.status || 'Open'} onChange={e => listOps('decisions').patch(x.id, { status: e.target.value })} width="110px" aria-label="Status" />
            <IconButton icon="close" tone="fatal" size={26} title="Remove" onClick={() => listOps('decisions').remove(x.id)} />
          </div>
        ))}
        {!(st.decisions || []).length && <div className="pfx-meta">Nothing logged. Add anything left open at the meeting.</div>}
        <Button variant="tertiary" icon="add" onClick={listOps('decisions').add}>Add Open Issue</Button>
      </Section>
    </Stack>
  );
}
