'use client';

import React, { useEffect, useRef } from 'react';
import { VIEWABILITY, trackImpression, trackClick } from '../lib/telemetry';

/**
 * Wraps a feed item so it reports an impression when it is genuinely seen, and
 * a click when it is activated.
 *
 * A wrapper rather than changes inside ShopCard: that component is memoised on
 * a hand-written comparator listing the exact props that matter, so adding
 * tracking props to it would either be dropped by the comparator or force it to
 * re-render on every parent update. This also keeps one implementation for
 * every feed — shops, services, jobs, marketplace — so their CTRs are
 * comparable.
 *
 * Visibility thresholds come from lib/telemetry and match the mobile client's
 * FlatList viewabilityConfig. If the two diverged, web and app CTR would be
 * measuring different things under one label in the admin console;
 * mlTelemetryParity.test.js fails if they drift.
 */
export default function TrackedItem({
  surface,
  itemType = 'shop',
  itemId,
  position,
  isExploration = false,
  children,
  as: Tag = 'div',
  onClick,
  ...rest
}) {
  const ref = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || itemId == null) return undefined;

    // No IntersectionObserver (old browser, or a test environment) means no
    // impressions rather than a crash: the feed must render regardless.
    if (typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // The dwell requirement is what separates "was on screen" from
            // "was scrolled past at speed". Without it, a fast flick down a
            // long feed logs an impression for every card it blurs through and
            // inflates the denominator of every rate metric.
            if (timerRef.current) continue;
            timerRef.current = setTimeout(() => {
              timerRef.current = null;
              trackImpression(surface, itemType, itemId, {
                position,
                is_exploration: isExploration,
              });
              observer.disconnect();
            }, VIEWABILITY.minimumViewTimeMs);
          } else if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      },
      { threshold: VIEWABILITY.itemVisiblePercentThreshold / 100 }
    );

    observer.observe(el);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      observer.disconnect();
    };
  }, [surface, itemType, itemId, position, isExploration]);

  const handleClick = (event) => {
    trackClick(surface, itemType, itemId, { position, is_exploration: isExploration });
    if (typeof onClick === 'function') onClick(event);
  };

  return (
    <Tag ref={ref} onClick={handleClick} {...rest}>
      {children}
    </Tag>
  );
}
