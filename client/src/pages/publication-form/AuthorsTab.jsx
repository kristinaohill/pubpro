import React, { useEffect, useState } from 'react';
import useDismiss from '../../components/useDismiss';
import usePeople, { jobTitle, oooText, personNamed, useExternalAuthors } from '../../components/usePeople';
import { api } from '../../api';
import {
  Button, CheckboxGroup, DataTable, Icon, IconButton, InlineMessage, SearchSelect,
  SegmentedToggle, Select, TextField,
} from '../../ds/pubpro';
import {
  AUTHOR_META, CREDIT_ROLES, EXTERNAL_AUTHOR_DIRECTORY,
  REVIEWER_DIRECTORY, TODAY, TODAY_STR,
} from './data';
import { auditEntry } from './state';
import { ProofField, ProofLink, uploadProof } from './proof';
import NewExternalAuthor from './NewExternalAuthor';
import { CreditEditor } from './CreditEditor';
import { contributionsOf, creditFlagsFor, icmjeCriteria, icmjeFlagsFor, summaryOf, toStored } from './credit';
import { bylineAuthors } from './state';
import { useAuth } from '../../AuthContext';
import { Card, Empty, FormField, Pair, Stack, TabHead, Tag, ON_GREY } from './ui';
import './tabs-b.css';

// ICMJE criteria read from the record's review rounds.
const gaveFeedback = (st, person) => (st.rounds || []).some(r => r.type !== 'Author Approval'
  && r.reviewers.some(v => v.name === person && v.decision !== 'pending'));
const gaveApproval = (st, person) => (st.rounds || []).some(r => r.type === 'Author Approval'
  && r.reviewers.some(v => v.name === person && v.decision === 'approve'));

// Knowledge View card order: the same sort keys the old table's columns used (st.kvSort.by indexes these).
const KV_SORT_KEYS = ['order', 'person', 'typeLabel', 'inviteRank', 'signedTs', 'coiTs', 'debarRank', 'orcid', 'creditCount', 'icmjeCount', 'display'];
const KV_SORT_OPTIONS = ['Order', 'Author', 'Type', 'Invitation', 'Agreement', 'COI', 'Debarment', 'ORCID iD', 'CRediT Roles', 'ICMJE', 'Display Name']
  .map((label, i) => ({ value: String(i), label }));

const INTERNAL_COLS = [
  { header: 'Order', width: '52px', sortable: true },
  { header: 'Author', width: 'minmax(200px,1.5fr)', sortable: true },
  { header: 'Display Name', width: 'minmax(180px,1fr)', sortable: true },
  { header: '', width: '30px' },
];
const EXTERNAL_COLS = [
  { header: 'Order', width: '52px', sortable: true },
  { header: 'Author', width: 'minmax(160px,1.6fr)', sortable: true },
  { header: 'Display Name', width: 'minmax(150px,1fr)', sortable: true },
  { header: 'Agreement Signed', width: '120px', sortable: true },
  { header: '', width: '30px' },
];

const FILTER_OPTIONS = ['All', 'Internal', 'External'];

/** A1: how an author's agreement to the ICMJE criteria stands, for the author card. */
function criteriaLook(a, iv, draftStartedAt) {
  const c = a.criteria;
  const late = !!draftStartedAt && !!c && !!c.at && c.at > draftStartedAt;
  if (c && c.at) {
    const how = c.carriedFrom ? ' (agreed on ' + c.carriedFrom + ')' : '';
    return {
      criteriaProxy: c.proof ? { by: c.by, proof: c.proof } : null,
      criteriaText: (c.how === 'recorded' ? 'Agreement recorded ' : c.how === 'backfill' ? 'Signed agreement (sample data) ' : c.signedName ? 'Signed agreement + ICMJE criteria ' : 'ICMJE criteria agreed ') + c.on + how, criteriaColor: late ? 'var(--warn-text)' : 'var(--ok)', criteriaGlyph: late ? 'history' : 'verified',
      criteriaNote: late ? 'Joined after drafting started: record why in the audit trail (A3)' : '', needsCriteria: false,
    };
  }
  if (c && !c.at) return { criteriaText: 'Recorded agreement saves with the record', criteriaColor: 'var(--fg-3)', criteriaGlyph: 'schedule', criteriaNote: '', needsCriteria: false };
  if (iv.status === 'accepted') {
    return { criteriaText: 'Hasn\u2019t signed the authorship agreement', criteriaColor: 'var(--warn-text)', criteriaGlyph: 'error', criteriaNote: '', needsCriteria: true };
  }
  return { criteriaText: 'Signs the agreement when accepting', criteriaColor: 'var(--fg-3)', criteriaGlyph: 'gavel', criteriaNote: '', needsCriteria: false };
}
const INVITED = { status: 'sent', sent: TODAY_STR };

