import { useRef, useCallback } from 'react';
import { trackImpression, trackClick, VIEWABILITY } from '../lib/telemetry';

/**
 * FlatList impression tracking.
 *
 * Returns props to spread onto a FlatList, plus a click reporter for the item's
 * onPress.
 *
 *   const { viewabilityProps, onItemPress } = useImpressionTracking('shops_home');
 *   <FlatList {...viewabilityProps} ... />
 *
 * The refs are the important part. React Native throws
 * "Changing viewabilityConfigCallbackPairs on the fly is not supported" if the
 * identity of that prop changes between renders, and because a feed re-renders
 * whenever its data arrives, an inline array or a callback rebuilt each render
 * crashes the screen on the first update. Both are created once and never
 * replaced; the surface and the handler are read through refs so the values
 * stay current without the props changing identity.
 *
 * Thresholds come from lib/telemetry and match the web client's
 * IntersectionObserver, so app and web CTR measure the same thing.
 * mlTelemetryParity.test.js fails if they drift apart.
 */
export function useImpressionTracking(surface, itemType = 'shop') {
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;

  const itemTypeRef = useRef(itemType);
  itemTypeRef.current = itemType;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    for (const entry of viewableItems) {
      if (!entry.isViewable || !entry.item) continue;
      const id = entry.item.id ?? entry.item._id ?? entry.key;
      if (id == null) continue;
      // trackImpression de-duplicates per item per surface, so a card scrolled
      // back into view is not counted twice.
      trackImpression(surfaceRef.current, itemTypeRef.current, id, {
        position: entry.index,
        is_exploration: entry.item.is_exploration === true,
      });
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: VIEWABILITY.itemVisiblePercentThreshold,
    // Separates "was on screen" from "was flicked past". Without it a fast
    // scroll logs an impression for every card it blurs through, inflating the
    // denominator of every rate metric.
    minimumViewTime: VIEWABILITY.minimumViewTime,
  }).current;

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]).current;

  const onItemPress = useCallback((itemId, position) => {
    trackClick(surfaceRef.current, itemTypeRef.current, itemId, { position });
  }, []);

  return {
    // Spread onto FlatList. viewabilityConfigCallbackPairs carries both the
    // config and the callback, so neither is passed separately — React Native
    // rejects using both forms at once.
    viewabilityProps: { viewabilityConfigCallbackPairs },
    onItemPress,
  };
}

export default useImpressionTracking;
