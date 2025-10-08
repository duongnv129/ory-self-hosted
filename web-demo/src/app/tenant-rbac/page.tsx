/**
 * Tenant-Centric RBAC Page
 * Multi-tenant role-based access control with tenant isolation
 */

'use client';

import { useEffect } from 'react';
import { TenantSelector } from '@/components/features/TenantSelector';
import { apiClient } from '@/lib/api/client';

export default function TenantRBACPage() {
  // Set use case context to prefix API calls with /api/tenant-rbac
  useEffect(() => {
    apiClient.setUseCaseContext('tenant-rbac');
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Use Case 2: Tenant-Centric RBAC</h1>
        <p className="mt-2 text-muted-foreground">
          Multi-tenant role-based access control with tenant isolation
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
          This page will demonstrate multi-tenant role-based access control with tenant isolation.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Implementation in progress...
        </p>
      </div>
    </div>
  );
}
