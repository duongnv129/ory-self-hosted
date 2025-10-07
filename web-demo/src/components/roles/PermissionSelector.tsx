/**
 * Permission Selector Component
 * Interactive component for selecting specific resource permissions during role creation/editing
 *
 * @remarks
 * This component allows fine-grained permission selection for roles.
 * It supports inheritance display and provides quick actions for common permission sets.
 * All actions respect the disabled state and provide proper feedback.
 */

'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Label,
} from '@/components/ui';
import {
  Eye,
  Plus,
  Edit,
  Trash2,
  Shield,
  Check,
  X,
  Info,
} from 'lucide-react';
import { Permission } from '@/lib/types/models';
import { cn } from '@/lib/utils';

// Define available resources and actions as const assertions for type safety
const RESOURCES = ['users', 'products', 'categories', 'roles'] as const;
const ACTIONS = ['view', 'create', 'update', 'delete'] as const;

type Resource = typeof RESOURCES[number];
type Action = typeof ACTIONS[number];

/**
 * Props for the PermissionSelector component
 */
interface PermissionSelectorProps {
  /** Currently selected permissions */
  selectedPermissions: Permission[];
  /** Callback when permissions change */
  onPermissionChange: (permissions: Permission[]) => void;
  /** Permissions inherited from parent roles */
  inheritedPermissions?: Permission[];
  /** Additional CSS classes */
  className?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Get icon component for action type
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
 * Get color class for action type
 * @param action - The action to get color for
 * @returns Tailwind color class
 */
const getActionColor = (action: Action) => {
  switch (action) {
    case 'view':
      return 'text-blue-600';
    case 'create':
      return 'text-green-600';
    case 'update':
      return 'text-yellow-600';
    case 'delete':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

export function PermissionSelector({
  selectedPermissions,
  onPermissionChange,
  inheritedPermissions = [],
  className,
  disabled = false,
}: PermissionSelectorProps) {
  const [expandedResources, setExpandedResources] = useState<Set<Resource>>(new Set(RESOURCES));

  /**
   * Check if a specific permission is currently selected
   * @param resource - Resource to check
   * @param action - Action to check
   * @returns True if permission is selected
   */
  const isPermissionSelected = (resource: Resource, action: Action): boolean => {
    return selectedPermissions.some(p => p.resource === resource && p.action === action);
  };

  /**
   * Check if a specific permission is inherited from parent roles
   * @param resource - Resource to check
   * @param action - Action to check
   * @returns True if permission is inherited
   */
  const isPermissionInherited = (resource: Resource, action: Action): boolean => {
    return inheritedPermissions.some(p => p.resource === resource && p.action === action);
  };

  /**
   * Toggle a specific permission on or off
   * @param resource - Resource to toggle
   * @param action - Action to toggle
   */
  const togglePermission = (resource: Resource, action: Action) => {
    if (disabled) {
      console.warn('Permission toggle attempted while component is disabled');
      return;
    }

    try {
      const isSelected = isPermissionSelected(resource, action);

      if (isSelected) {
        // Remove permission
        const updated = selectedPermissions.filter(
          p => !(p.resource === resource && p.action === action)
        );
        onPermissionChange(updated);
      } else {
        // Add permission
        const newPermission: Permission = {
          resource,
          action,
        };
        onPermissionChange([...selectedPermissions, newPermission]);
      }
    } catch (error) {
      console.error('Failed to toggle permission:', error);
    }
  };

  /**
   * Toggle all actions for a specific resource (select all or deselect all)
   * @param resource - Resource to toggle all actions for
   */
  const toggleAllActionsForResource = (resource: Resource) => {
    if (disabled) {
      console.warn('Resource toggle attempted while component is disabled');
      return;
    }

    try {
      const resourcePermissions = ACTIONS.filter(action =>
        isPermissionSelected(resource, action)
      );

      if (resourcePermissions.length === ACTIONS.length) {
        // All actions are selected, remove all
        const updated = selectedPermissions.filter(p => p.resource !== resource);
        onPermissionChange(updated);
      } else {
        // Not all actions are selected, add all
        const updated = selectedPermissions.filter(p => p.resource !== resource);
        const newPermissions = ACTIONS.map(action => ({
          resource,
          action,
        }));
        onPermissionChange([...updated, ...newPermissions]);
      }
    } catch (error) {
      console.error('Failed to toggle resource permissions:', error);
    }
  };

  /**
   * Toggle expansion state of a resource section
   * @param resource - Resource to toggle expansion for
   */
  const toggleResourceExpansion = (resource: Resource) => {
    try {
      setExpandedResources(prev => {
        const newExpanded = new Set(prev);
        if (newExpanded.has(resource)) {
          newExpanded.delete(resource);
        } else {
          newExpanded.add(resource);
        }
        return newExpanded;
      });
    } catch (error) {
      console.error('Failed to toggle resource expansion:', error);
    }
  };

  // Get summary counts
  const selectedCount = selectedPermissions.length;
  const inheritedCount = inheritedPermissions.length;

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Select Permissions
              </CardTitle>
              <CardDescription>
                Choose specific permissions for this role
              </CardDescription>
            </div>
            <div className="flex gap-2 text-sm">
              <Badge variant="default">
                {selectedCount} selected
              </Badge>
              {inheritedCount > 0 && (
                <Badge variant="secondary">
                  {inheritedCount} inherited
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {RESOURCES.map(resource => {
              const isExpanded = expandedResources.has(resource);
              const selectedActionsForResource = ACTIONS.filter(action =>
                isPermissionSelected(resource, action)
              );
              const inheritedActionsForResource = ACTIONS.filter(action =>
                isPermissionInherited(resource, action)
              );
              const allSelected = selectedActionsForResource.length === ACTIONS.length;
              const someSelected = selectedActionsForResource.length > 0 && !allSelected;

              return (
                <div key={resource} className="border rounded-lg">
                  {/* Resource Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleResourceExpansion(resource)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={allSelected ? "default" : someSelected ? "outline" : "ghost"}
                          size="sm"
                          onClick={() => toggleAllActionsForResource(resource)}
                          disabled={disabled}
                          className="h-6 w-6 p-0"
                        >
                          {allSelected ? (
                            <Check className="h-4 w-4" />
                          ) : someSelected ? (
                            <X className="h-3 w-3" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                        </Button>
                        <Label className="font-medium capitalize cursor-pointer">
                          {resource}
                        </Label>
                      </div>
                      <div className="flex gap-1">
                        {selectedActionsForResource.length > 0 && (
                          <Badge variant="default" className="text-xs">
                            {selectedActionsForResource.length}/{ACTIONS.length}
                          </Badge>
                        )}
                        {inheritedActionsForResource.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            +{inheritedActionsForResource.length} inherited
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      {isExpanded ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Actions Grid */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-2 gap-2">
                        {ACTIONS.map(action => {
                          const ActionIcon = getActionIcon(action);
                          const isSelected = isPermissionSelected(resource, action);
                          const isInherited = isPermissionInherited(resource, action);
                          const actionColor = getActionColor(action);

                          return (
                            <div
                              key={action}
                              className={cn(
                                'flex items-center gap-2 p-3 border rounded cursor-pointer transition-colors',
                                disabled && 'cursor-not-allowed opacity-50',
                                isSelected && 'bg-primary/10 border-primary',
                                !isSelected && 'hover:bg-muted/50',
                                isInherited && 'bg-secondary/50'
                              )}
                              onClick={() => togglePermission(resource, action)}
                            >
                              <Button
                                variant={isSelected ? "default" : "ghost"}
                                size="sm"
                                disabled={disabled}
                                className="h-6 w-6 p-0"
                              >
                                {isSelected ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Plus className="h-3 w-3" />
                                )}
                              </Button>
                              <ActionIcon className={cn('h-4 w-4', actionColor)} />
                              <div className="flex-1">
                                <Label className="text-sm font-medium capitalize cursor-pointer">
                                  {action}
                                </Label>
                                {isInherited && (
                                  <p className="text-xs text-muted-foreground">
                                    Inherited from parent role
                                  </p>
                                )}
                              </div>
                              {isSelected && (
                                <Check className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allPermissions = RESOURCES.flatMap(resource =>
                  ACTIONS.map(action => ({ resource, action }))
                );
                onPermissionChange(allPermissions);
              }}
              disabled={disabled}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPermissionChange([])}
              disabled={disabled}
            >
              Clear All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const viewPermissions = RESOURCES.map(resource => ({
                  resource,
                  action: 'view' as Action,
                }));
                onPermissionChange(viewPermissions);
              }}
              disabled={disabled}
            >
              View Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permission Summary */}
      {selectedPermissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Selected Permissions Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {RESOURCES.map(resource => {
                const resourcePermissions = selectedPermissions.filter(p => p.resource === resource);
                if (resourcePermissions.length === 0) return null;

                return (
                  <div key={resource} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <span className="font-medium capitalize">{resource}</span>
                    <div className="flex gap-1">
                      {resourcePermissions.map(permission => (
                        <Badge key={permission.action} variant="default" className="text-xs">
                          {permission.action}
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
    </div>
  );
}
