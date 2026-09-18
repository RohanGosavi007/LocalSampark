'use client';
import React from 'react';
import { AlertTriangle, Inbox, RefreshCw, WifiOff } from 'lucide-react';

/**
 * The state a screen is in when it has nothing to show.
 *
 * The audit found this was the single most consistent UX gap on the site. Two
 * examples, both from the live app:
 *
 *   - /shops rendered three grey skeleton cards that never resolved. With no
 *     results there was no "nothing near you" message, no way to widen the
 *     radius, and ~400px of dead space under a single lonely "All Shops" tile.
 *   - /society caught its load errors with `// Load error handled silently` and
 *     left "Loading dashboard data..." on screen permanently. A failed request
 *     was indistinguishable from an empty one, and neither offered a retry.
 *
 * Three distinct states, because they need three different messages. Telling
 * someone "no shops found" when the request actually failed sends them looking
 * for a different neighbourhood instead of tapping retry.
 */

const VARIANTS = {
  /** The request succeeded; there is genuinely nothing here. */
  empty: {
    Icon: Inbox,
    tone: 'var(--ink-muted)',
    wash: 'var(--sunken)',
    defaultTitle: 'Nothing here yet',
  },
  /** The request failed. Recoverable, and the user should be offered a retry. */
  error: {
    Icon: AlertTriangle,
    tone: 'var(--danger)',
    wash: 'var(--danger-quiet)',
    defaultTitle: 'Could not load this',
  },
  /** The device is offline. Retrying is pointless until that changes. */
  offline: {
    Icon: WifiOff,
    tone: 'var(--warning)',
    wash: 'var(--warning-quiet)',
    defaultTitle: 'You are offline',
  },
};

export default function EmptyState({
  variant = 'empty',
  title,
  message,
  /** Primary recovery action, e.g. { label: 'Try again', onClick } */
  action,
  /** Secondary escape hatch, e.g. { label: 'Widen to 5km', onClick } */
  secondaryAction,
  /** Technical detail, shown small. Useful when a request failed. */
  detail,
  className = '',
}) {
  const v = VARIANTS[variant] || VARIANTS.empty;
  const { Icon } = v;

  return (
    <div
      // role="status" so a screen reader announces the change when a list
      // resolves to nothing, rather than leaving the user on a silent page.
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center text-center gap-4 px-6 py-12
        rounded-[var(--radius)] border border-[color:var(--line)]
        bg-[color:var(--surface-1)] ${className}`}
    >
      <span
        aria-hidden="true"
        className="w-14 h-14 grid place-items-center rounded-full"
        style={{ background: v.wash, color: v.tone }}
      >
        <Icon className="w-7 h-7" strokeWidth={2} />
      </span>

      <div className="max-w-md">
        <h3 className="font-heading font-bold text-lg text-[color:var(--ink)]">
          {title || v.defaultTitle}
        </h3>
        {message && (
          <p className="mt-2 text-[color:var(--ink-muted)] leading-relaxed">{message}</p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-5 min-h-[var(--tap-min)]
                rounded-full font-heading font-semibold
                bg-[color:var(--accent)] text-[color:var(--on-accent)]
                hover:bg-[color:var(--accent-hover)]
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2
                focus-visible:ring-offset-[color:var(--surface-1)]
                transition-colors"
            >
              {action.icon !== false && <RefreshCw className="w-4 h-4" aria-hidden="true" />}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-2 px-5 min-h-[var(--tap-min)]
                rounded-full font-heading font-semibold
                border border-[color:var(--line-strong)] text-[color:var(--ink)]
                hover:border-[color:var(--line-accent)] hover:bg-[color:var(--accent-quiet)]
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-[color:var(--accent)]
                transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {detail && (
        <p className="text-sm text-[color:var(--ink-subtle)] max-w-md break-words">{detail}</p>
      )}
    </div>
  );
}

/**
 * A spinner that gives up.
 *
 * Every indefinite spinner on the site was unbounded: if the request never
 * settled, the spinner never stopped, and the user was left with no information
 * and no action. After `timeoutMs` this hands over to an error EmptyState.
 */
export function LoadingState({
  label = 'Loading…',
  timeoutMs = 12000,
  onRetry,
  timeoutTitle = 'This is taking too long',
  timeoutMessage = 'The server did not respond. Your connection may be slow, or the service may be briefly unavailable.',
}) {
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (!timeoutMs) return undefined;
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs]);

  if (timedOut) {
    return (
      <EmptyState
        variant={typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error'}
        title={timeoutTitle}
        message={timeoutMessage}
        action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
      />
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 px-6 py-16"
    >
      <span
        aria-hidden="true"
        className="w-8 h-8 rounded-full border-[3px] border-[color:var(--line)]
          border-t-[color:var(--accent)] animate-spin"
      />
      <p className="text-[color:var(--ink-muted)]">{label}</p>
    </div>
  );
}
