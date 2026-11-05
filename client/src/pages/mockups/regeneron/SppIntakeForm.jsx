import React, { useState } from 'react';
import {
  Button, CheckboxGroup, DataTable, DateField, DropZone, EyebrowLabel, Field, FormActionBar, Icon, IconButton,
  InlineMessage, Panel, Radio, RecordHeader, SectionHeading, Select, TextArea, TextField,
} from '../../../ds/pubpro';
import { DEPARTMENTS, REQUESTER, STEPS, businessDaysUntil, fmt, parseDate } from './data';
import { Shell, StatusPill } from './shared';

const PROPOSAL_TYPES = ['Student Intern', 'High School Mentorship', 'Teacher Fellow'];
const STUDENT_TYPES = ['Student Intern', 'High School Mentorship'];
const EXPEDITE_WINDOW = 6; // business days
const DESC_MAX = 2000;

const TITLE = 'Summer research project: CRISPR knockout screen in hepatocytes';
const DESC = 'An eight-week project to run a pooled CRISPR knockout screen in primary human hepatocytes and identify regulators of lipid droplet formation. '
  + 'The participant will design the guide library with the Genomics team, run the screen, and present results at the end-of-summer symposium. '
  + 'No patient data or clinical samples are involved.';

const PRESETS = {
  a: {
    clinical: 'No', depts: ['Research Operations'], subs: { 'Research Operations': ['Education Outreach'] },
    proposal: 'Teacher Fellow', gradYear: '', date: '12/4/2026', expedited: 'No', reason: '', autoExpedited: false,
    usedAi: 'No', headApproved: 'Yes', unpublished: 'No',
  },
  b: {
    clinical: 'No', depts: ['Therapeutic Focus Area', 'Tech Center'], subs: { 'Therapeutic Focus Area': ['Immunology'], 'Tech Center': ['Genomics'] },
    proposal: 'Student Intern', gradYear: '2027', date: '11/11/2026', expedited: 'Yes', autoExpedited: true,
    reason: "The intern presents at their university's research day on Nov 13, and the project summary has to be cleared before the program's submission portal closes on Nov 12.",
    usedAi: 'No', headApproved: 'Yes', unpublished: 'No',
  },
};
PRESETS.clinical = { ...PRESETS.a, clinical: 'Yes' };

const participantRole = p => (p === 'Teacher Fellow' ? 'Teacher Fellow' : p === 'High School Mentorship' ? 'High School Mentee' : 'Student Intern');
const participantOrg = p => (p === 'Student Intern' ? 'Hudson Valley University' : 'Westbrook High School');

const AUTHOR_COLS = [
  { header: 'Name', width: 'minmax(150px, 1.3fr)' },
  { header: 'Match', width: 'minmax(170px, 1.3fr)' },
  { header: 'Author Role', width: 'minmax(170px, 1.2fr)' },
  { header: '', width: '110px', align: 'right' },
];
const FILE_COLS = [
  { header: 'Document', width: 'minmax(200px, 2fr)' },
  { header: 'Size', width: '70px' },
  { header: 'Uploaded', width: 'minmax(160px, 1.4fr)' },
  { header: '', width: '40px', align: 'right' },
];

function YesNo({ value, onChange, name }) {
  return (
    <span className="rgm-radios" role="radiogroup" aria-label={name}>
      {['Yes', 'No'].map(v => <Radio key={v} label={v} checked={value === v} onChange={() => onChange(v)} role="radio" aria-checked={value === v} />)}
    </span>
  );
}

