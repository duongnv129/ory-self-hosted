/**
 * Core Data Models
 * TypeScript types for all application entities
 *
 * Following Next.js Pro and TypeScript Pro practices:
 * - Prefer interfaces for object shapes, types for unions
 * - Eliminate duplication through proper type hierarchy
 * - Use discriminated unions for state machines
 */

/**
 * Resource identifier types
 * Centralized definition to eliminate duplication between resourceType and resource
 */
export type ResourceId =
  | 'product:items'
  | 'category:items'
  | 'user:items';

/**
 * Base resource names (without :items suffix)
 * Used for simplified resource references
 */
export type BaseResource = 'product' | 'category' | 'user';

/**
 * Role-related resource objects
 * For inheritance and role management
 */
export type RoleResource = `role:${string}`;

/**
 * All possible resource types in the system
 * Discriminated union for better type safety
 */
export type Resource = ResourceId | RoleResource;

export interface User {
  id: string;
  email: string;
  name: {
    first: string;
    last: string;
  };
  tenant_ids: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Enhanced user model with role information from Keto
 * Used in API responses to provide complete user data including role assignments
 */
export interface UserWithRoles extends User {
  roles: string[]; // Array of role names assigned to the user from Keto
  ketoNamespace?: string; // The Keto namespace where roles were fetched from
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

/**
 * Permission interface with improved type safety and backward compatibility
 * Handles both new ResourceId format and legacy base resource format
 */
export interface Permission {
  resource: Resource | BaseResource; // Supports both "category:items" and "category" formats
  action: string; // e.g., "view", "create", "update", "delete", "member"
}

/**
 * Resource-Scoped Role Model
 * Follows Alice's hierarchy pattern: tenant#{resource_type}#{role_name}
 *
 * Examples:
 * - tenant:a#product:items#admin (Alice is admin on products in tenant A)
 * - tenant:a#category:items#moderator (Alice is moderator on categories in tenant A)
 * - tenant:b#product:items#customer (Alice is customer on products in tenant B)
 */
export interface Role {
  id: number;
  name: string; // e.g., "admin", "moderator", "customer"
  description: string;
  namespace: string; // e.g., "resource-rbac"
  tenantId?: string; // e.g., "tenant-a", "tenant-b"
  resource?: ResourceId; // Optional for backward compatibility with API responses
  inheritsFrom?: string[]; // Array of parent role names that this role inherits from (per resource)
  permissions?: Permission[]; // Permissions fetched from Keto for this specific resource type
  createdAt: string;
  updatedAt?: string;

  // Computed properties for display (readonly for immutability)
  readonly scopedName?: string; // e.g., "tenant:a#product:items#admin"
  readonly displayName?: string; // e.g., "Admin (Products)"
  readonly scope?: string; // e.g., "tenant:a#product:items"
}

/**
 * Resource Type Definition
 * Enhanced with proper typing using centralized ResourceId
 */
export interface ResourceType {
  key: ResourceId; // Strongly typed resource identifier
  label: string; // e.g., "Products", "Categories"
  description?: string;
  defaultRoles?: string[]; // Default role hierarchy for this resource type
}

/**
 * Resource-Scoped Role Assignment
 * Represents a user's role assignment to a specific resource type in a tenant
 */
export interface ResourceRoleAssignment {
  userId: string;
  tenantId: string;
  resource: ResourceId; // Unified resource field (was resourceType)
  roleName: string; // e.g., "admin", "moderator"
  assignedAt: string;
  assignedBy?: string;
}

/**
 * Enhanced User Model with Resource-Scoped Roles
 */
export interface UserWithResourceRoles extends User {
  roleAssignments: ResourceRoleAssignment[]; // Resource-scoped role assignments
  ketoNamespace?: string; // The Keto namespace (e.g., "resource-rbac")

