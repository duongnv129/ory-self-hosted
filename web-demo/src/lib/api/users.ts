/**
 * Users API Client
 * Handles all user-related API operations through Oathkeeper
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
}
