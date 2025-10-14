/**
 * Resource-Scoped Roles Management Page
 * Full CRUD interface for managing tenant + resource-scoped roles
 *
 * Next.js Pro Patterns Applied:
 * - Client Component with proper state management
 * - TypeScript interfaces for all props and data
 * - Error handling with user-friendly messages
 * - Optimistic updates with SWR
 * - Component separation and composition
 * - Performance optimized with proper memoization
 *
 * Architecture:
 * - Roles are assigned per resource type: tenant:a#product:items#admin
 * - Same user can have different roles per resource: Alice = admin(products), moderator(categories)
 * - Complete tenant isolation: tenant:a roles ≠ tenant:b roles
 * - Backend sync with Keto for permission tuples
 *
 * API Integration:
 * - Routes through Oathkeeper (resource-rbac-roles-rule)
 * - Backend: multi-tenancy-demo/src/routes/resource_rbac_role.ts
 * - Automatically includes tenant context via x-tenant-id header
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useResourceRoles } from '@/lib/hooks/useResourceRoles';
import { useTenant } from '@/lib/context/TenantContext';
import { useResourceTypes, useAvailableActions } from '@/lib/hooks/useMetadata';
import { ErrorBoundary } from '@/components/error-boundary';
import { TableLoadingSkeleton, DataLoading } from '@/components/loading';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
} from '@/components/ui';
import {
  Plus,
  AlertCircle,
  Shield,
  Building,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Role } from '@/lib/types/models';
import type { CreateRoleRequest, UpdateRoleRequest } from '@/lib/types/api';

// Component imports
import {
  RolesTable,
  RoleDialog,
  RoleViewDialog,
  RoleDeleteDialog,
} from './components';

type DialogMode = 'create' | 'edit' | 'delete' | 'view' | null;

// Type guards for data validation - Next.js Pro defensive programming
const isValidRole = (role: unknown): role is Role => {
  return (
    typeof role === 'object' &&
    role !== null &&
    'name' in role &&
    typeof (role as Record<string, unknown>).name === 'string' &&
    ((role as Record<string, unknown>).name as string).length > 0
  );
};

/**
 * Safe role filtering with comprehensive validation
 * Implements Next.js Pro error handling patterns
 */
const filterValidRoles = (roles: unknown): Role[] => {
  if (!Array.isArray(roles)) {
    console.warn('Expected roles array but received:', typeof roles);
    return [];
  }

  return roles.filter((role): role is Role => {
    if (!isValidRole(role)) {
      console.warn('Invalid role object detected:', role);
      return false;
    }
    return true;
  });
};

/**
 * Resource Roles Page Component
 * Handles role management with complete CRUD operations
 */
export default function ResourceRolesPage() {
  return (
    <ErrorBoundary
      showDetails={true}
      onError={(error, errorInfo) => {
        console.error('ResourceRolesPage Error:', error);
        console.error('Component Stack:', errorInfo.componentStack);
        // In production, send to monitoring service
      }}
    >
      <ResourceRolesPageContent />
    </ErrorBoundary>
  );
}

