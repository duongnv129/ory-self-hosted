/**
 * Resource-Scoped RBAC Overview Page
 * Main page for resource-scoped role-based access control with tenant awareness
 *
 * Follows Next.js Pro patterns:
 * - Client Component with proper state management
 * - Component separation and composition
 * - TypeScript interfaces for all props
 * - Error handling with user-friendly messages
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Package, FolderOpen, Users, Building, Globe, AlertCircle } from 'lucide-react';
import { useResourceUsers } from '@/lib/hooks/useResourceUsers';
import { useResourceProducts } from '@/lib/hooks/useResourceProducts';
import { useResourceCategories } from '@/lib/hooks/useResourceCategories';
import { useTenant } from '@/lib/hooks/useTenant';
import { User, Product, Category, UserWithRoles } from '@/lib/types/models';
import { toast } from 'sonner';
import {
  ResourceTable,
  ResourceRoleAssignment,
  ResourcePermissionTester,
  commonColumns,
  commonActions,
} from '@/components/features';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Interface for assignable resources
interface AssignableResource {
  id: string;
  name: string;
  type: 'user' | 'product' | 'category';
  currentRoles: string[];
}

// Interface for testable resources
interface TestableResource {
  id: string;
  name: string;
  type: 'users' | 'products' | 'categories'; // Match TestableResourceType
}

export default function ResourceRBACPage() {
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState('users');

  // Dialog states
  const [roleAssignmentOpen, setRoleAssignmentOpen] = useState(false);
  const [permissionTesterOpen, setPermissionTesterOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<AssignableResource | null>(null);
  const [testableResource, setTestableResource] = useState<TestableResource | null>(null);

  // Data hooks
  const {
    users,
    isLoading: usersLoading,
    error: usersError,
    refresh: refreshUsers,
  } = useResourceUsers();

  const {
    products,
    isLoading: productsLoading,
    error: productsError,
    refresh: refreshProducts,
  } = useResourceProducts();

  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    refresh: refreshCategories,
  } = useResourceCategories();

  // Handle role assignment for resources
  const handleManageRoles = (
    resource: User | Product | Category,
    type: 'user' | 'product' | 'category'
  ) => {
    let assignableResource: AssignableResource;

    if (type === 'user') {
      const user = resource as User;
      assignableResource = {
        id: user.id,
        name: `${user.name.first} ${user.name.last}`,
        type: 'user',
        currentRoles: 'roles' in user ? (user as UserWithRoles).roles || [] : [],
      };
    } else if (type === 'product') {
      const product = resource as Product;
      assignableResource = {
        id: product.id.toString(),
        name: product.name,
        type: 'product',
        currentRoles: [], // Mock - in real implementation, fetch from Keto
      };
    } else {
      const category = resource as Category;
      assignableResource = {
        id: category.id.toString(),
        name: category.name,
        type: 'category',
        currentRoles: [], // Mock - in real implementation, fetch from Keto
      };
    }

    setSelectedResource(assignableResource);
    setRoleAssignmentOpen(true);
  };

  // Handle permission testing
  const handleTestPermissions = (
    resource: User | Product | Category,
    type: 'user' | 'product' | 'category'
  ) => {
    let testable: TestableResource;

    if (type === 'user') {
      const user = resource as User;
      testable = {
        id: user.id,
        name: `${user.name.first} ${user.name.last}`,
        type: 'users', // Change to plural for compatibility
      };
    } else if (type === 'product') {
      const product = resource as Product;
      testable = {
        id: product.id.toString(),
        name: product.name,
        type: 'products', // Change to plural for compatibility
      };
    } else {
      const category = resource as Category;
      testable = {
        id: category.id.toString(),
        name: category.name,
        type: 'categories', // Change to plural for compatibility
      };
    }

    setTestableResource(testable);
    setPermissionTesterOpen(true);
  };

  // Handle resource deletion
  const handleDelete = async (
    resource: User | Product | Category,
    type: 'user' | 'product' | 'category'
  ) => {
    try {
      // Mock deletion - in real implementation, call appropriate API
      await new Promise(resolve => setTimeout(resolve, 500));

      const resourceName = type === 'user'
        ? `${(resource as User).name.first} ${(resource as User).name.last}`
        : (resource as Product | Category).name;

      toast.success(`${type} "${resourceName}" deleted successfully`);

      // Refresh data
      if (type === 'user') refreshUsers();
      else if (type === 'product') refreshProducts();
      else refreshCategories();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Deletion failed';
      toast.error(errorMessage);
    }
  };

  // Calculate stats
  const totalUsers = users.length;
  const totalProducts = products.length;
  const totalCategories = categories.length;

  const hasError = usersError || productsError || categoriesError;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Resource-Scoped RBAC</h2>
        <p className="mt-2 text-muted-foreground">
          Per-resource permissions with tenant-aware authorization
        </p>
      </div>

      {/* Context Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentTenant ? (
              <>
                <Building className="h-5 w-5" />
                Tenant Context: {currentTenant}
              </>
            ) : (
              <>
                <Globe className="h-5 w-5" />
                Global Context
              </>
            )}
          </CardTitle>
          <CardDescription>
            {currentTenant
              ? `Viewing resources and permissions for tenant "${currentTenant}"`
              : 'Viewing all resources across all tenants'
            }
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {currentTenant ? `In tenant ${currentTenant}` : 'Across all tenants'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Product resources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              Category resources
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {hasError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error loading resources</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {usersError && <div>Users: {usersError.message}</div>}
              {productsError && <div>Products: {productsError.message}</div>}
              {categoriesError && <div>Categories: {categoriesError.message}</div>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resource Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            Users ({totalUsers})
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="mr-2 h-4 w-4" />
            Products ({totalProducts})
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FolderOpen className="mr-2 h-4 w-4" />
            Categories ({totalCategories})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {/* @ts-expect-error - User type doesn't extend BaseResource but works at runtime */}
          <ResourceTable<UserWithRoles>
            data={users}
            columns={commonColumns.user}
            title="User Resources"
            description="Manage users and their resource-specific permissions"
            isLoading={usersLoading}
            error={usersError?.message}
            showRoles={true}
            showPermissions={true}
            onRefresh={refreshUsers}
            rowActions={[
              {
                ...commonActions.edit,
                onClick: (user) => console.log('Edit user:', user),
              },
              {
                ...commonActions.delete,
                onClick: (user) => handleDelete(user as unknown as User, 'user'),
              },
              {
                key: 'manage-roles',
                label: 'Manage Roles',
                icon: Users,
                onClick: (user) => handleManageRoles(user as unknown as User, 'user'),
              },
              {
                key: 'test-permissions',
                label: 'Test Permissions',
                icon: Package,
                onClick: (user) => handleTestPermissions(user as unknown as User, 'user'),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="products">
          {/* @ts-expect-error - Product type doesn't extend BaseResource but works at runtime */}
          <ResourceTable<Product>
            data={products}
            columns={commonColumns.product}
            title="Product Resources"
            description="Manage products and their associated permissions"
            isLoading={productsLoading}
            error={productsError?.message}
            showRoles={true}
            showPermissions={true}
            onRefresh={refreshProducts}
            rowActions={[
              {
                ...commonActions.edit,
                onClick: (product) => console.log('Edit product:', product),
              },
              {
                ...commonActions.delete,
                onClick: (product) => handleDelete(product as unknown as Product, 'product'),
              },
              {
                key: 'manage-roles',
                label: 'Manage Roles',
                icon: Users,
                onClick: (product) => handleManageRoles(product as unknown as Product, 'product'),
              },
              {
                key: 'test-permissions',
                label: 'Test Permissions',
                icon: Package,
                onClick: (product) => handleTestPermissions(product as unknown as Product, 'product'),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="categories">
          {/* @ts-expect-error - Category type doesn't extend BaseResource but works at runtime */}
          <ResourceTable<Category>
            data={categories}
            columns={commonColumns.category}
            title="Category Resources"
            description="Manage categories and their permission structures"
            isLoading={categoriesLoading}
            error={categoriesError?.message}
            showRoles={true}
            showPermissions={true}
            onRefresh={refreshCategories}
            rowActions={[
              {
                ...commonActions.edit,
                onClick: (category) => console.log('Edit category:', category),
              },
              {
                ...commonActions.delete,
                onClick: (category) => handleDelete(category as unknown as Category, 'category'),
              },
              {
                key: 'manage-roles',
                label: 'Manage Roles',
                icon: Users,
                onClick: (category) => handleManageRoles(category as unknown as Category, 'category'),
              },
              {
                key: 'test-permissions',
                label: 'Test Permissions',
                icon: Package,
                onClick: (category) => handleTestPermissions(category as unknown as Category, 'category'),
              },
            ]}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ResourceRoleAssignment
        open={roleAssignmentOpen}
        onClose={() => setRoleAssignmentOpen(false)}
        resource={selectedResource || undefined}
        onRoleAssigned={() => {
          // Refresh data based on resource type
          if (selectedResource?.type === 'user') refreshUsers();
          else if (selectedResource?.type === 'product') refreshProducts();
          else refreshCategories();
        }}
      />

      <ResourcePermissionTester
        open={permissionTesterOpen}
        onClose={() => setPermissionTesterOpen(false)}
        resourceType={testableResource?.type}
        resourceId={testableResource?.id}
        resourceName={testableResource?.name}
      />
    </div>
  );
}
