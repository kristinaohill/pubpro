import { useEffect, useState } from 'react';
import { api } from '../api';

// The staff directory (GET /api/people): active, approved users with their title, department,
// therapeutic areas and out of office. Shared by every picker; fetched once and refreshed after a
// minute, or straight away with refreshPeople() (after a profile or admin change).
let cache = null;
let loadedAt = 0;
let inflight = null;
const listeners = new Set();

export function refreshPeople() {
  if (!inflight) {
    inflight = api.get('/people')
      .then(list => { cache = list; loadedAt = Date.now(); listeners.forEach(fn => fn(list)); return list; })
      .catch(() => cache || [])
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export default function usePeople() {
  const [list, setList] = useState(cache || []);
  useEffect(() => {
    listeners.add(setList);
    if (!cache || Date.now() - loadedAt > 60000) refreshPeople();
    return () => { listeners.delete(setList); };
  }, []);
  return list;
}

const norm = s => String(s || '').trim().toLowerCase();
export const personNamed = (people, name) => people.find(p => norm(p.name) === norm(name)) || null;

/** How a person is described in pickers: their job title, else their PubPro role. */
export const jobTitle = p => (p ? p.title || p.roleName || '' : '');

const us = iso => { const [y, m, d] = String(iso).split('-').map(Number); return m + '/' + d + '/' + y; };
/** "Out of office until 10/9/2026: At ISPOR Europe…", or '' when they're in. */
export const oooText = p => (p && p.oooNow
  ? 'Out of office' + (p.oooNow.to ? ' until ' + us(p.oooNow.to) : '') + (p.oooNow.note ? ': ' + p.oooNow.note : '')
  : '');
