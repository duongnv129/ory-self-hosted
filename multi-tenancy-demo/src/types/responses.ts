/**
 * API response type definitions
 */

import { User, Product, Category, Role } from './models';

/**
 * Base response context
 */
export interface ResponseContext {
  userId?: string;
  tenantId?: string;
  ketoNamespace?: string;
}

/**
 * Generic success response
 */
export interface SuccessResponse<T> {
  message: string;
  data?: T;
  context?: ResponseContext;
}

/**
 * Generic list response
 */
export interface ListResponse<T> {
  message: string;
  data: T[];
  count: number;
  tenantId?: string;
  context?: ResponseContext;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  details?: string;
  [key: string]: unknown;
}

/**
 * User responses
 */
export interface UserResponse extends SuccessResponse<User> {
  tenant_id?: string;
  user: User;
}

export interface UserListResponse {
  message: string;
  tenant_id?: string;
  users: User[];
  count: number;
}

/**
 * Product responses
 */
export interface ProductResponse extends SuccessResponse<Product> {}

/**
 * Category responses
 */
export interface CategoryResponse extends SuccessResponse<Category> {}

/**
 * Permission model representing a resource-action pair from Keto
 */
export interface Permission {
  resource: string;
  action: string;
}

/**
 * Role responses
 */
export interface RoleResponse {
  message: string;
  role: Role;
  permissions?: Permission[];
  namespace: string;
  context?: ResponseContext;
}

export interface RoleListResponse {
  message: string;
  roles: Role[];
  count: number;
  namespace: string;
  tenant_id?: string;
  context?: ResponseContext;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  apis: string[];
  timestamp: string;
}
