/**
 * Storage service with file persistence for products, categories, and roles
 */

import { Product, Category, Role } from '../types/models';
import {
  StorageData,
  PersistenceConfig,
  StorageOperationResult,
  StorageError,
  StorageErrorType,
} from '../types/storage';
import { FilePersistenceManager } from './file-persistence.service';

/**
 * Storage service with optional file persistence
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
    'simple-rbac': [],
    'tenant-rbac': [],
  };

  private persistenceManager: FilePersistenceManager | null = null;
  private persistenceConfig: PersistenceConfig | null = null;
  private isInitialized = false;

  constructor(persistenceConfig?: PersistenceConfig) {
    if (persistenceConfig) {
      this.persistenceConfig = persistenceConfig;
      this.persistenceManager = new FilePersistenceManager(persistenceConfig);
    }
  }

  /**
   * Initialize storage service with optional file persistence
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️  Storage service already initialized');
      return;
    }

    console.log('🔧 Initializing Storage Service...');

    if (this.persistenceManager) {
      try {
        console.log('📁 File persistence enabled, initializing...');
        await this.persistenceManager.initialize();

        console.log('📖 Loading persisted data...');
        const data = await this.persistenceManager.loadData();
        this.loadFromStorageData(data);

        console.log('✅ Storage service initialized with file persistence');
        console.log(`📊 Loaded: ${this.products.length} products, ${this.categories.length} categories`);

        // Test persistence by saving current state
        console.log('🧪 Testing persistence by saving current state...');
        await this.persist();

      } catch (error) {
        console.error('❌ Failed to initialize file persistence:', error);
        console.warn('🔄 Falling back to in-memory storage');
        this.persistenceManager = null;
      }
    } else {
      console.log('💾 File persistence disabled, using in-memory storage');
    }

    this.isInitialized = true;
    console.log('✅ Storage service initialization complete');
  }

  /**
   * Save current state to file (if persistence is enabled)
   */
  async persist(): Promise<StorageOperationResult | null> {
    if (!this.persistenceManager) {
      return null;
    }

    const data = this.createStorageData();
    return await this.persistenceManager.saveData(data);
  }

  /**
   * Restore from backup (if persistence is enabled)
   */
  async restoreFromBackup(): Promise<StorageOperationResult | null> {
    if (!this.persistenceManager) {
      throw new StorageError(
        StorageErrorType.UNKNOWN_ERROR,
        'Persistence is not enabled'
      );
    }

    const result = await this.persistenceManager.restoreFromBackup();
    const data = await this.persistenceManager.loadData();
    this.loadFromStorageData(data);
    return result;
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    productsCount: number;
    categoriesCount: number;
    rolesCount: number;
    namespaces: string[];
    persistenceEnabled: boolean;
  } {
    const rolesCount = Object.values(this.rolesByNamespace).reduce(
      (sum, roles) => sum + roles.length,
      0
    );

    return {
      productsCount: this.products.length,
      categoriesCount: this.categories.length,
      rolesCount,
      namespaces: Object.keys(this.rolesByNamespace),
      persistenceEnabled: this.persistenceManager !== null,
    };
  }

  /**
   * Test persistence functionality
   */
  async testPersistence(): Promise<{
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  }> {
    if (!this.persistenceManager) {
      return {
        success: false,
        message: 'Persistence is not enabled',
      };
    }

    try {
      console.log('🧪 Testing persistence functionality...');

      // Save current state
      const saveResult = await this.persist();
      console.log('✅ Save test passed');

      // Try to load the data back
      const loadedData = await this.persistenceManager.loadData();
      console.log('✅ Load test passed');

      // Verify data integrity
      const currentData = this.createStorageData();
      const dataMatches = JSON.stringify(currentData) === JSON.stringify(loadedData);

      if (!dataMatches) {
        return {
          success: false,
          message: 'Data integrity check failed - loaded data does not match current state',
          details: {
            currentProducts: currentData.products.length,
            loadedProducts: loadedData.products.length,
            currentCategories: currentData.categories.length,
            loadedCategories: loadedData.categories.length,
          },
        };
      }

      console.log('✅ Data integrity check passed');

      return {
        success: true,
        message: 'Persistence test completed successfully',
        details: {
          saveResult,
          dataIntegrityCheck: 'passed',
          persistenceEnabled: true,
        },
      };
    } catch (error) {
      console.error('❌ Persistence test failed:', error);
      return {
        success: false,
        message: `Persistence test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
  async dispose(): Promise<void> {
    if (this.persistenceManager) {
      // Save current state before disposal
      try {
        await this.persist();
      } catch (error) {
        console.warn('Warning: Failed to save state during disposal:', error);
      }

      await this.persistenceManager.dispose();
    }
  }

  /**
   * Create storage data structure from current state
   */
  private createStorageData(): StorageData {
    return {
      products: [...this.products],
      categories: [...this.categories],
      rolesByNamespace: { ...this.rolesByNamespace },
      metadata: {
        version: '1.0.0',
        lastModified: new Date().toISOString(),
        backupCount: 0,
      },
    };
  }

  /**
   * Load state from storage data
   */
  private loadFromStorageData(data: StorageData): void {
    this.products = [...data.products];
    this.categories = [...data.categories];
    this.rolesByNamespace = { ...data.rolesByNamespace };
  }

  /**
   * Helper method to persist after mutations (if auto-save is disabled)
   */
  private async persistIfEnabled(): Promise<void> {
    if (this.persistenceManager && (!this.persistenceConfig?.autoSaveInterval || this.persistenceConfig.autoSaveInterval === 0)) {
      try {
        await this.persist();
      } catch (error) {
        console.warn('Warning: Failed to persist changes:', error);
      }
    }
  }

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
  async createProduct(name: string, category: string, price: number, tenantId?: string): Promise<Product> {
    const newProduct: Product = {
      id: Math.max(...this.products.map((p) => p.id), 0) + 1,
      name,
      category,
      price,
      tenantId: tenantId || null,
      createdAt: new Date().toISOString(),
    };
    this.products.push(newProduct);
    await this.persistIfEnabled();
    return newProduct;
  }

  /**
   * Update product
   */
  async updateProduct(
    id: number,
    updates: { name?: string; category?: string; price?: number }
  ): Promise<Product | undefined> {
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
    await this.persistIfEnabled();
    return updated;
  }

  /**
   * Delete product
   */
  async deleteProduct(id: number): Promise<Product | undefined> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return undefined;
    }
    const deleted = this.products.splice(index, 1)[0];
    await this.persistIfEnabled();
    return deleted;
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
  async createCategory(name: string, description: string, tenantId?: string): Promise<Category> {
    const newCategory: Category = {
      id: Math.max(...this.categories.map((c) => c.id), 0) + 1,
      name,
      description,
      tenantId: tenantId || null,
      createdAt: new Date().toISOString(),
    };
    this.categories.push(newCategory);
    await this.persistIfEnabled();
    return newCategory;
  }

  /**
   * Update category
   */
  async updateCategory(
    id: number,
    updates: { name?: string; description?: string }
  ): Promise<Category | undefined> {
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
    await this.persistIfEnabled();
    return updated;
  }

  /**
   * Delete category
   */
  async deleteCategory(id: number): Promise<Category | undefined> {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) {
      return undefined;
    }
    const deleted = this.categories.splice(index, 1)[0];
    await this.persistIfEnabled();
    return deleted;
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
  async createRole(
    namespace: string,
    name: string,
    description: string,
    tenantId?: string,
    inheritsFrom?: string[]
  ): Promise<Role> {
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
    await this.persistIfEnabled();
    return newRole;
  }

  /**
   * Update role
   */
  async updateRole(
    namespace: string,
    roleName: string,
    updates: { name?: string; description?: string; inheritsFrom?: string[] }
  ): Promise<Role | undefined> {
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
    await this.persistIfEnabled();
    return updated;
  }

  /**
   * Delete role
   */
  async deleteRole(namespace: string, roleName: string): Promise<Role | undefined> {
    const roles = this.rolesByNamespace[namespace];
    if (!roles) {
      return undefined;
    }

    const index = roles.findIndex((r) => r.name === roleName);
    if (index === -1) {
      return undefined;
    }

    const deleted = this.rolesByNamespace[namespace]!.splice(index, 1)[0];
    await this.persistIfEnabled();
    return deleted;
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
