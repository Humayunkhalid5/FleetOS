import { useContext, useEffect, useLayoutEffect, useRef } from 'react';
import RealtimeContext from '../context/realtimeContextValue';

export function useRealtime() {
  return useContext(RealtimeContext);
}

/** Run `handler` whenever any of the named socket events arrives. */
export function useLiveEvent(events, handler) {
  const { subscribe } = useRealtime();
  const saved = useRef(handler);
  useLayoutEffect(() => { saved.current = handler; });
  const key = Array.isArray(events) ? events.join('|') : events;
  useEffect(() => {
    if (!key) return undefined;
    const offs = key.split('|').map((event) => subscribe(event, (...args) => saved.current?.(...args)));
    return () => offs.forEach((off) => off());
  }, [key, subscribe]);
}
