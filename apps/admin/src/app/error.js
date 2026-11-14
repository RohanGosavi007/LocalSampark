'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/** An error inside a page of the admin console: reported, with a way to try again. */
export default function Error({ error, reset }) {
  useEffect(() => {
    // React error boundaries swallow the exception, so nothing else reports it.
    Sentry.captureException(error);
  }, [error]);

  return (
    <div role="alert" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Something went wrong on this page</h2>
      <p style={{ opacity: 0.7, margin: '0 0 1.25rem' }}>The problem has been reported.</p>
      <button type="button" onClick={() => reset()} style={{ padding: '0.6rem 1.25rem', borderRadius: '0.6rem', border: '1px solid currentColor', background: 'transparent', color: 'inherit', fontWeight: 700, cursor: 'pointer' }}>
        Try again
      </button>
    </div>
  );
}
