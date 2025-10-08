/**
 * Users Data Hooks
 * SWR-based hooks for fetching and mutating user data
 *
 * Context-Aware Behavior (managed by layout, not by these hooks):
 * - Simple RBAC: Simple RBAC layout clears tenant context -> API requests WITHOUT x-tenant-id -> global users
 * - Tenant/Resource RBAC: Tenant context is set -> API requests WITH x-tenant-id -> tenant-scoped users
 *
 * Note: The returned tenantId field indicates which tenant the data belongs to (null for global scope)
 */

import useSWR from 'swr';
import { usersApi } from '@/lib/api';
import { User } from '@/lib/types/models';
import { CreateUserRequest, UpdateUserRequest, UserRoleAssignmentRequest, UserRoleRemovalRequest } from '@/lib/types/api';

/**
 * Hook to fetch all users
 * Behavior is determined by tenant context (set/cleared by layout):
 * - No tenant context: Returns all users globally (Simple RBAC)
 * - With tenant context: Returns tenant-scoped users (Tenant/Resource RBAC)
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
