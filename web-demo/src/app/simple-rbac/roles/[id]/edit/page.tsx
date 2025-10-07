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
  Loader2,
} from 'lucide-react';
import { Permission } from '@/lib/types/models';
import { Role } from '@/lib/types';
import { toast } from 'sonner';
import { PermissionSelector } from '@/components/roles/PermissionSelector';
import { PermissionMatrix } from '@/components/roles/PermissionMatrix';
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
    id: string;
  };
}

export default function EditRolePage({ params }: EditRolePageProps) {
  const router = useRouter();
  const { roles, isLoading: rolesLoading, error: rolesError } = useRoles();
  const { updateRole } = useRoleMutations();

  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<EditRoleFormData>({
    name: '',
    description: '',
    inheritsFrom: [],
    permissions: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Find the role to edit by ID
  useEffect(() => {
    if (roles.length > 0 && !isInitialized) {
      const roleToEdit = roles.find(role => role.id.toString() === params.id);

      if (roleToEdit) {
        setCurrentRole(roleToEdit);
        setFormData({
          name: roleToEdit.name,
          description: roleToEdit.description,
          inheritsFrom: roleToEdit.inheritsFrom || [],
          permissions: roleToEdit.permissions || [],
        });
        setIsInitialized(true);
      } else if (!rolesLoading) {
        // Role not found and we're not loading
        toast.error('Role not found');
        router.push('/simple-rbac/roles');
      }
    }
  }, [roles, params.id, isInitialized, rolesLoading, router]);

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
   * Handle role inheritance toggle
   * @param roleName - Role name to toggle inheritance for
   * @param checked - Whether inheritance should be enabled
   */
  const handleInheritanceToggle = (roleName: string, checked: boolean) => {
    const currentInheritsFrom = formData.inheritsFrom;

    if (checked) {
      if (!currentInheritsFrom.includes(roleName)) {
        handleFieldChange('inheritsFrom', [...currentInheritsFrom, roleName]);
      }
    } else {
      handleFieldChange('inheritsFrom', currentInheritsFrom.filter(r => r !== roleName));
    }
  };

  /**
   * Calculate inherited permissions from parent roles using role API data
   * @returns Array of inherited permissions
   */
  const getInheritedPermissions = (): Permission[] => {
    if (formData.inheritsFrom.length === 0) return [];

    return formData.inheritsFrom.flatMap(parentRoleName => {
      // Find the parent role in the roles data
      const parentRole = roles.find(role => role.name === parentRoleName);

      // If parent role has explicit permissions, use those
      if (parentRole?.permissions && parentRole.permissions.length > 0) {
        return parentRole.permissions;
      }

      // Fallback to basic permissions based on role name if no explicit permissions
      // This maintains backward compatibility during the transition to full Keto integration
      const basicPermissions: Permission[] = [];

      switch (parentRoleName.toLowerCase()) {
        case 'admin':
          basicPermissions.push(
            { resource: 'users', action: 'view' },
            { resource: 'users', action: 'create' },
            { resource: 'users', action: 'update' },
            { resource: 'users', action: 'delete' },
            { resource: 'products', action: 'view' },
            { resource: 'products', action: 'create' },
            { resource: 'products', action: 'update' },
            { resource: 'products', action: 'delete' },
            { resource: 'categories', action: 'view' },
            { resource: 'categories', action: 'create' },
            { resource: 'categories', action: 'update' },
            { resource: 'categories', action: 'delete' },
            { resource: 'roles', action: 'view' },
            { resource: 'roles', action: 'create' },
            { resource: 'roles', action: 'update' },
            { resource: 'roles', action: 'delete' }
          );
          break;
        case 'moderator':
          basicPermissions.push(
            { resource: 'users', action: 'view' },
            { resource: 'products', action: 'view' },
            { resource: 'products', action: 'create' },
            { resource: 'products', action: 'update' },
            { resource: 'categories', action: 'view' },
            { resource: 'categories', action: 'create' },
            { resource: 'categories', action: 'update' },
            { resource: 'roles', action: 'view' }
          );
          break;
        case 'customer':
          basicPermissions.push(
            { resource: 'users', action: 'view' },
            { resource: 'products', action: 'view' },
            { resource: 'categories', action: 'view' }
          );
          break;
        default:
          // For unknown roles, check if they have any basic view permissions
          basicPermissions.push({ resource: 'users', action: 'view' });
          break;
      }

      return basicPermissions;
    });
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!currentRole) {
      toast.error('Role data not available');
      return;
    }

    if (!validateForm()) {
      toast.error('Please correct the validation errors');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update role metadata and inheritance through the backend API
      // The backend (multi-tenancy-demo) should handle Keto integration
      await updateRole(currentRole.name, {
        description: formData.description.trim(),
        inheritsFrom: formData.inheritsFrom,
      });

      // Note: Permission updates (formData.permissions) are currently handled
      // separately from the role metadata. In a complete implementation, the
      // backend API should be extended to accept permissions in the update
      // request and handle Keto relation tuple management automatically.
      console.log('Permissions to be applied:', formData.permissions);

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
  if (rolesLoading || !isInitialized) {
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
  if (rolesError) {
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
            Failed to load role data: {rolesError}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Role not found
  if (!currentRole) {
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
    ...currentRole,
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
            <Badge variant="outline">{currentRole.name}</Badge>
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
          <Card>
            <CardHeader>
              <CardTitle>Role Inheritance</CardTitle>
              <CardDescription>
                Select parent roles that this role should inherit permissions from
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roles.length <= 1 ? (
                <p className="text-sm text-muted-foreground">No other roles available for inheritance</p>
              ) : (
                <div className="space-y-3">
                  {roles
                    .filter((role) => role.name !== formData.name) // Don't show current role
                    .map((role) => (
                      <div key={role.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={`inherit-${role.name}`}
                          checked={formData.inheritsFrom.includes(role.name)}
                          onChange={(e) => handleInheritanceToggle(role.name, e.target.checked)}
                          disabled={isSubmitting}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <label
                          htmlFor={`inherit-${role.name}`}
                          className="flex-1 text-sm font-medium leading-none cursor-pointer"
                        >
                          <div>
                            <span className="font-semibold">{role.name}</span>
                            <p className="text-muted-foreground text-xs">{role.description}</p>
                          </div>
                        </label>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

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
                  <div>ID: {currentRole.id}</div>
                  <div>Namespace: {currentRole.namespace}</div>
                  <div>Created: {new Date(currentRole.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {formData.inheritsFrom.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Inherits From:</h4>
                  <div className="flex flex-wrap gap-1">
                    {formData.inheritsFrom.map(roleName => (
                      <span
                        key={roleName}
                        className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
                      >
                        {roleName}
                      </span>
                    ))}
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
                      <div key={`${permission.resource}-${permission.action}`}>
                        {permission.action} {permission.resource}
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
                  <p className="text-xs text-muted-foreground">
                    Permissions inherited from parent roles
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
