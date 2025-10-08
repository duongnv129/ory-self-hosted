/**
 * User routes - Kratos identity management with Keto role integration
 */

import { Router, Request, Response, NextFunction } from 'express';
import { KratosService } from '../services/kratos.service';
import { KetoService } from '../services/keto.service';
import {
  CreateUserRequest,
  UpdateUserRequest,
  UserName,
  UserRoleAssignmentRequest,
  UserRoleRemovalRequest
} from '../types/models';
import { ValidationError, ForbiddenError } from '../types/errors';

const router: Router = Router();
const kratosService = new KratosService();
const ketoService = new KetoService();

/**
 * Helper function to parse name from request body
 */
function parseName(name: UserName | string, existingName?: UserName): UserName {
  if (typeof name === 'object') {
    return {
      first: name.first || '',
      last: name.last || '',
    };
  }

  if (typeof name === 'string') {
    const parts = name.split(' ');
    return {
      first: parts[0] || '',
      last: parts.slice(1).join(' ') || '',
    };
  }

  return existingName || { first: '', last: '' };
}

/**
 * Helper function to filter users by tenant
 */
function filterUsersByTenant<T extends { tenant_ids: string[] }>(
  users: T[],
  tenantId?: string
): T[] {
  if (!tenantId) {
    return users;
  }
  return users.filter((user) => user.tenant_ids.includes(tenantId));
}

/**
 * Helper function to check tenant access
 */
function checkTenantAccess(userTenantIds: string[], requiredTenantId?: string): void {
  if (requiredTenantId && !userTenantIds.includes(requiredTenantId)) {
    throw new ForbiddenError('User does not belong to this tenant');
  }
}

