'use client';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import io from 'socket.io-client';
import { API_URL } from '@/lib/api';

/**
 * The web app's single realtime connection.
 *
 * This provider existed but was never mounted in app/layout.js, and `useSocket`
 * had zero consumers. Nine pages had each grown their own `io()` call instead,
 * and the copies had drifted in three ways that mattered:
 *
 *   1. **Five of them sent no auth token.** The server's handshake degrades an
 *      unrecognised connection to a guest rather than refusing, so those pages
 *      connected "successfully" and were then refused every authenticated room
 *      — the gate, the flat, the order — with no error that explained why.
 *   2. **Only one stripped `/api/v1` from the URL.** socket.io needs the
 *      origin; NEXT_PUBLIC_API_URL may carry the path segment, in which case
 *      the handshake goes to the wrong place entirely.
 *   3. Nine sockets per session where one will do.
 *
 * One connection, authenticated, with the URL derived once.
 */

const SocketContext = createContext(null);

/** Module-scoped handle, so getSharedSocket() below returns the provider's
 *  connection rather than opening a second one. */
let activeSocket = null;

/** socket.io wants the origin, never the versioned API path. */
function socketOrigin() {
  return String(API_URL || '').replace(/\/+$/, '').replace(/\/api\/v\d+$/, '');
}

function readToken() {
  if (typeof window === 'undefined') return null;
  try {
    return (
      window.localStorage.getItem('auth_token') ||
      window.localStorage.getItem('token') ||
      null
    );
  } catch {
    return null;
  }
}

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  // Safe outside the provider, so a page rendered in isolation does not crash
  // on `const { socket } = useSocket()`.
  return (
    ctx || {
      socket: null,
      isConnected: false,
      joinShopRoom: () => {},
      joinOrderRoom: () => {},
      joinFlatRoom: () => {},
      joinGatekeeperRoom: () => {},
      emit: () => {},
    }
  );
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const origin = socketOrigin();
    if (!origin) return undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    let cancelled = false;

    // Probe health first so a missing backend does not produce a console full
    // of reconnect errors on every page.
    fetch(`${origin}/health`, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Backend not healthy');
        if (cancelled) return;

        const token = readToken();
        const newSocket = io(origin, {
          withCredentials: true,
          // Both transports: a websocket upgrade is the first thing a captive
          // portal or corporate proxy blocks, and with only one the client
          // never connects at all.
          transports: ['websocket', 'polling'],
          auth: token ? { token } : undefined,
          reconnectionAttempts: 10,
          reconnectionDelay: 2000,
          reconnectionDelayMax: 15000,
          timeout: 10000,
        });

        newSocket.on('connect', () => setIsConnected(true));
        newSocket.on('disconnect', () => setIsConnected(false));
        newSocket.on('connect_error', () => {
          /* reconnection is configured above; nothing to do per attempt */
        });

        socketRef.current = newSocket;
        activeSocket = newSocket;
        setSocket(newSocket);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        // Backend unreachable. The app still works; it just is not live.
      });

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        activeSocket = null;
      }
    };
  }, []);

  /**
   * Emit once connected, or as soon as the connection opens.
   *
   * Every ad-hoc copy of this emitted its join inside an `on('connect')`
   * handler or, worse, immediately after `io()` — which drops the join
   * silently if the handshake has not finished. Queuing removes that race.
   */
  const emitWhenReady = useCallback((event, payload) => {
    const s = socketRef.current;
    if (!s) return;
    if (s.connected) s.emit(event, payload);
    else s.once('connect', () => s.emit(event, payload));
  }, []);

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      emit: emitWhenReady,
      joinShopRoom: (shopId) => shopId && emitWhenReady('join_shop_room', shopId),
      joinOrderRoom: (orderId) => orderId && emitWhenReady('join_order_room', orderId),
      joinFlatRoom: (societyId, flatNo) =>
        societyId && flatNo && emitWhenReady('join_flat_room', { societyId, flatNo }),
      joinGatekeeperRoom: (societyId, gateId) =>
        societyId && emitWhenReady('join_gatekeeper_room', { societyId, gateId }),
    }),
    [socket, isConnected, emitWhenReady]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

/**
 * Subscribe to one server event for a component's lifetime.
 *
 * The handler is kept in a ref so a page can pass an inline arrow function
 * without re-subscribing on every render — the mistake that turns one listener
 * into hundreds on a live screen.
 */
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const saved = useRef(handler);

  useEffect(() => {
    saved.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket || !event) return undefined;
    const listener = (...args) => saved.current?.(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}

/**
 * The shared socket, outside React.
 *
 * Several screens build their connection inside an effect and then attach a
 * long list of handlers. Rewriting those bodies to hooks would touch working
 * code for no functional gain, so they instead swap their `io(...)` call for
 * this: the same connection the provider owns, authenticated, with the origin
 * already derived.
 *
 * It creates the socket on first use if the provider has not yet, so a page
 * that mounts before the provider's health probe resolves still works.
 */
let standalone = null;

export function getSharedSocket() {
  if (typeof window === 'undefined') return null;
  if (activeSocket) return activeSocket;
  if (standalone) return standalone;

  const origin = socketOrigin();
  if (!origin) return null;

  const token = readToken();
  standalone = io(origin, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    auth: token ? { token } : undefined,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 15000,
    timeout: 10000,
  });
  return standalone;
}

export default SocketContext;
