/**
 * Simple RBAC Overview Page
 * Dashboard showing role hierarchy, stats, and quick navigation
 */

'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@/components/ui';
import { useUsers } from '@/lib/hooks/useUsers';
import { useProducts } from '@/lib/hooks/useProducts';
import { useCategories } from '@/lib/hooks/useCategories';
import { useTenant } from '@/lib/hooks/useTenant';
import { Shield, ShieldCheck, User, Package, FolderOpen, ArrowRight, AlertCircle } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/loading';
import { Alert, AlertDescription } from '@/components/ui';

export default function SimpleRBACOverviewPage() {
  const { currentTenant } = useTenant();
  const { users, isLoading: usersLoading } = useUsers();
  const { products, isLoading: productsLoading } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();

  // Calculate stats
  const adminCount = users.filter(u => u.tenant_ids.includes('admin')).length;
  const moderatorCount = users.filter(u => u.tenant_ids.includes('moderator')).length;
  const customerCount = users.filter(u => u.tenant_ids.includes('customer')).length;

  const isLoading = usersLoading || productsLoading || categoriesLoading;

  if (!currentTenant) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a tenant from the dropdown above to view Simple RBAC data.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return <CardSkeleton count={6} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Simple RBAC Overview</h2>
        <p className="mt-2 text-muted-foreground">
          Global role-based access control with hierarchical permission inheritance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {adminCount} admin, {moderatorCount} moderator, {customerCount} customer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {categories.length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Product categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Admin, Moderator, Customer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Role Hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle>Role Hierarchy</CardTitle>
          <CardDescription>
            Permission inheritance flows from admin to customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Admin Role */}
            <div className="flex items-start gap-4 rounded-lg border p-4">
              <div className="rounded-full bg-red-100 p-2">
                <ShieldCheck className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Admin</h3>
                  <Badge variant="destructive">Highest Access</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Full access to all resources
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline">view</Badge>
                  <Badge variant="outline">create</Badge>
                  <Badge variant="outline">update</Badge>
                  <Badge variant="outline">delete</Badge>
                </div>
              </div>
            </div>

            {/* Inheritance Arrow */}
            <div className="ml-8 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-8 w-px bg-border" />
              <span>inherits from</span>
            </div>

            {/* Moderator Role */}
            <div className="flex items-start gap-4 rounded-lg border p-4">
              <div className="rounded-full bg-yellow-100 p-2">
                <Shield className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Moderator</h3>
                  <Badge>Medium Access</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Can create products, update categories, view all
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline">view</Badge>
                  <Badge variant="outline">create (products)</Badge>
                  <Badge variant="outline">update (categories)</Badge>
                </div>
              </div>
            </div>

            {/* Inheritance Arrow */}
            <div className="ml-8 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-8 w-px bg-border" />
              <span>inherits from</span>
            </div>

            {/* Customer Role */}
            <div className="flex items-start gap-4 rounded-lg border p-4">
              <div className="rounded-full bg-blue-100 p-2">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Customer</h3>
                  <Badge variant="secondary">Read Only</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  View-only access to resources
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline">view</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/simple-rbac/users">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Manage Users</span>
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
              <CardDescription>
                Create users and assign global roles
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/simple-rbac/roles">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>View Roles</span>
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
              <CardDescription>
                Explore role permissions and assignments
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/simple-rbac/products">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Manage Products</span>
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
              <CardDescription>
                CRUD operations on products
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/simple-rbac/categories">
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Manage Categories</span>
                <ArrowRight className="h-5 w-5" />
              </CardTitle>
              <CardDescription>
                CRUD operations on categories
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
