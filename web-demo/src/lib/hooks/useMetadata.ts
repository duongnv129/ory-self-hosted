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
  key: string;
  label: string;
  icon: LucideIcon;
}

// Icon mapping for different resource types
const RESOURCE_ICONS: Record<string, LucideIcon> = {
  products: Package,
  categories: FolderOpen,
  users: Users,
  orders: FileText,
  settings: Settings,
  databases: Database,
};

// Resource label mapping
const RESOURCE_LABELS: Record<string, string> = {
  products: 'Products',
  categories: 'Categories',
  users: 'Users',
  orders: 'Orders',
  settings: 'Settings',
  databases: 'Databases',
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
    if (!metadata?.resources) return [];

    return metadata.resources.map(resource => ({
      key: resource.resource,
      label: RESOURCE_LABELS[resource.resource] ||
             resource.resource.charAt(0).toUpperCase() + resource.resource.slice(1),
      icon: RESOURCE_ICONS[resource.resource] || Database,
    }));
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
