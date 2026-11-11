import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useCartStore } from '../../store/cartStore';

/**
 * Keeps the app's cart in step with the customer's server cart (C6). Renders
 * nothing; mounted once inside AuthProvider (app/_layout.js).
 *
 *   signed in on start-up      pull (the cart may have changed on the web, and
 *                              prices and stock are checked again)
 *   signed in just now         merge the guest cart in, then pull
 *   signed out                 clear this device's copy
 *   back to the foreground     pull again
 */
export default function CartSync() {
  const { authToken, isLoading } = useAuth() || {};
  const previous = useRef(undefined);
  // The saved cart is read from AsyncStorage asynchronously. Acting before it
  // has loaded would merge an empty cart and then have the stale saved one
  // laid over the result.
  const [hydrated, setHydrated] = useState(() => Boolean(useCartStore.persist?.hasHydrated?.()));
  useEffect(() => {
    if (hydrated) return undefined;
    const unsub = useCartStore.persist?.onFinishHydration?.(() => setHydrated(true));
    if (useCartStore.persist?.hasHydrated?.()) setHydrated(true);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [hydrated]);

  useEffect(() => {
    if (isLoading || !hydrated) return;
    const store = useCartStore.getState();
    const before = previous.current;
    previous.current = authToken || null;

    if (authToken && before === undefined) {
      if (store.signedIn) store.pullFromServer();
      else store.mergeAfterLogin();
    } else if (authToken && !before) store.mergeAfterLogin();
    else if (!authToken && before) store.resetForLogout();
  }, [authToken, isLoading, hydrated]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && previous.current) useCartStore.getState().pullFromServer();
    });
    return () => sub.remove();
  }, []);

  return null;
}
