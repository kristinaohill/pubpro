import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Checkbox, DetailGrid, FormActionBar, IconButton, MoneyField, Pill, RecordHeader, Select,
  SideTabRail, StatCard, TextField,
} from '../ds/pubpro';
import DateField from '../components/DateField';
import { api } from '../api';
import { STATUS_TONE } from './Publications';
import './VendorProfile.css';

const HEADER_META = ['Primary Contact: Melissa Grant', 'Preferred Vendor: Yes', 'Vendor ID: VEN-0142'];

const TABS = [
  { id: 'overview', label: 'OVERVIEW', icon: 'store' },
  { id: 'ratecards', label: 'RATE CARDS', icon: 'price_change' },
  { id: 'contracts', label: 'CONTRACTS', icon: 'description' },
  { id: 'purchaseorders', label: 'PURCHASE ORDERS', icon: 'assignment' },
  { id: 'invoices', label: 'INVOICES', icon: 'receipt_long' },
  { id: 'publications', label: 'PUBLICATIONS', icon: 'menu_book' },
];

const VENDOR_DETAILS = [
  { label: 'Vendor Name', value: 'Oxford Medical Communications' },
  { label: 'Vendor Type', value: 'Medical Communications Agency' },
  { label: 'Preferred Vendor', value: 'Yes' },
  { label: 'Payment Terms', value: 'Net 30' },
  { label: 'Tax ID', value: 'GB-482910337' },
  { label: 'Address', value: '14 Botley Road, Oxford OX2 0AB, United Kingdom' },
];

const CONTACT_DETAILS = [
  { label: 'Primary Contact', value: 'Melissa Grant' },
  { label: 'Title', value: 'Account Director' },
  { label: 'Email', value: 'm.grant@oxfordmedcomms.com' },
  { label: 'Phone', value: '+44 1865 555 0142' },
];

const RATE_CARDS = [
  { name: 'FY26 Standard Rate Card', type: 'Manuscript — Standard', rate: '$182,000', pricingModel: 'Flat Rate', paymentTrigger: 'Milestone-Based', since: '1/1/2026', status: 'Active' },
  { name: 'FY26 Standard Rate Card', type: 'Manuscript — Expedited', rate: '$238,000', pricingModel: 'Flat Rate', paymentTrigger: 'Milestone-Based', since: '1/1/2026', status: 'Active' },
  { name: 'FY26 Standard Rate Card', type: 'Abstract / Poster', rate: '$64,000', pricingModel: 'Flat Rate', paymentTrigger: 'Lump Sum', since: '1/1/2026', status: 'Active' },
  { name: 'FY26 Preferred Partner Rate Card', type: 'Manuscript — Standard', rate: '$164,000', pricingModel: 'Time & Materials', paymentTrigger: 'Time-Based', since: '1/1/2026', status: 'Active' },
  { name: 'FY25 Standard Rate Card', type: 'Manuscript — Standard', rate: '$174,500', pricingModel: 'Flat Rate', paymentTrigger: 'Milestone-Based', since: '1/1/2025', status: 'Expired' },
];

const RATE_CARD_MILESTONES = {
  'Manuscript — Standard': [
    { name: 'Kick-off', type: 'Milestone', durValue: '', durUnit: 'Days', amount: '$0' },
    { name: 'Outline Development', type: 'Stage', durValue: '10', durUnit: 'Days', amount: '$28,000' },
    { name: 'First Draft', type: 'Stage', durValue: '4', durUnit: 'Weeks', amount: '$62,000' },
    { name: 'Author Review Cycle', type: 'Stage', durValue: '15', durUnit: 'Days', amount: '$46,000' },
    { name: 'Journal Submission', type: 'Milestone', durValue: '', durUnit: 'Days', amount: '$46,000' },
  ],
  'Manuscript — Expedited': [
    { name: 'Kick-off', type: 'Milestone', durValue: '', durUnit: 'Days', amount: '$0' },
    { name: 'Outline Development', type: 'Stage', durValue: '5', durUnit: 'Days', amount: '$38,000' },
    { name: 'First Draft', type: 'Stage', durValue: '10', durUnit: 'Days', amount: '$84,000' },
    { name: 'Author Review Cycle', type: 'Stage', durValue: '8', durUnit: 'Days', amount: '$58,000' },
    { name: 'Journal Submission', type: 'Milestone', durValue: '', durUnit: 'Days', amount: '$58,000' },
  ],
  'Abstract / Poster': [
    { name: 'Kick-off', type: 'Milestone', durValue: '', durUnit: 'Days', amount: '$0' },
    { name: 'Abstract Development', type: 'Stage', durValue: '12', durUnit: 'Days', amount: '$24,000' },
    { name: 'Internal Review', type: 'Stage', durValue: '1', durUnit: 'Weeks', amount: '$12,500' },
    { name: 'Congress Submission', type: 'Milestone', durValue: '', durUnit: 'Days', amount: '$27,500' },
  ],
};

