import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../lib/api';
import { prefetchImages } from '../utils/imageOptimization';

export const useShops = ({ zoneId, category, lat, lng }) => {
  return useQuery({
    queryKey: ['shops', zoneId, category, lat, lng],
    queryFn: async () => {
      let url = lat && lng ? `/shops/nearby` : `/shops`;
      const params = [];
      if (zoneId) params.push(`zone=${zoneId}`);
      if (category) params.push(`category=${category}`);
      if (lat) params.push(`lat=${lat}`);
      if (lng) params.push(`lng=${lng}`);
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const data = await apiGet(url);
      
      // 10x Scale: Ahead-of-Time (AoT) Prefetching for top feed items
      if (data?.shops && Array.isArray(data.shops)) {
        // Extract the first 5 shop images for aggressive prefetching
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
    enabled: true, // we want it to fetch nearby or general shops even without zoneId
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => await apiGet('/shops/categories'),
  });
};

export const useShopDetails = (shopId) => {
  return useQuery({
    queryKey: ['shop', shopId],
    queryFn: async () => await apiGet(`/shops/${shopId}`),
    enabled: !!shopId,
  });
};
