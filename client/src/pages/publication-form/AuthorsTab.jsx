import React, { useEffect, useState } from 'react';
import useDismiss from '../../components/useDismiss';
import { api } from '../../api';
import {
  Button, CheckboxGroup, DataTable, Field, Icon, IconButton, Pill, SearchSelect, SectionHeading,
  SegmentedToggle, Select, TextField,
} from '../../ds/pubpro';
import {
  AUTHOR_META, CREDIT_ROLES, EXTERNAL_AUTHOR_DIRECTORY,
  INTERNAL_AUTHOR_DIRECTORY, REVIEWER_DIRECTORY, TODAY, TODAY_STR,
} from './data';
import { auditEntry } from './state';

// ICMJE criteria read from the record's review rounds.
const gaveFeedback = (st, person) => (st.rounds || []).some(r => r.type !== 'Author Approval'
  && r.reviewers.some(v => v.name === person && v.decision !== 'pending'));
const gaveApproval = (st, person) => (st.rounds || []).some(r => r.type === 'Author Approval'
  && r.reviewers.some(v => v.name === person && v.decision === 'approve'));

const KV_COLS = [
  { header: 'Order', width: '52px', sortable: true },
  { header: 'Author', width: 'minmax(150px,1.6fr)', sortable: true },
  { header: 'Type', width: '92px', sortable: true },
  { header: 'Invitation', width: '130px', sortable: true },
  { header: 'Agreement', width: '120px', sortable: true },
  { header: 'COI', width: '130px', sortable: true },
  { header: 'Debarment', width: '104px', sortable: true },
  { header: 'ORCID iD', width: '176px', sortable: true },
  { header: 'CRediT Roles', width: '190px', sortable: true },
  { header: 'ICMJE', width: '110px', sortable: true },
  { header: 'Display Name', width: 'minmax(130px,1fr)', sortable: true },
  { header: '', width: '30px' },
];
const KV_SORT_KEYS = ['order', 'person', 'typeLabel', 'inviteRank', 'signedTs', 'coiTs', 'debarRank', 'orcid', 'creditCount', 'icmjeCount', 'display'];

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
const INVITED = { status: 'sent', sent: TODAY_STR };

const ROLE_OF = n => (REVIEWER_DIRECTORY.find(p => p.name === n) || {}).role || 'Internal Author';

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
  const expired = !!signed && ageDays > 365;
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