/**
 * Create a tenant user with optional role assignments
 */
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name, roles } = req.body as CreateUserRequest;

    if (!email || !name) {
      throw new ValidationError('email and name are required');
    }

    const parsedName = parseName(name);
    const tenantIds = req.tenantId ? [req.tenantId] : [];
    const namespace = req.ketoNamespace || 'simple-rbac';

    // Create user in Kratos
    const user = await kratosService.createIdentity(email, parsedName, tenantIds);

    // Assign roles in Keto if provided
    const ketoWarnings: string[] = [];
    const assignedRoles: string[] = [];

    if (roles && roles.length > 0) {
      for (const roleName of roles) {
        try {
          await ketoService.assignUserToRole(email, roleName, namespace);
          assignedRoles.push(roleName);
          console.log(`✅ Assigned user ${email} to role ${roleName}`);
        } catch (error) {
          const errorMsg = `Failed to assign role ${roleName} to user ${email}`;
          console.warn(`⚠️  ${errorMsg}:`, error instanceof Error ? error.message : 'Unknown error');
          ketoWarnings.push(errorMsg);
        }
      }
    }

    res.status(201).json({
      message: 'User created successfully',
      tenant_id: req.tenantId,
      user,
      assignedRoles,
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
 * Get all users (globally or for a specific tenant)
 */
router.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allUsers = await kratosService.listIdentities();
    const users = filterUsersByTenant(allUsers, req.tenantId);

    res.json({
      message: 'Users retrieved successfully',
      tenant_id: req.tenantId,
      users,
      count: users.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a specific user if they belong to the tenant
 */
router.get('/get/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId!;
    const user = await kratosService.getIdentity(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    checkTenantAccess(user.tenant_ids, req.tenantId);

    res.json({
      message: 'User retrieved successfully',
      tenant_id: req.tenantId,
      user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update existing user with optional role management
 */
router.put('/update/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId!;
    const { email, name, tenant_ids, roles } = req.body as UpdateUserRequest;
    const namespace = req.ketoNamespace || 'simple-rbac';

    const existingUser = await kratosService.getIdentity(userId);
    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    checkTenantAccess(existingUser.tenant_ids, req.tenantId);

    const parsedName = name ? parseName(name, existingUser.name) : existingUser.name;
    const updatedEmail = email || existingUser.email;
    const updatedTenantIds = tenant_ids !== undefined ? tenant_ids : existingUser.tenant_ids;

    // Update user in Kratos
    const user = await kratosService.updateIdentity(
      userId,
      updatedEmail,
      parsedName,
      updatedTenantIds
    );

    // Handle role updates in Keto if provided
    const ketoWarnings: string[] = [];
    let currentRoles: string[] = [];
    let updatedRoles: string[] = [];

    if (roles !== undefined) {
      try {
        // Get current roles
        currentRoles = await ketoService.getUserRoles(updatedEmail, namespace);

        // Remove all existing roles first
        if (currentRoles.length > 0) {
          try {
            await ketoService.removeAllUserRoles(updatedEmail, namespace);
            console.log(`✅ Removed existing roles for user ${updatedEmail}: ${currentRoles.join(', ')}`);
          } catch (error) {
            const errorMsg = `Failed to remove existing roles for user ${updatedEmail}`;
            console.warn(`⚠️  ${errorMsg}:`, error instanceof Error ? error.message : 'Unknown error');
            ketoWarnings.push(errorMsg);
          }
        }

        // Assign new roles
        if (roles.length > 0) {
          for (const roleName of roles) {
            try {
              await ketoService.assignUserToRole(updatedEmail, roleName, namespace);
              updatedRoles.push(roleName);
              console.log(`✅ Assigned user ${updatedEmail} to role ${roleName}`);
            } catch (error) {
              const errorMsg = `Failed to assign role ${roleName} to user ${updatedEmail}`;
              console.warn(`⚠️  ${errorMsg}:`, error instanceof Error ? error.message : 'Unknown error');
              ketoWarnings.push(errorMsg);
            }
          }
        }
      } catch (error) {
        const errorMsg = `Failed to get current roles for user ${updatedEmail}`;
        console.warn(`⚠️  ${errorMsg}:`, error instanceof Error ? error.message : 'Unknown error');
        ketoWarnings.push(errorMsg);
      }
    }

    res.json({
      message: 'User updated successfully',
      tenant_id: req.tenantId,
      user,
      roleChanges: roles !== undefined ? {
        previousRoles: currentRoles,
        newRoles: updatedRoles,
        removed: currentRoles.filter(role => !updatedRoles.includes(role)),
        added: updatedRoles.filter(role => !currentRoles.includes(role)),
      } : undefined,
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
 * Delete user and clean up Keto role assignments
 */
router.delete('/delete/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId!;
    const namespace = req.ketoNamespace || 'simple-rbac';

    const user = await kratosService.getIdentity(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    checkTenantAccess(user.tenant_ids, req.tenantId);

    // Get current roles before deletion for logging
    let currentRoles: string[] = [];
    try {
      currentRoles = await ketoService.getUserRoles(user.email, namespace);
    } catch (error) {
      console.warn(`⚠️  Failed to get roles for user ${user.email} before deletion:`,
        error instanceof Error ? error.message : 'Unknown error');
    }

    // Clean up Keto role assignments
    if (currentRoles.length > 0) {
      try {
        await ketoService.removeAllUserRoles(user.email, namespace);
        console.log(`✅ Cleaned up Keto roles for user ${user.email}: ${currentRoles.join(', ')}`);
      } catch (error) {
        console.warn(`⚠️  Failed to clean up Keto roles for user ${user.email}:`,
          error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Delete user from Kratos
    const deleted = await kratosService.deleteIdentity(userId);
    if (!deleted) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      message: 'User deleted successfully',
      tenant_id: req.tenantId,
      user,
      cleanedUpRoles: currentRoles,
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
 * Assign role to user
 */
router.post('/assign-role', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userEmail, roleName }: UserRoleAssignmentRequest = req.body;
    const namespace = req.ketoNamespace || 'simple-rbac';

    if (!userEmail || !roleName) {
      res.status(400).json({ error: 'User email and role name are required' });
      return;
    }

    // Verify user exists
    const user = await kratosService.getIdentityByEmail(userEmail);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    checkTenantAccess(user.tenant_ids, req.tenantId);

    // Check if role already assigned
    const hasRole = await ketoService.checkUserRole(userEmail, roleName, namespace);
    if (hasRole) {
      res.status(409).json({
        error: 'User already has this role',
        userEmail,
        roleName
      });
      return;
    }

    // Assign role
    await ketoService.assignUserToRole(userEmail, roleName, namespace);

    // Get updated roles
    const userRoles = await ketoService.getUserRoles(userEmail, namespace);

    console.log(`✅ Assigned role ${roleName} to user ${userEmail}`);

    res.json({
      message: 'Role assigned successfully',
      userEmail,
      roleName,
      userRoles,
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
 * Remove role from user
 */
router.post('/remove-role', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userEmail, roleName }: UserRoleRemovalRequest = req.body;
    const namespace = req.ketoNamespace || 'simple-rbac';

    if (!userEmail || !roleName) {
      res.status(400).json({ error: 'User email and role name are required' });
      return;
    }

    // Verify user exists
    const user = await kratosService.getIdentityByEmail(userEmail);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    checkTenantAccess(user.tenant_ids, req.tenantId);

    // Check if user has the role
    const hasRole = await ketoService.checkUserRole(userEmail, roleName, namespace);
    if (!hasRole) {
      res.status(404).json({
        error: 'User does not have this role',
        userEmail,
        roleName
      });
      return;
    }

    // Remove role
    await ketoService.removeUserFromRole(userEmail, roleName, namespace);

    // Get updated roles
    const userRoles = await ketoService.getUserRoles(userEmail, namespace);

    console.log(`✅ Removed role ${roleName} from user ${userEmail}`);

    res.json({
      message: 'Role removed successfully',
      userEmail,
      roleName,
      userRoles,
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
 * Get user roles
 */
router.get('/roles/:userEmail', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userEmail = req.params.userEmail!;
    const namespace = req.ketoNamespace || 'simple-rbac';

    // Verify user exists
    const user = await kratosService.getIdentityByEmail(userEmail);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    checkTenantAccess(user.tenant_ids, req.tenantId);

    // Get user roles
    const userRoles = await ketoService.getUserRoles(userEmail, namespace);

    res.json({
      userEmail,
      roles: userRoles,
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

export default router;
