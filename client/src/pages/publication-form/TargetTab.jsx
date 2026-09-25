import React from 'react';
import useDismiss from '../../components/useDismiss';
import { EyebrowLabel, Field, Icon, IconButton, InlineMessage, Pill, SearchSelect, SectionHeading, TextArea } from '../../ds/pubpro';
import { CONFERENCE_DIRECTORY } from './data';
import { DetailItem } from './shared';

const dirEntry = n => CONFERENCE_DIRECTORY.find(c => c.name === n) || { name: n, abbr: '', kind: '', dates: '' };
const noNav = e => e.preventDefault();

export default function TargetTab({ st, set }) {
  const list = st.targets || [];
  const targetRef = useDismiss(st.targetOpen, () => set({ targetOpen: false }));
  const q = (st.targetQuery || '').trim().toLowerCase();
  const pool = CONFERENCE_DIRECTORY.filter(c => !list.includes(c.name))
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

  return (
    <div>
      <SectionHeading style={{ marginBottom: 14 }}>Target</SectionHeading>
      <div className="pf-stack14 pf-pl22">
        {!!changed.prevClose && (
          <div className="pf-maxw900">
            <InlineMessage kind="warning">
              {'Abstract due date moved earlier: ' + changed.prevClose + ' to ' + changed.close + ' (' + changed.abbr + '). Change detected ' + changed.closeChanged + '.'}
            </InlineMessage>
          </div>
        )}

        <div className="pf-maxw900">
          <div className="pf-row-end pf-mb8">
            <SectionHeading level="subsection">Publication Target</SectionHeading>
            <div className="pf-faint13 pf-pb2">
              {list.length ? '1 primary · ' + (list.length - 1) + ' alternate' + (list.length - 1 === 1 ? '' : 's') : ''}
            </div>
          </div>
          <div className="pf-meta pf-mb10">Drag to reorder. The first entry is the primary target; the rest are alternates used if the primary rejects.</div>
          <div className="pf-shortlist">
            {list.map((n, i) => {
              const c = dirEntry(n);
              return (
                <div
                  key={n}
                  draggable
                  onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; set({ dragTarget: i }); }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); move(i); }}
                  onDragEnd={() => set({ dragTarget: null })}
                  className="pf-shortlist-row"
                  style={{ background: st.dragTarget === i ? 'var(--surface-row-hover)' : 'var(--white)' }}
                >
                  <Icon name="drag_indicator" size={20} color="var(--text-meta)" title="Drag to reorder" />
                  <div className="pf-shortlist-rank">{i + 1}</div>
                  <div className="pf-min0">
                    <div className="pf-strong14">{c.name}</div>
                    <div className="pf-note12 pf-mt2">{c.abbr || '—'} · {c.kind || '—'} · {c.dates || ''}</div>
                  </div>
                  <Pill tone={i === 0 ? 'nav' : 'outline'}>{i === 0 ? 'Primary' : 'Alternate'}</Pill>
                  <IconButton
                    icon="close"
                    tone="fatal"
                    size={26}
                    title="Remove from shortlist"
                    onClick={() => set(s => ({ targets: (s.targets || []).filter(x => x !== n) }))}
                  />
                </div>
              );
            })}
            {list.length === 0 && (
              <div className="pf-faint13 pf-italic pf-pad16">No targets on the shortlist. Use the search below to add one.</div>
            )}
          </div>
          <div ref={targetRef} style={{ display: 'contents' }}>
          <Field label="Add to Shortlist" style={{ marginTop: 12 }}>
            <SearchSelect
              value={st.targetQuery}
              placeholder="Search journals and congresses by name or abbreviation"
              suggestions={pool.map(c => ({ label: c.name, meta: [c.abbr, c.kind, c.dates].filter(Boolean).join(' · '), name: c.name }))}
              open={st.targetOpen}
              emptyLabel={q ? 'No journals or congresses match “' + st.targetQuery + '”.' : 'Every target in the directory is already on the shortlist.'}
              width="460px"
              onChange={e => set({ targetQuery: e.target.value, targetOpen: true })}
              onFocus={() => set({ targetOpen: true })}
              onClear={() => set({ targetQuery: '', targetOpen: false })}
              onPick={sug => sug && set(s => ({ targets: (s.targets || []).concat([sug.name]), targetQuery: '', targetOpen: false }))}
              style={{ maxWidth: '100%' }}
            />
          </Field>
          </div>
        </div>

        {p && (
          <div className="pf-card pf-maxw900">
            <div className="pf-card-head">
              <EyebrowLabel>Primary Target</EyebrowLabel>
              <div className="pf-card-title">{p.name}</div>
            </div>
            {p.kind === 'Congress' && (
              <div className="pf-detail-grid">
                <DetailItem label="Start Date">{p.start}</DetailItem>
                <DetailItem label="End Date">{p.end}</DetailItem>
                <DetailItem label="Abbreviation">{p.abbr}</DetailItem>
                <DetailItem label="Conference Site"><a href="#" onClick={noNav}>Link</a></DetailItem>
                <DetailItem label="Online Open Date">{p.open}</DetailItem>
                <DetailItem label="Online Close Date">
                  {p.close}
                  {!!p.prevClose && <div className="pf-warn12">Moved earlier from {p.prevClose} · detected {p.closeChanged}</div>}
                </DetailItem>
                <DetailItem label="Late Breaker Date">{p.lateBreaker}</DetailItem>
                <DetailItem label="Venue Name">{p.venue}</DetailItem>
                <DetailItem label="Venue City/State or Province">{p.city}</DetailItem>
                <DetailItem label="Venue Country">{p.country}</DetailItem>
              </div>
            )}
            {p.kind === 'Journal' && (
              <div className="pf-detail-grid">
                <DetailItem label="Abbreviation">{p.abbr}</DetailItem>
                <DetailItem label="Submission">{p.dates}</DetailItem>
                <DetailItem label="Journal Site"><a href="#" onClick={noNav}>Link</a></DetailItem>
              </div>
            )}
          </div>
        )}

        <SectionHeading level="subsection" style={{ marginTop: 18 }}>Target Rationale</SectionHeading>
        <Field label="Rationale for Target Selection" className="pf-maxw760">
          <TextArea width="100%" height="105px" placeholder="Explain why this conference or journal is the right target for this publication." />
        </Field>
      </div>
    </div>
  );
}
