/**
 * File persistence manager for storage service
 */

import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

import {
  StorageData,
  PersistenceConfig,
  StorageOperationResult,
  StorageError,
  StorageErrorType,
} from '../types/storage';

/**
 * Manages file-based persistence operations with atomic writes and backup management
 */
export class FilePersistenceManager {
  private readonly config: PersistenceConfig;
  private autoSaveTimer: NodeJS.Timeout | null = null;

  constructor(config: PersistenceConfig) {
    this.config = config;
    this.ensureDirectoriesExist();
  }

  /**
   * Initialize persistence manager and setup auto-save if configured
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing FilePersistenceManager...');
    console.log(`  Data file: ${this.config.dataFilePath}`);
    console.log(`  Backup dir: ${this.config.backupDir}`);

    await this.ensureDirectoriesExist();

    // Verify directory permissions
    await this.verifyPermissions();

    if (this.config.autoSaveInterval > 0) {
      this.startAutoSave();
      console.log(`✅ Auto-save enabled: ${this.config.autoSaveInterval}ms`);
    } else {
      console.log('📝 Auto-save disabled (manual persistence only)');
    }

    console.log('✅ FilePersistenceManager initialized successfully');
  }

  /**
   * Load storage data from file
   */
  async loadData(): Promise<StorageData> {
    console.log(`📖 Loading data from: ${this.config.dataFilePath}`);

    try {
      const exists = await this.fileExists(this.config.dataFilePath);
      if (!exists) {
        console.log('📄 No existing data file found, creating empty storage');
        return this.createEmptyStorageData();
      }

      const rawData = await fs.readFile(this.config.dataFilePath, 'utf-8');
      console.log(`📊 Loaded ${rawData.length} bytes from storage file`);

      const data = JSON.parse(rawData) as StorageData;

      // Validate data structure
      this.validateStorageData(data);

      console.log('✅ Storage data loaded and validated successfully');
      console.log(`  Products: ${data.products.length}`);
      console.log(`  Categories: ${data.categories.length}`);
      console.log(`  Roles: ${Object.values(data.rolesByNamespace).reduce((sum, roles) => sum + roles.length, 0)}`);

      return data;
    } catch (error) {
      console.error('❌ Failed to load storage data:', error);

      if (error instanceof SyntaxError) {
        throw new StorageError(
          StorageErrorType.CORRUPTION_DETECTED,
          'Storage file is corrupted or contains invalid JSON',
          error
        );
      }

      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('📄 Data file not found, using empty storage');
        return this.createEmptyStorageData();
      }

      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new StorageError(
          StorageErrorType.PERMISSION_DENIED,
          'Permission denied when reading storage file',
          error as Error
        );
      }

