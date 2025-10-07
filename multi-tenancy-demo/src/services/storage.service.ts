/**
 * In-memory storage service for products, categories, and roles
 */

import { Product, Category, Role } from '../types/models';

/**
 * In-memory storage service
 */
export class StorageService {
  private products: Product[] = [
    { id: 1, name: 'Product A', category: 'Electronics', price: 299.99, tenantId: 'tenant-a' },
    { id: 2, name: 'Product B', category: 'Books', price: 19.99, tenantId: 'tenant-a' },
    { id: 3, name: 'Product C', category: 'Clothing', price: 59.99, tenantId: 'tenant-b' },
  ];

  private categories: Category[] = [
    { id: 1, name: 'Electronics', description: 'Electronic devices and gadgets', tenantId: 'tenant-a' },
    { id: 2, name: 'Books', description: 'Books and literature', tenantId: 'tenant-a' },
    { id: 3, name: 'Clothing', description: 'Apparel and accessories', tenantId: 'tenant-b' },
  ];

  private rolesByNamespace: Record<string, Role[]> = {
    'simple-rbac': [
      {
        id: 1,
        name: 'admin',
        description: 'Administrator with full access',
        namespace: 'simple-rbac',
        inheritsFrom: ['moderator'], // Admin inherits from moderator
        createdAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'moderator',
        description: 'Moderator with limited access',
        namespace: 'simple-rbac',
        inheritsFrom: ['customer'], // Moderator inherits from customer
        createdAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 3,
        name: 'customer',
        description: 'Customer with view-only access',
        namespace: 'simple-rbac',
        inheritsFrom: [], // Customer has no inheritance
        createdAt: '2025-01-01T00:00:00Z',
      },
    ],
    'tenant-rbac': [
      {
        id: 4,
        name: 'tenant-admin',
        description: 'Tenant administrator',
        namespace: 'tenant-rbac',
        tenantId: 'tenant-a',
        createdAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 5,
        name: 'tenant-member',
        description: 'Tenant member',
        namespace: 'tenant-rbac',
        tenantId: 'tenant-a',
        createdAt: '2025-01-01T00:00:00Z',
      },
    ],
    'resource-rbac': [
      {
        id: 6,
        name: 'resource-owner',
        description: 'Resource owner',
        namespace: 'resource-rbac',
        tenantId: 'tenant-a',
        createdAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 7,
        name: 'resource-viewer',
        description: 'Resource viewer',
        namespace: 'resource-rbac',
        tenantId: 'tenant-a',
        createdAt: '2025-01-01T00:00:00Z',
      },
    ],
  };

  // ==================== PRODUCT METHODS ====================

  /**
   * Get all products, optionally filtered by tenant
   */
  getProducts(tenantId?: string): Product[] {
    if (!tenantId) {
      return [...this.products];
    }
    return this.products.filter((p) => p.tenantId === tenantId);
  }

  /**
   * Get product by ID
   */
  getProductById(id: number): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  /**
   * Create new product
   */
  createProduct(name: string, category: string, price: number, tenantId?: string): Product {
    const newProduct: Product = {
      id: Math.max(...this.products.map((p) => p.id), 0) + 1,
      name,
      category,
      price,
      tenantId: tenantId || null,
      createdAt: new Date().toISOString(),
    };
    this.products.push(newProduct);
    return newProduct;
  }

  /**
   * Update product
   */
  updateProduct(
    id: number,
    updates: { name?: string; category?: string; price?: number }
  ): Product | undefined {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return undefined;
    }

    const existing = this.products[index];
    if (!existing) {
      return undefined;
    }

    const updated: Product = {
      ...existing,
      name: updates.name !== undefined ? updates.name : existing.name,
      category: updates.category !== undefined ? updates.category : existing.category,
      price: updates.price !== undefined ? updates.price : existing.price,
      updatedAt: new Date().toISOString(),
    };

