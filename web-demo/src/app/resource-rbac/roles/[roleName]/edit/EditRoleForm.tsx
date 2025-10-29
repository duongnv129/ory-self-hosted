/**
 * Edit Role Form Component
 * Client-side form for editing existing roles with advanced features
 *
 * Next.js Pro Patterns Applied:
 * - Client Component with proper state management
 * - Pre-population from existing role data
 * - Comprehensive TypeScript interfaces
 * - Form validation and error handling
 * - Accessibility compliance (ARIA labels, keyboard navigation)
 * - Performance optimization with memoization
 * - Defensive programming with type guards
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRoles, useRole } from '@/lib/hooks/useRoles';
import { useTenant } from '@/lib/context/TenantContext';
import { useResourceTypes, useAvailableActions } from '@/lib/hooks/useMetadata';
import { ErrorBoundary } from '@/components/error-boundary';
import { FormLoadingSkeleton } from '@/components/loading';
import { Permission, ResourceUtils } from '@/lib/types/models'; // Import centralized Permission type and ResourceUtils
import { UpdateRoleRequest as ApiUpdateRoleRequest } from '@/lib/types/api'; // Import API types
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
  Checkbox,
} from '@/components/ui';
import {
  ArrowLeft,
  Plus,
  Shield,
  Info,
  Save,
  Building,
  Check,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Type definitions
interface FormData {
  name: string;
  description: string;
  resource: string; // Resource this role applies to (e.g., "product", "category")
  inheritsFrom: string[];
  permissions: Permission[]; // Use centralized Permission type
}

// Use ApiUpdateRoleRequest directly instead of local definition
type UpdateRoleRequest = ApiUpdateRoleRequest;

interface Role {
  id: string;
  name: string;
  description?: string;
  resource?: string; // Resource this role applies to (e.g., "product", "category")
  inheritsFrom?: string[];
  permissions?: Permission[]; // Use centralized Permission type
  tenantId?: string;
}

// Type guards
const isValidRole = (role: unknown): role is Role => {
  return (
    typeof role === 'object' &&
    role !== null &&
    'id' in role &&
    'name' in role &&
    typeof (role as Role).id === 'string' &&
    typeof (role as Role).name === 'string'
  );
};

const filterValidRoles = (roles: unknown[]): Role[] => {
  return roles.filter(isValidRole);
};

interface EditRoleFormProps {
  roleName: string;
}

/**
 * Edit Role Form Component
 */
