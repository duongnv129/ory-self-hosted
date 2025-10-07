/**
 * API Module Exports
 * Central export point for all API clients
 */

import { apiClient } from './client';
import { UsersApi } from './users';
import { ProductsApi } from './products';
import { CategoriesApi } from './categories';
import { RolesApi } from './roles';

// Create API instances with shared client
export const usersApi = new UsersApi(apiClient);
export const productsApi = new ProductsApi(apiClient);
export const categoriesApi = new CategoriesApi(apiClient);
export const rolesApi = new RolesApi(apiClient);

// Export client for advanced use cases
export { apiClient, ApiClient, ApiError } from './client';
export { UsersApi } from './users';
export { ProductsApi } from './products';
export { CategoriesApi } from './categories';
export { RolesApi } from './roles';
