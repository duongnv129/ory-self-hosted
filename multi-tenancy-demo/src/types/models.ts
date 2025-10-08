/**
 * Domain model interfaces for multi-tenancy demo
 */

/**
 * User name structure
 */
export interface UserName {
  first: string;
  last: string;
}

/**
 * User model representing Kratos identity
 */
export interface User {
  id: string;
  email: string;
  name: UserName;
  tenant_ids: string[];
  created_at?: string;
  updated_at?: string;
  state?: string;
}

/**
 * Enhanced user model with role information from Keto
 * Used in API responses to provide complete user data including role assignments
 */
export interface UserWithRoles extends User {
  roles: string[]; // Array of role names assigned to the user from Keto
  ketoNamespace?: string; // The Keto namespace where roles were fetched from
}

/**
 * Kratos identity traits
 */
export interface IdentityTraits {
  email: string;
  name: UserName;
  tenant_ids: string[];
}

/**
 * Kratos identity response from API
 */
export interface KratosIdentity {
  id: string;
  schema_id: string;
  traits: IdentityTraits;
  state: string;
  created_at: string;
  updated_at: string;
}

/**
 * Product model
 */
export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  tenantId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Category model
 */
export interface Category {
  id: number;
  name: string;
  description: string;
  tenantId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Role model with hierarchy support
 */
export interface Role {
  id: number;
  name: string;
  description: string;
  namespace: string;
  tenantId?: string;
  inheritsFrom?: string[]; // Array of role names that this role inherits from
  createdAt: string;
  updatedAt?: string;
}

/**
 * Create user request body
 */
export interface CreateUserRequest {
  email: string;
  name: UserName | string;
  tenant_ids?: string[];
  roles?: string[]; // Array of role names to assign to user
}

/**
 * Update user request body
 */
export interface UpdateUserRequest {
  email?: string;
  name?: UserName | string;
  tenant_ids?: string[];
  roles?: string[]; // Array of role names to assign to user (replaces existing)
}

/**
 * User role assignment request body
 */
export interface UserRoleAssignmentRequest {
  userEmail: string;
  roleName: string;
}

/**
 * User role removal request body
 */
export interface UserRoleRemovalRequest {
  userEmail: string;
  roleName: string;
}

/**
 * Create product request body
 */
export interface CreateProductRequest {
  name: string;
  category?: string;
  price?: number;
}

/**
 * Update product request body
 */
export interface UpdateProductRequest {
  name?: string;
  category?: string;
  price?: number;
}

/**
 * Create category request body
 */
export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

/**
 * Update category request body
 */
export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
}

/**
 * Permission specification for role creation/update
 */
export interface RolePermission {
  resource: string; // e.g., "product", "category"
  action: string; // e.g., "view", "create", "update", "delete"
}

/**
 * Create role request body
 */
export interface CreateRoleRequest {
  name: string;
  description?: string;
  inheritsFrom?: string[]; // Array of parent role names
  permissions?: RolePermission[]; // Array of resource permissions
}

/**
 * Update role request body
 */
export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  inheritsFrom?: string[]; // Array of parent role names
  permissions?: RolePermission[]; // Array of resource permissions
}
