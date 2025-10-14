/**
 * Resource Roles Hook
 * SWR-based hook for managing roles in resource-scoped RBAC context
 */

import useSWR from 'swr';
import { rolesApi } from '@/lib/api';
import { useTenant } from '@/lib/context/TenantContext';
import { ListRolesResponse, CreateRoleRequest, UpdateRoleRequest, GetRoleResponse } from '@/lib/types/api';
import { Role } from '@/lib/types/models';

export function useResourceRoles() {
  const { currentTenant } = useTenant();

  // Only fetch roles when tenant is selected (resource RBAC requires tenant context)
  const shouldFetch = Boolean(currentTenant);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ListRolesResponse>(
    shouldFetch ? ['/roles/list', currentTenant] : null,
    () => rolesApi.list(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const createRole = async (roleData: CreateRoleRequest): Promise<Role> => {
    try {
      const result = await rolesApi.create(roleData);

      // Optimistically update the local cache
      if (data) {
        mutate({
          ...data,
          roles: [...data.roles, result.data],
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

  const updateRole = async (roleName: string, roleData: UpdateRoleRequest): Promise<Role> => {
    try {
      const result = await rolesApi.update(roleName, roleData);

      // Optimistically update the local cache
      if (data) {
        mutate({
          ...data,
          roles: data.roles.map(role =>
            role.name === roleName ? result.data : role
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

  const deleteRole = async (roleName: string): Promise<void> => {
    try {
      await rolesApi.delete(roleName);

      // Optimistically update the local cache
      if (data) {
        mutate({
          ...data,
          roles: data.roles.filter(role => role.name !== roleName),
          count: data.count - 1,
        }, false);
      }
    } catch (error) {
      // Re-fetch on error to ensure data consistency
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
    tenantId: data?.tenantId,
    namespace: data?.namespace,
    total: data?.count || 0,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
    createRole,
    updateRole,
    deleteRole,
    getRoleWithPermissions,
  };
}
