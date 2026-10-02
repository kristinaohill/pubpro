import React from 'react';
import { Checkbox, Icon, SegmentedToggle } from '../../ds/pubpro';
import { CREDIT_DEGREES, CREDIT_TAXONOMY } from './data';
import { contributionsOf, creditFlags, degreeLabel } from './credit';
import { Card } from './ui';
import './credit.css';

// CRediT for one author: tick each role they hold. How much of it (lead, equal, supporting, relative
// to others in the same role) is optional. Every author needs a role before the kick-off is recorded.

const DEGREE_LABELS = CREDIT_DEGREES.map(d => d.label);
const degreeId = label => (CREDIT_DEGREES.find(d => d.label === label) || {}).id || '';

export function CreditEditor({ person, list, onChange }) {
  const has = id => list.find(x => x.id === id);
  const toggle = id => onChange(has(id) ? list.filter(x => x.id !== id) : list.concat([{ id, degree: '' }]));
  const setDegree = (id, label) => onChange(list.map(x => (x.id === id ? { ...x, degree: degreeId(label) } : x)));
  return (
    <div className="cr-editor" role="group" aria-label={'CRediT roles for ' + person}>
      {CREDIT_TAXONOMY.map(r => {
        const mine = has(r.id);
        return (
          <div key={r.id} className={'cr-role' + (mine ? ' cr-role--on' : '')}>
            <div className="cr-role-main">
              <Checkbox checked={!!mine} onChange={() => toggle(r.id)} label={r.label} />
              <span className="cr-def">{r.definition}</span>
            </div>
            {mine && (
              <div className="cr-degree">
                <span className="cr-opt">Extent (optional)</span>
                <SegmentedToggle options={DEGREE_LABELS} value={degreeLabel(mine.degree)} onChange={v => setDegree(r.id, v === degreeLabel(mine.degree) ? '' : v)} />
              </div>
            )}
          </div>
        );
      })}
      <div className="cr-foot">
        Tick every role the author holds. The extent is optional and relative within each role: Lead led it, Equal shared it equally, Supporting contributed a smaller share.{' '}
        <a href="https://credit.niso.org" target="_blank" rel="noreferrer">About CRediT</a>
      </div>
    </div>
  );
}

/** The team view: who holds which role and to what extent, with the taxonomy's soft flags. */
export function ContributionMap({ st, people, onEdit }) {
  if (!people.length) return null;
  const rows = CREDIT_TAXONOMY.filter(r => people.some(p => contributionsOf(st, p).some(x => x.id === r.id)));
  const flags = creditFlags(st, people);
  const cell = (p, id) => (contributionsOf(st, p).find(x => x.id === id) || null);
  return (
    <Card title="Contributions (CRediT)" meta="Planned at kick-off · confirmed at final approval">
      {rows.length === 0 ? (
        <div className="pfx-help">No roles yet. Assign each author&rsquo;s CRediT roles and their extent below; the kick-off needs them.</div>
      ) : (
        <div className="cr-map-wrap">
          <table className="cr-map">
            <thead>
              <tr>
                <th scope="col">Role</th>
                {people.map(p => <th key={p} scope="col"><button type="button" className="cr-person" onClick={() => onEdit(p)}>{p}</button></th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <th scope="row" title={r.definition}>{r.label}</th>
                  {people.map(p => {
                    const c = cell(p, r.id);
                    return (
                      <td key={p}>
                        {c ? (c.degree ? <span className={'cr-chip cr-chip--' + c.degree}>{degreeLabel(c.degree)}</span> : <Icon name="check" size={18} color="var(--ok)" title="Holds this role" />) : <span className="cr-dash">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {flags.length > 0 && (
        <ul className="cr-flags">
          {flags.map(f => <li key={f}><Icon name="flag" size={14} />{f}</li>)}
        </ul>
      )}
    </Card>
  );
}
