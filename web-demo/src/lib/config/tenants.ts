/**
 * Centralized Tenant Configuration
 * Single source of truth for available tenants in the application
 */

export interface Tenant {
  id: string;
  name: string;
}

/**
 * Available tenants in the system
 * Used for tenant selection, context switching, and API calls
 */
export const AVAILABLE_TENANTS: readonly Tenant[] = [
  { id: 'tenant-a', name: 'Tenant A' },
  { id: 'tenant-b', name: 'Tenant B' },
  { id: 'tenant-c', name: 'Tenant C' },
] as const;

/**
 * Get the default tenant (first available tenant)
 * Used when no tenant is selected to provide a better UX
 */
export function getDefaultTenant(): Tenant | null {
  return AVAILABLE_TENANTS.length > 0 ? AVAILABLE_TENANTS[0] : null;
}

/**
 * Check if a tenant ID is valid
 */
export function isValidTenant(tenantId: string): boolean {
  return AVAILABLE_TENANTS.some(tenant => tenant.id === tenantId);
}

/**
 * Get tenant by ID
 */
export function getTenantById(tenantId: string): Tenant | undefined {
  return AVAILABLE_TENANTS.find(tenant => tenant.id === tenantId);
}
