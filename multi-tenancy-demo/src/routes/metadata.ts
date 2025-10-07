/**
 * Metadata routes - System resources and permissions
 */

import { Router, Request, Response } from 'express';

const router: Router = Router();

/**
 * Get system metadata (resources and their permissions)
 * GET /metadata/list
 */
router.get('/list', (_req: Request, res: Response) => {
  const metadata = {
    resources: [
      {
        resource: 'product',
        permissions: ['view', 'create', 'update', 'delete']
      },
      {
        resource: 'category',
        permissions: ['view', 'create', 'update', 'delete']
      }
    ]
  };

  res.json({
    message: 'System metadata retrieved successfully',
    data: metadata,
  });
});

export default router;