    this.products[index] = updated;
    return updated;
  }

  /**
   * Delete product
   */
  deleteProduct(id: number): Product | undefined {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return undefined;
    }
    return this.products.splice(index, 1)[0];
  }

  // ==================== CATEGORY METHODS ====================

  /**
   * Get all categories, optionally filtered by tenant
   */
  getCategories(tenantId?: string): Category[] {
    if (!tenantId) {
      return [...this.categories];
    }
    return this.categories.filter((c) => c.tenantId === tenantId);
  }

  /**
   * Get category by ID
   */
  getCategoryById(id: number): Category | undefined {
    return this.categories.find((c) => c.id === id);
  }

  /**
   * Create new category
   */
  createCategory(name: string, description: string, tenantId?: string): Category {
    const newCategory: Category = {
      id: Math.max(...this.categories.map((c) => c.id), 0) + 1,
      name,
      description,
      tenantId: tenantId || null,
      createdAt: new Date().toISOString(),
    };
    this.categories.push(newCategory);
    return newCategory;
  }

  /**
   * Update category
   */
  updateCategory(
    id: number,
    updates: { name?: string; description?: string }
  ): Category | undefined {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) {
      return undefined;
    }

    const existing = this.categories[index];
    if (!existing) {
      return undefined;
    }

    const updated: Category = {
      ...existing,
      name: updates.name !== undefined ? updates.name : existing.name,
      description: updates.description !== undefined ? updates.description : existing.description,
      updatedAt: new Date().toISOString(),
    };

    this.categories[index] = updated;
    return updated;
  }

  /**
   * Delete category
   */
  deleteCategory(id: number): Category | undefined {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) {
      return undefined;
    }
    return this.categories.splice(index, 1)[0];
  }

  // ==================== ROLE METHODS ====================

  /**
   * Get roles by namespace, optionally filtered by tenant
   */
  getRolesByNamespace(namespace: string, tenantId?: string): Role[] {
    const roles = this.rolesByNamespace[namespace] || [];
    if (!tenantId) {
      return [...roles];
    }
    return roles.filter((r) => !r.tenantId || r.tenantId === tenantId);
  }

  /**
   * Get role by name in namespace
   */
  getRoleByName(namespace: string, name: string): Role | undefined {
    const roles = this.rolesByNamespace[namespace] || [];
    return roles.find((r) => r.name === name);
  }

  /**
   * Create new role
   */
  createRole(
    namespace: string,
    name: string,
    description: string,
    tenantId?: string,
    inheritsFrom?: string[]
  ): Role {
    if (!this.rolesByNamespace[namespace]) {
      this.rolesByNamespace[namespace] = [];
    }

    const newRole: Role = {
      id: this.getNextRoleId(),
      name,
      description,
      namespace,
      tenantId,
      inheritsFrom: inheritsFrom || [],
      createdAt: new Date().toISOString(),
    };

    this.rolesByNamespace[namespace].push(newRole);
    return newRole;
  }

  /**
   * Update role
   */
  updateRole(
    namespace: string,
    roleName: string,
    updates: { name?: string; description?: string; inheritsFrom?: string[] }
  ): Role | undefined {
    const roles = this.rolesByNamespace[namespace];
    if (!roles) {
      return undefined;
    }

    const index = roles.findIndex((r) => r.name === roleName);
    if (index === -1) {
      return undefined;
    }

    const existing = roles[index];
    if (!existing) {
      return undefined;
    }

    const updated: Role = {
      ...existing,
      name: updates.name !== undefined ? updates.name : existing.name,
      description:
        updates.description !== undefined ? updates.description : existing.description,
      inheritsFrom:
        updates.inheritsFrom !== undefined ? updates.inheritsFrom : existing.inheritsFrom,
      updatedAt: new Date().toISOString(),
    };

    this.rolesByNamespace[namespace]![index] = updated;
    return updated;
  }

  /**
   * Delete role
   */
  deleteRole(namespace: string, roleName: string): Role | undefined {
    const roles = this.rolesByNamespace[namespace];
    if (!roles) {
      return undefined;
    }

    const index = roles.findIndex((r) => r.name === roleName);
    if (index === -1) {
      return undefined;
    }

    return this.rolesByNamespace[namespace]!.splice(index, 1)[0];
  }

  /**
   * Get next role ID across all namespaces
   */
  private getNextRoleId(): number {
    let maxId = 0;
    Object.values(this.rolesByNamespace).forEach((roles) => {
      roles.forEach((role) => {
        if (role.id > maxId) {
          maxId = role.id;
        }
      });
    });
    return maxId + 1;
  }
}
