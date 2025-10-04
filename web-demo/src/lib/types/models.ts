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

export interface Role {
  id: string;
  name: 'admin' | 'moderator' | 'customer';
  description: string;
  permissions: Permission[];
}

export interface Permission {
  resource: 'product' | 'category' | 'user';
  action: 'view' | 'create' | 'update' | 'delete';
}
