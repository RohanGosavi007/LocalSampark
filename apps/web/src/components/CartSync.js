'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/cartStore';

/**
 * Keeps the cart in step with the customer's server cart (C6). Renders nothing.
 *
 *   signed in now, signed out before   merge the guest cart in, then pull;
 *   signed in on page load             pull (the cart may have changed in the
 *                                      app or another browser, and prices and
 *                                      stock are checked again);
 *   signed out                         clear this screen's copy.
 *
 * It waits for AuthContext to finish restoring the session, so a page load is
 * not mistaken for a fresh sign-in.
 */
export default function CartSync() {
  const { token, loading } = useAuth();
  const previous = useRef(undefined);

  useEffect(() => {
    if (loading) return;
    const store = useCartStore.getState();
    const before = previous.current;
    previous.current = token || null;

    if (token && before === undefined) {
      // A guest cart whose merge never finished (the login page reloads right
      // after signing in) is merged now; otherwise just refreshed.
      if (store.signedIn) store.pullFromServer();
      else store.mergeAfterLogin();
    } else if (token && !before) {
      store.mergeAfterLogin();
    } else if (!token && before) {
      store.resetForLogout();
    }
  }, [token, loading]);

  // Coming back to the tab is when prices and stock are most likely stale.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && previous.current) useCartStore.getState().pullFromServer();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return null;
}
