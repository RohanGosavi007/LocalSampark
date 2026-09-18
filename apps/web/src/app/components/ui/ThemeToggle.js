'use client';
import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

/**
 * Theme controls.
 *
 * Replaces the emoji button in Header.js, which wrote localStorage directly and
 * then called window.location.reload() — discarding cart state, scroll position
 * and every in-flight request in order to change a colour. These call the
 * provider, so the swap happens in one frame.
 *
 * Two shapes for two jobs: a single button for the header, where space is tight
 * and the common case is a straight flip, and a three-way segmented control for
 * settings surfaces, where "follow my system" needs to be reachable.
 */

const HIT_AREA = 'min-w-[var(--tap-min)] min-h-[var(--tap-min)]';

/**
 * Compact header control. One tap flips light <-> dark.
 *
 * Icons are cross-faded and rotated rather than swapped, because a hard swap at
 * the same moment the whole page changes colour reads as a glitch.
 */
export function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`${HIT_AREA} relative inline-flex items-center justify-center rounded-full
        text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]
        hover:bg-[color:var(--accent-quiet)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]
        focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ground)]
        transition-colors ${className}`}
    >
      <Sun
        className="w-5 h-5 absolute transition-all duration-300 ease-out
          rotate-0 scale-100 opacity-100 dark:-rotate-90 dark:scale-0 dark:opacity-0"
        aria-hidden="true"
      />
      <Moon
        className="w-5 h-5 transition-all duration-300 ease-out
          rotate-90 scale-0 opacity-0 dark:rotate-0 dark:scale-100 dark:opacity-100"
        aria-hidden="true"
      />
    </button>
  );
}

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

/**
 * Three-way control for settings and account menus.
 *
 * `system` is a first-class option rather than an implicit default, so someone
 * who has picked light or dark can get back to following their OS. It tracks
 * the OS live — the provider keeps a matchMedia listener attached.
 */
export function ThemeSegmentedControl({ className = '', showLabels = true }) {
  const { preference, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className={`inline-flex items-center gap-1 p-1 rounded-full
        bg-[color:var(--sunken)] border border-[color:var(--line)] ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={`${showLabels ? 'px-4' : 'px-3'} min-h-[40px] inline-flex items-center gap-2
              rounded-full text-sm font-semibold transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]
              ${
                active
                  ? 'bg-[color:var(--surface-1)] text-[color:var(--ink)] shadow-[var(--elev-1)]'
                  : 'text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]'
              }`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {showLabels && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default ThemeToggle;
