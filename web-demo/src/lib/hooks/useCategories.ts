/**
 * Categories Data Hooks
 * SWR-based hooks for fetching and mutating category data
 *
 * Context-Aware Behavior (managed by layout, not by these hooks):
 * - Simple RBAC: Simple RBAC layout clears tenant context -> API requests WITHOUT x-tenant-id -> global categories
 * - Tenant/Resource RBAC: Tenant context is set -> API requests WITH x-tenant-id -> tenant-scoped categories
 *
 * Note: The returned tenantId field indicates which tenant the data belongs to (null for global scope)
 */

import useSWR from 'swr';
import { categoriesApi } from '@/lib/api';
import { Category } from '@/lib/types/models';
import { CreateCategoryRequest, UpdateCategoryRequest } from '@/lib/types/api';

/**
 * Hook to fetch all categories
 * Behavior is determined by tenant context (set/cleared by layout):
 * - No tenant context: Returns all categories globally (Simple RBAC)
 * - With tenant context: Returns tenant-scoped categories (Tenant/Resource RBAC)
 */
export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR(
    '/categories/list',
    () => categoriesApi.list(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    categories: data?.data || [],
    count: data?.count || 0,
    tenantId: data?.tenantId,
    isLoading,
    isError: !!error,
    error,
    mutate,
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
