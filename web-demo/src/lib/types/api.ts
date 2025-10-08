/**
 * API Request/Response Types
 * Types for API communication layer
 */

import { User, UserWithRoles, Product, Category, Role, Permission } from './models';

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
/**
 * Request body for creating a new user
 *
 * @interface CreateUserRequest
 * @property {string} email - User's email address (required, must be valid email)
 * @property {string | {first: string, last: string}} name - User's name (string or structured object)
 * @property {string[]} [roles] - Optional array of role names to assign to user during creation
 *
 * @example
 * ```typescript
 * // Simple name format
 * const request: CreateUserRequest = {
 *   email: "alice@example.com",
 *   name: "Alice Smith",
 *   roles: ["customer", "moderator"]
 * };
 *
 * // Structured name format
 * const request: CreateUserRequest = {
 *   email: "alice@example.com",
 *   name: { first: "Alice", last: "Smith" },
 *   roles: ["admin"]
 * };
 * ```
 */
export interface CreateUserRequest {
  email: string;
  name: string | { first: string; last: string };
  roles?: string[]; // Array of role names to assign to user
}

/**
 * Response from user creation API
 *
 * @interface CreateUserResponse
 * @extends ApiResponse
 * @property {UserWithRoles} user - The created user object with role information
 * @property {string[]} [assignedRoles] - Roles successfully assigned in Keto
 * @property {string[]} [ketoWarnings] - Any warnings from role assignment process
 */
export interface CreateUserResponse extends ApiResponse {
  user: UserWithRoles;
  assignedRoles?: string[]; // Roles successfully assigned
  ketoWarnings?: string[]; // Any warnings from role assignment
}

export interface ListUsersResponse extends ApiResponse {
  users: UserWithRoles[];
  count: number;
}

export interface GetUserResponse extends ApiResponse {
  user: UserWithRoles;
}

/**
 * Request body for updating an existing user
 *
 * @interface UpdateUserRequest
 * @property {string} [email] - Updated email address (optional)
 * @property {string | {first: string, last: string}} [name] - Updated name (optional)
 * @property {string[]} [tenant_ids] - Array of tenant IDs user belongs to (optional)
 * @property {string[]} [roles] - Array of role names to assign (replaces all existing roles)
 *
 * @example
 * ```typescript
 * // Update only email
 * const request: UpdateUserRequest = {
 *   email: "newemail@example.com"
 * };
 *
 * // Update roles (replaces existing)
 * const request: UpdateUserRequest = {
 *   roles: ["admin", "moderator"] // Removes old roles, assigns these
 * };
 *
 * // Update tenant access
 * const request: UpdateUserRequest = {
 *   tenant_ids: ["tenant1", "tenant2"]
 * };
 * ```
 */
export interface UpdateUserRequest {
  email?: string;
  name?: string | { first: string; last: string };
  tenant_ids?: string[]; // Array of tenant IDs user belongs to
  roles?: string[]; // Array of role names to assign to user (replaces existing)
}

/**
 * Response from user update API
 *
 * @interface UpdateUserResponse
 * @extends ApiResponse
 * @property {UserWithRoles} user - The updated user object with role information
 * @property {object} [roleChanges] - Details about role changes made
 * @property {string[]} roleChanges.removed - Roles that were removed
 * @property {string[]} roleChanges.added - Roles that were added
 * @property {string[]} roleChanges.current - All current roles after update
 * @property {string[]} [ketoWarnings] - Any warnings from role management
 */
export interface UpdateUserResponse extends ApiResponse {
  user: UserWithRoles;
  roleChanges?: {
    removed: string[]; // Roles that were removed
    added: string[]; // Roles that were added
    current: string[]; // Current roles after update
  };
  ketoWarnings?: string[]; // Any warnings from role management
}

export interface DeleteUserResponse extends ApiResponse {
  user: User;
  cleanedUpRoles?: string[]; // Roles that were cleaned up from Keto
}

// User Role Management API
/**
 * Request body for assigning a single role to a user
 *
 * @interface UserRoleAssignmentRequest
 * @property {string} userEmail - User's email address
 * @property {string} roleName - Name of role to assign
 *
 * @example
 * ```typescript
 * const request: UserRoleAssignmentRequest = {
 *   userEmail: "alice@example.com",
 *   roleName: "admin"
 * };
 * ```
 */
export interface UserRoleAssignmentRequest {
  userEmail: string;
  roleName: string;
}

/**
 * Response from role assignment API
 *
 * @interface UserRoleAssignmentResponse
 * @extends ApiResponse
 * @property {string} userEmail - User's email address
 * @property {string} roleName - Role that was assigned
 * @property {string[]} userRoles - All current roles after assignment
 */
export interface UserRoleAssignmentResponse extends ApiResponse {
  userEmail: string;
  roleName: string;
  userRoles: string[]; // All current roles after assignment
}

/**
 * Request body for removing a single role from a user
 *
 * @interface UserRoleRemovalRequest
 * @property {string} userEmail - User's email address
 * @property {string} roleName - Name of role to remove
 *
 * @example
 * ```typescript
 * const request: UserRoleRemovalRequest = {
 *   userEmail: "alice@example.com",
 *   roleName: "moderator"
 * };
 * ```
 */
export interface UserRoleRemovalRequest {
  userEmail: string;
  roleName: string;
}

/**
 * Response from role removal API
 *
 * @interface UserRoleRemovalResponse
 * @extends ApiResponse
 * @property {string} userEmail - User's email address
 * @property {string} roleName - Role that was removed
 * @property {string[]} userRoles - All current roles after removal
 */
export interface UserRoleRemovalResponse extends ApiResponse {
  userEmail: string;
  roleName: string;
  userRoles: string[]; // All current roles after removal
}

/**
 * Response from get user roles API
 *
 * @interface GetUserRolesResponse
 * @extends ApiResponse
 * @property {string} userEmail - User's email address
 * @property {string[]} roles - All roles assigned to the user
 */
export interface GetUserRolesResponse extends ApiResponse {
  userEmail: string;
  roles: string[];
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