export default function SppIntakeForm() {
  const preset = PRESETS[new URLSearchParams(window.location.search).get('state')] || PRESETS.a;
  const [f, setF] = useState(preset);
  const set = patch => setF(s => ({ ...s, ...patch }));

  const date = parseDate(f.date);
  const bd = date ? businessDaysUntil(date) : null;
  const inWindow = bd != null && bd <= EXPEDITE_WINDOW;
  const student = STUDENT_TYPES.includes(f.proposal);
  const stopped = f.clinical === 'Yes';

  const onDate = e => {
    const text = e.target.value;
    const dt = parseDate(text);
    const soon = dt && businessDaysUntil(dt) <= EXPEDITE_WINDOW;
    set(soon ? { date: text, expedited: 'Yes', autoExpedited: true } : { date: text, autoExpedited: false });
  };
  const toggleDepts = depts => set({ depts, subs: Object.fromEntries(depts.map(dp => [dp, f.subs[dp] || []])) });
  const reviewers = f.depts.flatMap(dp => (f.subs[dp] || []).map(s => ({ s, dp })));
  const extras = [
    f.headApproved === 'No' && 'Department head approves before review starts',
    f.usedAi === 'Yes' && 'AI-use disclosure shown to reviewers',
    f.unpublished === 'Yes' && 'Intellectual property reviewer added',
  ].filter(Boolean);

  return (
    <Shell>
      <RecordHeader
        title="New Student Project Proposal"
        task="Submit for Clearance"
        steps={[{ label: 'Draft', active: true }, ...STEPS]}
        meta={['Record ID is assigned when you submit', 'Requester: ' + REQUESTER.name, <StatusPill status="Draft" />]}
      />

      <main className="rgm-page">
        <div className="rgm-form-grid">
          <div className="rgm-panel">
            <SectionHeading subtitle="One page. Questions that don't apply to your answers stay hidden.">Proposal Details</SectionHeading>

            <Field
              required
              label="Is this related to a clinical program?"
              info="Work tied to a clinical program is cleared through the Clinical Publications process, which has its own reviewers. Answering Yes ends this form."
            >
              <YesNo name="Related to a clinical program" value={f.clinical} onChange={v => set({ clinical: v })} />
            </Field>
            {stopped && (
              <InlineMessage kind="warning">
                <strong>This belongs in a different process.</strong> Submissions related to a clinical program are cleared through Clinical Publications, not here. <a href="#clinical-process">Go to the Clinical Publications submission</a>
              </InlineMessage>
            )}

            {!stopped && (
              <>
                <section className="rgm-group" aria-label="About the project">
                  <EyebrowLabel>About the Project</EyebrowLabel>
                  <div className="rgm-pair">
                    <Field label="Requester" help="Filled in from your sign-in.">
                      <TextField value={REQUESTER.name} readOnly iconBefore="person" />
                    </Field>
                    <Field required label="Department" info="Each department you pick adds its subdepartment reviewers. Pick every department whose work is in the project.">
                      <CheckboxGroup options={Object.keys(DEPARTMENTS)} value={f.depts} onChange={toggleDepts} columns={2} />
                    </Field>
                  </div>
                  <Field
                    required
                    label="Subdepartment"
                    info="Subdepartment decides who reviews your submission. Each one you pick adds that group's reviewer."
                    help="Subdepartment determines who reviews it. Pick at least one for each department you chose."
                  >
                    {f.depts.length ? (
                      <div className="rgm-subdepts">
                        {f.depts.map(dp => (
                          <Field key={dp} label={dp}>
                            <CheckboxGroup options={DEPARTMENTS[dp]} value={f.subs[dp] || []} onChange={v => set({ subs: { ...f.subs, [dp]: v } })} columns={3} />
                          </Field>
                        ))}
                      </div>
                    ) : <span className="pp-help">Choose a department first.</span>}
                  </Field>
                  <Field required label="Proposal Type" info="Student types ask for a graduation year to confirm eligibility. Teacher Fellow proposals skip it.">
                      <span className="rgm-radios" role="radiogroup" aria-label="Proposal type">
                        {PROPOSAL_TYPES.map(p => <Radio key={p} label={p} checked={f.proposal === p} onChange={() => set({ proposal: p })} role="radio" aria-checked={f.proposal === p} />)}
                      </span>
                  </Field>
                  {student && (
                    <div className="rgm-pair">
                      <Field required label="Graduation Year">
                        <Select width="100%" placeholder="Please select" value={f.gradYear} onChange={e => set({ gradYear: e.target.value })} options={['2026', '2027', '2028', '2029', '2030']} />
                      </Field>
                      <div />
                    </div>
                  )}
                  <Field required label="Project Title">
                    <TextField value={TITLE} readOnly />
                  </Field>
                  <Field required label="Project Description" help={DESC.length.toLocaleString() + ' / ' + DESC_MAX.toLocaleString() + ' characters'}>
                    <TextArea value={DESC} readOnly rows={4} />
                  </Field>
                </section>

                <section className="rgm-group" aria-label="Timing">
                  <EyebrowLabel>Timing</EyebrowLabel>
                  <div className="rgm-pair">
                    <Field required label="Requested Review Date" info={'Dates within ' + EXPEDITE_WINDOW + ' business days of today need an expedited review, so the coordinator sees your reason first.'}>
                      <DateField value={f.date} onChange={onDate} />
                    </Field>
                    <Field
                      required
                      label="Expedited Review?"
                      info="Yes asks for a reason and gives your reviewers a shorter deadline. The coordinator can decline it."
                      help={f.autoExpedited && f.expedited === 'Yes' ? 'Set to Yes from your requested review date.' : null}
                    >
                      <YesNo name="Expedited review" value={f.expedited} onChange={v => set({ expedited: v, autoExpedited: false })} />
                    </Field>
                  </div>
                  {inWindow && (
                    <InlineMessage kind="warning">
                      <strong>This date requires an expedited review.</strong> {fmt(date)} is {bd} business {bd === 1 ? 'day' : 'days'} from today, so Expedited Review is set to Yes.
                    </InlineMessage>
                  )}
                  {f.expedited === 'Yes' && (
                    <Field required label="Reason for Expedited Review">
                      <TextArea value={f.reason} onChange={e => set({ reason: e.target.value })} rows={3} placeholder="What is the deadline, and why can't it move?" />
                    </Field>
                  )}
                </section>

                <section className="rgm-group" aria-label="Authors">
                  <EyebrowLabel>Authors</EyebrowLabel>
                  <InlineMessage kind="info"><strong>Approvia AI:</strong> Authors detected from your attachment. Confirm matches. 1 confirmed, 1 to confirm.</InlineMessage>
                  <Field help="Mentor and the student or fellow are required roles.">
                    <DataTable
                      columns={AUTHOR_COLS}
                      rows={[
                        {
                          key: 'mentor',
                          cells: [
                            <><strong>{REQUESTER.name}</strong><span className="rgm-meta">Internal · Immunology</span></>,
                            <span className="rgm-exp rgm-exp--ok"><Icon name="check_circle" size={16} />Confirmed directory match</span>,
                            <Select width="100%" value="Mentor" options={['Mentor', 'Co-author']} />,
                            <IconButton icon="close" size={24} title="Remove author" aria-label="Remove author" style={{ marginLeft: 'auto' }} />,
                          ],
                        },
                        {
                          key: 'participant',
                          cells: [
                            <><strong>Jamie Castellano</strong><span className="rgm-meta">{participantOrg(f.proposal)}</span></>,
                            <span className="rgm-exp rgm-exp--warn"><Icon name="public" size={16} />External author · not in directory</span>,
                            <Select width="100%" value={participantRole(f.proposal)} options={['Student Intern', 'High School Mentee', 'Teacher Fellow', 'Co-author']} />,
                            <Button variant="secondary" icon="check">Confirm</Button>,
                          ],
                        },
                      ]}
                    />
                  </Field>
                  <div><Button variant="secondary" icon="person_add">Add Author</Button></div>
                </section>

                <section className="rgm-group" aria-label="Checklist">
                  <EyebrowLabel>Checklist</EyebrowLabel>
                  <Field required label="Did you use AI to write any part of this?" info="Yes adds an AI-use disclosure that reviewers see. It doesn't block the submission.">
                    <YesNo name="Used AI" value={f.usedAi} onChange={v => set({ usedAi: v })} />
                  </Field>
                  <Field required label="Has your department head approved this submission?" info="No sends it to your department head first. Review starts after they approve, which adds time.">
                    <YesNo name="Department head approved" value={f.headApproved} onChange={v => set({ headApproved: v })} />
                  </Field>
                  <Field required label="Does it include unpublished data or results?" info="Yes adds an intellectual property reviewer to the route.">
                    <YesNo name="Unpublished data" value={f.unpublished} onChange={v => set({ unpublished: v })} />
                  </Field>
                </section>

                <section className="rgm-group" aria-label="Attachments">
                  <EyebrowLabel>Attachments</EyebrowLabel>
                  <Field label="Attachments" help="Optional. Most student project proposals don't need one.">
                    <div className="rgm-subdepts">
                      <DataTable
                        columns={FILE_COLS}
                        rows={[{
                          key: 'file',
                          cells: [
                            <a href="#file">Project_outline_Castellano.docx</a>,
                            '48 KB',
                            'Today 9:31 AM · read by Approvia AI',
                            <IconButton icon="close" size={24} title="Remove file" aria-label="Remove file" style={{ marginLeft: 'auto' }} />,
                          ],
                        }]}
                      />
                      <DropZone />
                    </div>
                  </Field>
                </section>
              </>
            )}
          </div>

          {!stopped && (
            <Panel icon="route" title="What your answers trigger" className="rgm-rail">
              <div className="rgm-rail-list">
                <div className="rgm-rail-item">
                  <Icon name="group" size={20} color="var(--high-emphasis)" />
                  <span>
                    <strong>Reviewers ({reviewers.length})</strong>
                    {reviewers.length ? reviewers.map(r => <span key={r.s} className="rgm-meta">{r.s} reviewer · {r.dp}</span>) : <span className="rgm-meta">Pick a subdepartment to see who reviews it.</span>}
                  </span>
                </div>
                <div className="rgm-rail-item">
                  <Icon name={f.expedited === 'Yes' ? 'bolt' : 'schedule'} size={20} color="var(--high-emphasis)" />
                  <span>
                    <strong>{f.expedited === 'Yes' ? 'Expedited review' : 'Standard review'}</strong>
                    <span className="rgm-meta">{f.expedited === 'Yes' ? 'The coordinator checks your reason first, then reviewers get a shorter deadline.' : 'Reviewers have 10 business days.'}</span>
                  </span>
                </div>
                <div className="rgm-rail-item">
                  <Icon name="event" size={20} color="var(--high-emphasis)" />
                  <span>
                    <strong>Review date {date ? fmt(date) : 'not set'}</strong>
                    {date && <span className="rgm-meta">{bd} business days from today</span>}
                  </span>
                </div>
                <div className="rgm-rail-item">
                  <Icon name="school" size={20} color="var(--high-emphasis)" />
                  <span>
                    <strong>{f.proposal}</strong>
                    <span className="rgm-meta">{student ? 'Graduation year confirms intern eligibility.' : 'No graduation year needed.'}</span>
                  </span>
                </div>
                <div className="rgm-rail-item">
                  <Icon name="task_alt" size={20} color="var(--high-emphasis)" />
                  <span>
                    <strong>{extras.length ? 'Extra steps (' + extras.length + ')' : 'No extra steps'}</strong>
                    {extras.length
                      ? extras.map(x => <span key={x} className="rgm-meta">{x}</span>)
                      : <span className="rgm-meta">Department head approved, no AI use, no unpublished data.</span>}
                  </span>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </main>

      <div className="rgm-bar">
        <FormActionBar
          left={(
            <>
              <Button variant="secondary">Cancel</Button>
              <span className="rgm-saved"><Icon name="cloud_done" size={18} />Draft saved automatically · 9:42 AM</span>
            </>
          )}
          right={stopped ? null : (
            <>
              <Button variant="tertiary" icon="save">Save Draft</Button>
              <Button icon="send">Submit</Button>
            </>
          )}
        />
      </div>
    </Shell>
  );
}
