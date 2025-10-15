/**
 * Unified Roles Hook - Next.js Pro Pattern
 * Context-aware SWR-based hook for managing roles across both Simple and Resource RBAC
 *
 * Next.js Pro Principles Applied:
 * - Single Responsibility: One hook handles all role operations
 * - Consistency: Unified interface for both RBAC models
 * - Performance: Optimistic updates and intelligent caching
 * - Type Safety: Comprehensive TypeScript coverage
 * - Error Handling: Robust error handling with user feedback
 *
 * Context-Aware Behavior:
 * - Simple RBAC: Layout clears tenant context -> API requests WITHOUT x-tenant-id -> global roles
 * - Resource RBAC: Tenant context is set -> API requests WITH x-tenant-id -> tenant-scoped roles
 */

import useSWR from 'swr';
import { rolesApi } from '@/lib/api';
import { useTenant } from '@/lib/context/TenantContext';
import { Role } from '@/lib/types/models';
import { CreateRoleRequest, UpdateRoleRequest, ListRolesResponse } from '@/lib/types/api';

/**
 * Hook for role list management
 * Automatically adapts behavior based on tenant context
 * Focused on listing roles only - use useRole for individual role operations
 */
export function useRoles() {
  const { currentTenant } = useTenant();

  // For resource RBAC, we need tenant context; for simple RBAC, we don't
  const shouldFetch = currentTenant !== undefined; // null or string is ok, undefined means not initialized

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ListRolesResponse>(
    shouldFetch ? ['/roles/list', currentTenant] : '/roles/list',
    () => rolesApi.list(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: currentTenant ? 30000 : 0, // Only auto-refresh for resource RBAC
    }
  );

  return {
    roles: data?.roles || [],
    count: data?.count || 0,
    tenantId: data?.tenantId,
    namespace: data?.namespace,
    total: data?.count || 0, // Alias for consistency
    isLoading,
    isError: !!error,
    error,
    mutate,
    refresh: mutate, // Alias for resource RBAC compatibility
  };
}

/**
 * Hook to fetch and manage a specific role by name
 * Handles individual role operations: create, update, delete, get with permissions
 * Compatible with both RBAC models
 */
export function useRole(roleName: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    roleName ? `/roles/get/${encodeURIComponent(roleName)}` : null,
    async () => {
      if (!roleName) return null;

      try {
        const result = await rolesApi.get(roleName);
        console.log(`✅ Successfully fetched role "${roleName}":`, {
          role: result.role?.name,
          roleId: result.role?.id,
          permissions: result.permissions?.length || 0,
          permissionDetails: result.permissions,
          rawResponse: result
        });

        // Next.js Pro Pattern: Validate response structure
        if (!result.role) {
          throw new Error(`Invalid API response: role data missing for "${roleName}"`);
        }

        // Ensure permissions is always an array
        const permissions = Array.isArray(result.permissions) ? result.permissions : [];

        return {
          ...result,
          permissions
        };
      } catch (err: unknown) {
        console.error(`❌ Failed to fetch role "${roleName}":`, err);
        // Let SWR handle the error properly - don't transform it here
        throw err;
      }
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false, // Don't retry 404s
      revalidateOnReconnect: true, // Next.js Pro Pattern: Better offline handling
    }
  );

  const createRole = async (roleData: CreateRoleRequest): Promise<Role> => {
    try {
      const result = await rolesApi.create(roleData);

      // Trigger re-fetch of role list if needed
      // Note: Components should use both useRoles() and useRole() for full state management

      return result.data;
    } catch (error) {
      throw error;
    }
  };

  const updateRole = async (updateRoleName: string, roleData: UpdateRoleRequest): Promise<Role> => {
    try {
      const result = await rolesApi.update(updateRoleName, roleData);

      // If we're updating the current role, update local cache
      if (updateRoleName === roleName) {
        mutate({
          message: 'Role updated successfully',
          role: result.data,
          permissions: data?.permissions || [],
        }, false);
      }

      return result.data;
    } catch (error) {
      // Re-fetch on error to ensure data consistency
      if (updateRoleName === roleName) {
        mutate();
      }
      throw error;
    }
  };

  const deleteRole = async (deleteRoleName: string): Promise<void> => {
    try {
      await rolesApi.delete(deleteRoleName);

      // If we deleted the current role, clear the cache
      if (deleteRoleName === roleName) {
        mutate(undefined, false);
      }
    } catch (error) {
      throw error;
    }
  };

  return {
    role: data?.role,
    permissions: data?.permissions || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
    refresh: mutate,
    // Role management operations
    createRole,
    updateRole,
    deleteRole,
  };
}

/**
 * Hook for role mutation operations
 * Legacy compatibility - prefer using main useRoles hook
 * @deprecated Use useRoles() instead for better performance and consistency
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