function KnowledgeAuthors({ st, set, commit, saving, userName, navigate, simulateApproval }) {
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
      const coiAge = meta.coi ? Math.round((TODAY - new Date(meta.coi)) / 86400000) : null;
      const coiLook = !meta.coi
        ? ['Not submitted', 'radio_button_unchecked', 'var(--fg-faint)']
        : coiAge > 365 ? ['Expired', 'error', 'var(--fatal-text)'] : ['Current', 'verified', 'var(--ok)'];
      const approved = gaveApproval(st, person) || (!!simulateApproval && (!a.invite || a.invite.status === 'accepted'));
      const crit = [
        { k: 'Substantive contribution', ok: meta.credit.length > 0, src: 'From CRediT roles' },
        { k: 'Drafted or revised critically', ok: gaveFeedback(st, person), src: 'From feedback given in draft review rounds' },
        { k: 'Final approval', ok: approved, src: 'From approval given at Author Approval' },
        { k: 'Accountability agreement', ok: !!m.agreementDate && !m.agreementExpired, src: 'From the signed authorship agreement' },
      ];
      const met = crit.filter(c => c.ok).length;
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
        affiliation: ext ? parts.slice(1).join('-') : ROLE_OF(a.name),
        typeLabel: ext ? 'External' : 'Internal',
        typeTone: ext ? 'outline' : 'draft',
        agreementText: m.agreementDate || 'Not sent',
        agreementGlyph: m.agreementDate ? m.agreementIcon : 'radio_button_unchecked',
        agreementColor: m.agreementDate ? m.agreementIconColor : 'var(--fg-faint)',
        isPresenting: st.presentingAuthor === person,
        isCorresponding: st.correspondingAuthor === person,
        orcid: meta.orcid,
        credit: meta.credit,
        creditCount: meta.credit.length,
        creditSummary: meta.credit.length ? meta.credit.join(', ') : 'No roles assigned',
        creditColor: meta.credit.length ? 'var(--text-body)' : 'var(--fg-faint)',
        creditOpen: st.creditOpen === person,
        coiLabel: coiLook[0], coiGlyph: coiLook[1], coiColor: coiLook[2],
        coiMeta: meta.coi ? 'Last completed ' + meta.coi : 'No disclosure on file',
        coiTs: meta.coi ? new Date(meta.coi).getTime() : 0,
        debarLabel: meta.debar,
        debarTone: meta.debar === 'Clear' ? 'on-track' : meta.debar === 'Flagged' ? 'overdue' : 'outline',
        debarRank: { Flagged: 0, 'Not checked': 1, Clear: 2 }[meta.debar],
        icmje: crit.map(c => ({
          k: c.k,
          tip: c.k + (c.ok ? ' — met. ' : ' — not yet met. ') + c.src + '.',
          glyph: c.ok ? 'check_circle' : 'radio_button_unchecked',
          color: c.ok ? 'var(--ok)' : 'var(--fg-disabled)',
        })),
        icmjeCount: met,
        inviteLabel: look[0], inviteGlyph: look[1], inviteColor: look[2], inviteMeta: look[3],
        canInvite: iv.status === 'none' || iv.status === 'declined',
        inviteRank: { none: 0, declined: 1, sent: 2, accepted: 3 }[iv.status],
        invite: iv,
      };
    });

  const kvFiltered = kvAll.filter(a => st.authorFilter === 'All' || a.typeLabel === st.authorFilter);
  const rows = sortList(kvFiltered, st.kvSort, KV_SORT_KEYS);
  const aq = st.authorQuery.trim().toLowerCase();
  const authorPool = INTERNAL_AUTHOR_DIRECTORY.filter(n => !st.internal.some(a => a.name === n))
    .map(n => ({ label: n, meta: 'Internal · ' + ROLE_OF(n), group: 'internal', name: n }))
    .concat(EXTERNAL_AUTHOR_DIRECTORY.filter(d => !st.external.some(a => a.name === d.name))
      .map(d => ({ label: d.display, meta: 'External · ' + d.name.split('-').slice(1).join('-'), group: 'external', name: d.name })))
    .filter(s => !aq || (s.label + ' ' + s.meta).toLowerCase().includes(aq));
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
  const pickAuthor = p => set(s => {
    const base = { id: Date.now(), selected: true, corr: 'optional', invite: { status: 'none' } };
    if (p.group === 'internal') {
      return { internal: s.internal.concat([{ ...base, name: p.name, display: p.name }]), authorQuery: '', authorSearchOpen: false };
    }
    const d = EXTERNAL_AUTHOR_DIRECTORY.find(x => x.name === p.name);
    return { external: s.external.concat([{ ...base, ...d }]), authorQuery: '', authorSearchOpen: false };
  });

  return (
    <div className="pf-stack14">
      <div className="pf-row-end">
        <SectionHeading>Authors</SectionHeading>
        <div className="pf-meta pf-pb5">{kvAll.filter(a => a.inviteRank === 3).length} of {kvAll.length} authors accepted</div>
        {kvAll.some(a => a.canInvite) && (
          <div className="pf-ml-auto">
            <Button variant="secondary" onClick={inviteAllPending} disabled={saving}>Invite All Pending</Button>
          </div>
        )}
      </div>

      <div className="pf-row pf-wrap pf-gap-16-26">
        <Field label="Presenting Author">
          <Select options={roleOptions} value={st.presentingAuthor} onChange={e => set({ presentingAuthor: e.target.value })} width="260px" />
        </Field>
        <Field label="Corresponding Author">
          <Select options={roleOptions} value={st.correspondingAuthor} onChange={e => set({ correspondingAuthor: e.target.value })} width="260px" />
        </Field>
      </div>

      <div className="pf-row-end">
        <div className="pf-col pf-gap5 pf-maxw100" ref={authorRef}>
          <div className="pf-label pf-mb0">Add Author</div>
          <SearchSelect
            value={st.authorQuery}
            placeholder="Search by name, role, or institution"
            suggestions={authorPool}
            open={st.authorSearchOpen}
            emptyLabel={aq ? 'No authors match “' + st.authorQuery + '”.' : 'Everyone in the directory is already an author.'}
            width="360px"
            onChange={e => set({ authorQuery: e.target.value, authorSearchOpen: true })}
            onFocus={() => set({ authorSearchOpen: true })}
            onClear={() => set({ authorQuery: '', authorSearchOpen: false })}
            onPick={pickAuthor}
            style={{ maxWidth: '100%' }}
          />
        </div>
        <div className="pf-ml-auto pf-row pf-gap12">
          <div className="pf-faint13">{kvFiltered.length + (kvFiltered.length === 1 ? ' author' : ' authors')}</div>
          <SegmentedToggle options={FILTER_OPTIONS} value={st.authorFilter} onChange={v => set({ authorFilter: v })} />
        </div>
      </div>

      <div className="pf-scroll-x">
        <div className="pf-kv-min">
          <DataTable columns={KV_COLS} headerTone="knowledge" sortBy={st.kvSort.by} sortDir={st.kvSort.dir} onSort={i => set(s => ({ kvSort: nextSort(s.kvSort, i) }))}>
            {rows.map(a => (
              <div key={a.key} className="pf-kv-row">
                <div className="pf-kv-grid">
                  <div className="pf-strong">{a.order}</div>
                  <div className="pf-min0">
                    {a.isExternal ? (
                      <a
                        href="/external-authors"
                        className="pf-strong"
                        onClick={e => { e.preventDefault(); openProfile(a.person); }}
                      >
                        {a.person}
                      </a>
                    ) : (
                      <div className="pf-strong">{a.person}</div>
                    )}
                    <div className="pf-note12 pf-mt2 pf-break">{a.affiliation}</div>
                    {a.isPresenting && <div className="pf-author-flag"><Icon name="record_voice_over" size={14} />Presenting author</div>}
                    {a.isCorresponding && <div className="pf-author-flag"><Icon name="mail" size={14} />Corresponding author</div>}
                  </div>
                  <div><Pill tone={a.typeTone}>{a.typeLabel}</Pill></div>
                  <div className="pf-min0">
                    <div className="pf-iconrow" style={{ color: a.inviteColor }}>
                      <Icon name={a.inviteGlyph} size={16} />
                      <span>{a.inviteLabel}</span>
                    </div>
                    <div className="pf-note12 pf-mt2">{a.inviteMeta}</div>
                    {a.canInvite && (
                      <div className="pf-mt6">
                        <Button variant="tertiary" onClick={() => invite(a.group, a.id, a.person)} disabled={saving}>Send Invitation</Button>
                      </div>
                    )}
                    {a.inviteRank === 2 && (
                      <div className="pf-mt6 pf-row pf-gap8">
                        <Button variant="tertiary" onClick={() => patchAuthor(a.group, a.id, { invite: { ...a.invite, status: 'accepted', on: TODAY_STR } })}>Mark Accepted</Button>
                        <Button variant="tertiary" onClick={() => patchAuthor(a.group, a.id, { invite: { ...a.invite, status: 'declined', on: TODAY_STR } })}>Mark Declined</Button>
                      </div>
                    )}
                  </div>
                  <div className="pf-min0">
                    <div className="pf-iconrow" style={{ color: a.agreementColor }}>
                      <Icon name={a.agreementGlyph} size={16} title={a.agreementTooltip || undefined} />
                      <span>{a.agreementText}</span>
                    </div>
                    {a.agreementExpired && <div className="pf-mt6"><Button variant="secondary">Request New</Button></div>}
                  </div>
                  <div className="pf-min0">
                    <div className="pf-iconrow" style={{ color: a.coiColor }}>
                      <Icon name={a.coiGlyph} size={16} />
                      <span>{a.coiLabel}</span>
                    </div>
                    <div className="pf-note12 pf-mt2">{a.coiMeta}</div>
                  </div>
                  <div><Pill tone={a.debarTone}>{a.debarLabel}</Pill></div>
                  <div className="pf-min0">
                    <TextField value={a.orcid} onChange={e => setMeta(a.person, { orcid: e.target.value })} placeholder="0000-0000-0000-0000" width="100%" />
                  </div>
                  <div className="pf-min0 pf-credit">
                    <div className="pf-credit-summary" style={{ color: a.creditColor }}>{a.creditSummary}</div>
                    <Button variant="tertiary" onClick={() => set(s => ({ creditOpen: s.creditOpen === a.person ? null : a.person }))}>
                      {a.creditOpen ? 'Done' : 'Edit'}
                    </Button>
                  </div>
                  <div className="pf-min0">
                    {a.icmjeCount === 4 ? (
                      <div title="All four ICMJE criteria met" className="pf-icmje-all"><Icon name="check_circle" size={18} />All 4 met</div>
                    ) : (
                      <>
                        <div className="pf-icmje">
                          {a.icmje.map(k => <Icon key={k.k} name={k.glyph} size={17} color={k.color} title={k.tip} />)}
                        </div>
                        <div className="pf-note12 pf-mt2">{a.icmjeCount} of 4 met</div>
                      </>
                    )}
                  </div>
                  <div className="pf-min0">
                    <TextField value={a.display} onChange={e => patchAuthor(a.group, a.id, { display: e.target.value })} width="100%" />
                  </div>
                  <div className="pf-kv-remove">
                    <IconButton icon="close" tone="fatal" size={26} title="Remove author" onClick={() => removeAuthor(a.group, a.id)} />
                  </div>
                </div>
                {a.creditOpen && (
                  <div className="pf-credit-editor">
                    <div className="pf-label pf-mb6">CRediT roles for {a.person}</div>
                    <CheckboxGroup options={CREDIT_ROLES} value={a.credit} onChange={v => setMeta(a.person, { credit: v })} columns={3} />
                  </div>
                )}
              </div>
            ))}
          </DataTable>
        </div>
      </div>
      {kvFiltered.length === 0 && (
        <div className="pf-dashed-empty">
          {kvAll.length === 0 ? 'No authors on this publication yet. Use Add Author above to add one.' : 'No ' + st.authorFilter.toLowerCase() + ' authors on this publication.'}
        </div>
      )}
    </div>
  );
}

