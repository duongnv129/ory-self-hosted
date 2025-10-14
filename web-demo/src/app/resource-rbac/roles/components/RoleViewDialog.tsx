/**
 * Role View Dialog Component
 * Read-only view of role details and permissions
 *
 * Next.js Pro Patterns:
 * - Pure view component with minimal state
 * - Comprehensive TypeScript interfaces
 * - Accessible dialog structure
 * - Proper loading and empty states
 */

import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Label,
  Alert,
  AlertDescription,
} from '@/components/ui';
import {
  Shield,
  Pencil,
  Info,
  Building,
  Users,
} from 'lucide-react';
import type { Role } from '@/lib/types/models';

interface RoleViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  currentTenant: string | null;
  onEdit: () => void;
  className?: string;
}

export const RoleViewDialog = memo<RoleViewDialogProps>(({
  isOpen,
  onClose,
  role,
  currentTenant,
  onEdit,
  className = '',
}) => {
  if (!role) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${className}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {role.name}
          </DialogTitle>
          <DialogDescription>
            Role details and permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Description
              </Label>
              <p className="text-sm mt-1 p-3 bg-muted/30 rounded-md min-h-[40px] border">
                {role.description || 'No description provided'}
              </p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Tenant Context
              </Label>
              <div className="mt-1">
                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                  <Building className="h-3 w-3" />
                  {role.tenantId || currentTenant}
                </Badge>
              </div>
            </div>
          </div>

          {/* Role Inheritance */}
          {role.inheritsFrom && role.inheritsFrom.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Inherits From
              </Label>
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-muted/30 rounded-md border">
                {role.inheritsFrom.map((parent) => (
                  <Badge key={parent} variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {parent}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            {role.createdAt && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Created
                </Label>
                <p className="text-sm mt-1">
                  {new Date(role.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
            {role.updatedAt && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Last Updated
                </Label>
                <p className="text-sm mt-1">
                  {new Date(role.updatedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Resource-Scoped RBAC:</strong> This role can be assigned to users
              for specific resource types (products, categories, users) within the tenant.
              Permissions are synced with Keto for real-time authorization.
            </AlertDescription>
          </Alert>

          {/* Keto Integration Info */}
          <div className="p-4 bg-muted/30 rounded-md border">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Keto Integration
            </Label>
            <div className="mt-2 space-y-1 text-sm">
              <p className="text-muted-foreground">
                <strong>Namespace:</strong> default
              </p>
              <p className="text-muted-foreground">
                <strong>Role Assignment Pattern:</strong> user:email → role:{role.name} (member)
              </p>
              <p className="text-muted-foreground">
                <strong>Permission Pattern:</strong> role:{role.name} → resource:items (action)
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit} className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

RoleViewDialog.displayName = 'RoleViewDialog';
