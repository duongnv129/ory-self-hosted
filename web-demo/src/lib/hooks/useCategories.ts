/**
 * Unified Categories Hook - Next.js Pro Pattern
 * Context-aware SWR-based hook for managing categories across both Simple and Resource RBAC
 *
 * Next.js Pro Principles Applied:
 * - Single Responsibility: One hook handles all category operations
 * - Consistency: Unified interface for both RBAC models
 * - Performance: Optimistic updates and intelligent caching
 * - Type Safety: Comprehensive TypeScript coverage
 * - Error Handling: Robust error handling with user feedback
 *
 * Context-Aware Behavior:
 * - Simple RBAC: Layout clears tenant context -> API requests WITHOUT x-tenant-id -> global categories
 * - Resource RBAC: Tenant context is set -> API requests WITH x-tenant-id -> tenant-scoped categories
 */

import useSWR from 'swr';
import { categoriesApi } from '@/lib/api';
import { useTenant } from '@/lib/context/TenantContext';
import { Category } from '@/lib/types/models';
import { CreateCategoryRequest, UpdateCategoryRequest, ListCategoriesResponse } from '@/lib/types/api';

/**
 * Main hook for category management
 * Automatically adapts behavior based on tenant context
 */
export function useCategories() {
  const { currentTenant } = useTenant();

  // For resource RBAC, we need tenant context; for simple RBAC, we don't
  const shouldFetch = currentTenant !== undefined; // null or string is ok, undefined means not initialized

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ListCategoriesResponse>(
    shouldFetch ? ['/categories/list', currentTenant] : '/categories/list',
    () => categoriesApi.list(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: currentTenant ? 30000 : 0, // Only auto-refresh for resource RBAC
    }
  );

  const createCategory = async (categoryData: CreateCategoryRequest): Promise<Category> => {
    try {
      const result = await categoriesApi.create(categoryData);

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

  const updateCategory = async (categoryId: number, categoryData: UpdateCategoryRequest): Promise<Category> => {
    try {
      const result = await categoriesApi.update(categoryId, categoryData);

      // Optimistic updates for resource RBAC
      if (data && currentTenant) {
        mutate({
          ...data,
          data: data.data.map(category =>
            category.id === categoryId ? result.data : category
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

  const deleteCategory = async (categoryId: number): Promise<void> => {
    try {
      await categoriesApi.delete(categoryId);

      // Optimistic updates for resource RBAC
      if (data && currentTenant) {
        mutate({
          ...data,
          data: data.data.filter(category => category.id !== categoryId),
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
    categories: data?.data || [],
    count: data?.count || 0,
    tenantId: data?.tenantId,
    total: data?.count || 0, // Alias for consistency
    isLoading,
    isError: !!error,
    error,
    mutate,
    refresh: mutate, // Alias for resource RBAC compatibility
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

/**
 * Hook to fetch a specific category by ID
 */
export function useCategory(categoryId: number | null) {
  const { data, error, isLoading, mutate } = useSWR(
    categoryId ? `/categories/get/${categoryId}` : null,
    () => (categoryId ? categoriesApi.get(categoryId) : null),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    category: data?.data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Hook for category mutation operations
 */
export function useCategoryMutations() {
  const createCategory = async (data: CreateCategoryRequest): Promise<Category> => {
    const response = await categoriesApi.create(data);
    return response.data;
  };

  const updateCategory = async (
    categoryId: number,
    data: UpdateCategoryRequest
  ): Promise<Category> => {
    const response = await categoriesApi.update(categoryId, data);
    return response.data;
  };

  const deleteCategory = async (categoryId: number): Promise<void> => {
    await categoriesApi.delete(categoryId);
  };

  return {
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