function ResourceRolesPageContent() {
  const { currentTenant } = useTenant();
  const {
    roles: rawRoles,
    isLoading,
    isError,
    error,
    refresh,
    createRole,
    updateRole,
    deleteRole,
    getRoleWithPermissions,
  } = useResourceRoles();

  // Fetch resource types and actions from API
  const { resourceTypes, isLoading: resourceTypesLoading, isError: resourceTypesError } = useResourceTypes();
  const { availableActions, isLoading: actionsLoading, isError: actionsError } = useAvailableActions();

  // Apply defensive programming - validate and filter roles
  const roles = useMemo(() => filterValidRoles(rawRoles), [rawRoles]);

  // Dialog state management
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  // Form state for role creation/editing
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    inheritsFrom: [] as string[],
    permissions: [] as Array<{ resource: string; action: string }>,
  });

  // Memoized available roles for inheritance (excluding current role)
  // Now using validated roles with proper error handling
  const availableRoles = useMemo(() => {
    if (!Array.isArray(roles)) {
      console.warn('Roles is not an array:', roles);
      return [];
    }

    return roles.filter((role) => {
      // Additional safety check
      if (!isValidRole(role)) {
        console.warn('Invalid role in availableRoles filter:', role);
        return false;
      }
      return role.name !== formData.name;
    });
  }, [roles, formData.name]);

  // Dialog handlers with useCallback for performance
  const openCreateDialog = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      inheritsFrom: [],
      permissions: [],
    });
    setSelectedRole(null);
    setDialogMode('create');
  }, []);

  const openEditDialog = useCallback(async (role: Role) => {
    try {
      // Validate input role object
      if (!role || !role.name) {
        throw new Error('Invalid role object provided');
      }

      // Set initial form data immediately for better UX
      setFormData({
        name: role.name,
        description: role.description || '',
        inheritsFrom: Array.isArray(role.inheritsFrom) ? role.inheritsFrom : [],
        permissions: [], // Will be loaded from API
      });
      setSelectedRole(role);
      setDialogMode('edit');
      setIsLoadingPermissions(true);

      // Fetch current permissions from backend
      const { permissions } = await getRoleWithPermissions(role.name);

      // Update form data with loaded permissions (defensive programming)
      setFormData(prev => ({
        ...prev,
        permissions: Array.isArray(permissions) ? permissions : [],
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load role permissions';
      console.error('Error loading role permissions:', error);
      toast.error(`Failed to load permissions: ${errorMessage}`);

      // Still allow editing with empty permissions as fallback
      setFormData(prev => ({
        ...prev,
        permissions: [],
      }));
    } finally {
      setIsLoadingPermissions(false);
    }
  }, [getRoleWithPermissions]);

  const openViewDialog = useCallback((role: Role) => {
    setSelectedRole(role);
    setDialogMode('view');
  }, []);

  const openDeleteDialog = useCallback((role: Role) => {
    setSelectedRole(role);
    setDialogMode('delete');
  }, []);

  const closeDialog = useCallback(() => {
    setDialogMode(null);
    setSelectedRole(null);
    setFormData({
      name: '',
      description: '',
      inheritsFrom: [],
      permissions: [],
    });
  }, []);

  // CRUD operation handlers with proper error handling
  const handleCreate = useCallback(async () => {
    if (!formData.name?.trim()) {
      toast.error('Role name is required');
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
      toast.success('Role created successfully');
      closeDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create role';

      // Enhanced error handling with specific messages
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to create roles');
      } else if (errorMessage.includes('already exists') || errorMessage.includes('conflict')) {
        toast.error('Role with this name already exists');
      } else if (errorMessage.includes('400') || errorMessage.includes('validation')) {
        toast.error('Invalid role data provided');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, currentTenant, createRole, closeDialog]);

  const handleUpdate = useCallback(async () => {
    if (!selectedRole) return;

    if (!currentTenant) {
      toast.error('Please select a tenant first');
      return;
    }

    setIsSubmitting(true);
    try {
      const roleData: UpdateRoleRequest = {
        description: formData.description.trim() || undefined,
        inheritsFrom: formData.inheritsFrom.length > 0 ? formData.inheritsFrom : undefined,
        permissions: formData.permissions.length > 0 ? formData.permissions : undefined,
      };

      await updateRole(selectedRole.name, roleData);
      toast.success('Role updated successfully');
      closeDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update role';

      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to update roles');
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        toast.error('Role not found');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedRole, formData, currentTenant, updateRole, closeDialog]);

  const handleDelete = useCallback(async () => {
    if (!selectedRole) return;

    if (!currentTenant) {
      toast.error('Please select a tenant first');
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteRole(selectedRole.name);
      toast.success('Role deleted successfully');
      closeDialog();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete role';

      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('Access denied: You do not have permission to delete roles');
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        toast.error('Role not found');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedRole, currentTenant, deleteRole, closeDialog]);

  // Early return for no tenant selected - following Next.js Pro patterns
  if (!currentTenant) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a tenant from the sidebar to manage roles.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              What are Resource-Scoped Roles?
            </CardTitle>
            <CardDescription>
              Fine-grained authorization model with per-resource role assignments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Key Concept:</h4>
              <p className="text-sm text-muted-foreground">
                Users can have <strong>different roles for different resource types</strong> within the same tenant.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Example:</h4>
              <p className="text-sm text-muted-foreground">
                Alice can be <span className="font-medium">admin</span> for products,
                <span className="font-medium"> moderator</span> for categories, and
                <span className="font-medium"> viewer</span> for users.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state handling for roles
  if (isError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load roles'}
          </AlertDescription>
        </Alert>
        <Card>
          <CardContent className="pt-6">
            <Button onClick={() => refresh()} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state handling for metadata
  if (resourceTypesError || actionsError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load resource metadata. Please try refreshing the page.
          </AlertDescription>
        </Alert>
        <Card>
          <CardContent className="pt-6">
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  const isLoadingData = isLoading || resourceTypesLoading || actionsLoading;

  return (
    <div className="space-y-6">
      {/* Tenant Context Info */}
      <Alert>
        <div className="flex items-center gap-2">
          {currentTenant ? (
            <>
              <Building className="h-4 w-4" />
              <span>Managing roles for tenant: <strong>{currentTenant}</strong></span>
            </>
          ) : (
            <>
              <Globe className="h-4 w-4" />
              <span>Global context</span>
            </>
          )}
        </div>
      </Alert>

      {/* Main Roles Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles
              </CardTitle>
              <CardDescription>
                Manage roles with resource-level permissions and inheritance for {currentTenant}
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog} disabled={!currentTenant}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataLoading
            isLoading={isLoadingData}
            isError={isError || resourceTypesError || actionsError}
            error={isError ? new Error('Failed to load roles') : undefined}
            onRetry={() => {
              refresh();
              // Additional retry logic if needed
            }}
            loadingText="Loading roles..."
            errorTitle="Failed to load roles"
            skeleton={<TableLoadingSkeleton />}
          >
            <RolesTable
              roles={roles || []}
              currentTenant={currentTenant}
              onView={openViewDialog}
              onEdit={openEditDialog}
              onDelete={openDeleteDialog}
            />
          </DataLoading>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <RoleDialog
        mode={dialogMode === 'create' ? 'create' : dialogMode === 'edit' ? 'edit' : null}
        isOpen={dialogMode === 'create' || dialogMode === 'edit'}
        onClose={closeDialog}
        formData={formData}
        setFormData={setFormData}
        availableRoles={availableRoles}
        resourceTypes={resourceTypes || []}
        availableActions={availableActions || []}
        onSubmit={dialogMode === 'create' ? handleCreate : handleUpdate}
        isSubmitting={isSubmitting}
        isLoadingPermissions={isLoadingPermissions}
        currentTenant={currentTenant}
      />

      <RoleViewDialog
        isOpen={dialogMode === 'view'}
        onClose={closeDialog}
        role={selectedRole}
        currentTenant={currentTenant}
        onEdit={() => {
          if (selectedRole) {
            closeDialog();
            setTimeout(() => openEditDialog(selectedRole), 100);
          }
        }}
      />

      <RoleDeleteDialog
        isOpen={dialogMode === 'delete'}
        onClose={closeDialog}
        role={selectedRole}
        currentTenant={currentTenant}
        onConfirm={handleDelete}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
