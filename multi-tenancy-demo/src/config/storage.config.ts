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
 * Create storage configuration from environment variables with enhanced validation
 */
export function createStorageConfig(): PersistenceConfig {
  const dataDir = process.env.STORAGE_DATA_DIR || path.join(process.cwd(), 'data');

  // Validate and normalize paths
  const dataFilePath = process.env.STORAGE_FILE_PATH || path.join(dataDir, 'storage.json');
  const backupDir = process.env.STORAGE_BACKUP_DIR || path.join(dataDir, 'backups');

  // Validate numeric values
  const maxBackups = validatePositiveInteger(process.env.STORAGE_MAX_BACKUPS, 10, 'STORAGE_MAX_BACKUPS');
  const autoSaveInterval = validatePositiveInteger(process.env.STORAGE_AUTO_SAVE_INTERVAL, 30000, 'STORAGE_AUTO_SAVE_INTERVAL');

  const config: PersistenceConfig = {
    dataFilePath: path.resolve(dataFilePath),
    backupDir: path.resolve(backupDir),
    maxBackups,
    autoSaveInterval,
    compression: process.env.STORAGE_COMPRESSION === 'true',
  };

  // Log configuration for debugging
  console.log('📁 Storage Configuration:');
  console.log(`  Data File: ${config.dataFilePath}`);
  console.log(`  Backup Dir: ${config.backupDir}`);
  console.log(`  Max Backups: ${config.maxBackups}`);
  console.log(`  Auto-save: ${config.autoSaveInterval}ms`);
  console.log(`  Compression: ${config.compression}`);

  return config;
}

/**
 * Validate and parse positive integer from environment variable
 */
function validatePositiveInteger(value: string | undefined, defaultValue: number, envVarName: string): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0) {
    console.warn(`⚠️  Invalid ${envVarName}: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }

  return parsed;
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
