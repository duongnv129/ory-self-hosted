/**
 * Hooks Module Exports
 * Central export point for all custom hooks
 */

export * from './useUsers';
export * from './useProducts';
export * from './useCategories';
export * from './useTenant';
export { useAuth } from '@/lib/context/AuthContext';

// Resource-scoped RBAC hooks
export * from './useResourceUsers';
export * from './useResourceProducts';
export * from './useResourceCategories';
export * from './useResourceRoles';
