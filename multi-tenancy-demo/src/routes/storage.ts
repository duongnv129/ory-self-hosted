/**
 * Storage administration routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { storageService } from '../app';
import { ValidationError } from '../types/errors';

const router: Router = Router();

/**
 * Get storage statistics
 */
router.get('/stats', (_req: Request, res: Response) => {
  const stats = storageService.getStorageStats();
  res.json({
    message: 'Storage statistics retrieved successfully',
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Force save storage data (manual persistence)
 */
router.post('/persist', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await storageService.persist();

    if (!result) {
      res.json({
        message: 'Persistence is not enabled - running in memory-only mode',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      message: 'Storage data persisted successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Restore from backup
 */
router.post('/restore', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await storageService.restoreFromBackup();

    if (!result) {
      throw new ValidationError('Persistence is not enabled');
    }

    res.json({
      message: 'Storage data restored from backup successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Health check for storage system
 */
router.get('/health', (_req: Request, res: Response) => {
  const stats = storageService.getStorageStats();

  res.json({
    status: 'ok',
    persistence: {
      enabled: stats.persistenceEnabled,
      message: stats.persistenceEnabled
        ? 'File persistence is active'
        : 'Running in memory-only mode',
    },
    data: {
      totalEntities: stats.productsCount + stats.categoriesCount + stats.rolesCount,
      breakdown: {
        products: stats.productsCount,
        categories: stats.categoriesCount,
        roles: stats.rolesCount,
      },
      namespaces: stats.namespaces,
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
