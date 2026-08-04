import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import { prefetchImages } from '../utils/imageOptimization';
import { useTerritoryStore } from '../store/useTerritoryStore';

export const useShops = ({ zoneId, category, lat, lng }) => {
  const { territoryId } = useTerritoryStore();
  // Use territory ID for scoping, fall back to zoneId for backward compat
  const effectiveZone = territoryId || zoneId;

  return useQuery({
    queryKey: ['shops', effectiveZone, category, lat, lng],
    queryFn: async () => {
      let url = lat && lng ? `/shops/nearby` : `/shops`;
      const params = [];
      if (effectiveZone) params.push(`zone=${effectiveZone}`);
      if (effectiveZone) params.push(`territory_id=${effectiveZone}`);
      if (category) params.push(`category=${category}`);
      if (lat) params.push(`lat=${lat}`);
      if (lng) params.push(`lng=${lng}`);
      
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
