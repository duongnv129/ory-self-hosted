/**
 * Resource-Scoped RBAC Overview Page
 * Dashboard showing tenant context, stats, and quick navigation
 *
 * Note: Resource-RBAC provides fine-grained authorization at the resource level
 * with tenant isolation. Each resource can have individual permission assignments.
 */

'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Alert, AlertDescription } from '@/components/ui';
import { useUsers } from '@/lib/hooks';
import { useProducts } from '@/lib/hooks';
import { useCategories } from '@/lib/hooks';
import { useTenant } from '@/lib/context/TenantContext';
import { Shield, Package, FolderOpen, Users, ArrowRight, AlertCircle, Building, Globe } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/loading';

export default function ResourceRBACOverviewPage() {
  const { currentTenant } = useTenant();
  const { users, isLoading: usersLoading } = useUsers();
  const { products, isLoading: productsLoading } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();

  const isLoading = usersLoading || productsLoading || categoriesLoading;

  // Show loading state
  if (isLoading && !currentTenant) {
    return <CardSkeleton count={4} />;
  }

  // Show tenant selection prompt if no tenant selected
  if (!currentTenant) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Resource-Scoped RBAC</h2>
          <p className="mt-2 text-muted-foreground">
            Per-resource permissions with tenant-aware authorization
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a tenant from the sidebar to view resource-specific permissions and manage access control.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>What is Resource-Scoped RBAC?</CardTitle>
            <CardDescription>
              Fine-grained authorization model for multi-tenant applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Key Features:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Per-resource permission assignment</li>
                <li>Tenant-level isolation and access control</li>
                <li>Individual resource role assignments</li>
                <li>Real-time permission testing</li>
                <li>Granular access management</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Use Cases:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Multi-tenant SaaS applications</li>
                <li>Document sharing systems</li>
                <li>Project-based collaboration tools</li>
                <li>Resource-specific access delegation</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Resource-Scoped RBAC Overview</h2>
        <p className="mt-2 text-muted-foreground">
          Per-resource permissions with tenant-aware authorization
        </p>
      </div>

      {/* Tenant Context Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Current Tenant: <Badge variant="default" className="ml-2">{currentTenant}</Badge>
          </CardTitle>
          <CardDescription>
            All resources and permissions are scoped to this tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Resource-level permission isolation enabled</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : users.length}</div>
            <p className="text-xs text-muted-foreground">
              User resources in this tenant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : products.length}</div>
            <p className="text-xs text-muted-foreground">
              Product resources with permissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Category resources managed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Features Info */}
      <Card>
        <CardHeader>
          <CardTitle>Resource-Level Authorization</CardTitle>
          <CardDescription>
            Fine-grained permission control for each resource
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium">Individual Permissions</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Assign roles and permissions to specific users for individual resources
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                <span className="font-medium">Tenant Isolation</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete data and permission isolation per tenant
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">Role Assignment</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Flexible role-based access control at resource level
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-medium">Permission Testing</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Real-time permission validation and testing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/resource-rbac/users">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Manage Users</span>
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
              <CardDescription>
                Assign resource-specific roles to users
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/resource-rbac/products">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Manage Products</span>
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
              <CardDescription>
                Control product access and permissions
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/resource-rbac/categories">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Manage Categories</span>
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
              <CardDescription>
                Manage category-level permissions
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-muted-foreground">
              <span>Permission Matrix</span>
              <Badge variant="outline">Coming Soon</Badge>
            </CardTitle>
            <CardDescription>
              Visualize all permissions across resources
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