const CONTRACTS = [
  { ref: 'MSA-2026-OXF-0142', type: 'Master Services Agreement', scope: 'All Cardiovascular & Metabolism work', signed: '1/4/2026', expires: '12/31/2027', status: 'Active' },
  { ref: 'MSA-2023-OXF-0089', type: 'Master Services Agreement', scope: 'All publication work, FY2023–2025', signed: '1/9/2023', expires: '12/31/2025', status: 'Expired' },
];

const PURCHASE_ORDERS = [
  { number: 'PO-39880', contractRef: 'MSA-2023-OXF-0089', scope: 'Slug of work — FY2025 admin & printing', pubs: '—', amount: '$44,000', status: 'Closed' },
];

const INVOICES = [];


const PRICING_MODEL_OPTIONS = ['Flat Rate', 'Time & Materials'];
const PAYMENT_TRIGGER_OPTIONS = ['Milestone-Based', 'Time-Based', 'Lump Sum'];
const DURATION_UNIT_OPTIONS = ['Days', 'Weeks', 'Months', 'Years'];
const RATE_CARD_STATUS_OPTIONS = ['Active', 'Expired'];
const CONTRACT_TYPE_OPTIONS = ['Master Services Agreement', 'Statement of Work'];
const CONTRACT_STATUS_OPTIONS = ['Active', 'Expired'];
const PO_STATUS_OPTIONS = ['Open', 'Closed'];
const INVOICE_STATUS_OPTIONS = ['Received', 'Under Review', 'Approved', 'Paid', 'Disputed'];
const CONTRACT_OPTIONS = CONTRACTS.map(c => c.ref);
const PO_OPTIONS = PURCHASE_ORDERS.map(p => p.number);

const INVOICE_TONE = { Received: 'outline', 'Under Review': 'hold', Approved: 'active', Paid: 'active', Disputed: 'cancelled' };
const activeTone = s => (s === 'Active' ? 'active' : 'cancelled');
const poTone = s => (s === 'Open' ? 'active' : 'cancelled');
const parseAmt = s => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const sumAmt = rows => money(rows.reduce((a, v) => a + parseAmt(v.amount), 0));

const emptyRateCard = () => ({
  name: '', type: '', rate: '', pricingModel: 'Flat Rate', paymentTrigger: 'Milestone-Based',
  since: '', status: 'Active', milestones: [{ name: '', percent: '' }],
});

// Compact 30px inputs used inside table rows.
const CELL = { height: 30 };
const val = fn => e => fn(e.target.value);

// A list of editable rows with one row in inline-edit mode at a time.
function useRows(initial) {
  const [rows, setRows] = useState(() => initial.map((r, i) => ({ id: i + 1, ...r })));
  const [nextId, setNextId] = useState(initial.length + 1);
  const [editingId, setEditingId] = useState(null);
  return {
    rows,
    editingId,
    stopEditing: () => setEditingId(null),
    patch: (id, p) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...p } : r))),
    remove: id => {
      setRows(rs => rs.filter(r => r.id !== id));
      setEditingId(e => (e === id ? null : e));
    },
    add: (row, { edit } = {}) => {
      const id = nextId;
      setNextId(id + 1);
      setRows(rs => rs.concat([{ id, ...row }]));
      if (edit) setEditingId(id);
    },
  };
}

