/**
 * Unified Users Hook - Next.js Pro Pattern
 * Context-aware SWR-based hook for managing users across both Simple and Resource RBAC
 *
 * Next.js Pro Principles Applied:
 * - Single Responsibility: One hook handles all user operations
 * - Consistency: Unified interface for both RBAC models
 * - Performance: Optimistic updates and intelligent caching
 * - Type Safety: Comprehensive TypeScript coverage
 * - Error Handling: Robust error handling with user feedback
 *
 * Context-Aware Behavior:
 * - Simple RBAC: Layout clears tenant context -> API requests WITHOUT x-tenant-id -> global users
 * - Resource RBAC: Tenant context is set -> API requests WITH x-tenant-id -> tenant-scoped users
 */

import useSWR from 'swr';
import { usersApi } from '@/lib/api';
import { useTenant } from '@/lib/context/TenantContext';
import { User } from '@/lib/types/models';
import { CreateUserRequest, UpdateUserRequest, UserRoleAssignmentRequest, UserRoleRemovalRequest, ListUsersResponse } from '@/lib/types/api';

/**
 * Main hook for user management
 * Automatically adapts behavior based on tenant context
 */
export function useUsers() {
  const { currentTenant } = useTenant();

  // For resource RBAC, we need tenant context; for simple RBAC, we don't
  const shouldFetch = currentTenant !== undefined; // null or string is ok, undefined means not initialized

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ListUsersResponse>(
    shouldFetch ? ['/users/list', currentTenant] : '/users/list',
    () => usersApi.list(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: currentTenant ? 30000 : 0, // Only auto-refresh for resource RBAC
    }
  );

  const createUser = async (userData: CreateUserRequest): Promise<User> => {
    try {
      const result = await usersApi.create(userData);

      // Optimistic updates for better UX (Next.js Pro pattern)
      if (data && currentTenant) {
        mutate({
          ...data,
          users: [...data.users, result.user],
          count: (data.count || 0) + 1,
        }, false);
      } else {
        // Simple RBAC - just refetch
        mutate();
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

      // Optimistic updates for resource RBAC
      if (data && currentTenant) {
        mutate({
          ...data,
          users: data.users.map(user =>
            user.id === userId ? result.user : user
          ),
        }, false);
      } else {
        // Simple RBAC - just refetch
        mutate();
      }

      return result.user;
    } catch (error) {
      mutate();
      throw error;
    }
  };

  const deleteUser = async (userId: string): Promise<void> => {
    try {
      await usersApi.delete(userId);

      // Optimistic updates for resource RBAC
      if (data && currentTenant) {
        mutate({
          ...data,
          users: data.users.filter(user => user.id !== userId),
          count: Math.max((data.count || 0) - 1, 0),
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
    users: data?.users || [],
    count: data?.count || 0,
    tenantId: data?.tenant_id,
    total: data?.count || 0, // Alias for consistency
    isLoading,
    isError: !!error,
    error,
    mutate,
    refresh: mutate, // Alias for resource RBAC compatibility
    createUser,
    updateUser,
    deleteUser,
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
 * Hook to fetch user roles by email
 */
export function useUserRoles(userEmail: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    userEmail ? `/users/roles/${userEmail}` : null,
    () => (userEmail ? usersApi.getRoles(userEmail) : null),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    roles: data?.roles || [],
    userEmail: data?.userEmail,
    tenantId: data?.tenant_id,
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

/**
 * Hook for user role management operations
 */
export function useUserRoleMutations() {
  const assignRole = async (data: UserRoleAssignmentRequest): Promise<string[]> => {
    const response = await usersApi.assignRole(data);
    return response.userRoles;
  };

  const removeRole = async (data: UserRoleRemovalRequest): Promise<string[]> => {
    const response = await usersApi.removeRole(data);
    return response.userRoles;
  };

  return {
    assignRole,
    removeRole,
  };
}
