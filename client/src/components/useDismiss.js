import { useEffect, useRef } from 'react';

/**
 * Closes a dropdown when the user clicks outside it or presses Escape. Put the returned ref on
 * an element wrapping both the input and its menu (a `display: contents` div leaves layout alone).
 */
export default function useDismiss(open, onClose) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) close.current(); };
    const onKey = e => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return ref;
}