function useRateCards() {
  const cards = useRows(RATE_CARDS);
  const [openId, setOpenId] = useState(null);
  const [milestones, setMilestones] = useState(() => Object.fromEntries(
    RATE_CARDS.map((r, i) => [i + 1, (RATE_CARD_MILESTONES[r.type] || []).map(m => ({ ...m }))]),
  ));
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyRateCard);

  const cancel = () => { setAdding(false); setDraft(emptyRateCard()); };
  const patchDraftMilestones = fn => setDraft(d => ({ ...d, milestones: fn(d.milestones) }));

  return {
    cards,
    openId,
    toggleOpen: id => setOpenId(o => (o === id ? null : id)),
    milestones,
    patchMilestone: (cardId, idx, p) => setMilestones(s => ({
      ...s,
      [cardId]: (s[cardId] || []).map((m, i) => (i === idx ? { ...m, ...p } : m)),
    })),
    adding,
    startAdding: () => setAdding(true),
    draft,
    patchDraft: p => setDraft(d => ({ ...d, ...p })),
    patchDraftMilestone: (idx, p) => patchDraftMilestones(ms => ms.map((m, i) => (i === idx ? { ...m, ...p } : m))),
    removeDraftMilestone: idx => patchDraftMilestones(ms => ms.filter((_, i) => i !== idx)),
    addDraftMilestone: () => patchDraftMilestones(ms => ms.concat([{ name: '', percent: '' }])),
    cancel,
    save: () => {
      const n = draft;
      cards.add({
        name: n.name, type: n.type, rate: n.rate, pricingModel: n.pricingModel,
        paymentTrigger: n.paymentTrigger, since: n.since, status: n.status,
        milestones: n.paymentTrigger === 'Milestone-Based' ? n.milestones.filter(m => m.name) : [],
      });
      cancel();
    },
  };
}

const Sym = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{name}</span>
);

function TabHeader({ title, lede, narrow, action }) {
  return (
    <div className="vp-tab-head">
      <div className="vp-tab-head-text">
        <h1 className="vp-title">{title}</h1>
        <p className={`vp-lede${narrow ? ' vp-lede--narrow' : ''}`}>{lede}</p>
      </div>
      {action && <div className="vp-tab-head-action">{action}</div>}
    </div>
  );
}

const Labeled = ({ label, children }) => (
  <div>
    <div className="vp-label">{label}</div>
    {children}
  </div>
);

function DocCell({ name, onUpload }) {
  const onChange = e => {
    const f = e.target.files && e.target.files[0];
    if (f) onUpload(f.name);
  };
  return (
    <div className="vp-shrink">
      {name ? (
        <div className="vp-doc">
          <Sym name="description" className="vp-doc-icon" />
          <span className="vp-doc-name">{name}</span>
        </div>
      ) : (
        <label className="vp-upload">
          <Sym name="upload_file" className="vp-upload-icon" />Upload
          <input type="file" onChange={onChange} hidden />
        </label>
      )}
    </div>
  );
}

function RowActions({ editing, onSave, onRemove }) {
  return (
    <div className="vp-row-actions">
      {editing && <IconButton icon="check_circle" tone="active" size={28} title="Save" onClick={onSave} />}
      <IconButton icon="close" tone="fatal" size={editing ? 28 : 24} title="Delete" onClick={onRemove} />
    </div>
  );
}

const EmptyRow = ({ children }) => <div className="empty-state empty-state--inset">{children}</div>;

const AddRowButton = ({ label, onClick }) => (
  <div className="vp-add-row">
    <Button variant="tertiary" icon="add" onClick={onClick}>{label}</Button>
  </div>
);

/* ---------- Overview ---------- */