export function EditRoleForm({ roleName }: EditRoleFormProps) {
  const router = useRouter();
  const { currentTenant } = useTenant();
  const { roles: rawRoles, isLoading: rolesLoading, mutate: mutateRolesList } = useRoles();
  const {
    role: currentRole,
    permissions: currentPermissions,
    updateRole,
    isLoading: roleLoading,
    isError: roleError,
    mutate: refreshRole // Next.js Pro Pattern: Expose refresh capability
  } = useRole(roleName);
  const { resourceTypes, isLoading: resourceTypesLoading, isError: resourceTypesError } = useResourceTypes();
  const { availableActions, isLoading: actionsLoading, isError: actionsError } = useAvailableActions();

  // Form state management
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    resource: 'product', // Default to product (simple name)
    inheritsFrom: [],
    permissions: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Memoized valid roles with defensive programming
  const roles = useMemo(() => filterValidRoles(rawRoles), [rawRoles]);

  // Available roles for inheritance (excluding current role)
  const availableRoles = useMemo(() => {
    return roles.filter((role) => {
      if (!isValidRole(role)) {
        console.warn('Invalid role in availableRoles filter:', role);
        return false;
      }
      return role.name !== roleName;
    });
  }, [roles, roleName]);

  // Initialize form data when role is loaded - Next.js Pro Pattern: Single Effect with Proper Dependencies
  useEffect(() => {
    // Only initialize if we have both role and permissions data, and haven't initialized yet
    if (currentRole && currentPermissions !== undefined && !isInitialized && !roleLoading) {
      console.log('🔄 Initializing form with role data:', {
        roleName: currentRole.name,
        permissionsCount: currentPermissions.length,
        permissions: currentPermissions
      });

      setFormData({
        name: currentRole.name,
        description: currentRole.description || '',
        resource: currentRole.resource || 'product', // Initialize resource from role data
        inheritsFrom: currentRole.inheritsFrom || [],
        permissions: Array.isArray(currentPermissions) ? currentPermissions : [], // Defensive programming
      });
      setIsInitialized(true);
    }
  }, [currentRole, currentPermissions, isInitialized, roleLoading]);

  // Reset initialization flag when role name changes - Next.js Pro Pattern: Proper Cleanup
  useEffect(() => {
    setIsInitialized(false);
    setFormData({
      name: '',
      description: '',
      resource: 'product', // Default resource on reset
      inheritsFrom: [],
      permissions: [],
    });
  }, [roleName]);

  // Debug effect to track role loading state - Next.js Pro Pattern: Comprehensive Logging
  useEffect(() => {
    console.log('🔍 EditRoleForm Debug State:', {
      roleName,
      roleLoading,
      roleError: roleError ? String(roleError) : null,
      currentRole: currentRole ? {
        name: currentRole.name,
        id: currentRole.id,
        description: currentRole.description,
        inheritsFrom: currentRole.inheritsFrom
      } : null,
      currentPermissions: currentPermissions ? {
        count: currentPermissions.length,
        details: currentPermissions
      } : 'undefined',
      isInitialized,
      formDataPermissions: formData.permissions.length
    });
  }, [roleName, roleLoading, currentRole, currentPermissions, roleError, isInitialized, formData.permissions.length]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Role name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Role name must be at least 2 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.name.trim())) {
      errors.name = 'Role name can only contain letters, numbers, hyphens, and underscores';
    }

    // Check for existing role name (excluding current role)
    if (formData.name !== roleName && roles.some(role => role.name === formData.name.trim())) {
      errors.name = 'A role with this name already exists';
    }

    if (formData.description.trim().length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, roles, roleName]);

  // Form handlers
  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [formErrors]);

  const handleInheritanceToggle = useCallback((roleNameToToggle: string) => {
    console.log('🔄 Role inheritance toggle (edit):', {
      roleNameToToggle,
      currentInheritance: formData.inheritsFrom,
      isCurrentlySelected: formData.inheritsFrom.includes(roleNameToToggle),
    });

    setFormData(prev => {
      const newInheritsFrom = prev.inheritsFrom.includes(roleNameToToggle)
        ? prev.inheritsFrom.filter(name => name !== roleNameToToggle)
        : [...prev.inheritsFrom, roleNameToToggle];

      console.log('✅ Updated inheritance (edit):', {
        before: prev.inheritsFrom,
        after: newInheritsFrom,
        action: prev.inheritsFrom.includes(roleNameToToggle) ? 'removed' : 'added',
      });

      return {
        ...prev,
        inheritsFrom: newInheritsFrom,
      };
    });
  }, [formData.inheritsFrom]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    if (!currentTenant) {
      toast.error('Please select a tenant first');
      return;
    }

    if (!currentRole) {
      toast.error('Role not found');
      return;
    }

    setIsSubmitting(true);
    try {
      const roleData: UpdateRoleRequest = {
        description: formData.description.trim() || undefined,
        resource: formData.resource, // Include resource in update request
        inheritsFrom: formData.inheritsFrom.length > 0 ? formData.inheritsFrom : undefined,
        permissions: formData.permissions.length > 0 ? formData.permissions : undefined,
      };

      console.log('🚀 Updating role with data:', {
        roleName,
        roleData,
        formDataInheritsFrom: formData.inheritsFrom,
        inheritanceLength: formData.inheritsFrom.length,
      });

      await updateRole(roleName, roleData);

      // Refresh the roles list after successful update (Next.js Pro pattern)
      mutateRolesList();

      toast.success('Role updated successfully');
      router.push('/resource-rbac/roles');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update role';

      // Enhanced error handling with specific messages
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to update roles');
      } else if (errorMessage.includes('already exists') || errorMessage.includes('conflict')) {
        toast.error('Role with this name already exists');
        setFormErrors({ name: 'Role with this name already exists' });
      } else if (errorMessage.includes('400') || errorMessage.includes('validation')) {
        toast.error('Invalid role data provided');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, currentTenant, currentRole, updateRole, router, validateForm, mutateRolesList, roleName]);

  const isLoadingData = rolesLoading || resourceTypesLoading || actionsLoading || roleLoading;
  const hasErrors = resourceTypesError || actionsError || roleError;

  // Next.js Pro Pattern: Comprehensive Loading States
  const isDataReady = !isLoadingData && currentRole && currentPermissions !== undefined;
  const shouldShowForm = isDataReady && isInitialized;

  // Early return if no tenant selected
  if (!currentTenant) {
    return (
      <Alert>
        <AlertDescription>
          Please select a tenant from the sidebar to edit roles.
        </AlertDescription>
      </Alert>
    );
  }

  // Error state - Next.js Pro Pattern: Early Returns for Clean Code
  if (hasErrors) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load required data. Please refresh the page and try again.
          {roleError && <div className="mt-2 text-sm">Error: {String(roleError)}</div>}
        </AlertDescription>
      </Alert>
    );
  }

  // Loading state - Next.js Pro Pattern: Comprehensive Loading States
  if (isLoadingData || !isDataReady) {
    return <FormLoadingSkeleton />;
  }

  // Role not found - Next.js Pro Pattern: Better Error Handling
  if (!roleLoading && !currentRole && isDataReady) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/resource-rbac/roles"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Roles
          </Link>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Role Not Found</h1>
          <p className="text-muted-foreground">
            The requested role &quot;{roleName}&quot; could not be found.
          </p>
        </div>

        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>Role &quot;{roleName}&quot; not found.</p>
            <p className="text-sm">
              Available roles can be viewed on the{' '}
              <Link
                href="/resource-rbac/roles"
                className="font-medium underline underline-offset-4 hover:no-underline"
              >
                roles page
              </Link>
              . You can also create a new role with this name.
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button
            onClick={() => router.push('/resource-rbac/roles')}
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            View All Roles
          </Button>
          <Button
            onClick={() => router.push('/resource-rbac/roles/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create &quot;{roleName}&quot; Role
          </Button>
        </div>
      </div>
    );
  }

  // Next.js Pro Pattern: Show form only when data is ready and form is initialized
  if (!shouldShowForm) {
    return <FormLoadingSkeleton />;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/resource-rbac/roles"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Roles
          </Link>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Edit Role: {roleName}</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshRole()}
              disabled={roleLoading}
              className="ml-auto"
            >
              {roleLoading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
          <p className="text-muted-foreground">
            Modify permissions and inheritance settings for this role.
          </p>
        </div>

        {/* Role Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Details
              {/* Debug Info - Next.js Pro Pattern: Development Aids */}
              {process.env.NODE_ENV === 'development' && (
                <Badge variant="outline" className="ml-auto text-xs">
                  Permissions: {formData.permissions.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Update the basic information and configuration for this role.
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Debug: Role loaded with {currentPermissions?.length || 0} permissions,
                  form initialized: {isInitialized ? 'Yes' : 'No'}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name" className="required">
                    Role Name
                  </Label>
                  <Input
                    id="role-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter role name (e.g., admin, editor, viewer)"
                    aria-describedby={formErrors.name ? "role-name-error" : undefined}
                    className={formErrors.name ? "border-red-500" : ""}
                    maxLength={50}
                    autoComplete="off"
                  />
                  {formErrors.name && (
                    <p
                      id="role-name-error"
                      className="text-sm text-red-600"
                      role="alert"
                    >
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-description">Description</Label>
                  <textarea
                    id="role-description"
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                    placeholder="Optional description of the role's purpose"
                    rows={3}
                    aria-describedby={formErrors.description ? "role-description-error" : undefined}
                    className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${formErrors.description ? "border-red-500" : ""}`}
                  />
                  {formErrors.description && (
                    <p
                      id="role-description-error"
                      className="text-sm text-red-600"
                      role="alert"
                    >
                      {formErrors.description}
                    </p>
                  )}
                </div>

                {/* Resource Selector */}
                <div className="space-y-2">
                  <Label htmlFor="role-resource">
                    Resource <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="role-resource"
                    value={formData.resource}
                    onChange={(e) => handleInputChange('resource', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    {resourceTypesLoading ? (
                      <option value="">Loading resources...</option>
                    ) : resourceTypesError ? (
                      <option value="">Error loading resources</option>
                    ) : (
                      resourceTypes.map((rt) => (
                        <option key={rt.key} value={rt.key}>
                          {rt.label}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-sm text-muted-foreground">
                    Select the resource this role applies to. Roles are scoped per resource.
                  </p>
                </div>
              </div>

              <div className="border-t border-border my-6" />

              {/* Role Inheritance Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <h3 className="text-lg font-medium">Role Inheritance</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select parent roles that this role should inherit permissions from.
                </p>

                {/* Debug Information (Development Only) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs bg-gray-100 p-2 rounded border">
                    <strong>Debug Info:</strong><br />
                    Current Tenant: {currentTenant || 'None'}<br />
                    Available Roles Count: {availableRoles.length}<br />
                    Roles Loading: {rolesLoading ? 'Yes' : 'No'}<br />
                    Roles Error: {roleError ? 'Yes' : 'No'}<br />
                    Current Role: {roleName}
                  </div>
                )}

                {rolesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading existing roles...</p>
                    </div>
                  </div>
                ) : roleError ? (
                  <Alert variant="destructive">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Failed to load existing roles. Please refresh the page and try again.
                    </AlertDescription>
                  </Alert>
                ) : availableRoles.length > 0 ? (
                  <div className="grid gap-3">
                    {availableRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`inherit-${role.id}`}
                          checked={formData.inheritsFrom.includes(role.name)}
                          onCheckedChange={() => handleInheritanceToggle(role.name)}
                          aria-describedby={`inherit-${role.id}-description`}
                        />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={`inherit-${role.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {role.name}
                          </Label>
                          {role.description && (
                            <p
                              id={`inherit-${role.id}-description`}
                              className="text-xs text-muted-foreground"
                            >
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="space-y-3">
                      <p>No other roles available for inheritance.</p>
                      <div className="text-sm space-y-2">
                        {!currentTenant ? (
                          <p>Please select a tenant from the sidebar to view tenant-specific roles.</p>
                        ) : availableRoles.length === 0 && roles.length <= 1 ? (
                          <div className="space-y-2">
                            <p>This appears to be your first role in the <strong>{currentTenant}</strong> tenant.</p>
                            <p>To set up role inheritance relationships:</p>
                            <ol className="list-decimal list-inside space-y-1 ml-2">
                              <li>Create additional base roles (e.g., &quot;viewer&quot;, &quot;editor&quot;)</li>
                              <li>Return to edit this role to inherit from those base roles</li>
                              <li>Or create specialized roles that inherit from this one</li>
                            </ol>
                          </div>
                        ) : (
                          <p>All available roles are either the current role or already related.</p>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2">
                        {currentTenant && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => mutateRolesList()}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Refresh Roles
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push('/resource-rbac/roles/create')}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Create New Role
                            </Button>
                          </>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="border-t border-border my-6" />

              {/* Permission Builder */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <h3 className="text-lg font-medium">Select Permissions</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Choose specific permissions for this role
                </p>

                {/* Permission Selection - Advanced UI */}
                <div className="space-y-4">
                  {/* Summary Header */}
                  <div className="flex gap-2 text-sm">
                    {formData.permissions.length === 0 ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        No permissions selected
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        {formData.permissions.length} permission{formData.permissions.length !== 1 ? 's' : ''} selected
                      </Badge>
                    )}
                  </div>

                  {/* Resource Sections */}
                  {resourceTypes && resourceTypes.length > 0 ? (
                    <div className="space-y-4">
                      {resourceTypes.map((resourceType) => {
                        const resource = resourceType.key;
                        const selectedActionsForResource = availableActions?.filter((action) =>
                          formData.permissions.some(p => p.resource === resource && p.action === action)
                        ) || [];
                        const allActionsForResource = availableActions || [];
                        const allSelected = selectedActionsForResource.length === allActionsForResource.length && allActionsForResource.length > 0;
                        const someSelected = selectedActionsForResource.length > 0 && !allSelected;

                        return (
                          <div
                            key={resource}
                            className={cn(
                              "rounded-lg border transition-colors",
                              allSelected && "border-green-300 bg-green-50",
                              someSelected && "border-yellow-300 bg-yellow-50",
                              !someSelected && !allSelected && "border-gray-200"
                            )}
                          >
                            {/* Resource Header */}
                            <div className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className={cn(
                                      "h-6 w-6 p-0 transition-colors rounded border-2 flex items-center justify-center",
                                      allSelected && "bg-green-600 border-green-600",
                                      someSelected && "border-yellow-400 bg-yellow-100",
                                      !someSelected && !allSelected && "border-gray-300 hover:border-gray-400"
                                    )}
                                    onClick={() => {
                                      if (allSelected) {
                                        // Remove all permissions for this resource
                                        const updated = formData.permissions.filter(p => p.resource !== resource);
                                        setFormData(prev => ({ ...prev, permissions: updated }));
                                      } else {
                                        // Add all permissions for this resource
                                        const updated = formData.permissions.filter(p => p.resource !== resource);
                                        const newPermissions = ResourceUtils.createPermissions(
                                          (availableActions || []).map(action => ({
                                            resource,
                                            action,
                                          }))
                                        );
                                        setFormData(prev => ({ ...prev, permissions: [...updated, ...newPermissions] }));
                                      }
                                    }}
                                    title={allSelected ? "Deselect all" : someSelected ? "Select remaining" : "Select all"}
                                  >
                                    {allSelected ? (
                                      <Check className="h-3 w-3 text-white" />
                                    ) : someSelected ? (
                                      <Plus className="h-3 w-3 text-yellow-700" />
                                    ) : (
                                      <Plus className="h-3 w-3" />
                                    )}
                                  </button>
                                  <Label className="cursor-pointer font-medium capitalize">{resourceType.label}</Label>
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
                                      {allSelected ? "All permissions" : `${selectedActionsForResource.length}/${allActionsForResource.length} permissions`}
                                    </Badge>
                                  )}
                                  {selectedActionsForResource.length === 0 && (
                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                      No permissions
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions Grid */}
                            <div className="px-4 pb-4">
                              <div className="grid grid-cols-2 gap-2">
                                {availableActions?.map((action) => {
                                  const isSelected = formData.permissions.some(p => p.resource === resource && p.action === action);
                                  const getActionIcon = (action: string) => {
                                    switch (action) {
                                      case 'view': return Eye;
                                      case 'create': return Plus;
                                      case 'update': return Edit;
                                      case 'delete': return Trash2;
                                      default: return Shield;
                                    }
                                  };
                                  const getActionColor = (action: string) => {
                                    switch (action) {
                                      case 'view': return 'text-blue-600';
                                      case 'create': return 'text-green-600';
                                      case 'update': return 'text-yellow-600';
                                      case 'delete': return 'text-red-600';
                                      default: return 'text-gray-600';
                                    }
                                  };
                                  const ActionIcon = getActionIcon(action);
                                  const actionColor = getActionColor(action);

                                  return (
                                    <div
                                      key={action}
                                      className={cn(
                                        'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-200',
                                        isSelected && 'border-green-300 bg-green-50 shadow-sm',
                                        !isSelected && 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                                        'hover:shadow-sm'
                                      )}
                                      onClick={() => {
                                        if (isSelected) {
                                          // Remove permission
                                          const updated = formData.permissions.filter(
                                            p => !(p.resource === resource && p.action === action)
                                          );
                                          setFormData(prev => ({ ...prev, permissions: updated }));
                                        } else {
                                          // Add permission
                                          const newPermission = ResourceUtils.createPermission(resource, action);
                                          setFormData(prev => ({
                                            ...prev,
                                            permissions: [...prev.permissions, newPermission]
                                          }));
                                        }
                                      }}
                                      role="button"
                                      tabIndex={0}
                                      aria-label={`${isSelected ? 'Remove' : 'Add'} ${action} permission for ${resource}`}
                                    >
                                      <div className={cn(
                                        "flex items-center justify-center w-6 h-6 rounded border-2 transition-colors",
                                        isSelected && "bg-green-600 border-green-600",
                                        !isSelected && "border-gray-300 hover:border-gray-400"
                                      )}>
                                        {isSelected && <Check className="h-3 w-3 text-white" />}
                                      </div>
                                      <ActionIcon className={cn('h-4 w-4 flex-shrink-0', actionColor)} />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <Label className="cursor-pointer text-sm font-medium capitalize truncate">
                                            {action}
                                          </Label>
                                          {isSelected && (
                                            <Badge variant="outline" className="ml-2 text-xs text-green-700 border-green-300">
                                              Selected
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }) || []}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="font-medium text-lg mb-2">No Resources Available</h3>
                      <p className="text-sm text-muted-foreground">
                        No system resources are configured at this time.
                      </p>
                    </div>
                  )}

                  {/* Quick Actions */}
                  {resourceTypes && resourceTypes.length > 0 && (
                    <div className="flex gap-2 border-t pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => {
                          const allPermissions = ResourceUtils.createPermissions(
                            resourceTypes.flatMap((resourceType) =>
                              (availableActions || []).map((action) => ({
                                resource: resourceType.key,
                                action
                              }))
                            )
                          );
                          setFormData(prev => ({ ...prev, permissions: allPermissions }));
                        }}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, permissions: [] }))}
                      >
                        Clear All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => {
                          const viewPermissions = ResourceUtils.createPermissions(
                            resourceTypes.map((resourceType) => ({
                              resource: resourceType.key,
                              action: 'view',
                            }))
                          );
                          setFormData(prev => ({ ...prev, permissions: viewPermissions }));
                        }}
                      >
                        View Only
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border my-6" />

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                      Updating Role...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Role
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/resource-rbac/roles')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
