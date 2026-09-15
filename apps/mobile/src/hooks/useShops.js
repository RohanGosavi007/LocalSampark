import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import { prefetchImages } from '../utils/imageOptimization';
import { useTerritoryStore } from '../store/useTerritoryStore';
import { sessionIntentTracker } from '../services/sessionIntentTracker';

export const useShops = ({ zoneId, category, lat, lng, pincode }) => {
  const { territoryId } = useTerritoryStore();
  // Use territory ID for scoping, fall back to zoneId for backward compat
  const effectiveZone = territoryId || zoneId;

  return useQuery({
    // Intent is part of the key: without it React Query would serve a feed
    // ranked for browsing to a user who has just become urgent, from cache,
    // and the hints would appear to do nothing.
    queryKey: ['shops', effectiveZone, category, lat, lng, pincode,
      sessionIntentTracker.lastIntent],
    queryFn: async () => {
      let url = pincode ? `/shops/pincode/${pincode}` : (lat && lng ? `/shops/nearby` : `/shops`);
      const params = [];
      if (effectiveZone) params.push(`zone=${effectiveZone}`);
      if (effectiveZone) params.push(`territory_id=${effectiveZone}`);
      if (category) params.push(`category_id=${category}`);
      if (lat && !pincode) params.push(`lat=${lat}`);
      if (lng && !pincode) params.push(`lng=${lng}`);

      // In-session intent. The server treats these as bounded hints — it still
      // applies its own config and kill switches — so a shop directory opened
      // right after tapping a pharmacy's phone number ranks proximity and
      // open-now harder than the same directory opened while idly scrolling.
      const intent = sessionIntentTracker.getQueryContext();
      if (intent.boost_tags && intent.boost_tags.length > 0) {
        params.push(`boost_tags=${encodeURIComponent(intent.boost_tags.join(','))}`);
        params.push(`intent_confidence=${intent.intent_confidence}`);
        params.push(`local_hour=${new Date().getHours()}`);
      }
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const data = await apiGet(url);
      
      // 10x Scale: Ahead-of-Time (AoT) Prefetching for top feed items
      if (data?.shops && Array.isArray(data.shops)) {
        const topImageUrls = data.shops
          .slice(0, 5)
          .map(shop => {
            if (shop.photo_urls && shop.photo_urls !== '[]' && !shop.photo_urls.includes('[')) {
              return JSON.parse(shop.photo_urls)[0];
            }
            return null;
          })
          .filter(Boolean);
          
        prefetchImages(topImageUrls, 5);
      }
      
      return data;
    },
    enabled: true,
    networkMode: 'offlineFirst',
    gcTime: 1000 * 60 * 30, // 30 min garbage collection
    staleTime: 1000 * 60 * 5, // 5 min stale time
  });
};

export const useCategories = () => {
  const { territoryId } = useTerritoryStore();

  return useQuery({
    queryKey: ['categories', territoryId],
    queryFn: async () => {
      // Use territory-aware category endpoint
      const url = territoryId
        ? `/categories/active?territory_id=${territoryId}`
        : '/categories/active';
      return await apiGet(url);
    },
    staleTime: 1000 * 60 * 15, // 15 min cache
  });
};

export const useShopDetails = (shopId) => {
  return useQuery({
    queryKey: ['shop', shopId],
    queryFn: async () => await apiGet(`/shops/${shopId}`),
    enabled: !!shopId,
  });
};
