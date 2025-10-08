/**
 * Storage configuration factory
 */

import path from 'path';
import { PersistenceConfig } from '../types/storage';

/**
 * Default storage configuration
 */
export const DEFAULT_STORAGE_CONFIG: PersistenceConfig = {
  dataFilePath: path.join(process.cwd(), 'data', 'storage.json'),
  backupDir: path.join(process.cwd(), 'data', 'backups'),
  maxBackups: 10,
  autoSaveInterval: 30000, // 30 seconds
  compression: true,
};

/**
 * Create storage configuration from environment variables
 */
export function createStorageConfig(): PersistenceConfig {
  const dataDir = process.env.STORAGE_DATA_DIR || path.join(process.cwd(), 'data');

  return {
    dataFilePath: process.env.STORAGE_FILE_PATH || path.join(dataDir, 'storage.json'),
    backupDir: process.env.STORAGE_BACKUP_DIR || path.join(dataDir, 'backups'),
    maxBackups: parseInt(process.env.STORAGE_MAX_BACKUPS || '10', 10),
    autoSaveInterval: parseInt(process.env.STORAGE_AUTO_SAVE_INTERVAL || '30000', 10),
    compression: process.env.STORAGE_COMPRESSION === 'true',
  };
}

/**
 * Create in-memory only configuration (no persistence)
 */
export function createInMemoryConfig(): undefined {
  return undefined;
}

/**
 * Environment variable documentation
 */
export const STORAGE_ENV_VARS = {
  STORAGE_DATA_DIR: 'Base directory for storage files (default: ./data)',
  STORAGE_FILE_PATH: 'Full path to the main storage file (default: ./data/storage.json)',
  STORAGE_BACKUP_DIR: 'Directory for backup files (default: ./data/backups)',
  STORAGE_MAX_BACKUPS: 'Maximum number of backup files to keep (default: 10)',
  STORAGE_AUTO_SAVE_INTERVAL: 'Auto-save interval in milliseconds, 0 to disable (default: 30000)',
  STORAGE_COMPRESSION: 'Enable compression for backup files (default: false)',
} as const;
