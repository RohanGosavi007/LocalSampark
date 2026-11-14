'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadFeatureRegistry, resolveFeature } from './featureRegistry.mjs';
import { featureForPath } from './featureRoutes.mjs';
import { isFeatureEnabled as buildTimeEnabled } from './features';
import { API_URL } from './apiUrl.js';

/**
 * `isEnabled(key)` for components that show or hide a module (A12 / P6).
 *
 * Starts from the build-time defaults, so the server render and the first
 * client render agree, then switches to the live registry as soon as it loads
 * — an admin's kill switch hides the navigation without a rebuild.
 */
export function useFeatureRegistry() {
  const [registry, setRegistry] = useState(null);

  useEffect(() => {
    let alive = true;
    loadFeatureRegistry(API_URL).then((r) => { if (alive && r) setRegistry(r); });
    return () => { alive = false; };
  }, []);

  return useCallback((key) => resolveFeature(key, registry, buildTimeEnabled(key)), [registry]);
}

/**
 * Keeps the entries ({ href, ... }) whose module is on. A link to a module that
 * is off only leads to "Coming soon", so screens that list modules (the
 * footer, the platform map, the dashboard) show it only while the module is on.
 * An entry whose path is not gated always stays.
 */
export function useVisibleLinks() {
  const featureOn = useFeatureRegistry();
  return useCallback((entries) => entries.filter((entry) => {
    const feature = featureForPath(entry.href);
    return !feature || featureOn(feature);
  }), [featureOn]);
}
