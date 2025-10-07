/**
 * Express Request type extensions for multi-tenancy context
 */

declare global {
  namespace Express {
    interface Request {
      /**
       * Tenant identifier extracted from x-tenant-id header
       * Can be undefined for global operations (Simple RBAC)
       */
      tenantId?: string;

      /**
       * User identifier extracted from x-user-id header or query param
       */
      userId: string;

      /**
       * User email extracted from x-user-email header or query param
       */
      userEmail: string;

      /**
       * User traits containing tenant_ids and email
       */
      userTraits: {
        tenant_ids: string[];
        email: string;
      };

      /**
       * Keto namespace for authorization context
       * Defaults to 'simple-rbac' if not provided
       */
      ketoNamespace: string;
    }
  }
}

export {};
