/**
 * Products API Client
 * Handles all product-related API operations through Oathkeeper
 */

import { ApiClient } from './client';
import {
  CreateProductRequest,
  CreateProductResponse,
  ListProductsResponse,
  GetProductResponse,
  UpdateProductRequest,
  UpdateProductResponse,
  DeleteProductResponse,
} from '@/lib/types/api';

export class ProductsApi {
  constructor(private client: ApiClient) {}

  /**
   * List all products for the current tenant
   */
  async list(): Promise<ListProductsResponse> {
    return this.client.get<ListProductsResponse>('/products/list');
  }

  /**
   * Get a specific product by ID
   */
  async get(productId: number): Promise<GetProductResponse> {
    return this.client.get<GetProductResponse>(`/products/get/${productId}`);
  }

  /**
   * Create a new product
   */
  async create(data: CreateProductRequest): Promise<CreateProductResponse> {
    return this.client.post<CreateProductResponse>('/products/create', data);
  }

  /**
   * Update an existing product
   */
  async update(productId: number, data: UpdateProductRequest): Promise<UpdateProductResponse> {
    return this.client.put<UpdateProductResponse>(`/products/update/${productId}`, data);
  }

  /**
   * Delete a product
   */
  async delete(productId: number): Promise<DeleteProductResponse> {
    return this.client.delete<DeleteProductResponse>(`/products/delete/${productId}`);
  }
}
