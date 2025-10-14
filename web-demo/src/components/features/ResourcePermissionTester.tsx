/**
 * Resource Permission Tester Component
 * Interactive component for testing permissions against specific resources
 * Supports user impersonation and action testing for resource-scoped RBAC
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  Label,
} from '@/components/ui';
import {
  Play,
  User as UserIcon,
  Shield,
  Check,
  X,
  AlertCircle,
  Loader2,
  Eye,
  Lock,
  Unlock,
} from 'lucide-react';
import { useUsers } from '@/lib/hooks';
import { useTenant } from '@/lib/context/TenantContext';

/**
 * Permission test result
 */
interface PermissionTestResult {
  userEmail: string;
  userName: string;
  resource: string;
  action: string;
  tenantId: string;
  allowed: boolean;
  timestamp: string;
  details?: string;
  error?: string;
}

/**
 * Resource type for permission testing
 */
export type TestableResourceType = 'users' | 'products' | 'categories';

/**
 * Available actions for each resource type
 */
const RESOURCE_ACTIONS: Record<TestableResourceType, string[]> = {
  users: ['view', 'create', 'update', 'delete'],
  products: ['view', 'create', 'update', 'delete'],
  categories: ['view', 'create', 'update', 'delete'],
};

/**
 * Props for ResourcePermissionTester component
 */
interface ResourcePermissionTesterProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Close dialog handler */
  onClose: () => void;
  /** Pre-selected resource type */
  resourceType?: TestableResourceType;
  /** Pre-selected resource ID */
  resourceId?: string | number;
  /** Resource name for display */
  resourceName?: string;
  /** Callback when test is completed */
  onTestCompleted?: (result: PermissionTestResult) => void;
}

/**
 * Mock permission testing function
 * In a real implementation, this would call Keto or Oathkeeper
 */
const testPermission = async (
  userEmail: string,
  resource: string,
  action: string,
  _tenantId: string
): Promise<{ allowed: boolean; details?: string }> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock permission logic - in real app this would call Keto
  // For demo purposes, we'll implement some basic rules:

  // Admin users have all permissions
  if (userEmail.includes('admin')) {
    return { allowed: true, details: 'Admin user has full access' };
  }

  // Moderators can view and update
  if (userEmail.includes('moderator')) {
    const allowedActions = ['view', 'update'];
    return {
      allowed: allowedActions.includes(action),
      details: allowedActions.includes(action)
        ? 'Moderator has permission for this action'
        : 'Moderators cannot perform this action'
    };
  }

  // Regular users can only view
  const allowedActions = ['view'];
  return {
    allowed: allowedActions.includes(action),
    details: allowedActions.includes(action)
      ? 'User has read-only access'
      : 'User lacks permission for this action'
  };
};

/**
 * ResourcePermissionTester component for testing permissions
 */
