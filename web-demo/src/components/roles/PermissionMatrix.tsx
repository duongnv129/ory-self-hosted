/**
 * Permission Matrix Component
 * Interactive matrix for visualizing and editing role permissions
 * Shows roles vs resources/actions with live Keto data integration
 *
 * @remarks
 * This component supports both read-only and editable modes.
 * In editable mode, users can click on permission cells to toggle access.
 * Supports inheritance visualization and live Keto data integration.
 */

'use client';

import { useState, useEffect } from 'react';
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
import { useKetoRolePermissions } from '@/lib/hooks/useKetoPermissions';
import { cn } from '@/lib/utils';

// Define resources and actions as const assertions for better type safety
const RESOURCES = ['users', 'products', 'categories', 'roles'] as const;
const ACTIONS = ['view', 'create', 'update', 'delete'] as const;

type Resource = typeof RESOURCES[number];
type Action = typeof ACTIONS[number];

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
  onPermissionChange?: (roleName: string, resource: Resource, action: Action, granted: boolean) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Base permissions configuration for mock data
 * In production, this would be replaced by Keto queries
 */
const BASE_ROLE_PERMISSIONS: Record<string, Partial<Record<Resource, readonly Action[]>>> = {
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
} as const;

/**
 * Calculate permissions for a role, including inheritance
 *
 * @param role - The role to calculate permissions for
 * @param allRoles - All available roles for inheritance calculation
 * @returns Array of permissions with inheritance information
 */
