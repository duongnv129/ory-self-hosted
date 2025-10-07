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
  Eye,
  Plus,
  Edit,
  Trash2,
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
 * Base permissions configuration for mock data
 * In production, this would be replaced by Keto queries
 */
const BASE_ROLE_PERMISSIONS: Record<string, Partial<Record<string, string[]>>> = {
  admin: {
    users: ['view', 'create', 'update', 'delete'],
    products: ['view', 'create', 'update', 'delete'],
    categories: ['view', 'create', 'update', 'delete'],
    roles: ['view', 'create', 'update', 'delete'],
  },
  moderator: {
    users: ['view'],
    products: ['view', 'create', 'update'],
    categories: ['view', 'create', 'update'],
    roles: ['view'],
  },
  customer: {
    users: ['view'],
    products: ['view'],
    categories: ['view'],
    roles: [],
  },
};

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
   * @returns Array of inherited permissions
   */
  const getInheritedPermissions = (roleName: string, visited = new Set<string>()): Permission[] => {
    if (visited.has(roleName)) {
      console.warn(`Circular inheritance detected for role: ${roleName}`);
      return []; // Prevent circular inheritance
    }
    visited.add(roleName);

    const inheritedPerms: Permission[] = [];
    const parentRole = allRoles.find((r) => r.name === roleName);

    if (parentRole?.inheritsFrom) {
      for (const parentName of parentRole.inheritsFrom) {
        const parentPerms = BASE_ROLE_PERMISSIONS[parentName] || {};

        for (const resource of resources) {
          const resourceActions = parentPerms[resource] || [];
          for (const action of resourceActions) {
            inheritedPerms.push({
              resource,
              action,
              granted: true,
              inherited: true,
              inheritedFrom: parentName,
            });
          }
        }

        // Recursively get permissions from parent's parents
        inheritedPerms.push(...getInheritedPermissions(parentName, visited));
      }
    }

    return inheritedPerms;
  };

  // Get direct permissions for this role
  const directPerms = BASE_ROLE_PERMISSIONS[role.name] || {};
  const inheritedPerms = getInheritedPermissions(role.name);

  // Build complete permission matrix
  for (const resource of resources) {
    for (const action of actions) {
      // Check if permission is directly granted
      const directlyGranted = (directPerms[resource] || []).includes(action);

      // Check if permission is inherited
      const inheritedPerm = inheritedPerms.find(
        (p) => p.resource === resource && p.action === action
      );

      // Check if permission is explicitly set in role.permissions
      const explicitPerm = role.permissions?.find(
        (p) => p.resource === resource && p.action === action
      );

      permissions.push({
        resource,
        action,
        granted: explicitPerm ? true : directlyGranted || Boolean(inheritedPerm),
        inherited: !directlyGranted && !explicitPerm && Boolean(inheritedPerm),
        inheritedFrom: inheritedPerm?.inheritedFrom,
      });
    }
  }

  return permissions;
};

/**
 * Get icon for action type
 * @param action - The action to get icon for
 * @returns Lucide icon component
 */
const getActionIcon = (action: Action) => {
  switch (action) {
    case 'view':
      return Eye;
    case 'create':
      return Plus;
    case 'update':
      return Edit;
    case 'delete':
      return Trash2;
    default:
      return Shield;
  }
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
  const allResources = useMemo(() => metadataResources.map((r) => r.resource), [metadataResources]);

  const allActions = useMemo(
    () => Array.from(new Set(metadataResources.flatMap((r) => r.permissions))),
    [metadataResources]
  );

  // Calculate permissions for all roles (combining inheritance + role.permissions data)
  useEffect(() => {
    // Wait for metadata to load
    if (metadataLoading || allResources.length === 0 || allActions.length === 0) {
      return;
    }

    try {
      const permissionsMap = new Map<string, Permission[]>();

      roles.forEach((role) => {
        try {
          const permissions = getRolePermissions(role, roles, allResources, allActions);
          permissionsMap.set(role.name, permissions);
        } catch (error) {
          console.error(`Failed to calculate permissions for role ${role.name}:`, error);
          // Set empty permissions array as fallback
          permissionsMap.set(role.name, []);
        }
      });

      setRolePermissions(permissionsMap);
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

  return (
    <div className={cn('space-y-6', className)}>
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
                    <TableHead key={resource} className="min-w-[120px] text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold capitalize">{resource}</span>
                        <div className="mt-1 flex gap-1">
                          {allActions.map((action) => {
                            const Icon = getActionIcon(action);
                            return <Icon key={action} className="h-3 w-3 text-muted-foreground" />;
                          })}
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

                  return (
                    <TableRow key={role.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{role.name}</span>
                        </div>
                      </TableCell>
                      {allResources.map((resource) => (
                        <TableCell key={resource} className="text-center">
                          <div className="mx-auto grid max-w-[120px] grid-cols-2 gap-2">
                            {allActions.map((action) => {
                              const permission = permissions.find(
                                (p) => p.resource === resource && p.action === action
                              );
                              const isGranted = permission?.granted || false;
                              const isInherited = permission?.inherited || false;

                              if (editable) {
                                return (
                                  <div
                                    key={action}
                                    className="flex cursor-pointer items-center justify-center rounded p-1 hover:bg-muted"
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
                                    {isGranted ? (
                                      <Check
                                        className={cn(
                                          'h-4 w-4 text-green-600',
                                          isInherited && 'opacity-60'
                                        )}
                                      />
                                    ) : (
                                      <X className="h-4 w-4 text-red-600" />
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={action}
                                  className="flex items-center justify-center"
                                  title={`${action} ${resource}${isInherited && permission?.inheritedFrom ? ` (inherited from ${permission.inheritedFrom})` : ''}`}
                                >
                                  {isGranted ? (
                                    <Check
                                      className={cn(
                                        'h-4 w-4 text-green-600',
                                        isInherited && 'opacity-60'
                                      )}
                                    />
                                  ) : (
                                    <X className="h-4 w-4 text-red-600" />
                                  )}
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
