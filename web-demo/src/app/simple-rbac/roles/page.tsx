/**
 * Roles Management Page
 * Display role hierarchy, permissions, and user assignments
 */

'use client';

import { useUsers } from '@/lib/hooks/useUsers';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  AlertDescription,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { CardSkeleton } from '@/components/ui/loading';
import { ShieldCheck, Shield, User as UserIcon, AlertCircle, Check, X } from 'lucide-react';

const ROLES = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full access to all resources and operations',
    icon: ShieldCheck,
    color: 'red',
    variant: 'destructive' as const,
    permissions: {
      view: true,
      create: true,
      update: true,
      delete: true,
    },
    inheritsFrom: ['moderator', 'customer'],
  },
  {
    id: 'moderator',
    name: 'Moderator',
    description: 'Can create products, update categories, and view all resources',
    icon: Shield,
    color: 'yellow',
    variant: 'default' as const,
    permissions: {
      view: true,
      create: 'products only',
      update: 'categories only',
      delete: false,
    },
    inheritsFrom: ['customer'],
  },
  {
    id: 'customer',
    name: 'Customer',
    description: 'Read-only access to view resources',
    icon: UserIcon,
    color: 'blue',
    variant: 'secondary' as const,
    permissions: {
      view: true,
      create: false,
      update: false,
      delete: false,
    },
    inheritsFrom: [],
  },
];

export default function RolesPage() {
  const { users, isLoading } = useUsers();

  // Group users by role
  const getUsersByRole = (roleId: string) => {
    return users.filter(user => user.tenant_ids.includes(roleId));
  };

  // Simple RBAC: Global authorization model - no tenant isolation required

  if (isLoading) {
    return <CardSkeleton count={4} />;
  }

  return (
    <div className="space-y-8">
      {/* Role Hierarchy Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Role Hierarchy</CardTitle>
          <CardDescription>
            Permission inheritance flows from Admin to Customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {ROLES.map((role, index) => {
              const Icon = role.icon;
              const userCount = getUsersByRole(role.id).length;

              return (
                <div key={role.id}>
                  <div className="flex items-start gap-4 rounded-lg border p-6">
                    <div className={`rounded-full bg-${role.color}-100 p-3`}>
                      <Icon className={`h-6 w-6 text-${role.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{role.name}</h3>
                        <Badge variant={role.variant}>
                          {userCount} {userCount === 1 ? 'user' : 'users'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {role.description}
                      </p>

                      {/* Permission Badges */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(role.permissions).map(([perm, value]) => (
                          value && (
                            <Badge key={perm} variant="outline">
                              {perm}: {typeof value === 'string' ? value : '✓'}
                            </Badge>
                          )
                        ))}
                      </div>

                      {/* Inheritance Info */}
                      {role.inheritsFrom.length > 0 && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Inherits permissions from: {role.inheritsFrom.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Inheritance Arrow */}
                  {index < ROLES.length - 1 && (
                    <div className="ml-8 flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <div className="h-6 w-px bg-border" />
                      <span>inherits from</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>
            Overview of permissions by role and action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Role</TableHead>
                <TableHead>View</TableHead>
                <TableHead>Create</TableHead>
                <TableHead>Update</TableHead>
                <TableHead>Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES.map((role) => {
                const Icon = role.icon;
                return (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {role.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {role.permissions.view ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      {role.permissions.create ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-600" />
                          {typeof role.permissions.create === 'string' && (
                            <span className="text-xs text-muted-foreground">
                              ({role.permissions.create})
                            </span>
                          )}
                        </div>
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      {role.permissions.update ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-600" />
                          {typeof role.permissions.update === 'string' && (
                            <span className="text-xs text-muted-foreground">
                              ({role.permissions.update})
                            </span>
                          )}
                        </div>
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      {role.permissions.delete ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Assignments by Role */}
      <div className="grid gap-6 md:grid-cols-3">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const roleUsers = getUsersByRole(role.id);

          return (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {role.name}
                </CardTitle>
                <CardDescription>
                  {roleUsers.length} {roleUsers.length === 1 ? 'user' : 'users'} assigned
                </CardDescription>
              </CardHeader>
              <CardContent>
                {roleUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users assigned</p>
                ) : (
                  <div className="space-y-2">
                    {roleUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between rounded-md border p-2"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {user.name.first} {user.name.last}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
