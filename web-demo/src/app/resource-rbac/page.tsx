/**
 * Resource-Scoped RBAC Page
 * Resource-scoped role-based access control with fine-grained permissions
 */

'use client';

import { useEffect } from 'react';
import { TenantSelector } from '@/components/features/TenantSelector';
import { apiClient } from '@/lib/api/client';

export default function ResourceRBACPage() {
  // Set use case context to prefix API calls with /api/resource-rbac
  useEffect(() => {
    apiClient.setUseCaseContext('resource-rbac');
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Use Case 3: Resource-Scoped RBAC</h1>
        <p className="mt-2 text-muted-foreground">
          Resource-scoped role-based access control with fine-grained permissions
        </p>
      </div>

      {/* Tenant Selector Section */}
      <div className="rounded-lg border bg-card p-4">
        <label className="mb-2 block text-sm font-medium">Select Tenant</label>
        <TenantSelector />
      </div>

      {/* Content Section */}
      <div className="rounded-lg border bg-card p-8">
        <p className="text-muted-foreground">
          This page will demonstrate resource-scoped role-based access control with fine-grained permissions.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Implementation in progress...
        </p>
      </div>
    </div>
  );
}
