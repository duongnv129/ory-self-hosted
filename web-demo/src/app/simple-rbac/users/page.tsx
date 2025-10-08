/**
 * Users Management Page
 * CRUD interface for managing users and global role assignments
 *
 * Enhanced Features:
 * - Edit form loads fresh user data from /users/get/:id API endpoint
 * - Displays actual user roles from Keto in the table
 * - Proper loading states and error handling for individual user fetching
 * - Role-aware form population with primary role selection
 */

'use client';

import { useState, useEffect } from 'react';
import { useUsers, useUser, useUserMutations } from '@/lib/hooks/useUsers';
import { useRoles } from '@/lib/hooks/useRoles';
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
import { Plus, Pencil, Trash2, AlertCircle, ShieldCheck, Shield, User as UserIcon, Loader2 } from 'lucide-react';
import { User, UserWithRoles } from '@/lib/types';
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

export default function UsersPage() {
  const { users, isLoading, isError, error, mutate } = useUsers();
  const { roles, isLoading: isLoadingRoles, isError: rolesError } = useRoles();
  const { createUser, updateUser, deleteUser } = useUserMutations();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch detailed user data when editing
  const { user: editingUser, isLoading: isLoadingUser, error: userError } = useUser(
    dialogMode === 'edit' ? selectedUserId : null
  );

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
    // Reset form to loading state initially
    const defaultRole = roles.length > 0 ? roles[0].name : 'customer';
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      role: defaultRole,
    });
    setSelectedUser(user);
    setSelectedUserId(user.id); // This will trigger the useUser hook to fetch detailed data
    setDialogMode('edit');
  };

  // Effect to populate form when editing user data is loaded
  useEffect(() => {
    if (dialogMode === 'edit' && editingUser && !isLoadingUser) {
      // Populate form with fresh data from API
      const userWithRoles = editingUser as UserWithRoles;
      const defaultRole = roles.length > 0 ? roles[0].name : 'customer';
      const primaryRole = userWithRoles.roles && userWithRoles.roles.length > 0
        ? userWithRoles.roles[0]
        : defaultRole;

      setFormData({
        email: userWithRoles.email,
        firstName: userWithRoles.name.first,
        lastName: userWithRoles.name.last,
        role: primaryRole,
      });
    }
  }, [dialogMode, editingUser, isLoadingUser, roles]);

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDialogMode('delete');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedUser(null);
    setSelectedUserId(null); // Reset user ID to stop fetching
    const defaultRole = roles.length > 0 ? roles[0].name : 'customer';
    setFormData({ email: '', firstName: '', lastName: '', role: defaultRole });
  };

  // Helper function to get role badge
  const getRoleBadge = (userRoles: string[]) => {
    if (!userRoles || userRoles.length === 0) {
      return <Badge variant="secondary">No Role</Badge>;
    }

    const primaryRole = userRoles[0]; // Display primary role
    const roleConfig = getRoleConfig(primaryRole);
    const Icon = roleConfig.icon;

    return (
      <div className="flex items-center gap-1">
        <Badge variant={roleConfig.variant}>
          <Icon className="mr-1 h-3 w-3" />
          {primaryRole}
        </Badge>
        {userRoles.length > 1 && (
          <Badge variant="outline" className="text-xs">
            +{userRoles.length - 1}
          </Badge>
        )}
      </div>
    );
  };

  const handleCreate = async () => {
    if (!formData.email || !formData.firstName) {
      toast.error('Email and first name are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser({
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        roles: [formData.role], // Include the selected role
      });

      // Optimistic update
      await mutate();
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

    setIsSubmitting(true);
    try {
      await updateUser(selectedUser.id, {
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        roles: [formData.role], // Include the selected role
      });

      await mutate();
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

    setIsSubmitting(true);
    try {
      await deleteUser(selectedUser.id);

      await mutate();
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

  // Simple RBAC: Global authorization model - no tenant isolation required

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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage users and assign global roles
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog} disabled={isLoadingRoles}>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No users found. Create your first user to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Global Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      {getRoleBadge((user as UserWithRoles).roles || [])}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                ? 'Add a new user and assign a global role'
                : 'Update user information and role assignment'}
            </DialogDescription>
          </DialogHeader>

          {/* Show loading state for edit mode when fetching user data */}
          {dialogMode === 'edit' && isLoadingUser ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading user details...</span>
            </div>
          ) : dialogMode === 'edit' && userError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load user details. Please try again.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={dialogMode === 'edit' && isLoadingUser}
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
                    disabled={dialogMode === 'edit' && isLoadingUser}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    disabled={dialogMode === 'edit' && isLoadingUser}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Global Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  disabled={(dialogMode === 'edit' && isLoadingUser) || isLoadingRoles}
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
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isSubmitting || (dialogMode === 'edit' && isLoadingUser)}
            >
              Cancel
            </Button>
            <Button
              onClick={dialogMode === 'create' ? handleCreate : handleUpdate}
              disabled={isSubmitting || (dialogMode === 'edit' && isLoadingUser) || (dialogMode === 'edit' && !!userError)}
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
    </div>
  );
}