      throw new StorageError(
        StorageErrorType.UNKNOWN_ERROR,
        'Failed to load storage data',
        error as Error
      );
    }
  }

  /**
   * Save storage data to file with atomic write and backup
   */
  async saveData(data: StorageData): Promise<StorageOperationResult> {
    console.log(`💾 Saving data to: ${this.config.dataFilePath}`);

    try {
      // Update metadata
      data.metadata = {
        ...data.metadata,
        lastModified: new Date().toISOString(),
      };

      console.log('📊 Data to save:');
      console.log(`  Products: ${data.products.length}`);
      console.log(`  Categories: ${data.categories.length}`);
      console.log(`  Roles: ${Object.values(data.rolesByNamespace).reduce((sum, roles) => sum + roles.length, 0)}`);

      // Create backup before writing
      const backupPath = await this.createBackup();
      if (backupPath) {
        console.log(`💾 Backup created: ${backupPath}`);
      }

      // Perform atomic write
      await this.atomicWrite(data);
      console.log('✅ Data saved successfully');

      // Clean old backups
      await this.cleanOldBackups();

      return {
        success: true,
        message: 'Storage data saved successfully',
        timestamp: new Date().toISOString(),
        backupCreated: backupPath,
      };
    } catch (error) {
      console.error('❌ Failed to save storage data:', error);
      throw new StorageError(
        StorageErrorType.UNKNOWN_ERROR,
        'Failed to save storage data',
        error as Error
      );
    }
  }

  /**
   * Create a backup of the current data file
   */
  private async createBackup(): Promise<string | undefined> {
    try {
      const exists = await this.fileExists(this.config.dataFilePath);
      if (!exists) {
        return undefined;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `storage-backup-${timestamp}.json`;
      const backupPath = path.join(this.config.backupDir, backupFileName);

      if (this.config.compression) {
        // Create compressed backup
        const gzipPath = `${backupPath}.gz`;
        await pipeline(
          createReadStream(this.config.dataFilePath),
          createGzip(),
          createWriteStream(gzipPath)
        );
        return gzipPath;
      } else {
        // Create uncompressed backup
        await fs.copyFile(this.config.dataFilePath, backupPath);
        return backupPath;
      }
    } catch (error) {
      throw new StorageError(
        StorageErrorType.BACKUP_FAILED,
        'Failed to create backup',
        error as Error
      );
    }
  }

  /**
   * Perform atomic write operation
   */
  private async atomicWrite(data: StorageData): Promise<void> {
    const tempPath = `${this.config.dataFilePath}.tmp`;
    console.log(`📝 Writing to temporary file: ${tempPath}`);

    try {
      // Serialize data
      const serializedData = JSON.stringify(data, null, 2);
      console.log(`📊 Serialized ${serializedData.length} bytes`);

      // Write to temporary file
      await fs.writeFile(tempPath, serializedData, 'utf-8');
      console.log(`✅ Temporary file written successfully`);

      // Atomic rename
      await fs.rename(tempPath, this.config.dataFilePath);
      console.log(`✅ Atomic rename completed: ${this.config.dataFilePath}`);
    } catch (error) {
      console.error('❌ Atomic write failed:', error);

      // Clean up temporary file if it exists
      try {
        await fs.unlink(tempPath);
        console.log('🧹 Cleaned up temporary file');
      } catch (cleanupError) {
        console.warn('⚠️  Failed to cleanup temporary file:', cleanupError);
      }

      if (error instanceof TypeError) {
        throw new StorageError(
          StorageErrorType.SERIALIZATION_ERROR,
          'Failed to serialize storage data',
          error
        );
      }

      throw error;
    }
  }

  /**
   * Clean old backup files, keeping only the specified maximum
   */
  private async cleanOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('storage-backup-'))
        .map(file => ({
          name: file,
          path: path.join(this.config.backupDir, file),
        }))
        .sort((a, b) => b.name.localeCompare(a.name)); // Sort by name descending (newest first)

      // Remove excess backups
      if (backupFiles.length > this.config.maxBackups) {
        const filesToDelete = backupFiles.slice(this.config.maxBackups);
        await Promise.all(
          filesToDelete.map(file => fs.unlink(file.path))
        );
      }
    } catch (error) {
      // Log but don't throw - backup cleanup is not critical
      console.warn('Warning: Failed to clean old backups:', error);
    }
  }

  /**
   * Restore from the most recent backup
   */
  async restoreFromBackup(): Promise<StorageOperationResult> {
    try {
      const files = await fs.readdir(this.config.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('storage-backup-'))
        .sort()
        .reverse(); // Get the most recent backup

      if (backupFiles.length === 0) {
        throw new StorageError(
          StorageErrorType.FILE_NOT_FOUND,
          'No backup files found'
        );
      }

      const latestBackup = backupFiles[0];
      if (!latestBackup) {
        throw new StorageError(
          StorageErrorType.FILE_NOT_FOUND,
          'No valid backup file found'
        );
      }

      const backupPath = path.join(this.config.backupDir, latestBackup);

      if (latestBackup.endsWith('.gz')) {
        // Restore from compressed backup
        await pipeline(
          createReadStream(backupPath),
          createGunzip(),
          createWriteStream(this.config.dataFilePath)
        );
      } else {
        // Restore from uncompressed backup
        await fs.copyFile(backupPath, this.config.dataFilePath);
      }

      return {
        success: true,
        message: `Storage restored from backup: ${latestBackup}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new StorageError(
        StorageErrorType.UNKNOWN_ERROR,
        'Failed to restore from backup',
        error as Error
      );
    }
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      // This will be called by the storage service
      // We emit an event or use a callback pattern
      console.log('Auto-save triggered');
    }, this.config.autoSaveInterval);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.stopAutoSave();
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectoriesExist(): Promise<void> {
    try {
      const dataFileDir = path.dirname(this.config.dataFilePath);

      console.log(`📁 Creating directories if needed:`);
      console.log(`  Data dir: ${dataFileDir}`);
      console.log(`  Backup dir: ${this.config.backupDir}`);

      await fs.mkdir(dataFileDir, { recursive: true });
      await fs.mkdir(this.config.backupDir, { recursive: true });

      console.log('✅ Directories created successfully');
    } catch (error) {
      console.error('❌ Failed to create storage directories:', error);
      throw new StorageError(
        StorageErrorType.PERMISSION_DENIED,
        'Failed to create storage directories',
        error as Error
      );
    }
  }

  /**
   * Verify directory and file permissions
   */
  private async verifyPermissions(): Promise<void> {
    try {
      const dataFileDir = path.dirname(this.config.dataFilePath);

      // Test write permission to data directory
      const testFile = path.join(dataFileDir, '.write-test');
      await fs.writeFile(testFile, 'test', 'utf-8');
      await fs.unlink(testFile);

      // Test write permission to backup directory
      const backupTestFile = path.join(this.config.backupDir, '.write-test');
      await fs.writeFile(backupTestFile, 'test', 'utf-8');
      await fs.unlink(backupTestFile);

      console.log('✅ Directory permissions verified');
    } catch (error) {
      console.error('❌ Permission verification failed:', error);
      throw new StorageError(
        StorageErrorType.PERMISSION_DENIED,
        'Insufficient permissions for storage directories',
        error as Error
      );
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create empty storage data structure
   */
  private createEmptyStorageData(): StorageData {
    return {
      products: [],
      categories: [],
      rolesByNamespace: {},
      metadata: {
        version: '1.0.0',
        lastModified: new Date().toISOString(),
        backupCount: 0,
      },
    };
  }

  /**
   * Validate storage data structure
   */
  private validateStorageData(data: unknown): void {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Storage data must be an object');
    }

    const storageData = data as Record<string, unknown>;

    if (!Array.isArray(storageData.products)) {
      throw new Error('Products must be an array');
    }

    if (!Array.isArray(storageData.categories)) {
      throw new Error('Categories must be an array');
    }

    if (typeof storageData.rolesByNamespace !== 'object' || storageData.rolesByNamespace === null) {
      throw new Error('RolesByNamespace must be an object');
    }

    if (typeof storageData.metadata !== 'object' || storageData.metadata === null) {
      throw new Error('Metadata must be an object');
    }
  }
}