// An internal author's job title from their user profile (older records may name people who aren't users).
// External authors come from their author profiles (System Administrator > External users). The
// sample authors keep the signed agreements the demo records show for them.
const useExternalDirectory = () => useExternalAuthors().map(p => {
  const legacy = EXTERNAL_AUTHOR_DIRECTORY.find(x => x.name === p.name);
  return legacy ? { ...p, agreement: legacy.agreement, agreementDate: legacy.agreementDate } : p;
});
const asAuthor = d => ({ name: d.name, display: d.display, ...(d.agreement ? { agreement: d.agreement, agreementDate: d.agreementDate } : {}) });

const roleOf = (staff, n) => jobTitle(personNamed(staff, n)) || (REVIEWER_DIRECTORY.find(p => p.name === n) || {}).role || 'Internal Author';

// Row tones (DS Pill names) shown as layout-kit Tags.
const TAG_TONE = { draft: 'grey', outline: 'outline', 'on-track': 'green', overdue: 'red' };

const sortList = (list, sort, keys) => {
  const k = keys[sort.by];
  if (!k) return list;
  const m = sort.dir === 'desc' ? -1 : 1;
  return list.slice().sort((x, y) => {
    const a = x[k], b = y[k];
    return (typeof a === 'number' ? a - b : String(a).localeCompare(String(b))) * m;
  });
};
const nextSort = (cur, i) => ({ by: i, dir: cur.by === i && cur.dir === 'asc' ? 'desc' : 'asc' });

/** Shared per-author fields (order, agreement age) for both layouts. */
function mapAuthor(a, i) {
  const signed = a.agreementDate ? new Date(a.agreementDate) : null;
  const ageDays = signed ? Math.round((TODAY - signed) / 86400000) : 0;
  // An agreement signed for this publication (from the invitation) doesn't expire; only an older,
  // general agreement on file does.
  const expired = !!signed && !(a.criteria && a.criteria.at) && ageDays > 365;
  return {
    id: a.id,
    order: i + 1,
    signedTs: signed ? signed.getTime() : 0,
    name: a.name,
    display: a.display,
    agreement: a.agreement,
    agreementDate: a.agreementDate || '',
    agreementExpired: expired,
    agreementIcon: expired ? 'error' : 'verified',
    agreementIconColor: expired ? 'var(--fatal-text)' : 'var(--ok)',
    agreementTooltip: expired ? `Author agreement expired — signed ${ageDays} days ago (limit 365).` : '',
  };
}

export default function AuthorsTab(props) {
  return props.layout === 'Split Tables' ? <SplitAuthors {...props} /> : <KnowledgeAuthors {...props} />;
}

// ---- Knowledge View ------------------------------------------------------------

/** Opens an external author's saved profile, or starts a new one prefilled with their name. */
function useProfileOpener(navigate) {
  const [authors, setAuthors] = useState([]);
  useEffect(() => { api.get('/pp-authors').then(setAuthors).catch(() => setAuthors([])); }, []);
  return person => {
    const name = String(person || '').trim();
    const match = authors.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (match) navigate('/external-author/' + match.id);
    else navigate('/external-author/new', { state: { name } });
  };
}

