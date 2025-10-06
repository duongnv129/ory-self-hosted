/**
 * Base API Client
 * Axios-based HTTP client with interceptors for Oathkeeper integration
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private client: AxiosInstance;
  private tenantId?: string;

  constructor(baseURL: string = env.oathkeeperUrl) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      withCredentials: true, // Include Kratos session cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Set tenant context for all subsequent requests
   */
  setTenantContext(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Get current tenant context
   */
  getTenantContext(): string | undefined {
    return this.tenantId;
  }

  /**
   * Clear tenant context
   */
  clearTenantContext() {
    this.tenantId = undefined;
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors() {
    // Request interceptor: Conditionally add x-tenant-id header based on context
    // - Simple RBAC: tenantId is null (cleared by layout), NO header added -> global operations
    // - Tenant/Resource RBAC: tenantId is set, header IS added -> tenant-scoped operations
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.tenantId) {
          config.headers['x-tenant-id'] = this.tenantId;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Handle API errors with consistent error types
   */
  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      const statusCode = error.response.status;
      const data = error.response.data as { message?: string; details?: string; error?: string };

      // Handle authentication errors (401)
      if (statusCode === 401) {
        // Redirect to login page (handled by consuming components)
        if (typeof window !== 'undefined') {
          console.warn('Authentication failed - session expired or invalid');
        }
        return new ApiError(
          'Authentication required',
          statusCode,
          'Your session has expired. Please log in again.'
        );
      }

      // Handle authorization errors (403)
      if (statusCode === 403) {
        return new ApiError(
          'Insufficient permissions',
          statusCode,
          'You do not have permission to perform this action.'
        );
      }

      // Handle not found errors (404)
      if (statusCode === 404) {
        return new ApiError('Resource not found', statusCode, data?.message || error.message);
      }

      // Handle validation errors (400)
      if (statusCode === 400) {
        return new ApiError('Validation error', statusCode, data?.message || error.message);
      }

      // Handle server errors (500+)
      if (statusCode >= 500) {
        return new ApiError(
          'Server error',
          statusCode,
          'An unexpected error occurred. Please try again later.'
        );
      }

      // Generic HTTP error
      return new ApiError(
        data?.message || 'An error occurred',
        statusCode,
        data?.details || error.message
      );
    }

    // Network or timeout errors
    if (error.request) {
      return new ApiError(
        'Network error',
        undefined,
        'Unable to connect to the server. Please check your internet connection.'
      );
    }

    // Other errors
    return new ApiError('Request failed', undefined, error.message);
  }

  /**
   * HTTP GET request
   */
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  /**
   * HTTP POST request
   */
  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  /**
   * HTTP PUT request
   */
  async put<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  /**
   * HTTP DELETE request
   */
  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}

// Singleton instance for app-wide use
export const apiClient = new ApiClient();