// ---- Split Tables --------------------------------------------------------------

function SplitAuthors({ st, set, navigate }) {
  const openProfile = useProfileOpener(navigate);
  const patchAuthor = (group, id, p) => set(s => ({ [group]: s[group].map(x => (x.id === id ? { ...x, ...p } : x)) }));
  const removeAuthor = (group, id) => set(s => ({ [group]: s[group].filter(x => x.id !== id) }));
  const internalAuthors = sortList(st.internal.map(mapAuthor), st.internalSort, ['order', 'name', 'display']);
  const externalAuthors = sortList(st.external.map(mapAuthor), st.externalSort, ['order', 'name', 'display', 'signedTs']);
  const internalOptions = INTERNAL_AUTHOR_DIRECTORY.filter(n => !st.internal.some(a => a.name === n));
  const externalOptions = EXTERNAL_AUTHOR_DIRECTORY.filter(d => !st.external.some(a => a.name === d.name)).map(d => d.name);

  const addInternal = () => set(s => (s.internalAuthorPick ? {
    internal: s.internal.concat([{ id: Date.now(), name: s.internalAuthorPick, display: s.internalAuthorPick, selected: true, corr: 'optional' }]),
    internalAuthorPick: '',
  } : null));
  const addExternal = () => set(s => {
    const d = EXTERNAL_AUTHOR_DIRECTORY.find(x => x.name === s.externalAuthorPick);
    return d ? { external: s.external.concat([{ id: Date.now(), selected: true, corr: 'optional', ...d }]), externalAuthorPick: '' } : null;
  });

  return (
    <div className="pf-stack14">
      <SectionHeading>Authors</SectionHeading>

      <div className="pf-split-block">
        <SectionHeading level="subsection" style={{ marginBottom: 12 }}>Internal Authors</SectionHeading>
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
        {st.internal.length === 0 && <div className="pf-faint13 pf-italic pf-pad12">No internal authors added.</div>}
        <div className="pf-add-row">
          <Select options={internalOptions} placeholder="Select internal author" value={st.internalAuthorPick} onChange={e => set({ internalAuthorPick: e.target.value })} width="300px" />
          <Button variant="tertiary" onClick={addInternal} disabled={!st.internalAuthorPick}>Add Internal Author</Button>
        </div>
      </div>

      <div className="pf-split-block pf-mt8">
        <SectionHeading level="subsection" style={{ marginBottom: 12 }}>External Authors</SectionHeading>
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
        {st.external.length === 0 && <div className="pf-faint13 pf-italic pf-pad12">No external authors added.</div>}
        <div className="pf-add-row">
          <Select options={externalOptions} placeholder="Select external author" value={st.externalAuthorPick} onChange={e => set({ externalAuthorPick: e.target.value })} width="300px" />
          <Button variant="tertiary" onClick={addExternal} disabled={!st.externalAuthorPick}>Add External Author</Button>
        </div>
      </div>
    </div>
  );
}
