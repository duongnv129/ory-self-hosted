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
import { CreateRoleRequest, UpdateRoleRequest, GetRoleResponse, ListRolesResponse } from '@/lib/types/api';

/**
 * Main hook for role management
 * Automatically adapts behavior based on tenant context
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

  const createRole = async (roleData: CreateRoleRequest): Promise<Role> => {
    try {
      const result = await rolesApi.create(roleData);

      // Optimistic updates for better UX (Next.js Pro pattern)
      if (data && currentTenant) {
        mutate({
          ...data,
          roles: [...data.roles, result.data],
          count: (data.count || 0) + 1,
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

  const updateRole = async (roleName: string, roleData: UpdateRoleRequest): Promise<Role> => {
    try {
      const result = await rolesApi.update(roleName, roleData);

      // Optimistic updates for resource RBAC
      if (data && currentTenant) {
        mutate({
          ...data,
          roles: data.roles.map(role =>
            role.name === roleName ? result.data : role
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

  const deleteRole = async (roleName: string): Promise<void> => {
    try {
      await rolesApi.delete(roleName);

      // Optimistic updates for resource RBAC
      if (data && currentTenant) {
        mutate({
          ...data,
          roles: data.roles.filter(role => role.name !== roleName),
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

  const getRoleWithPermissions = async (roleName: string): Promise<{ role: Role; permissions: Array<{ resource: string; action: string }> }> => {
    try {
      const result: GetRoleResponse = await rolesApi.get(roleName);

      // Defensive programming - validate response structure
      if (!result.role) {
        throw new Error('Invalid response: role data missing');
      }

      // Type guard for permissions array
      const validPermissions = (result.permissions || []).filter(
        (perm): perm is { resource: string; action: string } =>
          typeof perm === 'object' &&
          perm !== null &&
          typeof perm.resource === 'string' &&
          typeof perm.action === 'string' &&
          perm.resource.length > 0 &&
          perm.action.length > 0
      );

      return {
        role: result.role,
        permissions: validPermissions,
      };
    } catch (error) {
      console.error(`Failed to fetch role ${roleName} with permissions:`, error);
      throw error;
    }
  };

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
    createRole,
    updateRole,
    deleteRole,
    getRoleWithPermissions,
  };
}

/**
 * Hook to fetch a specific role by name
 * Compatible with both RBAC models
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
    role: data?.role,
    permissions: data?.permissions || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
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