function OverviewTab() {
  return (
    <div className="vp-overview">
      <TabHeader
        title="Overview"
        lede="Vendor contact details and agreement status."
        action={<Button variant="secondary" icon="edit">Edit</Button>}
      />
      <div className="vp-stats">
        <StatCard label="Total Contracted" value="$1,284,000" />
        <StatCard label="Paid to Date" value="$806,400" />
        <StatCard label="Outstanding" value="$477,600" valueColor="var(--high-emphasis)" />
      </div>
      <section>
        <h2 className="vp-subtitle">Vendor Details</h2>
        <DetailGrid items={VENDOR_DETAILS} columns={2} framed />
      </section>
      <section>
        <h2 className="vp-subtitle">Primary Contact</h2>
        <DetailGrid items={CONTACT_DETAILS} columns={2} framed />
      </section>
    </div>
  );
}

/* ---------- Rate Cards ---------- */

function NewRateCardForm({ rc }) {
  const d = rc.draft;
  const set = key => val(v => rc.patchDraft({ [key]: v }));
  const total = d.milestones.reduce((a, m) => a + (m.percent || 0), 0);
  const onPercent = i => e => {
    const n = parseInt(String(e.target.value).replace(/[^0-9]/g, ''), 10);
    rc.patchDraftMilestone(i, { percent: isNaN(n) ? '' : n });
  };

  return (
    <div className="vp-card">
      <h2 className="vp-subtitle vp-card-title">New Rate Card</h2>
      <div className="vp-form-grid">
        <Labeled label="Rate Card Name">
          <TextField value={d.name} onChange={set('name')} placeholder="e.g. FY27 Standard Rate Card" width="100%" />
        </Labeled>
        <Labeled label="Deliverable Type">
          <TextField value={d.type} onChange={set('type')} placeholder="e.g. Abstract" width="100%" />
        </Labeled>
        <Labeled label="Rate">
          <MoneyField value={d.rate} onChange={set('rate')} placeholder="0" width="100%" />
        </Labeled>
        <Labeled label="Pricing Model">
          <Select options={PRICING_MODEL_OPTIONS} value={d.pricingModel} onChange={set('pricingModel')} width="100%" />
        </Labeled>
        <Labeled label="Payment Trigger">
          <Select options={PAYMENT_TRIGGER_OPTIONS} value={d.paymentTrigger} onChange={set('paymentTrigger')} width="100%" />
        </Labeled>
        <Labeled label="Effective From">
          <DateField value={d.since} onChange={set('since')} width="100%" />
        </Labeled>
        <Labeled label="Status">
          <Select options={RATE_CARD_STATUS_OPTIONS} value={d.status} onChange={set('status')} width="100%" />
        </Labeled>
      </div>

      {d.paymentTrigger === 'Milestone-Based' && (
        <div className="vp-ms">
          <div className="vp-label vp-ms-label">Milestones</div>
          <div className="vp-ms-list">
            {d.milestones.map((m, i) => (
              <div key={i} className="vp-ms-row">
                <TextField value={m.name} onChange={val(v => rc.patchDraftMilestone(i, { name: v }))} placeholder="e.g. Draft submission" width="100%" />
                <TextField value={m.percent} onChange={onPercent(i)} placeholder="0" align="right" width="100%" />
                <IconButton icon="close" tone="fatal" size={24} title="Remove milestone" onClick={() => rc.removeDraftMilestone(i)} />
              </div>
            ))}
          </div>
          <div className="vp-ms-foot">
            <div className={`vp-ms-total${total === 100 ? ' vp-ms-total--ok' : ''}`}>Milestones total {total}% of rate</div>
            <Button variant="tertiary" onClick={rc.addDraftMilestone}>
              <Sym name="add" className="vp-btn-icon-sm" />Add Milestone
            </Button>
          </div>
        </div>
      )}

      <div className="vp-card-actions">
        <Button variant="secondary" onClick={rc.cancel}>Cancel</Button>
        <Button variant="primary" onClick={rc.save}>Save Rate Card</Button>
      </div>
    </div>
  );
}

