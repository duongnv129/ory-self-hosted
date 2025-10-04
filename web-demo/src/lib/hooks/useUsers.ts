/**
 * Users Data Hooks
 * SWR-based hooks for fetching and mutating user data
 */

import useSWR from 'swr';
import { usersApi } from '@/lib/api';
import { User } from '@/lib/types/models';
import { CreateUserRequest, UpdateUserRequest } from '@/lib/types/api';

/**
 * Hook to fetch all users for the current tenant
 */
export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR(
    '/users/list',
    () => usersApi.list(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    users: data?.users || [],
    count: data?.count || 0,
    tenantId: data?.tenant_id,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch a specific user by ID
 */
export function useUser(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/users/get/${userId}` : null,
    () => (userId ? usersApi.get(userId) : null),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    user: data?.user,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Hook for user mutation operations
 */
export function useUserMutations() {
  const createUser = async (data: CreateUserRequest): Promise<User> => {
    const response = await usersApi.create(data);
    return response.user;
  };

  const updateUser = async (userId: string, data: UpdateUserRequest): Promise<User> => {
    const response = await usersApi.update(userId, data);
    return response.user;
  };

  const deleteUser = async (userId: string): Promise<void> => {
    await usersApi.delete(userId);
  };

  return {
    createUser,
    updateUser,
    deleteUser,
  };
}
