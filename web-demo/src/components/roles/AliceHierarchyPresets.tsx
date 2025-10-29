/**
 * Alice Hierarchy Presets Component
 * Provides preset role configurations based on Alice's resource-scoped RBAC hierarchy
 *
 * Next.js Pro Patterns Applied:
 * - Educational component with interactive examples
 * - Type-safe preset configurations
 * - Accessible accordion interface
 * - Real-world scenario documentation
 */

'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
  Badge,
} from '@/components/ui';
import {
  Package,
  FolderOpen,
  User,
  Crown,
  Shield,
  Eye,
  Info,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

// Alice's hierarchy configuration following the documentation
interface RolePreset {
  name: string;
  description: string;
  resource: string; // Resource this role applies to (e.g., "product", "category")
  permissions: Array<{ resource: string; action: string }>;
  inheritsFrom?: string[];
  tenantId: string;
  userEmail: string;
  scenario: string;
}

interface TenantScenario {
  tenantId: string;
  tenantName: string;
  description: string;
  roles: RolePreset[];
}

// Alice's complete hierarchy as documented
const ALICE_HIERARCHY_PRESETS: TenantScenario[] = [
  {
    tenantId: 'tenant-a',
    tenantName: 'Tech Corp (Alice\'s Company)',
    description: 'Alice works at Tech Corp with different responsibilities across resource types',
    roles: [
      {
        name: 'admin',
        description: 'Full administrative access to products',
        resource: 'product',
        permissions: [
          { resource: 'product:items', action: 'view' },
          { resource: 'product:items', action: 'create' },
          { resource: 'product:items', action: 'update' },
          { resource: 'product:items', action: 'delete' },
        ],
        inheritsFrom: ['moderator'],
        tenantId: 'tenant-a',
        userEmail: 'alice@techcorp.com',
        scenario: 'Alice is Product Manager - needs full control over product catalog',
      },
      {
        name: 'moderator',
        description: 'Moderation privileges for products',
        resource: 'product',
        permissions: [
          { resource: 'product:items', action: 'view' },
          { resource: 'product:items', action: 'create' },
          { resource: 'product:items', action: 'update' },
        ],
        inheritsFrom: ['customer'],
        tenantId: 'tenant-a',
        userEmail: 'alice@techcorp.com',
        scenario: 'Inherits from customer, adds create/update permissions',
      },
      {
        name: 'customer',
        description: 'Basic product viewing access',
        resource: 'product',
        permissions: [
          { resource: 'product:items', action: 'view' },
        ],
        tenantId: 'tenant-a',
        userEmail: 'alice@techcorp.com',
        scenario: 'Base level access - can browse product catalog',
      },
      {
        name: 'moderator',
        description: 'Category moderation (different from products!)',
        resource: 'category',
        permissions: [
          { resource: 'category:items', action: 'view' },
          { resource: 'category:items', action: 'update' },
        ],
        inheritsFrom: ['customer'],
        tenantId: 'tenant-a',
        userEmail: 'alice@techcorp.com',
        scenario: 'Alice is Category Reviewer - can update but NOT create categories (admin-only)',
      },
      {
        name: 'customer',
        description: 'Basic category viewing access',
        resource: 'category',
        permissions: [
          { resource: 'category:items', action: 'view' },
        ],
        tenantId: 'tenant-a',
        userEmail: 'alice@techcorp.com',
        scenario: 'Base level access - can browse categories',
      },
    ],
  },
  {
    tenantId: 'tenant-b',
    tenantName: 'Retail Inc (Alice as Customer)',
    description: 'Alice is a paying customer at Retail Inc with limited access',
    roles: [
      {
        name: 'customer',
        description: 'Read-only customer access',
        resource: 'product',
        permissions: [
          { resource: 'product:items', action: 'view' },
        ],
        tenantId: 'tenant-b',
        userEmail: 'alice@personal.com',
        scenario: 'Alice shops at Retail Inc - can browse products but cannot manage them',
      },
    ],
  },
];

interface AliceHierarchyPresetsProps {
  onApplyPreset?: (preset: RolePreset) => void;
  currentTenant?: string;
  className?: string;
}

export function AliceHierarchyPresets({
  onApplyPreset,
  currentTenant,
  className
}: AliceHierarchyPresetsProps) {
  const [copiedPreset, setCopiedPreset] = useState<string | null>(null);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  const handleCopyPreset = async (preset: RolePreset) => {
    try {
      const presetData = {
        name: preset.name,
        description: preset.description,
        resourceType: preset.resource,
        inheritsFrom: preset.inheritsFrom || [],
        permissions: preset.permissions,
      };

      await navigator.clipboard.writeText(JSON.stringify(presetData, null, 2));
      setCopiedPreset(`${preset.tenantId}-${preset.resource}-${preset.name}`);
      toast.success('Role configuration copied to clipboard');

      setTimeout(() => setCopiedPreset(null), 2000);
    } catch {
      toast.error('Failed to copy preset');
    }
  };

  const handleApplyPreset = (preset: RolePreset) => {
    if (onApplyPreset) {
      onApplyPreset(preset);
      toast.success(`Applied preset: ${preset.name} (${preset.resource})`);
    }
  };

  const toggleScenario = (scenarioId: string) => {
    setExpandedScenario(expandedScenario === scenarioId ? null : scenarioId);
  };

  const getResourceIcon = (resourceType: string) => {
    if (resourceType.includes('product')) return Package;
    if (resourceType.includes('category')) return FolderOpen;
    return Shield;
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'admin': return Crown;
      case 'moderator': return Shield;
      case 'customer': return Eye;
      default: return User;
    }
  };

  const filteredScenarios = currentTenant
    ? ALICE_HIERARCHY_PRESETS.filter(scenario => scenario.tenantId === currentTenant)
    : ALICE_HIERARCHY_PRESETS;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Alice&apos;s Hierarchy Presets
        </CardTitle>
        <CardDescription>
          Real-world role configurations based on Alice&apos;s resource-scoped RBAC hierarchy.
          Demonstrates how users can have different roles per resource type.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Key Insight:</strong> Alice has different privilege levels across resource types.
            She&apos;s admin on products but only moderator on categories in the same tenant.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {filteredScenarios.map((scenario) => (
            <div key={scenario.tenantId} className="border rounded-lg overflow-hidden">
              <button
                className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
                onClick={() => toggleScenario(scenario.tenantId)}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{scenario.tenantId}</Badge>
                  <span className="font-medium">{scenario.tenantName}</span>
                </div>
                {expandedScenario === scenario.tenantId ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {expandedScenario === scenario.tenantId && (
                <div className="p-4 space-y-4">
                  <p className="text-sm text-muted-foreground">{scenario.description}</p>

                  <div className="space-y-3">
                    {scenario.roles.map((preset, index) => {
                      const ResourceIcon = getResourceIcon(preset.resource);
                      const RoleIcon = getRoleIcon(preset.name);
                      const presetId = `${preset.tenantId}-${preset.resource}-${preset.name}`;
                      const isCopied = copiedPreset === presetId;

                      return (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <RoleIcon className="h-4 w-4" />
                              <span className="font-medium">{preset.name}</span>
                              <ResourceIcon className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="secondary" className="text-xs">
                                {preset.resource}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyPreset(preset)}
                                className="text-xs"
                              >
                                {isCopied ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                {isCopied ? 'Copied' : 'Copy'}
                              </Button>
                              {onApplyPreset && currentTenant === preset.tenantId && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApplyPreset(preset)}
                                  className="text-xs"
                                >
                                  Apply
                                </Button>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground">{preset.description}</p>

                          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            <strong>Scenario:</strong> {preset.scenario}
                          </div>

                          {preset.inheritsFrom && preset.inheritsFrom.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Inherits from:</span>
                              {preset.inheritsFrom.map((parent) => (
                                <Badge key={parent} variant="outline" className="text-xs">
                                  {parent}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="space-y-2">
                            <div className="text-sm font-medium">Permissions:</div>
                            <div className="grid grid-cols-2 gap-1">
                              {preset.permissions.map((permission, permIndex) => (
                                <Badge
                                  key={permIndex}
                                  variant="outline"
                                  className="text-xs justify-center"
                                >
                                  {permission.action}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredScenarios.length === 0 && currentTenant && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No Alice hierarchy presets available for tenant &quot;{currentTenant}&quot;.
              Switch to tenant-a or tenant-b to see example configurations.
            </AlertDescription>
          </Alert>
        )}

        <div className="border-t pt-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Resource-Scoped Key Points:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Same user, different roles per resource type</li>
              <li>Admin on products ≠ admin on categories</li>
              <li>Inheritance works within resource scope only</li>
              <li>Explicit permission grants for each resource</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
