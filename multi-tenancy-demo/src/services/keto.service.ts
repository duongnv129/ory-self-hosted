/**
 * Keto service for authorization and permission management
 *
 * This service provides methods to interact with Ory Keto's Read API
 * to fetch relation tuples and determine role permissions.
 */

import axios, { AxiosError } from 'axios';
import { Permission } from '../types/responses';

/**
 * Keto relation tuple structure
 * Represents a relationship in the Zanzibar-style permission model
 */
interface KetoRelationTuple {
  namespace: string;
  object: string;
  relation: string;
  subject_id?: string;
  subject_set?: {
    namespace: string;
    object: string;
    relation: string;
  };
}

/**
 * Response structure from Keto Read API
 */
interface KetoRelationTuplesResponse {
  relation_tuples: KetoRelationTuple[];
  next_page_token?: string;
}

/**
 * Keto service error class
 */
export class KetoError extends Error {
  constructor(
    message: string,
    public readonly details?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'KetoError';
  }
}

/**
 * Keto Read and Write API client service
 *
 * Provides methods to query and modify Ory Keto relation tuples and permissions.
 * Keto uses a Zanzibar-style permission model where relationships are
 * represented as tuples: (namespace, object, relation, subject).
 */
export class KetoService {
  private readonly readUrl: string;
  private readonly writeUrl: string;

  /**
   * Initialize Keto service with Read and Write API URLs
   * @param readUrl - Keto Read API base URL (defaults to http://keto:4466)
   * @param writeUrl - Keto Write API base URL (defaults to http://keto:4467)
   */
  constructor(readUrl?: string, writeUrl?: string) {
    this.readUrl = readUrl || process.env.KETO_READ_URL || 'http://keto:4466';
    this.writeUrl = writeUrl || process.env.KETO_WRITE_URL || 'http://keto:4467';
  }

  /**
   * Get all permissions for a specific role by querying Keto relation tuples
   * Enhanced for resource-scoped RBAC following Alice's hierarchy model
   *
   * This method queries Keto for all relation tuples where the subject is
   * the specified role. For resource-scoped RBAC, roles follow the format:
   * tenant#{resource_type}#{role_name} (e.g., "tenant:a#product:items#admin")
   *
   * @param namespace - The Keto namespace to query (e.g., "default")
   * @param roleName - The role name (can be simple "admin" or scoped "tenant:a#product:items#admin")
   * @param tenantId - Optional tenant ID for resource-scoped queries
   * @param resourceType - Optional resource type for resource-scoped queries
   * @returns Object containing permissions array and inherited roles array
   *
   * @example
   * // Simple RBAC
   * const result = await ketoService.getPermissionsForRole("default", "admin");
   *
   * // Resource-scoped RBAC (Alice's hierarchy)
   * const result = await ketoService.getPermissionsForRole(
   *   "default",
   *   "admin",
   *   "tenant-a",
   *   "product:items"
   * );
   */
  async getPermissionsForRole(
    namespace: string,
    roleName: string,
    tenantId?: string,
    resourceType?: string
  ): Promise<{ permissions: Permission[]; inheritedRoles: string[] }> {
    try {
      // Build role object based on scoping
      let roleObject: string;

      if (tenantId && resourceType) {
        // Resource-scoped RBAC: tenant#{resource_type}#{role_name}
        roleObject = `tenant:${tenantId}#${resourceType}#${roleName}`;
      } else if (roleName.includes('#')) {
        // Already scoped role name provided
        roleObject = roleName;
      } else {
        // Simple RBAC: role:admin
        roleObject = `role:${roleName}`;
      }

      // Query Keto for relation tuples where the subject is this role
      // Format: subject_set.object = roleObject AND subject_set.relation = "member"
      const response = await axios.get<KetoRelationTuplesResponse>(
        `${this.readUrl}/relation-tuples`,
        {
          params: {
            namespace,
            'subject_set.namespace': namespace,
            'subject_set.object': roleObject,
            'subject_set.relation': 'member',
          },
        }
      );

      // Separate role inheritance from resource permissions
      const inheritedRoles: string[] = [];
      const permissions: Permission[] = [];

      response.data.relation_tuples.forEach((tuple) => {
        if (tuple.object.startsWith('role:') || tuple.object.includes('#')) {
          // This is a role inheritance relationship
          // Extract role name from both simple and scoped formats
          let inheritedRole: string;
          if (tuple.object.includes('#')) {
            // Scoped role: tenant:a#product:items#admin -> admin
            const parts = tuple.object.split('#');
            inheritedRole = parts[parts.length - 1] || tuple.object;
          } else {
            // Simple role: role:admin -> admin
            inheritedRole = tuple.object.replace('role:', '');
          }
          inheritedRoles.push(inheritedRole);
        } else {
          // This is a resource permission
          // Handle both simple and scoped resource objects
          let resource: string;
          if (tuple.object.includes('#')) {
            // Scoped resource: tenant:a#product:items -> product
            const parts = tuple.object.split('#');
            resource = parts[1]?.replace(':items', '') || tuple.object;
          } else {
            // Simple resource: product:items -> product
            resource = tuple.object.replace(':items', '');
          }

          permissions.push({
            resource,
            action: tuple.relation,
          });
        }
      });

      return { permissions, inheritedRoles };
    } catch (error) {
      throw this.handleKetoError(error, 'Failed to fetch permissions from Keto');
    }
  }

