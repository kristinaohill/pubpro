import React from 'react';
import useDismiss from '../../components/useDismiss';
import { Icon, IconButton, InlineMessage, SearchSelect, TextArea } from '../../ds/pubpro';
import { CONFERENCE_DIRECTORY } from './data';
import { Card, Details, Empty, FormField, ListBox, ListRow, Stack, TabHead, Tag } from './ui';
import './tabs-b.css';

const dirEntry = n => CONFERENCE_DIRECTORY.find(c => c.name === n) || { name: n, abbr: '', kind: '', dates: '' };
const noNav = e => e.preventDefault();

// Manuscripts go to journals; abstracts, posters and presentations go to congresses.
const TARGET_KIND = { Manuscript: 'Journal', Abstract: 'Congress', Poster: 'Congress', 'Congress Presentation': 'Congress' };
const KIND_WORDS = { Journal: ['journals', 'journal'], Congress: ['congresses', 'congress'] };

export default function TargetTab({ st, set }) {
  const list = st.targets || [];
  const targetRef = useDismiss(st.targetOpen, () => set({ targetOpen: false }), () => set({ targetOpen: true }));
  const q = (st.targetQuery || '').trim().toLowerCase();
  const kind = TARGET_KIND[st.pubType] || '';
  const [plural] = KIND_WORDS[kind] || ['journals and congresses'];
  const pool = CONFERENCE_DIRECTORY.filter(c => !list.includes(c.name))
    .filter(c => !kind || c.kind === kind)
    .filter(c => !q || c.name.toLowerCase().includes(q) || (c.abbr || '').toLowerCase().includes(q));
  const p = list[0] ? dirEntry(list[0]) : null;
  const changed = CONFERENCE_DIRECTORY.find(c => c.prevClose && list.includes(c.name)) || {};

  const move = to => set(s => {
    const from = s.dragTarget;
    const a = (s.targets || []).slice();
    if (from == null || from === to) return { dragTarget: null };
    const [x] = a.splice(from, 1);
    a.splice(to, 0, x);
    return { targets: a, dragTarget: null };
  });

  const moved = 'Abstract due date moved earlier:';

  return (
    <Stack>
      <TabHead
        title="Target"
        sub={'Where this ' + (st.pubType ? st.pubType.toLowerCase() : 'publication') + ' will be submitted, in order of preference.'}
      />

      {!!changed.prevClose && (
        <InlineMessage kind="warning">
          <strong>{moved}</strong>
          {' ' + changed.prevClose + ' to ' + changed.close + ' (' + changed.abbr + '). Change detected ' + changed.closeChanged + '.'}
        </InlineMessage>
      )}

      <Card
        title="Publication target"
        meta={list.length ? '1 primary · ' + (list.length - 1) + ' alternate' + (list.length - 1 === 1 ? '' : 's') : ''}
      >
        <div className="pfx-help">Drag to reorder. The first entry is the primary target; the rest are alternates used if the primary rejects.</div>
        {list.length > 0 ? (
          <ListBox>
            {list.map((n, i) => {
              const c = dirEntry(n);
              return (
                <ListRow
                  key={n}
                  draggable
                  onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; set({ dragTarget: i }); }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); move(i); }}
                  onDragEnd={() => set({ dragTarget: null })}
                  className="pfxb-target-row"
                  style={{ background: st.dragTarget === i ? 'var(--surface-row-hover)' : 'var(--white)' }}
                >
                  <span className="pfxb-drag"><Icon name="drag_indicator" size={20} color="var(--text-meta)" title="Drag to reorder" /></span>
                  <span className="pfxb-rank">{i + 1}</span>
                  <div className="pfxb-target-main">
                    <span className="pfxb-target-name">{c.name}</span>
                    <span className="pfxb-target-meta">{c.abbr || '—'} · {c.kind || '—'} · {c.dates || ''}</span>
                  </div>
                  <Tag tone={i === 0 ? 'navy' : 'outline'}>{i === 0 ? 'Primary' : 'Alternate'}</Tag>
                  <IconButton
                    icon="close"
                    tone="fatal"
                    size={26}
                    title="Remove from shortlist"
                    onClick={() => set(s => ({ targets: (s.targets || []).filter(x => x !== n) }))}
                  />
                </ListRow>
              );
            })}
          </ListBox>
        ) : (
          <Empty>No targets on the shortlist. Use the search below to add one.</Empty>
        )}
        <div ref={targetRef}>
          <FormField label="Add to Shortlist">
            <SearchSelect
              value={st.targetQuery}
              placeholder={'Search ' + plural + ' by name or abbreviation'}
              suggestions={pool.map(c => ({ label: c.name, meta: [c.abbr, c.kind, c.dates].filter(Boolean).join(' · '), name: c.name }))}
              open={st.targetOpen}
              emptyLabel={q ? 'No ' + plural + ' match “' + st.targetQuery + '”.' : 'Every ' + (kind ? KIND_WORDS[kind][1] : 'target') + ' in the directory is already on the shortlist.'}
              width="100%"
              onChange={e => set({ targetQuery: e.target.value, targetOpen: true })}
              onFocus={() => set({ targetOpen: true })}
              onClear={() => set({ targetQuery: '', targetOpen: false })}
              onPick={sug => sug && set(s => ({ targets: (s.targets || []).concat([sug.name]), targetQuery: '', targetOpen: false }))}
              style={{ maxWidth: '100%' }}
            />
          </FormField>
        </div>
      </Card>

      {p && (
        <Card title={'Primary target' + (p.abbr ? ' · ' + p.abbr : '')}>
          <span className="pfxb-primary-name">{p.name}</span>
          {p.kind === 'Congress' && (
            <Details
              items={[
                ['Start Date', p.start],
                ['End Date', p.end],
                ['Online Open Date', p.open],
                ['Online Close Date', p.prevClose ? (
                  <>
                    {p.close}
                    <div className="pfxb-moved">Moved earlier from {p.prevClose} · detected {p.closeChanged}</div>
                  </>
                ) : p.close],
                ['Late Breaker Date', p.lateBreaker],
                ['Abbreviation', p.abbr],
                ['Venue Name', p.venue],
                ['Conference Site', <a href="#" onClick={noNav}>Link</a>],
                ['Venue City/State or Province', p.city],
                ['Venue Country', p.country],
              ]}
            />
          )}
          {p.kind === 'Journal' && (
            <Details
              items={[
                ['Abbreviation', p.abbr],
                ['Submission', p.dates],
                ['Journal Site', <a href="#" onClick={noNav}>Link</a>],
              ]}
            />
          )}
        </Card>
      )}

      <Card title="Target rationale">
        <FormField id="pfxb-rationale" label="Rationale for Target Selection">
          <TextArea id="pfxb-rationale" width="100%" height="105px" placeholder="Explain why this conference or journal is the right target for this publication." />
        </FormField>
      </Card>
    </Stack>
  );
}
