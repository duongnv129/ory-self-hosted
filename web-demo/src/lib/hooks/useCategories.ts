/**
 * Categories Data Hooks
 * SWR-based hooks for fetching and mutating category data
 */

import useSWR from 'swr';
import { categoriesApi } from '@/lib/api';
import { Category } from '@/lib/types/models';
import { CreateCategoryRequest, UpdateCategoryRequest } from '@/lib/types/api';

/**
 * Hook to fetch all categories for the current tenant
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
