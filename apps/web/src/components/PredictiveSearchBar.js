'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE } from '../lib/api';
import { trackClick } from '../lib/telemetry';

/**
 * Search box with live suggestions.
 *
 * Backed by /ml/search/suggest, which prefix-matches the full-text index and
 * fuses it with content vectors — so "groc" surfaces grocery shops before the
 * word is finished, and a category match surfaces a shop whose name does not
 * contain the term at all.
 *
 * Suggestions are a navigation aid, not a filter: choosing one goes straight to
 * that shop, while submitting the box runs the full search. Conflating the two
 * is the usual way an autocomplete becomes annoying — the list shifts under the
 * cursor as results narrow, and Enter does something different depending on
 * timing.
 */

const DEBOUNCE_MS = 180;
const MIN_QUERY = 2;

export default function PredictiveSearchBar({
  value,
  onChange,
  onSubmit,
  onSelectShop,
  placeholder = 'Search shops, services, categories…',
  className = '',
  inputClassName = '',
  id = 'predictive-search',
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef(null);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  // Fetch suggestions, debounced and abortable.
  useEffect(() => {
    const q = String(value || '').trim();

    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (q.length < MIN_QUERY) {
      setSuggestions([]);
      setHighlighted(-1);
      return undefined;
    }

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(
          `${API_BASE}/ml/search/suggest?q=${encodeURIComponent(q)}&limit=6`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        setHighlighted(-1);
      } catch {
        // A failed suggestion lookup closes the list. The search box itself
        // keeps working — suggestions are an accelerator, never a dependency.
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [value]);

  // Close when focus or the pointer leaves the component.
  useEffect(() => {
    const onDocumentPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDocumentPointerDown);
    return () => document.removeEventListener('pointerdown', onDocumentPointerDown);
  }, []);

  const choose = useCallback((item) => {
    // Recorded as a click on the suggestion surface rather than the directory,
    // so the admin console can tell how much traffic autocomplete actually
    // carries instead of attributing it to the feed.
    trackClick('search_suggest', 'shop', item.id);
    setOpen(false);
    if (typeof onSelectShop === 'function') onSelectShop(item);
  }, [onSelectShop]);

  const onKeyDown = (event) => {
    if (!open || suggestions.length === 0) {
      if (event.key === 'Enter' && typeof onSubmit === 'function') onSubmit(value);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((h) => (h + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      // Enter with nothing highlighted runs the search; with a highlighted row
      // it opens that shop. Predictable either way.
      if (highlighted >= 0) choose(suggestions[highlighted]);
      else if (typeof onSubmit === 'function') onSubmit(value);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && suggestions.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={inputClassName}
      />

      {showList ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-xl border border-border bg-card-bg shadow-2xl"
        >
          {suggestions.map((item, i) => (
            <li
              key={item.id}
              role="option"
              aria-selected={i === highlighted}
              onMouseEnter={() => setHighlighted(i)}
              onPointerDown={(e) => { e.preventDefault(); choose(item); }}
              className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                i === highlighted ? 'bg-primary/10 text-text' : 'text-text-muted'
              }`}
            >
              <span className="truncate font-semibold">{item.name}</span>
              {item.category ? (
                <span className="shrink-0 text-xs opacity-70">{item.category}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
