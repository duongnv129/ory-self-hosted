/**
 * Categories API Client
 * Handles all category-related API operations through Oathkeeper
 */

import { ApiClient } from './client';
import {
  CreateCategoryRequest,
  CreateCategoryResponse,
  ListCategoriesResponse,
  GetCategoryResponse,
  UpdateCategoryRequest,
  UpdateCategoryResponse,
  DeleteCategoryResponse,
} from '@/lib/types/api';

export class CategoriesApi {
  constructor(private client: ApiClient) {}

  /**
   * List all categories for the current tenant
   */
  async list(): Promise<ListCategoriesResponse> {
    return this.client.get<ListCategoriesResponse>('/categories/list');
  }

  /**
   * Get a specific category by ID
   */
  async get(categoryId: number): Promise<GetCategoryResponse> {
    return this.client.get<GetCategoryResponse>(`/categories/get/${categoryId}`);
  }

  /**
   * Create a new category
   */
  async create(data: CreateCategoryRequest): Promise<CreateCategoryResponse> {
    return this.client.post<CreateCategoryResponse>('/categories/create', data);
  }

  /**
   * Update an existing category
   */
  async update(categoryId: number, data: UpdateCategoryRequest): Promise<UpdateCategoryResponse> {
    return this.client.put<UpdateCategoryResponse>(`/categories/update/${categoryId}`, data);
  }

  /**
   * Delete a category
   */
  async delete(categoryId: number): Promise<DeleteCategoryResponse> {
    return this.client.delete<DeleteCategoryResponse>(`/categories/delete/${categoryId}`);
  }
}
