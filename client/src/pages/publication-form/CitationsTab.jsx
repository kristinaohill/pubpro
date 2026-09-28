import React from 'react';
import { AIActionButton, Button, IconButton, Pill, Select, TextField } from '../../ds/pubpro';
import DateField from '../../components/DateField';
import { CITATION_TYPE_OPTIONS } from './data';
import { Card, FormField, ListBox, ListRow, Pair, Stack, TabHead, Tag } from './ui';
import './tabs-d.css';

const CITATIONS = [
  { ref: 'Hill K, Ternal I, Altschuler S, et al.', source: 'Journal of Cardiometabolic Medicine. 2027;14(3):211-224.', type: 'Journal Article', doi: '10.1093/jcm/ehx2027', v: ['Verified', 'var(--ok)', 'Clear', 'Relevant'] },
  { ref: 'Altschuler S, Pending P.', source: 'European Pain Federation Congress Abstracts. 2027;Abstr 1184.', type: 'Congress Abstract', doi: '—', v: ['Not in PubMed — check congress site', 'var(--warn-text)', 'Clear', 'Review'] },
  { ref: 'Nakamura T, Ortiz L, Webb M.', source: 'Br J Dermatol. 2019;181(4):702-710.', type: 'Journal Article', doi: '10.1111/bjd.17825', v: ['Verified', 'var(--ok)', 'Retracted', 'Review'] },
];

export default function CitationsTab({ st, set, bind }) {
  const done = st.citationsVerified;
  const citations = CITATIONS.map(c => ({
    ...c,
    status: done ? c.v[0] : 'Pending verification',
    statusColor: done ? c.v[1] : 'var(--warn-text)',
    retraction: done ? c.v[2] : 'Not checked',
    retractionTone: !done ? 'outline' : c.v[2] === 'Clear' ? 'on-track' : 'overdue',
    relevance: done ? c.v[3] : 'Not checked',
    relevanceTone: !done ? 'outline' : c.v[3] === 'Relevant' ? 'on-track' : 'due-soon',
  }));

  return (
    <Stack>
      <TabHead
        title="Citations"
        sub="References cited by this publication."
        actions={<AIActionButton onClick={() => set({ citationsVerified: true })}>AI: Verify All Citations</AIActionButton>}
      />

      <Card title="Linked citations" meta={`${citations.length} citation${citations.length === 1 ? '' : 's'}`}>
        {done && <div className="pfxd-text pfxd-lead">Checked against PubMed 9/24/2026 · 1 retracted · 2 need a relevance review</div>}
        <ListBox>
          {citations.map(c => (
            <ListRow key={c.ref} className="pfxd-cite-row">
              <div className="pfxd-cite-main">
                <span className="pfxd-strong">{c.ref}</span>
                <span className="pfxd-cite-source">{c.source}</span>
                <span className="pfxd-cite-meta">
                  <Tag tone="outline">{c.type}</Tag>
                  <span className="pfxd-note">DOI {c.doi}</span>
                </span>
              </div>
              <div className="pfxd-cite-checks">
                <span className="pfxd-cite-status" style={{ color: c.statusColor }}>{c.status}</span>
                <span className="pfxd-cite-check">Retraction: <Pill tone={c.retractionTone}>{c.retraction}</Pill></span>
                <span className="pfxd-cite-check">Relevance: <Pill tone={c.relevanceTone}>{c.relevance}</Pill></span>
              </div>
              <IconButton icon="close" tone="fatal" size={26} title="Remove citation" />
            </ListRow>
          ))}
        </ListBox>
      </Card>

      <Card title="Add citation">
        <Pair>
          <FormField id="pfxd-cite-type" label="Citation Type">
            <Select id="pfxd-cite-type" options={CITATION_TYPE_OPTIONS} {...bind('citationType')} width="100%" />
          </FormField>
          <FormField id="pfxd-cite-date" label="Publication Date"><DateField id="pfxd-cite-date" width="100%" /></FormField>
        </Pair>
        <FormField id="pfxd-cite-source" label="Journal / Source"><TextField id="pfxd-cite-source" width="100%" /></FormField>
        <Pair>
          <FormField id="pfxd-cite-vol" label="Volume / Issue / Pages"><TextField id="pfxd-cite-vol" width="100%" /></FormField>
          <div />
        </Pair>
        <Pair>
          <FormField id="pfxd-cite-doi" label="DOI"><TextField id="pfxd-cite-doi" placeholder="10.xxxx/xxxxx" width="100%" /></FormField>
          <FormField id="pfxd-cite-pmid" label="PMID"><TextField id="pfxd-cite-pmid" width="100%" /></FormField>
        </Pair>
        <div className="pfxd-actions">
          <Button variant="primary">Add Citation</Button>
          <AIActionButton>AI: Look Up by DOI</AIActionButton>
        </div>
      </Card>
    </Stack>
  );
}
