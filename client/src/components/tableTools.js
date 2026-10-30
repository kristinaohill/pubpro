import { useState } from 'react';

/**
 * Click-to-sort state for a DataTable's sortable columns. sortBy is the column index (null =
 * the server's order); clicking the same column again flips the direction.
 */
export function useTableSort(initialBy = null, initialDir = 'asc') {
  const [sort, setSort] = useState({ by: initialBy, dir: initialDir });
  const onSort = i => setSort(s => (s.by === i ? { by: i, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { by: i, dir: 'asc' }));
  return { sortBy: sort.by, sortDir: sort.dir, onSort };
}

const blank = v => v == null || v === '';

/** Sorts a copy of items by keyOf(item) (text or number). Blanks always go last. */
export function sortItems(items, keyOf, dir) {
  if (!keyOf) return items;
  const sign = dir === 'desc' ? -1 : 1;
  return items.slice().sort((a, b) => {
    const x = keyOf(a);
    const y = keyOf(b);
    if (blank(x) || blank(y)) return blank(x) - blank(y);
    if (typeof x === 'number' && typeof y === 'number') return sign * (x - y);
    return sign * String(x).localeCompare(String(y), 'en', { numeric: true, sensitivity: 'base' });
  });
}

/** True when every word of the search text appears in one of the fields (case-insensitive). */
export function matchesSearch(query, fields) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fields.filter(f => !blank(f)).join(' ').toLowerCase();
  return words.every(w => hay.includes(w));
}
