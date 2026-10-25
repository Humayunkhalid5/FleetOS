import { useEffect, useMemo, useRef, useState } from 'react';
import { getActiveSessionToken, realtimeUrl } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import RealtimeContext from './realtimeContextValue';

// One Socket.IO connection per signed-in session, shared by every screen.
// Pages subscribe to events through useLiveEvent / useLiveQuery instead of
// opening their own sockets (which previously multiplied connections).

export function RealtimeProvider({ children }) {
  const { user } = useAuth() || {};
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Map());

  useEffect(() => {
    if (!user?._id && !user?.id) return undefined;
    const token = getActiveSessionToken();
    let next = null;
    let cancelled = false;
    const dispatch = (event, payload) => {
      (listeners.current.get(event) || []).forEach((handler) => { try { handler(payload); } catch { /* keep others running */ } });
      (listeners.current.get('*') || []).forEach((handler) => { try { handler(payload, event); } catch { /* ignore */ } });
    };
    // The Socket.IO client is fetched only once someone is signed in, so a
    // visitor reading the public site never downloads it.
    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      next = io(realtimeUrl(), {
        withCredentials: true,
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionDelayMax: 8000,
      });
      // Consumers only emit once connected, so the socket is published on connect.
      next.on('connect', () => { setSocket(next); setConnected(true); dispatch('$reconnect'); });
      next.on('disconnect', () => setConnected(false));
      next.onAny((event, payload) => dispatch(event, payload));
    }).catch(() => {
      // Realtime is an enhancement: screens keep working over normal requests.
    });
    return () => {
      cancelled = true;
      if (next) { next.removeAllListeners(); next.disconnect(); }
      setSocket(null);
      setConnected(false);
    };
  }, [user?._id, user?.id]);

  const value = useMemo(() => ({
    socket,
    connected,
    subscribe(event, handler) {
      const map = listeners.current;
      if (!map.has(event)) map.set(event, new Set());
      map.get(event).add(handler);
      return () => map.get(event)?.delete(handler);
    },
  }), [socket, connected]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
