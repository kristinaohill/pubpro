import React from 'react';
import { Button, Icon } from '../../ds/pubpro';
import { kickoffChecklist, needsKickoff } from './kickoff';
import { Card } from './ui';

// On the Planning tab: where the kick-off stands, pointing to the Kick-off tab where it's recorded.
export default function KickoffCard({ st, set }) {
  if (!needsKickoff(st)) return null;
  const k = st.kickoff;
  if (k && k.heldOn) {
    return (
      <Card title="Kick-off" meta="V2 · GPP">
        <div className="pfxc-kick-done"><Icon name="check_circle" size={20} color="var(--ok)" /><div><div className="pf-strong">Held {k.heldOn}</div><div className="pfx-meta">The steps after it are open.</div></div></div>
      </Card>
    );
  }
  const list = kickoffChecklist(st);
  const ready = list.filter(x => !x.missing.length).length;
  return (
    <Card title="Kick-off" meta="V2 · GPP" actions={<Button variant="secondary" icon="event_available" onClick={() => set({ tab: 'kickoff' })}>Open Kick-off</Button>}>
      <div className="pfx-help">
        The steps after the kick-off stay locked until it&rsquo;s recorded on the Kick-off tab. {ready} of {list.length} sections are ready.
      </div>
    </Card>
  );
}
