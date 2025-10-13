/**
 * Resource Permission Tester Component
 * Interactive component for testing permissions against specific resources
 * with user impersonation and result tracking.
 *
 * Follows Next.js Pro patterns:
 * - Client Component with state management
 * - TypeScript interfaces for props
 * - Comprehensive error handling
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { TestTube, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useResourceUsers } from '@/lib/hooks/useResourceUsers';
import { toast } from 'sonner';

interface TestableResource {
  id: string;
  name: string;
  type: 'user' | 'product' | 'category';
}

interface PermissionTest {
  action: string;
  granted: boolean;
  timestamp: string;
}

interface ResourcePermissionTesterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: TestableResource | null;
}

// Available actions for permission testing
const AVAILABLE_ACTIONS = [
  { value: 'view', label: 'View', description: 'Read access to the resource' },
  { value: 'create', label: 'Create', description: 'Create new items of this type' },
  { value: 'update', label: 'Update', description: 'Modify existing resource' },
  { value: 'delete', label: 'Delete', description: 'Remove the resource' },
  { value: 'manage', label: 'Manage', description: 'Full administrative access' },
];

export default function ResourcePermissionTester({
  open,
  onOpenChange,
  resource,
}: ResourcePermissionTesterProps) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [testResults, setTestResults] = useState<PermissionTest[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const { users, isLoading: usersLoading } = useResourceUsers();

  const runPermissionTest = async () => {
    if (!resource || !selectedUser || !selectedAction) {
      toast.error('Please select both a user and an action to test');
      return;
    }

    setIsTesting(true);
    try {
      // Mock permission testing - in real implementation, call Keto API
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock permission logic based on common patterns
      const user = users.find(u => u.email === selectedUser);
      const userRoles = user?.tenant_ids || [];

      let granted = false;
      if (userRoles.includes('admin')) {
        granted = true; // Admin has all permissions
      } else if (userRoles.includes('moderator')) {
        granted = ['view', 'create', 'update'].includes(selectedAction);
      } else if (userRoles.includes('customer')) {
        granted = selectedAction === 'view';
      }

      const newTest: PermissionTest = {
        action: selectedAction,
        granted,
        timestamp: new Date().toLocaleTimeString(),
      };

      setTestResults(prev => [newTest, ...prev.slice(0, 4)]); // Keep last 5 results

      toast.success(
        `Permission test completed: ${granted ? 'GRANTED' : 'DENIED'}`
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Permission test failed';
      toast.error(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  const runBatchTest = async () => {
    if (!resource || !selectedUser) {
      toast.error('Please select a user for batch testing');
      return;
    }

    setIsTesting(true);
    try {
      const user = users.find(u => u.email === selectedUser);
      const userRoles = user?.tenant_ids || [];

      const batchResults: PermissionTest[] = [];

      for (const action of AVAILABLE_ACTIONS) {
        // Mock permission logic
        let granted = false;
        if (userRoles.includes('admin')) {
          granted = true;
        } else if (userRoles.includes('moderator')) {
          granted = ['view', 'create', 'update'].includes(action.value);
        } else if (userRoles.includes('customer')) {
          granted = action.value === 'view';
        }

        batchResults.push({
          action: action.value,
          granted,
          timestamp: new Date().toLocaleTimeString(),
        });

        // Small delay for visual effect
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setTestResults(batchResults);
      toast.success('Batch permission test completed');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Batch test failed';
      toast.error(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  if (!resource) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Permission Testing
          </DialogTitle>
          <DialogDescription>
            Test permissions for {resource.type} &ldquo;{resource.name}&rdquo;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User and Action Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Impersonate User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {usersLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading users...</div>
                  ) : (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.email}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{user.name.first} {user.name.last}</span>
                          <div className="text-xs text-muted-foreground">
                            ({user.tenant_ids.join(', ') || 'No roles'})
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action to Test</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an action" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ACTIONS.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      <div>
                        <div className="font-medium">{action.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {action.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Test Actions */}
          <div className="flex gap-2">
            <Button
              onClick={runPermissionTest}
              disabled={!selectedUser || !selectedAction || isTesting}
              className="flex-1"
            >
              {isTesting ? 'Testing...' : 'Test Permission'}
            </Button>
            <Button
              variant="outline"
              onClick={runBatchTest}
              disabled={!selectedUser || isTesting}
              className="flex-1"
            >
              {isTesting ? 'Testing...' : 'Test All Actions'}
            </Button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div
                      key={`${result.action}-${result.timestamp}-${index}`}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {result.granted ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium capitalize">
                            {result.action}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Tested at {result.timestamp}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={result.granted ? 'default' : 'destructive'}
                      >
                        {result.granted ? 'GRANTED' : 'DENIED'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning Notice */}
          <div className="rounded-lg bg-amber-50 p-4 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <div className="font-medium text-amber-800">Mock Testing Mode</div>
                <div className="text-amber-700 mt-1">
                  This is using mock permission logic. In production, this would query Keto
                  for real-time permission checks against the configured authorization model.
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
