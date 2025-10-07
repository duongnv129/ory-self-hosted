/**
 * Keto service for authorization and permission management
 *
 * This service provides methods to interact with Ory Keto's Read API
 * to fetch relation tuples and determine role permissions.
 */

import axios, { AxiosError } from 'axios';
import { Permission } from '../types/responses';

/**
 * Keto relation tuple structure
 * Represents a relationship in the Zanzibar-style permission model
 */
interface KetoRelationTuple {
  namespace: string;
  object: string;
  relation: string;
  subject_id?: string;
  subject_set?: {
    namespace: string;
    object: string;
    relation: string;
  };
}

/**
 * Response structure from Keto Read API
 */
interface KetoRelationTuplesResponse {
  relation_tuples: KetoRelationTuple[];
  next_page_token?: string;
}

/**
 * Keto service error class
 */
export class KetoError extends Error {
  constructor(
    message: string,
    public readonly details?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'KetoError';
  }
}

/**
 * Keto Read API client service
 *
 * Provides methods to query Ory Keto for relation tuples and permissions.
 * Keto uses a Zanzibar-style permission model where relationships are
 * represented as tuples: (namespace, object, relation, subject).
 */
export class KetoService {
  private readonly readUrl: string;

  /**
   * Initialize Keto service with Read API URL
   * @param readUrl - Keto Read API base URL (defaults to http://keto:4466)
   */
  constructor(readUrl?: string) {
    this.readUrl = readUrl || process.env.KETO_READ_URL || 'http://keto:4466';
  }

  /**
   * Get all permissions for a specific role by querying Keto relation tuples
   *
   * This method queries Keto for all relation tuples where the subject is
   * the specified role (subject_set with relation "member"). It returns
   * an array of permissions in the format {resource, action}.
   *
   * @param namespace - The Keto namespace to query (e.g., "default")
   * @param roleName - The name of the role (e.g., "admin", "moderator")
   * @returns Array of permissions with resource and action
   *
   * @example
   * const permissions = await ketoService.getPermissionsForRole("default", "admin");
   * // Returns: [
   * //   { resource: "product:items", action: "view" },
   * //   { resource: "product:items", action: "create" }
   * // ]
   */
  async getPermissionsForRole(namespace: string, roleName: string): Promise<Permission[]> {
    try {
      // Query Keto for relation tuples where the subject is this role
      // Format: subject_set.object = "role:admin" AND subject_set.relation = "member"
      const response = await axios.get<KetoRelationTuplesResponse>(
        `${this.readUrl}/relation-tuples`,
        {
          params: {
            namespace,
            'subject_set.namespace': namespace,
            'subject_set.object': `role:${roleName}`,
            'subject_set.relation': 'member',
          },
        }
      );

      // Transform Keto tuples to Permission format
      const permissions: Permission[] = response.data.relation_tuples.map((tuple) => ({
        resource: tuple.object,
        action: tuple.relation,
      }));

      return permissions;
    } catch (error) {
      throw this.handleKetoError(error, 'Failed to fetch permissions from Keto');
    }
  }

  /**
   * Check if a specific permission exists for a role
   *
   * @param namespace - The Keto namespace
   * @param roleName - The name of the role
   * @param resource - The resource object (e.g., "product:items")
   * @param action - The relation/action (e.g., "create", "view")
   * @returns True if the permission exists, false otherwise
   */
  async checkPermission(
    namespace: string,
    roleName: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const response = await axios.get(`${this.readUrl}/relation-tuples/check`, {
        params: {
          namespace,
          object: resource,
          relation: action,
          'subject_set.namespace': namespace,
          'subject_set.object': `role:${roleName}`,
          'subject_set.relation': 'member',
        },
      });

      return response.data.allowed === true;
    } catch (error) {
      // If Keto is unavailable, default to false for safety
      if (this.isConnectionError(error)) {
        return false;
      }
      throw this.handleKetoError(error, 'Failed to check permission');
    }
  }

  /**
   * Get all relation tuples in a namespace
   *
   * @param namespace - The Keto namespace
   * @returns Array of relation tuples
   */
  async listRelationTuples(namespace: string): Promise<KetoRelationTuple[]> {
    try {
      const response = await axios.get<KetoRelationTuplesResponse>(
        `${this.readUrl}/relation-tuples`,
        {
          params: { namespace },
        }
      );

      return response.data.relation_tuples || [];
    } catch (error) {
      throw this.handleKetoError(error, 'Failed to list relation tuples');
    }
  }

  /**
   * Check if error is a network/connection error
   */
  private isConnectionError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      return (
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        !error.response
      );
    }
    return false;
  }

  /**
   * Handle Keto API errors with proper error transformation
   */
  private handleKetoError(error: unknown, defaultMessage: string): KetoError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: { message?: string } }>;

      // Connection errors
      if (this.isConnectionError(error)) {
        return new KetoError(
          'Keto service unavailable',
          'Unable to connect to Keto Read API. Please ensure Keto is running.',
          503
        );
      }

      // API errors with response
      const statusCode = axiosError.response?.status;
      const errorMessage =
        axiosError.response?.data?.error?.message || axiosError.message || defaultMessage;

      return new KetoError(defaultMessage, errorMessage, statusCode);
    }

    if (error instanceof Error) {
      return new KetoError(defaultMessage, error.message);
    }

    return new KetoError(defaultMessage);
  }
}