  // Helper method to get roles for a specific resource type
  getRolesForResource?(tenantId: string, resource: ResourceId): string[];
}

/**
 * Type guard functions for runtime type checking
 * Following TypeScript Pro practices for defensive programming
 */
export function isResourceId(value: string): value is ResourceId {
  return ['product:items', 'category:items', 'user:items'].includes(value);
}

export function isRoleResource(value: string): value is RoleResource {
  return value.startsWith('role:');
}

export function isResource(value: string): value is Resource {
  return isResourceId(value) || isRoleResource(value);
}

/**
 * Utility functions for resource manipulation
 * Centralized logic to prevent duplication across components
 * Enhanced with backward compatibility for API responses
 */
export const ResourceUtils = {
  /**
   * Extract base resource name from ResourceId
   * @example getBaseResource('product:items') => 'product'
   */
  getBaseResource(resourceId: ResourceId): BaseResource {
    return resourceId.split(':')[0] as BaseResource;
  },

  /**
   * Convert base resource to ResourceId
   * @example toResourceId('product') => 'product:items'
   */
  toResourceId(base: BaseResource): ResourceId {
    return `${base}:items`;
  },

  /**
   * Normalize resource from API response to ResourceId format
   * Handles both "category" and "category:items" formats
   * @example normalizeResource('category') => 'category:items'
   * @example normalizeResource('category:items') => 'category:items'
   */
  normalizeResource(resource: string): ResourceId {
    if (resource.includes(':')) {
      return resource as ResourceId;
    }
    return this.toResourceId(resource as BaseResource);
  },

  /**
   * Detect resource type from role name when resource field is missing
   * Uses naming convention: "category-admin" => "category:items"
   * @example inferResourceFromRoleName('category-admin') => 'category:items'
   * @example inferResourceFromRoleName('product-moderator') => 'product:items'
   */
  inferResourceFromRoleName(roleName: string): ResourceId | undefined {
    const parts = roleName.split('-');
    if (parts.length >= 2) {
      const resourceBase = parts[0];
      if (['product', 'category', 'user'].includes(resourceBase)) {
        return this.toResourceId(resourceBase as BaseResource);
      }
    }
    return undefined;
  },

  /**
   * Format resource for display
   * @example formatResourceLabel('product:items') => 'Products'
   * @example formatResourceLabel('category') => 'Categories'
   */
  formatResourceLabel(resource: string): string {
    const base = resource.includes(':')
      ? this.getBaseResource(resource as ResourceId)
      : resource as BaseResource;
    return base.charAt(0).toUpperCase() + base.slice(1) + 's';
  },

  /**
   * Generate scoped role name following Alice's hierarchy
   * @example generateScopedName('tenant-a', 'product:items', 'admin') => 'tenant:a#product:items#admin'
   */
  generateScopedName(tenantId: string, resource: ResourceId, roleName: string): string {
    return `tenant:${tenantId}#${resource}#${roleName}`;
  },

  /**
   * Create a properly typed Permission object
   * Helper function to ensure type safety across components
   * @example createPermission('product', 'view') => { resource: 'product', action: 'view' }
   */
  createPermission(resource: string, action: string): Permission {
    return {
      resource: resource as Resource | BaseResource,
      action,
    };
  },

  /**
   * Create multiple permissions with proper typing
   * @example createPermissions([{resource: 'product', action: 'view'}])
   */
  createPermissions(items: Array<{ resource: string; action: string }>): Permission[] {
    return items.map(item => this.createPermission(item.resource, item.action));
  },

  /**
   * Enhance Role object with computed properties from API response
   * Handles missing resource field by inferring from role name
   */
  enhanceRoleFromApiResponse(apiRole: Partial<Role> & { permissions?: unknown[] }): Role {
    let resource: ResourceId | undefined = apiRole.resource;

    // If resource is missing, try to infer from role name
    if (!resource && apiRole.name) {
      resource = this.inferResourceFromRoleName(apiRole.name);
    }

    // If resource is in base format, normalize it
    if (resource && !resource.includes(':')) {
      resource = this.normalizeResource(resource);
    }

    // Normalize permissions to use ResourceId format
    const normalizedPermissions = apiRole.permissions?.map((perm: unknown) => {
      const permission = perm as { resource: string; action: string };
      return {
        ...permission,
        resource: this.normalizeResource(permission.resource),
      };
    });

    // Create base role object
    const baseRole: Role = {
      id: apiRole.id || 0,
      name: apiRole.name || '',
      description: apiRole.description || '',
      namespace: apiRole.namespace || 'resource-rbac',
      tenantId: apiRole.tenantId,
      resource,
      inheritsFrom: apiRole.inheritsFrom,
      permissions: normalizedPermissions,
      createdAt: apiRole.createdAt || new Date().toISOString(),
      updatedAt: apiRole.updatedAt,
    };

    // Add computed properties using Object.defineProperty to handle readonly
    if (baseRole.tenantId && resource && baseRole.name) {
      const scopedName = this.generateScopedName(baseRole.tenantId, resource, baseRole.name);
      const displayName = `${baseRole.name.charAt(0).toUpperCase() + baseRole.name.slice(1)} (${this.formatResourceLabel(resource)})`;
      const scope = `tenant:${baseRole.tenantId}#${resource}`;

      Object.defineProperty(baseRole, 'scopedName', {
        value: scopedName,
        writable: false,
        enumerable: true,
        configurable: false,
      });

      Object.defineProperty(baseRole, 'displayName', {
        value: displayName,
        writable: false,
        enumerable: true,
        configurable: false,
      });

      Object.defineProperty(baseRole, 'scope', {
        value: scope,
        writable: false,
        enumerable: true,
        configurable: false,
      });
    }

    return baseRole;
  },
} as const;
