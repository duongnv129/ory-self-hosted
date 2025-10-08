/**
 * Metadata API Client
 * Fetches system metadata including resources and their permissions
 */

import { apiClient } from '@/lib/api/client';

export interface ResourcePermissions {
  resource: string;
  permissions: string[];
}

export interface MetadataResponse {
  message: string;
  data: {
    resources: ResourcePermissions[];
  };
}

export const metadataApi = {
  /**
   * Get system metadata (resources and their permissions)
   */
  async getMetadata(): Promise<MetadataResponse> {
    const response = await apiClient.get<MetadataResponse>('/metadata/list');
    return response;
  },

  /**
   * Get permissions for a specific resource
   */
  async getResourcePermissions(resource: string): Promise<string[]> {
    const metadata = await this.getMetadata();
    const found = metadata.data.resources.find(r => r.resource === resource);
    return found ? found.permissions : [];
  },

  /**
   * Get all available resources
   */
  async getResources(): Promise<string[]> {
    const metadata = await this.getMetadata();
    return metadata.data.resources.map(r => r.resource);
  },
};
