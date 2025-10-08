/**
 * Metadata Types
 * Defines system resources and permissions
 */

export interface ResourcePermissions {
  resource: string;
  permissions: string[];
}

export interface SystemMetadata {
  resources: ResourcePermissions[];
}
