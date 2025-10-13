/**
 * Resource Products Hook
 * SWR-based hook for managing products in resource-scoped RBAC context
 */

import useSWR from 'swr';
import { productsApi } from '@/lib/api';
import { useTenant } from '@/lib/context/TenantContext';
import { ListProductsResponse, CreateProductRequest, UpdateProductRequest } from '@/lib/types/api';
import { Product } from '@/lib/types/models';

export function useResourceProducts() {
  const { currentTenant } = useTenant();

  // Only fetch products when tenant is selected (resource RBAC requires tenant context)
  const shouldFetch = Boolean(currentTenant);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ListProductsResponse>(
    shouldFetch ? ['/products/list', currentTenant] : null,
    () => productsApi.list(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const createProduct = async (productData: CreateProductRequest): Promise<Product> => {
    try {
      const result = await productsApi.create(productData);

      // Optimistically update the local cache
      if (data) {
        mutate({
          ...data,
          data: [...data.data, result.data],
          count: data.count + 1,
        }, false);
      }

      return result.data;
    } catch (error) {
      // Re-fetch on error to ensure data consistency
      mutate();
      throw error;
    }
  };

  const updateProduct = async (productId: number, productData: UpdateProductRequest): Promise<Product> => {
    try {
      const result = await productsApi.update(productId, productData);

      // Optimistically update the local cache
      if (data) {
        mutate({
          ...data,
          data: data.data.map(product =>
            product.id === productId ? result.data : product
          ),
        }, false);
      }

      return result.data;
    } catch (error) {
      // Re-fetch on error to ensure data consistency
      mutate();
      throw error;
    }
  };

  const deleteProduct = async (productId: number): Promise<void> => {
    try {
      await productsApi.delete(productId);

      // Optimistically update the local cache
      if (data) {
        mutate({
          ...data,
          data: data.data.filter(product => product.id !== productId),
          count: data.count - 1,
        }, false);
      }
    } catch (error) {
      // Re-fetch on error to ensure data consistency
      mutate();
      throw error;
    }
  };

  return {
    products: data?.data || [],
    tenantId: data?.tenantId,
    total: data?.count || 0,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