function RateCardDetail({ r, rc }) {
  const patch = key => val(v => rc.cards.patch(r.id, { [key]: v }));
  const stages = rc.milestones[r.id] || [];
  return (
    <div className="vp-rc-detail">
      <div className="vp-rc-fields">
        <Labeled label="Deliverable Type">
          <TextField value={r.type} onChange={patch('type')} placeholder="Deliverable type" width="240px" />
        </Labeled>
        <Labeled label="Payment Trigger">
          <Select options={PAYMENT_TRIGGER_OPTIONS} value={r.paymentTrigger} onChange={patch('paymentTrigger')} width="200px" />
        </Labeled>
        <Labeled label="Rate">
          <MoneyField value={r.rate} onChange={patch('rate')} placeholder="0" width="150px" />
        </Labeled>
        <Labeled label="Effective From">
          <DateField value={r.since} onChange={patch('since')} width="150px" />
        </Labeled>
      </div>

      <div className="vp-label vp-stages-label">Milestones &amp; Stages</div>
      <div className="vp-table vp-table--inner">
        <div className="vp-thead vp-grid-stages">
          <div>Stage</div><div>Type</div><div>Duration</div><div>Unit</div><div className="vp-right">Amount</div>
        </div>
        {stages.map((m, i) => (
          <div key={i} className="vp-tr vp-grid-stages">
            <div className="vp-shrink">{m.name}</div>
            <div className="vp-meta">{m.type}</div>
            {m.type === 'Stage' ? (
              <>
                <TextField
                  value={m.durValue}
                  onChange={val(v => rc.patchMilestone(r.id, i, { durValue: String(v).replace(/[^0-9]/g, '') }))}
                  placeholder="0"
                  width="100%"
                  style={CELL}
                />
                <Select
                  options={DURATION_UNIT_OPTIONS}
                  value={m.durUnit}
                  onChange={val(v => rc.patchMilestone(r.id, i, { durUnit: v }))}
                  width="100%"
                  style={CELL}
                />
              </>
            ) : (
              <>
                <div className="vp-disabled">—</div>
                <div />
              </>
            )}
            <div className="vp-right vp-amount">{m.amount}</div>
          </div>
        ))}
      </div>

      <div className="vp-rc-close">
        <Button variant="secondary" onClick={() => rc.toggleOpen(r.id)}>Close</Button>
      </div>
    </div>
  );
}

function RateCardRow({ r, rc }) {
  const open = rc.openId === r.id;
  const isActive = r.status === 'Active';
  const toggle = () => rc.toggleOpen(r.id);
  const onKey = e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggle();
  };
  return (
    <div className="vp-rc">
      <div className="vp-tr vp-grid-rates">
        <div role="button" tabIndex={0} onClick={toggle} onKeyDown={onKey} title="Open rate card" className="vp-rc-open">
          <Sym name={open ? 'expand_less' : 'expand_more'} className="vp-rc-caret" />
          <span className="vp-rc-name">{r.name}</span>
        </div>
        <div className="vp-right vp-amount">{r.rate}</div>
        <div className="vp-meta">{r.pricingModel}</div>
        <div className="vp-meta">{r.since}</div>
        <div className="vp-center">
          <Checkbox checked={isActive} onChange={() => rc.cards.patch(r.id, { status: isActive ? 'Expired' : 'Active' })} />
        </div>
        <RowActions onRemove={() => rc.cards.remove(r.id)} />
      </div>
      {open && <RateCardDetail r={r} rc={rc} />}
    </div>
  );
}

function RateCardsTab({ rc }) {
  return (
    <div>
      <TabHeader
        title="Rate Cards"
        lede="Standard and negotiated rates used when contracting new publication work with this vendor."
      />
      {rc.adding && <NewRateCardForm rc={rc} />}
      <div className="vp-table">
        <div className="vp-thead vp-grid-rates">
          <div>Rate Card</div><div className="vp-right">Rate</div><div>Pricing Model</div><div>Effective From</div><div className="vp-center">Active</div><div />
        </div>
        {rc.cards.rows.map(r => <RateCardRow key={r.id} r={r} rc={rc} />)}
        {rc.cards.rows.length === 0 && <EmptyRow>No rate cards on file for this vendor.</EmptyRow>}
      </div>
      <AddRowButton label="Add Rate Card" onClick={rc.startAdding} />
    </div>
  );
}

