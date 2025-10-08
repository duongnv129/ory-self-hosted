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
import { Eye, Plus, Edit, Trash2, Shield, Check, X, Loader2 } from 'lucide-react';
import { Permission } from '@/lib/types/models';
import { useMetadata } from '@/lib/context/MetadataContext';
import { cn } from '@/lib/utils';

// Resources and actions are now dynamically loaded from metadata
type Resource = string;
type Action = string;

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
  // Get dynamic metadata for resources and permissions
  const {
    resources: metadataResources,
    isLoading: metadataLoading,
    error: metadataError,
  } = useMetadata();

  // Extract all unique resources and actions from metadata
  const RESOURCES = metadataResources.map((r) => r.resource);
  const ACTIONS = Array.from(new Set(metadataResources.flatMap((r) => r.permissions)));

  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set(RESOURCES));

  /**
   * Check if a specific permission is currently selected
   * @param resource - Resource to check
   * @param action - Action to check
   * @returns True if permission is selected
   */
  const isPermissionSelected = (resource: Resource, action: Action): boolean => {
    return selectedPermissions.some((p) => p.resource === resource && p.action === action);
  };

  /**
   * Check if a specific permission is inherited from parent roles
   * @param resource - Resource to check
   * @param action - Action to check
   * @returns True if permission is inherited
   */
  const isPermissionInherited = (resource: Resource, action: Action): boolean => {
    return inheritedPermissions.some((p) => p.resource === resource && p.action === action);
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
          (p) => !(p.resource === resource && p.action === action)
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
      const resourcePermissions = ACTIONS.filter((action) =>
        isPermissionSelected(resource, action)
      );

      if (resourcePermissions.length === ACTIONS.length) {
        // All actions are selected, remove all
        const updated = selectedPermissions.filter((p) => p.resource !== resource);
        onPermissionChange(updated);
      } else {
        // Not all actions are selected, add all
        const updated = selectedPermissions.filter((p) => p.resource !== resource);
        const newPermissions = ACTIONS.map((action) => ({
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
      setExpandedResources((prev) => {
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

  // Show loading state while metadata is being fetched
  if (metadataLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading permissions...</span>
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
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <X className="mb-4 h-12 w-12 text-destructive" />
            <p className="font-medium text-destructive">Failed to load permissions</p>
            <p className="mt-2 text-sm text-muted-foreground">{metadataError.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
              <CardDescription>Choose specific permissions for this role</CardDescription>
            </div>
            <div className="flex gap-2 text-sm">
              {selectedCount === 0 ? (
                <Badge variant="outline" className="text-muted-foreground">
                  No permissions selected
                </Badge>
              ) : (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  {selectedCount} permission{selectedCount !== 1 ? 's' : ''} selected
                </Badge>
              )}
              {inheritedCount > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                  {inheritedCount} inherited
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Empty state when no resources available */}
          {RESOURCES.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No Permissions Available</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No system resources or permissions are configured at this time.
              </p>
              <p className="text-xs text-muted-foreground">
                Contact your administrator to configure permissions.
              </p>
            </div>
          ) : (
            <>
              {/* Help text for empty selection */}
              {selectedCount === 0 && inheritedCount === 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 mb-1">Get started with permissions</p>
                      <p className="text-blue-700">
                        Select specific permissions below or use quick actions to assign common permission sets.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
            {RESOURCES.map((resource) => {
              const isExpanded = expandedResources.has(resource);
              const selectedActionsForResource = ACTIONS.filter((action) =>
                isPermissionSelected(resource, action)
              );
              const inheritedActionsForResource = ACTIONS.filter((action) =>
                isPermissionInherited(resource, action)
              );
              const allSelected = selectedActionsForResource.length === ACTIONS.length;
              const someSelected = selectedActionsForResource.length > 0 && !allSelected;

              return (
                <div key={resource} className={cn(
                  "rounded-lg border transition-colors",
                  allSelected && "border-green-300 bg-green-50",
                  someSelected && "border-yellow-300 bg-yellow-50",
                  !someSelected && !allSelected && "border-gray-200"
                )}>
                  {/* Resource Header */}
                  <div
                    className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleResourceExpansion(resource)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={allSelected ? 'default' : someSelected ? 'outline' : 'ghost'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAllActionsForResource(resource);
                          }}
                          disabled={disabled}
                          className={cn(
                            "h-6 w-6 p-0 transition-colors",
                            allSelected && "bg-green-600 hover:bg-green-700",
                            someSelected && "border-yellow-400 text-yellow-700 hover:bg-yellow-100"
                          )}
                          title={allSelected ? "Deselect all" : someSelected ? "Select remaining" : "Select all"}
                        >
                          {allSelected ? (
                            <Check className="h-3 w-3" />
                          ) : someSelected ? (
                            <Plus className="h-3 w-3" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                        </Button>
                        <Label className="cursor-pointer font-medium capitalize">{resource}</Label>
                      </div>
                      <div className="flex gap-1">
                        {selectedActionsForResource.length > 0 && (
                          <Badge
                            variant={allSelected ? "default" : "outline"}
                            className={cn(
                              "text-xs",
                              allSelected && "bg-green-100 text-green-800 border-green-300",
                              someSelected && "bg-yellow-100 text-yellow-800 border-yellow-300"
                            )}
                          >
                            {allSelected ? "All selected" : `${selectedActionsForResource.length}/${ACTIONS.length} selected`}
                          </Badge>
                        )}
                        {inheritedActionsForResource.length > 0 && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                            +{inheritedActionsForResource.length} inherited
                          </Badge>
                        )}
                        {selectedActionsForResource.length === 0 && inheritedActionsForResource.length === 0 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            No permissions
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-muted"
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </Button>
                  </div>

                  {/* Actions Grid */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-2 gap-2">
                        {ACTIONS.map((action) => {
                          const ActionIcon = getActionIcon(action);
                          const isSelected = isPermissionSelected(resource, action);
                          const isInherited = isPermissionInherited(resource, action);
                          const actionColor = getActionColor(action);

                          return (
                            <div
                              key={action}
                              className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-200',
                                disabled && 'cursor-not-allowed opacity-50',
                                isSelected && 'border-green-300 bg-green-50 shadow-sm',
                                !isSelected && 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                                isInherited && 'bg-blue-50 border-blue-200',
                                'hover:shadow-sm'
                              )}
                              onClick={() => !disabled && togglePermission(resource, action)}
                              role="button"
                              tabIndex={disabled ? -1 : 0}
                              aria-label={`${isSelected ? 'Remove' : 'Add'} ${action} permission for ${resource}`}
                            >
                              <div className={cn(
                                "flex items-center justify-center w-6 h-6 rounded border-2 transition-colors",
                                isSelected && "bg-green-600 border-green-600",
                                !isSelected && "border-gray-300 hover:border-gray-400",
                                isInherited && "bg-blue-100 border-blue-300"
                              )}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                                {!isSelected && !isInherited && <div className="w-1 h-1" />}
                                {isInherited && <Check className="h-3 w-3 text-blue-600" />}
                              </div>
                              <ActionIcon className={cn('h-4 w-4 flex-shrink-0', actionColor)} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <Label className="cursor-pointer text-sm font-medium capitalize truncate">
                                    {action}
                                  </Label>
                                  {isSelected && !isInherited && (
                                    <Badge variant="outline" className="ml-2 text-xs text-green-700 border-green-300">
                                      Selected
                                    </Badge>
                                  )}
                                </div>
                                {isInherited && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    Inherited from parent role
                                  </p>
                                )}
                              </div>
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
          <div className="flex gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allPermissions = RESOURCES.flatMap((resource) =>
                  ACTIONS.map((action) => ({ resource, action }))
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
                const viewPermissions = RESOURCES.map((resource) => ({
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
        </>
      )}
    </CardContent>
  </Card>
</div>
);
}