  /**
   * Get only permissions for a role (backward compatibility helper)
   *
   * This is a convenience method that returns only the permissions array,
   * filtering out role inheritance. Useful when you only need permissions
   * and not the inheritance structure.
   *
   * @param namespace - The Keto namespace to query
   * @param roleName - The name of the role
   * @param tenantId - Optional tenant ID for resource-scoped queries
   * @param resourceType - Optional resource type for resource-scoped queries
   * @returns Array of permissions only
   */
  async getRolePermissions(
    namespace: string,
    roleName: string,
    tenantId?: string,
    resourceType?: string
  ): Promise<Permission[]> {
    const result = await this.getPermissionsForRole(namespace, roleName, tenantId, resourceType);
    return result.permissions;
  }

  /**
   * Get only inherited roles for a role
   *
   * This method returns only the roles that the specified role inherits from,
   * based on Keto relation tuples.
   *
   * @param namespace - The Keto namespace to query
   * @param roleName - The name of the role
   * @param tenantId - Optional tenant ID for resource-scoped queries
   * @param resourceType - Optional resource type for resource-scoped queries
   * @returns Array of inherited role names
   */
  async getRoleInheritance(
    namespace: string,
    roleName: string,
    tenantId?: string,
    resourceType?: string
  ): Promise<string[]> {
    const result = await this.getPermissionsForRole(namespace, roleName, tenantId, resourceType);
    return result.inheritedRoles;
  }

