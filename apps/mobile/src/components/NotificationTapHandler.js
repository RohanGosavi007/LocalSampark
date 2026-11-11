import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { pushTarget } from '../services/notificationLinks';

/**
 * Opens the screen a tapped push is about (C13). Renders nothing; mounted once
 * in app/_layout.js. Handles a push tapped while the app is running and the
 * one that launched it. expo-notifications is loaded on demand so a build
 * without it still starts.
 */
export default function NotificationTapHandler() {
  const router = useRouter();
  const handled = useRef(new Set());

  useEffect(() => {
    let Notifications;
    try {
      Notifications = require('expo-notifications');
    } catch {
      return undefined;
    }
    const open = (response) => {
      const id = response && response.notification && response.notification.request && response.notification.request.identifier;
      if (id && handled.current.has(id)) return;
      if (id) handled.current.add(id);
      const target = pushTarget(response && response.notification && response.notification.request && response.notification.request.content);
      if (target) router.push(target);
    };
    Notifications.getLastNotificationResponseAsync?.().then((r) => r && open(r)).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener?.(open);
    return () => { if (sub && sub.remove) sub.remove(); };
  }, [router]);

  return null;
}
