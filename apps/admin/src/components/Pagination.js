'use client';
import React from 'react';

/**
 * Previous / next controls for a server-paged list. `total` is the server's count of
 * matching rows, so the range shown is the real one rather than "the first 50".
 */
export default function Pagination({ page, limit, total, onPage, disabled }) {
  const pages = Math.max(1, Math.ceil((total || 0) / limit));
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total || 0);
  const btn = (off) => ({
    padding: '0.4rem 0.9rem', borderRadius: '0.5rem', border: '1px solid var(--line)', background: 'var(--surface-1)',
    color: 'var(--ink)', fontWeight: 600, cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.5 : 1,
  });
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
      <span style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>
        {total ? `${from}–${to} of ${total}` : 'No results'}
      </span>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button type="button" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)} style={btn(disabled || page <= 1)}>← Prev</button>
        <span style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>Page {page} / {pages}</span>
        <button type="button" disabled={disabled || page >= pages} onClick={() => onPage(page + 1)} style={btn(disabled || page >= pages)}>Next →</button>
      </div>
    </div>
  );
}
