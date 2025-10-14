/**
 * Role Dialog Component
 * Handles both create and edit operations for roles
 *
 * Next.js Pro Patterns:
 * - Single component for multiple modes (create/edit)
 * - Comprehensive TypeScript interfaces
 * - Form state management with validation
 * - Accessible form controls with proper labeling
 * - Performance optimized with proper key usage
 */

import { memo, useCallback, useState, useEffect } from 'react';
import { InlineLoading } from '@/components/loading';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@/components/ui';
import {
  Plus,
  XCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Role } from '@/lib/types/models';

interface PermissionItem {
  resource: string;
  action: string;
}

interface FormData {
  name: string;
  description: string;
  inheritsFrom: string[];
  permissions: PermissionItem[];
}

interface ResourceType {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface RoleDialogProps {
  mode: 'create' | 'edit' | null;
  isOpen: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  availableRoles: Role[];
  resourceTypes: readonly ResourceType[];
  availableActions: readonly string[];
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  isLoadingPermissions?: boolean;
  currentTenant: string | null;
  className?: string;
}

export const RoleDialog = memo<RoleDialogProps>(({
  mode,
  isOpen,
  onClose,
  formData,
  setFormData,
  availableRoles,
  resourceTypes,
  availableActions,
  onSubmit,
  isSubmitting,
  isLoadingPermissions = false,
  currentTenant,
  className = '',
}) => {
  // Local state for permission builder
  const [selectedResource, setSelectedResource] = useState<string | undefined>(undefined);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);

  // Reset permission builder when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedResource(undefined);
      setSelectedActions([]);
    }
  }, [isOpen]);

  const handleFormDataChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, [setFormData]);

  const toggleInheritance = useCallback((roleName: string) => {
    setFormData(prev => ({
      ...prev,
      inheritsFrom: prev.inheritsFrom.includes(roleName)
        ? prev.inheritsFrom.filter(r => r !== roleName)
        : [...prev.inheritsFrom, roleName],
    }));
  }, [setFormData]);

  const toggleAction = useCallback((action: string) => {
    setSelectedActions(prev =>
      prev.includes(action)
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  }, []);

  const addPermission = useCallback(() => {
    if (!selectedResource) {
      toast.error('Please select a resource type');
      return;
    }
    if (selectedActions.length === 0) {
      toast.error('Please select at least one action');
      return;
    }

    const newPermissions = selectedActions.map(action => ({
      resource: selectedResource,
      action,
    }));

    setFormData(prev => ({
      ...prev,
      permissions: [...prev.permissions, ...newPermissions],
    }));

    setSelectedResource(undefined);
    setSelectedActions([]);
  }, [selectedResource, selectedActions, setFormData]);

  const removePermission = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.filter((_, i) => i !== index),
    }));
  }, [setFormData]);

  if (!mode) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${className}`}>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Role' : 'Edit Role'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? `Add a new role to ${currentTenant}`
              : 'Update role information and permissions'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name *</Label>
              <Input
                id="role-name"
                placeholder="e.g., product-admin"
                value={formData.name}
                onChange={(e) => handleFormDataChange('name', e.target.value)}
                disabled={mode === 'edit'}
              />
              {mode === 'edit' && (
                <p className="text-xs text-muted-foreground">
                  Role name cannot be changed after creation
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                placeholder="Describe this role's purpose"
                value={formData.description}
                onChange={(e) => handleFormDataChange('description', e.target.value)}
              />
            </div>
          </div>

          {/* Role Inheritance */}
          <div className="space-y-2">
            <Label>Inherits From</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select roles that this role should inherit permissions from
            </p>
            <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px] bg-muted/30">
              {availableRoles.map((role) => (
                <Badge
                  key={role.name}
                  variant={formData.inheritsFrom.includes(role.name) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleInheritance(role.name)}
                >
                  {role.name}
                </Badge>
              ))}
              {availableRoles.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  No other roles available for inheritance
                </span>
              )}
            </div>
          </div>

          {/* Permission Builder */}
          <div className="space-y-3 border rounded-md p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <Label>Permissions</Label>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Grant specific permissions on resource types
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="permission-resource">Resource Type</Label>
                <Select
                  value={selectedResource || undefined}
                  onValueChange={(value) => setSelectedResource(value || undefined)}
                >
                  <SelectTrigger id="permission-resource">
                    <SelectValue placeholder="Select resource" />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceTypes.map((resource) => {
                      const Icon = resource.icon;
                      return (
                        <SelectItem key={resource.key} value={resource.key}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {resource.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Actions</Label>
                <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[40px] bg-background">
                  {availableActions.map((action) => (
                    <Badge
                      key={action}
                      variant={selectedActions.includes(action) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs hover:opacity-80 transition-opacity"
                      onClick={() => toggleAction(action)}
                    >
                      {action}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={addPermission}
              className="w-full"
              disabled={!selectedResource || selectedActions.length === 0}
            >
              <Plus className="mr-2 h-3 w-3" />
              Add Permission
            </Button>

            {/* Permission List */}
            {isLoadingPermissions && mode === 'edit' ? (
              <div className="space-y-2 mt-3">
                <Label className="text-xs">Assigned Permissions:</Label>
                <InlineLoading text="Loading permissions..." className="py-4" />
              </div>
            ) : formData.permissions.length > 0 ? (
              <div className="space-y-2 mt-3">
                <Label className="text-xs">Assigned Permissions:</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {formData.permissions.map((perm, index) => (
                    <div
                      key={`${perm.resource}-${perm.action}-${index}`}
                      className="flex items-center justify-between p-2 bg-background rounded-md text-sm border"
                    >
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {perm.resource}
                        </Badge>
                        <span className="text-muted-foreground">{perm.action}</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePermission(index)}
                        className="h-6 w-6 p-0 hover:bg-destructive/10"
                        disabled={isLoadingPermissions}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : mode === 'edit' && !isLoadingPermissions ? (
              <div className="text-sm text-muted-foreground mt-3">
                No permissions assigned to this role yet.
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !formData.name.trim()}
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

RoleDialog.displayName = 'RoleDialog';
