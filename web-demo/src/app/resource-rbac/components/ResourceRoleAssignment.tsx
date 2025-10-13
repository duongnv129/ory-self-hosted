/**
 * Resource Role Assignment Dialog
 * Dialog component for assigning and managing roles per specific resource
 * with user selection and real-time updates.
 *
 * Follows Next.js Pro patterns:
 * - Client Component with proper state management
 * - TypeScript interfaces for props
 * - Error handling with user-friendly messages
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
} from '@/components/ui';
import { Shield, User, X, AlertCircle } from 'lucide-react';
import { useResourceRoles } from '@/lib/hooks/useResourceRoles';
import { useResourceUsers } from '@/lib/hooks/useResourceUsers';
import { toast } from 'sonner';

interface AssignableResource {
  id: string;
  name: string;
  type: 'user' | 'product' | 'category';
  currentRoles: string[];
}

interface ResourceRoleAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: AssignableResource | null;
  onRoleAssigned?: () => void;
}

export default function ResourceRoleAssignment({
  open,
  onOpenChange,
  resource,
  onRoleAssigned,
}: ResourceRoleAssignmentProps) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  const { roles, isLoading: rolesLoading } = useResourceRoles();
  const { users, isLoading: usersLoading } = useResourceUsers();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedUser('');
      setSelectedRole('');
    }
  }, [open]);

  const handleAssignRole = async () => {
    if (!resource || !selectedUser || !selectedRole) {
      toast.error('Please select both a user and a role');
      return;
    }

    setIsAssigning(true);
    try {
      // Mock role assignment - in real implementation, call API
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(`Role "${selectedRole}" assigned to user for ${resource.type} "${resource.name}"`);
      onRoleAssigned?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign role';
      toast.error(errorMessage);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveRole = async (roleToRemove: string) => {
    if (!resource) return;

    try {
      // Mock role removal - in real implementation, call API
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success(`Role "${roleToRemove}" removed from ${resource.type} "${resource.name}"`);
      onRoleAssigned?.();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove role';
      toast.error(errorMessage);
    }
  };

  if (!resource) return null;

  const isLoading = rolesLoading || usersLoading;
  const availableRoles = roles.filter(role => !resource.currentRoles.includes(role.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Resource Roles
          </DialogTitle>
          <DialogDescription>
            Assign roles to users for {resource.type} &ldquo;{resource.name}&rdquo;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Roles */}
          <div>
            <h4 className="text-sm font-medium mb-3">Current Roles</h4>
            {resource.currentRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {resource.currentRoles.map((role) => (
                  <Badge key={role} variant="secondary" className="flex items-center gap-1">
                    {role}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveRole(role)}
                    />
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No roles assigned</p>
            )}
          </div>

          {/* Assign New Role */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Assign New Role</h4>

            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading users and roles...</div>
            ) : (
              <>
                {/* User Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select User</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.email}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{user.name.first} {user.name.last}</span>
                            <span className="text-muted-foreground">({user.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Role</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.name} value={role.name}>
                          <div>
                            <div className="font-medium">{role.name}</div>
                            {role.description && (
                              <div className="text-sm text-muted-foreground">
                                {role.description}
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {availableRoles.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <div>All available roles have been assigned to this resource.</div>
                  </Alert>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignRole}
            disabled={!selectedUser || !selectedRole || isAssigning || isLoading}
          >
            {isAssigning ? 'Assigning...' : 'Assign Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