/* ---------- Contracts ---------- */

function ContractsTab({ list }) {
  const addContract = () => list.add(
    { ref: '', type: 'Master Services Agreement', scope: '', signed: '', expires: '', status: 'Active' },
    { edit: true },
  );
  return (
    <div>
      <TabHeader
        title="Contracts"
        lede="Master service agreements and statements of work on file for this vendor. A vendor can hold several concurrent contracts, each scoped differently."
      />
      <div className="vp-table">
        <div className="vp-thead vp-grid-contracts">
          <div>Document</div><div>Type</div><div>Scope</div><div>Signed</div><div>Expires</div><div>Status</div><div />
        </div>
        {list.rows.map(c => {
          const editing = list.editingId === c.id;
          const patch = key => val(v => list.patch(c.id, { [key]: v }));
          return (
            <div key={c.id} className="vp-tr vp-grid-contracts">
              <DocCell name={c.docName} onUpload={docName => list.patch(c.id, { docName })} />
              {editing ? (
                <>
                  <Select options={CONTRACT_TYPE_OPTIONS} value={c.type} onChange={patch('type')} width="100%" style={CELL} />
                  <TextField value={c.scope} onChange={patch('scope')} placeholder="Scope" width="100%" style={CELL} />
                  <DateField value={c.signed} onChange={patch('signed')} width="100%" style={CELL} />
                  <DateField value={c.expires} onChange={patch('expires')} width="100%" style={CELL} />
                  <Select options={CONTRACT_STATUS_OPTIONS} value={c.status} onChange={patch('status')} width="100%" style={CELL} />
                </>
              ) : (
                <>
                  <div>{c.type}</div>
                  <div className="vp-wrap">{c.scope}</div>
                  <div className="vp-meta">{c.signed}</div>
                  <div className="vp-meta">{c.expires}</div>
                  <div><Pill tone={activeTone(c.status)}>{c.status}</Pill></div>
                </>
              )}
              <RowActions editing={editing} onSave={list.stopEditing} onRemove={() => list.remove(c.id)} />
            </div>
          );
        })}
        {list.rows.length === 0 && <EmptyRow>No contracts on file for this vendor.</EmptyRow>}
      </div>
      <AddRowButton label="Add Contract" onClick={addContract} />
    </div>
  );
}

/* ---------- Purchase Orders ---------- */

function PurchaseOrdersTab({ list }) {
  const addPO = () => list.add(
    { number: '', contractRef: '', scope: '', pubs: '', amount: '', status: 'Open', docName: '' },
    { edit: true },
  );
  return (
    <div>
      <TabHeader
        title="Purchase Orders"
        lede="Issued by the sponsor against a contract, and referenced by every invoice this vendor submits. A PO can cover a single publication or a slug of work spanning several."
      />
      <div className="vp-table">
        <div className="vp-thead vp-grid-pos">
          <div>PO Number</div><div>Contract</div><div>Scope</div><div>Covers</div><div className="vp-right">Amount</div><div>Status</div><div>Document</div><div />
        </div>
        {list.rows.map(p => {
          const editing = list.editingId === p.id;
          const patch = key => val(v => list.patch(p.id, { [key]: v }));
          return (
            <div key={p.id} className="vp-tr vp-grid-pos">
              {editing ? (
                <>
                  <TextField value={p.number} onChange={patch('number')} placeholder="PO-00000" width="100%" style={CELL} />
                  <Select options={CONTRACT_OPTIONS} value={p.contractRef} onChange={patch('contractRef')} width="100%" style={CELL} />
                  <TextField value={p.scope} onChange={patch('scope')} placeholder="Scope" width="100%" style={CELL} />
                  <TextField value={p.pubs} onChange={patch('pubs')} placeholder="Publications covered" width="100%" style={CELL} />
                  <MoneyField value={p.amount} onChange={patch('amount')} placeholder="0" width="100%" style={CELL} />
                  <Select options={PO_STATUS_OPTIONS} value={p.status} onChange={patch('status')} width="100%" style={CELL} />
                  <div />
                </>
              ) : (
                <>
                  <div className="vp-strong">{p.number}</div>
                  <div className="vp-meta">{p.contractRef}</div>
                  <div>{p.scope}</div>
                  <div className="vp-wrap">{p.pubs}</div>
                  <div className="vp-right vp-amount">{p.amount}</div>
                  <div><Pill tone={poTone(p.status)}>{p.status}</Pill></div>
                  <DocCell name={p.docName} onUpload={docName => list.patch(p.id, { docName })} />
                </>
              )}
              <RowActions editing={editing} onSave={list.stopEditing} onRemove={() => list.remove(p.id)} />
            </div>
          );
        })}
        {list.rows.length === 0 && <EmptyRow>No purchase orders on file for this vendor.</EmptyRow>}
      </div>
      <AddRowButton label="Add Purchase Order" onClick={addPO} />
    </div>
  );
}

