import React from 'react';
import { Link } from 'react-router-dom';
import { Checkbox, Field, Icon, IconButton, SectionHeading } from '../../ds/pubpro';
import { STUDY_DIRECTORY, STUDY_STATUS_BG } from './data';
import { DashedEmpty, DetailItem } from './shared';
import useDismiss from '../../components/useDismiss';

export default function StudiesTab({ st, set }) {
  const sq = (st.studyQuery || '').trim().toLowerCase();
  const matches = STUDY_DIRECTORY
    .filter(s => !st.selectedStudies.includes(s.id))
    .filter(s => !sq || (s.id + ' ' + s.title + ' ' + s.product).toLowerCase().includes(sq))
    .slice(0, 6);
  const selected = st.selectedStudies.map(id => STUDY_DIRECTORY.find(s => s.id === id)).filter(Boolean);

  const studyRef = useDismiss(st.studyOpen, () => set({ studyOpen: false }));

  const addStudy = id => set(p => ({ selectedStudies: p.selectedStudies.concat([id]), studyQuery: '', studyOpen: false }));
  const removeStudy = id => set(p => ({ selectedStudies: p.selectedStudies.filter(x => x !== id) }));

  return (
    <div>
      <SectionHeading style={{ marginBottom: 10 }}>Studies</SectionHeading>
      <div className="pf-mb20">
        <Checkbox
          checked={st.noStudy}
          onChange={() => set(p => ({ noStudy: !p.noStudy, studyOpen: false }))}
          label="No study is associated with this publication"
        />
      </div>

      {!st.noStudy && (
        <div>
          <div ref={studyRef} style={{ display: 'contents' }}>
          <Field label="Add Study" className="pf-search pf-maxw640">
            <div className="pf-search-box">
              <Icon name="search" size={19} color="var(--text-meta)" style={{ padding: '0 6px 0 9px' }} />
              <input
                value={st.studyQuery}
                onChange={e => set({ studyQuery: e.target.value, studyOpen: true })}
                onFocus={() => set({ studyOpen: true })}
                placeholder="Search by study ID, title, or product"
                className="pf-search-input pf-search-input--study"
              />
              {st.studyQuery.length > 0 && (
                <Icon
                  name="close"
                  size={18}
                  color="var(--text-meta)"
                  style={{ padding: '0 8px', cursor: 'pointer' }}
                  onClick={() => set({ studyQuery: '', studyOpen: false })}
                />
              )}
            </div>
            {st.studyOpen && (
              <div className="pf-menu">
                {matches.map(s => (
                  <div key={s.id} className="pf-menu-item" onClick={() => addStudy(s.id)}>
                    <span className="pf-study-id">{s.id}</span>
                    <span className="pf-study-title">{s.title}</span>
                    <span className="pf-note12 pf-none">{s.product}</span>
                    <Icon name="add_circle" size={19} color="var(--high-emphasis)" style={{ flex: 'none' }} />
                  </div>
                ))}
                {matches.length === 0 && <div className="pf-menu-empty">No studies match “{st.studyQuery}”.</div>}
              </div>
            )}
          </Field>
          </div>

          <SectionHeading level="subsection" style={{ marginTop: 26, marginBottom: 10 }}>Selected Studies</SectionHeading>
          {selected.length > 0 ? (
            <div className="pf-stack14">
              {selected.map(s => (
                <div key={s.id} className="pf-card">
                  <div className="pf-study-head">
                    <div className="pf-flex1">
                      <div className="pf-semibold14"><Link to={'/study/' + s.id}>Study {s.id}</Link></div>
                      <div className="pf-card-title">{s.title}</div>
                    </div>
                    <span
                      className="pf-study-status"
                      style={{
                        background: STUDY_STATUS_BG[s.status] || 'var(--border-hairline)',
                        color: s.status === 'In Progress' ? 'var(--white)' : 'var(--text-button-dark)',
                      }}
                    >
                      {s.status}
                    </span>
                    <IconButton icon="close" tone="fatal" size={30} title="Remove study" onClick={() => removeStudy(s.id)} />
                  </div>
                  <div className="pf-detail-grid">
                    <DetailItem label="Related Product">{s.product}</DetailItem>
                    <DetailItem label="Therapeutic Area">{s.area}</DetailItem>
                    <DetailItem label="Responsible Manager">{s.manager}</DetailItem>
                    <DetailItem label="Submission Deadline">{s.deadline}</DetailItem>
                    <DetailItem label="Expected Completion">{s.expected}</DetailItem>
                    <DetailItem label="Interim Analysis Cut-Off">{s.interim}</DetailItem>
                    <DetailItem label="Data Lock Date">{s.lock}</DetailItem>
                    <DetailItem label="Primary Outcome Result">{s.outcome}</DetailItem>
                    <DetailItem label="Results Availability Status">{s.availability}</DetailItem>
                    <DetailItem label="Dissemination Decision">{s.dissemination}</DetailItem>
                    <DetailItem label="ClinicalTrials.gov Registration Number">
                      {s.nct && <a href={s.nctUrl} target="_blank" rel="noopener noreferrer">{s.nct}</a>}
                    </DetailItem>
                    {s.hasRationale && <DetailItem label="Rationale if Not Planned" full>{s.rationale}</DetailItem>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DashedEmpty>No studies linked to this publication yet. Use the search above to add one.</DashedEmpty>
          )}
        </div>
      )}
    </div>
  );
}
