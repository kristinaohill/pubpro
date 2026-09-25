import React from 'react';
import { AIActionButton, Button, Field, IconButton, Pill, SectionHeading, Select, TextField } from '../../ds/pubpro';
import DateField from '../../components/DateField';
import { CITATION_TYPE_OPTIONS } from './data';

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
    <div className="pf-stack24">
      <div className="pf-divided-block pf-pb20">
        <SectionHeading style={{ marginBottom: 12 }}>Citations</SectionHeading>
        <div className="pf-cite-bar">
          <div className="pf-h3">Linked Citations</div>
          <div className="pf-ml-auto">
            <AIActionButton onClick={() => set({ citationsVerified: true })}>AI: Verify All Citations</AIActionButton>
          </div>
        </div>
        {done && <div className="pf-meta pf-cite-note">Checked against PubMed 9/24/2026 · 1 retracted · 2 need a relevance review</div>}
        <div className="pf-scroll-x">
          <div className="pf-cite-grid pf-cite-head">
            <div>Authors</div>
            <div>Source</div>
            <div>Citation Type</div>
            <div>DOI</div>
            <div>Status</div>
            <div>Retraction Check</div>
            <div>Relevance</div>
            <div />
          </div>
          {citations.map(c => (
            <div key={c.ref} className="pf-cite-grid pf-cite-row">
              <div className="pf-ellipsis">{c.ref}</div>
              <div className="pf-ellipsis">{c.source}</div>
              <div className="pf-ellipsis">{c.type}</div>
              <div className="pf-ellipsis">{c.doi}</div>
              <div className="pf-strong pf-min0" style={{ color: c.statusColor }}>{c.status}</div>
              <div><Pill tone={c.retractionTone}>{c.retraction}</Pill></div>
              <div><Pill tone={c.relevanceTone}>{c.relevance}</Pill></div>
              <div className="pf-justify-end">
                <IconButton icon="close" tone="fatal" size={26} title="Remove citation" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionHeading level="subsection" style={{ marginBottom: 14 }}>Add Citation</SectionHeading>
        <div className="pf-cite-form">
          <Field label="Citation Type">
            <Select options={CITATION_TYPE_OPTIONS} {...bind('citationType')} width="100%" />
          </Field>
          <Field label="Journal / Source"><TextField width="100%" /></Field>
          <Field label="Volume / Issue / Pages"><TextField width="100%" /></Field>
          <Field label="Publication Date"><DateField width="100%" /></Field>
          <Field label="DOI"><TextField placeholder="10.xxxx/xxxxx" width="100%" /></Field>
          <Field label="PMID"><TextField width="100%" /></Field>
        </div>
        <div className="pf-row pf-gap12 pf-mt18 pf-pl22">
          <Button variant="primary">Add Citation</Button>
          <AIActionButton>AI: Look Up by DOI</AIActionButton>
        </div>
      </div>
    </div>
  );
}
