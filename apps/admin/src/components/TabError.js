'use client';

import React from 'react';

/**
 * Error banner shown at the top of an admin tab when its data fetch failed.
 *
 * Every tab previously swallowed fetch failures into `console.error(e)` and
 * left the table showing its empty state, so a 401, a 500 and a genuinely
 * empty result were indistinguishable to the operator. This makes the
 * difference visible and offers a retry.
 *
 * Renders nothing when there is no error, so it is safe to place
 * unconditionally as the first child of a tab.
 */
export default function TabError({ error, onRetry }) {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message || 'Something went wrong.';
  const status = typeof error === 'object' && error ? error.status : undefined;
  const isAuth = status === 401 || status === 403;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        borderRadius: '0.75rem',
        // Amber for "you need to sign in", red for an actual failure — the
        // operator's next action is different in each case.
        background: isAuth ? '#2a2005' : '#2a0a0a',
        border: `1px solid ${isAuth ? '#a16207' : '#7f1d1d'}`,
        color: isAuth ? '#fcd34d' : '#fca5a5',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
        {isAuth ? '🔒' : '⚠️'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
          {isAuth ? 'Not authorised' : 'Could not load this data'}
        </div>
        <div style={{ fontSize: '0.85rem', opacity: 0.9, wordBreak: 'break-word' }}>
          {message}
          {status ? <span style={{ opacity: 0.6 }}> (HTTP {status})</span> : null}
        </div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '0.4rem 0.9rem',
            background: 'transparent',
            border: `1px solid ${isAuth ? '#a16207' : '#7f1d1d'}`,
            color: 'inherit',
            borderRadius: '0.5rem',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
