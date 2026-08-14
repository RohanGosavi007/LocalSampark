import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';

export function useOrders(userId) {
  return useQuery({
    queryKey: ['orders', userId],
    queryFn: () => apiGet(`/orders/user/${userId}`),
    staleTime: 60 * 1000, // 1 min stale time for orders
    enabled: !!userId,
  });
}
