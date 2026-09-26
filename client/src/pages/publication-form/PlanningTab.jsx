import React from 'react';
import {
  BandHeader, Button, Checkbox, EyebrowLabel, Field, Icon, IconButton, MoneyField, SectionHeading,
  Select, StatCard, TextField,
} from '../../ds/pubpro';
import DateField from '../../components/DateField';
import {
  MILESTONE_TYPE_OPTIONS, NO_VENDOR, RATE_CARD_COSTS, RATE_CARD_OPTIONS, STAGE_TEMPLATE_OPTIONS,
  STATUS_LOOK, TODAY_STR, VENDOR_OPTIONS, money, rescheduleRows,
} from './data';
import { rateCardPatch, stageTemplatePatch } from './state';
import { BoxCheck } from './shared';

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

export default function PlanningTab({ st, set, plans }) {
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

  return (
    <div>
      <SectionHeading style={{ marginBottom: 14 }}>Planning</SectionHeading>
      <div className="pf-stack14 pf-pl22">
        <Field label="Vendor">
          <Select options={VENDOR_OPTIONS} placeholder="Select a vendor" value={st.vendor} onChange={onVendor} width="300px" />
          {!!st.priorVendorName && (
            <div className="pf-note12 pf-mt6 pf-pretty">
              Previously assigned to <strong>{st.priorVendorName}</strong>, reassigned {st.priorVendorDate}. That vendor's financials are not visible here.
            </div>
          )}
        </Field>
        {hasVendor && (
          <Field label="Rate Card">
            <Select options={RATE_CARD_OPTIONS} placeholder="Select a rate card" value={st.rateCard} onChange={onRateCard} width="300px" />
            {rcMismatch && (
              <div className="pf-iconrow pf-mt6 pf-fatal13">
                <Icon name="report" size={17} />
                <span className="pf-strong">{money(rcCost || 0)}</span>
                <span>per this rate card — differs from the {money(st.planBudget || 0)} budgeted for this publication.</span>
              </div>
            )}
          </Field>
        )}
        {st.vendor === NO_VENDOR && (
          <Field label="Stage Template">
            <Select options={STAGE_TEMPLATE_OPTIONS} placeholder="Select a stage template" value={st.stageTemplate} onChange={onStageTemplate} width="300px" />
          </Field>
        )}
        <Field label="Start Date">
          <DateField value={st.pubStart} onChange={onPubStart} width="178px" />
        </Field>
        <Field label="PO Number">
          <TextField value={st.poNumber} onChange={e => set({ poNumber: e.target.value })} placeholder="e.g. PO-40217" width="180px" />
        </Field>
        <Field label="Budget">
          <MoneyField value={st.planBudget ? st.planBudget.toLocaleString('en-US') : ''} onChange={e => set({ planBudget: toInt(e.target.value) })} width="170px" />
          <div className="pf-iconrow pf-mt6 pf-13" style={{ color: diff < 0 ? 'var(--fatal-text)' : 'var(--ok)' }}>
            <Icon name={diff < 0 ? 'report' : 'account_balance_wallet'} size={17} />
            <span className="pf-strong">{money(Math.abs(diff))}</span>
            <span>{diff < 0 ? 'over budget' : 'remaining'}</span>
            <span className="pf-faint-inline">· {money(billableTotal)} allocated across billable lines</span>
          </div>
          <div className="pf-mt14 pf-maxw900">
            {fin.plan ? (
              <>
                <EyebrowLabel style={{ textTransform: 'none', marginBottom: 8 }}>
                  PARENT PLAN · {fin.plan.id + ' ' + fin.plan.name} · READ-ONLY
                </EyebrowLabel>
                <div className="pf-statgrid">
                  <StatCard label="Plan Budget" value={money(fin.plan.budget)} icon="account_balance" />
                  <StatCard label="Planned (No Pub ID)" value={money(fin.plan.planned)} icon="lightbulb" />
                  <StatCard label="Committed (Live Pubs)" value={money(fin.committed)} icon="library_books" />
                  <StatCard label="Remaining" value={money(fin.remaining)} icon="savings" tone={fin.remaining < 0 ? 'fatal' : 'info'} />
                </div>
                <div className="pf-note12 pf-mt6">Remaining = Plan Budget − (Planned + Committed), from the plan&rsquo;s Allocation tab.</div>
              </>
            ) : (
              <div className="pf-note12">
                {st.parentPlan
                  ? 'Parent plan ' + st.parentPlan.id + ' isn\u2019t saved in PubPro, so there are no plan budget figures to show.'
                  : 'No parent plan. Link one on the Overview tab to see its budget here.'}
              </div>
            )}
            {fin.cancelled && (
              <div className="pf-mt14">
                <EyebrowLabel style={{ marginBottom: 8 }}>Publication Cancelled</EyebrowLabel>
                <div className="pf-statgrid pf-statgrid--narrow">
                  <StatCard label="Spent Before Cancellation" value={money(fin.spent)} icon="payments" />
                  <StatCard label="Returned to Plan" value={money(fin.returned)} icon="undo" tone="info" />
                </div>
              </div>
            )}
          </div>
        </Field>
      </div>

      <div className="pf-milestones">
        <BandHeader style={{ border: '1px solid var(--blue-line)', fontSize: 14 }}>Milestones &amp; Stages</BandHeader>
        <div className="pf-ms-body">
          <div className="pf-ms-grid pf-ms-head">
            <div>Name</div>
            <div>Milestone or Stage</div>
            <div>% Complete</div>
            <div>Start Date</div>
            <div>End Date</div>
            <div className="pf-center">Billable</div>
            <div>Contracted / Paid</div>
            <div>Payment Status</div>
            <div>Action</div>
            <div />
          </div>

          {rows.length === 0 && (
            <div className="pf-ms-empty">Choose a vendor and rate card above — or "No Vendor (In-house)" and a stage template — to populate milestones and stages, or add rows manually.</div>
          )}

          {rows.map((r, i) => {
            const status = r.costed ? r.status : 'nocost';
            const look = STATUS_LOOK[status];
            const isPending = status === 'pending';
            const isApproved = status === 'approved';
            const locked = !!r.core || !!(r.costed && hasVendor);
            return (
              <div key={r.id} className="pf-ms-grid pf-ms-row">
                <div className="pf-min0 pf-col pf-gap4">
                  <div style={{ opacity: r.optional && !r.included ? 0.5 : 1 }}>
                    <TextField value={r.name} onChange={e => patchRow(r.id, { name: e.target.value })} placeholder="Name" width="100%" style={{ height: 32 }} />
                  </div>
                  {r.core && <div className="pf-note12 pf-iconrow pf-gap4"><Icon name="lock" size={14} />Core milestone</div>}
                  {r.optional && (
                    <Checkbox
                      checked={r.included !== false}
                      onChange={() => set(s => ({ rows: rescheduleRows(s.rows.map(x => (x.id === r.id ? { ...x, included: !x.included } : x)), s.pubStart) }))}
                      label="Optional — include"
                    />
                  )}
                </div>

                <Select options={MILESTONE_TYPE_OPTIONS} value={r.type} onChange={e => patchRow(r.id, { type: e.target.value })} width="100%" style={{ height: 32 }} />

                <div>
                  {r.type === 'Milestone' && (
                    <BoxCheck on={r.done} onClick={() => patchRow(r.id, { done: !r.done, doneOn: r.done ? '' : TODAY_STR })} size={18} fill="var(--high-emphasis)" tick={15} />
                  )}
                  {r.type === 'Stage' && (
                    <TextField value={r.pct} onChange={e => patchRow(r.id, { pct: e.target.value })} width="100%" align="right" style={{ height: 32 }} />
                  )}
                </div>

                <TextField value={r.start} onChange={e => patchRow(r.id, { start: e.target.value })} placeholder="m/d/yyyy" width="100%" style={{ height: 32 }} />
                <TextField value={r.end} onChange={e => patchRow(r.id, { end: e.target.value })} placeholder="—" width="100%" style={{ height: 32 }} />

                <div className="pf-justify-center">
                  <BoxCheck on={!!r.costed} onClick={() => patchRow(r.id, { costed: !r.costed })} />
                </div>

                <div>
                  {r.costed && r.status !== 'paid' && (
                    <MoneyField value={r.amount ? r.amount.toLocaleString('en-US') : ''} onChange={e => patchRow(r.id, { amount: toInt(e.target.value) })} placeholder="0" width="100%" style={{ height: 32 }} />
                  )}
                  {r.costed && r.status === 'paid' && (
                    <div title="Locked once paid" className="pf-paid-locked">
                      <Icon name="lock" size={15} color="var(--text-meta)" />${r.amount ? r.amount.toLocaleString('en-US') : ''}
                    </div>
                  )}
                  {!r.costed && <div className="pf-dash">—</div>}
                </div>

                <div className="pf-paystatus" style={{ color: look.statusColor }}>
                  <Icon name={look.markIcon} size={17} color={look.markColor} />{look.statusLabel}
                </div>

                <div className="pf-row pf-wrap pf-gap6">
                  {isPending && <Button variant="primary" onClick={() => patchRow(r.id, { status: 'approved' })}>Approve</Button>}
                  {isPending && <Button variant="fatal" onClick={() => patchRow(r.id, { status: 'returned' })}>Return</Button>}
                  {isApproved && <Button variant="primary" onClick={() => patchRow(r.id, { status: 'queued' })}>Initiate Payment</Button>}
                  {!isPending && !isApproved && <span className="pf-faint13">{look.noActionLabel}</span>}
                </div>

                <div className="pf-row pf-gap6 pf-justify-end">
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
            );
          })}

          <div className="pf-row pf-mt12">
            <div className="pf-ml-auto">
              <Button variant="tertiary" onClick={addRow}>Add Row</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
