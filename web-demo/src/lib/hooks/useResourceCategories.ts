/**
 * Resource Categories Hook
 * SWR-based hook for managing categories in resource-scoped RBAC context
 */

import useSWR from 'swr';
import { categoriesApi } from '@/lib/api';
import { useTenant } from '@/lib/context/TenantContext';
import { ListCategoriesResponse, CreateCategoryRequest, UpdateCategoryRequest } from '@/lib/types/api';
import { Category } from '@/lib/types/models';

export function useResourceCategories() {
  const { currentTenant } = useTenant();

  // Only fetch categories when tenant is selected (resource RBAC requires tenant context)
  const shouldFetch = Boolean(currentTenant);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ListCategoriesResponse>(
    shouldFetch ? ['/categories/list', currentTenant] : null,
    () => categoriesApi.list(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const createCategory = async (categoryData: CreateCategoryRequest): Promise<Category> => {
    try {
      const result = await categoriesApi.create(categoryData);

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

  const updateCategory = async (categoryId: number, categoryData: UpdateCategoryRequest): Promise<Category> => {
    try {
      const result = await categoriesApi.update(categoryId, categoryData);

      // Optimistically update the local cache
      if (data) {
        mutate({
          ...data,
          data: data.data.map(category =>
            category.id === categoryId ? result.data : category
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

  const deleteCategory = async (categoryId: number): Promise<void> => {
    try {
      await categoriesApi.delete(categoryId);

      // Optimistically update the local cache
      if (data) {
        mutate({
          ...data,
          data: data.data.filter(category => category.id !== categoryId),
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
    categories: data?.data || [],
    tenantId: data?.tenantId,
    total: data?.count || 0,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
