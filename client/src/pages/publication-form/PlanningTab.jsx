import React from 'react';
import {
  Button, Checkbox, EyebrowLabel, Icon, IconButton, MoneyField, Select, StatCard, TextField,
} from '../../ds/pubpro';
import DateField from '../../components/DateField';
import {
  MILESTONE_TYPE_OPTIONS, NO_VENDOR, RATE_CARD_COSTS, RATE_CARD_OPTIONS, STAGE_TEMPLATE_OPTIONS,
  STATUS_LOOK, TODAY_STR, VENDOR_OPTIONS, money, rescheduleRows,
} from './data';
import { rateCardPatch, stageTemplatePatch } from './state';
import { BoxCheck } from './shared';
import KickoffCard from './KickoffCard';
import { KICKOFF, needsKickoff } from './kickoff';
import { Card, ColHead, FormField, ListBox, ListRow, Pair, Stack, TabHead } from './ui';
import './tabs-c.css';

const toInt = v => {
  const n = parseInt(String(v).replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? 0 : n;
};

/**
 * Roll-up of the saved parent plan (budget, planned ideas, committed allocations and fees), the
 * same figures as the plan's Allocation tab. `plan` is null when no saved plan is linked.
 */
export function planFinancials(st, plan) {
  const cancelled = st.outcomeStatus === 'Cancelled';
  const spent = st.rows.reduce((a, r) => a + ((r.status === 'paid' || r.status === 'queued') ? (r.paidAmount || r.amount || 0) : (r.paidAmount || 0)), 0);
  const returned = Math.max(0, st.planBudget - spent);
  if (!plan) return { cancelled, spent, returned, plan: null };
  const committed = plan.committed - (cancelled ? returned : 0);
  const remaining = plan.budget - (plan.planned + committed);
  return { cancelled, spent, returned, committed, remaining, plan };
}

export default function PlanningTab({ st, set, plans, commit, saving, userName, record }) {
  const rows = st.rows;
  const hasVendor = !!st.vendor && st.vendor !== NO_VENDOR;
  const billableTotal = rows.filter(r => r.costed).reduce((a, r) => a + (r.amount || 0), 0);
  const diff = st.planBudget - billableTotal;
  const rcCost = RATE_CARD_COSTS[st.rateCard];
  const rcMismatch = rcCost != null && rcCost !== st.planBudget;
  const parentPlan = st.parentPlan && (plans || []).find(p => p.id === st.parentPlan.id);
  const fin = planFinancials(st, parentPlan || null);

  const patchRow = (id, p) => set(s => ({ rows: s.rows.map(x => (x.id === id ? { ...x, ...p } : x)) }));
  const moveRow = (idx, dir) => set(s => {
    const list = s.rows.slice();
    const j = idx + dir;
    if (j < 0 || j >= list.length) return null;
    [list[idx], list[j]] = [list[j], list[idx]];
    return { rows: list };
  });

  const onVendor = e => {
    const v = e.target.value;
    set(s => (v === NO_VENDOR
      ? { vendor: v, rateCard: '', ...stageTemplatePatch(s, s.stageTemplate) }
      : { vendor: v, stageTemplate: '', ...rateCardPatch(s, v, s.rateCard) }));
  };
  const onRateCard = e => {
    const rc = e.target.value;
    set(s => ({ rateCard: rc, ...rateCardPatch(s, s.vendor, rc) }));
  };
  const onStageTemplate = e => {
    const t = e.target.value;
    set(s => ({ stageTemplate: t, ...stageTemplatePatch(s, t) }));
  };
  const onPubStart = e => {
    const d = e.target.value;
    set(s => {
      const vendorSet = !!s.vendor && s.vendor !== NO_VENDOR;
      if (vendorSet) return { pubStart: d, ...rateCardPatch(s, s.vendor, s.rateCard, d) };
      if (s.vendor === NO_VENDOR) return { pubStart: d, ...stageTemplatePatch(s, s.stageTemplate, d) };
      return { pubStart: d };
    });
  };
  const addRow = () => set(s => ({
    nextRowId: s.nextRowId + 1,
    rows: s.rows.concat([{ id: s.nextRowId, name: '', type: 'Milestone', done: false, pct: '', start: '', end: '', costed: false, amount: 0, status: 'notmet' }]),
  }));

  // V2 (GPP): the kick-off milestone is ticked by recording the meeting, and the steps after it
  // stay locked until it's done (abstracts and manuscripts).
  const gated = needsKickoff(st);
  const kickIdx = gated ? rows.findIndex(r => r.name && KICKOFF.test(r.name) && !(r.optional && !r.included)) : -1;
  const kickDone = kickIdx < 0 || !!rows[kickIdx].done;
  const lockedByKickoff = i => gated && kickIdx >= 0 && !kickDone && i > kickIdx;

  // Dot per row, as in the record header's timeline: included rows in order, the first not-done one is current.
  const stepRows = rows.filter(r => r.name && !(r.optional && !r.included));
  const ci = st.returnedToSubmission ? stepRows.length - 1 : stepRows.findIndex(r => !r.done);
  const dotOf = r => {
    const k = stepRows.indexOf(r);
    if (k < 0) return 'upcoming';
    if (k === ci) return 'current';
    return (st.returnedToSubmission ? k < ci : r.done) ? 'done' : 'upcoming';
  };

  const secondSlot = hasVendor ? (
    <FormField
      id="pf-ratecard"
      label="Rate Card"
      help={rcMismatch && (
        <span className="pfxc-alert">
          <Icon name="report" size={16} />
          <span><span className="pf-strong">{money(rcCost || 0)}</span> per this rate card — differs from the {money(st.planBudget || 0)} budgeted for this publication.</span>
        </span>
      )}
    >
      <Select id="pf-ratecard" options={RATE_CARD_OPTIONS} placeholder="Select a rate card" value={st.rateCard} onChange={onRateCard} width="100%" />
    </FormField>
  ) : st.vendor === NO_VENDOR ? (
    <FormField id="pf-stagetemplate" label="Stage Template">
      <Select id="pf-stagetemplate" options={STAGE_TEMPLATE_OPTIONS} placeholder="Select a stage template" value={st.stageTemplate} onChange={onStageTemplate} width="100%" />
    </FormField>
  ) : <div />;

  return (
    <Stack>
      <TabHead title="Planning" sub="Vendor, schedule and budget for this publication." />

      <Card title="Vendor and schedule">
        <Pair>
          <FormField
            id="pf-vendor"
            label="Vendor"
            help={!!st.priorVendorName && (
              <span className="pf-pretty">
                Previously assigned to <strong>{st.priorVendorName}</strong>, reassigned {st.priorVendorDate}. That vendor's financials are not visible here.
              </span>
            )}
          >
            <Select id="pf-vendor" options={VENDOR_OPTIONS} placeholder="Select a vendor" value={st.vendor} onChange={onVendor} width="100%" />
          </FormField>
          {secondSlot}
        </Pair>
        <Pair>
          <FormField id="pf-pubstart" label="Start Date">
            <DateField id="pf-pubstart" value={st.pubStart} onChange={onPubStart} width="100%" />
          </FormField>
          <FormField id="pf-po" label="PO Number">
            <TextField id="pf-po" value={st.poNumber} onChange={e => set({ poNumber: e.target.value })} placeholder="e.g. PO-40217" width="100%" />
          </FormField>
        </Pair>
        <Pair>
          <FormField
            id="pf-budget"
            label="Budget"
            help={(
              <span>
                <span className={'pfxc-budget ' + (diff < 0 ? 'pfxc-budget--over' : 'pfxc-budget--ok')}>
                  {diff < 0 && <Icon name="report" size={15} />}
                  {money(Math.abs(diff))} {diff < 0 ? 'over budget' : 'remaining'}
                </span>
                {' '}· {money(billableTotal)} allocated across billable lines
              </span>
            )}
          >
            <MoneyField id="pf-budget" value={st.planBudget ? st.planBudget.toLocaleString('en-US') : ''} onChange={e => set({ planBudget: toInt(e.target.value) })} width="100%" style={{ boxSizing: 'border-box' }} />
          </FormField>
          <div className="pfx-field">
            <span className="pfx-label">Parent plan</span>
            {fin.plan ? (
              <>
                <div className="pfx-help">{fin.plan.id + ' ' + fin.plan.name} · Read-only</div>
                <div className="pfxc-statgrid">
                  <StatCard label="Plan Budget" value={money(fin.plan.budget)} icon="account_balance" />
                  <StatCard label="Planned (No Pub ID)" value={money(fin.plan.planned)} icon="lightbulb" />
                  <StatCard label="Committed (Live Pubs)" value={money(fin.committed)} icon="library_books" />
                  <StatCard label="Remaining" value={money(fin.remaining)} icon="savings" tone={fin.remaining < 0 ? 'fatal' : 'info'} />
                </div>
                <div className="pfx-help">Remaining = Plan Budget − (Planned + Committed), from the plan&rsquo;s Allocation tab.</div>
              </>
            ) : (
              <div className="pfxc-note">
                {st.parentPlan
                  ? 'Parent plan ' + st.parentPlan.id + ' isn’t saved in PubPro, so there are no plan budget figures to show.'
                  : 'No parent plan. Link one on the Overview tab to see its budget here.'}
              </div>
            )}
          </div>
        </Pair>
        {fin.cancelled && (
          <div className="pfx-field">
            <EyebrowLabel>Publication Cancelled</EyebrowLabel>
            <div className="pfxc-statgrid">
              <StatCard label="Spent Before Cancellation" value={money(fin.spent)} icon="payments" />
              <StatCard label="Returned to Plan" value={money(fin.returned)} icon="undo" tone="info" />
            </div>
          </div>
        )}
      </Card>

      <KickoffCard st={st} set={set} />

      <Card title="Milestones and stages">
        {rows.length === 0 ? (
          <div className="pfxc-note">Choose a vendor and rate card above — or "No Vendor (In-house)" and a stage template — to populate milestones and stages, or add rows manually.</div>
        ) : (
          <>
            <ColHead cols={[['', '10px'], ['Step', ''], ['Dates', '112px'], ['Progress', '76px'], ['Billing', '92px'], ['', '102px']]} />
            <ListBox>
              {rows.map((r, i) => {
                const status = r.costed ? r.status : 'nocost';
                const look = STATUS_LOOK[status];
                const isPending = status === 'pending';
                const isApproved = status === 'approved';
                const locked = !!r.core || !!(r.costed && hasVendor);
                const dot = dotOf(r);
                return (
                  <ListRow key={r.id} current={dot === 'current'} className="pfxc-msrow">
                    <div className="pfxc-ms-main">
                      <span className={'pfxc-dot pfxc-dot--' + dot} aria-hidden="true" />

                      <div className="pfxc-ms-step">
                        <div style={{ opacity: r.optional && !r.included ? 0.5 : 1 }}>
                          <TextField value={r.name} onChange={e => patchRow(r.id, { name: e.target.value })} placeholder="Name" width="100%" style={{ height: 32 }} aria-label="Name" />
                        </div>
                        <div className="pfxc-ms-sub">
                          <Select options={MILESTONE_TYPE_OPTIONS} value={r.type} onChange={e => patchRow(r.id, { type: e.target.value })} width="108px" style={{ height: 30, padding: '4px 6px', fontSize: 13 }} aria-label="Milestone or Stage" />
                          {r.core && <span className="pfxc-core"><Icon name="lock" size={14} />Core milestone</span>}
                          {r.optional && (
                            <Checkbox
                              checked={r.included !== false}
                              onChange={() => set(s => ({ rows: rescheduleRows(s.rows.map(x => (x.id === r.id ? { ...x, included: !x.included } : x)), s.pubStart) }))}
                              label="Optional — include"
                              size={15}
                              style={{ fontSize: 12, gap: 6, color: 'var(--pfx-meta)' }}
                            />
                          )}
                        </div>
                      </div>

                      <div className="pfxc-ms-dates">
                        <TextField value={r.start} onChange={e => patchRow(r.id, { start: e.target.value })} placeholder="m/d/yyyy" width="100%" style={{ height: 30 }} aria-label="Start Date" />
                        <TextField value={r.end} onChange={e => patchRow(r.id, { end: e.target.value })} placeholder="—" width="100%" style={{ height: 30 }} aria-label="End Date" />
                      </div>

                      <div className="pfxc-ms-progress">
                        {gated && i === kickIdx ? (
                          <span className="pfxc-inline-check" title="Completed by recording the kick-off on the Kick-off tab">
                            <Icon name={r.done ? 'check_circle' : 'event'} size={18} color={r.done ? 'var(--ok)' : 'var(--fg-3)'} />
                            {r.done ? 'Held' : 'On Kick-off tab'}
                          </span>
                        ) : lockedByKickoff(i) ? (
                          <span className="pfxc-inline-check pfxc-kick-lock" title="Record the kick-off meeting first (V2, GPP)">
                            <Icon name="lock" size={16} color="var(--fg-3)" />After kick-off
                          </span>
                        ) : (
                          <>
                            {r.type === 'Milestone' && (
                              <span className="pfxc-inline-check">
                                <BoxCheck on={r.done} onClick={() => patchRow(r.id, { done: !r.done, doneOn: r.done ? '' : TODAY_STR })} size={18} fill="var(--high-emphasis)" tick={15} title="Done" />
                                Done
                              </span>
                            )}
                            {r.type === 'Stage' && (
                              <TextField value={r.pct} onChange={e => patchRow(r.id, { pct: e.target.value })} width="100%" align="right" style={{ height: 30 }} aria-label="% Complete" />
                            )}
                          </>
                        )}
                      </div>

                      <div className="pfxc-ms-billing">
                        <span className="pfxc-inline-check">
                          <BoxCheck on={!!r.costed} onClick={() => patchRow(r.id, { costed: !r.costed })} title="Billable" />
                          Billable
                        </span>
                      </div>

                      <div className="pfxc-ms-actions">
                        <IconButton
                          icon="arrow_upward"
                          tone="primary"
                          shape="pill"
                          size={30}
                          title="Move up"
                          onClick={() => moveRow(i, -1)}
                          style={i === 0 ? { background: 'var(--fg-disabled)' } : undefined}
                        />
                        <IconButton
                          icon="arrow_downward"
                          tone="primary"
                          shape="pill"
                          size={30}
                          title="Move down"
                          onClick={() => moveRow(i, 1)}
                          style={i === rows.length - 1 ? { background: 'var(--fg-disabled)' } : undefined}
                        />
                        {!locked && (
                          <IconButton
                            icon="close"
                            tone="fatal"
                            shape="pill"
                            size={30}
                            title="Remove"
                            onClick={() => set(s => ({ rows: s.rows.filter(x => x.id !== r.id) }))}
                          />
                        )}
                        {locked && (
                          <span className="pf-lockpill" title={r.core ? "Core milestone — can't be removed" : "Payable milestones from the rate card can't be removed"}>
                            <Icon name="lock" size={15} color="var(--text-meta)" />
                          </span>
                        )}
                      </div>
                    </div>

                    {r.costed && (
                      <div className="pfxc-ms-bill">
                        <div className="pfxc-ms-amount">
                          <span className="pfxc-mini-label">Contracted / Paid</span>
                          {r.status !== 'paid' && (
                            <MoneyField value={r.amount ? r.amount.toLocaleString('en-US') : ''} onChange={e => patchRow(r.id, { amount: toInt(e.target.value) })} placeholder="0" width="130px" style={{ height: 32, boxSizing: 'border-box' }} aria-label="Contracted / Paid" />
                          )}
                          {r.status === 'paid' && (
                            <div title="Locked once paid" className="pf-paid-locked">
                              <Icon name="lock" size={15} color="var(--text-meta)" />${r.amount ? r.amount.toLocaleString('en-US') : ''}
                            </div>
                          )}
                        </div>
                        <div className="pf-paystatus pfxc-ms-status" style={{ color: look.statusColor }}>
                          <Icon name={look.markIcon} size={17} color={look.markColor} />{look.statusLabel}
                        </div>
                        <div className="pfxc-ms-payactions">
                          {isPending && <Button variant="primary" onClick={() => patchRow(r.id, { status: 'approved' })}>Approve</Button>}
                          {isPending && <Button variant="fatal" onClick={() => patchRow(r.id, { status: 'returned' })}>Return</Button>}
                          {isApproved && <Button variant="primary" onClick={() => patchRow(r.id, { status: 'queued' })}>Initiate Payment</Button>}
                          {!isPending && !isApproved && <span className="pf-faint13">{look.noActionLabel}</span>}
                        </div>
                      </div>
                    )}
                  </ListRow>
                );
              })}
            </ListBox>
          </>
        )}
        <div>
          <Button variant="tertiary" icon="add" onClick={addRow}>Add Row</Button>
        </div>
      </Card>
    </Stack>
  );
}
