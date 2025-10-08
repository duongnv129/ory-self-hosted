/**
 * Edit Role Page
 * Full-screen form for editing existing roles with permission management
 *
 * @remarks
 * This page provides a dedicated interface for role editing with:
 * - Pre-populated form with existing role data
 * - Role name (read-only after creation)
 * - Parent role inheritance management
 * - Interactive permission selector and matrix
 * - Real-time validation and feedback
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole, useRoleMutations, useRoles } from '@/lib/hooks/useRoles';
import { useMetadata } from '@/lib/context/MetadataContext';
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
  Loader2,
} from 'lucide-react';
import { Permission } from '@/lib/types/models';
import { toast } from 'sonner';
import { PermissionSelector } from '@/components/roles/PermissionSelector';
import { PermissionMatrix } from '@/components/roles/PermissionMatrix';
import { RoleInheritanceSelector } from '@/components/roles/RoleInheritanceSelector';
import { CardSkeleton } from '@/components/ui/loading';

/**
 * Form data interface for role editing
 */
interface EditRoleFormData {
  name: string;
  description: string;
  inheritsFrom: string[];
  permissions: Permission[];
}

/**
 * Props for the EditRolePage component (from Next.js dynamic route)
 */
interface EditRolePageProps {
  params: {
    name: string;
  };
}

export default function EditRolePage({ params }: EditRolePageProps) {
  const router = useRouter();
  const { updateRole } = useRoleMutations();
  // Fetch metadata for debugging and permission matrix
  const { resources: metadataResources } = useMetadata();
  // Fetch all roles for inheritance calculation
  const { roles: allRoles, isLoading: isRolesLoading } = useRoles();
  // Use the specific role hook to fetch detailed role data including permissions
  const { role: roleToEdit, permissions: rolePermissions, isLoading: isRoleLoading, isError: isRoleError } = useRole(params.name);

  const [formData, setFormData] = useState<EditRoleFormData>({
    name: '',
    description: '',
    inheritsFrom: [],
    permissions: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Load the specific role data when it's available
  useEffect(() => {
    if (roleToEdit && !isInitialized) {
      setFormData({
        name: roleToEdit.name,
        description: roleToEdit.description,
        inheritsFrom: roleToEdit.inheritsFrom || [],
        // Use the detailed permissions from the role API call
        permissions: rolePermissions || [],
      });
      setIsInitialized(true);
    }
  }, [roleToEdit, rolePermissions, isInitialized]);

  /**
   * Validate form data
   * @returns True if form is valid
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.description || formData.description.trim().length < 5) {
      errors.description = 'Description must be at least 5 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form field changes
   * @param field - Field name to update
   * @param value - New field value
   */
  const handleFieldChange = (field: keyof EditRoleFormData, value: string | string[] | Permission[]) => {
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
   * @param roleName - Role name (ignored for editing)
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
    if (!formData.inheritsFrom?.length || !allRoles?.length) {
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

      const parentRole = allRoles.find(r => r.name === roleName);
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
    if (!roleToEdit) {
      toast.error('Role data not available');
      return;
    }

    if (!validateForm()) {
      toast.error('Please correct the validation errors');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update role metadata, inheritance, and permissions through the backend API
      // The backend (multi-tenancy-demo) handles Keto integration for permissions
      await updateRole(roleToEdit.name, {
        description: formData.description.trim(),
        inheritsFrom: formData.inheritsFrom,
        permissions: formData.permissions,
      });

      toast.success('Role updated successfully');
      router.push('/simple-rbac/roles');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update role';
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to update roles');
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

  // Show loading state while fetching role data
  if (isRoleLoading || isRolesLoading || !isInitialized) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleCancel} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <h1 className="text-2xl font-bold">Loading Role...</h1>
            </div>
          </div>
        </div>
        <CardSkeleton count={3} />
      </div>
    );
  }

  // Show error state if role loading failed
  if (isRoleError) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleCancel} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Error Loading Role</h1>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load role data: {isRoleError ? 'Error loading role' : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Role not found
  if (!roleToEdit) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleCancel} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Role Not Found</h1>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The role you&apos;re trying to edit could not be found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Generate preview role for matrix
  const previewRole = {
    ...roleToEdit,
    description: formData.description,
    inheritsFrom: formData.inheritsFrom,
    permissions: formData.permissions,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleCancel} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Edit Role</h1>
            <Badge variant="outline">{roleToEdit.name}</Badge>
          </div>
          <p className="text-muted-foreground">
            Modify role permissions and inheritance rules
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
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
                Update the role description (name cannot be changed)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  disabled={true}
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Role name cannot be changed after creation
                </p>
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
            availableRoles={allRoles || []}
            selectedInheritance={formData.inheritsFrom}
            onInheritanceChange={(inheritance) => handleFieldChange('inheritsFrom', inheritance)}
            currentRoleName={roleToEdit.name}
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
          <Card>
            <CardHeader>
              <CardTitle>Permission Preview</CardTitle>
              <CardDescription>
                Interactive preview of permissions for this role
              </CardDescription>
              {/* Debug Info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                  <strong>Debug Info:</strong><br />
                  Resources: {metadataResources.map(r => r.resource).join(', ')} ({metadataResources.length})<br />
                  Actions: {Array.from(new Set(metadataResources.flatMap(r => r.permissions))).join(', ')}<br />
                  Direct Permissions: {formData.permissions.length}<br />
                  Inherited Permissions: {getInheritedPermissions().length}<br />
                  Parent Roles: {formData.inheritsFrom.join(', ') || 'None'}<br />
                  All Roles Loaded: {allRoles?.length || 0}<br />
                  Inheritance Chain: {formData.inheritsFrom.map(parent => {
                    const parentRole = allRoles?.find(r => r.name === parent);
                    return `${parent}(${parentRole?.inheritsFrom?.join('→') || 'root'})`;
                  }).join(', ') || 'None'}
                </div>
              )}
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

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Role Summary</CardTitle>
              <CardDescription>
                Overview of the role being updated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Role Details:</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>ID: {roleToEdit.id}</div>
                  <div>Namespace: {roleToEdit.namespace}</div>
                  <div>Created: {new Date(roleToEdit.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {formData.inheritsFrom.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Inherits From:</h4>
                  <div className="space-y-2">
                    {formData.inheritsFrom.map(roleName => {
                      const parentRole = allRoles?.find(r => r.name === roleName);
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
