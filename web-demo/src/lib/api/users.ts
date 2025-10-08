/**
 * Users API Client
 * Handles all user-related API operations through Oathkeeper
 *
 * Context-Aware Behavior:
 * - Simple RBAC: Layout automatically clears tenant context, requests are sent WITHOUT x-tenant-id header (global scope)
 * - Tenant/Resource RBAC: Tenant context is set, requests include x-tenant-id header (tenant-scoped)
 */

import { ApiClient } from './client';
import {
  CreateUserRequest,
  CreateUserResponse,
  ListUsersResponse,
  GetUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  DeleteUserResponse,
  UserRoleAssignmentRequest,
  UserRoleAssignmentResponse,
  UserRoleRemovalRequest,
  UserRoleRemovalResponse,
  GetUserRolesResponse,
} from '@/lib/types/api';

export class UsersApi {
  constructor(private client: ApiClient) {}

  /**
   * List all users for the current tenant
   */
  async list(): Promise<ListUsersResponse> {
    return this.client.get<ListUsersResponse>('/users/list');
  }

  /**
   * Get a specific user by ID
   */
  async get(userId: string): Promise<GetUserResponse> {
    return this.client.get<GetUserResponse>(`/users/get/${userId}`);
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserRequest): Promise<CreateUserResponse> {
    return this.client.post<CreateUserResponse>('/users/create', data);
  }

  /**
   * Update an existing user
   */
  async update(userId: string, data: UpdateUserRequest): Promise<UpdateUserResponse> {
    return this.client.put<UpdateUserResponse>(`/users/update/${userId}`, data);
  }

  /**
   * Delete a user
   */
  async delete(userId: string): Promise<DeleteUserResponse> {
    return this.client.delete<DeleteUserResponse>(`/users/delete/${userId}`);
  }

  /**
   * Assign a role to a user
   */
  async assignRole(data: UserRoleAssignmentRequest): Promise<UserRoleAssignmentResponse> {
    return this.client.post<UserRoleAssignmentResponse>('/users/assign-role', data);
  }

  /**
   * Remove a role from a user
   */
  async removeRole(data: UserRoleRemovalRequest): Promise<UserRoleRemovalResponse> {
    return this.client.post<UserRoleRemovalResponse>('/users/remove-role', data);
  }

  /**
   * Get all roles assigned to a user
   */
  async getRoles(userEmail: string): Promise<GetUserRolesResponse> {
    return this.client.get<GetUserRolesResponse>(`/users/roles/${encodeURIComponent(userEmail)}`);
  }
}