  /**
   * Check if a specific permission exists for a role
   *
   * @param namespace - The Keto namespace
   * @param roleName - The name of the role
   * @param resource - The resource object (e.g., "product:items")
   * @param action - The relation/action (e.g., "create", "view")
   * @returns True if the permission exists, false otherwise
   */
  async checkPermission(
    namespace: string,
    roleName: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const response = await axios.get(`${this.readUrl}/relation-tuples/check`, {
        params: {
          namespace,
          object: resource,
          relation: action,
          'subject_set.namespace': namespace,
          'subject_set.object': `role:${roleName}`,
          'subject_set.relation': 'member',
        },
      });

      return response.data.allowed === true;
    } catch (error) {
      // If Keto is unavailable, default to false for safety
      if (this.isConnectionError(error)) {
        return false;
      }
      throw this.handleKetoError(error, 'Failed to check permission');
    }
  }

  /**
   * Get all relation tuples in a namespace
   *
   * @param namespace - The Keto namespace
   * @returns Array of relation tuples
   */
  async listRelationTuples(namespace: string): Promise<KetoRelationTuple[]> {
    try {
      const response = await axios.get<KetoRelationTuplesResponse>(
        `${this.readUrl}/relation-tuples`,
        {
          params: { namespace },
        }
      );

      return response.data.relation_tuples || [];
    } catch (error) {
      throw this.handleKetoError(error, 'Failed to list relation tuples');
    }
  }

  /**
   * Create a relation tuple for role hierarchy (role inheritance)
   * Enhanced for resource-scoped RBAC following Alice's hierarchy model
   *
   * This establishes that a child role inherits permissions from a parent role
   * using subject sets. For example, "moderator inherits from customer" means
   * moderator members automatically have all customer permissions.
   *
   * For resource-scoped RBAC, inheritance is scoped to the same resource type:
   * tenant:a#product:items#moderator inherits from tenant:a#product:items#customer
   *
   * @param childRole - The role that inherits (e.g., "moderator")
   * @param parentRole - The role being inherited from (e.g., "customer")
   * @param namespace - The Keto namespace (defaults to "default")
   * @param tenantId - Optional tenant ID for resource-scoped inheritance
   * @param resourceType - Optional resource type for resource-scoped inheritance
   *
   * @example
   * // Simple RBAC: Moderator inherits Customer permissions
   * await ketoService.createRoleInheritance("moderator", "customer", "default");
   *
   * // Resource-scoped RBAC: Alice's hierarchy within product scope
   * await ketoService.createRoleInheritance(
   *   "moderator", "customer", "default", "tenant-a", "product:items"
   * );
   */
  async createRoleInheritance(
    childRole: string,
    parentRole: string,
    namespace: string = 'default',
    tenantId?: string,
    resource?: string
  ): Promise<void> {
    try {
      // Build role objects based on scoping
      let childRoleObject: string;
      let parentRoleObject: string;

      if (tenantId && resource) {
        // Resource-scoped RBAC: Append :items to resource when building tuple
        const resourceWithSuffix = resource.includes(':') ? resource : `${resource}:items`;
        childRoleObject = `tenant:${tenantId}#${resourceWithSuffix}#${childRole}`;
        parentRoleObject = `tenant:${tenantId}#${resourceWithSuffix}#${parentRole}`;

        console.log(`✅ Creating resource-scoped inheritance tuple:`, {
          child: childRoleObject,
          parent: parentRoleObject,
          namespace,
          tenantId,
          resource,
        });
      } else {
        // Simple RBAC
        childRoleObject = `role:${childRole}`;
        parentRoleObject = `role:${parentRole}`;

        console.log(`✅ Creating simple RBAC inheritance tuple:`, {
          child: childRoleObject,
          parent: parentRoleObject,
          namespace,
        });
      }

      await axios.put(`${this.writeUrl}/admin/relation-tuples`, {
        namespace,
        object: parentRoleObject,
        relation: 'member',
        subject_set: {
          namespace,
          object: childRoleObject,
          relation: 'member',
        },
      });
    } catch (error) {
      throw this.handleKetoError(
        error,
        `Failed to create role inheritance: ${childRole} -> ${parentRole}`
      );
    }
  }

  /**
   * Create a relation tuple for resource permission
   * Enhanced for resource-scoped RBAC following Alice's hierarchy model
   *
   * This grants a role permission to perform an action on a resource.
   * Uses subject sets so all role members automatically inherit the permission.
   *
   * For resource-scoped RBAC, both the resource object and role subject are scoped:
   * - Resource: tenant:a#product:items
   * - Role: tenant:a#product:items#admin
   *
   * @param resource - The resource object (e.g., "product:items", "category:items")
   * @param action - The action/relation (e.g., "view", "create", "update", "delete")
   * @param roleName - The role name (e.g., "admin", "moderator")
   * @param namespace - The Keto namespace (defaults to "default")
   * @param tenantId - Optional tenant ID for resource-scoped permissions
   * @param resourceType - Optional resource type for resource-scoped permissions
   *
   * @example
   * // Simple RBAC: Grant moderator role permission to create products
   * await ketoService.createResourcePermission("product:items", "create", "moderator");
   *
   * // Resource-scoped RBAC: Alice's admin role on products in tenant-a
   * await ketoService.createResourcePermission(
   *   "product:items", "create", "admin", "default", "tenant-a", "product:items"
   * );
   */
  async createResourcePermission(
    resource: string,
    action: string,
    roleName: string,
    namespace: string = 'default',
    tenantId?: string,
    resourceScope?: string
  ): Promise<void> {
    try {
      // Build resource object and role subject based on scoping
      let resourceObject: string;
      let roleObject: string;

      if (tenantId && resourceScope) {
        // Resource-scoped RBAC: Append :items to resourceScope when building tuple
        const resourceWithSuffix = resourceScope.includes(':') ? resourceScope : `${resourceScope}:items`;
        resourceObject = `tenant:${tenantId}#${resource}`;
        roleObject = `tenant:${tenantId}#${resourceWithSuffix}#${roleName}`;

        console.log(`✅ Creating resource-scoped permission tuple:`, {
          resource: resourceObject,
          role: roleObject,
          action,
          namespace,
          tenantId,
          resourceScope,
        });
      } else {
        // Simple RBAC
        resourceObject = resource;
        roleObject = `role:${roleName}`;

        console.log(`✅ Creating simple RBAC permission tuple:`, {
          resource: resourceObject,
          role: roleObject,
          action,
          namespace,
        });
      }

      await axios.put(`${this.writeUrl}/admin/relation-tuples`, {
        namespace,
        object: resourceObject,
        relation: action,
        subject_set: {
          namespace,
          object: roleObject,
          relation: 'member',
        },
      });
    } catch (error) {
      throw this.handleKetoError(
        error,
        `Failed to create resource permission: ${roleName} -> ${action} on ${resource}`
      );
    }
  }

  /**
   * Delete all relation tuples where a role is the object
   *
   * This removes:
   * 1. Resource permissions granted to this role (role as subject_set.object)
   * 2. Role inheritance where this role is the parent (role as object)
   *
   * Note: This does NOT remove:
   * - Role inheritance where this role is the child (role as subject_set.object)
   * - User assignments to this role (user:X -> role:Y member)
   *
   * @param roleName - The role name to delete relations for
   * @param namespace - The Keto namespace (defaults to "simple-rbac")
   */
  async deleteRoleRelations(
    roleName: string,
    namespace: string = 'simple-rbac'
  ): Promise<void> {
    try {
      // Delete all tuples where this role is the subject_set.object
      // This removes resource permissions granted to this role
      await axios.delete(`${this.writeUrl}/admin/relation-tuples`, {
        params: {
          namespace,
          'subject_set.namespace': namespace,
          'subject_set.object': `role:${roleName}`,
          'subject_set.relation': 'member',
        },
      });

      // Delete all tuples where this role is the object
      // This removes role inheritance where this role is the parent
      await axios.delete(`${this.writeUrl}/admin/relation-tuples`, {
        params: {
          namespace,
          object: `role:${roleName}`,
        },
      });
    } catch (error) {
      // Log warning but don't throw - allow deletion to continue even if Keto cleanup fails
      console.warn(
        `⚠️  Failed to delete Keto relations for role ${roleName}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.warn('   → Continuing with role deletion despite Keto cleanup failure');
    }
  }

  /**
   * Delete all resource permissions for a specific role
   *
   * This is useful when updating a role's permissions - delete old ones first,
   * then create new ones.
   *
   * IMPORTANT: This method only deletes resource permissions (like product:items, category:items)
   * and does NOT delete role inheritance relationships (role:xxx).
   *
   * @param roleName - The role name
   * @param namespace - The Keto namespace (defaults to "simple-rbac")
   */
  async deleteRolePermissions(
    roleName: string,
    namespace: string = 'simple-rbac'
  ): Promise<void> {
    try {
      // First, get all existing tuples for this role
      const response = await axios.get<KetoRelationTuplesResponse>(
        `${this.readUrl}/relation-tuples`,
        {
          params: {
            namespace,
            'subject_set.namespace': namespace,
            'subject_set.object': `role:${roleName}`,
            'subject_set.relation': 'member',
          },
        }
      );

      const tuplesToDelete = response.data.relation_tuples || [];

      // Filter to only delete resource permissions (not role inheritance)
      const resourcePermissionTuples = tuplesToDelete.filter(tuple =>
        !tuple.object.startsWith('role:') // Only delete non-role objects (resources)
      );

      // Delete each resource permission tuple individually
      for (const tuple of resourcePermissionTuples) {
        try {
          await axios.delete(`${this.writeUrl}/admin/relation-tuples`, {
            params: {
              namespace: tuple.namespace,
              object: tuple.object,
              relation: tuple.relation,
              'subject_set.namespace': namespace,
              'subject_set.object': `role:${roleName}`,
              'subject_set.relation': 'member',
            },
          });
        } catch (deleteError) {
          console.warn(`   ⚠️ Failed to delete tuple ${tuple.object} ${tuple.relation}:`,
            deleteError instanceof Error ? deleteError.message : 'Unknown error');
        }
      }
    } catch (error) {
      console.warn(
        `⚠️  Failed to delete Keto permissions for role ${roleName}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Delete ONLY the inheritance relationships where this role is a child
   *
   * This is a surgical deletion that preserves inheritance relationships
   * where other roles inherit FROM this role, but removes relationships
   * where this role inherits FROM other roles.
   *
   * Used during role updates to avoid breaking inheritance chains.
   *
   * @param roleName - The role name
   * @param parentRoles - Array of parent role names to remove inheritance from
   * @param namespace - The Keto namespace (defaults to "simple-rbac")
   */
  async deleteRoleChildInheritance(
    roleName: string,
    parentRoles: string[],
    namespace: string = 'simple-rbac'
  ): Promise<void> {
    try {
      // Delete specific tuples where this role inherits FROM specified parent roles
      // Format: role:parentRole member role:thisRole
      for (const parentRole of parentRoles) {
        const deleteParams = {
          namespace,
          object: `role:${parentRole}`,
          relation: 'member',
          'subject_set.namespace': namespace,
          'subject_set.object': `role:${roleName}`,
          'subject_set.relation': 'member',
        };
        await axios.delete(`${this.writeUrl}/admin/relation-tuples`, {
          params: deleteParams,
        });
      }
    } catch (error) {
      console.warn(
        `⚠️  Failed to delete Keto child inheritance for role ${roleName}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Assign a user to a role in Keto
   *
   * This creates a direct user-to-role membership following the simple-rbac pattern:
   * user:email → role:name member
   *
   * @param userEmail - The user's email address (e.g., "alice@example.com")
   * @param roleName - The role name (e.g., "admin", "moderator", "customer")
   * @param namespace - The Keto namespace (defaults to "simple-rbac")
   *
   * @example
   * // Assign Alice to admin role
   * await ketoService.assignUserToRole("alice@example.com", "admin", "simple-rbac");
   */
  async assignUserToRole(
    userEmail: string,
    roleName: string,
    namespace: string = 'simple-rbac'
  ): Promise<void> {
    try {
      await axios.put(`${this.writeUrl}/admin/relation-tuples`, {
        namespace,
        object: `role:${roleName}`,
        relation: 'member',
        subject_id: `user:${userEmail}`,
      });
    } catch (error) {
      throw this.handleKetoError(
        error,
        `Failed to assign user ${userEmail} to role ${roleName}`
      );
    }
  }

  /**
   * Remove a user from a role in Keto
   *
   * This removes the direct user-to-role membership.
   *
   * @param userEmail - The user's email address
   * @param roleName - The role name to remove from
   * @param namespace - The Keto namespace (defaults to "simple-rbac")
   */
  async removeUserFromRole(
    userEmail: string,
    roleName: string,
    namespace: string = 'simple-rbac'
  ): Promise<void> {
    try {
      await axios.delete(`${this.writeUrl}/admin/relation-tuples`, {
        params: {
          namespace,
          object: `role:${roleName}`,
          relation: 'member',
          subject_id: `user:${userEmail}`,
        },
      });
    } catch (error) {
      throw this.handleKetoError(
        error,
        `Failed to remove user ${userEmail} from role ${roleName}`
      );
    }
  }

  /**
   * Get all roles assigned to a user
   *
   * @param userEmail - The user's email address
   * @param namespace - The Keto namespace (defaults to "simple-rbac")
   * @returns Array of role names the user is assigned to
   */
  async getUserRoles(
    userEmail: string,
    namespace: string = 'simple-rbac'
  ): Promise<string[]> {
    try {
      const response = await axios.get<KetoRelationTuplesResponse>(
        `${this.readUrl}/relation-tuples`,
        {
          params: {
            namespace,
            relation: 'member',
            subject_id: `user:${userEmail}`,
          },
        }
      );

      return response.data.relation_tuples
        .filter((tuple) => tuple.object.startsWith('role:'))
        .map((tuple) => tuple.object.replace('role:', ''));
    } catch (error) {
      throw this.handleKetoError(error, `Failed to get roles for user ${userEmail}`);
    }
  }

  /**
   * Check if a user has a specific role
   *
   * @param userEmail - The user's email address
   * @param roleName - The role name to check
   * @param namespace - The Keto namespace (defaults to "simple-rbac")
   * @returns True if user has the role, false otherwise
   */
  async checkUserRole(
    userEmail: string,
    roleName: string,
    namespace: string = 'simple-rbac'
  ): Promise<boolean> {
    try {
      const response = await axios.get(`${this.readUrl}/relation-tuples/check`, {
        params: {
          namespace,
          object: `role:${roleName}`,
          relation: 'member',
          subject_id: `user:${userEmail}`,
        },
      });

      return response.data.allowed === true;
    } catch (error) {
      // If Keto is unavailable, default to false for safety
      if (this.isConnectionError(error)) {
        return false;
      }
      throw this.handleKetoError(error, `Failed to check role ${roleName} for user ${userEmail}`);
    }
  }

  /**
   * Remove all role assignments for a user
   *
   * This is useful when deleting a user or resetting their permissions.
   *
   * @param userEmail - The user's email address
   * @param namespace - The Keto namespace (defaults to "simple-rbac")
   */
  async removeAllUserRoles(
    userEmail: string,
    namespace: string = 'simple-rbac'
  ): Promise<void> {
    try {
      await axios.delete(`${this.writeUrl}/admin/relation-tuples`, {
        params: {
          namespace,
          relation: 'member',
          subject_id: `user:${userEmail}`,
        },
      });
    } catch (error) {
      console.warn(
        `⚠️  Failed to remove all roles for user ${userEmail}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.warn('   → Continuing despite Keto cleanup failure');
    }
  }

  /**
   * Check if error is a network/connection error
   */
  private isConnectionError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      return (
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        !error.response
      );
    }
    return false;
  }

  /**
   * Handle Keto API errors with proper error transformation
   */
  private handleKetoError(error: unknown, defaultMessage: string): KetoError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: { message?: string } }>;

      // Connection errors
      if (this.isConnectionError(error)) {
        return new KetoError(
          'Keto service unavailable',
          'Unable to connect to Keto Read API. Please ensure Keto is running.',
          503
        );
      }

      // API errors with response
      const statusCode = axiosError.response?.status;
      const errorMessage =
        axiosError.response?.data?.error?.message || axiosError.message || defaultMessage;

      return new KetoError(defaultMessage, errorMessage, statusCode);
    }

    if (error instanceof Error) {
      return new KetoError(defaultMessage, error.message);
    }

    return new KetoError(defaultMessage);
  }
}
