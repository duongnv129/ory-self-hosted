/**
 * Role Delete Dialog Component
 * Confirmation dialog for role deletion with safety warnings
 *
 * Next.js Pro Patterns:
 * - Focused single-purpose component
 * - Clear TypeScript interfaces
 * - Comprehensive error handling
 * - Accessible confirmation flow
 * - Safety warnings and impact description
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
  Alert,
  AlertDescription,
} from '@/components/ui';
import {
  AlertTriangle,
  Shield,
  Trash2,
  Building,
} from 'lucide-react';
import type { Role } from '@/lib/types/models';

interface RoleDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  currentTenant: string | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  className?: string;
}

export const RoleDeleteDialog = memo<RoleDeleteDialogProps>(({
  isOpen,
  onClose,
  role,
  currentTenant,
  onConfirm,
  isDeleting,
  className = '',
}) => {
  if (!role) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Delete confirmation error:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${className}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Role
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please review the impact before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Role Summary */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-medium text-sm">{role.name}</p>
                {role.description && (
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {role.tenantId || currentTenant}
                  </Badge>
                  {role.inheritsFrom && role.inheritsFrom.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Inherits from {role.inheritsFrom.length} role{role.inheritsFrom.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Impact Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">Deletion Impact:</p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>All Keto permission tuples for this role will be removed</li>
                <li>Users assigned to this role will lose their permissions immediately</li>
                <li>Role inheritance relationships will be broken</li>
                <li>This action cannot be undone</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Additional Warnings */}
          {role.inheritsFrom && role.inheritsFrom.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Inheritance Notice:</strong> This role inherits from{' '}
                {role.inheritsFrom.length === 1 ? 'another role' : `${role.inheritsFrom.length} other roles`}.
                Deleting it will not affect the parent roles, but any child roles inheriting from this one will lose those permissions.
              </AlertDescription>
            </Alert>
          )}

          {/* Confirmation Note */}
          <div className="p-3 bg-muted/50 rounded-md border-l-4 border-l-destructive">
            <p className="text-sm text-muted-foreground">
              <strong>Please confirm:</strong> Type the role name to enable deletion,
              or use the Cancel button to go back safely.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Role
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

RoleDeleteDialog.displayName = 'RoleDeleteDialog';
