/**
 * Role routes - In-memory role management with Keto permissions
 */

import { Router, Request, Response, NextFunction } from 'express';
import { StorageService } from '../services/storage.service';
import { KetoService } from '../services/keto.service';
import { CreateRoleRequest, UpdateRoleRequest } from '../types/models';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../types/errors';
import { Permission } from '../types/responses';

const router: Router = Router();
const storage = new StorageService();
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
    const roles = storage.getRolesByNamespace(namespace, req.tenantId);

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

    const role = storage.getRoleByName(namespace, roleName);

    if (!role) {
      throw new NotFoundError('Role', roleName);
    }

    checkRoleTenantAccess(role.tenantId, req.tenantId);

    // Fetch permissions from Keto
    let permissions: Permission[] = [];
    try {
      permissions = await ketoService.getPermissionsForRole(namespace, roleName);
    } catch (error) {
      // Log warning but don't fail the request if Keto is unavailable
      console.warn(
        `⚠️  Failed to fetch permissions from Keto for role ${roleName}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.warn('   → Returning role without permissions');
    }

    res.json({
      message: `Role ${roleName} retrieved successfully (mock)`,
      role,
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
 * Create new role in memory
 */
router.post('/create', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, inheritsFrom } = req.body as CreateRoleRequest;

    if (!name) {
      throw new ValidationError('Role name is required');
    }

    const namespace = req.ketoNamespace;

    // Check if role already exists
    const existingRole = storage.getRoleByName(namespace, name);
    if (existingRole) {
      throw new ConflictError('Role already exists', `Role ${name} in namespace ${namespace}`);
    }

    const role = storage.createRole(namespace, name, description || '', req.tenantId, inheritsFrom);

    res.status(201).json({
      message: 'Role created successfully (mock)',
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

/**
 * Update existing role in memory
 */
router.put('/update/:roleName', (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleName = req.params.roleName!;
    const { name, description, inheritsFrom } = req.body as UpdateRoleRequest;
    const namespace = req.ketoNamespace!;

    const existingRole = storage.getRoleByName(namespace, roleName);

    if (!existingRole) {
      throw new NotFoundError('Role', roleName);
    }

    checkRoleTenantAccess(existingRole.tenantId, req.tenantId);

    const role = storage.updateRole(namespace!, roleName!, { name, description, inheritsFrom });

    if (!role) {
      throw new NotFoundError('Role', roleName);
    }

    res.json({
      message: `Role ${roleName} updated successfully (mock)`,
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

/**
 * Delete role from memory
 */
router.delete('/delete/:roleName', (req: Request, res: Response, next: NextFunction) => {
  try {
    const roleName = req.params.roleName!;
    const namespace = req.ketoNamespace!;

    const existingRole = storage.getRoleByName(namespace, roleName);

    if (!existingRole) {
      throw new NotFoundError('Role', roleName);
    }

    checkRoleTenantAccess(existingRole.tenantId, req.tenantId);

    const role = storage.deleteRole(namespace!, roleName!);

    if (!role) {
      throw new NotFoundError('Role', roleName);
    }

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
