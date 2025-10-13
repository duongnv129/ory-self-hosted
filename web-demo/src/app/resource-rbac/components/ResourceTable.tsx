/**
 * Resource Table Component
 * Generic table for displaying and managing all resource types (Users, Products, Categories)
 * with role assignment capabilities and permission testing.
 *
 * Follows Next.js Pro patterns:
 * - Client Component with proper TypeScript interfaces
 * - Explicit prop types and default values
 * - Type-safe generic implementation
 */

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
} from '@/components/ui';
import { Shield, TestTube, Trash2 } from 'lucide-react';
import { User, Product, Category } from '@/lib/types/models';

// Type-safe props interface - use union types instead of generic constraints
interface ResourceTableProps {
  resources: User[] | Product[] | Category[];
  type: 'users' | 'products' | 'categories';
  isLoading?: boolean;
  onAssignRoles?: (resource: User | Product | Category) => void;
  onTestPermissions?: (resource: User | Product | Category) => void;
  onDelete?: (resource: User | Product | Category) => void;
  className?: string;
}

// Helper function to safely get display name
function getDisplayName(resource: User | Product | Category, type: string): string {
  switch (type) {
    case 'users':
      const user = resource as User;
      return user.email || user.name?.first ? `${user.name?.first} ${user.name?.last}` : 'Unknown User';
    case 'products':
      const product = resource as Product;
      return product.name || 'Unnamed Product';
    case 'categories':
      const category = resource as Category;
      return category.name || 'Unnamed Category';
    default:
      return `${type} unknown`;
  }
}

// Helper function to get resource details
function getResourceDetails(resource: User | Product | Category, type: string): string[] {
  switch (type) {
    case 'users':
      const user = resource as User;
      return [
        user.email || 'No email',
        `Tenant IDs: ${user.tenant_ids?.join(', ') || 'None'}`
      ];
    case 'products':
      const product = resource as Product;
      return [
        `Price: $${product.price || 0}`,
        `Category: ${product.category || 'Uncategorized'}`
      ];
    case 'categories':
      const category = resource as Category;
      return [
        category.description || 'No description'
      ];
    default:
      return [];
  }
}

export default function ResourceTable({
  resources,
  type,
  isLoading = false,
  onAssignRoles,
  onTestPermissions,
  onDelete,
  className,
}: ResourceTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">No {type} found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No {type} are available in the current context.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name/ID</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Resource Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map((resource) => {
              const displayName = getDisplayName(resource, type);
              const details = getResourceDetails(resource, type);

              return (
                <TableRow key={resource.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{displayName}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {resource.id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {details.map((detail, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          {detail}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {type.slice(0, -1)} {/* Remove 's' from type */}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {onAssignRoles && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAssignRoles(resource)}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Roles
                        </Button>
                      )}
                      {onTestPermissions && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTestPermissions(resource)}
                        >
                          <TestTube className="mr-2 h-4 w-4" />
                          Test
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(resource)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
