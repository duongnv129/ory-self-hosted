/**
 * Roles Management Page
 * CRUD interface for managing roles in Simple RBAC
 */

'use client';

import { useState } from 'react';
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
  Input,
  Label,
} from '@/components/ui';
import { CardSkeleton, TableSkeleton } from '@/components/ui/loading';
import {
  ShieldCheck,
  Shield,
  User as UserIcon,
  AlertCircle,
  Check,
  X,
  Plus,
  Pencil,
  Trash2,
  Shield as ShieldIcon,
} from 'lucide-react';
import { Role } from '@/lib/types';
import { toast } from 'sonner';

type DialogMode = 'create' | 'edit' | 'delete' | null;

// Helper function to get role display properties
interface RoleDisplayInfo {
  icon: typeof ShieldCheck;
  color: string;
  variant: 'default' | 'destructive' | 'secondary' | 'outline';
  permissions: {
    view: boolean | string;
    create: boolean | string;
    update: boolean | string;
    delete: boolean | string;
  };
  inheritsFrom: string[];
}

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
  const { users, isLoading: usersLoading } = useUsers();
  const { roles, isLoading: rolesLoading, error: rolesError, mutate } = useRoles();
  const { createRole, updateRole, deleteRole } = useRoleMutations();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const openCreateDialog = () => {
    setFormData({ name: '', description: '' });
    setSelectedRole(null);
    setDialogMode('create');
  };

  const openEditDialog = (role: Role) => {
    setFormData({
      name: role.name,
      description: role.description,
    });
    setSelectedRole(role);
    setDialogMode('edit');
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setDialogMode('delete');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedRole(null);
    setFormData({ name: '', description: '' });
  };

  const handleCreate = async () => {
    if (!formData.name || formData.name.trim().length < 2) {
      toast.error('Role name must be at least 2 characters');
      return;
    }

    if (!formData.description || formData.description.trim().length < 5) {
      toast.error('Description must be at least 5 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRole({
        name: formData.name.trim(),
        description: formData.description.trim(),
      });

      await mutate();
      toast.success('Role created successfully');
      closeDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create role';
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to create roles');
      } else if (errorMessage.includes('already exists')) {
        toast.error('A role with this name already exists');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedRole) return;

    if (!formData.description || formData.description.trim().length < 5) {
      toast.error('Description must be at least 5 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateRole(selectedRole.name, {
        description: formData.description.trim(),
      });

      await mutate();
      toast.success('Role updated successfully');
      closeDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update role';
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to update roles');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;

    const usersWithRole = getUsersByRole(selectedRole.name);
    if (usersWithRole.length > 0) {
      toast.error(`Cannot delete role: ${usersWithRole.length} user(s) are assigned to this role`);
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteRole(selectedRole.name);

      await mutate();
      toast.success('Role deleted successfully');
      closeDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete role';
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to delete roles');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
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
            <Button onClick={openCreateDialog}>
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
                            onClick={() => openEditDialog(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(role)}
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

      {/* Role Hierarchy Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Role Hierarchy</CardTitle>
          <CardDescription>
            Permission inheritance flows from Admin to Customer (showing {roles.length} roles from API)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {enrichedRoles.map((role, index) => {
              const Icon = role.displayInfo.icon;
              const userCount = getUsersByRole(role.name).length;

              return (
                <div key={role.id}>
                  <div className="flex items-start gap-4 rounded-lg border p-6">
                    <div className={`rounded-full bg-${role.displayInfo.color}-100 p-3`}>
                      <Icon className={`h-6 w-6 text-${role.displayInfo.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{role.name}</h3>
                        <Badge variant={role.displayInfo.variant}>
                          {userCount} {userCount === 1 ? 'user' : 'users'}
                        </Badge>
                        <Badge variant="outline">
                          {role.namespace}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {role.description}
                      </p>

                      {/* Permission Badges */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(role.displayInfo.permissions).map(([perm, value]) => (
                          value && (
                            <Badge key={perm} variant="outline">
                              {perm}: {typeof value === 'string' ? value : '✓'}
                            </Badge>
                          )
                        ))}
                      </div>

                      {/* Inheritance Info */}
                      {role.displayInfo.inheritsFrom.length > 0 && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Inherits permissions from: {role.displayInfo.inheritsFrom.join(', ')}
                        </p>
                      )}

                      {/* API metadata */}
                      <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                        <span>ID: {role.id}</span>
                        <span>•</span>
                        <span>Created: {new Date(role.createdAt).toLocaleDateString()}</span>
                        {role.tenantId && (
                          <>
                            <span>•</span>
                            <span>Tenant: {role.tenantId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inheritance Arrow */}
                  {index < enrichedRoles.length - 1 && (
                    <div className="ml-8 flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <div className="h-6 w-px bg-border" />
                      <span>inherits from</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>
            Overview of permissions by role and action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Role</TableHead>
                <TableHead>View</TableHead>
                <TableHead>Create</TableHead>
                <TableHead>Update</TableHead>
                <TableHead>Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedRoles.map((role) => {
                const Icon = role.displayInfo.icon;
                return (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {role.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {role.displayInfo.permissions.view ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      {role.displayInfo.permissions.create ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-600" />
                          {typeof role.displayInfo.permissions.create === 'string' && (
                            <span className="text-xs text-muted-foreground">
                              ({role.displayInfo.permissions.create})
                            </span>
                          )}
                        </div>
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      {role.displayInfo.permissions.update ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-600" />
                          {typeof role.displayInfo.permissions.update === 'string' && (
                            <span className="text-xs text-muted-foreground">
                              ({role.displayInfo.permissions.update})
                            </span>
                          )}
                        </div>
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      {role.displayInfo.permissions.delete ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Assignments by Role */}
      <div className="grid gap-6 md:grid-cols-3">
        {enrichedRoles.map((role) => {
          const Icon = role.displayInfo.icon;
          const roleUsers = getUsersByRole(role.name);

          return (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {role.name}
                </CardTitle>
                <CardDescription>
                  {roleUsers.length} {roleUsers.length === 1 ? 'user' : 'users'} assigned
                </CardDescription>
              </CardHeader>
              <CardContent>
                {roleUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users assigned</p>
                ) : (
                  <div className="space-y-2">
                    {roleUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between rounded-md border p-2"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {user.name.first} {user.name.last}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogMode === 'create' || dialogMode === 'edit'} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Create Role' : 'Edit Role'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? 'Add a new role to the RBAC system'
                : 'Update role information (name cannot be changed)'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                placeholder="e.g., admin, moderator, customer"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={dialogMode === 'edit'}
              />
              {dialogMode === 'edit' && (
                <p className="text-xs text-muted-foreground">
                  Role name cannot be changed after creation
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Describe the role's purpose and permissions"
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
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedRole && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="font-medium">{selectedRole.name}</p>
                <p className="text-sm text-muted-foreground">{selectedRole.description}</p>
                <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{selectedRole.namespace}</Badge>
                  <span>ID: {selectedRole.id}</span>
                </div>
              </div>

              {getUsersByRole(selectedRole.name).length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This role has {getUsersByRole(selectedRole.name).length} user(s) assigned.
                    Please reassign these users before deleting the role.
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
              disabled={isSubmitting || (selectedRole ? getUsersByRole(selectedRole.name).length > 0 : false)}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
