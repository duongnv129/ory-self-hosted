/**
 * Create Role Page
 * Full-screen form for creating new roles with permission assignment
 *
 * @remarks
 * This page provides a dedicated interface for role creation with:
 * - Basic role information form
 * - Parent role inheritance selection
 * - Interactive permission selector
 * - Permission matrix preview
 * - Real-time validation and feedback
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoles, useRoleMutations } from '@/lib/hooks/useRoles';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
  Badge,
} from '@/components/ui';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { Permission } from '@/lib/types/models';
import { toast } from 'sonner';
import { PermissionSelector } from '@/components/roles/PermissionSelector';
import { PermissionMatrix } from '@/components/roles/PermissionMatrix';
import { RoleInheritanceSelector } from '@/components/roles/RoleInheritanceSelector';

/**
 * Form data interface for role creation
 */
interface CreateRoleFormData {
  name: string;
  description: string;
  inheritsFrom: string[];
  permissions: Permission[];
}

export default function CreateRolePage() {
  const router = useRouter();
  const { roles } = useRoles();
  const { createRole } = useRoleMutations();

  const [formData, setFormData] = useState<CreateRoleFormData>({
    name: '',
    description: '',
    inheritsFrom: [],
    permissions: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /**
   * Validate form data
   * @returns True if form is valid
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Role name must be at least 2 characters';
    }

    if (!formData.description || formData.description.trim().length < 5) {
      errors.description = 'Description must be at least 5 characters';
    }

    // Check if role name already exists
    if (roles.some(role => role.name.toLowerCase() === formData.name.trim().toLowerCase())) {
      errors.name = 'A role with this name already exists';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form field changes
   * @param field - Field name to update
   * @param value - New field value
   */
  const handleFieldChange = (field: keyof CreateRoleFormData, value: string | string[] | Permission[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Handle permission changes from the permission selector
   * @param permissions - Updated permissions array
   */
  const handlePermissionChange = (permissions: Permission[]) => {
    handleFieldChange('permissions', permissions);
  };

  /**
   * Handle permission changes from the matrix preview
   * @param roleName - Role name (ignored for creation)
   * @param resource - Resource being toggled
   * @param action - Action being toggled
   * @param granted - New granted state
   */
  const handleMatrixPermissionChange = (roleName: string, resource: string, action: string, granted: boolean) => {
    const currentPermissions = formData.permissions;

    if (granted) {
      // Add permission if not already present
      const exists = currentPermissions.some(p =>
        p.resource === resource && p.action === action
      );
      if (!exists) {
        const newPermissions = [
          ...currentPermissions,
          { resource, action }
        ];
        handleFieldChange('permissions', newPermissions);
      }
    } else {
      // Remove permission
      const filteredPermissions = currentPermissions.filter(p =>
        !(p.resource === resource && p.action === action)
      );
      handleFieldChange('permissions', filteredPermissions);
    }
  };

  /**
   * Calculate inherited permissions from parent roles
   * @returns Array of inherited permissions with their source roles
   */
  const getInheritedPermissions = (): Permission[] => {
    if (!formData.inheritsFrom?.length || !roles?.length) {
      return [];
    }

    const inheritedPerms: Permission[] = [];
    const visited = new Set<string>();

    /**
     * Recursively collect permissions from parent roles
     * @param roleName - Name of the role to get permissions from
     */
    const collectPermissions = (roleName: string) => {
      if (visited.has(roleName)) return; // Prevent circular dependencies
      visited.add(roleName);

      const parentRole = roles.find(r => r.name === roleName);
      if (!parentRole) return;

      // Add direct permissions from this parent role
      if (parentRole.permissions?.length) {
        for (const perm of parentRole.permissions) {
          const existing = inheritedPerms.find(
            p => p.resource === perm.resource && p.action === perm.action
          );
          if (!existing) {
            inheritedPerms.push({
              resource: perm.resource,
              action: perm.action,
            });
          }
        }
      }

      // Recursively collect from this role's parents
      if (parentRole.inheritsFrom?.length) {
        for (const grandparent of parentRole.inheritsFrom) {
          collectPermissions(grandparent);
        }
      }
    };

    // Start collection from all direct parent roles
    for (const parentName of formData.inheritsFrom) {
      collectPermissions(parentName);
    }

    return inheritedPerms;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please correct the validation errors');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create role through the backend API with permissions
      // The backend (multi-tenancy-demo) handles Keto integration for permissions
      await createRole({
        name: formData.name.trim(),
        description: formData.description.trim(),
        inheritsFrom: formData.inheritsFrom,
        permissions: formData.permissions,
      });

      toast.success('Role created successfully');
      router.push('/simple-rbac/roles');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create role';
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to create roles');
      } else if (errorMessage.includes('already exists')) {
        toast.error('A role with this name already exists');
        setValidationErrors({ name: 'A role with this name already exists' });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle cancel and navigate back
   */
  const handleCancel = () => {
    router.push('/simple-rbac/roles');
  };

  // Generate preview role for matrix
  const previewRole = formData.name ? {
    id: 0,
    name: formData.name,
    description: formData.description || 'New role',
    namespace: 'simple-rbac',
    inheritsFrom: formData.inheritsFrom,
    permissions: formData.permissions,
    createdAt: new Date().toISOString(),
  } : null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleCancel} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Create New Role</h1>
          <p className="text-muted-foreground">
            Define a new role with specific permissions and inheritance rules
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Creating...' : 'Create Role'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Form */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Enter the role name and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., admin, moderator, customer"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  disabled={isSubmitting}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  placeholder="Describe the role's purpose and permissions"
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  disabled={isSubmitting}
                />
                {validationErrors.description && (
                  <p className="text-sm text-red-600">{validationErrors.description}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Role Inheritance */}
          <RoleInheritanceSelector
            availableRoles={roles || []}
            selectedInheritance={formData.inheritsFrom}
            onInheritanceChange={(inheritance) => handleFieldChange('inheritsFrom', inheritance)}
            currentRoleName={formData.name || '__creating__'}
            disabled={isSubmitting}
          />

          {/* Permission Selection */}
          <PermissionSelector
            selectedPermissions={formData.permissions}
            onPermissionChange={handlePermissionChange}
            inheritedPermissions={getInheritedPermissions()}
            disabled={isSubmitting}
          />
        </div>

        {/* Right Column: Preview */}
        <div className="space-y-6">
          {/* Permission Matrix Preview */}
          {previewRole && (
            <Card>
              <CardHeader>
                <CardTitle>Permission Preview</CardTitle>
                <CardDescription>
                  Interactive preview of permissions for this role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PermissionMatrix
                  roles={[previewRole]}
                  selectedRole={previewRole}
                  editable={true}
                  showInheritance={true}
                  onPermissionChange={handleMatrixPermissionChange}
                  className="scale-95"
                />
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {(formData.permissions.length > 0 || formData.inheritsFrom.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Role Summary</CardTitle>
                <CardDescription>
                  Overview of the role being created
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.inheritsFrom.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Inherits From:</h4>
                    <div className="space-y-2">
                      {formData.inheritsFrom.map(roleName => {
                        const parentRole = roles?.find(r => r.name === roleName);
                        return (
                          <div key={roleName} className="flex items-center justify-between">
                            <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                              {roleName}
                            </span>
                            {parentRole && (
                              <span className="text-xs text-muted-foreground">
                                {parentRole.permissions?.length || 0} permissions
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formData.permissions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">
                      Direct Permissions: ({formData.permissions.length})
                    </h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {formData.permissions.map(permission => (
                        <div key={`${permission.resource}-${permission.action}`} className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs">
                            Direct
                          </Badge>
                          <span>{permission.action} {permission.resource}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {getInheritedPermissions().length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">
                      Inherited Permissions: ({getInheritedPermissions().length})
                    </h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {getInheritedPermissions().map(permission => (
                        <div key={`inherited-${permission.resource}-${permission.action}`} className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            Inherited
                          </Badge>
                          <span>{permission.action} {permission.resource}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total Permission Count */}
                {(formData.permissions.length > 0 || getInheritedPermissions().length > 0) && (
                  <div className="border-t pt-3">
                    <h4 className="font-medium text-sm mb-1">
                      Total Effective Permissions: ({formData.permissions.length + getInheritedPermissions().length})
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {formData.permissions.length} direct + {getInheritedPermissions().length} inherited
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Validation Errors */}
          {Object.keys(validationErrors).length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please correct the following errors:
                <ul className="mt-2 list-disc list-inside">
                  {Object.values(validationErrors).map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
