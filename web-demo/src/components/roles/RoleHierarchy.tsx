/**
 * Role Hierarchy Component
 * Visual representation of role inheritance and relationships
 * Shows parent-child relationships and permission flows
 */

'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from '@/components/ui';
import {
  Shield,
  ShieldCheck,
  User as UserIcon,
  ArrowDown,
  ArrowRight,
  Users,
} from 'lucide-react';
import { Role } from '@/lib/types/models';
import { cn } from '@/lib/utils';

interface RoleHierarchyProps {
  roles: Role[];
  selectedRole?: Role | null;
  onRoleSelect?: (role: Role) => void;
  showUserCounts?: boolean;
  userCountsByRole?: Record<string, number>;
  className?: string;
}

interface HierarchyNode {
  role: Role;
  children: HierarchyNode[];
  level: number;
  userCount: number;
}

// Get icon for role
const getRoleIcon = (roleName: string) => {
  switch (roleName.toLowerCase()) {
    case 'admin':
      return ShieldCheck;
    case 'moderator':
      return Shield;
    case 'customer':
      return UserIcon;
    default:
      return Shield;
  }
};

// Get color variant for role
const getRoleVariant = (roleName: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
  switch (roleName.toLowerCase()) {
    case 'admin':
      return 'destructive';
    case 'moderator':
      return 'default';
    case 'customer':
      return 'secondary';
    default:
      return 'outline';
  }
};

export function RoleHierarchy({
  roles,
  selectedRole,
  onRoleSelect,
  showUserCounts = false,
  userCountsByRole = {},
  className,
}: RoleHierarchyProps) {
  // Build hierarchy tree structure
  const hierarchyTree = useMemo(() => {
    const nodeMap = new Map<string, HierarchyNode>();
    const roots: HierarchyNode[] = [];

    // Create nodes for all roles
    roles.forEach(role => {
      nodeMap.set(role.name, {
        role,
        children: [],
        level: 0,
        userCount: userCountsByRole[role.name] || 0,
      });
    });

    // Build parent-child relationships
    roles.forEach(role => {
      const node = nodeMap.get(role.name);
      if (!node) return;

      if (role.inheritsFrom && role.inheritsFrom.length > 0) {
        // This role inherits from others
        role.inheritsFrom.forEach(parentName => {
          const parentNode = nodeMap.get(parentName);
          if (parentNode) {
            parentNode.children.push(node);
          }
        });
      } else {
        // This is a root role
        roots.push(node);
      }
    });

    // Calculate levels for proper layout
    const calculateLevels = (node: HierarchyNode, level: number) => {
      node.level = level;
      node.children.forEach(child => calculateLevels(child, level + 1));
    };

    roots.forEach(root => calculateLevels(root, 0));

    return roots;
  }, [roles, userCountsByRole]);

  // Render a single role node
  const renderRoleNode = (node: HierarchyNode, _isLast: boolean = false) => {
    const Icon = getRoleIcon(node.role.name);
    const variant = getRoleVariant(node.role.name);
    const isSelected = selectedRole?.name === node.role.name;

    return (
      <div key={node.role.name} className="relative">
        {/* Role Card */}
        <Card
          className={cn(
            'transition-all duration-200 cursor-pointer hover:shadow-md',
            isSelected && 'ring-2 ring-primary ring-offset-2',
            onRoleSelect && 'hover:bg-muted/50'
          )}
          onClick={() => onRoleSelect?.(node.role)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'rounded-full p-2',
                variant === 'destructive' && 'bg-red-100',
                variant === 'default' && 'bg-blue-100',
                variant === 'secondary' && 'bg-gray-100',
                variant === 'outline' && 'bg-gray-50'
              )}>
                <Icon className={cn(
                  'h-5 w-5',
                  variant === 'destructive' && 'text-red-600',
                  variant === 'default' && 'text-blue-600',
                  variant === 'secondary' && 'text-gray-600',
                  variant === 'outline' && 'text-gray-500'
                )} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{node.role.name}</h4>
                  <Badge variant={variant}>
                    {node.role.namespace}
                  </Badge>
                  {showUserCounts && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{node.userCount}</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mt-1">
                  {node.role.description}
                </p>

                {/* Inheritance info */}
                {node.role.inheritsFrom && node.role.inheritsFrom.length > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Inherits from:</span>
                    <div className="flex gap-1">
                      {node.role.inheritsFrom.map(parentName => (
                        <Badge key={parentName} variant="outline" className="text-xs">
                          {parentName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>ID: {node.role.id}</span>
                  <span>•</span>
                  <span>Created: {new Date(node.role.createdAt).toLocaleDateString()}</span>
                  {node.role.tenantId && (
                    <>
                      <span>•</span>
                      <span>Tenant: {node.role.tenantId}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Children */}
        {node.children.length > 0 && (
          <div className="ml-8 mt-4 space-y-4">
            {/* Inheritance arrow */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowDown className="h-4 w-4" />
              <span>inherits permissions</span>
            </div>

            {/* Child roles */}
            {node.children.map((child, index) =>
              renderRoleNode(child, index === node.children.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  // Flat view for roles without hierarchy
  const renderFlatView = () => {
    return (
      <div className="space-y-4">
        {roles.map(role => {
          const Icon = getRoleIcon(role.name);
          const variant = getRoleVariant(role.name);
          const isSelected = selectedRole?.name === role.name;
          const userCount = userCountsByRole[role.name] || 0;

          return (
            <Card
              key={role.name}
              className={cn(
                'transition-all duration-200 cursor-pointer hover:shadow-md',
                isSelected && 'ring-2 ring-primary ring-offset-2',
                onRoleSelect && 'hover:bg-muted/50'
              )}
              onClick={() => onRoleSelect?.(role)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'rounded-full p-2',
                    variant === 'destructive' && 'bg-red-100',
                    variant === 'default' && 'bg-blue-100',
                    variant === 'secondary' && 'bg-gray-100',
                    variant === 'outline' && 'bg-gray-50'
                  )}>
                    <Icon className={cn(
                      'h-5 w-5',
                      variant === 'destructive' && 'text-red-600',
                      variant === 'default' && 'text-blue-600',
                      variant === 'secondary' && 'text-gray-600',
                      variant === 'outline' && 'text-gray-500'
                    )} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{role.name}</h4>
                      <Badge variant={variant}>
                        {role.namespace}
                      </Badge>
                      {showUserCounts && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{userCount}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mt-1">
                      {role.description}
                    </p>
                  </div>

                  {onRoleSelect && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const hasHierarchy = roles.some(role => role.inheritsFrom && role.inheritsFrom.length > 0);

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Hierarchy
            {selectedRole && (
              <Badge variant="outline">{selectedRole.name}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {hasHierarchy
              ? 'Permission inheritance flows from parent to child roles'
              : 'All roles are independent with no inheritance relationships'
            }
            {showUserCounts && ' • User counts shown for each role'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasHierarchy ? (
            <div className="space-y-6">
              {hierarchyTree.map(root => renderRoleNode(root))}
            </div>
          ) : (
            renderFlatView()
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Hierarchy Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{roles.length}</div>
              <div className="text-sm text-muted-foreground">Total Roles</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {hierarchyTree.length}
              </div>
              <div className="text-sm text-muted-foreground">Root Roles</div>
            </div>

            {showUserCounts && (
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Object.values(userCountsByRole).reduce((sum, count) => sum + count, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
