import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import api, { onMutation } from '../services/api';
import { useRealtime } from './useRealtime';

// Stale-while-revalidate cache shared by every screen.
//  - Revisiting a page shows the last data instantly, then refreshes quietly.
//  - Socket events, window focus, reconnects and any successful write made
//    anywhere in the app trigger a background refresh, so a page never needs
//    a manual reload to show the latest state.
const store = new Map(); // key -> { data, error, updatedAt, promise, fetcher }
const subscribers = new Map(); // key -> Set<fn>
const active = new Map(); // key -> mount count

const globalListeners = new Set();
function pendingCount() {
  let count = 0;
  store.forEach((item, key) => { if (item.promise && item.data === undefined && active.has(key)) count += 1; });
  return count;
}
function emit(key) {
  (subscribers.get(key) || []).forEach((fn) => fn());
  globalListeners.forEach((fn) => fn());
}

/** Number of mounted queries currently fetching — drives the top progress bar. */
export function useFetchingCount() {
  return useSyncExternalStore((callback) => { globalListeners.add(callback); return () => globalListeners.delete(callback); }, pendingCount);
}
function entry(key) {
  if (!store.has(key)) store.set(key, { data: undefined, error: null, updatedAt: 0, promise: null, fetcher: null, version: 0 });
  return store.get(key);
}

export function revalidate(key) {
  const item = store.get(key);
  if (!item?.fetcher) return Promise.resolve();
  if (item.promise) return item.promise;
  item.promise = Promise.resolve()
    .then(item.fetcher)
    .then((data) => { item.data = data; item.error = null; item.updatedAt = Date.now(); })
    .catch((error) => { item.error = error; })
    .finally(() => { item.promise = null; item.version += 1; emit(key); });
  item.version += 1;
  emit(key);
  return item.promise;
}

/** Refresh every mounted query whose key starts with one of the prefixes. */
export function invalidate(...prefixes) {
  [...active.keys()].forEach((key) => {
    if (!prefixes.length || prefixes.some((prefix) => key.startsWith(prefix))) revalidate(key);
  });
}

/** Warm the cache before navigating (e.g. on link hover). */
export function prefetch(key, fetcher) {
  const item = entry(key);
  item.fetcher = fetcher || (() => api.get(key, { noCache: true }));
  if (!item.data && !item.promise) revalidate(key);
}

export function setQueryData(key, updater) {
  const item = entry(key);
  item.data = typeof updater === 'function' ? updater(item.data) : updater;
  item.version += 1;
  emit(key);
}

/** Forget everything (sign-out / account switch). */
export function clearQueryCache() {
  store.forEach((item) => { item.data = undefined; item.error = null; item.version += 1; });
  [...store.keys()].forEach(emit);
}

let refreshTimer = null;
function scheduleRefreshAll() {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => invalidate(), 120);
}

if (typeof window !== 'undefined') {
  onMutation(scheduleRefreshAll);
  window.addEventListener('focus', scheduleRefreshAll);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') scheduleRefreshAll(); });
  window.addEventListener('online', scheduleRefreshAll);
}

/**
 * useLiveQuery('/bookings', { events: ['booking:updated'] })
 * useLiveQuery(key, () => customFetch(), { events, interval, enabled })
 */
export function useLiveQuery(key, fetcherOrOptions, maybeOptions) {
  const options = (typeof fetcherOrOptions === 'function' ? maybeOptions : fetcherOrOptions) || {};
  const fetcher = typeof fetcherOrOptions === 'function' ? fetcherOrOptions : null;
  const { events = [], interval = 0, enabled = true, keepPrevious = true } = options;
  const { subscribe } = useRealtime();
  const fetcherRef = useRef(fetcher);
  useLayoutEffect(() => { fetcherRef.current = fetcher; });
  const [previous, setPrevious] = useState(undefined);

  const subscribeStore = useCallback((callback) => {
    if (!key) return () => {};
    if (!subscribers.has(key)) subscribers.set(key, new Set());
    subscribers.get(key).add(callback);
    return () => subscribers.get(key)?.delete(callback);
  }, [key]);
  const version = useSyncExternalStore(subscribeStore, () => (key ? entry(key).version : 0));

  useEffect(() => {
    if (!key || !enabled) return undefined;
    const item = entry(key);
    item.fetcher = () => (fetcherRef.current ? fetcherRef.current() : api.get(key, { noCache: true }));
    active.set(key, (active.get(key) || 0) + 1);
    revalidate(key);
    return () => {
      const count = (active.get(key) || 1) - 1;
      if (count <= 0) active.delete(key); else active.set(key, count);
    };
  }, [key, enabled]);

  const eventKey = events.join('|');
  useEffect(() => {
    if (!key || !enabled) return undefined;
    let timer;
    const trigger = () => { window.clearTimeout(timer); timer = window.setTimeout(() => revalidate(key), 150); };
    const offs = [...(eventKey ? eventKey.split('|') : []), '$reconnect'].map((event) => subscribe(event, trigger));
    return () => { window.clearTimeout(timer); offs.forEach((off) => off()); };
  }, [key, enabled, eventKey, subscribe]);

  useEffect(() => {
    if (!key || !enabled || !interval) return undefined;
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') revalidate(key); }, interval);
    return () => window.clearInterval(id);
  }, [key, enabled, interval]);

  const item = key ? entry(key) : { data: undefined, error: null, promise: null };
  void version;
  // Remember the last loaded data so a key change keeps showing it until the
  // new key resolves (render-phase state update, not a ref).
  if (item.data !== undefined && item.data !== previous) setPrevious(item.data);
  let data = item.data;
  if (data === undefined && keepPrevious) data = previous;

  return {
    data,
    error: item.error,
    loading: data === undefined && !item.error,
    refreshing: Boolean(item.promise) && data !== undefined,
    refresh: useCallback(() => (key ? revalidate(key) : Promise.resolve()), [key]),
    mutate: useCallback((updater) => key && setQueryData(key, updater), [key]),
  };
}

export default useLiveQuery;
