import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../lib/api';

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
      return await apiGet(url);
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
