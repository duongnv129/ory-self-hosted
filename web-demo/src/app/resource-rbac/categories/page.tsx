/**
 * Resource-Scoped Categories Management Page
 * CRUD interface for managing categories with resource-level permissions
 *
 * Features:
 * - Tenant-aware category management
 * - Resource-specific role assignment
 * - Permission testing per category
 * - Inline CRUD operations with dialogs
 */

'use client';

import { useState } from 'react';
import { useCategories } from '@/lib/hooks';
import { useProducts } from '@/lib/hooks';
import { useTenant } from '@/lib/context/TenantContext';
import {
  ResourceRoleAssignment,
  ResourcePermissionTester,
  type AssignableResource,
} from '@/components/features';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Alert,
  AlertDescription,
  Input,
  Label,
} from '@/components/ui';
import { TableSkeleton } from '@/components/ui/loading';
import { Plus, Pencil, Trash2, AlertCircle, FolderOpen, Shield, TestTube } from 'lucide-react';
import { Category } from '@/lib/types';
import { toast } from 'sonner';

type DialogMode = 'create' | 'edit' | 'delete' | null;

export default function ResourceCategoriesPage() {
  const { currentTenant } = useTenant();
  const { categories, isLoading: categoriesLoading, isError, error, refresh, createCategory, updateCategory, deleteCategory } = useCategories();
  const { products, isLoading: productsLoading } = useProducts();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Resource-specific features
  const [roleAssignmentOpen, setRoleAssignmentOpen] = useState(false);
  const [permissionTesterOpen, setPermissionTesterOpen] = useState(false);
  const [selectedResourceCategory, setSelectedResourceCategory] = useState<AssignableResource | undefined>(undefined);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = categoriesLoading || productsLoading;

  // Calculate product count per category
  const getProductCount = (categoryName: string) => {
    return products.filter(p => p.category === categoryName).length;
  };

  const openCreateDialog = () => {
    setFormData({ name: '', description: '' });
    setSelectedCategory(null);
    setDialogMode('create');
  };

  const openEditDialog = (category: Category) => {
    setFormData({
      name: category.name,
      description: category.description,
    });
    setSelectedCategory(category);
    setDialogMode('edit');
  };

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setDialogMode('delete');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedCategory(null);
    setFormData({ name: '', description: '' });
  };

  // Resource-specific handlers
  const handleManageRoles = (category: Category) => {
    setSelectedResourceCategory({
      id: category.id.toString(),
      name: category.name,
      type: 'category',
      currentRoles: [], // TODO: Fetch actual roles from backend
    });
    setRoleAssignmentOpen(true);
  };

  const handleTestPermissions = (category: Category) => {
    setSelectedResourceCategory({
      id: category.id.toString(),
      name: category.name,
      type: 'category',
      currentRoles: [],
    });
    setPermissionTesterOpen(true);
  };

  const handleRoleAssigned = () => {
    refresh();
    toast.success('Roles assigned successfully');
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.description) {
      toast.error('Name and description are required');
      return;
    }

    if (!currentTenant) {
      toast.error('Please select a tenant first');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCategory({
        name: formData.name,
        description: formData.description,
      });

      toast.success('Category created successfully');
      closeDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category';
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to create categories');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCategory) return;

    if (!currentTenant) {
      toast.error('Please select a tenant first');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCategory(selectedCategory.id, {
        name: formData.name,
        description: formData.description,
      });

      toast.success('Category updated successfully');
      closeDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update category';
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to update categories');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;

    const productCount = getProductCount(selectedCategory.name);
    if (productCount > 0) {
      toast.error(`Cannot delete category with ${productCount} product(s). Please remove products first.`);
      return;
    }

    if (!currentTenant) {
      toast.error('Please select a tenant first');
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteCategory(selectedCategory.id);

      toast.success('Category deleted successfully');
      closeDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category';
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to delete categories');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show tenant selection prompt if no tenant selected
  if (!currentTenant) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please select a tenant from the sidebar to manage categories.
        </AlertDescription>
      </Alert>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load categories'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tenant Context Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Managing categories for tenant: <strong>{currentTenant}</strong>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>
                Manage categories with resource-level permissions
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog} disabled={!currentTenant}>
              <Plus className="mr-2 h-4 w-4" />
              Create Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No categories found for this tenant. Create your first category to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const productCount = getProductCount(category.name);
                  return (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {category.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant={productCount > 0 ? 'default' : 'secondary'}>
                          {productCount} {productCount === 1 ? 'product' : 'products'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{currentTenant}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(category)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManageRoles(category)}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Roles
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestPermissions(category)}
                          >
                            <TestTube className="mr-2 h-4 w-4" />
                            Test
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogMode === 'create' || dialogMode === 'edit'} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Create Category' : 'Edit Category'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? `Add a new category to ${currentTenant}`
                : 'Update category information'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                placeholder="e.g., Electronics"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the category"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={dialogMode === 'create' ? handleCreate : handleUpdate}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : dialogMode === 'create' ? 'Create' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={dialogMode === 'delete'} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedCategory && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="font-medium">{selectedCategory.name}</p>
                <p className="text-sm text-muted-foreground">{selectedCategory.description}</p>
                <Badge variant="outline" className="mt-2">{currentTenant}</Badge>
              </div>

              {getProductCount(selectedCategory.name) > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This category has {getProductCount(selectedCategory.name)} product(s).
                    Please remove or reassign all products before deleting.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting || (selectedCategory ? getProductCount(selectedCategory.name) > 0 : false)}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resource Role Assignment Dialog */}
      <ResourceRoleAssignment
        open={roleAssignmentOpen}
        onClose={() => {
          setRoleAssignmentOpen(false);
          setSelectedResourceCategory(undefined);
        }}
        resource={selectedResourceCategory}
        onRoleAssigned={handleRoleAssigned}
      />

      {/* Resource Permission Tester Dialog */}
      <ResourcePermissionTester
        open={permissionTesterOpen}
        onClose={() => {
          setPermissionTesterOpen(false);
          setSelectedResourceCategory(undefined);
        }}
        resourceType={'categories'}
        resourceId={selectedResourceCategory?.id.toString()}
        resourceName={selectedResourceCategory?.name}
      />
    </div>
  );
}
