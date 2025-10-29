/**
 * Metadata Hooks
 * Fetch system metadata including resources and their permissions
 */

import { useMemo } from 'react';
import useSWR from 'swr';
import { metadataApi } from '@/lib/api/metadata';
import {
  Package,
  FolderOpen,
  Users,
  Database,
  Settings,
  FileText,
  type LucideIcon,
} from 'lucide-react';

export interface ResourceType {
  key: string; // e.g., "product:items", "category:items"
  label: string;
  icon: LucideIcon;
  description?: string;
  defaultRoles?: string[]; // Default role hierarchy for this resource type
}

// Icon mapping for different resource types
const RESOURCE_ICONS: Record<string, LucideIcon> = {
  'product:items': Package,
  'category:items': FolderOpen,
  // Legacy support
  products: Package,
  categories: FolderOpen,
};

// Resource label mapping
const RESOURCE_LABELS: Record<string, string> = {
  'product:items': 'Products',
  'category:items': 'Categories',
  // Legacy support
  products: 'Products',
  categories: 'Categories',
};

// Default role hierarchies per resource type following Alice's model
const DEFAULT_ROLE_HIERARCHIES: Record<string, string[]> = {
  'product:items': ['admin', 'moderator', 'customer'], // admin -> moderator -> customer
  'category:items': ['admin', 'moderator', 'customer'], // admin -> moderator -> customer
};

/**
 * Hook to fetch system metadata
 */
export function useMetadata() {
  const { data, error, isLoading, mutate } = useSWR(
    'metadata',
    () => metadataApi.getMetadata(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000, // 5 minutes cache
    }
  );

  return {
    metadata: data?.data,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}

/**
 * Hook to get resource types formatted for UI components
 */
export function useResourceTypes() {
  const { metadata, isLoading, isError, error } = useMetadata();

  const resourceTypes = useMemo<ResourceType[]>(() => {
    if (!metadata?.resources) {
      // Fallback to default resource types following Alice's model
      // Use simple names (product, category) - :items suffix added only in Keto layer
      return [
        {
          key: 'product',
          label: 'Products',
          icon: Package,
          description: 'Product catalog and inventory management',
          defaultRoles: ['admin', 'moderator', 'customer'],
        },
        {
          key: 'category',
          label: 'Categories',
          icon: FolderOpen,
          description: 'Product categorization and organization',
          defaultRoles: ['admin', 'moderator', 'customer'],
        },
      ];
    }

    return metadata.resources.map(resource => {
      // Use simple resource name as-is (metadata API already returns "product", "category")
      const resourceKey = resource.resource;

      return {
        key: resourceKey,
        label: RESOURCE_LABELS[`${resourceKey}:items`] ||
               RESOURCE_LABELS[resourceKey] ||
               resourceKey.charAt(0).toUpperCase() + resourceKey.slice(1) + 's',
        icon: RESOURCE_ICONS[`${resourceKey}:items`] || RESOURCE_ICONS[resourceKey] || Database,
        description: `Manage ${(RESOURCE_LABELS[`${resourceKey}:items`] || resourceKey).toLowerCase()}`,
        defaultRoles: DEFAULT_ROLE_HIERARCHIES[`${resourceKey}:items`] || ['admin', 'moderator', 'customer'],
      };
    });
  }, [metadata]);

  return {
    resourceTypes,
    isLoading,
    isError,
    error,
  };
}

/**
 * Hook to get available actions for all resources
 */
export function useAvailableActions() {
  const { metadata, isLoading, isError, error } = useMetadata();

  const availableActions = useMemo<string[]>(() => {
    if (!metadata?.resources) return ['view', 'create', 'update', 'delete'];

    // Get unique actions across all resources
    const actions = new Set<string>();
    metadata.resources.forEach(resource => {
      resource.permissions.forEach(permission => actions.add(permission));
    });

    return Array.from(actions).sort();
  }, [metadata]);

  return {
    availableActions,
    isLoading,
    isError,
    error,
  };
}

/**
 * Hook to get actions for a specific resource
 */
export function useResourceActions(resourceKey?: string) {
  const { metadata, isLoading, isError, error } = useMetadata();

  const resourceActions = useMemo<string[]>(() => {
    if (!metadata?.resources || !resourceKey) return [];

    const resource = metadata.resources.find(r => r.resource === resourceKey);
    return resource?.permissions || [];
  }, [metadata, resourceKey]);

  return {
    resourceActions,
    isLoading,
    isError,
    error,
  };
}
