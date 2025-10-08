/**
 * Storage-related types and interfaces
 */

import { Product, Category, Role } from './models';

/**
 * Complete storage data structure for file persistence
 */
export interface StorageData {
  products: Product[];
  categories: Category[];
  rolesByNamespace: Record<string, Role[]>;
  metadata: StorageMetadata;
}

/**
 * Metadata for storage operations
 */
export interface StorageMetadata {
  version: string;
  lastModified: string;
  backupCount: number;
}

/**
 * Configuration options for file persistence
 */
export interface PersistenceConfig {
  /** Primary data file path */
  dataFilePath: string;
  /** Backup directory path */
  backupDir: string;
  /** Maximum number of backup files to keep */
  maxBackups: number;
  /** Auto-save interval in milliseconds (0 to disable) */
  autoSaveInterval: number;
  /** Enable compression for backup files */
  compression: boolean;
}

/**
 * Storage operation result
 */
export interface StorageOperationResult {
  success: boolean;
  message: string;
  timestamp: string;
  backupCreated?: string;
}

/**
 * Storage error types
 */
export enum StorageErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  CORRUPTION_DETECTED = 'CORRUPTION_DETECTED',
  BACKUP_FAILED = 'BACKUP_FAILED',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom storage error class
 */
export class StorageError extends Error {
  constructor(
    public readonly type: StorageErrorType,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
