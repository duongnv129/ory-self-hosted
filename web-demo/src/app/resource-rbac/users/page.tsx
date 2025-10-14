/**
 * Resource-Scoped Users Management Page
 * CRUD interface for managing users with resource-level role assignments
 *
 * Features:
 * - Tenant-aware user management
 * - Resource-specific role assignment
 * - Permission testing per user
 * - Inline CRUD operations with dialogs
 */

'use client';

import { useState, useEffect } from 'react';
import { useUsers } from '@/lib/hooks';
import { useRoles } from '@/lib/hooks/useRoles';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { TableSkeleton } from '@/components/ui/loading';
import { Plus, Pencil, Trash2, AlertCircle, ShieldCheck, Shield, User as UserIcon, Loader2, TestTube } from 'lucide-react';
import { User } from '@/lib/types';
import { toast } from 'sonner';

type DialogMode = 'create' | 'edit' | 'delete' | null;

// Helper function to get role UI configuration
const getRoleConfig = (roleName: string) => {
  const roleConfigMap: Record<string, { icon: typeof ShieldCheck; variant: 'destructive' | 'default' | 'secondary' }> = {
    admin: { icon: ShieldCheck, variant: 'destructive' },
    moderator: { icon: Shield, variant: 'default' },
    customer: { icon: UserIcon, variant: 'secondary' },
  };

  return roleConfigMap[roleName.toLowerCase()] || { icon: UserIcon, variant: 'secondary' };
};

export default function ResourceUsersPage() {
  const { currentTenant } = useTenant();
  const { users, isLoading, isError, error, refresh, createUser, updateUser, deleteUser } = useUsers();
  const { roles, isLoading: isLoadingRoles, isError: rolesError } = useRoles();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Resource-specific features
  const [roleAssignmentOpen, setRoleAssignmentOpen] = useState(false);
  const [permissionTesterOpen, setPermissionTesterOpen] = useState(false);
  const [selectedResourceUser, setSelectedResourceUser] = useState<AssignableResource | undefined>(undefined);

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'customer',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default role when roles are loaded
  useEffect(() => {
    if (roles.length > 0 && formData.role === 'customer' && !roles.find(r => r.name === 'customer')) {
      setFormData(prev => ({ ...prev, role: roles[0].name }));
    }
  }, [roles, formData.role]);

  const openCreateDialog = () => {
    const defaultRole = roles.length > 0 ? roles[0].name : 'customer';
    setFormData({ email: '', firstName: '', lastName: '', role: defaultRole });
    setSelectedUser(null);
    setDialogMode('create');
  };

  const openEditDialog = (user: User) => {
    const defaultRole = roles.length > 0 ? roles[0].name : 'customer';
    setFormData({
      email: user.email,
      firstName: user.name.first,
      lastName: user.name.last,
      role: defaultRole,
    });
    setSelectedUser(user);
    setDialogMode('edit');
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDialogMode('delete');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedUser(null);
    const defaultRole = roles.length > 0 ? roles[0].name : 'customer';
    setFormData({ email: '', firstName: '', lastName: '', role: defaultRole });
  };

  // Resource-specific handlers
  const handleManageRoles = (user: User) => {
    setSelectedResourceUser({
      id: user.id,
      name: `${user.name.first} ${user.name.last}`,
      type: 'user',
      currentRoles: [], // Fetched from backend during role assignment
    });
    setRoleAssignmentOpen(true);
  };

  const handleTestPermissions = (user: User) => {
    setSelectedResourceUser({
      id: user.id,
      name: `${user.name.first} ${user.name.last}`,
      type: 'user',
      currentRoles: [],
    });
    setPermissionTesterOpen(true);
  };

  const handleRoleAssigned = () => {
    refresh();
    toast.success('Roles assigned successfully');
  };

  const handleCreate = async () => {
    if (!formData.email || !formData.firstName) {
      toast.error('Email and first name are required');
      return;
    }

    if (!currentTenant) {
      toast.error('Please select a tenant first');
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser({
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        roles: [formData.role],
      });

      toast.success('User created successfully');
      closeDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to create users');
      } else if (errorMessage.includes('already exists')) {
        toast.error('User with this email already exists');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;

    if (!currentTenant) {
      toast.error('Please select a tenant first');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUser(selectedUser.id, {
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        roles: [formData.role],
      });

      toast.success('User updated successfully');
      closeDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to update users');
      } else if (errorMessage.includes('already exists')) {
        toast.error('Email already in use by another user');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    if (!currentTenant) {
      toast.error('Please select a tenant first');
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteUser(selectedUser.id);

      toast.success('User deleted successfully');
      closeDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to delete users');
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
          Please select a tenant from the sidebar to manage users.
        </AlertDescription>
      </Alert>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load users'}
        </AlertDescription>
      </Alert>
    );
  }

  if (rolesError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load roles. Please refresh the page.
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
          Managing users for tenant: <strong>{currentTenant}</strong>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage users with resource-level role assignments
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog} disabled={isLoadingRoles || !currentTenant}>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No users found for this tenant. Create your first user to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name.first} {user.name.last}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{currentTenant}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(user)}
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
                          onClick={() => handleManageRoles(user)}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Roles
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestPermissions(user)}
                        >
                          <TestTube className="mr-2 h-4 w-4" />
                          Test
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
              {dialogMode === 'create' ? 'Create User' : 'Edit User'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? `Add a new user to ${currentTenant}`
                : 'Update user information'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Default Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                disabled={isLoadingRoles}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder={isLoadingRoles ? "Loading roles..." : "Select a role"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingRoles ? (
                    <SelectItem value="" disabled>
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading roles...
                      </div>
                    </SelectItem>
                  ) : roles.length === 0 ? (
                    <SelectItem value="" disabled>
                      No roles available
                    </SelectItem>
                  ) : (
                    roles.map((role) => {
                      const roleConfig = getRoleConfig(role.name);
                      const Icon = roleConfig.icon;
                      return (
                        <SelectItem key={role.name} value={role.name}>
                          <div className="flex items-center">
                            <Icon className="mr-2 h-4 w-4" />
                            {role.name}
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Resource-specific roles can be assigned after creation
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
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
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="rounded-lg border p-4">
              <p className="font-medium">
                {selectedUser.name.first} {selectedUser.name.last}
              </p>
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              <Badge variant="outline" className="mt-2">{currentTenant}</Badge>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
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
          setSelectedResourceUser(undefined);
        }}
        resource={selectedResourceUser}
        onRoleAssigned={handleRoleAssigned}
      />

      {/* Resource Permission Tester Dialog */}
      <ResourcePermissionTester
        open={permissionTesterOpen}
        onClose={() => {
          setPermissionTesterOpen(false);
          setSelectedResourceUser(undefined);
        }}
        resourceType={'users'}
        resourceId={selectedResourceUser?.id.toString()}
        resourceName={selectedResourceUser?.name}
      />
    </div>
  );
}
