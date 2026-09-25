import { useEffect, useRef } from 'react';

/**
 * Closes a dropdown when the user clicks outside it or presses Escape, and (with onOpen) reopens
 * it when they click back into its already-focused search box, which fires no new focus event.
 * Put the returned ref on an element wrapping both the input and its menu (a `display: contents`
 * div leaves layout alone). Listens in the capture phase so nothing inside the page can swallow it.
 */
export default function useDismiss(open, onClose, onOpen) {
  const ref = useRef(null);
  const latest = useRef({});
  latest.current = { open, onClose, onOpen };

  useEffect(() => {
    const onDown = e => {
      const el = ref.current;
      if (!el) return;
      const { open: isOpen, onClose: close, onOpen: reopen } = latest.current;
      const inside = el.contains(e.target);
      if (isOpen && !inside) close();
      else if (!isOpen && inside && reopen && e.target.tagName === 'INPUT') reopen();
    };
    const onKey = e => { if (e.key === 'Escape' && latest.current.open) latest.current.onClose(); };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return ref;
}