/* ---------- Invoices ---------- */

function InvoicesTab({ list }) {
  const addInvoice = () => list.add(
    { number: '', poNumber: PURCHASE_ORDERS[0] ? PURCHASE_ORDERS[0].number : '', received: '', forWork: '', amount: '', status: 'Received' },
    { edit: true },
  );
  const paid = list.rows.filter(v => v.status === 'Paid');
  const open = list.rows.filter(v => v.status !== 'Paid');
  return (
    <div>
      <TabHeader
        title="Invoices"
        narrow
        lede="Payments are driven by invoices this vendor submits for completed work, not automatically by publication milestones. Record each invoice as it arrives and track it to payment."
        action={<Button variant="secondary" icon="add" onClick={addInvoice}>Record Invoice</Button>}
      />
      <div className="vp-stats vp-stats--spaced">
        <StatCard label="Invoiced to Date" value={sumAmt(list.rows)} />
        <StatCard label="Paid" value={sumAmt(paid)} />
        <StatCard label="Awaiting Payment" value={sumAmt(open)} valueColor="var(--high-emphasis)" />
      </div>
      <div className="vp-table">
        <div className="vp-thead vp-grid-invoices">
          <div>Document</div><div>PO Number</div><div>Date Received</div><div>For Work Completed On</div><div className="vp-right">Amount</div><div>Status</div><div />
        </div>
        {list.rows.map(v => {
          const editing = list.editingId === v.id;
          const patch = key => val(x => list.patch(v.id, { [key]: x }));
          return (
            <div key={v.id} className="vp-tr vp-grid-invoices">
              <DocCell name={v.docName} onUpload={docName => list.patch(v.id, { docName })} />
              {editing ? (
                <>
                  <Select options={PO_OPTIONS} value={v.poNumber} onChange={patch('poNumber')} width="100%" style={CELL} />
                  <DateField value={v.received} onChange={patch('received')} width="100%" style={CELL} />
                  <TextField value={v.forWork} onChange={patch('forWork')} placeholder="Describe the completed work, e.g. publication ID or deliverable" width="100%" style={CELL} />
                  <MoneyField value={v.amount} onChange={patch('amount')} placeholder="0" width="100%" style={CELL} />
                  <Select options={INVOICE_STATUS_OPTIONS} value={v.status} onChange={patch('status')} width="100%" style={CELL} />
                </>
              ) : (
                <>
                  <div className="vp-meta">{v.poNumber}</div>
                  <div className="vp-meta">{v.received}</div>
                  <div className="vp-wrap">{v.forWork}</div>
                  <div className="vp-right vp-amount">{v.amount}</div>
                  <div><Pill tone={INVOICE_TONE[v.status] || 'outline'}>{v.status}</Pill></div>
                </>
              )}
              <RowActions editing={editing} onSave={list.stopEditing} onRemove={() => list.remove(v.id)} />
            </div>
          );
        })}
        {list.rows.length === 0 && <EmptyRow>No invoices recorded for this vendor yet.</EmptyRow>}
      </div>
    </div>
  );
}

