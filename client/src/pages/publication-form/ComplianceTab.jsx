import React from 'react';
import { BandHeader, Button, SectionHeading } from '../../ds/pubpro';
import { activeChecklist, checklistKey, deriveReadiness } from './state';
import { BoxCheck, ReadinessPanel } from './shared';

export default function ComplianceTab({ st, set }) {
  const KEY = checklistKey(st);
  const CL = activeChecklist(st);
  const done = CL.filter(i => i.done).length;
  const groups = Array.from(new Set(CL.map(i => i.group)));
  const toggle = id => set(s => ({ [KEY]: s[KEY].map(x => (x.id === id ? { ...x, done: !x.done } : x)) }));

  return (
    <div>
      <div className="pf-row pf-gap14 pf-mb12">
        <SectionHeading>Compliance</SectionHeading>
        <span className="pf-faint14">{done} of {CL.length} complete · {Math.round(done / CL.length * 100)}%</span>
      </div>
      <div className="pf-mb18">
        <ReadinessPanel r={deriveReadiness(st)} onCheck={() => set({ readinessChecked: true })} />
      </div>

      {groups.map(g => {
        const items = CL.filter(i => i.group === g);
        return (
          <div key={g} className="pf-mb20">
            <BandHeader note={`${items.filter(i => i.done).length} of ${items.length} complete`} style={{ fontSize: 14 }}>{g}</BandHeader>
            <div className="pf-cl-body">
              {items.map(i => (
                <div key={i.id} className="pf-cl-row" style={{ background: i.done ? 'var(--surface-zebra)' : 'transparent' }}>
                  <div className="pf-pointer">
                    <BoxCheck on={i.done} onClick={() => toggle(i.id)} />
                  </div>
                  <div className="pf-min0" style={{ color: i.done ? 'var(--fg-3)' : 'var(--fg-1)' }}>{i.label}</div>
                  <div className="pf-min0 pf-ellipsis-1">{i.owner}</div>
                  <div>{i.due}</div>
                  <div className="pf-cl-req" style={{ color: i.required ? 'var(--fatal-text)' : 'var(--fg-faint)' }}>
                    {i.required ? 'Required' : 'Optional'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="pf-row pf-gap12">
        <Button variant="tertiary">Add Checklist Item</Button>
        <Button variant="secondary">Export Checklist</Button>
      </div>
    </div>
  );
}
