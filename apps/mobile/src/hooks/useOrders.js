import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '../lib/api';

export const useOrders = (userId) => {
  return useQuery({
    queryKey: ['orders', userId],
    queryFn: async () => await apiGet(`/orders/user/${userId}`),
    enabled: !!userId,
  });
};

export const useShopOrders = (shopId) => {
  return useQuery({
    queryKey: ['orders', 'shop', shopId],
    queryFn: async () => await apiGet(`/orders/shop/${shopId}`),
    enabled: !!shopId,
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, status }) => {
      return await apiPut(`/orders/${orderId}/status`, { status });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};
