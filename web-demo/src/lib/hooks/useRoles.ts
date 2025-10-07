/**
 * Roles Data Hooks
 * SWR-based hooks for fetching and mutating role data
 *
 * Context-Aware Behavior (managed by layout, not by these hooks):
 * - Simple RBAC: Simple RBAC layout clears tenant context -> API requests WITHOUT x-tenant-id -> global roles
 * - Tenant/Resource RBAC: Tenant context is set -> API requests WITH x-tenant-id -> tenant-scoped roles
 *
 * Note: The returned tenantId field indicates which tenant the data belongs to (null for global scope)
 */

import useSWR from 'swr';
import { rolesApi } from '@/lib/api';
import { Role } from '@/lib/types/models';
import { CreateRoleRequest, UpdateRoleRequest } from '@/lib/types/api';

/**
 * Hook to fetch all roles
 * Behavior is determined by tenant context (set/cleared by layout):
 * - No tenant context: Returns all roles globally (Simple RBAC)
 * - With tenant context: Returns tenant-scoped roles (Tenant/Resource RBAC)
 */
export function useRoles() {
  const { data, error, isLoading, mutate } = useSWR(
    '/roles/list',
    () => rolesApi.list(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    roles: data?.data || [],
    count: data?.count || 0,
    tenantId: data?.tenantId,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch a specific role by name
 */
export function useRole(roleName: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    roleName ? `/roles/get/${encodeURIComponent(roleName)}` : null,
    () => (roleName ? rolesApi.get(roleName) : null),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    role: data?.data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Hook for role mutation operations
 */
export function useRoleMutations() {
  const createRole = async (data: CreateRoleRequest): Promise<Role> => {
    const response = await rolesApi.create(data);
    return response.data;
  };

  const updateRole = async (
    roleName: string,
    data: UpdateRoleRequest
  ): Promise<Role> => {
    const response = await rolesApi.update(roleName, data);
    return response.data;
  };

  const deleteRole = async (roleName: string): Promise<void> => {
    await rolesApi.delete(roleName);
  };

  return {
    createRole,
    updateRole,
    deleteRole,
  };
}
