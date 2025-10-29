/**
 * Role Inheritance Debug Component
 * Development-only component to help debug role inheritance issues
 *
 * Next.js Pro Patterns Applied:
 * - Development-only component with conditional rendering
 * - Comprehensive state inspection
 * - User-friendly debugging interface
 * - Real-time data refresh capabilities
 */

'use client';

import { useRoles } from '@/lib/hooks/useRoles';
import { useTenant } from '@/lib/context/TenantContext';
import { useResourceTypes, useAvailableActions } from '@/lib/hooks/useMetadata';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Alert, AlertDescription } from '@/components/ui';
import { RefreshCw, Bug, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function RoleInheritanceDebug() {
  const { currentTenant, setTenant, clearTenant } = useTenant();
  const { roles, count, tenantId, namespace, isLoading, isError, error, mutate } = useRoles();
  const { resourceTypes, isLoading: resourceTypesLoading, isError: resourceTypesError } = useResourceTypes();
  const { availableActions, isLoading: actionsLoading, isError: actionsError } = useAvailableActions();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="border-2 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Bug className="h-5 w-5" />
          Role Inheritance Debug Panel
        </CardTitle>
        <CardDescription className="text-orange-700">
          Development-only debug information for role inheritance functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tenant Context Debug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-orange-800">Tenant Context</h4>
            <div className="bg-white p-3 rounded border text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Current Tenant:</span>
                <span className={`px-2 py-1 rounded ${currentTenant ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {currentTenant || 'None'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">API Tenant ID:</span>
                <span className="font-mono">{tenantId || 'Not set'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Namespace:</span>
                <span className="font-mono">{namespace || 'Not set'}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTenant('tech-corp')}
                  className="text-xs"
                >
                  Set Tech Corp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTenant('retail-inc')}
                  className="text-xs"
                >
                  Set Retail Inc
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => clearTenant()}
                  className="text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Roles API Debug */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-orange-800 flex items-center gap-2">
              Roles API Status
              <Button size="sm" variant="ghost" onClick={() => mutate()}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </h4>
            <div className="bg-white p-3 rounded border text-xs space-y-1">
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : isError ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span className="font-medium">Status:</span>
                <span>
                  {isLoading ? 'Loading...' : isError ? 'Error' : 'Success'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Roles Count:</span>
                <span className="font-mono">{count}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Array Length:</span>
                <span className="font-mono">{roles?.length || 0}</span>
              </div>
              {error && (
                <div className="text-red-600 font-mono text-xs p-2 bg-red-50 rounded">
                  {String(error)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Roles List Debug */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-orange-800">Available Roles</h4>
          <div className="bg-white p-3 rounded border">
            {roles && roles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="p-2 bg-gray-50 rounded border text-xs"
                  >
                    <div className="font-medium">{role.name}</div>
                    <div className="text-gray-600">ID: {role.id}</div>
                    {role.description && (
                      <div className="text-gray-600 mt-1">{role.description}</div>
                    )}
                    {role.tenantId && (
                      <div className="text-blue-600 mt-1">Tenant: {role.tenantId}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No roles found
              </div>
            )}
          </div>
        </div>

        {/* Metadata APIs Debug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-orange-800">Resource Types</h4>
            <div className="bg-white p-3 rounded border text-xs">
              <div className="flex items-center gap-2 mb-2">
                {resourceTypesLoading ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : resourceTypesError ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span>Count: {resourceTypes?.length || 0}</span>
              </div>
              {resourceTypes?.map((type) => (
                <div key={type.key} className="font-mono">
                  {type.key}: {type.label}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm text-orange-800">Available Actions</h4>
            <div className="bg-white p-3 rounded border text-xs">
              <div className="flex items-center gap-2 mb-2">
                {actionsLoading ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : actionsError ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span>Count: {availableActions?.length || 0}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {availableActions?.map((action) => (
                  <span key={action} className="px-2 py-1 bg-gray-100 rounded font-mono">
                    {action}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-orange-800">Quick Actions</h4>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => mutate()}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh Roles
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              className="text-xs"
            >
              Reload Page
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Troubleshooting Steps:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Ensure a tenant is selected in the sidebar</li>
              <li>Check that the tenant has existing roles created</li>
              <li>Verify the roles API is returning data successfully</li>
              <li>Try refreshing the roles data using the button above</li>
              <li>Check the browser console for additional error details</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