export function ResourcePermissionTester({
  open,
  onClose,
  resourceType: initialResourceType,
  resourceId,
  resourceName,
  onTestCompleted,
}: ResourcePermissionTesterProps) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedResourceType, setSelectedResourceType] = useState<TestableResourceType>(
    initialResourceType || 'users'
  );
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<PermissionTestResult[]>([]);
  const [error, setError] = useState<string>('');

  const { currentTenant } = useTenant();
  const { users, isLoading: usersLoading, error: usersError } = useUsers();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedUser('');
      setSelectedAction('');
      setError('');
      setTestResults([]);

      if (initialResourceType) {
        setSelectedResourceType(initialResourceType);
      }
    }
  }, [open, initialResourceType]);

  // Handle permission test
  const handleTestPermission = async () => {
    if (!selectedUser || !selectedAction || !currentTenant) {
      setError('Please select a user, action, and ensure tenant is selected');
      return;
    }

    setIsTesting(true);
    setError('');

    try {
      const user = users.find(u => u.email === selectedUser);
      if (!user) {
        throw new Error('Selected user not found');
      }

      const resourcePath = resourceId
        ? `${selectedResourceType}:${resourceId}`
        : `${selectedResourceType}:items`;

      const result = await testPermission(
        selectedUser,
        resourcePath,
        selectedAction,
        currentTenant
      );

      const testResult: PermissionTestResult = {
        userEmail: selectedUser,
        userName: `${user.name.first} ${user.name.last}`,
        resource: resourceName || resourcePath,
        action: selectedAction,
        tenantId: currentTenant,
        allowed: result.allowed,
        timestamp: new Date().toISOString(),
        details: result.details,
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results
      onTestCompleted?.(testResult);

      // Clear form for next test
      setSelectedAction('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test permission';
      setError(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  // Handle batch testing (test all actions for selected user)
  const handleBatchTest = async () => {
    if (!selectedUser || !currentTenant) {
      setError('Please select a user and ensure tenant is selected');
      return;
    }

    setIsTesting(true);
    setError('');

    try {
      const user = users.find(u => u.email === selectedUser);
      if (!user) {
        throw new Error('Selected user not found');
      }

      const actions = RESOURCE_ACTIONS[selectedResourceType];
      const resourcePath = resourceId
        ? `${selectedResourceType}:${resourceId}`
        : `${selectedResourceType}:items`;

      const batchResults: PermissionTestResult[] = [];

      for (const action of actions) {
        try {
          const result = await testPermission(
            selectedUser,
            resourcePath,
            action,
            currentTenant
          );

          const testResult: PermissionTestResult = {
            userEmail: selectedUser,
            userName: `${user.name.first} ${user.name.last}`,
            resource: resourceName || resourcePath,
            action: action,
            tenantId: currentTenant,
            allowed: result.allowed,
            timestamp: new Date().toISOString(),
            details: result.details,
          };

          batchResults.push(testResult);
          onTestCompleted?.(testResult);
        } catch (actionError) {
          console.error(`Failed to test action ${action}:`, actionError);
        }
      }

      setTestResults(prev => [...batchResults, ...prev.slice(0, 10 - batchResults.length)]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test permissions';
      setError(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Test Resource Permissions
          </DialogTitle>
          <DialogDescription>
            Test user permissions for specific resources and actions.
            {resourceName && (
              <span className="block mt-1">
                Testing permissions for: <strong>{resourceName}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Messages */}
          {(error || usersError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || usersError}
              </AlertDescription>
            </Alert>
          )}

          {/* Tenant Warning */}
          {!currentTenant && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a tenant to test permissions in the appropriate context.
              </AlertDescription>
            </Alert>
          )}

          {/* Test Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permission Test Configuration
              </CardTitle>
              <CardDescription>
                Configure the permission test parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Selection */}
              <div className="space-y-2">
                <Label htmlFor="user-select">Test as User</Label>
                <Select
                  value={selectedUser}
                  onValueChange={setSelectedUser}
                  disabled={usersLoading || isTesting}
                >
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder="Choose a user to impersonate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.email} value={user.email}>
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span>{user.name.first} {user.name.last}</span>
                          <span className="text-muted-foreground">({user.email})</span>
                          {user.roles && user.roles.length > 0 && (
                            <div className="flex gap-1">
                              {user.roles.slice(0, 2).map((role) => (
                                <Badge key={role} variant="outline" className="text-xs">
                                  {role}
                                </Badge>
                              ))}
                              {user.roles.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.roles.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resource Type Selection */}
              {!initialResourceType && (
                <div className="space-y-2">
                  <Label htmlFor="resource-select">Resource Type</Label>
                  <Select
                    value={selectedResourceType}
                    onValueChange={(value) => setSelectedResourceType(value as TestableResourceType)}
                    disabled={isTesting}
                  >
                    <SelectTrigger id="resource-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="users">Users</SelectItem>
                      <SelectItem value="products">Products</SelectItem>
                      <SelectItem value="categories">Categories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Action Selection */}
              <div className="space-y-2">
                <Label htmlFor="action-select">Action to Test</Label>
                <Select
                  value={selectedAction}
                  onValueChange={setSelectedAction}
                  disabled={isTesting}
                >
                  <SelectTrigger id="action-select">
                    <SelectValue placeholder="Choose an action..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_ACTIONS[selectedResourceType].map((action) => (
                      <SelectItem key={action} value={action}>
                        <span className="capitalize">{action}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Test Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleTestPermission}
                  disabled={!selectedUser || !selectedAction || !currentTenant || isTesting}
                  className="flex-1"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Test Single Action
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBatchTest}
                  disabled={!selectedUser || !currentTenant || isTesting}
                  className="flex-1"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Test All Actions
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Test Results
                {testResults.length > 0 && (
                  <Badge variant="secondary">{testResults.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Recent permission test results (most recent first)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Tests Run Yet</h3>
                  <p className="text-muted-foreground">
                    Configure and run permission tests to see results here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        result.allowed
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {result.allowed ? (
                          <Unlock className="h-6 w-6 text-green-600" />
                        ) : (
                          <Lock className="h-6 w-6 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium">
                            {result.userName} → {result.action} on {result.resource}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {result.userEmail} | {result.tenantId}
                          </div>
                          {result.details && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {result.details}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={result.allowed ? 'default' : 'destructive'}
                          className="flex items-center gap-1"
                        >
                          {result.allowed ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          {result.allowed ? 'ALLOWED' : 'DENIED'}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Context Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Test Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Tenant:</span> {currentTenant || 'None selected'}
                </div>
                <div>
                  <span className="font-medium">Resource Type:</span> {selectedResourceType}
                </div>
                {resourceId && (
                  <div>
                    <span className="font-medium">Resource ID:</span> {resourceId}
                  </div>
                )}
                {resourceName && (
                  <div>
                    <span className="font-medium">Resource Name:</span> {resourceName}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
