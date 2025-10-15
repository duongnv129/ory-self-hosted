/**
 * Tenant Context Provider
 * Manages tenant selection and API client configuration
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { getDefaultTenant, isValidTenant } from '@/lib/config/tenants';

interface TenantContextType {
  currentTenant: string | null;
  setTenant: (tenantId: string) => void;
  clearTenant: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const TENANT_STORAGE_KEY = 'ory-demo-tenant';

interface TenantProviderProps {
  children: React.ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [currentTenant, setCurrentTenant] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load tenant from localStorage on mount
  useEffect(() => {
    const storedTenant = localStorage.getItem(TENANT_STORAGE_KEY);

    if (storedTenant && isValidTenant(storedTenant)) {
      // Use stored tenant if valid
      setCurrentTenant(storedTenant);
      apiClient.setTenantContext(storedTenant);
    } else {
      // Set default tenant if no valid stored tenant
      const defaultTenant = getDefaultTenant();
      if (defaultTenant) {
        setCurrentTenant(defaultTenant.id);
        localStorage.setItem(TENANT_STORAGE_KEY, defaultTenant.id);
        apiClient.setTenantContext(defaultTenant.id);
      }
    }

    setIsHydrated(true);
  }, []);

  const setTenant = (tenantId: string) => {
    setCurrentTenant(tenantId);
    localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
    apiClient.setTenantContext(tenantId);
  };

  const clearTenant = () => {
    setCurrentTenant(null);
    localStorage.removeItem(TENANT_STORAGE_KEY);
    apiClient.clearTenantContext();
  };

  // Prevent hydration mismatch by not rendering until client-side is ready
  if (!isHydrated) {
    return null;
  }

  return (
    <TenantContext.Provider value={{ currentTenant, setTenant, clearTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
