/**
 * Resource Table Component
 * Generic table for displaying and managing resources (users, products, categories)
 * with actions, role assignments, and RBAC integration
 */

'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
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
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Shield,
  Eye,
  Loader2,
} from 'lucide-react';
import { User, Product, Category } from '@/lib/types/models';
import { cn } from '@/lib/utils';

/**
 * Base resource interface for polymorphic table support
 */
interface BaseResource {
  id: string | number;
  [key: string]: unknown;
}

/**
 * Column definition for table display
 */
export interface TableColumn<T = BaseResource> {
  /** Unique column identifier */
  key: string;
  /** Display label for column header */
  label: string;
  /** Render function for cell content */
  render: (item: T) => React.ReactNode;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Column width class */
  width?: string;
}

/**
 * Action definition for table rows
 */
export interface TableAction<T = BaseResource> {
  /** Unique action identifier */
  key: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Action handler */
  onClick: (item: T) => void;
  /** Whether action is destructive (red styling) */
  destructive?: boolean;
  /** Conditional visibility */
  hidden?: (item: T) => boolean;
  /** Conditional disabled state */
  disabled?: (item: T) => boolean;
}

/**
 * Props for ResourceTable component
 */
interface ResourceTableProps<T extends BaseResource = BaseResource> {
  /** Array of resources to display */
  data: T[];
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Table title */
  title: string;
  /** Table description */
  description?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string;
  /** Primary actions (create, etc.) */
  primaryActions?: TableAction<T>[];
  /** Row actions (edit, delete, etc.) */
  rowActions?: TableAction<T>[];
  /** Empty state message */
  emptyMessage?: string;
  /** Show role assignment column */
  showRoles?: boolean;
  /** Show permission testing actions */
  showPermissions?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when refresh is requested */
  onRefresh?: () => void;
}

/**
 * Get roles for a resource (if available)
 */
const getResourceRoles = (item: BaseResource): string[] => {
  if ('roles' in item && Array.isArray(item.roles)) {
    return item.roles as string[];
  }
  return [];
};

/**
 * Generic ResourceTable component
 */
