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

// External author profiles (GET /api/pp-authors) for the publication Authors tab: on publications an
// external author is stored as "Name-Institution" with their display name.
let extCache = null;
let extAt = 0;
let extInflight = null;
const extListeners = new Set();
export function refreshExternalAuthors() {
  if (!extInflight) {
    extInflight = api.get('/pp-authors')
      .then(list => {
        extCache = list.filter(a => a.status !== 'Inactive').map(a => {
          const display = (a.summary && a.summary.displayName) || a.name;
          const institution = (a.summary && a.summary.institution) || '';
          // lastCheck / lastCheckClear: their latest debarment check ('' = never run; false = a match).
          return { profileId: a.id, display, institution, name: institution ? display + '-' + institution : display, lastCheck: (a.summary && a.summary.lastCheck) || '', lastCheckClear: a.summary ? a.summary.lastCheckClear : null };
        });
        extAt = Date.now();
        extListeners.forEach(fn => fn(extCache));
        return extCache;
      })
      .catch(() => extCache || [])
      .finally(() => { extInflight = null; });
  }
  return extInflight;
}
export function useExternalAuthors() {
  const [list, setList] = useState(extCache || []);
  useEffect(() => {
    extListeners.add(setList);
    if (!extCache || Date.now() - extAt > 60000) refreshExternalAuthors();
    return () => { extListeners.delete(setList); };
  }, []);
  return list;
}

// Review types (System Administrator > Review Types): { types, roles } from GET /api/review-types.
let rtCache = null;
let rtInflight = null;
const rtListeners = new Set();
export function refreshReviewTypes() {
  if (!rtInflight) {
    rtInflight = api.get('/review-types')
      .then(r => { rtCache = r; rtListeners.forEach(fn => fn(r)); return r; })
      .catch(() => rtCache)
      .finally(() => { rtInflight = null; });
  }
  return rtInflight;
}
export function useReviewTypes() {
  const [value, setValue] = useState(rtCache);
  useEffect(() => {
    rtListeners.add(setValue);
    refreshReviewTypes();
    return () => { rtListeners.delete(setValue); };
  }, []);
  return value;
}
