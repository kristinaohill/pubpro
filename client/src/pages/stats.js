// Portfolio figures for the dashboard and the Financial Report, worked out from saved records
// (publications and plans loaded with their full data).
import { NO_VENDOR, parseDate } from './publication-form/data';
import { invitationsSent, openRoundOf } from './publication-form/state';

// SQLite stores UTC as "YYYY-MM-DD HH:MM:SS".
export const savedDate = s => (s ? new Date(s.replace(' ', 'T') + 'Z') : null);

const sum = (xs, f) => xs.reduce((a, x) => a + (f(x) || 0), 0);
const countBy = (xs, key) => {
  const m = new Map();
  xs.forEach(x => { const k = key(x); if (k) m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};

const PAID = ['paid', 'queued'];
const AWAITING = ['pending', 'approved', 'returned'];
const SUBMITTED_OUTCOMES = ['Submitted', 'Changes Requested', 'Accepted', 'Rejected'];

/** One publication's facts: stage, dates, money, classification. */
export function pubFacts(p) {
  const st = p.data || {};
  const rows = (st.rows || []).filter(r => !(r.optional && !r.included));
  const rowDone = name => rows.find(r => r.name === name && r.done);
  const outcome = st.outcomeStatus || '';
  const cancelled = p.status === 'Cancelled' || outcome === 'Cancelled';
  const withdrawn = !cancelled && outcome === 'Withdrawn';
  const submissionRow = rowDone('Submission');
  const approved = !cancelled && !withdrawn
    && (!!rowDone('Internal Release Approval') || !!submissionRow || SUBMITTED_OUTCOMES.includes(outcome));
  const stage = cancelled ? 'Cancelled' : withdrawn ? 'Withdrawn' : approved ? 'Approved' : openRoundOf(st) ? 'In Review' : invitationsSent(st) ? 'Active' : 'Draft';
  const costed = rows.filter(r => r.costed);
  const amt = r => (PAID.includes(r.status) ? (r.paidAmount || r.amount || 0) : (r.amount || 0));
  const money = {
    contracted: sum(costed, r => r.amount),
    paid: sum(costed.filter(r => PAID.includes(r.status)), amt),
    awaiting: sum(costed.filter(r => AWAITING.includes(r.status)), r => r.amount),
    notDue: sum(costed.filter(r => r.status === 'notmet'), r => r.amount),
  };
  return {
    p, st, stage, cancelled, withdrawn, approved, outcome,
    id: p.record_id,
    title: p.title,
    type: p.pub_type,
    product: p.product || '',
    ta: (st.fields && st.fields.therapeuticArea) || '',
    owner: p.owner || '',
    vendor: st.vendor && st.vendor !== NO_VENDOR ? st.vendor : '',
    created: savedDate(p.created_at),
    submitted: submissionRow ? parseDate(submissionRow.doneOn || submissionRow.end || submissionRow.start) : null,
    disposition: !!st.dispositionRecorded,
    resubmit: !!st.returnedToSubmission,
    rejections: (st.rejectionHistory || []).length,
    costed,
    money,
  };
}

// ---- Date ranges ---------------------------------------------------------------

/** [from, to) for the dashboard's range picker; null means no limit. */
export function rangeBounds(range, fromStr, toStr, now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth();
  switch (range) {
    case 'this_month': return [new Date(y, m, 1), new Date(y, m + 1, 1)];
    case 'last_month': return [new Date(y, m - 1, 1), new Date(y, m, 1)];
    case 'this_year': return [new Date(y, 0, 1), new Date(y + 1, 0, 1)];
    case 'last_year': return [new Date(y - 1, 0, 1), new Date(y, 0, 1)];
    case 'custom': {
      const f = parseDate(fromStr), t = parseDate(toStr);
      return [f, t ? new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1) : null];
    }
    default: return [null, null];
  }
}
export const inBounds = (d, [from, to]) => !!d && (!from || d >= from) && (!to || d < to);

export const rangeLabel = ([from, to]) => {
  const f = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!from && !to) return 'all dates';
  if (!to) return 'since ' + f(from);
  const last = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 1);
  return from ? f(from) + ' – ' + f(last) : 'through ' + f(last);
};

// ---- Dashboard figures ------------------------------------------------------------

