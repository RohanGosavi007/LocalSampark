import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';

export function useProducts(shopId) {
  return useQuery({
    queryKey: ['products', shopId],
    queryFn: () => apiGet(`/shops/${shopId}/products`),
    staleTime: 5 * 60 * 1000,
    enabled: !!shopId,
  });
}
