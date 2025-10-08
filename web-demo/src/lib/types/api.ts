/**
 * API Request/Response Types
 * Types for API communication layer
 */

import { User, Product, Category, Role, Permission } from './models';

// Generic API Response wrapper
export interface ApiResponse<T = unknown> {
  message: string;
  data?: T;
  tenant_id?: string;
  context?: {
    userId?: string;
    tenantId?: string;
    userEmail?: string;
  };
}

// Generic API Error
export interface ApiError {
  error: string;
  message: string;
  details?: string;
  statusCode?: number;
}

// Users API
export interface CreateUserRequest {
  email: string;
  name: string;
}

export interface CreateUserResponse extends ApiResponse {
  user: User;
}

export interface ListUsersResponse extends ApiResponse {
  users: User[];
  count: number;
}

export interface GetUserResponse extends ApiResponse {
  user: User;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
}

export interface UpdateUserResponse extends ApiResponse {
  user: User;
}

export interface DeleteUserResponse extends ApiResponse {
  user: User;
}

// Products API
export interface CreateProductRequest {
  name: string;
  category: string;
  price: number;
}

export interface CreateProductResponse extends ApiResponse {
  data: Product;
}

export interface ListProductsResponse extends ApiResponse {
  data: Product[];
  count: number;
  tenantId: string;
}

export interface GetProductResponse extends ApiResponse {
  data: Product;
}

export interface UpdateProductRequest {
  name?: string;
  category?: string;
  price?: number;
}

export interface UpdateProductResponse extends ApiResponse {
  data: Product;
}

export interface DeleteProductResponse extends ApiResponse {
  message: string;
}

// Categories API
export interface CreateCategoryRequest {
  name: string;
  description: string;
}

export interface CreateCategoryResponse extends ApiResponse {
  data: Category;
}

export interface ListCategoriesResponse extends ApiResponse {
  data: Category[];
  count: number;
  tenantId: string;
}

export interface GetCategoryResponse extends ApiResponse {
  data: Category;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
}

export interface UpdateCategoryResponse extends ApiResponse {
  data: Category;
}

export interface DeleteCategoryResponse extends ApiResponse {
  message: string;
}

// Roles API
export interface CreateRoleRequest {
  name: string;
  description?: string;
  inheritsFrom?: string[]; // Array of parent role names
  permissions?: Permission[]; // Array of resource permissions
}

export interface CreateRoleResponse extends ApiResponse {
  data: Role;
}

export interface ListRolesResponse extends ApiResponse {
  roles: Role[];
  count: number;
  tenantId?: string;
  namespace: string;
}

export interface GetRoleResponse extends ApiResponse {
  role: Role;
  permissions?: Permission[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  inheritsFrom?: string[]; // Array of parent role names
  permissions?: Permission[]; // Array of resource permissions
}

export interface UpdateRoleResponse extends ApiResponse {
  data: Role;
}

export interface DeleteRoleResponse extends ApiResponse {
  message: string;
}