const getRolePermissions = (role: Role, allRoles: Role[]): Permission[] => {
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
    const parentRole = allRoles.find(r => r.name === roleName);

    if (parentRole?.inheritsFrom) {
      for (const parentName of parentRole.inheritsFrom) {
        const parentPerms = BASE_ROLE_PERMISSIONS[parentName] || {};

        for (const resource of RESOURCES) {
          const actions = parentPerms[resource] || [];
          for (const action of actions) {
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
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      // Check if permission is directly granted
      const directlyGranted = (directPerms[resource] || []).includes(action);

      // Check if permission is inherited
      const inheritedPerm = inheritedPerms.find(
        p => p.resource === resource && p.action === action
      );

      // Check if permission is explicitly set in role.permissions
      const explicitPerm = role.permissions?.find(
        p => p.resource === resource && p.action === action
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

  // Fetch live Keto permissions for all roles
  const {
    rolePermissions: ketoPermissions,
    isLoading: ketoLoading,
    isError: ketoError
  } = useKetoRolePermissions(
    roles.map(r => r.name),
    { namespace: 'simple-rbac', enabled: roles.length > 0 }
  );

  // Calculate permissions for all roles (combining inheritance + live Keto data)
  useEffect(() => {
    try {
      const permissionsMap = new Map<string, Permission[]>();

      roles.forEach(role => {
        try {
          const mockPermissions = getRolePermissions(role, roles);
          const livePermissions = ketoPermissions[role.name] || [];

          // Merge mock permissions with live Keto data
          const mergedPermissions = mockPermissions.map(mockPerm => {
            const livePerm = livePermissions.find(
              kp => kp.resource === mockPerm.resource && kp.action === mockPerm.action
            );

            // If we have live data, use it; otherwise fall back to mock data
            return {
              ...mockPerm,
              granted: livePerm ? true : mockPerm.granted,
            };
          });

          permissionsMap.set(role.name, mergedPermissions);
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
  }, [roles, ketoPermissions]);

  /**
   * Handle permission toggle in editable mode
   * @param roleName - Name of the role
   * @param resource - Resource being toggled
   * @param action - Action being toggled
   * @param granted - New granted state
   */
  const handlePermissionToggle = (roleName: string, resource: Resource, action: Action, granted: boolean) => {
    if (!editable || !onPermissionChange) {
      console.warn('Permission toggle attempted in non-editable mode or without change handler');
      return;
    }

    try {
      onPermissionChange(roleName, resource, action, granted);
      setHasUnsavedChanges(true);

      // Update local state
      setRolePermissions(prev => {
        const newMap = new Map(prev);
        const permissions = newMap.get(roleName) || [];
        const updatedPermissions = permissions.map(p =>
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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Matrix
            {selectedRole && (
              <Badge variant="outline">{selectedRole.name}</Badge>
            )}
            {ketoLoading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </CardTitle>
          <CardDescription>
            {editable
              ? 'Click on permissions to grant or revoke access'
              : 'Overview of permissions by role and resource'
            }
            {showInheritance && ' • Inherited permissions are shown with transparency'}
            {ketoLoading && ' • Loading live Keto data...'}
            {ketoError && ' • Failed to load live data, showing cached permissions'}
            {hasUnsavedChanges && editable && (
              <>
                {' • '}
                <span className="text-amber-600 font-medium">Unsaved changes</span>
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
                  {RESOURCES.map(resource => (
                    <TableHead key={resource} className="text-center min-w-[120px]">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold capitalize">{resource}</span>
                        <div className="flex gap-1 mt-1">
                          {ACTIONS.map(action => {
                            const Icon = getActionIcon(action);
                            return (
                              <Icon
                                key={action}
                                className="h-3 w-3 text-muted-foreground"
                              />
                            );
                          })}
                        </div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRoles.map(role => {
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
                      {RESOURCES.map(resource => (
                        <TableCell key={resource} className="text-center">
                          <div className="grid grid-cols-2 gap-2 max-w-[120px] mx-auto">
                            {ACTIONS.map(action => {
                              const permission = permissions.find(
                                p => p.resource === resource && p.action === action
                              );
                              const isGranted = permission?.granted || false;
                              const isInherited = permission?.inherited || false;

                              if (editable) {
                                return (
                                  <div
                                    key={action}
                                    className="flex items-center justify-center cursor-pointer hover:bg-muted rounded p-1"
                                    onClick={() => handlePermissionToggle(role.name, resource, action, !isGranted)}
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

      {/* Keto Error Alert */}
      {ketoError && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Failed to load live permission data from Keto. Displaying cached/mock permissions instead.
          </AlertDescription>
        </Alert>
      )}

      {/* Unsaved Changes Alert */}
      {hasUnsavedChanges && editable && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You have unsaved permission changes.</span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                onClick={() => {
                  // In real app, this would save changes to Keto
                  setHasUnsavedChanges(false);
                }}
              >
                Save Changes
              </button>
              <button
                className="px-3 py-1 text-xs border rounded hover:bg-muted"
                onClick={() => {
                  // Reset to original state
                  setHasUnsavedChanges(false);
                  // Recalculate permissions from original data
                  const permissionsMap = new Map<string, Permission[]>();
                  roles.forEach(role => {
                    const permissions = getRolePermissions(role, roles);
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
              {RESOURCES.map(resource => {
                const resourcePermissions = (rolePermissions.get(selectedRole.name) || [])
                  .filter(p => p.resource === resource && p.granted);

                if (resourcePermissions.length === 0) {
                  return (
                    <div key={resource} className="flex items-center justify-between py-2 border-b">
                      <span className="font-medium capitalize">{resource}</span>
                      <Badge variant="outline">No permissions</Badge>
                    </div>
                  );
                }

                return (
                  <div key={resource} className="flex items-center justify-between py-2 border-b">
                    <span className="font-medium capitalize">{resource}</span>
                    <div className="flex gap-1">
                      {resourcePermissions.map(permission => (
                        <Badge
                          key={permission.action}
                          variant={permission.inherited ? "secondary" : "default"}
                          className={cn(permission.inherited && "opacity-70")}
                        >
                          {permission.action}
                          {permission.inherited && permission.inheritedFrom && (
                            <span className="ml-1 text-xs">
                              (from {permission.inheritedFrom})
                            </span>
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
