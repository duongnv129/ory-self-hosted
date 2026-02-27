# Oathkeeper Integration Guide for Web Demo

> Comprehensive guide for integrating Web Demo with Oathkeeper API Gateway

**Status**: 📋 Architecture Design
**Last Updated**: 2025-01-15

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Request Flow](#request-flow)
- [Oathkeeper Access Rules](#oathkeeper-access-rules)
- [API Client Configuration](#api-client-configuration)
- [Authentication Flow](#authentication-flow)
- [Authorization Flow](#authorization-flow)
- [Implementation Changes](#implementation-changes)

---

## Overview

The Web Demo uses **Oathkeeper as the single API gateway** for all backend communication. This provides:

- ✅ **Single Entry Point**: All requests go through `http://localhost:4455`
- ✅ **Centralized Authentication**: Kratos session validation at gateway
- ✅ **Centralized Authorization**: Keto permission checks at gateway
- ✅ **Header Injection**: Automatic user context propagation
- ✅ **Security**: Backend never directly accessible from web demo

### Why Oathkeeper?

| Without Oathkeeper | With Oathkeeper |
|-------------------|-----------------|
| Web Demo calls Kratos, Keto, Backend directly | Web Demo calls only Oathkeeper |
| Authentication logic in frontend | Authentication at gateway |
| Permission checks in frontend code | Authorization at gateway |
| Multiple API endpoints to manage | Single API endpoint |
| Security logic duplicated | Security logic centralized |

---

## Architecture

### System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Web Demo (Next.js)                        │
│                                                              │
│  API Client Configuration:                                   │
│  - baseURL: http://localhost:4455                           │
│  - credentials: 'include' (for cookies)                     │
│  - headers: { 'x-tenant-id': currentTenant }                │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ HTTP Requests
                     │ (with Kratos session cookie)
                     ▼
┌──────────────────────────────────────────────────────────────┐
│              Oathkeeper (API Gateway :4455)                  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Access Rule Matching                                  │ │
│  │  - Match URL pattern                                   │ │
│  │  - Match HTTP method                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. Authenticator: cookie_session                      │ │
│  │     → Validate Kratos session cookie                   │ │
│  │     → Extract user identity                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  2. Authorizer: keto_engine_acp_ory                    │ │
│  │     → Check permission in Keto                         │ │
│  │     → namespace: default                               │ │
│  │     → object: tenant:a#product:items                   │ │
│  │     → relation: create                                 │ │
│  │     → subject: user:alice                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  3. Mutator: header                                    │ │
│  │     → Inject X-User-Id                                 │ │
│  │     → Inject X-User-Email                              │ │
│  │     → Inject X-User-Traits                             │ │
│  │     → Forward x-tenant-id                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  4. Upstream Proxy                                     │ │
│  │     → Forward to http://multi-tenancy-demo:9000        │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│         Multi-Tenancy Demo Backend (:9000)                   │
│                                                              │
│  Receives request with headers:                              │
│  - X-User-Id: user-001                                      │
│  - X-User-Email: alice@tenant-a.com                         │
│  - X-User-Traits: {"email":"alice@...","name":{...}}       │
│  - x-tenant-id: tenant-a                                    │
│                                                              │
│  → No authentication/authorization logic needed              │
│  → Just business logic and data access                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Request Flow

### Example: Create Product

```
1. User clicks "Create Product" in Web Demo
   ↓
2. Web Demo sends request:
   POST http://localhost:4455/products/create
   Headers:
     Cookie: ory_kratos_session=MTY...
     Content-Type: application/json
     x-tenant-id: tenant-a
   Body:
     {"name": "Product X", "price": 99.99}
   ↓
3. Oathkeeper receives request
   ↓
4. Oathkeeper: Authenticator (cookie_session)
   → Calls Kratos whoami endpoint
   → Validates session: GET http://kratos:4433/sessions/whoami
   → Extracts identity: user:alice
   ↓
5. Oathkeeper: Authorizer (keto_engine_acp_ory)
   → Checks permission in Keto
   → GET http://keto:4466/relation-tuples/check
     ?namespace=default
     &object=tenant:a#product:items
     &relation=create
     &subject_id=user:alice
   → Response: {"allowed": true}
   ↓
6. Oathkeeper: Mutator (header)
   → Injects headers:
     X-User-Id: user:alice
     X-User-Email: alice@tenant-a.com
     X-User-Traits: {"email":"alice@tenant-a.com","name":{"first":"Alice"}}
   ↓
7. Oathkeeper: Proxy
   → Forwards to: POST http://multi-tenancy-demo:9000/products/create
   ↓
8. Backend receives authenticated + authorized request
   → Creates product
   → Returns: 201 Created
   ↓
9. Oathkeeper forwards response to Web Demo
   ↓
10. Web Demo displays success message
```

### Error Flows

**Authentication Failure:**
```
User not logged in
→ Oathkeeper authenticator fails
→ Returns 401 Unauthorized
→ Web Demo redirects to /login
```

**Authorization Failure:**
```
User logged in but lacks permission
→ Oathkeeper authenticator succeeds
→ Oathkeeper authorizer denies (Keto returns {"allowed": false})
→ Returns 403 Forbidden
→ Web Demo shows "Insufficient permissions" error
```

---

## Oathkeeper Access Rules

### Access Rules File Structure

**Location**: `oathkeeper/config/access-rules.yml`

### Rule Template

```yaml
- id: "products-create"
  upstream:
    url: "http://multi-tenancy-demo:9000"
    strip_path: ""
  match:
    url: "http://localhost:4455/products/create"
    methods:
      - POST
  authenticators:
    - handler: cookie_session
      config:
        check_session_url: "http://kratos:4433/sessions/whoami"
        preserve_path: true
  authorizers:
    - handler: keto_engine_acp_ory
      config:
        required_action: "create"
        required_resource: "tenant:{{ print .Extra.tenant_id }}#product:items"
        subject: "user:{{ print .Subject }}"
  mutators:
    - handler: header
      config:
        headers:
          X-User-Id: "{{ print .Subject }}"
          X-User-Email: "{{ print .Extra.email }}"
          X-User-Traits: "{{ print .Extra | toJson }}"
  errors:
    - handler: redirect
      config:
        to: "http://localhost:3000/login"
        when:
          - error:
              - unauthorized
            request:
              header:
                accept:
                  - text/html
    - handler: json
```

### Complete Access Rules for All Endpoints

#### 1. Users API

```yaml
# Users - List
- id: "users-list"
  upstream:
    url: "http://multi-tenancy-demo:9000"
  match:
    url: "http://localhost:4455/users/list"
    methods: ["GET"]
  authenticators:
    - handler: cookie_session
  authorizers:
    - handler: keto_engine_acp_ory
      config:
        required_action: "view"
        required_resource: "tenant:{{ print .Extra.tenant_id }}#user:items"
        subject: "user:{{ print .Subject }}"
  mutators:
    - handler: header

# Users - Create
- id: "users-create"
  upstream:
    url: "http://multi-tenancy-demo:9000"
  match:
    url: "http://localhost:4455/users/create"
    methods: ["POST"]
  authenticators:
    - handler: cookie_session
  authorizers:
    - handler: keto_engine_acp_ory
      config:
        required_action: "create"
        required_resource: "tenant:{{ print .Extra.tenant_id }}#user:items"
        subject: "user:{{ print .Subject }}"
  mutators:
    - handler: header

# Users - Get by ID
- id: "users-get"
  upstream:
    url: "http://multi-tenancy-demo:9000"
  match:
    url: "http://localhost:4455/users/get/<[0-9a-zA-Z-]+>"
    methods: ["GET"]
  authenticators:
    - handler: cookie_session
  authorizers:
    - handler: keto_engine_acp_ory
      config:
        required_action: "view"
        required_resource: "tenant:{{ print .Extra.tenant_id }}#user:items"
        subject: "user:{{ print .Subject }}"
  mutators:
    - handler: header

# Users - Update
- id: "users-update"
  upstream:
    url: "http://multi-tenancy-demo:9000"
  match:
    url: "http://localhost:4455/users/update/<[0-9a-zA-Z-]+>"
    methods: ["PUT"]
  authenticators:
    - handler: cookie_session
  authorizers:
    - handler: keto_engine_acp_ory
      config:
        required_action: "update"
        required_resource: "tenant:{{ print .Extra.tenant_id }}#user:items"
        subject: "user:{{ print .Subject }}"
  mutators:
    - handler: header

# Users - Delete
- id: "users-delete"
  upstream:
    url: "http://multi-tenancy-demo:9000"
  match:
    url: "http://localhost:4455/users/delete/<[0-9a-zA-Z-]+>"
    methods: ["DELETE"]
  authenticators:
    - handler: cookie_session
  authorizers:
    - handler: keto_engine_acp_ory
      config:
        required_action: "delete"
        required_resource: "tenant:{{ print .Extra.tenant_id }}#user:items"
        subject: "user:{{ print .Subject }}"
  mutators:
    - handler: header
```

#### 2. Products API

```yaml
# Products - List
- id: "products-list"
  upstream:
    url: "http://multi-tenancy-demo:9000"
  match:
    url: "http://localhost:4455/products/list"
    methods: ["GET"]
  authenticators:
    - handler: cookie_session
  authorizers:
    - handler: keto_engine_acp_ory
      config:
        required_action: "view"
        required_resource: "tenant:{{ print .Extra.tenant_id }}#product:items"
        subject: "user:{{ print .Subject }}"
  mutators:
    - handler: header

# Products - Create
- id: "products-create"
  upstream:
    url: "http://multi-tenancy-demo:9000"
  match:
    url: "http://localhost:4455/products/create"
    methods: ["POST"]
  authenticators:
    - handler: cookie_session
  authorizers:
    - handler: keto_engine_acp_ory
      config:
        required_action: "create"
        required_resource: "tenant:{{ print .Extra.tenant_id }}#product:items"
        subject: "user:{{ print .Subject }}"
  mutators:
    - handler: header

# Products - Delete
- id: "products-delete"
  upstream:
    url: "http://multi-tenancy-demo:9000"
  match:
    url: "http://localhost:4455/products/delete/<\\d+>"
    methods: ["DELETE"]
  authenticators:
    - handler: cookie_session
  authorizers:
    - handler: keto_engine_acp_ory
      config:
        required_action: "delete"
        required_resource: "tenant:{{ print .Extra.tenant_id }}#product:items"
        subject: "user:{{ print .Subject }}"
  mutators:
    - handler: header
```

#### 3. Categories API

```yaml
# Categories - List, Create, Update similar to Products
```

#### 4. Health Check (No Auth)

```yaml
- id: "health-check"
  upstream:
    url: "http://multi-tenancy-demo:9000"
  match:
    url: "http://localhost:4455/health"
    methods: ["GET"]
  authenticators:
    - handler: anonymous
  authorizers:
    - handler: allow
  mutators:
    - handler: noop
```

---

## API Client Configuration

### Web Demo API Client

**File**: `src/lib/api/client.ts`

```typescript
import axios, { AxiosInstance } from 'axios';

export class ApiClient {
  private client: AxiosInstance;
  private tenantId?: string;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_OATHKEEPER_URL || 'http://localhost:4455',
      timeout: 10000,
      withCredentials: true, // Include cookies (Kratos session)
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setTenantContext(tenantId: string) {
    this.tenantId = tenantId;
  }

  private setupInterceptors() {
    // Request interceptor: Add tenant header
    this.client.interceptors.request.use(
      (config) => {
        if (this.tenantId) {
          config.headers['x-tenant-id'] = this.tenantId;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: Handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Redirect to login (Kratos session expired)
          window.location.href = '/login';
        }
        if (error.response?.status === 403) {
          // Permission denied (Keto authorization failed)
          throw new Error('Insufficient permissions');
        }
        return Promise.reject(error);
      }
    );
  }

  // Standard REST methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}

// Singleton instance
export const apiClient = new ApiClient();
```

### Key Differences from Direct Backend Access

| Direct Backend | Through Oathkeeper |
|----------------|-------------------|
| `baseURL: 'http://localhost:9000'` | `baseURL: 'http://localhost:4455'` |
| Manual auth headers | Cookies only (`withCredentials: true`) |
| Manual permission checks | Automatic (Oathkeeper handles) |
| Multiple API endpoints | Single gateway endpoint |

---

## Authentication Flow

### Login Flow

```typescript
// src/lib/auth/kratos.ts
export async function loginWithKratos(email: string, password: string) {
  // 1. Initialize login flow
  const flowResponse = await axios.get(
    'http://localhost:4433/self-service/login/api'
  );
  const flowId = flowResponse.data.id;

  // 2. Submit credentials
  const loginResponse = await axios.post(
    `http://localhost:4433/self-service/login?flow=${flowId}`,
    {
      method: 'password',
      identifier: email,
      password: password,
    },
    {
      withCredentials: true, // Receive session cookie
    }
  );

  // 3. Kratos sets ory_kratos_session cookie
  // 4. All subsequent requests to Oathkeeper include this cookie
  // 5. Oathkeeper validates session automatically

  return loginResponse.data;
}
```

### Session Validation

Oathkeeper handles session validation automatically:

```
User makes request
→ Oathkeeper extracts ory_kratos_session cookie
→ Oathkeeper calls Kratos: GET /sessions/whoami
→ Kratos validates session
→ Kratos returns identity
→ Oathkeeper proceeds with authorization
```

---

## Authorization Flow

### Permission Check Example

When user tries to delete a product:

```typescript
// Web Demo: User clicks "Delete Product" button
async function deleteProduct(productId: number) {
  // Simple API call - no permission check in frontend
  await apiClient.delete(`/products/delete/${productId}`);
}
```

**Oathkeeper handles authorization:**

```
1. Request arrives: DELETE /products/delete/123
2. Match access rule: "products-delete"
3. Authenticator: Validate Kratos session ✅
4. Authorizer: Check Keto permission
   → Keto Check:
     namespace: default
     object: tenant:a#product:items
     relation: delete
     subject: user:alice
   → Keto Response: {"allowed": true} ✅
5. Mutator: Inject headers
6. Proxy to backend: DELETE http://backend:9000/products/delete/123
7. Backend deletes product
8. Response: 200 OK
```

**If permission denied:**

```
4. Authorizer: Check Keto permission
   → Keto Response: {"allowed": false} ❌
5. Oathkeeper returns: 403 Forbidden
6. Web Demo catches error and shows message
```

---

## Implementation Changes

### Updated Environment Variables

**`.env.local`:**

```env
# Oathkeeper (API Gateway)
NEXT_PUBLIC_OATHKEEPER_URL=http://localhost:4455

# Kratos (for login/registration flows only)
NEXT_PUBLIC_KRATOS_PUBLIC_URL=http://localhost:4433

# Keto and Backend URLs NOT NEEDED
# (Web Demo never calls them directly)
```

### Removed Code

**No longer needed:**

```typescript
// ❌ REMOVE: Direct Keto permission checks
async function canUserDeleteProduct(userId: string): Promise<boolean> {
  const response = await axios.get('http://localhost:4466/relation-tuples/check', {
    params: {
      namespace: 'default',
      object: 'product:items',
      relation: 'delete',
      subject_id: `user:${userId}`
    }
  });
  return response.data.allowed;
}

// ❌ REMOVE: Manual authorization logic
if (await canUserDeleteProduct(currentUser.id)) {
  await deleteProduct(productId);
} else {
  showError('Permission denied');
}
```

**Replaced with:**

```typescript
// ✅ NEW: Simple API call (Oathkeeper handles authz)
try {
  await apiClient.delete(`/products/delete/${productId}`);
  showSuccess('Product deleted');
} catch (error) {
  if (error.response?.status === 403) {
    showError('Permission denied');
  }
}
```

---

## Testing

### Test Oathkeeper Integration

```bash
# 1. Start all services
make up

# 2. Login to get session cookie
curl -c cookies.txt -X POST http://localhost:4433/self-service/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "alice@tenant-a.com", "password": "password"}'

# 3. Make request through Oathkeeper (with cookie)
curl -b cookies.txt -X GET http://localhost:4455/products/list \
  -H "x-tenant-id: tenant-a"

# Expected:
# - Oathkeeper validates session with Kratos ✅
# - Oathkeeper checks permission in Keto ✅
# - Oathkeeper forwards to backend ✅
# - Returns product list ✅
```

### Debug Mode

Enable Oathkeeper debug logging:

```yaml
# oathkeeper/config/oathkeeper.yml
log:
  level: debug
  format: json
```

View logs:
```bash
docker compose -f oathkeeper/docker-compose.yaml logs -f oathkeeper
```

---

## Benefits Summary

### Security Benefits

✅ **Centralized Security**: All auth/authz logic in one place
✅ **Zero Trust**: Backend assumes all requests are authenticated/authorized
✅ **Session Management**: Automatic session validation
✅ **Attack Surface Reduction**: Backend not directly exposed

### Development Benefits

✅ **Simplified Frontend**: No auth/authz logic in React components
✅ **Clean API Client**: Single endpoint, simple error handling
✅ **Consistent Errors**: 401 = not authenticated, 403 = not authorized
✅ **Easy Testing**: Mock Oathkeeper responses, not Kratos + Keto

### Operational Benefits

✅ **Single Point of Control**: Change access rules without frontend changes
✅ **Centralized Logging**: All API traffic logged in one place
✅ **Rate Limiting**: Apply at gateway level
✅ **Monitoring**: Single endpoint to monitor

---

## Next Steps

1. ✅ Update `ARCHITECTURE.md` with Oathkeeper integration
2. ✅ Update `README.md` with new API endpoint
3. ⏭️ Update `IMPLEMENTATION_TASKS.md` with Oathkeeper-specific tasks
4. ⏭️ Create Oathkeeper access rules for all endpoints
5. ⏭️ Update API client implementation
6. ⏭️ Remove direct Kratos/Keto calls from frontend
7. ⏭️ Test complete auth/authz flow

---

**Document Version**: 1.0
**Last Updated**: 2025-01-15
**Status**: Architecture Design Complete
