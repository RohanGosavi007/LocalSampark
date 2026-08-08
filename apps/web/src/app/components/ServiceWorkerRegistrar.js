'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV !== 'production') {
        // Dev mode: Unregister
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          for (let registration of registrations) {
            registration.unregister();
          }
        });
      } else {
        // Prod mode: Register
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js').then(
            function(registration) {
              console.log('Service Worker registration successful with scope: ', registration.scope);
            },
            function(err) {
              console.log('Service Worker registration failed: ', err);
            }
          );
        });
      }
    }
  }, []);

  return null;
}
