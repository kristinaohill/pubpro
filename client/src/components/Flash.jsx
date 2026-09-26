import React, { useEffect, useState } from 'react';
import { InlineMessage } from '../ds/pubpro';
import './Flash.css';

const SHOW_MS = 4500;
const FADE_MS = 500;

/**
 * A DS InlineMessage for page feedback. Confirmations (kind "info") fade out after a few seconds;
 * errors and warnings stay until the page changes them. Pass the message object (or anything that
 * changes with each new message) as `watch` so a repeat of the same text shows again.
 */
export default function Flash({ kind = 'info', children, watch, className }) {
  const fades = kind === 'info';
  const [phase, setPhase] = useState('shown'); // 'shown' | 'fading' | 'gone'

  useEffect(() => {
    setPhase('shown');
    if (!fades) return undefined;
    const fade = setTimeout(() => setPhase('fading'), SHOW_MS);
    const gone = setTimeout(() => setPhase('gone'), SHOW_MS + FADE_MS);
    return () => { clearTimeout(fade); clearTimeout(gone); };
  }, [fades, watch]);

  if (phase === 'gone') return null;
  return (
    <div className={'flash' + (phase === 'fading' ? ' flash--fading' : '') + (className ? ' ' + className : '')}>
      <InlineMessage kind={kind}>{children}</InlineMessage>
    </div>
  );
}
