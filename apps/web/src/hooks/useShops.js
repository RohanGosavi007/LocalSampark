import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';

export function useShops(zoneId, categoryId) {
  return useQuery({
    queryKey: ['shops', zoneId, categoryId],
    queryFn: () => {
      let url = `/shops?zoneId=${zoneId || ''}`;
      if (categoryId) url += `&categoryId=${categoryId}`;
      return apiGet(url);
    },
    staleTime: 5 * 60 * 1000,
  });
}
