/**
 * User routes - Kratos identity management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { KratosService } from '../services/kratos.service';
import { CreateUserRequest, UpdateUserRequest, UserName } from '../types/models';
import { ValidationError, ForbiddenError } from '../types/errors';

const router: Router = Router();
const kratosService = new KratosService();

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
 * Create a tenant user
 */
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name } = req.body as CreateUserRequest;

    if (!email || !name) {
      throw new ValidationError('email and name are required');
    }

    const parsedName = parseName(name);
    const tenantIds = req.tenantId ? [req.tenantId] : [];

    const user = await kratosService.createIdentity(email, parsedName, tenantIds);

    res.status(201).json({
      message: 'User created successfully',
      tenant_id: req.tenantId,
      user,
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
 * Update existing user
 */
router.put('/update/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId!;
    const { email, name, tenant_ids } = req.body as UpdateUserRequest;

    const existingUser = await kratosService.getIdentity(userId);
    if (!existingUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    checkTenantAccess(existingUser.tenant_ids, req.tenantId);

    const parsedName = name ? parseName(name, existingUser.name) : existingUser.name;
    const updatedEmail = email || existingUser.email;
    const updatedTenantIds = tenant_ids !== undefined ? tenant_ids : existingUser.tenant_ids;

    const user = await kratosService.updateIdentity(
      userId,
      updatedEmail,
      parsedName,
      updatedTenantIds
    );

    res.json({
      message: 'User updated successfully',
      tenant_id: req.tenantId,
      user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete user
 */
router.delete('/delete/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId!;

    const user = await kratosService.getIdentity(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    checkTenantAccess(user.tenant_ids, req.tenantId);

    const deleted = await kratosService.deleteIdentity(userId);
    if (!deleted) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      message: 'User deleted successfully',
      tenant_id: req.tenantId,
      user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