function KnowledgeAuthors({ st, set, commit, saving, userName, navigate, simulateApproval, record, recordId }) {
  const recordIdLabel = (record && record.record_id) || recordId || 'a new publication';
  // The byline, for CRediT flags that compare authors (more than one lead on a role).
  const bylinePeople = bylineAuthors(st).map(x => x.person);
  // Recording an author's acceptance for them: { key, file, note, busy, error } (needs proof).
  const [proxy, setProxy] = useState(null);
  // Adding someone who isn't in PubPro yet (Publication Managers can create external author profiles).
  const { can } = useAuth();
  const canAddNew = can('authors.edit');
  const [adding, setAdding] = useState(null); // the search text they started from
  const staff = usePeople();
  const externals = useExternalDirectory();
  const openProfile = useProfileOpener(navigate);
  const authorRef = useDismiss(st.authorSearchOpen, () => set({ authorSearchOpen: false }), () => set({ authorSearchOpen: true }));
  const patchAuthor = (group, id, p) => set(s => ({ [group]: s[group].map(x => (x.id === id ? { ...x, ...p } : x)) }));
  const removeAuthor = (group, id) => set(s => ({ [group]: s[group].filter(x => x.id !== id) }));
  const setMeta = (person, p) => set(s => ({
    authorMetaEdits: { ...s.authorMetaEdits, [person]: { ...(s.authorMetaEdits[person] || {}), ...p } },
  }));

  const kvAll = st.internal.map(a => ({ group: 'internal', ...a }))
    .concat(st.external.map(a => ({ group: 'external', ...a })))
    .map((a, i) => {
      const ext = a.group === 'external';
      const parts = a.name.split('-');
      const person = ext ? parts[0] : a.name;
      const m = mapAuthor(a, i);
      const meta = { orcid: '', credit: [], coi: '', debar: 'Not checked', ...(AUTHOR_META[person] || {}), ...(st.authorMetaEdits[person] || {}) };
      // CRediT roles with their extent (credit.js); older records stored role names only.
      const contrib = contributionsOf(st, person);
      const coiAge = meta.coi ? Math.round((TODAY - new Date(meta.coi)) / 86400000) : null;
      const coiLook = !meta.coi
        ? ['Not submitted', 'radio_button_unchecked', 'var(--fg-faint)']
        : coiAge > 365 ? ['Expired', 'error', 'var(--fatal-text)'] : ['Current', 'verified', 'var(--ok)'];
      const approved = gaveApproval(st, person) || (!!simulateApproval && (!a.invite || a.invite.status === 'accepted'));
      // ICMJE criteria from the evidence: CRediT roles, the review record, final approval and the
      // signed agreement (credit.js). The design's simulated approval still counts for criterion 3.
      const crit = icmjeCriteria(st, person, a).map(c => (c.n === 3 && c.status !== 'met' && approved ? { ...c, status: 'met', src: 'Approved at Author Approval' } : c));
      const met = crit.filter(c => c.status === 'met').length;
      const iv = a.invite || { status: 'none' };
      const look = {
        accepted: ['Accepted', 'check_circle', 'var(--ok)', 'Accepted ' + iv.on],
        sent: ['Invited', 'schedule_send', 'var(--fg-3)', 'Sent ' + iv.sent + ' · awaiting reply'],
        declined: ['Declined', 'cancel', 'var(--fatal-text)', 'Declined ' + iv.on],
        none: ['Not invited', 'mail', 'var(--warn-text)', 'Invitation not sent'],
      }[iv.status];
      return {
        ...m,
        key: a.group + '-' + a.id,
        group: a.group,
        isExternal: ext,
        person,
        affiliation: ext ? parts.slice(1).join('-') : roleOf(staff, a.name),
        typeLabel: ext ? 'External' : 'Internal',
        typeTone: ext ? 'outline' : 'draft',
        agreementText: m.agreementDate || 'Not sent',
        agreementGlyph: m.agreementDate ? m.agreementIcon : 'radio_button_unchecked',
        agreementColor: m.agreementDate ? m.agreementIconColor : 'var(--fg-faint)',
        isPresenting: st.presentingAuthor === person,
        isCorresponding: st.correspondingAuthor === person,
        orcid: meta.orcid,
        credit: contrib,
        creditCount: contrib.length,
        creditSummary: contrib.length ? summaryOf(contrib) : 'No roles assigned',
        creditColor: contrib.length ? 'var(--text-body)' : 'var(--fg-faint)',
        creditOpen: st.creditOpen === person,
        coiLabel: coiLook[0], coiGlyph: coiLook[1], coiColor: coiLook[2],
        coiMeta: meta.coi ? 'Last completed ' + meta.coi : 'No disclosure on file',
        coiTs: meta.coi ? new Date(meta.coi).getTime() : 0,
        debarLabel: meta.debar,
        debarTone: meta.debar === 'Clear' ? 'on-track' : meta.debar === 'Flagged' ? 'overdue' : 'outline',
        debarRank: { Flagged: 0, 'Not checked': 1, Clear: 2 }[meta.debar],
        icmje: crit.map(c => ({
          k: c.k,
          tip: c.n + '. ' + c.k + (c.status === 'met' ? ': met. ' : c.status === 'planned' ? ': planned. ' : ': not yet met. ') + c.src + '.',
          glyph: c.status === 'met' ? 'check_circle' : c.status === 'planned' ? 'schedule' : 'radio_button_unchecked',
          color: c.status === 'met' ? 'var(--ok)' : c.status === 'planned' ? 'var(--warn-text)' : 'var(--fg-disabled)',
        })),
        icmjeFlags: icmjeFlagsFor(st, person),
        icmjeCount: met,
        inviteLabel: look[0], inviteGlyph: look[1], inviteColor: look[2], inviteMeta: look[3],
        canInvite: iv.status === 'none' || iv.status === 'declined',
        inviteRank: { none: 0, declined: 1, sent: 2, accepted: 3 }[iv.status],
        invite: iv,
        // A1: agreement to the ICMJE criteria (stamped by the server when they accept).
        ...criteriaLook(a, iv, st.draftStartedAt),
      };
    });

  const kvFiltered = kvAll.filter(a => st.authorFilter === 'All' || a.typeLabel === st.authorFilter);
  const rows = sortList(kvFiltered, st.kvSort, KV_SORT_KEYS);
  const aq = st.authorQuery.trim().toLowerCase();
  const authorPool = staff.filter(p => !st.internal.some(a => a.name === p.name))
    .map(p => ({ label: p.name, meta: 'Internal · ' + roleOf(staff, p.name) + (p.oooNow ? ' · ' + oooText(p).split(':')[0] : ''), group: 'internal', name: p.name }))
    .concat(externals.filter(d => !st.external.some(a => a.name === d.name))
      .map(d => ({ label: d.display, meta: 'External · ' + d.name.split('-').slice(1).join('-'), group: 'external', name: d.name })))
    .filter(s => !aq || (s.label + ' ' + s.meta).toLowerCase().includes(aq))
    .concat(aq && canAddNew ? [{ label: 'Add \u201c' + st.authorQuery.trim() + '\u201d as a new external author', meta: 'Not in PubPro yet? Create their profile', group: 'new' }] : []);
  const roleOptions = st.internal.map(a => a.name).concat(st.external.map(a => a.name.split('-')[0]));
  // Invitations save the record and reach the author in PubPro (no email).
  const uninvited = a => !a.invite || a.invite.status === 'none';
  const inviteNotices = people => rec => people.map(name => ({
    recipient: name, kind: 'invitation', tab: 'authors',
    title: 'Authorship invitation',
    body: `You're invited to be an author on ${rec.title} (${rec.record_id}). Reply in PubPro.`,
  }));
  const inviteLog = (s, people) => (s.audit || []).concat([auditEntry('Author Invitation Sent', {
    participants: people.join('\n'), comment: 'Sent by ' + userName,
  })]);
  const invite = (group, id, person) => commit(s => ({
    [group]: s[group].map(x => (x.id === id ? { ...x, invite: INVITED } : x)),
    audit: inviteLog(s, [person]),
  }), { done: 'Invitation sent to ' + person + '.', notices: inviteNotices([person]) });
  const inviteAllPending = () => {
    const people = st.internal.filter(uninvited).map(a => a.name)
      .concat(st.external.filter(uninvited).map(a => a.name.split('-')[0]));
    if (!people.length) return;
    commit(s => ({
      internal: s.internal.map(a => (uninvited(a) ? { ...a, invite: INVITED } : a)),
      external: s.external.map(a => (uninvited(a) ? { ...a, invite: INVITED } : a)),
      audit: inviteLog(s, people),
    }), { done: people.length + (people.length === 1 ? ' invitation' : ' invitations') + ' sent.', notices: inviteNotices(people) });
  };
  // Recording an author's acceptance and criteria agreement for them needs their written confirmation.
  const recordAcceptance = async a => {
    setProxy(p => ({ ...p, busy: true, error: '' }));
    try {
      const proof = await uploadProof(record.id, proxy.file, 'criteria', a.person);
      const note = proxy.note.trim();
      const saved = await commit(s => ({
        [a.group]: s[a.group].map(x => (x.id === a.id ? {
          ...x,
          invite: { ...(x.invite || {}), status: 'accepted', on: x.invite && x.invite.status === 'accepted' ? x.invite.on : TODAY_STR },
          criteria: { on: TODAY_STR, by: userName, how: 'recorded', proof: { id: proof.id, name: proof.name }, note },
          agreement: proof.name, agreementDate: TODAY_STR,
        } : x)),
        audit: (s.audit || []).concat([auditEntry('Authorship Accepted (recorded)', {
          participants: a.person, result: 'Accepted',
          comment: ['Agreed to the four ICMJE criteria · recorded by ' + userName, 'proof: ' + proof.name, note].filter(Boolean).join(' · '),
        })]),
      }), { done: 'Recorded ' + a.person + '\u2019s acceptance, with proof.' });
      setProxy(saved ? null : p => ({ ...p, busy: false }));
    } catch (err) {
      setProxy(p => ({ ...p, busy: false, error: err.message }));
    }
  };
  // Authors who accepted before PubPro recorded criteria agreement confirm it themselves (A1).
  const askCriteria = person => commit(s => ({
    audit: (s.audit || []).concat([auditEntry('Authorship Agreement Requested', { participants: person, comment: 'Requested by ' + userName })]),
  }), {
    done: 'Asked ' + person + ' to sign the authorship agreement.',
    notices: rec => [{
      recipient: person, kind: 'invitation', tab: 'authors', title: 'Sign the authorship agreement',
      body: `Please attest to the ICMJE authorship criteria and sign the authorship agreement for ${rec.title} (${rec.record_id}).`,
    }],
  });
  // A new external author (or an existing one found while adding) goes on the byline and saves.
  const addExternal = (entry, isNew) => {
    setAdding(null);
    if (st.external.some(a => a.name === entry.name || (entry.profileId && a.profileId === entry.profileId))) return;
    commit(s => ({
      authorQuery: '', authorSearchOpen: false,
      external: s.external.concat([{ id: Date.now(), selected: true, corr: 'optional', invite: { status: 'none' }, name: entry.name, display: entry.display, profileId: entry.profileId }]),
      audit: (s.audit || []).concat([auditEntry(isNew ? 'External Author Created and Added' : 'External Author Added', {
        participants: entry.display, comment: (isNew ? 'New profile created by ' : 'Added by ') + userName + (entry.institution ? ' · ' + entry.institution : ''),
      })]),
    }), { done: (isNew ? 'Created ' + entry.display + '\u2019s profile and added them. ' : 'Added ' + entry.display + '. ') + 'Send the invitation when you\u2019re ready.' });
  };
  const pickAuthor = p => (p.group === 'new' ? (setAdding(st.authorQuery), set({ authorSearchOpen: false })) : set(s => {
    const base = { id: Date.now(), selected: true, corr: 'optional', invite: { status: 'none' } };
    if (p.group === 'internal') {
      return { internal: s.internal.concat([{ ...base, name: p.name, display: p.name }]), authorQuery: '', authorSearchOpen: false };
    }
    const d = externals.find(x => x.name === p.name);
    return d ? { external: s.external.concat([{ ...base, ...asAuthor(d), profileId: d.profileId }]), authorQuery: '', authorSearchOpen: false } : null;
  }));

  const accepted = kvAll.filter(a => a.inviteRank === 3).length;

  return (
    <Stack>
      <TabHead
        title="Authors"
        sub={accepted + ' of ' + kvAll.length + ' authors accepted'}
        actions={kvAll.some(a => a.canInvite) && (
          <Button variant="secondary" style={ON_GREY} onClick={inviteAllPending} disabled={saving}>Invite All Pending</Button>
        )}
      />

      <Card title="Roles">
        <Pair>
          <FormField id="pfxb-presenting" label="Presenting Author">
            <Select id="pfxb-presenting" options={roleOptions} value={st.presentingAuthor} onChange={e => set({ presentingAuthor: e.target.value })} width="100%" />
          </FormField>
          <FormField id="pfxb-corresponding" label="Corresponding Author">
            <Select id="pfxb-corresponding" options={roleOptions} value={st.correspondingAuthor} onChange={e => set({ correspondingAuthor: e.target.value })} width="100%" />
          </FormField>
        </Pair>
      </Card>

      <Card title="Authors" meta={kvFiltered.length + (kvFiltered.length === 1 ? ' author' : ' authors')}>
        <div className="pfxb-addbar">
          <div className="pfxb-addbar-search" ref={authorRef}>
            <FormField label="Add Author">
              <div className="nea-searchrow">
                <SearchSelect
                  value={st.authorQuery}
                  placeholder="Search by name, role, or institution"
                  suggestions={authorPool}
                  open={st.authorSearchOpen}
                  emptyLabel={aq ? 'No authors match “' + st.authorQuery + '”.' : 'Everyone in the directory is already an author.'}
                  width="100%"
                  onChange={e => set({ authorQuery: e.target.value, authorSearchOpen: true })}
                  onFocus={() => set({ authorSearchOpen: true })}
                  onClear={() => set({ authorQuery: '', authorSearchOpen: false })}
                  onPick={pickAuthor}
                  style={{ maxWidth: '100%', flex: 1 }}
                />
                {/* Only once they've searched: look for the person first, add a new one second. */}
                {canAddNew && !adding && aq && (
                  <Button variant="secondary" icon="person_add" onClick={() => { setAdding(st.authorQuery.trim()); set({ authorSearchOpen: false }); }}>Add New Author</Button>
                )}
              </div>
            </FormField>
          </div>
          <SegmentedToggle options={FILTER_OPTIONS} value={st.authorFilter} onChange={v => set({ authorFilter: v })} />
        </div>

        {adding != null && (
          <NewExternalAuthor query={adding} recordId={recordIdLabel} userName={userName} onAdd={addExternal} onCancel={() => setAdding(null)} />
        )}

        {rows.length > 1 && (
          <div className="pfxb-sortbar">
            <label htmlFor="pfxb-sort" className="pfx-label">Sort by</label>
            <Select id="pfxb-sort" options={KV_SORT_OPTIONS} value={String(st.kvSort.by)} onChange={e => set(s => ({ kvSort: { ...s.kvSort, by: Number(e.target.value) } }))} width="180px" />
            <Button
              variant="secondary"
              icon={st.kvSort.dir === 'desc' ? 'arrow_downward' : 'arrow_upward'}
              onClick={() => set(s => ({ kvSort: { ...s.kvSort, dir: s.kvSort.dir === 'desc' ? 'asc' : 'desc' } }))}
            >
              {st.kvSort.dir === 'desc' ? 'Descending' : 'Ascending'}
            </Button>
          </div>
        )}

        {rows.length > 0 && (
          <div className="pfxb-authors">
            {rows.map(a => (
              <article key={a.key} className="pfxb-author">
                <div className="pfxb-author-top">
                  <span className="pfxb-order" aria-label={'Author order ' + a.order}>{a.order}</span>
                  <div className="pfxb-author-id">
                    <div className="pfxb-author-line">
                      {a.isExternal ? (
                        <a
                          href="/external-authors"
                          className="pfxb-author-name"
                          onClick={e => { e.preventDefault(); openProfile(a.person); }}
                        >
                          {a.person}
                        </a>
                      ) : (
                        <span className="pfxb-author-name">{a.person}</span>
                      )}
                      <Tag tone={TAG_TONE[a.typeTone] || 'grey'}>{a.typeLabel}</Tag>
                    </div>
                    <span className="pfxb-affil">{a.affiliation}</span>
                    {(a.isPresenting || a.isCorresponding) && (
                      <div className="pfxb-flags">
                        {a.isPresenting && <span className="pfxb-flag"><Icon name="record_voice_over" size={14} />Presenting author</span>}
                        {a.isCorresponding && <span className="pfxb-flag"><Icon name="mail" size={14} />Corresponding author</span>}
                      </div>
                    )}
                  </div>
                  <div className="pfxb-invite">
                    <span className="pfxb-invite-label" style={{ color: a.inviteColor }}>
                      <Icon name={a.inviteGlyph} size={16} />
                      {a.inviteLabel}
                    </span>
                    <span className="pfxb-invite-meta">{a.inviteMeta}</span>
                    <span className="pfxb-invite-meta pfxb-criteria" style={{ color: a.criteriaColor }}>
                      <Icon name={a.criteriaGlyph} size={14} />{a.criteriaText}
                    </span>
                    {a.criteriaNote && <span className="pfxb-invite-meta" style={{ color: 'var(--warn-text)' }}>{a.criteriaNote}</span>}
                    {a.criteriaProxy && record && <ProofLink pubId={record.id} proxy={a.criteriaProxy} />}
                  </div>
                  <div className="pfxb-remove">
                    <IconButton icon="close" tone="fatal" size={26} title="Remove author" onClick={() => removeAuthor(a.group, a.id)} />
                  </div>
                </div>

                {(a.canInvite || a.inviteRank === 2 || a.needsCriteria) && (
                  <div className="pfxb-author-actions">
                    {a.canInvite && (
                      <Button variant="tertiary" onClick={() => invite(a.group, a.id, a.person)} disabled={saving}>Send Invitation</Button>
                    )}
                    {a.inviteRank === 2 && (
                      <>
                        <Button variant="tertiary" onClick={() => setProxy({ key: a.key, file: null, note: '' })} disabled={!record}>Mark Accepted</Button>
                        <Button variant="tertiary" onClick={() => patchAuthor(a.group, a.id, { invite: { ...a.invite, status: 'declined', on: TODAY_STR } })}>Mark Declined</Button>
                      </>
                    )}
                    {a.needsCriteria && (
                      <>
                        <Button variant="tertiary" onClick={() => askCriteria(a.person)} disabled={saving}>Ask to Sign Agreement</Button>
                        <Button variant="tertiary" onClick={() => setProxy({ key: a.key, file: null, note: '' })} disabled={!record}>Record With Proof</Button>
                      </>
                    )}
                  </div>
                )}
                {proxy && proxy.key === a.key && (
                  <div className="pf-proxy-panel">
                    <div className="pfx-help">
                      Recording {a.person}&rsquo;s acceptance for them. Upload their written confirmation that they accept authorship,
                      agree to the four ICMJE authorship criteria and accept the authorship agreement, such as their reply by email.
                    </div>
                    <ProofField id={'pf-proof-' + a.key} file={proxy.file} onFile={f => setProxy(p => ({ ...p, file: f, error: '' }))} />
                    <FormField id={'pf-proof-note-' + a.key} label="Note">
                      <TextField id={'pf-proof-note-' + a.key} value={proxy.note} onChange={e => setProxy(p => ({ ...p, note: e.target.value }))} placeholder="e.g. The invitation link didn’t work; confirmed by email" width="100%" />
                    </FormField>
                    {proxy.error && <InlineMessage kind="error">{proxy.error}</InlineMessage>}
                    <div className="pf-proxy-actions">
                      <Button variant="tertiary" onClick={() => setProxy(null)} disabled={proxy.busy}>Cancel</Button>
                      <Button variant="primary" icon="check" onClick={() => recordAcceptance(a)} disabled={!proxy.file || proxy.busy}>{proxy.busy ? 'Saving…' : 'Record Acceptance'}</Button>
                    </div>
                  </div>
                )}

                <div className="pfxb-tiles">
                  <div className="pfxb-tile">
                    <span className="pfxb-tile-label">Agreement</span>
                    <span className="pfxb-tile-value" style={{ color: a.agreementColor }}>
                      <Icon name={a.agreementGlyph} size={16} title={a.agreementTooltip || undefined} />
                      <span>{a.agreementText}</span>
                    </span>
                    {a.agreementExpired && <div className="pfxb-tile-action"><Button variant="secondary">Request New</Button></div>}
                  </div>
                  <div className="pfxb-tile">
                    <span className="pfxb-tile-label">COI</span>
                    <span className="pfxb-tile-value" style={{ color: a.coiColor }}>
                      <Icon name={a.coiGlyph} size={16} />
                      <span>{a.coiLabel}</span>
                    </span>
                    <span className="pfxb-tile-meta">{a.coiMeta}</span>
                  </div>
                  <div className="pfxb-tile">
                    <span className="pfxb-tile-label">Debarment</span>
                    <Tag tone={TAG_TONE[a.debarTone] || 'outline'}>{a.debarLabel}</Tag>
                  </div>
                  <div className="pfxb-tile">
                    <span className="pfxb-tile-label">ICMJE</span>
                    {a.icmjeCount === 4 ? (
                      <span title="All four ICMJE criteria met" className="pfxb-icmje-all"><Icon name="check_circle" size={18} />All 4 met</span>
                    ) : (
                      <>
                        <span className="pfxb-icmje">
                          {a.icmje.map(k => <Icon key={k.k} name={k.glyph} size={17} color={k.color} title={k.tip} />)}
                        </span>
                        <span className="pfxb-tile-meta">{a.icmjeCount} of 4 met</span>
                      </>
                    )}
                  </div>
                </div>

                <Pair>
                  <FormField id={'pfxb-orcid-' + a.key} label="ORCID iD">
                    <TextField id={'pfxb-orcid-' + a.key} value={a.orcid} onChange={e => setMeta(a.person, { orcid: e.target.value })} placeholder="0000-0000-0000-0000" width="100%" />
                  </FormField>
                  <FormField id={'pfxb-display-' + a.key} label="Display Name">
                    <TextField id={'pfxb-display-' + a.key} value={a.display} onChange={e => patchAuthor(a.group, a.id, { display: e.target.value })} width="100%" />
                  </FormField>
                </Pair>

                <div className="pfxb-credit-editor">
                  <div className="pfx-label">CRediT roles</div>
                  <CreditEditor person={a.person} list={a.credit} onChange={list => setMeta(a.person, { credit: toStored(list) })} flags={creditFlagsFor(st, bylinePeople, a.person).concat(a.icmjeFlags)} />
                </div>
              </article>
            ))}
          </div>
        )}
        {kvFiltered.length === 0 && (
          <Empty>
            {kvAll.length === 0 ? 'No authors on this publication yet. Use Add Author above to add one.' : 'No ' + st.authorFilter.toLowerCase() + ' authors on this publication.'}
          </Empty>
        )}
      </Card>
    </Stack>
  );
}

