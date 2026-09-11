'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * Last-resort error boundary.
 *
 * `error.js` beside this file only catches errors thrown *inside* the root
 * layout's children. An error thrown by the root layout itself -- a bad
 * provider, a failed font or theme import, anything in the shell -- escapes it
 * entirely, and previously produced Next's unstyled default screen with no
 * report sent anywhere. Sentry warns about exactly this gap on every build when
 * the file is missing.
 *
 * Because it replaces the root layout, this component has to render its own
 * <html> and <body>, and it cannot rely on the app's providers, component
 * library, or Tailwind layers being available -- whatever failed may be the
 * very thing that provides them. Everything here is therefore self-contained
 * with inline styles and no imports beyond React and Sentry.
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: '#0f172a',
          color: '#e2e8f0',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <div
            aria-hidden="true"
            style={{
              width: '4rem',
              height: '4rem',
              margin: '0 auto 1.5rem',
              borderRadius: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              fontSize: '2rem',
              lineHeight: 1,
            }}
          >
            !
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.75rem' }}>
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: '1rem',
              lineHeight: 1.6,
              color: '#94a3b8',
              margin: '0 0 2rem',
            }}
          >
            LocalSampark hit an unexpected error and could not load. The problem
            has been reported. Try again, or come back in a few minutes.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                cursor: 'pointer',
                border: 0,
                borderRadius: '0.6rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#ffffff',
                background: '#4f46e5',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                display: 'inline-block',
                borderRadius: '0.6rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#e2e8f0',
                background: '#1e293b',
                textDecoration: 'none',
              }}
            >
              Go home
            </a>
          </div>

          {error?.digest ? (
            <p
              style={{
                marginTop: '2rem',
                fontSize: '0.75rem',
                color: '#64748b',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
