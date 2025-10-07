/**
 * Kratos service for identity management
 */

import axios, { AxiosError } from 'axios';
import { User, UserName, KratosIdentity } from '../types/models';
import { KratosError } from '../types/errors';

/**
 * Kratos Admin API client service
 */
export class KratosService {
  private readonly adminUrl: string;

  constructor(adminUrl?: string) {
    this.adminUrl = adminUrl || process.env.KRATOS_ADMIN_URL || 'http://kratos:4434';
  }

  /**
   * Create a new identity in Kratos
   */
  async createIdentity(
    email: string,
    name: UserName,
    tenantIds: string[] = []
  ): Promise<User> {
    try {
      const identity = {
        schema_id: 'default',
        traits: {
          email,
          name: {
            first: name.first || '',
            last: name.last || '',
          },
          tenant_ids: tenantIds,
        },
      };

      const response = await axios.post<KratosIdentity>(
        `${this.adminUrl}/admin/identities`,
        identity
      );

      return this.mapIdentityToUser(response.data);
    } catch (error) {
      throw this.handleKratosError(error, 'Failed to create identity');
    }
  }

  /**
   * List all identities from Kratos
   */
  async listIdentities(): Promise<User[]> {
    try {
      const response = await axios.get<KratosIdentity[]>(
        `${this.adminUrl}/admin/identities`
      );
      return response.data.map((identity) => this.mapIdentityToUser(identity));
    } catch (error) {
      throw this.handleKratosError(error, 'Failed to list identities');
    }
  }

  /**
   * Get identity by ID from Kratos
   */
  async getIdentity(id: string): Promise<User | null> {
    try {
      const response = await axios.get<KratosIdentity>(
        `${this.adminUrl}/admin/identities/${id}`
      );
      return this.mapIdentityToUser(response.data);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw this.handleKratosError(error, 'Failed to get identity');
    }
  }

  /**
   * Update identity in Kratos
   */
  async updateIdentity(
    id: string,
    email: string,
    name: UserName,
    tenantIds: string[] = []
  ): Promise<User> {
    try {
      const identity = {
        schema_id: 'default',
        traits: {
          email,
          name: {
            first: name.first || '',
            last: name.last || '',
          },
          tenant_ids: tenantIds,
        },
        state: 'active',
      };

      const response = await axios.put<KratosIdentity>(
        `${this.adminUrl}/admin/identities/${id}`,
        identity
      );

      return this.mapIdentityToUser(response.data);
    } catch (error) {
      throw this.handleKratosError(error, 'Failed to update identity');
    }
  }

  /**
   * Delete identity from Kratos
   */
  async deleteIdentity(id: string): Promise<boolean> {
    try {
      await axios.delete(`${this.adminUrl}/admin/identities/${id}`);
      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw this.handleKratosError(error, 'Failed to delete identity');
    }
  }

  /**
   * Map Kratos identity to User model
   */
  private mapIdentityToUser(identity: KratosIdentity): User {
    return {
      id: identity.id,
      email: identity.traits?.email || '',
      name: {
        first: identity.traits?.name?.first || '',
        last: identity.traits?.name?.last || '',
      },
      tenant_ids: identity.traits?.tenant_ids || [],
      created_at: identity.created_at,
      updated_at: identity.updated_at,
      state: identity.state,
    };
  }

  /**
   * Check if error is a 404 Not Found
   */
  private isNotFoundError(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 404;
  }

  /**
   * Handle Kratos API errors
   */
  private handleKratosError(error: unknown, defaultMessage: string): KratosError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: { message?: string } }>;
      const errorMessage =
        axiosError.response?.data?.error?.message || axiosError.message;
      return new KratosError(defaultMessage, errorMessage);
    }

    if (error instanceof Error) {
      return new KratosError(defaultMessage, error.message);
    }

    return new KratosError(defaultMessage);
  }
}
