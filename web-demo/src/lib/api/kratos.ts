/**
 * Kratos API Client
 * Handles all Kratos authentication flows through Oathkeeper
 */

import axios, { AxiosInstance } from 'axios';
import { env } from '@/config/env';

// Kratos types
export interface Session {
  id: string;
  active: boolean;
  expires_at: string;
  authenticated_at: string;
  identity: Identity;
}

export interface Identity {
  id: string;
  schema_id: string;
  traits: {
    email: string;
    name: {
      first: string;
      last: string;
    };
    tenant_ids: string[];
  };
}

export interface LoginFlow {
  id: string;
  ui: {
    action: string;
    method: string;
    nodes: UINode[];
  };
}

export interface RegistrationFlow {
  id: string;
  ui: {
    action: string;
    method: string;
    nodes: UINode[];
  };
}

export interface UINode {
  type: string;
  group: string;
  attributes: {
    name: string;
    type: string;
    value?: string;
    disabled?: boolean;
    node_type?: string;
  };
  messages?: Array<{
    id: number;
    text: string;
    type: string;
  }>;
}

export interface LogoutFlow {
  logout_token: string;
  logout_url: string;
}

export class KratosClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.oathkeeperUrl,
      withCredentials: true, // Important: Include session cookie
      headers: {
        'Accept': 'application/json',
      }
    });
  }

  // Helper: Extract CSRF token from flow UI nodes
  private extractCSRFToken(flow: LoginFlow | RegistrationFlow): string {
    const csrfNode = flow.ui.nodes.find(
      (node) => node.attributes.name === 'csrf_token'
    );
    return csrfNode?.attributes.value || '';
  }

  // Session management
  async getSession(): Promise<Session> {
    const response = await this.client.get('/sessions/whoami');
    return response.data;
  }

  // Login flow
  async createLoginFlow(returnTo?: string): Promise<LoginFlow> {
    const params = returnTo ? { return_to: returnTo } : {};
    const response = await this.client.get('/self-service/login/browser', { params });
    return response.data;
  }

  async submitLogin(flow: LoginFlow, email: string, password: string): Promise<Session> {
    const csrfToken = this.extractCSRFToken(flow);

    const response = await this.client.post(
      `/self-service/login?flow=${flow.id}`,
      {
        csrf_token: csrfToken,
        method: 'password',
        password,
        password_identifier: email,
      }
    );
    return response.data;
  }

  // Registration flow
  async createRegistrationFlow(returnTo?: string): Promise<RegistrationFlow> {
    const params = returnTo ? { return_to: returnTo } : {};
    const response = await this.client.get('/self-service/registration/browser', { params });
    return response.data;
  }

  async submitRegistration(
    flow: RegistrationFlow,
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<Session> {
    const csrfToken = this.extractCSRFToken(flow);

    const response = await this.client.post(
      `/self-service/registration?flow=${flow.id}`,
      {
        csrf_token: csrfToken,
        method: 'password',
        password,
        traits: {
          email,
          name: {
            first: firstName,
            last: lastName,
          },
          tenant_ids: ['tenant-a'], // Default tenant
        },
      }
    );
    return response.data;
  }

  // Logout flow
  async createLogoutFlow(): Promise<LogoutFlow> {
    const response = await this.client.get('/self-service/logout/browser');
    return response.data;
  }

  async submitLogout(token: string): Promise<void> {
    await this.client.get(`/self-service/logout?token=${token}`);
  }
}

export const kratosClient = new KratosClient();
