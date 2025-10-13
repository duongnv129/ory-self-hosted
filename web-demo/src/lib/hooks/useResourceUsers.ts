/**
 * Resource Users Hook
 * SWR-based hook for managing users in resource-scoped RBAC context
 */

import useSWR from 'swr';
import { usersApi } from '@/lib/api';
import { useTenant } from '@/lib/context/TenantContext';
import { ListUsersResponse, CreateUserRequest, UpdateUserRequest } from '@/lib/types/api';
import { User } from '@/lib/types/models';

export function useResourceUsers() {
  const { currentTenant } = useTenant();

  // Only fetch users when tenant is selected (resource RBAC requires tenant context)
  const shouldFetch = Boolean(currentTenant);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ListUsersResponse>(
    shouldFetch ? ['/users/list', currentTenant] : null,
    () => usersApi.list(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const createUser = async (userData: CreateUserRequest): Promise<User> => {
    try {
      const result = await usersApi.create(userData);

      // Optimistically update the local cache
      if (data) {
        mutate({
          ...data,
          users: [...data.users, result.user],
        }, false);
      }

      return result.user;
    } catch (error) {
      // Re-fetch on error to ensure data consistency
      mutate();
      throw error;
    }
  };

  const updateUser = async (userId: string, userData: UpdateUserRequest): Promise<User> => {
    try {
      const result = await usersApi.update(userId, userData);

      // Optimistically update the local cache
      if (data) {
        mutate({
          ...data,
          users: data.users.map(user =>
            user.id === userId ? result.user : user
          ),
        }, false);
      }

      return result.user;
    } catch (error) {
      // Re-fetch on error to ensure data consistency
      mutate();
      throw error;
    }
  };

  const deleteUser = async (userId: string): Promise<void> => {
    try {
      await usersApi.delete(userId);

      // Optimistically update the local cache
      if (data) {
        mutate({
          ...data,
          users: data.users.filter(user => user.id !== userId),
        }, false);
      }
    } catch (error) {
      // Re-fetch on error to ensure data consistency
      mutate();
      throw error;
    }
  };

  return {
    users: data?.users || [],
    tenantId: data?.tenant_id,
    total: data?.count || 0,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
    createUser,
    updateUser,
    deleteUser,
  };
}
