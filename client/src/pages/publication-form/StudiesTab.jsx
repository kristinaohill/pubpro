import React from 'react';
import { Link } from 'react-router-dom';
import { Checkbox, Icon, IconButton, TextField } from '../../ds/pubpro';
import { STUDY_DIRECTORY } from './data';
import { Card, Details, Empty, FormField, Stack, TabHead, Tag } from './ui';
import './tabs-a.css';
import useDismiss from '../../components/useDismiss';

// Study status as a kit Tag tone (was the STUDY_STATUS_BG badge colours).
const STATUS_TONE = { 'In Progress': 'blue', Completed: 'grey', 'On Hold': 'amber', Cancelled: 'red' };

export default function StudiesTab({ st, set }) {
  const sq = (st.studyQuery || '').trim().toLowerCase();
  const matches = STUDY_DIRECTORY
    .filter(s => !st.selectedStudies.includes(s.id))
    .filter(s => !sq || (s.id + ' ' + s.title + ' ' + s.product).toLowerCase().includes(sq))
    .slice(0, 6);
  const selected = st.selectedStudies.map(id => STUDY_DIRECTORY.find(s => s.id === id)).filter(Boolean);

  const studyRef = useDismiss(st.studyOpen, () => set({ studyOpen: false }), () => set({ studyOpen: true }));

  const addStudy = id => set(p => ({ selectedStudies: p.selectedStudies.concat([id]), studyQuery: '', studyOpen: false }));
  const removeStudy = id => set(p => ({ selectedStudies: p.selectedStudies.filter(x => x !== id) }));

  return (
    <Stack>
      <TabHead title="Studies" sub="The clinical studies this publication reports." />

      <Card>
        <Checkbox
          checked={st.noStudy}
          onChange={() => set(p => ({ noStudy: !p.noStudy, studyOpen: false }))}
          label="No study is associated with this publication"
        />
        {!st.noStudy && (
          <div ref={studyRef} style={{ display: 'contents' }}>
          <FormField id="pf-addstudy" label="Add Study">
            <div className="pfxa-search">
              <TextField
                id="pf-addstudy"
                iconBefore="search"
                iconAfter={st.studyQuery.length > 0 ? 'close' : undefined}
                onIconClick={() => set({ studyQuery: '', studyOpen: false })}
                width="100%"
                value={st.studyQuery}
                onChange={e => set({ studyQuery: e.target.value, studyOpen: true })}
                onFocus={() => set({ studyOpen: true })}
                placeholder="Search by study ID, title, or product"
              />
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
            </div>
          </FormField>
          </div>
        )}
      </Card>

      {!st.noStudy && (
        <Card title="Selected studies" meta={selected.length > 0 ? selected.length + (selected.length === 1 ? ' study' : ' studies') : null}>
          {selected.length > 0 ? (
            <div className="pfxa-studies">
              {selected.map(s => (
                <article key={s.id} className="pfxa-study">
                  <div className="pfxa-study-head">
                    <div className="pfxa-study-titles">
                      <div className="pfxa-study-id"><Link to={'/study/' + s.id}>Study {s.id}</Link></div>
                      <div className="pfxa-study-title">{s.title}</div>
                    </div>
                    <Tag tone={STATUS_TONE[s.status] || 'grey'}>{s.status}</Tag>
                    <IconButton icon="close" tone="fatal" size={30} title="Remove study" onClick={() => removeStudy(s.id)} />
                  </div>
                  <Details
                    items={[
                      ['Related Product', s.product],
                      ['Therapeutic Area', s.area],
                      ['Responsible Manager', s.manager],
                      ['Submission Deadline', s.deadline],
                      ['Expected Completion', s.expected],
                      ['Interim Analysis Cut-Off', s.interim],
                      ['Data Lock Date', s.lock],
                      ['Primary Outcome Result', s.outcome],
                      ['Results Availability Status', s.availability],
                      ['Dissemination Decision', s.dissemination],
                      ['ClinicalTrials.gov Registration Number', s.nct ? <a href={s.nctUrl} target="_blank" rel="noopener noreferrer">{s.nct}</a> : ''],
                    ].concat(s.hasRationale ? [['Rationale if Not Planned', s.rationale, true]] : [])}
                  />
                </article>
              ))}
            </div>
          ) : (
            <Empty>No studies linked to this publication yet. Use the search above to add one.</Empty>
          )}
        </Card>
      )}
    </Stack>
  );
}
