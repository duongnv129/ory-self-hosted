/**
 * Context middleware for extracting multi-tenancy context
 */

/// <reference path="../types/express.d.ts" />

import { Request, Response, NextFunction } from 'express';

/**
 * Extract tenant context from headers or URL params
 * Sets tenantId, userId, userEmail, userTraits, and ketoNamespace on request
 */
export const contextMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Extract tenant ID (optional for Simple RBAC)
  req.tenantId = req.headers['x-tenant-id'] as string | undefined || req.params.tenantId;

  // Extract user ID
  req.userId = (req.headers['x-user-id'] as string) || req.query.userId as string || 'mock-user';

  // Extract user email
  req.userEmail =
    (req.headers['x-user-email'] as string) || req.query.userEmail as string || 'mock@example.com';

  // Set user traits
  req.userTraits = {
    tenant_ids: req.tenantId ? [req.tenantId] : [],
    email: req.userEmail,
  };

  // Extract Keto namespace (default to simple-rbac)
  req.ketoNamespace = (req.headers['x-keto-namespace'] as string) || 'simple-rbac';

  console.log(
    `Context Middleware: tenantId=${req.tenantId}, userId=${req.userId}, ketoNamespace=${req.ketoNamespace}`
  );

  next();
};
