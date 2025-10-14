/**
 * Unified Products Hook - Next.js Pro Pattern
 * Context-aware SWR-based hook for managing products across both Simple and Resource RBAC
 *
 * Next.js Pro Principles Applied:
 * - Single Responsibility: One hook handles all product operations
 * - Consistency: Unified interface for both RBAC models
 * - Performance: Optimistic updates and intelligent caching
 * - Type Safety: Comprehensive TypeScript coverage
 * - Error Handling: Robust error handling with user feedback
 *
 * Context-Aware Behavior:
 * - Simple RBAC: Layout clears tenant context -> API requests WITHOUT x-tenant-id -> global products
 * - Resource RBAC: Tenant context is set -> API requests WITH x-tenant-id -> tenant-scoped products
 */

import useSWR from 'swr';
import { productsApi } from '@/lib/api';
import { useTenant } from '@/lib/context/TenantContext';
import { Product } from '@/lib/types/models';
import { CreateProductRequest, UpdateProductRequest, ListProductsResponse } from '@/lib/types/api';

/**
 * Main hook for product management
 * Automatically adapts behavior based on tenant context
 */
export function useProducts() {
  const { currentTenant } = useTenant();

  // For resource RBAC, we need tenant context; for simple RBAC, we don't
  const shouldFetch = currentTenant !== undefined; // null or string is ok, undefined means not initialized

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ListProductsResponse>(
    shouldFetch ? ['/products/list', currentTenant] : '/products/list',
    () => productsApi.list(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: currentTenant ? 30000 : 0, // Only auto-refresh for resource RBAC
    }
  );

  const createProduct = async (productData: CreateProductRequest): Promise<Product> => {
    try {
      const result = await productsApi.create(productData);

      // Optimistic updates for better UX (Next.js Pro pattern)
      if (data && currentTenant) {
        mutate({
          ...data,
          data: [...data.data, result.data],
          count: data.count + 1,
        }, false);
      } else {
        // Simple RBAC - just refetch
        mutate();
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

      // Optimistic updates for resource RBAC
      if (data && currentTenant) {
        mutate({
          ...data,
          data: data.data.map(product =>
            product.id === productId ? result.data : product
          ),
        }, false);
      } else {
        // Simple RBAC - just refetch
        mutate();
      }

      return result.data;
    } catch (error) {
      mutate();
      throw error;
    }
  };

  const deleteProduct = async (productId: number): Promise<void> => {
    try {
      await productsApi.delete(productId);

      // Optimistic updates for resource RBAC
      if (data && currentTenant) {
        mutate({
          ...data,
          data: data.data.filter(product => product.id !== productId),
          count: data.count - 1,
        }, false);
      } else {
        // Simple RBAC - just refetch
        mutate();
      }
    } catch (error) {
      mutate();
      throw error;
    }
  };

  return {
    products: data?.data || [],
    count: data?.count || 0,
    tenantId: data?.tenantId,
    total: data?.count || 0, // Alias for consistency
    isLoading,
    isError: !!error,
    error,
    mutate,
    refresh: mutate, // Alias for resource RBAC compatibility
    createProduct,
    updateProduct,
    deleteProduct,
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
