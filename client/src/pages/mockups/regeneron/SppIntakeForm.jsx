import React, { useState } from 'react';
import { Button, CheckboxGroup, DataTable, DateField, DropZone, EyebrowLabel, Field, FormActionBar, Icon, InlineMessage, Radio, Select, TextArea, TextField } from '../../../ds/pubpro';
import { DEPARTMENTS, REQUESTER, businessDaysUntil, fmt, parseDate } from './data';
import { InfoTip, Shell, StatusPill } from './shared';

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
const participantOrg = p => (p === 'Teacher Fellow' ? 'Westbrook High School' : p === 'High School Mentorship' ? 'Westbrook High School' : 'Hudson Valley University');

function YesNo({ value, onChange, name }) {
  return (
    <span className="rgm-radios" role="radiogroup" aria-label={name}>
      {['Yes', 'No'].map(v => <Radio key={v} label={v} checked={value === v} onChange={() => onChange(v)} role="radio" aria-checked={value === v} />)}
    </span>
  );
}

const Label = ({ text, tip, tipTitle }) => (
  <span className="rgm-label">{text}{tip && <InfoTip title={tipTitle || text}>{tip}</InfoTip>}</span>
);

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
    <Shell nav={['Home', 'Help']} activeNav="Home" workspace="My Clearance" tabs={['My Submissions', 'New Submission']} activeTab="New Submission">
      <main className="rgm-page">
        <header className="rgm-form-head">
          <div>
            <EyebrowLabel>New submission</EyebrowLabel>
            <div className="pp-section">Student Project Proposal</div>
            <div className="rgm-date">One page. Questions that don't apply to your answers stay hidden.</div>
          </div>
          <span className="rgm-label"><StatusPill status="Draft" /><span className="pp-help">Record ID is assigned when you submit</span></span>
        </header>

        <div className="rgm-form-grid">
          <div className="rgm-card">
            <div className="rgm-form">
              <section className="rgm-group" aria-label="Before you start">
                <EyebrowLabel>Before you start</EyebrowLabel>
                <Field
                  required
                  label={<Label text="Is this related to a clinical program?" tip="Work tied to a clinical program is cleared through the Clinical Publications process, which has its own reviewers. Answering Yes ends this form." />}
                >
                  <YesNo name="Related to a clinical program" value={f.clinical} onChange={v => set({ clinical: v })} />
                </Field>
                {stopped && (
                  <InlineMessage kind="warning">
                    <span><strong>This belongs in a different process.</strong> Submissions related to a clinical program are cleared through Clinical Publications, not here. <a href="#clinical-process">Go to the Clinical Publications submission</a></span>
                  </InlineMessage>
                )}
              </section>

              {!stopped && (
                <>
                  <section className="rgm-group" aria-label="About the project">
                    <EyebrowLabel>About the project</EyebrowLabel>
                    <div className="rgm-pair">
                      <Field label="Requester">
                        <div className="rgm-readonly"><Icon name="person" size={18} color="var(--text-meta)" />{REQUESTER.name}<span className="rgm-sub">From your sign-in</span></div>
                      </Field>
                      <Field
                        required
                        label={<Label text="Department" tip="Each department you pick adds its subdepartment reviewers. Pick every department whose work is in the project." />}
                      >
                        <CheckboxGroup options={Object.keys(DEPARTMENTS)} value={f.depts} onChange={toggleDepts} columns={2} />
                      </Field>
                    </div>
                    <Field
                      required
                      label={<Label text="Subdepartment" tip="Subdepartment decides who reviews your submission. Each one you pick adds that group's reviewer." />}
                      help="Subdepartment determines who reviews it. Pick at least one for each department you chose."
                    >
                      {f.depts.length ? (
                        <div className="rgm-subdepts">
                          {f.depts.map(dp => (
                            <div key={dp}>
                              <div className="rgm-subdept-label">{dp}</div>
                              <CheckboxGroup options={DEPARTMENTS[dp]} value={f.subs[dp] || []} onChange={v => set({ subs: { ...f.subs, [dp]: v } })} columns={3} />
                            </div>
                          ))}
                        </div>
                      ) : <span className="pp-help">Choose a department first.</span>}
                    </Field>
                    <div className="rgm-pair rgm-pair--wide">
                      <Field
                        required
                        label={<Label text="Proposal type" tip="Student types ask for a graduation year to confirm eligibility. Teacher Fellow proposals skip it." />}
                      >
                        <span className="rgm-radios" role="radiogroup" aria-label="Proposal type">
                          {PROPOSAL_TYPES.map(p => <Radio key={p} label={p} checked={f.proposal === p} onChange={() => set({ proposal: p })} role="radio" aria-checked={f.proposal === p} />)}
                        </span>
                      </Field>
                      {student && (
                        <Field required label="Graduation year">
                          <Select width="100%" placeholder="Select year" value={f.gradYear} onChange={e => set({ gradYear: e.target.value })} options={['2026', '2027', '2028', '2029', '2030']} />
                        </Field>
                      )}
                    </div>
                    <Field required label="Project title">
                      <TextField value={TITLE} readOnly />
                    </Field>
                    <Field required label="Project description">
                      <TextArea value={DESC} readOnly rows={4} />
                      <div className="rgm-counter">{DESC.length.toLocaleString()} / {DESC_MAX.toLocaleString()} characters</div>
                    </Field>
                  </section>

                  <section className="rgm-group" aria-label="Timing">
                    <EyebrowLabel>Timing</EyebrowLabel>
                    <div className="rgm-pair">
                      <Field
                        required
                        label={<Label text="Requested review date" tip={'Dates within ' + EXPEDITE_WINDOW + ' business days of today need an expedited review, so the coordinator sees your reason first.'} />}
                      >
                        <DateField value={f.date} onChange={onDate} />
                      </Field>
                      <Field
                        required
                        label={<Label text="Expedited review?" tip="Yes asks for a reason and moves your reviewers to a shorter deadline. The coordinator can decline it." />}
                      >
                        <span className="rgm-radios">
                          <YesNo name="Expedited review" value={f.expedited} onChange={v => set({ expedited: v, autoExpedited: false })} />
                          {f.autoExpedited && f.expedited === 'Yes' && <span className="rgm-auto"><Icon name="bolt" size={15} />Set from your review date</span>}
                        </span>
                      </Field>
                    </div>
                    {inWindow && (
                      <InlineMessage kind="warning">
                        <span><strong>This date requires an expedited review.</strong> {fmt(date)} is {bd} business {bd === 1 ? 'day' : 'days'} from today, so Expedited review is set to Yes.</span>
                      </InlineMessage>
                    )}
                    {f.expedited === 'Yes' && (
                      <Field required label="Reason for expedited review">
                        <TextArea value={f.reason} onChange={e => set({ reason: e.target.value })} rows={3} placeholder="What is the deadline, and why can't it move?" />
                      </Field>
                    )}
                  </section>

                  <section className="rgm-group" aria-label="Authors">
                    <EyebrowLabel>Authors</EyebrowLabel>
                    <div className="rgm-ai-note">
                      <Icon name="auto_awesome" size={18} color="var(--high-emphasis)" />
                      <span><strong>Approvia AI:</strong> Authors detected from your attachment. Confirm matches.</span>
                      <span className="pp-help" style={{ marginLeft: 'auto' }}>1 confirmed · 1 to confirm</span>
                    </div>
                    <DataTable
                      columns={[
                        { header: 'Name', width: 'minmax(150px, 1.3fr)' },
                        { header: 'Match', width: 'minmax(170px, 1.3fr)' },
                        { header: <Label text="Author role" tip="Mentor and the participant are required roles. Each needs one author before you can submit." />, width: 'minmax(170px, 1.2fr)' },
                        { header: '', width: '112px' },
                      ]}
                      style={{ overflow: 'visible' }}
                      rows={[
                        {
                          key: 'mentor',
                          cells: [
                            <span className="rgm-author-name"><strong>{REQUESTER.name}</strong><span className="rgm-sub">Internal · Immunology</span></span>,
                            <span className="rgm-match rgm-match--ok"><Icon name="check_circle" size={16} />Confirmed directory match</span>,
                            <span className="rgm-author-name"><Select width="100%" value="Mentor" options={['Mentor', 'Co-author']} /><span className="rgm-role-req">Required role</span></span>,
                            <Button variant="ghost" icon="close" aria-label="Remove author" style={{ padding: '0 6px' }} />,
                          ],
                        },
                        {
                          key: 'participant',
                          cells: [
                            <span className="rgm-author-name"><strong>Jamie Castellano</strong><span className="rgm-sub">{participantOrg(f.proposal)}</span></span>,
                            <span className="rgm-match rgm-match--ext"><Icon name="public" size={16} />External author · not in directory</span>,
                            <span className="rgm-author-name"><Select width="100%" value={participantRole(f.proposal)} options={['Student Intern', 'High School Mentee', 'Teacher Fellow', 'Co-author']} /><span className="rgm-role-req">Required role</span></span>,
                            <Button variant="ghost" icon="check">Confirm</Button>,
                          ],
                        },
                      ]}
                    />
                    <div><Button variant="secondary" icon="person_add">Add author</Button></div>
                  </section>

                  <section className="rgm-group" aria-label="Checklist">
                    <EyebrowLabel>Checklist</EyebrowLabel>
                    <div>
                      <div className="rgm-q">
                        <span className="rgm-q-text">Did you use AI to write any part of this?<InfoTip title="AI use">Yes adds an AI-use disclosure that reviewers see. It doesn't block the submission.</InfoTip></span>
                        <YesNo name="Used AI" value={f.usedAi} onChange={v => set({ usedAi: v })} />
                      </div>
                      <div className="rgm-q">
                        <span className="rgm-q-text">Has your department head approved this submission?<InfoTip title="Department head approval">No sends it to your department head first. Review starts after they approve, which adds time.</InfoTip></span>
                        <YesNo name="Department head approved" value={f.headApproved} onChange={v => set({ headApproved: v })} />
                      </div>
                      <div className="rgm-q">
                        <span className="rgm-q-text">Does it include unpublished data or results?<InfoTip title="Unpublished data">Yes adds an intellectual property reviewer to the route.</InfoTip></span>
                        <YesNo name="Unpublished data" value={f.unpublished} onChange={v => set({ unpublished: v })} />
                      </div>
                    </div>
                  </section>

                  <section className="rgm-group" aria-label="Attachments">
                    <EyebrowLabel>Attachments · optional</EyebrowLabel>
                    <div className="rgm-file">
                      <Icon name="description" size={22} color="var(--high-emphasis)" />
                      <span><strong>Project_outline_Castellano.docx</strong><span className="rgm-sub">48 KB · uploaded 9:31 AM · authors read by Approvia AI</span></span>
                      <Button variant="ghost" icon="close" aria-label="Remove file" style={{ marginLeft: 'auto', padding: '0 6px' }} />
                    </div>
                    <DropZone accept="Optional. Most student project proposals don't need one. Accepted: .docx, .pptx, .pdf" newDocumentLabel={null} style={{ padding: '18px 20px' }} />
                  </section>
                </>
              )}
            </div>
          </div>

          {!stopped && (
            <aside className="rgm-rail" aria-label="What your answers trigger">
              <div className="rgm-card">
                <div className="rgm-group">
                  <span className="pp-subsection">What your answers trigger</span>
                  <div className="rgm-rail-list">
                    <div className="rgm-rail-item">
                      <Icon name="group" size={20} color="var(--high-emphasis)" />
                      <span>
                        <strong>Reviewers ({reviewers.length})</strong>
                        {reviewers.length ? reviewers.map(r => <span key={r.s} className="rgm-sub">{r.s} reviewer · {r.dp}</span>) : <span className="rgm-sub">Pick a subdepartment to see who reviews it.</span>}
                      </span>
                    </div>
                    <div className={'rgm-rail-item' + (f.expedited === 'Yes' ? ' rgm-changed' : '')}>
                      <Icon name={f.expedited === 'Yes' ? 'bolt' : 'schedule'} size={20} color="var(--high-emphasis)" />
                      <span>
                        <strong>{f.expedited === 'Yes' ? 'Expedited review' : 'Standard review'}</strong>
                        <span className="rgm-sub">{f.expedited === 'Yes' ? 'The coordinator checks your reason first, then reviewers get a shorter deadline.' : 'Reviewers have 10 business days.'}</span>
                      </span>
                    </div>
                    <div className="rgm-rail-item">
                      <Icon name="event" size={20} color="var(--high-emphasis)" />
                      <span>
                        <strong>Review date {date ? fmt(date) : 'not set'}</strong>
                        {date && <span className="rgm-sub">{bd} business days from today</span>}
                      </span>
                    </div>
                    <div className="rgm-rail-item">
                      <Icon name="school" size={20} color="var(--high-emphasis)" />
                      <span>
                        <strong>{f.proposal}</strong>
                        <span className="rgm-sub">{student ? 'Graduation year confirms intern eligibility.' : 'No graduation year needed.'}</span>
                      </span>
                    </div>
                    <div className="rgm-rail-item">
                      <Icon name="task_alt" size={20} color="var(--high-emphasis)" />
                      <span>
                        <strong>{extras.length ? 'Extra steps (' + extras.length + ')' : 'No extra steps'}</strong>
                        {extras.length
                          ? extras.map(x => <span key={x} className="rgm-sub">{x}</span>)
                          : <span className="rgm-sub">Department head approved, no AI use, no unpublished data.</span>}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

      <div className="rgm-bar">
        <FormActionBar
          style={{ padding: '14px var(--page-gutter)' }}
          left={<span className="rgm-saved"><Icon name="cloud_done" size={18} />Draft saved automatically · 9:42 AM</span>}
          right={stopped ? [<Button key="c" variant="secondary">Cancel</Button>] : [
            <Button key="c" variant="secondary">Cancel</Button>,
            <Button key="s" variant="secondary" icon="save">Save draft</Button>,
            <Button key="p" icon="send">Submit</Button>,
          ]}
        />
      </div>
    </Shell>
  );
}
