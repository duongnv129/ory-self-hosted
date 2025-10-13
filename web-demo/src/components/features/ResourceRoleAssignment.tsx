/**
 * Resource Role Assignment Component
 * Interface for assigning and managing roles for specific resources
 * Supports resource-scoped RBAC with fine-grained role assignments
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  Label,
  Checkbox,
} from '@/components/ui';
import {
  UserPlus,
  User as UserIcon,
  Shield,
  Check,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { usersApi } from '@/lib/api';
import { useResourceUsers, useResourceRoles } from '@/lib/hooks';

/**
 * Resource type for role assignment
 */
export type ResourceType = 'user' | 'product' | 'category';

/**
 * Resource item for role assignment
 */
export interface AssignableResource {
  id: string | number;
  name: string;
  type: ResourceType;
  currentRoles: string[];
}

/**
 * Role assignment data
 */
export interface RoleAssignment {
  userEmail: string;
  userName: string;
  resourceId: string | number;
  resourceName: string;
  resourceType: ResourceType;
  roleName: string;
  assignedAt?: string;
}

/**
 * Props for ResourceRoleAssignment component
 */
interface ResourceRoleAssignmentProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Close dialog handler */
  onClose: () => void;
  /** Resource to manage roles for */
  resource?: AssignableResource;
  /** Callback when roles are successfully assigned */
  onRoleAssigned?: (assignment: RoleAssignment) => void;
  /** Callback when roles are successfully removed */
  onRoleRemoved?: (assignment: RoleAssignment) => void;
}

/**
 * ResourceRoleAssignment component for managing role assignments per resource
 */
export function ResourceRoleAssignment({
  open,
  onClose,
  resource,
  onRoleAssigned,
  onRoleRemoved,
}: ResourceRoleAssignmentProps) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Fetch available users and roles
  const { users, isLoading: usersLoading, error: usersError } = useResourceUsers();
  const { roles, isLoading: rolesLoading, error: rolesError } = useResourceRoles();

  // Reset form when resource changes or dialog opens
  useEffect(() => {
    if (open && resource) {
      setSelectedUser('');
      setSelectedRoles([]);
      setError('');
      setSuccessMessage('');
    }
  }, [open, resource]);

  // Handle role toggle
  const handleRoleToggle = (roleName: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleName)
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    );
  };

  // Handle role assignment
  const handleAssignRoles = async () => {
    if (!selectedUser || selectedRoles.length === 0 || !resource) {
      setError('Please select a user and at least one role');
      return;
    }

    setIsAssigning(true);
    setError('');

    try {
      const user = users.find(u => u.email === selectedUser);
      if (!user) {
        throw new Error('Selected user not found');
      }

      // Assign each selected role
      const assignments: RoleAssignment[] = [];
      for (const roleName of selectedRoles) {
        try {
          await usersApi.assignRole({
            userEmail: selectedUser,
            roleName: roleName,
          });

          const assignment: RoleAssignment = {
            userEmail: selectedUser,
            userName: `${user.name.first} ${user.name.last}`,
            resourceId: resource.id,
            resourceName: resource.name,
            resourceType: resource.type,
            roleName: roleName,
            assignedAt: new Date().toISOString(),
          };

          assignments.push(assignment);
          onRoleAssigned?.(assignment);
        } catch (roleError) {
          console.error(`Failed to assign role ${roleName}:`, roleError);
          setError(`Failed to assign role: ${roleName}`);
        }
      }

      if (assignments.length > 0) {
        setSuccessMessage(
          `Successfully assigned ${assignments.length} role${assignments.length > 1 ? 's' : ''} to ${user.name.first} ${user.name.last}`
        );

        // Reset form
        setSelectedUser('');
        setSelectedRoles([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign roles';
      setError(errorMessage);
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle role removal
  const handleRemoveRole = async (userEmail: string, roleName: string) => {
    if (!resource) return;

    try {
      await usersApi.removeRole({
        userEmail,
        roleName,
      });

      const user = users.find(u => u.email === userEmail);
      const assignment: RoleAssignment = {
        userEmail,
        userName: user ? `${user.name.first} ${user.name.last}` : userEmail,
        resourceId: resource.id,
        resourceName: resource.name,
        resourceType: resource.type,
        roleName,
      };

      onRoleRemoved?.(assignment);
      setSuccessMessage(`Removed role ${roleName} from ${assignment.userName}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove role';
      setError(errorMessage);
    }
  };

  // Get users with roles for this resource
  const usersWithRoles = users.filter(user => user.roles && user.roles.length > 0);

  if (!resource) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Roles for {resource.name}
          </DialogTitle>
          <DialogDescription>
            Assign or remove roles for the {resource.type}: <strong>{resource.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success/Error Messages */}
          {successMessage && (
            <Alert className="border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {(error || usersError || rolesError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || usersError || rolesError}
              </AlertDescription>
            </Alert>
          )}

          {/* Assign New Roles Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Assign New Roles
              </CardTitle>
              <CardDescription>
                Select a user and roles to assign for this {resource.type}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Selection */}
              <div className="space-y-2">
                <Label htmlFor="user-select">Select User</Label>
                <Select
                  value={selectedUser}
                  onValueChange={setSelectedUser}
                  disabled={usersLoading || isAssigning}
                >
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.email} value={user.email}>
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
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
                <Label>Select Roles</Label>
                {rolesLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-muted-foreground">Loading roles...</span>
                  </div>
                ) : roles.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No roles available. Please create roles first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map((role) => (
                      <div key={role.name} className="flex items-center space-x-2">
                        <Checkbox
                          id={role.name}
                          checked={selectedRoles.includes(role.name)}
                          onCheckedChange={() => handleRoleToggle(role.name)}
                          disabled={isAssigning}
                        />
                        <Label
                          htmlFor={role.name}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {role.name}
                        </Label>
                        {role.description && (
                          <span className="text-xs text-muted-foreground">
                            - {role.description}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assign Button */}
              <Button
                onClick={handleAssignRoles}
                disabled={!selectedUser || selectedRoles.length === 0 || isAssigning}
                className="w-full"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning Roles...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign {selectedRoles.length} Role{selectedRoles.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Current Role Assignments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Current Role Assignments
              </CardTitle>
              <CardDescription>
                Users and their assigned roles for this {resource.type}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground">Loading assignments...</span>
                </div>
              ) : usersWithRoles.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Role Assignments</h3>
                  <p className="text-muted-foreground">
                    No users have been assigned roles for this {resource.type} yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {usersWithRoles.map((user) => (
                    <div
                      key={user.email}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <UserIcon className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {user.name.first} {user.name.last}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((roleName) => (
                            <div key={roleName} className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {roleName}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveRole(user.email, roleName)}
                                title={`Remove role ${roleName}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resource Current Roles Display */}
          {resource.currentRoles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resource Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Type:</span> {resource.type}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">ID:</span> {resource.id}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Current Roles:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {resource.currentRoles.map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