/* ---------- Publications ---------- */

const VENDOR_NAME = 'Oxford Medical Communications';
const usd = n => '$' + Math.round(n || 0).toLocaleString('en-US');

/** Saved publications that name this vendor on their Planning tab. */
function useVendorPubs() {
  const [pubs, setPubs] = useState(null);
  useEffect(() => {
    api.get('/pp-publications?include=data')
      .then(list => setPubs(list.filter(p => p.data && p.data.vendor === VENDOR_NAME).map(p => {
        const rows = p.data.rows || [];
        const contracted = p.data.planBudget || rows.reduce((a, r) => a + (r.amount || 0), 0);
        const paid = rows.reduce((a, r) => a + (r.paidAmount || (r.status === 'paid' ? r.amount || 0 : 0)), 0);
        return {
          id: p.record_id, savedId: p.id, title: p.title, status: p.status, tone: STATUS_TONE[p.status] || 'draft',
          contracted: usd(contracted), outstanding: usd(Math.max(0, contracted - paid)),
        };
      })))
      .catch(() => setPubs([]));
  }, []);
  return pubs;
}

function PublicationsTab() {
  const navigate = useNavigate();
  const pubs = useVendorPubs();
  const openPub = p => e => { e.preventDefault(); navigate('/publication/' + p.savedId); };
  return (
    <div>
      <TabHeader title="Publications" lede="Publications this vendor is contracted to support." />
      <div className="vp-table">
        <div className="vp-thead vp-grid-pubs">
          <div>Publication ID</div><div>Title</div><div>Status</div><div className="vp-right">Contracted</div><div className="vp-right">Outstanding</div>
        </div>
        {pubs === null && <EmptyRow>Loading…</EmptyRow>}
        {pubs && pubs.length === 0 && <EmptyRow>No publications name {VENDOR_NAME} as their vendor yet.</EmptyRow>}
        {(pubs || []).map(p => (
          <div key={p.id} className="vp-tr vp-grid-pubs">
            <div className="vp-bold"><a href={'/publication/' + p.savedId} onClick={openPub(p)}>{p.id}</a></div>
            <div className="vp-shrink vp-pretty">{p.title}</div>
            <div><Pill tone={p.tone}>{p.status}</Pill></div>
            <div className="vp-right">{p.contracted}</div>
            <div className="vp-right vp-outstanding">{p.outstanding}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function VendorProfile() {
  const [tab, setTab] = useState('overview');
  const rateCards = useRateCards();
  const contracts = useRows(CONTRACTS.map(c => ({ docName: c.ref + '.pdf', ...c })));
  const purchaseOrders = useRows(PURCHASE_ORDERS.map(p => ({ docName: p.number + '.pdf', ...p })));
  const invoices = useRows(INVOICES.map(v => ({ docName: v.number + '.pdf', ...v })));

  return (
    <div className="vp-page">
      <RecordHeader
        icon="store"
        title="Oxford Medical Communications"
        task="Vendor Profile"
        subtitle="Medical Communications Agency"
        meta={HEADER_META}
      />

      <div className="vp-shell">
        <div className="vp-rail">
          <SideTabRail tabs={TABS} active={tab} onSelect={setTab} />
        </div>

        <div className="vp-panel">
          {tab === 'overview' && <OverviewTab />}
          {tab === 'ratecards' && <RateCardsTab rc={rateCards} />}
          {tab === 'contracts' && <ContractsTab list={contracts} />}
          {tab === 'purchaseorders' && <PurchaseOrdersTab list={purchaseOrders} />}
          {tab === 'invoices' && <InvoicesTab list={invoices} />}
          {tab === 'publications' && <PublicationsTab />}
        </div>
      </div>

      <FormActionBar
        left={<Button variant="secondary">Close Without Saving</Button>}
        right={
          <>
            <Button variant="secondary">Save</Button>
            <Button variant="primary">Save &amp; Close</Button>
          </>
        }
      />
    </div>
  );
}
