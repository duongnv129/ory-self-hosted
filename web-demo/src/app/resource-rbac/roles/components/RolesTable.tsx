/**
 * Roles Table Component
 * Displays roles in a table format with action buttons
 *
 * Next.js Pro Patterns:
 * - Pure component with explicit props interface
 * - Proper TypeScript typing
 * - Memoized for performance optimization
 * - Accessible table structure
 */

import { memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
} from '@/components/ui';
import {
  Eye,
  Pencil,
  Trash2,
  Shield,
} from 'lucide-react';
import type { Role } from '@/lib/types/models';

interface RolesTableProps {
  roles: Role[];
  currentTenant: string | null;
  onView: (role: Role) => void;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  className?: string;
}

export const RolesTable = memo<RolesTableProps>(({
  roles,
  currentTenant,
  onView,
  onEdit,
  onDelete,
  className = '',
}) => {
  if (roles.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
        <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          No roles found for this tenant. Create your first role to get started.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Inherits From</TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.filter(role => role && role.name).map((role) => (
            <TableRow key={role.name}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  {role.name || 'Unknown Role'}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-md">
                <div className="truncate" title={role.description || ''}>
                  {role.description || '-'}
                </div>
              </TableCell>
              <TableCell>
                {role.inheritsFrom && role.inheritsFrom.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {role.inheritsFrom.map((parent) => (
                      <Badge key={parent} variant="outline" className="text-xs">
                        {parent}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {role.tenantId || currentTenant}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(role)}
                    title="View role details"
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(role)}
                    title="Edit role"
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(role)}
                    title="Delete role"
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

RolesTable.displayName = 'RolesTable';
