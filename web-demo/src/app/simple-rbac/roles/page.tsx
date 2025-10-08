/**
 * Roles List Page
 * Main listing and management interface for roles in Simple RBAC
 *
 * @remarks
 * This page displays all roles in a table format with basic CRUD operations.
 * Create/Edit operations now happen on separate pages for better UX.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUsers } from '@/lib/hooks/useUsers';
import { useRoles, useRoleMutations } from '@/lib/hooks/useRoles';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  AlertDescription,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { CardSkeleton, TableSkeleton } from '@/components/ui/loading';
import {
  ShieldCheck,
  Shield,
  User as UserIcon,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Shield as ShieldIcon,
} from 'lucide-react';
import { Role } from '@/lib/types';
import { toast } from 'sonner';

/**
 * Helper function to get role display properties for UI rendering
 * @param roleName - The name of the role to get display info for
 * @returns Role display information including icon, color, and permissions
 */
interface RoleDisplayInfo {
  /** Icon component to display for this role */
  icon: typeof ShieldCheck;
  /** Color theme for the role */
  color: string;
  /** Badge variant for UI display */
  variant: 'default' | 'destructive' | 'secondary' | 'outline';
  /** Sample permissions for display purposes */
  permissions: {
    view: boolean | string;
    create: boolean | string;
    update: boolean | string;
    delete: boolean | string;
  };
  /** Roles this role inherits from */
  inheritsFrom: string[];
}

/**
 * Get display information for a role including icons, colors, and sample permissions
 *
 * @param roleName - The name of the role to get display info for
 * @returns Role display configuration with UI properties
 *
 * @remarks
 * This function provides UI display properties for different role types.
 * In a production app, this would be configuration-driven or fetched from an API.
 */
const getRoleDisplayInfo = (roleName: string): RoleDisplayInfo => {
  const roleDisplayMap: Record<string, RoleDisplayInfo> = {
    admin: {
      icon: ShieldCheck,
      color: 'red',
      variant: 'destructive',
      permissions: {
        view: true,
        create: true,
        update: true,
        delete: true,
      },
      inheritsFrom: ['moderator', 'customer'],
    },
    moderator: {
      icon: Shield,
      color: 'yellow',
      variant: 'default',
      permissions: {
        view: true,
        create: 'products only',
        update: 'categories only',
        delete: false,
      },
      inheritsFrom: ['customer'],
    },
    customer: {
      icon: UserIcon,
      color: 'blue',
      variant: 'secondary',
      permissions: {
        view: true,
        create: false,
        update: false,
        delete: false,
      },
      inheritsFrom: [],
    },
  };

  return roleDisplayMap[roleName] || {
    icon: ShieldIcon,
    color: 'gray',
    variant: 'outline',
    permissions: {
      view: false,
      create: false,
      update: false,
      delete: false,
    },
    inheritsFrom: [],
  };
};

export default function RolesPage() {
  const router = useRouter();
  const { users, isLoading: usersLoading } = useUsers();
  const { roles, isLoading: rolesLoading, error: rolesError, mutate } = useRoles();
  const { deleteRole } = useRoleMutations();

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; role: Role | null }>({
    open: false,
    role: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoading = usersLoading || rolesLoading;

  // Group users by role
  const getUsersByRole = (roleId: string) => {
    return users.filter(user => user.tenant_ids.includes(roleId));
  };

  // Combine API roles with display information
  const enrichedRoles = roles.map(role => {
    const displayInfo = getRoleDisplayInfo(role.name);
    return {
      ...role,
      displayInfo,
    };
  });

  /**
   * Navigate to create role page
   */
  const handleCreateRole = () => {
    router.push('/simple-rbac/roles/create');
  };

  /**
   * Navigate to edit role page
   * @param role - Role to edit
   */
  const handleEditRole = (role: Role) => {
    router.push(`/simple-rbac/roles/${encodeURIComponent(role.name)}/edit`);
  };

  /**
   * Open delete confirmation dialog
   * @param role - Role to delete
   */
  const handleDeleteRole = (role: Role) => {
    setDeleteDialog({ open: true, role });
  };

  /**
   * Close delete dialog
   */
  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, role: null });
  };

  /**
   * Confirm role deletion
   */
  const confirmDelete = async () => {
    if (!deleteDialog.role) return;

    const usersWithRole = getUsersByRole(deleteDialog.role.name);
    if (usersWithRole.length > 0) {
      toast.error(`Cannot delete role: ${usersWithRole.length} user(s) are assigned to this role`);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteRole(deleteDialog.role.name);
      await mutate();
      toast.success('Role deleted successfully');
      closeDeleteDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete role';
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to delete roles');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Simple RBAC: Global authorization model - no tenant isolation required

  if (isLoading) {
    return <CardSkeleton count={4} />;
  }

  if (rolesError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load roles: {rolesError}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Roles Management Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles Management</CardTitle>
              <CardDescription>
                Create and manage roles for your RBAC system
              </CardDescription>
            </div>
            <Button onClick={handleCreateRole}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldIcon className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No roles found. Create your first role to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedRoles.map((role) => {
                  const Icon = role.displayInfo.icon;
                  const userCount = getUsersByRole(role.name).length;

                  return (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {role.name}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {role.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{role.namespace}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.displayInfo.variant}>
                          {userCount} {userCount === 1 ? 'user' : 'users'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(role.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRole(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={closeDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteDialog.role && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="font-medium">{deleteDialog.role.name}</p>
                <p className="text-sm text-muted-foreground">{deleteDialog.role.description}</p>
                <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{deleteDialog.role.namespace}</Badge>
                  <span>ID: {deleteDialog.role.id}</span>
                </div>
              </div>

              {getUsersByRole(deleteDialog.role.name).length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This role has {getUsersByRole(deleteDialog.role.name).length} user(s) assigned.
                    Please reassign these users before deleting the role.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting || (deleteDialog.role ? getUsersByRole(deleteDialog.role.name).length > 0 : false)}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
