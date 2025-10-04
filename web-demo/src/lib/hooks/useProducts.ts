/**
 * Products Data Hooks
 * SWR-based hooks for fetching and mutating product data
 */

import useSWR from 'swr';
import { productsApi } from '@/lib/api';
import { Product } from '@/lib/types/models';
import { CreateProductRequest, UpdateProductRequest } from '@/lib/types/api';

/**
 * Hook to fetch all products for the current tenant
 */
export function useProducts() {
  const { data, error, isLoading, mutate } = useSWR(
    '/products/list',
    () => productsApi.list(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    products: data?.data || [],
    count: data?.count || 0,
    tenantId: data?.tenantId,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch a specific product by ID
 */
export function useProduct(productId: number | null) {
  const { data, error, isLoading, mutate } = useSWR(
    productId ? `/products/get/${productId}` : null,
    () => (productId ? productsApi.get(productId) : null),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    product: data?.data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Hook for product mutation operations
 */
export function useProductMutations() {
  const createProduct = async (data: CreateProductRequest): Promise<Product> => {
    const response = await productsApi.create(data);
    return response.data;
  };

  const updateProduct = async (productId: number, data: UpdateProductRequest): Promise<Product> => {
    const response = await productsApi.update(productId, data);
    return response.data;
  };

  const deleteProduct = async (productId: number): Promise<void> => {
    await productsApi.delete(productId);
  };

  return {
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
