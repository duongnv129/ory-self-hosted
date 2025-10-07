/**
 * Core Data Models
 * TypeScript types for all application entities
 */

export interface User {
  id: string;
  email: string;
  name: {
    first: string;
    last: string;
  };
  tenant_ids: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface Permission {
  resource: string; // e.g., "product:items", "category:items", "role:moderator"
  action: string; // e.g., "view", "create", "update", "delete", "member"
}

export interface Role {
  id: number;
  name: string;
  description: string;
  namespace: string;
  tenantId?: string;
  inheritsFrom?: string[]; // Array of parent role names that this role inherits from
  permissions?: Permission[]; // Permissions fetched from Keto
  createdAt: string;
  updatedAt?: string;
}