export function pipeline(facts) {
  const n = stage => facts.filter(f => f.stage === stage).length;
  return {
    total: facts.length,
    draft: n('Draft'),
    active: n('Active'),
    inReview: n('In Review'),
    // PubPro has no suspended state yet; the tile stays at zero.
    suspended: 0,
    approved: n('Approved'),
    withdrawn: n('Withdrawn'),
    cancelled: n('Cancelled'),
  };
}

export function finance(facts) {
  const live = facts.filter(f => !f.cancelled && f.costed.length);
  const contracted = sum(live, f => f.money.contracted);
  const paid = sum(live, f => f.money.paid);
  const awaiting = sum(live, f => f.money.awaiting);
  const notDue = sum(live, f => f.money.notDue);
  const vendors = new Set(live.map(f => f.vendor).filter(Boolean));
  return { contracted, paid, awaiting, notDue, outstanding: contracted - paid, pubCount: live.length, vendorCount: vendors.size };
}

/** Plan money: budget, and committed = publication allocations + plan-level fees. */
export function planFacts(plan) {
  const d = plan.data || {};
  const ov = d.overview || {};
  const fees = sum(d.fees || [], f => f.amount);
  const allocated = sum(Object.values(d.allocations || {}), n => n);
  return {
    plan, id: plan.plan_id, title: plan.title, status: plan.status,
    ta: ov.ta || '', product: ov.product || plan.product || '',
    budget: d.planBudget || 0, committed: fees + allocated, owner: plan.owner || '',
  };
}

export function utilization(plans) {
  const live = plans.map(planFacts).filter(p => p.status !== 'Cancelled' && (p.budget || p.committed));
  const by = new Map();
  live.forEach(p => {
    const k = p.ta || 'No therapeutic area';
    const cur = by.get(k) || { area: k, budget: 0, committed: 0, plans: 0 };
    cur.budget += p.budget; cur.committed += p.committed; cur.plans += 1;
    by.set(k, cur);
  });
  return [...by.values()].sort((a, b) => b.budget - a.budget);
}

/** Drafts started and publications submitted per month, for the 12 months ending this month. */
export function activity(facts, now = new Date()) {
  const months = [];
  for (let i = 11; i >= 0; i -= 1) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  const idx = d => (d ? months.findIndex(m => d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth()) : -1);
  const started = months.map(() => 0);
  const submitted = months.map(() => 0);
  facts.forEach(f => {
    const a = idx(f.created); if (a >= 0) started[a] += 1;
    const b = idx(f.submitted); if (b >= 0) submitted[b] += 1;
  });
  const label = d => d.toLocaleDateString('en-US', { month: 'short' });
  const yearLabel = d => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return {
    months: months.map(label),
    range: yearLabel(months[0]) + ' – ' + yearLabel(months[11]),
    series: [
      { label: 'Drafts Started', color: 'var(--high-emphasis)', values: started },
      { label: 'Publications Submitted', color: 'var(--bpl-teal)', values: submitted },
    ],
  };
}

export function portfolio(facts) {
  const live = facts.filter(f => !f.cancelled);
  const types = countBy(live, f => f.type).map(([type, total]) => [type, total, live.filter(f => f.type === type && f.approved).length]);
  return {
    products: countBy(live, f => f.product || 'No product'),
    areas: countBy(live, f => f.ta || 'No therapeutic area'),
    types,
  };
}

export function outcomes(facts) {
  const outcomeStatus = countBy(facts, f => (f.cancelled ? 'Cancelled' : f.outcome));
  const accepted = facts.filter(f => f.outcome === 'Accepted').length;
  const rejected = facts.filter(f => f.outcome === 'Rejected' || f.rejections > 0).length;
  const published = facts.filter(f => f.disposition && f.type === 'Manuscript').length;
  const presented = facts.filter(f => f.disposition && f.type !== 'Manuscript').length;
  const resubmit = facts.filter(f => f.resubmit).length;
  return [
    { title: 'Outcome Status', icon: 'area_chart', data: outcomeStatus },
    { title: 'Outcome', icon: 'fact_check', data: [['Accepted', accepted], ['Rejected', rejected]].filter(d => d[1]) },
    { title: 'Final Disposition', icon: 'flag', data: [['Presented', presented], ['Published', published], ['Resubmit', resubmit]].filter(d => d[1]) },
  ];
}
