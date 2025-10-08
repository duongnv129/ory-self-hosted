/**
 * Role routes - In-memory role management with Keto permissions
 */

import { Router, Request, Response, NextFunction } from 'express';
import { storageService } from '../app';
import { KetoService } from '../services/keto.service';
import { CreateRoleRequest, UpdateRoleRequest } from '../types/models';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../types/errors';
import { Permission } from '../types/responses';

const router: Router = Router();
const ketoService = new KetoService();

/**
 * Helper function to check tenant access for role
 */
function checkRoleTenantAccess(roleTenantId: string | undefined, requestTenantId?: string): void {
  if (requestTenantId && roleTenantId && roleTenantId !== requestTenantId) {
    throw new ForbiddenError('Role does not belong to this tenant');
  }
}

/**
 * List all roles from memory filtered by namespace
 */
router.get('/list', (req: Request, res: Response, next: NextFunction) => {
  try {
    const namespace = req.ketoNamespace;
    const roles = storageService.getRolesByNamespace(namespace, req.tenantId);

    res.json({
      message: 'Roles retrieved successfully (mock)',
      roles,
      count: roles.length,
      namespace,
      tenant_id: req.tenantId,
      context: {
        userId: req.userId,
        tenantId: req.tenantId,
        ketoNamespace: namespace,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get specific role by name from memory with permissions from Keto
 */
router.get('/get/:roleName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleName = req.params.roleName!;
    const namespace = req.ketoNamespace!;

    const role = storageService.getRoleByName(namespace, roleName);

    if (!role) {
      throw new NotFoundError('Role', roleName);
    }

    checkRoleTenantAccess(role.tenantId, req.tenantId);

    // Fetch permissions and inherited roles from Keto
    let permissions: Permission[] = [];
    let inheritedRoles: string[] = [];
    try {
      const ketoResult = await ketoService.getPermissionsForRole(namespace, roleName);
      permissions = ketoResult.permissions;
      inheritedRoles = ketoResult.inheritedRoles;
    } catch (error) {
      // Log warning but don't fail the request if Keto is unavailable
      console.warn(
        `⚠️  Failed to fetch permissions from Keto for role ${roleName}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.warn('   → Returning role without permissions');
    }

    // Update role's inherited roles with live data from Keto
    const updatedRole = {
      ...role,
      inheritsFrom: inheritedRoles.length > 0 ? inheritedRoles : role.inheritsFrom,
    };

    res.json({
      message: `Role ${roleName} retrieved successfully (mock)`,
      role: updatedRole,
      permissions,
      namespace,
      context: {
        userId: req.userId,
        tenantId: req.tenantId,
        ketoNamespace: namespace,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create new role in memory and sync to Keto
 */
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, inheritsFrom, permissions } = req.body as CreateRoleRequest;

    if (!name) {
      throw new ValidationError('Role name is required');
    }

    const namespace = req.ketoNamespace;

    // Check if role already exists
    const existingRole = storageService.getRoleByName(namespace, name);
    if (existingRole) {
      throw new ConflictError('Role already exists', `Role ${name} in namespace ${namespace}`);
    }

    // Create role in memory
    const role = await storageService.createRole(namespace, name, description || '', req.tenantId, inheritsFrom);

    // Sync to Keto - create relation tuples
    const ketoWarnings: string[] = [];

    try {
      // 1. Create role hierarchy (inheritance) tuples
      if (inheritsFrom && inheritsFrom.length > 0) {
        for (const parentRole of inheritsFrom) {
          try {
            await ketoService.createRoleInheritance(name, parentRole, namespace);
          } catch (error) {
            const errorMsg = `Failed to create inheritance ${name} -> ${parentRole}`;
            console.warn(`⚠️  ${errorMsg}:`, error instanceof Error ? error.message : 'Unknown error');
            ketoWarnings.push(errorMsg);
          }
        }
      }

      // 2. Create resource permission tuples
      if (permissions && permissions.length > 0) {
        for (const permission of permissions) {
          try {
            // Normalize resource format: "product" -> "product:items"
            const resource = permission.resource.includes(':')
              ? permission.resource
              : `${permission.resource}:items`;

            await ketoService.createResourcePermission(resource, permission.action, name, namespace);
          } catch (error) {
            const errorMsg = `Failed to create permission ${name} -> ${permission.action} on ${permission.resource}`;
            console.warn(`⚠️  ${errorMsg}:`, error instanceof Error ? error.message : 'Unknown error');
            ketoWarnings.push(errorMsg);
          }
        }
      }

      console.log(`✅ Role ${name} created in namespace ${namespace} with Keto sync`);
      if (ketoWarnings.length > 0) {
        console.warn(`   → ${ketoWarnings.length} warning(s) during Keto sync`);
      }
    } catch (error) {
      // Log Keto errors but don't fail the request
      console.error('❌ Unexpected error during Keto sync:', error);
      ketoWarnings.push('Unexpected error during Keto sync');
    }

    res.status(201).json({
      message: 'Role created successfully (mock)',
      role,
      namespace,
      ketoSync: ketoWarnings.length === 0 ? 'success' : 'partial',
      ketoWarnings: ketoWarnings.length > 0 ? ketoWarnings : undefined,
      context: {
        userId: req.userId,
        tenantId: req.tenantId,
        ketoNamespace: namespace,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update existing role in memory and sync to Keto
 */
router.put('/update/:roleName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = req.params.roleName!;
    const {  description, inheritsFrom, permissions } = req.body as UpdateRoleRequest;
    const namespace = req.ketoNamespace!;

    const existingRole = storageService.getRoleByName(namespace, name);

    if (!existingRole) {
      throw new NotFoundError('Role', name);
    }

    checkRoleTenantAccess(existingRole.tenantId, req.tenantId);

    // Update role in memory
    const role = await storageService.updateRole(namespace!, name!, { name, description, inheritsFrom });

    if (!role) {
      throw new NotFoundError('Role', name);
    }

    // Sync to Keto - update relation tuples
    const ketoWarnings: string[] = [];

    try {
      // 1. Handle role inheritance updates ONLY if inheritsFrom is explicitly provided
      if (inheritsFrom !== undefined) {
        // Get current inheritance relationships from storage
        const currentInheritance = existingRole.inheritsFrom || [];

        // Delete only the current role's inheritance relationships (where this role is the child)
        // This preserves cases where other roles inherit FROM this role
        if (currentInheritance.length > 0) {
          try {
            // Use surgical deletion to only remove child inheritance relationships
            await ketoService.deleteRoleChildInheritance(name, currentInheritance, namespace);
          } catch (error) {
            const errorMsg = 'Failed to delete old role inheritance (child relationships only)';
            console.warn(`⚠️  ${errorMsg}:`, error instanceof Error ? error.message : 'Unknown error');
            ketoWarnings.push(errorMsg);
          }
        }

        // 2. Create new role inheritance tuples
        if (inheritsFrom && inheritsFrom.length > 0) {
          for (const parentRole of inheritsFrom) {
            try {
              await ketoService.createRoleInheritance(name, parentRole, namespace);
            } catch (error) {
              const errorMsg = `Failed to create inheritance ${name} -> ${parentRole}`;
              console.warn(`⚠️  ${errorMsg}:`, error instanceof Error ? error.message : 'Unknown error');
              ketoWarnings.push(errorMsg);
            }
          }
        }
      }

      // 3. Update resource permissions if provided
      if (permissions !== undefined) {
        // Delete old permissions
        try {
          await ketoService.deleteRolePermissions(name, namespace);
        } catch (error) {
          const errorMsg = 'Failed to delete old role permissions';
          console.warn(`⚠️  ${errorMsg}:`, error instanceof Error ? error.message : 'Unknown error');
          ketoWarnings.push(errorMsg);
        }

        // Create new permissions
        if (permissions && permissions.length > 0) {
          for (const permission of permissions) {
            try {
              const resource = permission.resource.includes(':')
                ? permission.resource
                : `${permission.resource}:items`;

              await ketoService.createResourcePermission(resource, permission.action, name, namespace);
            } catch (error) {
              const errorMsg = `Failed to create permission ${name} -> ${permission.action} on ${permission.resource}`;
              console.warn(`⚠️  ${errorMsg}:`, error instanceof Error ? error.message : 'Unknown error');
              ketoWarnings.push(errorMsg);
            }
          }
        }
      }

      console.log(`✅ Role ${name} updated in namespace ${namespace} with Keto sync`);
      if (ketoWarnings.length > 0) {
        console.warn(`   → ${ketoWarnings.length} warning(s) during Keto sync`);
      }
    } catch (error) {
      console.error('❌ Unexpected error during Keto sync:', error);
      ketoWarnings.push('Unexpected error during Keto sync');
    }

    res.json({
      message: `Role ${name} updated successfully (mock)`,
      role,
      namespace,
      ketoSync: ketoWarnings.length === 0 ? 'success' : 'partial',
      ketoWarnings: ketoWarnings.length > 0 ? ketoWarnings : undefined,
      context: {
        userId: req.userId,
        tenantId: req.tenantId,
        ketoNamespace: namespace,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete role from memory and cleanup Keto relation-tuples
 */
router.delete('/delete/:roleName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleName = req.params.roleName!;
    const namespace = req.ketoNamespace!;

    const existingRole = storageService.getRoleByName(namespace, roleName);

    if (!existingRole) {
      throw new NotFoundError('Role', roleName);
    }

    checkRoleTenantAccess(existingRole.tenantId, req.tenantId);

    // Delete from Keto first (this method logs warnings but doesn't throw)
    await ketoService.deleteRoleRelations(roleName, namespace);

    // Delete from memory
    const role = await storageService.deleteRole(namespace!, roleName!);

    if (!role) {
      throw new NotFoundError('Role', roleName);
    }

    console.log(`✅ Role ${roleName} deleted from namespace ${namespace} with Keto cleanup`);

    res.json({
      message: `Role ${roleName} deleted successfully (mock)`,
      role,
      namespace,
      context: {
        userId: req.userId,
        tenantId: req.tenantId,
        ketoNamespace: namespace,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