export function ResourceTable<T extends BaseResource = BaseResource>({
  data,
  columns,
  title,
  description,
  isLoading = false,
  error,
  primaryActions = [],
  rowActions = [],
  emptyMessage = 'No items found',
  showRoles = false,
  showPermissions = false,
  className,
  onRefresh,
}: ResourceTableProps<T>) {
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(new Set());

  // Handle row selection (for batch operations)
  const handleRowSelect = (itemId: string | number) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {title}
              {data.length > 0 && (
                <Badge variant="secondary">{data.length}</Badge>
              )}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <Loader2 className={cn("h-4 w-4", isLoading && "animate-spin")} />
                Refresh
              </Button>
            )}
            {primaryActions.map((action) => (
              <Button
                key={action.key}
                onClick={() => action.onClick({} as T)}
                size="sm"
                className="flex items-center gap-2"
              >
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Selection summary */}
        {selectedItems.size > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="text-sm font-medium">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear
              </Button>
              {/* Add batch actions here if needed */}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading && data.length === 0 ? (
          /* Loading state */
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading {title.toLowerCase()}...</span>
          </div>
        ) : data.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No {title} Found</h3>
            <p className="text-muted-foreground mb-4">{emptyMessage}</p>
            {primaryActions.length > 0 && (
              <Button onClick={() => primaryActions[0].onClick({} as T)}>
                <Plus className="h-4 w-4 mr-2" />
                {primaryActions[0].label}
              </Button>
            )}
          </div>
        ) : (
          /* Data table */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Selection checkbox column */}
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === data.length && data.length > 0}
                      onChange={() => {
                        if (selectedItems.size === data.length) {
                          clearSelection();
                        } else {
                          setSelectedItems(new Set(data.map(item => item.id)));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </TableHead>

                  {/* Data columns */}
                  {columns.map((column) => (
                    <TableHead key={column.key} className={column.width}>
                      {column.label}
                      {column.sortable && (
                        <span className="ml-1 text-muted-foreground">↕</span>
                      )}
                    </TableHead>
                  ))}

                  {/* Roles column */}
                  {showRoles && (
                    <TableHead className="min-w-[200px]">Roles</TableHead>
                  )}

                  {/* Actions column */}
                  {(rowActions.length > 0 || showPermissions) && (
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => {
                  const isSelected = selectedItems.has(item.id);
                  const itemRoles = getResourceRoles(item);

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        "cursor-pointer",
                        isSelected && "bg-muted/50"
                      )}
                      onClick={() => handleRowSelect(item.id)}
                    >
                      {/* Selection checkbox */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRowSelect(item.id)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>

                      {/* Data columns */}
                      {columns.map((column) => (
                        <TableCell key={column.key}>
                          {column.render(item)}
                        </TableCell>
                      ))}

                      {/* Roles column */}
                      {showRoles && (
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {itemRoles.length > 0 ? (
                              itemRoles.map((role) => (
                                <Badge
                                  key={role}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {role}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">No roles</span>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Actions column */}
                      {(rowActions.length > 0 || showPermissions) && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {/* Permission testing */}
                            {showPermissions && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  // Handle permission testing
                                }}
                                title="Test permissions"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Role assignment */}
                            {showRoles && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  // Handle role assignment
                                }}
                                title="Manage roles"
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Row actions */}
                            {rowActions.map((action) => {
                              const isHidden = action.hidden?.(item) || false;
                              const isDisabled = action.disabled?.(item) || false;

                              if (isHidden) return null;

                              return (
                                <Button
                                  key={action.key}
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => action.onClick(item)}
                                  disabled={isDisabled}
                                  className={cn(
                                    action.destructive && "text-destructive hover:text-destructive"
                                  )}
                                  title={action.label}
                                >
                                  {action.icon ? (
                                    <action.icon className="h-4 w-4" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              );
                            })}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Loading overlay for refresh */}
        {isLoading && data.length > 0 && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <div className="bg-background border rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Refreshing...</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Predefined column configurations for common resource types
 */
export const commonColumns = {
  user: [
    {
      key: 'email',
      label: 'Email',
      render: (user: User) => (
        <div className="font-medium">{user.email}</div>
      ),
      sortable: true,
    },
    {
      key: 'name',
      label: 'Name',
      render: (user: User) => (
        <div>
          {user.name.first} {user.name.last}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'tenants',
      label: 'Tenants',
      render: (user: User) => (
        <div className="flex flex-wrap gap-1">
          {user.tenant_ids.map((tenantId) => (
            <Badge key={tenantId} variant="outline" className="text-xs">
              {tenantId}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'created',
      label: 'Created',
      render: (user: User) => (
        <div className="text-muted-foreground text-sm">
          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
        </div>
      ),
      sortable: true,
    },
  ] satisfies TableColumn<User>[],

  product: [
    {
      key: 'name',
      label: 'Product Name',
      render: (product: Product) => (
        <div className="font-medium">{product.name}</div>
      ),
      sortable: true,
    },
    {
      key: 'category',
      label: 'Category',
      render: (product: Product) => (
        <Badge variant="outline">{product.category}</Badge>
      ),
      sortable: true,
    },
    {
      key: 'price',
      label: 'Price',
      render: (product: Product) => (
        <div className="font-mono">${product.price.toFixed(2)}</div>
      ),
      sortable: true,
    },
    {
      key: 'tenant',
      label: 'Tenant',
      render: (product: Product) => (
        <Badge variant="secondary">{product.tenantId}</Badge>
      ),
    },
  ] satisfies TableColumn<Product>[],

  category: [
    {
      key: 'name',
      label: 'Category Name',
      render: (category: Category) => (
        <div className="font-medium">{category.name}</div>
      ),
      sortable: true,
    },
    {
      key: 'description',
      label: 'Description',
      render: (category: Category) => (
        <div className="text-muted-foreground max-w-[300px] truncate">
          {category.description}
        </div>
      ),
    },
    {
      key: 'tenant',
      label: 'Tenant',
      render: (category: Category) => (
        <Badge variant="secondary">{category.tenantId}</Badge>
      ),
    },
  ] satisfies TableColumn<Category>[],
};

/**
 * Predefined actions for common operations
 */
export const commonActions = {
  edit: {
    key: 'edit',
    label: 'Edit',
    icon: Edit,
    onClick: (_item: BaseResource) => {
      // Will be overridden by parent component
    },
  } as TableAction,

  delete: {
    key: 'delete',
    label: 'Delete',
    icon: Trash2,
    destructive: true,
    onClick: (_item: BaseResource) => {
      // Will be overridden by parent component
    },
  } as TableAction,

  view: {
    key: 'view',
    label: 'View Details',
    icon: Eye,
    onClick: (_item: BaseResource) => {
      // Will be overridden by parent component
    },
  } as TableAction,
};