// ---- Split Tables --------------------------------------------------------------

function SplitAuthors({ st, set, navigate }) {
  const staff = usePeople();
  const externals = useExternalDirectory();
  const openProfile = useProfileOpener(navigate);
  const patchAuthor = (group, id, p) => set(s => ({ [group]: s[group].map(x => (x.id === id ? { ...x, ...p } : x)) }));
  const removeAuthor = (group, id) => set(s => ({ [group]: s[group].filter(x => x.id !== id) }));
  const internalAuthors = sortList(st.internal.map(mapAuthor), st.internalSort, ['order', 'name', 'display']);
  const externalAuthors = sortList(st.external.map(mapAuthor), st.externalSort, ['order', 'name', 'display', 'signedTs']);
  const internalOptions = staff.map(p => p.name).filter(n => !st.internal.some(a => a.name === n));
  const externalOptions = externals.filter(d => !st.external.some(a => a.name === d.name)).map(d => d.name);

  const addInternal = () => set(s => (s.internalAuthorPick ? {
    internal: s.internal.concat([{ id: Date.now(), name: s.internalAuthorPick, display: s.internalAuthorPick, selected: true, corr: 'optional' }]),
    internalAuthorPick: '',
  } : null));
  const addExternal = () => set(s => {
    const d = externals.find(x => x.name === s.externalAuthorPick);
    return d ? { external: s.external.concat([{ id: Date.now(), selected: true, corr: 'optional', ...asAuthor(d) }]), externalAuthorPick: '' } : null;
  });

  return (
    <Stack>
      <TabHead title="Authors" />

      <Card title="Internal Authors">
        <div className="pf-scroll-x">
          <DataTable columns={INTERNAL_COLS} sortBy={st.internalSort.by} sortDir={st.internalSort.dir} onSort={i => set(s => ({ internalSort: nextSort(s.internalSort, i) }))}>
            {internalAuthors.map(a => (
              <div key={a.id} className="pf-split-row pf-split-row--internal">
                <div className="pf-strong">{a.order}</div>
                <div className="pf-min0">{a.name}</div>
                <div className="pf-min0"><TextField value={a.display} onChange={e => patchAuthor('internal', a.id, { display: e.target.value })} width="100%" /></div>
                <div className="pf-justify-end"><IconButton icon="close" tone="fatal" size={26} title="Remove internal author" onClick={() => removeAuthor('internal', a.id)} /></div>
              </div>
            ))}
          </DataTable>
        </div>
        {st.internal.length === 0 && <div className="pfxb-split-empty">No internal authors added.</div>}
        <div className="pfxb-split-add">
          <Select options={internalOptions} placeholder="Select internal author" value={st.internalAuthorPick} onChange={e => set({ internalAuthorPick: e.target.value })} width="300px" style={{ maxWidth: '100%' }} />
          <Button variant="tertiary" onClick={addInternal} disabled={!st.internalAuthorPick}>Add Internal Author</Button>
        </div>
      </Card>

      <Card title="External Authors">
        <div className="pf-scroll-x">
          <DataTable columns={EXTERNAL_COLS} sortBy={st.externalSort.by} sortDir={st.externalSort.dir} onSort={i => set(s => ({ externalSort: nextSort(s.externalSort, i) }))}>
            {externalAuthors.map(a => (
              <div key={a.id} className="pf-split-row pf-split-row--external">
                <div className="pf-strong">{a.order}</div>
                <div className="pf-min0">
                  <div>{a.name}</div>
                  <div className="pf-split-agreement">
                    <Icon name={a.agreementIcon} size={14} color={a.agreementIconColor} title={a.agreementTooltip || undefined} />
                    <span className="pf-min0 pf-break">{a.agreement}</span>
                    <Button variant="secondary" onClick={() => openProfile(String(a.name).split('-')[0])}>View Profile</Button>
                    {a.agreementExpired && <Button variant="secondary">Request New Agreement</Button>}
                  </div>
                </div>
                <div className="pf-min0"><TextField value={a.display} onChange={e => patchAuthor('external', a.id, { display: e.target.value })} width="100%" /></div>
                <div style={{ color: a.agreementIconColor }}>{a.agreementDate}</div>
                <div className="pf-justify-end"><IconButton icon="close" tone="fatal" size={26} title="Remove external author" onClick={() => removeAuthor('external', a.id)} /></div>
              </div>
            ))}
          </DataTable>
        </div>
        {st.external.length === 0 && <div className="pfxb-split-empty">No external authors added.</div>}
        <div className="pfxb-split-add">
          <Select options={externalOptions} placeholder="Select external author" value={st.externalAuthorPick} onChange={e => set({ externalAuthorPick: e.target.value })} width="300px" style={{ maxWidth: '100%' }} />
          <Button variant="tertiary" onClick={addExternal} disabled={!st.externalAuthorPick}>Add External Author</Button>
        </div>
      </Card>
    </Stack>
  );
}
