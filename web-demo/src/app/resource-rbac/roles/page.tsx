/**
 * Resource-Scoped Role Management Page (Refactored)
 * Full CRUD interface for managing tenant + resource-scoped roles
 * Refactored to use dedicated pages instead of dialogs for better UX and SEO
 *
 * Next.js                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Inherits From</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>rns Applied:
 * - Client Component with proper state management
 * - Page-based navigation instead of modal dialogs
 * - TypeScript interfaces for all props and data
 * - Error handling with user-friendly messages
 * - Optimistic updates with SWR
 * - Component separation and composition
 * - Performance optimized with proper memoization
 *
 * Architecture:
 * - Roles are assigned per resource type: tenant:a#product:items#admin
 * - Same user can have different roles per resource: Alice = admin(products), moderator(categories)
 * - Complete tenant isolation: tenant:a roles ≠ tenant:b roles
 * - Backend sync with Keto for permission tuples
 *
 * API Integration:
 * - Routes through Oathkeeper (resource-rbac-roles-rule)
 * - Backend: multi-tenancy-demo/src/routes/resource_rbac_role.ts
 * - Automatically includes tenant context via x-tenant-id header
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRoles, useRole } from '@/lib/hooks/useRoles';
import { useTenant } from '@/lib/context/TenantContext';
import { ErrorBoundary } from '@/components/error-boundary';
import { TableLoadingSkeleton, DataLoading } from '@/components/loading';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Alert,
  AlertDescription,
} from '@/components/ui';
import {
  Plus,
  Shield,
  Edit,
  Trash2,
  Globe,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Role } from '@/lib/types/models';

export default function RolesPage() {
  const router = useRouter();
  const { currentTenant } = useTenant();
  const {
    roles,
    isLoading: rolesLoading,
    isError: rolesError,
    mutate: mutateRolesList,
  } = useRoles();

  // Use useRole for delete operations (Next.js Pro pattern)
  const { deleteRole } = useRole(null);

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    role: Role | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    role: null,
    isDeleting: false,
  });

  // Navigation handlers - removed unused handleCreateRole since we use Link instead

  const handleEditRole = useCallback((role: Role) => {
    // Navigate to edit page
    router.push(`/resource-rbac/roles/${encodeURIComponent(role.name)}/edit`);
  }, [router]);

  // Delete handlers
  const openDeleteDialog = useCallback((role: Role) => {
    setDeleteDialog({
      isOpen: true,
      role,
      isDeleting: false,
    });
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog({
      isOpen: false,
      role: null,
      isDeleting: false,
    });
  }, []);

  const handleDeleteRole = useCallback(async () => {
    if (!deleteDialog.role || !currentTenant) return;

    setDeleteDialog(prev => ({ ...prev, isDeleting: true }));

    try {
      await deleteRole(deleteDialog.role.name);

      // Refresh the roles list after successful deletion (Next.js Pro pattern)
      mutateRolesList();

      toast.success(`Role "${deleteDialog.role.name}" deleted successfully`);
      closeDeleteDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete role';

      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to delete roles');
      } else if (errorMessage.includes('in use') || errorMessage.includes('referenced')) {
        toast.error('Cannot delete role: It is currently assigned to users');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
    }
  }, [deleteDialog.role, currentTenant, deleteRole, closeDeleteDialog, mutateRolesList]);

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          </div>
          <p className="text-muted-foreground">
            Manage resource-scoped roles and permissions for your organization.
            Create, edit, and assign roles with specific permissions for different resource types.
          </p>
        </div>

        {/* Tenant Context Alert */}
        {!currentTenant && (
          <Alert>
            <Building className="h-4 w-4" />
            <AlertDescription>
              Please select a tenant from the sidebar to manage roles.
              Role management is tenant-specific and requires an active tenant context.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {currentTenant ? `Roles for ${currentTenant}` : 'Tenant Roles'}
                </CardTitle>
                <CardDescription>
                  {currentTenant ? (
                    <>
                      Manage roles and their permissions for the selected tenant.
                      Each role can have specific permissions for different resource types.
                    </>
                  ) : (
                    'Select a tenant to view and manage its roles.'
                  )}
                </CardDescription>
              </div>
              <Link href="/resource-rbac/roles/create">
                <Button disabled={!currentTenant}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <DataLoading
              isLoading={rolesLoading}
              isError={!!rolesError}
              error={rolesError ? new Error('Failed to load roles') : null}
              onRetry={() => window.location.reload()}
              loadingText="Loading roles..."
              errorTitle="Failed to load roles"
              skeleton={<TableLoadingSkeleton />}
            >
              {roles && roles.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Inherits From</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id || role.name}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {role.description || 'No description'}
                        </TableCell>
                        <TableCell>
                          {role.inheritsFrom && role.inheritsFrom.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {role.inheritsFrom.map((parent) => (
                                <Badge key={parent} variant="outline" className="text-xs">
                                  {parent}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRole(role)}
                              title="Edit role"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(role)}
                              className="text-destructive hover:text-destructive"
                              title="Delete role"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                    <Shield className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">No roles found</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {currentTenant ? (
                        <>
                          No roles have been created for this tenant yet.
                          Create your first role to get started with permission management.
                        </>
                      ) : (
                        'Select a tenant to view its roles.'
                      )}
                    </p>
                  </div>
                  {currentTenant && (
                    <Link href="/resource-rbac/roles/create">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Role
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </DataLoading>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.isOpen} onOpenChange={() => !deleteDialog.isDeleting && closeDeleteDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Role</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the role &ldquo;{deleteDialog.role?.name}&rdquo;?
                This action cannot be undone and may affect users who have this role assigned.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeDeleteDialog}
                disabled={deleteDialog.isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRole}
                disabled={deleteDialog.isDeleting}
              >
                {deleteDialog.isDeleting ? 'Deleting...' : 'Delete Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
}
