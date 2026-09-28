import React, { useState } from 'react';
import { AIActionButton, Button, Icon, Pill } from '../../ds/pubpro';
import { activeChecklist, checklistKey, deriveReadiness } from './state';
import { BoxCheck } from './shared';
import { Card, ListBox, ListRow, Stack, TabHead, Tag } from './ui';
import './tabs-d.css';

const barWidth = pct => (Number.isFinite(pct) ? pct : 0) + '%';

/** Submission Readiness (same data as shared.jsx's ReadinessPanel, in the redesign's card). */
function ReadinessCard({ r, onCheck }) {
  return (
    <Card
      title="Submission readiness"
      actions={r.readinessHasItems && <AIActionButton onClick={onCheck}>AI: Check Submission Readiness</AIActionButton>}
    >
      <div className={'pfxd-ready-count' + (r.readinessHasItems ? '' : ' pfxd-ready-count--ok')}>
        <strong>{r.readinessCount}</strong> · {r.checklistKindLabel}
      </div>
      {r.readinessHasItems && (
        <>
          <ListBox>
            {r.readinessItems.map(item => (
              <ListRow key={item.id} className="pfxd-ready-row">
                <div className="pfxd-grow">
                  <span className="pfxd-ready-label">{item.label}</span>
                  <span className="pfxd-note">{item.group}</span>
                </div>
                <Pill tone={item.tone}>{item.result}</Pill>
              </ListRow>
            ))}
          </ListBox>
          {(r.readinessMore || r.readinessSummary) && (
            <div className="pfxd-note">{r.readinessMore} {r.readinessSummary}</div>
          )}
        </>
      )}
    </Card>
  );
}

export default function ComplianceTab({ st, set }) {
  const KEY = checklistKey(st);
  const CL = activeChecklist(st);
  const done = CL.filter(i => i.done).length;
  const pct = Math.round(done / CL.length * 100);
  const groups = Array.from(new Set(CL.map(i => i.group)));
  const toggle = id => set(s => ({ [KEY]: s[KEY].map(x => (x.id === id ? { ...x, done: !x.done } : x)) }));
  const r = deriveReadiness(st);

  // Expanded/collapsed groups: local UI state only. A group starts open when any of its
  // items has an owner or is done.
  const [openGroups, setOpenGroups] = useState({});
  const isOpen = (g, items) => (g in openGroups ? openGroups[g] : items.some(i => i.owner || i.done));
  const flip = (g, items) => setOpenGroups(o => ({ ...o, [g]: !isOpen(g, items) }));

  return (
    <Stack>
      <TabHead
        title="Compliance"
        sub={r.checklistKindLabel}
        actions={(
          <div className="pfxd-progress">
            <span className="pfxd-progress-label">{done} of {CL.length} complete · {pct}%</span>
            <span className="pfxd-bar" aria-hidden="true"><span style={{ width: barWidth(pct) }} /></span>
          </div>
        )}
      />

      <ReadinessCard r={r} onCheck={() => set({ readinessChecked: true })} />

      <Card title="Checklist" meta={`${groups.length} group${groups.length === 1 ? '' : 's'} · ${CL.length} item${CL.length === 1 ? '' : 's'}`}>
        <ListBox>
          {groups.map(g => {
            const items = CL.filter(i => i.group === g);
            const groupDone = items.filter(i => i.done).length;
            const open = isOpen(g, items);
            return (
              <div key={g} className={'pfxd-group' + (open ? ' pfxd-group--open' : '')}>
                <div className="pfxd-group-head">
                  <button
                    type="button"
                    className="pfxd-group-toggle"
                    aria-expanded={open}
                    aria-label={(open ? 'Collapse ' : 'Expand ') + g}
                    onClick={() => flip(g, items)}
                  >
                    <Icon name={open ? 'expand_less' : 'expand_more'} size={20} />
                  </button>
                  <span className="pfxd-group-name">{g}</span>
                  <span className="pfxd-bar" aria-hidden="true">
                    <span style={{ width: barWidth(Math.round(groupDone / items.length * 100)) }} />
                  </span>
                  <span className="pfxd-group-count">{groupDone} of {items.length} complete</span>
                </div>
                {open && items.map(i => (
                  <div key={i.id} className={'pfxd-item' + (i.done ? ' pfxd-item--done' : '')}>
                    <div className="pfxd-item-check">
                      <BoxCheck on={i.done} onClick={() => toggle(i.id)} fill="var(--ok)" />
                    </div>
                    <div className="pfxd-item-label">{i.label}</div>
                    <div className="pfxd-item-owner pfxd-ellipsis">{i.owner}</div>
                    <div className="pfxd-item-due">{i.due}</div>
                    <div className="pfxd-item-req">
                      <Tag tone={i.required ? 'red' : 'outline'}>{i.required ? 'Required' : 'Optional'}</Tag>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </ListBox>
        <div className="pfxd-actions">
          <Button variant="tertiary">Add Checklist Item</Button>
          <span className="pfxd-push"><Button variant="secondary">Export Checklist</Button></span>
        </div>
      </Card>
    </Stack>
  );
}
