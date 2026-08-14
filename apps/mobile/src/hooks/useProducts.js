import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '../lib/api';

export const useAllProducts = () => {
  return useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => await apiGet('/products'),
  });
};

export const useProducts = (shopId) => {
  return useQuery({
    queryKey: ['products', shopId],
    queryFn: async () => await apiGet(`/shops/${shopId}/products`),
    enabled: !!shopId,
  });
};

export const useUpdateInventory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ productId, stock, price }) => {
      return await apiPut(`/marketplace/products/${productId}/inventory`, { stock, price });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
