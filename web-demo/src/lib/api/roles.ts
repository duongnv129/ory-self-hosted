/**
 * Roles API Client
 * Handles all role-related API operations through the multi-tenancy-demo service
 *
 * Context-Aware Behavior:
 * - Simple RBAC: Layout automatically clears tenant context, requests are sent WITHOUT x-tenant-id header (global scope)
 * - Tenant/Resource RBAC: Tenant context is set, requests include x-tenant-id header (tenant-scoped)
 */

import { ApiClient } from './client';
import {
  CreateRoleRequest,
  CreateRoleResponse,
  ListRolesResponse,
  GetRoleResponse,
  UpdateRoleRequest,
  UpdateRoleResponse,
  DeleteRoleResponse,
} from '@/lib/types/api';

export class RolesApi {
  constructor(private client: ApiClient) {}

  /**
   * List all roles for the current tenant and namespace
   */
  async list(): Promise<ListRolesResponse> {
    return this.client.get<ListRolesResponse>('/roles/list');
  }

  /**
   * Get a specific role by name
   */
  async get(roleName: string): Promise<GetRoleResponse> {
    return this.client.get<GetRoleResponse>(`/roles/get/${encodeURIComponent(roleName)}`);
  }

  /**
   * Create a new role
   */
  async create(data: CreateRoleRequest): Promise<CreateRoleResponse> {
    return this.client.post<CreateRoleResponse>('/roles/create', data);
  }

  /**
   * Update an existing role
   */
  async update(roleName: string, data: UpdateRoleRequest): Promise<UpdateRoleResponse> {
    return this.client.put<UpdateRoleResponse>(`/roles/update/${encodeURIComponent(roleName)}`, data);
  }

  /**
   * Delete a role
   */
  async delete(roleName: string): Promise<DeleteRoleResponse> {
    return this.client.delete<DeleteRoleResponse>(`/roles/delete/${encodeURIComponent(roleName)}`);
  }
}
