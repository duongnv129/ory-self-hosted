/**
 * Metadata Context
 * Provides system metadata (resources and permissions) throughout the application
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { metadataApi, ResourcePermissions } from '@/lib/api/metadata';

interface MetadataContextType {
  resources: ResourcePermissions[];
  isLoading: boolean;
  error: Error | null;
  getResourcePermissions: (resource: string) => string[];
  hasPermission: (resource: string, permission: string) => boolean;
  refreshMetadata: () => Promise<void>;
}

const MetadataContext = createContext<MetadataContextType | undefined>(undefined);

export function MetadataProvider({ children }: { children: ReactNode }) {
  const [resources, setResources] = useState<ResourcePermissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMetadata = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await metadataApi.getMetadata();
      setResources(response.data.resources);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load metadata'));
      console.error('Failed to load metadata:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const getResourcePermissions = useCallback((resource: string): string[] => {
    const found = resources.find(r => r.resource === resource);
    return found ? found.permissions : [];
  }, [resources]);

  const hasPermission = useCallback((resource: string, permission: string): boolean => {
    const permissions = getResourcePermissions(resource);
    return permissions.includes(permission);
  }, [getResourcePermissions]);

  const value = useMemo((): MetadataContextType => ({
    resources,
    isLoading,
    error,
    getResourcePermissions,
    hasPermission,
    refreshMetadata: loadMetadata,
  }), [resources, isLoading, error, getResourcePermissions, hasPermission, loadMetadata]);

  return <MetadataContext.Provider value={value}>{children}</MetadataContext.Provider>;
}

export function useMetadata() {
  const context = useContext(MetadataContext);
  if (context === undefined) {
    throw new Error('useMetadata must be used within a MetadataProvider');
  }
  return context;
}
