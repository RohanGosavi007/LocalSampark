import { useEffect, useState } from 'react';
import { loadFeatureRegistry, visibleModules } from '../services/featureRegistry';

/**
 * Filters module entries ({ feature, ... }) by the live registry. Starts from
 * the launch defaults and switches to the registry as soon as it loads, so an
 * admin's kill switch changes the tiles without an app update.
 */
export function useVisibleModules(entries) {
  const [registry, setRegistry] = useState(null);
  useEffect(() => {
    let alive = true;
    loadFeatureRegistry().then((r) => { if (alive && r) setRegistry(r); });
    return () => { alive = false; };
  }, []);
  return visibleModules(entries, registry);
}
