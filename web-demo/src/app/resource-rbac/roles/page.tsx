/**
 * Resource-Scoped Roles Management Page
 * Display and manage tenant + resource-scoped roles
 *
 * Architecture:
 * - Roles are assigned per resource type: tenant:a#product:items#admin
 * - Same user can have different roles per resource: Alice = admin(products), moderator(categories)
 * - Complete tenant isolation: tenant:a roles ≠ tenant:b roles
 *
 * Reference: keto-zanziban-multi-tenancy-rbac-per-resource/README.md
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Alert, AlertDescription } from '@/components/ui';
import { useTenant } from '@/lib/context/TenantContext';
import { Shield, AlertCircle, Users, Package, FolderOpen, ChevronRight } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/loading';

// Role hierarchy per resource type
const RESOURCE_ROLE_HIERARCHIES = {
  products: {
    admin: {
      permissions: ['view', 'create', 'delete'],
      description: 'Full control over products',
      inherits: ['moderator'],
      color: 'destructive',
    },
    moderator: {
      permissions: ['view', 'create'],
      description: 'Can create and view products',
      inherits: ['customer'],
      color: 'default',
    },
    customer: {
      permissions: ['view'],
      description: 'Read-only access to products',
      inherits: [],
      color: 'secondary',
    },
  },
  categories: {
    admin: {
      permissions: ['view', 'create', 'update'],
      description: 'Full control over categories',
      inherits: ['moderator'],
      color: 'destructive',
    },
    moderator: {
      permissions: ['view', 'update'],
      description: 'Can update categories',
      inherits: ['customer'],
      color: 'default',
    },
    customer: {
      permissions: ['view'],
      description: 'Read-only access to categories',
      inherits: [],
      color: 'secondary',
    },
  },
};

const RESOURCE_TYPES = [
  { key: 'products', label: 'Products', icon: Package },
  { key: 'categories', label: 'Categories', icon: FolderOpen },
  { key: 'users', label: 'Users', icon: Users },
];

export default function ResourceRolesPage() {
  const { currentTenant } = useTenant();

  // Show tenant selection prompt if no tenant selected
  if (!currentTenant) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a tenant from the sidebar to manage resource-scoped roles.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>What are Resource-Scoped Roles?</CardTitle>
            <CardDescription>
              Fine-grained authorization model with per-resource role assignments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Key Concept:</h4>
              <p className="text-sm text-muted-foreground">
                Users can have <strong>different roles for different resource types</strong> within the same tenant.
              </p>
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-sm font-mono">
                  user:alice → tenant:a#product:items → <Badge variant="destructive">admin</Badge>
                </p>
                <p className="text-sm font-mono mt-1">
                  user:alice → tenant:a#category:items → <Badge>moderator</Badge>
                </p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Advantages:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Maximum granularity: Different permissions per resource type</li>
                <li>Precise access control: Admin on products ≠ admin on categories</li>
                <li>Flexible hierarchies: Each resource type has its own role structure</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tenant Context Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Viewing resource-scoped roles for tenant: <strong>{currentTenant}</strong>
        </AlertDescription>
      </Alert>

      {/* Resource-Scoped Role Model Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Resource-Scoped Role Model
          </CardTitle>
          <CardDescription>
            Roles are assigned <strong>per resource type</strong> within this tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Example: Alice's Permissions</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    <code className="bg-background px-1 py-0.5 rounded">tenant:{currentTenant}#product:items</code> →
                    <Badge variant="destructive" className="ml-2">admin</Badge>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Alice has full control over products (view, create, delete)
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <FolderOpen className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">
                    <code className="bg-background px-1 py-0.5 rounded">tenant:{currentTenant}#category:items</code> →
                    <Badge className="ml-2">moderator</Badge>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Alice can view and update categories (but NOT create/delete)
                </p>
              </div>
            </div>

            <div className="grid gap-2 text-sm">
              <div className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
                <span><strong>Separate assignments:</strong> Each resource type requires explicit role assignment</span>
              </div>
              <div className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
                <span><strong>No cross-resource inheritance:</strong> Admin on products ≠ admin on categories</span>
              </div>
              <div className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
                <span><strong>Tenant isolation:</strong> Roles in tenant:a have no effect on tenant:b</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Hierarchies per Resource Type */}
      {RESOURCE_TYPES.map((resource) => {
        const Icon = resource.icon;
        const hierarchy = RESOURCE_ROLE_HIERARCHIES[resource.key as keyof typeof RESOURCE_ROLE_HIERARCHIES];

        if (!hierarchy) return null;

        return (
          <Card key={resource.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {resource.label} Role Hierarchy
              </CardTitle>
              <CardDescription>
                Roles and permissions for <code className="bg-muted px-1 rounded">tenant:{currentTenant}#{resource.key}:items</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(hierarchy).map(([roleName, roleConfig]) => {
                  const Icon = roleName === 'admin' ? Shield : roleName === 'moderator' ? Shield : Users;

                  return (
                    <div key={roleName} className="flex items-start gap-4 rounded-lg border p-4">
                      <div className={`rounded-full p-2 ${
                        roleConfig.color === 'destructive' ? 'bg-red-100' :
                        roleConfig.color === 'default' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          roleConfig.color === 'destructive' ? 'text-red-600' :
                          roleConfig.color === 'default' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold capitalize">{roleName}</h3>
                          <Badge variant={roleConfig.color as any}>
                            {roleName === 'admin' ? 'Full Access' :
                             roleName === 'moderator' ? 'Edit Access' : 'Read Only'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {roleConfig.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {roleConfig.permissions.map((permission) => (
                            <Badge key={permission} variant="outline">{permission}</Badge>
                          ))}
                        </div>
                        {roleConfig.inherits.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Inherits from: <code className="bg-muted px-1 rounded">{roleConfig.inherits.join(', ')}</code>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Permission Matrix */}
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <h4 className="text-sm font-semibold mb-2">Permission Matrix</h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1">Role</th>
                        {['view', 'create', 'update', 'delete'].map((action) => (
                          <th key={action} className="text-center py-1 capitalize">{action}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(hierarchy).map(([roleName, roleConfig]) => (
                        <tr key={roleName} className="border-b">
                          <td className="py-1 capitalize font-medium">{roleName}</td>
                          {['view', 'create', 'update', 'delete'].map((action) => (
                            <td key={action} className="text-center py-1">
                              {roleConfig.permissions.includes(action) ? '✅' : '❌'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Keto Tuple Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Keto Tuple Structure</CardTitle>
          <CardDescription>
            How resource-scoped roles are stored in Keto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 text-sm">User Role Assignment:</h4>
            <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "namespace": "resource-rbac",
  "object": "tenant:${currentTenant}#product:items",
  "relation": "admin",
  "subject_id": "user:alice"
}`}
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              This assigns Alice as admin for products in {currentTenant}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-sm">Permission Grant:</h4>
            <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "namespace": "resource-rbac",
  "object": "tenant:${currentTenant}#product:items",
  "relation": "delete",
  "subject_set": {
    "namespace": "resource-rbac",
    "object": "tenant:${currentTenant}#product:items",
    "relation": "admin"
  }
}`}
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              This grants delete permission to admins of products in {currentTenant}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-sm">Role Hierarchy:</h4>
            <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto">
{`{
  "namespace": "resource-rbac",
  "object": "tenant:${currentTenant}#product:items",
  "relation": "moderator",
  "subject_set": {
    "namespace": "resource-rbac",
    "object": "tenant:${currentTenant}#product:items",
    "relation": "admin"
  }
}`}
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              Admins inherit all moderator permissions for products
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Note */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> Role assignments are managed through the Users, Products, and Categories pages
          using the "Manage Roles" action. This page provides an overview of the role model and hierarchy structure.
        </AlertDescription>
      </Alert>
    </div>
  );
}
