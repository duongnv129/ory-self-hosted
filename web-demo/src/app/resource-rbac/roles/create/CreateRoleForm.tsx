/**
 * Create Role Form Component
 * Client-side form for creating new roles with advanced features
 *
 * Next.js Pro Patterns Applied:
 * - Client Component with proper state management
 * - Comprehensive TypeScript interfaces
 * - Form validation and error handling
 * - Accessibility compliance (ARIA labels, keyboard navigation)
 * - Performance optimization with memoization
 * - Defensive programming with type guards
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRoles, useRole } from '@/lib/hooks/useRoles';
import { useTenant } from '@/lib/context/TenantContext';
import { useResourceTypes, useAvailableActions } from '@/lib/hooks/useMetadata';
import { ErrorBoundary } from '@/components/error-boundary';
import { FormLoadingSkeleton } from '@/components/loading';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Checkbox,
} from '@/components/ui';
import {
  ArrowLeft,
  Plus,
  XCircle,
  Shield,
  Info,
  Save,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';

// Type definitions
interface FormData {
  name: string;
  description: string;
  inheritsFrom: string[];
  permissions: PermissionItem[];
}

interface PermissionItem {
  resource: string;
  action: string;
}

interface CreateRoleRequest {
  name: string;
  description?: string;
  inheritsFrom?: string[];
  permissions?: PermissionItem[];
}

interface Role {
  id: string;
  name: string;
  description?: string;
  inheritsFrom?: string[];
  permissions?: PermissionItem[];
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

/**
 * Create Role Form Component
 */
