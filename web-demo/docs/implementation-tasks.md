# Web Demo Implementation Tasks

> Comprehensive task breakdown for implementing the Next.js Web Demo application based on ARCHITECTURE.md

**Status**: 📋 Planning Phase
**Total Estimated Story Points**: 144
**Estimated Timeline**: 6-8 sprints (12-16 weeks with 2-person team)

---

## Table of Contents

- [Epic 1: Project Setup & Infrastructure](#epic-1-project-setup--infrastructure)
- [Epic 2: Core API Integration Layer](#epic-2-core-api-integration-layer)
- [Epic 3: Shared Components & Layout](#epic-3-shared-components--layout)
- [Epic 4: Authentication Flow (Kratos Integration)](#epic-4-authentication-flow-kratos-integration)
- [Epic 6: Use Case 1 - Simple RBAC](#epic-5-use-case-1---simple-rbac)
- [Epic 6: Use Case 2 - Tenant-Centric RBAC](#epic-6-use-case-2---tenant-centric-rbac)
- [Epic 7: Use Case 3 - Resource-Scoped RBAC](#epic-7-use-case-3---resource-scoped-rbac)
- [Epic 8: Testing & Quality Assurance](#epic-8-testing--quality-assurance)
- [Epic 9: Documentation & Deployment](#epic-9-documentation--deployment)

---

## Epic 1: Project Setup & Infrastructure

**Story Points**: 13 | **Priority**: 🔴 Critical | **Sprint**: 1

### Task 1.1: Initialize Next.js Project

**Story Points**: 3 | **Priority**: 🔴 Urgent

**Description**: Set up Next.js 14+ project with TypeScript and essential dependencies

**Acceptance Criteria**:
- [ ] Next.js 14+ initialized with TypeScript
- [ ] Project structure follows architecture documentation
- [ ] All required dependencies installed
- [ ] Development server runs successfully
- [ ] Build process works without errors

**Implementation Steps**:
```bash
cd web-demo
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
```

**Dependencies**:
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "swr": "^2.2.0",
    "zustand": "^4.4.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.2.0",
    "tailwindcss": "^3.3.0",
    "eslint": "^8.52.0",
    "prettier": "^3.0.0"
  }
}
```

**Files to Create**:
- `package.json`
- `tsconfig.json`
- `next.config.js`
- `.eslintrc.json`
- `.prettierrc`
- `.gitignore`

---

### Task 1.2: Configure Environment Variables

**Story Points**: 2 | **Priority**: 🔴 Urgent

**Description**: Set up environment configuration for API endpoints

**Acceptance Criteria**:
- [ ] `.env.local.example` created with all required variables
- [ ] Environment variables properly typed in TypeScript
- [ ] Validation for required environment variables on startup
- [ ] Development and production environment configs separated

**Files to Create**:
- `.env.local.example`
- `src/config/env.ts`

**Example `.env.local.example`**:
```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:9000

# Ory Services
NEXT_PUBLIC_KRATOS_PUBLIC_URL=http://localhost:4433
NEXT_PUBLIC_KETO_READ_URL=http://localhost:4466
NEXT_PUBLIC_KETO_WRITE_URL=http://localhost:4467

# App Configuration
NEXT_PUBLIC_APP_NAME=Ory RBAC Demo
NEXT_PUBLIC_APP_VERSION=1.0.0
```

---

### Task 1.3: Setup Project Structure

**Story Points**: 3 | **Priority**: 🔴 Urgent

**Description**: Create directory structure following architecture documentation

**Acceptance Criteria**:
- [ ] All directories created as per ARCHITECTURE.md
- [ ] Barrel exports set up for clean imports
- [ ] Path aliases configured in tsconfig.json
- [ ] Index files created for each module

**Directory Structure**:
```
web-demo/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx             # Landing page (use case selection)
│   │   ├── layout.tsx           # Root layout
│   │   ├── simple-rbac/         # Use Case 1
│   │   ├── tenant-rbac/         # Use Case 2
│   │   └── resource-rbac/       # Use Case 3
│   ├── components/              # Shared components
│   │   ├── ui/                  # UI primitives
│   │   ├── layout/              # Layout components
│   │   └── features/            # Feature-specific components
│   ├── lib/                     # Utilities and API clients
│   │   ├── api/                 # API client modules
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils/               # Utility functions
│   │   └── types/               # TypeScript types
│   ├── config/                  # Configuration files
│   └── styles/                  # Global styles
├── public/                      # Static assets
├── ARCHITECTURE.md
├── README.md
├── IMPLEMENTATION_TASKS.md
└── package.json
```

---

### Task 1.4: Configure Tailwind CSS & Styling

**Story Points**: 2 | **Priority**: 🟠 High

**Description**: Set up Tailwind CSS with custom theme matching Ory branding

**Acceptance Criteria**:
- [ ] Tailwind CSS configured with custom theme
- [ ] Global styles created
- [ ] Typography and spacing utilities defined
- [ ] Dark mode support configured
- [ ] Component library choice documented (shadcn/ui recommended)

**Files to Create**:
- `tailwind.config.ts`
- `src/styles/globals.css`
- `src/styles/theme.ts`

---

### Task 1.5: Setup TypeScript Types & Interfaces

**Story Points**: 3 | **Priority**: 🟠 High

**Description**: Define TypeScript types for all data models and API responses

**Acceptance Criteria**:
- [ ] User, Product, Category types defined
- [ ] API response types created
- [ ] Keto relation tuple types defined
- [ ] Tenant context types created
- [ ] Role and permission types defined

**Files to Create**:
- `src/lib/types/models.ts`
- `src/lib/types/api.ts`
- `src/lib/types/keto.ts`
- `src/lib/types/auth.ts`

**Example Types**:
```typescript
// src/lib/types/models.ts
export interface User {
  id: string;
  email: string;
  name: {
    first: string;
    last: string;
  };
  tenant_ids: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

// src/lib/types/keto.ts
export interface RelationTuple {
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

export interface PermissionCheckRequest {
  namespace: string;
  object: string;
  relation: string;
  subject_id: string;
}

export interface PermissionCheckResponse {
  allowed: boolean;
}
```

---

## Epic 2: Core API Integration Layer

**Story Points**: 21 | **Priority**: 🔴 Critical | **Sprint**: 1-2

### Task 2.1: Create Base API Client

**Story Points**: 5 | **Priority**: 🔴 Urgent

**Description**: Implement base Axios client with interceptors and error handling

**Acceptance Criteria**:
- [ ] Axios instance configured with base URL
- [ ] Request interceptor adds tenant/user headers
- [ ] Response interceptor handles errors globally
- [ ] Retry logic for failed requests
- [ ] TypeScript typed API responses
- [ ] Error handling with custom error classes

**Files to Create**:
- `src/lib/api/client.ts`
- `src/lib/api/errors.ts`

**Implementation**:
```typescript
// src/lib/api/client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

export class ApiClient {
  private client: AxiosInstance;
  private tenantId?: string;
  private userId?: string;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setTenantContext(tenantId: string, userId?: string) {
    this.tenantId = tenantId;
    this.userId = userId;
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (this.tenantId) {
          config.headers['x-tenant-id'] = this.tenantId;
        }
        if (this.userId) {
          config.headers['x-user-id'] = this.userId;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError) {
    // Custom error handling
    return error;
  }

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
```

---

### Task 2.2: Implement Users API Client

**Story Points**: 5 | **Priority**: 🔴 Urgent

**Description**: Create API client for user management operations

**Acceptance Criteria**:
- [ ] All CRUD operations implemented
- [ ] TypeScript types for requests/responses
- [ ] Error handling for all operations
- [ ] SWR hooks for data fetching
- [ ] Optimistic updates support

**Files to Create**:
- `src/lib/api/users.ts`
- `src/lib/hooks/useUsers.ts`

**API Methods**:
```typescript
// src/lib/api/users.ts
export class UsersApi {
  constructor(private client: ApiClient) {}

  async list(): Promise<{ users: User[]; count: number }> {
    return this.client.get('/users/list');
  }

  async get(userId: string): Promise<{ user: User }> {
    return this.client.get(`/users/get/${userId}`);
  }

  async create(data: { email: string; name: string }): Promise<{ user: User }> {
    return this.client.post('/users/create', data);
  }

  async update(userId: string, data: Partial<User>): Promise<{ user: User }> {
    return this.client.put(`/users/update/${userId}`, data);
  }

  async delete(userId: string): Promise<{ user: User }> {
    return this.client.delete(`/users/delete/${userId}`);
  }
}
```

---

### Task 2.3: Implement Products API Client

**Story Points**: 4 | **Priority**: 🔴 Urgent

**Description**: Create API client for product management operations

**Acceptance Criteria**:
- [ ] All CRUD operations implemented
- [ ] Tenant filtering support
- [ ] SWR hooks with caching
- [ ] Pagination support (future)

**Files to Create**:
- `src/lib/api/products.ts`
- `src/lib/hooks/useProducts.ts`

---

### Task 2.4: Implement Categories API Client

**Story Points**: 4 | **Priority**: 🔴 Urgent

**Description**: Create API client for category management operations

**Acceptance Criteria**:
- [ ] All CRUD operations implemented
- [ ] Tenant filtering support
- [ ] SWR hooks with caching

**Files to Create**:
- `src/lib/api/categories.ts`
- `src/lib/hooks/useCategories.ts`

---

### Task 2.5: Implement Keto API Client

**Story Points**: 3 | **Priority**: 🟠 High

**Description**: Create API client for Keto authorization checks and relation management

**Acceptance Criteria**:
- [ ] Permission check API implemented
- [ ] Relation tuple CRUD operations
- [ ] Batch permission checks support
- [ ] Custom hooks for permission checks

**Files to Create**:
- `src/lib/api/keto.ts`
- `src/lib/hooks/usePermission.ts`

**API Methods**:
```typescript
// src/lib/api/keto.ts
export class KetoApi {
  private readClient: ApiClient;
  private writeClient: ApiClient;

  async checkPermission(check: PermissionCheckRequest): Promise<boolean> {
    const response = await this.readClient.get<PermissionCheckResponse>(
      '/relation-tuples/check',
      check
    );
    return response.allowed;
  }

  async createRelation(tuple: RelationTuple): Promise<void> {
    await this.writeClient.put('/admin/relation-tuples', tuple);
  }

  async deleteRelation(tuple: RelationTuple): Promise<void> {
    await this.writeClient.delete('/admin/relation-tuples', { data: tuple });
  }

  async listRelations(namespace: string): Promise<RelationTuple[]> {
    return this.readClient.get('/relation-tuples', { namespace });
  }
}
```

---

## Epic 3: Shared Components & Layout

**Story Points**: 18 | **Priority**: 🟠 High | **Sprint**: 2

### Task 3.1: Create Root Layout & Navigation

**Story Points**: 5 | **Priority**: 🟠 High

**Description**: Implement root layout with navigation header and footer

**Acceptance Criteria**:
- [ ] Responsive header with logo and navigation
- [ ] Footer with links to documentation
- [ ] Breadcrumb navigation
- [ ] Mobile menu support
- [ ] Active route highlighting

**Files to Create**:
- `src/app/layout.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/Navigation.tsx`

---

### Task 3.2: Build UI Component Library

**Story Points**: 8 | **Priority**: 🟠 High

**Description**: Create reusable UI components (buttons, inputs, modals, tables)

**Acceptance Criteria**:
- [ ] Button component with variants
- [ ] Input/Form components with validation
- [ ] Modal/Dialog component
- [ ] Table component with sorting/filtering
- [ ] Card component
- [ ] Alert/Notification component
- [ ] Loading states and skeletons
- [ ] All components fully typed

**Recommended Approach**: Use shadcn/ui for base components

**Files to Create**:
- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/Table.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Alert.tsx`
- `src/components/ui/Loading.tsx`

---

### Task 3.3: Create Tenant Context Provider

**Story Points**: 3 | **Priority**: 🟠 High

**Description**: Implement React Context for tenant selection and switching

**Acceptance Criteria**:
- [ ] TenantContext with provider
- [ ] Tenant selector dropdown component
- [ ] Persist selected tenant to localStorage
- [ ] useTenant hook for consuming context
- [ ] Automatic API client configuration on tenant change

**Files to Create**:
- `src/lib/context/TenantContext.tsx`
- `src/components/features/TenantSelector.tsx`
- `src/lib/hooks/useTenant.ts`

---

### Task 3.4: Build Landing Page (Use Case Selection)

**Story Points**: 2 | **Priority**: 🟡 Medium

**Description**: Create homepage with cards for each use case

**Acceptance Criteria**:
- [ ] Hero section with project description
- [ ] Three cards for use cases with descriptions
- [ ] Links to each use case route
- [ ] Architecture diagram display
- [ ] Responsive design

**Files to Create**:
- `src/app/page.tsx`
- `src/components/features/UseCaseCard.tsx`

---

## Epic 4: Authentication Flow (Kratos Integration)

**Story Points**: 21 | **Priority**: 🔴 Critical | **Sprint**: 3

**Description**: Implement Kratos authentication with login, registration, and session management. Users must authenticate before accessing RBAC features.

### Task 4.1: Kratos Session Context & Auth State

**Story Points**: 5 | **Priority**: 🔴 Critical

**Description**: Create authentication context and session management

**Acceptance Criteria**:
- [ ] Auth context provider with session state
- [ ] Session check on app initialization via `/sessions/whoami`
- [ ] Automatic session refresh logic
- [ ] Logout functionality
- [ ] Protected route wrapper component
- [ ] Redirect to login if unauthenticated (401 error)

**Files to Create**:
- `src/lib/context/AuthContext.tsx`
- `src/lib/hooks/useAuth.ts`
- `src/lib/api/kratos.ts`
- `src/components/auth/ProtectedRoute.tsx`

**Implementation Notes**:
```typescript
interface AuthContextType {
  session: Session | null;
  identity: Identity | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

// All calls through Oathkeeper
const sessionUrl = `${OATHKEEPER_URL}/sessions/whoami`;
```

---

### Task 4.2: Login Page

**Story Points**: 5 | **Priority**: 🔴 Critical

**Description**: Build login page with Kratos self-service login flow

**Acceptance Criteria**:
- [ ] Login form with email/password fields
- [ ] Form validation with zod
- [ ] Integration with Kratos login flow API
- [ ] Error handling (invalid credentials, flow expired)
- [ ] Link to registration page
- [ ] Redirect to original destination after login

**Files to Create**:
- `src/app/login/page.tsx`
- `src/components/auth/LoginForm.tsx`

**Kratos Flow**:
```
1. GET /self-service/login/browser → Initialize flow
2. Render UI nodes from flow response
3. POST /self-service/login?flow=<id> → Submit credentials
4. On success: Redirect to dashboard
```

---

### Task 4.3: Registration Page

**Story Points**: 5 | **Priority**: 🔴 Critical

**Description**: Build registration page with Kratos self-service registration flow

**Acceptance Criteria**:
- [ ] Registration form (email, password, first name, last name)
- [ ] Password confirmation field
- [ ] Form validation
- [ ] Integration with Kratos registration flow
- [ ] Link to login page
- [ ] Auto-assign default tenant (tenant-a) to new users

**Files to Create**:
- `src/app/register/page.tsx`
- `src/components/auth/RegisterForm.tsx`

**Default User Traits**:
```json
{
  "email": "user@example.com",
  "name": { "first": "John", "last": "Doe" },
  "tenant_ids": ["tenant-a"]
}
```

---

### Task 4.4: Session Management & Protected Routes

**Story Points**: 3 | **Priority**: 🔴 Critical

**Description**: Implement session persistence and route protection

**Acceptance Criteria**:
- [ ] Protect all RBAC routes (redirect if not authenticated)
- [ ] Session persistence across page refreshes
- [ ] Handle session expiration (401 → redirect to login)
- [ ] Show user email in header when authenticated
- [ ] Logout button in header

**Files to Update**:
- `src/app/simple-rbac/layout.tsx`
- `src/components/layout/Header.tsx`

**Protected Route Pattern**:
```typescript
export default function ProtectedLayout({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageLoading />;
  if (!isAuthenticated) redirect('/login');
  return <>{children}</>;
}
```

---

### Task 4.5: Oathkeeper Access Rules for Auth

**Story Points**: 3 | **Priority**: 🔴 Critical

**Description**: Configure Oathkeeper to allow unauthenticated access to login/register pages and Kratos self-service endpoints

**Acceptance Criteria**:
- [ ] Login/register pages accessible without authentication
- [ ] Kratos self-service flows proxied through Oathkeeper
- [ ] Session endpoint protected (requires valid session cookie)

**Files to Update**:
- `/oathkeeper/config/access-rules.yml`

**Required Rules**:
```yaml
# Allow anonymous access to auth pages
- id: "auth-pages"
  match:
    url: "<http|https>://<.*>/(login|register)"
  authenticators:
    - handler: anonymous
  authorizer:
    - handler: allow

# Proxy Kratos self-service flows
- id: "kratos-self-service"
  upstream:
    url: "http://kratos:4433"
  match:
    url: "<http|https>://<.*>/self-service/<.*>"
  authenticators:
    - handler: anonymous
  authorizer:
    - handler: allow

# Proxy Kratos session endpoint
- id: "kratos-session"
  upstream:
    url: "http://kratos:4433"
  match:
    url: "<http|https>://<.*>/sessions/whoami"
  authenticators:
    - handler: cookie_session
  authorizer:
    - handler: allow
```

---

## Epic 5: Use Case 1 - Simple RBAC

**Story Points**: 24 | **Priority**: 🟠 High | **Sprint**: 4-5

### Task 5.1: User Management Interface (Simple RBAC)

**Story Points**: 8 | **Priority**: 🟠 High

**Description**: Build user management UI for simple RBAC

**Acceptance Criteria**:
- [ ] User list table with search/filter
- [ ] Create user modal with form validation
- [ ] Edit user functionality
- [ ] Delete user with confirmation
- [ ] Display user's assigned role
- [ ] Error handling and loading states

**Files to Create**:
- `src/app/simple-rbac/users/page.tsx`
- `src/components/features/simple-rbac/UserList.tsx`
- `src/components/features/simple-rbac/UserForm.tsx`

---

### Task 5.2: Role Management Interface (Simple RBAC)

**Story Points**: 8 | **Priority**: 🟠 High

**Description**: Build role assignment and management UI

**Acceptance Criteria**:
- [ ] Role selection dropdown
- [ ] Assign role to user functionality
- [ ] Visual role hierarchy display
- [ ] Permission matrix view
- [ ] Keto relation tuple creation on role assignment

**Files to Create**:
- `src/app/simple-rbac/roles/page.tsx`
- `src/components/features/simple-rbac/RoleAssignment.tsx`
- `src/components/features/simple-rbac/PermissionMatrix.tsx`

---

### Task 5.3: Product Management Interface (Simple RBAC)

**Story Points**: 4 | **Priority**: 🟡 Medium

**Description**: Build product CRUD interface with permission checks

**Acceptance Criteria**:
- [ ] Product list with CRUD operations
- [ ] Permission-based button visibility (create, delete)
- [ ] Real-time permission checks via Keto API
- [ ] Visual feedback for allowed/denied actions

**Files to Create**:
- `src/app/simple-rbac/products/page.tsx`
- `src/components/features/simple-rbac/ProductList.tsx`

---

### Task 5.4: Category Management Interface (Simple RBAC)

**Story Points**: 4 | **Priority**: 🟡 Medium

**Description**: Build category CRUD interface with permission checks

**Acceptance Criteria**:
- [ ] Category list with CRUD operations
- [ ] Permission-based UI updates
- [ ] Integration with Keto authorization

**Files to Create**:
- `src/app/simple-rbac/categories/page.tsx`
- `src/components/features/simple-rbac/CategoryList.tsx`

---

## Epic 6: Use Case 2 - Tenant-Centric RBAC

**Story Points**: 28 | **Priority**: 🟠 High | **Sprint**: 4-5

### Task 5.1: Tenant Management Interface

**Story Points**: 5 | **Priority**: 🟠 High

**Description**: Build tenant CRUD interface

**Acceptance Criteria**:
- [ ] Tenant list with create/edit/delete
- [ ] Tenant switcher in navigation
- [ ] Visual indicator of current tenant
- [ ] Tenant context persisted across routes

**Files to Create**:
- `src/app/tenant-rbac/tenants/page.tsx`
- `src/components/features/tenant-rbac/TenantList.tsx`
- `src/components/features/tenant-rbac/TenantForm.tsx`

---

### Task 5.2: Multi-Tenant User Management

**Story Points**: 8 | **Priority**: 🟠 High

**Description**: Build user management with multi-tenant role assignment

**Acceptance Criteria**:
- [ ] User list shows roles per tenant
- [ ] Assign different roles in different tenants
- [ ] Visual display of multi-tenant user (e.g., Alice)
- [ ] Keto relation tuples: `user:alice → tenant:a#admin`

**Files to Create**:
- `src/app/tenant-rbac/users/page.tsx`
- `src/components/features/tenant-rbac/MultiTenantUserList.tsx`
- `src/components/features/tenant-rbac/TenantRoleAssignment.tsx`

---

### Task 5.3: Tenant-Scoped Product Management

**Story Points**: 5 | **Priority**: 🟡 Medium

**Description**: Product management with tenant isolation

**Acceptance Criteria**:
- [ ] Products filtered by current tenant
- [ ] Permission checks: `tenant:a#product:items → create`
- [ ] Cross-tenant isolation verification
- [ ] Visual tenant indicator in product list

**Files to Create**:
- `src/app/tenant-rbac/products/page.tsx`
- `src/components/features/tenant-rbac/TenantProductList.tsx`

---

### Task 5.4: Tenant-Scoped Category Management

**Story Points**: 5 | **Priority**: 🟡 Medium

**Description**: Category management with tenant isolation

**Acceptance Criteria**:
- [ ] Categories filtered by current tenant
- [ ] Permission checks: `tenant:a#category:items → update`
- [ ] Cross-tenant isolation verification

**Files to Create**:
- `src/app/tenant-rbac/categories/page.tsx`
- `src/components/features/tenant-rbac/TenantCategoryList.tsx`

---

### Task 5.5: Multi-Tenant User Demo (Alice)

**Story Points**: 5 | **Priority**: 🟡 Medium

**Description**: Build interactive demo showing Alice with different roles in different tenants

**Acceptance Criteria**:
- [ ] Visual diagram of Alice's permissions in Tenant A vs B
- [ ] Side-by-side permission comparison
- [ ] Interactive permission checks
- [ ] Switch between tenants to show different access levels

**Files to Create**:
- `src/app/tenant-rbac/demo/page.tsx`
- `src/components/features/tenant-rbac/MultiTenantDemo.tsx`

---

## Epic 6: Use Case 3 - Resource-Scoped RBAC

**Story Points**: 26 | **Priority**: 🟡 Medium | **Sprint**: 5-6

### Task 5.1: Resource-Scoped Role Assignment Interface

**Story Points**: 8 | **Priority**: 🟠 High

**Description**: Build UI for assigning different roles per resource type

**Acceptance Criteria**:
- [ ] Role assignment matrix (user × resource × tenant)
- [ ] Separate role assignment for products vs categories
- [ ] Visual representation of resource-scoped roles
- [ ] Keto tuples: `user:alice → tenant:a#product:items#admin`

**Files to Create**:
- `src/app/resource-rbac/roles/page.tsx`
- `src/components/features/resource-rbac/ResourceRoleMatrix.tsx`
- `src/components/features/resource-rbac/ResourceRoleAssignment.tsx`

---

### Task 5.2: Resource-Scoped Product Management

**Story Points**: 6 | **Priority**: 🟡 Medium

**Description**: Product management with resource-scoped permissions

**Acceptance Criteria**:
- [ ] Permission checks: `tenant:a#product:items → delete` (alice = admin)
- [ ] Different permissions than categories for same user
- [ ] Visual permission indicator per operation

**Files to Create**:
- `src/app/resource-rbac/products/page.tsx`
- `src/components/features/resource-rbac/ResourceProductList.tsx`

---

### Task 5.3: Resource-Scoped Category Management

**Story Points**: 6 | **Priority**: 🟡 Medium

**Description**: Category management with resource-scoped permissions

**Acceptance Criteria**:
- [ ] Permission checks: `tenant:a#category:items → delete` (alice = moderator, denied)
- [ ] Show permission differences from products
- [ ] Visual comparison with product permissions

**Files to Create**:
- `src/app/resource-rbac/categories/page.tsx`
- `src/components/features/resource-rbac/ResourceCategoryList.tsx`

---

### Task 5.4: Resource-Scoped Permission Comparison

**Story Points**: 6 | **Priority**: 🟡 Medium

**Description**: Build interactive comparison view showing different permissions per resource

**Acceptance Criteria**:
- [ ] Side-by-side permission matrix for products vs categories
- [ ] Interactive permission checks for Alice
- [ ] Visual explanation of resource-scoped model
- [ ] Comparison with tenant-centric approach

**Files to Create**:
- `src/app/resource-rbac/comparison/page.tsx`
- `src/components/features/resource-rbac/PermissionComparison.tsx`

---

## Epic 7: Testing & Quality Assurance

**Story Points**: 21 | **Priority**: 🟡 Medium | **Sprint**: 6-7

### Task 7.1: Unit Tests for API Clients

**Story Points**: 5 | **Priority**: 🟡 Medium

**Description**: Write unit tests for all API client modules

**Acceptance Criteria**:
- [ ] Users API client tests
- [ ] Products API client tests
- [ ] Categories API client tests
- [ ] Keto API client tests
- [ ] Mock API responses
- [ ] Error handling tests
- [ ] 80%+ code coverage

**Files to Create**:
- `src/lib/api/__tests__/users.test.ts`
- `src/lib/api/__tests__/products.test.ts`
- `src/lib/api/__tests__/categories.test.ts`
- `src/lib/api/__tests__/keto.test.ts`

---

### Task 7.2: Component Tests

**Story Points**: 8 | **Priority**: 🟡 Medium

**Description**: Write React Testing Library tests for components

**Acceptance Criteria**:
- [ ] UI component tests (Button, Input, Modal, etc.)
- [ ] Feature component tests
- [ ] Form validation tests
- [ ] Permission-based rendering tests
- [ ] User interaction tests

**Testing Framework**: React Testing Library + Jest

---

### Task 7.3: Integration Tests

**Story Points**: 5 | **Priority**: 🟡 Medium

**Description**: E2E tests for critical user flows

**Acceptance Criteria**:
- [ ] User creation and role assignment flow
- [ ] Product CRUD with permission checks
- [ ] Tenant switching flow
- [ ] Multi-tenant user scenario (Alice)

**Testing Framework**: Playwright or Cypress

---

### Task 7.4: Accessibility Audit

**Story Points**: 3 | **Priority**: 🟡 Medium

**Description**: Ensure WCAG 2.1 AA compliance

**Acceptance Criteria**:
- [ ] All forms keyboard accessible
- [ ] Proper ARIA labels
- [ ] Color contrast compliance
- [ ] Screen reader testing
- [ ] axe-core audit passing

---

## Epic 8: Documentation & Deployment

**Story Points**: 13 | **Priority**: 🟢 Low | **Sprint**: 7-8

### Task 8.1: Component Storybook

**Story Points**: 5 | **Priority**: 🟢 Low

**Description**: Set up Storybook for component documentation

**Acceptance Criteria**:
- [ ] Storybook configured
- [ ] Stories for all UI components
- [ ] Interactive component playground
- [ ] Props documentation

---

### Task 8.2: API Documentation

**Story Points**: 3 | **Priority**: 🟢 Low

**Description**: Generate TypeDoc documentation for API clients

**Acceptance Criteria**:
- [ ] TypeDoc configured
- [ ] JSDoc comments for all public methods
- [ ] Generated HTML documentation
- [ ] Hosted documentation site

---

### Task 8.3: Docker Setup

**Story Points**: 3 | **Priority**: 🟡 Medium

**Description**: Create Dockerfile and docker-compose integration

**Acceptance Criteria**:
- [ ] Dockerfile for Next.js app
- [ ] Multi-stage build optimization
- [ ] Docker compose integration with backend
- [ ] Environment variable handling
- [ ] Health check endpoint

**Files to Create**:
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`

---

### Task 8.4: CI/CD Pipeline

**Story Points**: 2 | **Priority**: 🟢 Low

**Description**: Set up GitHub Actions for CI/CD

**Acceptance Criteria**:
- [ ] Automated tests on PR
- [ ] Build verification
- [ ] Linting and formatting checks
- [ ] Type checking
- [ ] Deploy to staging/production

**Files to Create**:
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

---

## Priority Implementation Order

### 🔴 **Phase 1: Foundation (Sprints 1-2)**
1. Epic 1: Project Setup & Infrastructure
2. Epic 2: Core API Integration Layer
3. Epic 3: Shared Components & Layout

### 🟠 **Phase 2: Core Features (Sprints 3-5)**
4. Epic 4: Use Case 1 - Simple RBAC
5. Epic 6: Use Case 2 - Tenant-Centric RBAC

### 🟡 **Phase 3: Advanced Features (Sprints 5-6)**
6. Epic 6: Use Case 3 - Resource-Scoped RBAC

### 🟢 **Phase 4: Polish & Launch (Sprints 6-8)**
7. Epic 7: Testing & Quality Assurance
8. Epic 8: Documentation & Deployment

---

## Story Point Summary

| Epic | Story Points | Priority | Estimated Duration |
|------|--------------|----------|-------------------|
| Epic 1: Project Setup | 13 | 🔴 Critical | 1 sprint |
| Epic 2: API Integration | 21 | 🔴 Critical | 1-2 sprints |
| Epic 3: Shared Components | 18 | 🟠 High | 1 sprint |
| Epic 4: Simple RBAC | 24 | 🟠 High | 1-2 sprints |
| Epic 6: Tenant-Centric RBAC | 28 | 🟠 High | 1-2 sprints |
| Epic 6: Resource-Scoped RBAC | 26 | 🟡 Medium | 1-2 sprints |
| Epic 7: Testing | 21 | 🟡 Medium | 1-2 sprints |
| Epic 8: Documentation | 13 | 🟢 Low | 1 sprint |
| **Total** | **144** | - | **6-8 sprints** |

---

## Development Team Recommendations

**Recommended Team Size**: 2-3 developers

**Skill Requirements**:
- **Frontend Developer**: React/Next.js expert, TypeScript, Tailwind CSS
- **Backend Integration Specialist**: REST APIs, Ory Stack knowledge
- **QA Engineer**: Testing frameworks, accessibility testing

**Velocity Estimate**: 18-20 story points per sprint (2 weeks)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Keto API integration complexity | High | Start with simple RBAC, build incrementally |
| TypeScript type complexity | Medium | Use Zod for runtime validation, gradual typing |
| Component reusability | Medium | Use shadcn/ui, establish design system early |
| Performance with permission checks | Medium | Cache permission results, batch requests |
| Browser compatibility | Low | Use modern browsers only (Chrome, Firefox, Safari) |

---

## Definition of Done

Each task must meet:
- [ ] Code implemented and peer-reviewed
- [ ] Unit tests written and passing
- [ ] TypeScript types fully defined
- [ ] Component documented in Storybook (if applicable)
- [ ] Accessibility requirements met
- [ ] Responsive design verified
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Integration tested with backend API
- [ ] Merged to main branch

---

## Next Steps

1. **Create Linear Project**: Import tasks into Linear workspace
2. **Sprint Planning**: Assign tasks to sprints based on priority
3. **Team Assignment**: Allocate tasks to team members
4. **Kickoff Meeting**: Review architecture and tasks
5. **Sprint 1 Start**: Begin with Epic 1 (Project Setup)

---

**Document Version**: 1.0
**Created**: 2025-01-15
**Last Updated**: 2025-01-15
**Status**: Ready for Development
