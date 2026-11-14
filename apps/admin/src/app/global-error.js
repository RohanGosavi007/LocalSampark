'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * Last-resort boundary for the admin console: an error thrown by the root layout
 * itself, which error.js cannot catch. It replaces the layout, so it draws its
 * own <html>/<body> with inline styles and depends on nothing that may have failed.
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>
        <div role="alert" style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.75rem' }}>The admin console hit an error</h1>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: '0 0 1.5rem' }}>The problem has been reported. Try again, or reload the page.</p>
          <button type="button" onClick={() => reset()} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: 0, fontWeight: 700, background: '#10b981', color: '#052e1b', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