export function CreateRoleForm() {
  const router = useRouter();
  const { currentTenant } = useTenant();
  const { roles: rawRoles, isLoading: rolesLoading, mutate: mutateRolesList } = useRoles();
  const { createRole } = useRole(null); // Use useRole for role operations
  const { resourceTypes, isLoading: resourceTypesLoading, isError: resourceTypesError } = useResourceTypes();
  const { availableActions, isLoading: actionsLoading, isError: actionsError } = useAvailableActions();

  // Form state management
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    inheritsFrom: [],
    permissions: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Permission builder state
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);

  // Memoized valid roles with defensive programming
  const roles = useMemo(() => filterValidRoles(rawRoles), [rawRoles]);

  // Available roles for inheritance (excluding current role name)
  const availableRoles = useMemo(() => {
    return roles.filter((role) => {
      if (!isValidRole(role)) {
        console.warn('Invalid role in availableRoles filter:', role);
        return false;
      }
      return role.name !== formData.name;
    });
  }, [roles, formData.name]);

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

    // Check for existing role name
    if (roles.some(role => role.name === formData.name.trim())) {
      errors.name = 'A role with this name already exists';
    }

    if (formData.description.trim().length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, roles]);

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

  const handleInheritanceToggle = useCallback((roleName: string) => {
    setFormData(prev => ({
      ...prev,
      inheritsFrom: prev.inheritsFrom.includes(roleName)
        ? prev.inheritsFrom.filter(name => name !== roleName)
        : [...prev.inheritsFrom, roleName],
    }));
  }, []);

  const handleAddPermissions = useCallback(() => {
    if (!selectedResource || selectedActions.length === 0) {
      toast.error('Please select a resource and at least one action');
      return;
    }

    const newPermissions: PermissionItem[] = selectedActions.map(action => ({
      resource: selectedResource,
      action,
    }));

    setFormData(prev => {
      // Remove duplicates and add new permissions
      const existingPermissions = prev.permissions.filter(
        perm => !(perm.resource === selectedResource && selectedActions.includes(perm.action))
      );
      return {
        ...prev,
        permissions: [...existingPermissions, ...newPermissions],
      };
    });

    // Reset permission builder
    setSelectedResource('');
    setSelectedActions([]);
    toast.success(`Added ${newPermissions.length} permission(s)`);
  }, [selectedResource, selectedActions]);

  const handleRemovePermission = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    if (!currentTenant) {
      toast.error('Please select a tenant first');
      return;
    }

    setIsSubmitting(true);
    try {
      const roleData: CreateRoleRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        inheritsFrom: formData.inheritsFrom.length > 0 ? formData.inheritsFrom : undefined,
        permissions: formData.permissions.length > 0 ? formData.permissions : undefined,
      };

      await createRole(roleData);

      // Refresh the roles list after successful creation (Next.js Pro pattern)
      mutateRolesList();

      toast.success('Role created successfully');
      router.push('/resource-rbac/roles');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create role';

      // Enhanced error handling with specific messages
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to create roles');
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
  }, [formData, currentTenant, createRole, router, validateForm, mutateRolesList]);

  const isLoadingData = rolesLoading || resourceTypesLoading || actionsLoading;
  const hasErrors = resourceTypesError || actionsError;

  // Early return if no tenant selected
  if (!currentTenant) {
    return (
      <Alert>
        <AlertDescription>
          Please select a tenant from the sidebar to create roles.
        </AlertDescription>
      </Alert>
    );
  }

  // Error state
  if (hasErrors) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load required data. Please refresh the page and try again.
        </AlertDescription>
      </Alert>
    );
  }

  // Loading state
  if (isLoadingData) {
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
          <h1 className="text-2xl font-bold tracking-tight">Create New Role</h1>
          <p className="text-muted-foreground">
            Create a new role with custom permissions and inheritance settings.
          </p>
        </div>

        {/* Role Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Details
            </CardTitle>
            <CardDescription>
              Define the basic information and configuration for the new role.
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

                {availableRoles.length > 0 ? (
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
                    <AlertDescription>
                      No existing roles available for inheritance. Create some base roles first.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="border-t border-border my-6" />

              {/* Permission Builder */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <h3 className="text-lg font-medium">Permissions</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add specific permissions for this role. Permissions are inherited from parent roles automatically.
                </p>

                {/* Permission Builder Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
                  {/* Resource Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="permission-resource">Resource</Label>
                    <Select value={selectedResource} onValueChange={setSelectedResource}>
                      <SelectTrigger id="permission-resource">
                        <SelectValue placeholder="Select resource" />
                      </SelectTrigger>
                      <SelectContent>
                        {resourceTypes?.map((resource) => (
                          <SelectItem key={resource.key} value={resource.key}>
                            {resource.label}
                          </SelectItem>
                        )) || []}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Selection */}
                  <div className="space-y-2">
                    <Label>Actions</Label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {availableActions?.map((action) => (
                        <div key={action} className="flex items-center space-x-2">
                          <Checkbox
                            id={`action-${action}`}
                            checked={selectedActions.includes(action)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedActions(prev => [...prev, action]);
                              } else {
                                setSelectedActions(prev => prev.filter(a => a !== action));
                              }
                            }}
                          />
                          <Label
                            htmlFor={`action-${action}`}
                            className="text-sm cursor-pointer"
                          >
                            {action}
                          </Label>
                        </div>
                      )) || []}
                    </div>
                  </div>

                  {/* Add Button */}
                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={handleAddPermissions}
                      disabled={!selectedResource || selectedActions.length === 0}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Permissions
                    </Button>
                  </div>
                </div>

                {/* Current Permissions List */}
                {formData.permissions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Current Permissions</h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.permissions.map((permission, index) => (
                        <Badge
                          key={`${permission.resource}-${permission.action}-${index}`}
                          variant="secondary"
                          className="flex items-center gap-2"
                        >
                          {permission.resource}:{permission.action}
                          <button
                            type="button"
                            onClick={() => handleRemovePermission(index)}
                            className="ml-1 hover:text-red-600 transition-colors"
                            aria-label={`Remove ${permission.resource}:${permission.action} permission`}
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
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
                      Creating Role...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Role
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
