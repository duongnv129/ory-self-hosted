/**
 * Products Data Hooks
 * SWR-based hooks for fetching and mutating product data
 *
 * Context-Aware Behavior (managed by layout, not by these hooks):
 * - Simple RBAC: Simple RBAC layout clears tenant context -> API requests WITHOUT x-tenant-id -> global products
 * - Tenant/Resource RBAC: Tenant context is set -> API requests WITH x-tenant-id -> tenant-scoped products
 *
 * Note: The returned tenantId field indicates which tenant the data belongs to (null for global scope)
 */

import useSWR from 'swr';
import { productsApi } from '@/lib/api';
import { Product } from '@/lib/types/models';
import { CreateProductRequest, UpdateProductRequest } from '@/lib/types/api';

/**
 * Hook to fetch all products
 * Behavior is determined by tenant context (set/cleared by layout):
 * - No tenant context: Returns all products globally (Simple RBAC)
 * - With tenant context: Returns tenant-scoped products (Tenant/Resource RBAC)
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
