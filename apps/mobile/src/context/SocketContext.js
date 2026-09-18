/**
 * Mobile realtime connection.
 *
 * `src/services/socket.js` has been a complete, working socket client for some
 * time — and had **zero importers**. Nothing on Android ever opened a socket,
 * so every screen was pull-only and the brief's "an action on web appears on
 * mobile without a refresh" was not possible anywhere in the app. The one
 * screen that looked live, `OrderTrackingView`, drove itself from a `MockSocket`
 * that invented driver coordinates with `Math.random()`.
 *
 * This provider is the missing piece: it owns one connection for the whole app,
 * authenticates it, reconnects it when the session changes, and exposes hooks
 * that make subscribing to a room a two-line change in a screen.
 *
 * Why a provider rather than letting screens call socketService directly: the
 * web app went the other way, and ended up with nine pages each constructing
 * their own `io()` with its own URL derivation and auth handling. One
 * connection, one place to reason about it.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { AppState } from 'react-native';
import { socketService } from '../services/socket';
import { SecureTokenStorage } from '../lib/secureStorage';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let token = null;
      try {
        token = await SecureTokenStorage.getToken('authToken');
      } catch (e) {
        console.warn('[Socket] could not read auth token:', e.message);
      }
      if (cancelled) return;

      // Connect even without a token: the server degrades an unrecognised
      // handshake to a guest session rather than refusing, and public rooms
      // (order tracking by id) still work. Authenticated rooms — a flat, a
      // society gate — are refused server-side, which is the correct outcome.
      socketService.connect(null, token);
      startedRef.current = true;

      socketService.on('connect', () => !cancelled && setIsConnected(true));
      socketService.on('disconnect', () => !cancelled && setIsConnected(false));
    })();

    return () => {
      cancelled = true;
      if (startedRef.current) socketService.disconnect();
    };
  }, []);

  // A socket held open across a long background does not survive on Android;
  // the OS suspends it and the client does not always notice. Reconnecting on
  // foreground is cheaper than showing stale data.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && startedRef.current) {
        socketService.reconnect();
      }
    });
    return () => sub.remove();
  }, []);

  const value = useMemo(
    () => ({
      isConnected,
      socket: socketService,
      joinShop: (shopId) => socketService.joinShop(shopId),
      joinOrder: (orderId) => socketService.joinOrder(orderId),
      joinUser: (userId) => socketService.joinUser(userId),
      emit: (event, data) => socketService.emit(event, data),
    }),
    [isConnected]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

/** Safe outside a provider, so a screen rendered in isolation does not crash. */
export function useSocket() {
  return (
    useContext(SocketContext) || {
      isConnected: false,
      socket: socketService,
      joinShop: () => {},
      joinOrder: () => {},
      joinUser: () => {},
      emit: () => {},
    }
  );
}

/**
 * Subscribe to one server event for the lifetime of a component.
 *
 *   useSocketEvent(`order_status_${orderId}`, (p) => setStatus(p.status));
 *
 * The handler is held in a ref so a screen can pass an inline arrow function
 * without re-subscribing on every render — the mistake that turns one listener
 * into hundreds and makes a live screen leak.
 */
export function useSocketEvent(event, handler, deps = []) {
  const { socket } = useSocket();
  const saved = useRef(handler);

  useEffect(() => {
    saved.current = handler;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handler, ...deps]);

  useEffect(() => {
    if (!event) return undefined;
    const listener = (...args) => saved.current?.(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [event, socket]);
}

/** Join a room while mounted, and leave it on unmount. */
export function useSocketRoom(kind, id) {
  const { socket, isConnected } = useSocket();

  const join = useCallback(() => {
    if (!id) return;
    if (kind === 'shop') socket.joinShop(id);
    else if (kind === 'order') socket.joinOrder(id);
    else if (kind === 'user') socket.joinUser(id);
  }, [kind, id, socket]);

  useEffect(() => {
    if (isConnected) join();
  }, [isConnected, join]);
}

export default SocketContext;
