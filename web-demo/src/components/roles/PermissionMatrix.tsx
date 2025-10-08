/**
 * Permission Matrix Component
 * Interactive matrix for visualizing and editing role permissions
 * Shows roles vs resources/actions with metadata-driven configuration
 *
 * @remarks
 * This component supports both read-only and editable modes.
 * In editable mode, users can click on permission cells to toggle access.
 * Supports inheritance visualization and dynamic permission loading from backend.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
} from '@/components/ui';
import {
  Check,
  X,
  Info,
  Shield,
  ShieldCheck,
  User as UserIcon,
  Loader2,
} from 'lucide-react';
import { Role } from '@/lib/types/models';
import { useMetadata } from '@/lib/context/MetadataContext';
import { cn } from '@/lib/utils';

// Resources and actions are now dynamically loaded from metadata
type Resource = string;
type Action = string;

/**
 * Represents a permission with inheritance information
 */
interface Permission {
  readonly resource: Resource;
  readonly action: Action;
  granted: boolean;
  inherited?: boolean;
  inheritedFrom?: string;
}

/**
 * Props for the PermissionMatrix component
 */
interface PermissionMatrixProps {
  /** Array of roles to display in the matrix */
  roles: Role[];
  /** Single role to focus on (shows only this role if provided) */
  selectedRole?: Role | null;
  /** Whether permissions can be edited by clicking */
  editable?: boolean;
  /** Whether to show inheritance indicators */
  showInheritance?: boolean;
  /** Callback when a permission is toggled */
  onPermissionChange?: (
    roleName: string,
    resource: Resource,
    action: Action,
    granted: boolean
  ) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Calculate permissions for a role, including inheritance
 *
 * @param role - The role to calculate permissions for
 * @param allRoles - All available roles for inheritance calculation
 * @param resources - Available resources from metadata
 * @param actions - Available actions from metadata
 * @returns Array of permissions with inheritance information
 */
const getRolePermissions = (
  role: Role,
  allRoles: Role[],
  resources: string[],
  actions: string[]
): Permission[] => {
  const permissions: Permission[] = [];

  /**
   * Recursively get inherited permissions from parent roles
   *
   * @param roleName - Name of the role to get permissions for
   * @param visited - Set of visited roles to prevent circular inheritance
   * @returns Array of inherited permissions with inheritance chain information
   */
  const getInheritedPermissions = (roleName: string, visited = new Set<string>()): Permission[] => {
    // Prevent circular inheritance by tracking visited roles
    if (visited.has(roleName)) {
      console.warn(`Circular inheritance detected for role: ${roleName}`);
      return [];
    }
    visited.add(roleName);

    const inheritedPerms: Permission[] = [];
    const parentRole = allRoles.find((r) => r.name === roleName);

    // Process inheritance from parent roles
    if (parentRole?.inheritsFrom?.length) {
      for (const parentName of parentRole.inheritsFrom) {
        const parentRoleData = allRoles.find((r) => r.name === parentName);

        if (parentRoleData?.permissions?.length) {
          // Add direct permissions from parent role
          for (const parentPerm of parentRoleData.permissions) {
            // Avoid duplicate permissions by checking if already inherited
            const existingPerm = inheritedPerms.find(
              (p) => p.resource === parentPerm.resource && p.action === parentPerm.action
            );

            if (!existingPerm) {
              inheritedPerms.push({
                resource: parentPerm.resource,
                action: parentPerm.action,
                granted: true,
                inherited: true,
                inheritedFrom: parentName,
              });
            }
          }
        }

        // Recursively get permissions from parent's parents
        const grandparentPerms = getInheritedPermissions(parentName, new Set(visited));
        for (const grandparentPerm of grandparentPerms) {
          // Avoid duplicate permissions and preserve original inheritance chain
          const existingPerm = inheritedPerms.find(
            (p) => p.resource === grandparentPerm.resource && p.action === grandparentPerm.action
          );

          if (!existingPerm) {
            inheritedPerms.push({
              ...grandparentPerm,
              // Keep the original inheritedFrom to show the source
              inheritedFrom: grandparentPerm.inheritedFrom || parentName,
            });
          }
        }
      }
    }

    return inheritedPerms;
  };

  // Get direct permissions for this role (array of Permission objects)
  const directPerms = role.permissions || [];
  const inheritedPerms = getInheritedPermissions(role.name);

  // Build complete permission matrix for all resource/action combinations
  for (const resource of resources) {
    for (const action of actions) {
      // Check if permission is directly granted in role.permissions
      const directPerm = directPerms.find(
        (p) => p.resource === resource && p.action === action
      );

      // Check if permission is inherited from parent roles
      const inheritedPerm = inheritedPerms.find(
        (p) => p.resource === resource && p.action === action
      );

      // Determine if permission is granted and its source
      const isDirectlyGranted = Boolean(directPerm);
      const isInheritedGranted = Boolean(inheritedPerm);
      const isGranted = isDirectlyGranted || isInheritedGranted;

      permissions.push({
        resource,
        action,
        granted: isGranted,
        inherited: !isDirectlyGranted && isInheritedGranted,
        inheritedFrom: inheritedPerm?.inheritedFrom,
      });
    }
  }

  return permissions;
};

/**
 * Get icon for role type
 * @param roleName - The role name to get icon for
 * @returns Lucide icon component
 */
const getRoleIcon = (roleName: string) => {
  switch (roleName) {
    case 'admin':
      return ShieldCheck;
    case 'moderator':
      return Shield;
    case 'customer':
      return UserIcon;
    default:
      return Shield;
  }
};

export function PermissionMatrix({
  roles,
  selectedRole,
  editable = false,
  showInheritance = true,
  onPermissionChange,
  className,
}: PermissionMatrixProps) {
  const [rolePermissions, setRolePermissions] = useState<Map<string, Permission[]>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Get dynamic metadata for resources and permissions
  const {
    resources: metadataResources,
    isLoading: metadataLoading,
    error: metadataError,
  } = useMetadata();

  // Extract all unique resources and actions from metadata - memoized to prevent infinite loops
  const allResources = useMemo(() => {
    const resources = metadataResources.map((r) => r.resource);

    // Fallback to common resources if metadata is empty
    if (resources.length === 0) {
      console.warn('No resources found in metadata, using fallback resources');
      return ['users', 'products', 'categories', 'roles'];
    }

    return resources;
  }, [metadataResources]);

  const allActions = useMemo(() => {
    const actions = Array.from(new Set(metadataResources.flatMap((r) => r.permissions)));

    // Fallback to common actions if metadata is empty
    if (actions.length === 0) {
      console.warn('No actions found in metadata, using fallback actions');
      return ['view', 'create', 'update', 'delete'];
    }

    return actions;
  }, [metadataResources]);

  // Validate props to provide better error messages
  useEffect(() => {
    if (!roles || roles.length === 0) {
      console.warn('PermissionMatrix: No roles provided');
      return;
    }

    if (selectedRole && !roles.find(r => r.name === selectedRole.name)) {
      console.warn('PermissionMatrix: Selected role not found in roles array', {
        selectedRole: selectedRole.name,
        availableRoles: roles.map(r => r.name)
      });
    }

    if (editable && !onPermissionChange) {
      console.warn('PermissionMatrix: Editable mode enabled but no onPermissionChange handler provided');
    }
  }, [roles, selectedRole, editable, onPermissionChange]);

  // Calculate permissions for all roles (combining inheritance + role.permissions data)
  useEffect(() => {
    // Don't calculate if metadata is still loading
    if (metadataLoading) {
      return;
    }

    // Always calculate even if resources/actions are empty (fallbacks will be used)
    try {
      const permissionsMap = new Map<string, Permission[]>();

      roles.forEach((role) => {
        try {
          console.log(`Calculating permissions for role: ${role.name}`, {
            resources: allResources,
            actions: allActions,
            rolePermissions: role.permissions?.length || 0,
            inheritsFrom: role.inheritsFrom?.length || 0
          });

          const permissions = getRolePermissions(role, roles, allResources, allActions);
          permissionsMap.set(role.name, permissions);

          console.log(`Calculated ${permissions.length} permissions for role: ${role.name}`);
        } catch (error) {
          console.error(`Failed to calculate permissions for role ${role.name}:`, error);
          // Set empty permissions array as fallback
          permissionsMap.set(role.name, []);
        }
      });

      setRolePermissions(permissionsMap);
      console.log('Permission calculation completed', {
        rolesProcessed: permissionsMap.size,
        totalPermissions: Array.from(permissionsMap.values()).reduce((sum, perms) => sum + perms.length, 0)
      });
    } catch (error) {
      console.error('Failed to calculate role permissions:', error);
      setRolePermissions(new Map());
    }
  }, [roles, metadataLoading, allResources, allActions]);

  /**
   * Handle permission toggle in editable mode
   * @param roleName - Name of the role
   * @param resource - Resource being toggled
   * @param action - Action being toggled
   * @param granted - New granted state
   */
  const handlePermissionToggle = (
    roleName: string,
    resource: Resource,
    action: Action,
    granted: boolean
  ) => {
    if (!editable || !onPermissionChange) {
      console.warn('Permission toggle attempted in non-editable mode or without change handler');
      return;
    }

    try {
      onPermissionChange(roleName, resource, action, granted);
      setHasUnsavedChanges(true);

      // Update local state
      setRolePermissions((prev) => {
        const newMap = new Map(prev);
        const permissions = newMap.get(roleName) || [];
        const updatedPermissions = permissions.map((p) =>
          p.resource === resource && p.action === action
            ? { ...p, granted, inherited: false, inheritedFrom: undefined }
            : p
        );
        newMap.set(roleName, updatedPermissions);
        return newMap;
      });
    } catch (error) {
      console.error('Failed to toggle permission:', error);
    }
  };

  const displayRoles = selectedRole ? [selectedRole] : roles;

  // Show loading state while metadata is being fetched
  if (metadataLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading system configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state if metadata failed to load
  if (metadataError) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load system configuration. Please refresh the page.
              <br />
              <span className="text-sm">{metadataError.message}</span>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no resources or actions available
  if (allResources.length === 0 || allActions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No system resources or permissions configured. Please contact your administrator.
              <br />
              <span className="text-sm text-muted-foreground">
                Resources: {allResources.length}, Actions: {allActions.length}
              </span>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no roles provided
  if (displayRoles.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No roles available to display in the permission matrix.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Debug Panel (only show in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="text-xs space-y-1">
              <div><strong>Debug Info:</strong></div>
              <div>Resources: {allResources.join(', ')} ({allResources.length})</div>
              <div>Actions: {allActions.join(', ')} ({allActions.length})</div>
              <div>Roles: {displayRoles.map(r => r.name).join(', ')} ({displayRoles.length})</div>
              <div>Metadata Loading: {metadataLoading ? 'Yes' : 'No'}</div>
              <div>Permissions Calculated: {Array.from(rolePermissions.keys()).join(', ')}</div>
              {displayRoles.map(role => {
                const permissions = rolePermissions.get(role.name) || [];
                const grantedCount = permissions.filter(p => p.granted).length;
                return (
                  <div key={role.name}>
                    <strong>{role.name}</strong>: {grantedCount}/{permissions.length} granted
                    {role.permissions && role.permissions.length > 0 && (
                      <span> | Direct: {role.permissions.map(p => `${p.resource}:${p.action}`).join(', ')}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Matrix
            {selectedRole && <Badge variant="outline">{selectedRole.name}</Badge>}
          </CardTitle>
          <CardDescription>
            {editable
              ? 'Click on permissions to grant or revoke access'
              : 'Overview of permissions by role and resource'}
            {showInheritance && ' • Inherited permissions are shown with transparency'}
            {hasUnsavedChanges && editable && (
              <>
                {' • '}
                <span className="font-medium text-amber-600">Unsaved changes</span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Role</TableHead>
                  {allResources.map((resource) => (
                    <TableHead key={resource} className="min-w-[200px] text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold capitalize text-base">{resource}</span>
                        <div className="mt-2 grid grid-cols-4 gap-1 w-full">
                          {allActions.map((action) => (
                            <div key={action} className="flex items-center justify-center">
                              <span className="text-xs font-medium text-muted-foreground capitalize px-1 py-0.5 bg-muted rounded">
                                {action}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRoles.map((role) => {
                  const Icon = getRoleIcon(role.name);
                  const permissions = rolePermissions.get(role.name) || [];

                  console.log(`Rendering role: ${role.name}`, {
                    permissionsCount: permissions.length,
                    samplePermissions: permissions.slice(0, 3),
                    allResources,
                    allActions
                  });

                  return (
                    <TableRow key={role.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{role.name}</span>
                          <span className="text-xs text-muted-foreground">({permissions.length})</span>
                        </div>
                      </TableCell>
                      {allResources.map((resource) => (
                        <TableCell key={resource} className="text-center">
                          <div className="mx-auto grid max-w-[200px] grid-cols-4 gap-1">
                            {allActions.map((action) => {
                              const permission = permissions.find(
                                (p) => p.resource === resource && p.action === action
                              );
                              const isGranted = permission?.granted || false;
                              const isInherited = permission?.inherited || false;

                              // Debug log for each permission cell
                              console.log(`Permission cell: ${role.name} - ${resource}:${action}`, {
                                permission,
                                isGranted,
                                isInherited,
                                allPermissions: permissions.filter(p => p.resource === resource)
                              });

                              if (editable) {
                                return (
                                  <div
                                    key={action}
                                    className={cn(
                                      "flex cursor-pointer items-center justify-center rounded p-1 hover:bg-muted min-h-[32px] min-w-[40px] transition-colors",
                                      isGranted
                                        ? "bg-green-50 border border-green-200 hover:bg-green-100"
                                        : "bg-red-50 border border-red-200 hover:bg-red-100"
                                    )}
                                    onClick={() =>
                                      handlePermissionToggle(
                                        role.name,
                                        resource,
                                        action,
                                        !isGranted
                                      )
                                    }
                                    title={`${action} ${resource}${isInherited && permission?.inheritedFrom ? ` (inherited from ${permission.inheritedFrom})` : ''}`}
                                  >
                                    <div className="flex flex-col items-center">
                                      {isGranted ? (
                                        <Check
                                          className={cn(
                                            'h-3 w-3 text-green-600',
                                            isInherited && 'opacity-60'
                                          )}
                                        />
                                      ) : (
                                        <X className="h-3 w-3 text-red-500" />
                                      )}
                                      <span className={cn(
                                        "text-xs font-medium mt-0.5",
                                        isGranted ? "text-green-700" : "text-red-700"
                                      )}>
                                        {isGranted ? "✓" : "✗"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={action}
                                  className={cn(
                                    "flex items-center justify-center min-h-[32px] min-w-[40px] rounded border",
                                    isGranted
                                      ? "bg-green-50 border-green-200"
                                      : "bg-red-50 border-red-200"
                                  )}
                                  title={`${action} ${resource}${isInherited && permission?.inheritedFrom ? ` (inherited from ${permission.inheritedFrom})` : ''}`}
                                >
                                  <div className="flex flex-col items-center">
                                    {isGranted ? (
                                      <Check
                                        className={cn(
                                          'h-3 w-3 text-green-600',
                                          isInherited && 'opacity-60'
                                        )}
                                      />
                                    ) : (
                                      <X className="h-3 w-3 text-red-500" />
                                    )}
                                    <span className={cn(
                                      "text-xs font-medium mt-0.5",
                                      isGranted ? "text-green-700" : "text-red-700"
                                    )}>
                                      {isGranted ? "✓" : "✗"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Unsaved Changes Alert */}
      {hasUnsavedChanges && editable && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You have unsaved permission changes.</span>
            <div className="flex gap-2">
              <button
                className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  // In real app, this would save changes to Keto
                  setHasUnsavedChanges(false);
                }}
              >
                Save Changes
              </button>
              <button
                className="rounded border px-3 py-1 text-xs hover:bg-muted"
                onClick={() => {
                  // Reset to original state
                  setHasUnsavedChanges(false);
                  // Recalculate permissions from original data
                  const permissionsMap = new Map<string, Permission[]>();
                  roles.forEach((role) => {
                    const permissions = getRolePermissions(role, roles, allResources, allActions);
                    permissionsMap.set(role.name, permissions);
                  });
                  setRolePermissions(permissionsMap);
                }}
              >
                Discard
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Permission Summary */}
      {selectedRole && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Permission Summary for {selectedRole.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allResources.map((resource) => {
                const resourcePermissions = (rolePermissions.get(selectedRole.name) || []).filter(
                  (p) => p.resource === resource && p.granted
                );

                if (resourcePermissions.length === 0) {
                  return (
                    <div key={resource} className="flex items-center justify-between border-b py-2">
                      <span className="font-medium capitalize">{resource}</span>
                      <Badge variant="outline">No permissions</Badge>
                    </div>
                  );
                }

                return (
                  <div key={resource} className="flex items-center justify-between border-b py-2">
                    <span className="font-medium capitalize">{resource}</span>
                    <div className="flex gap-1">
                      {resourcePermissions.map((permission) => (
                        <Badge
                          key={permission.action}
                          variant={permission.inherited ? 'secondary' : 'default'}
                          className={cn(permission.inherited && 'opacity-70')}
                        >
                          {permission.action}
                          {permission.inherited && permission.inheritedFrom && (
                            <span className="ml-1 text-xs">(from {permission.inheritedFrom})</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      {showInheritance && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm">Direct permission</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 opacity-60" />
              <span className="text-sm">Inherited permission</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-red-600" />
              <span className="text-sm">No permission</span>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
