# Web Demo

> Next.js web application demonstrating three distinct RBAC (Role-Based Access Control) authorization models using the Ory Stack.

## Overview

The Web Demo is a **Next.js-based frontend application** (client-side rendering only) that connects to the Multi-Tenancy Demo backend API to demonstrate three different authorization approaches for managing users, products, and categories.

### Key Features

- 🎨 **Next.js Frontend** - Client-side rendering with React components
- 🔌 **Backend Integration** - Connects to Multi-Tenancy Demo API (Express.js on port 9000)
- 🎯 **Three Use Cases** - Compare different RBAC authorization models
- 📦 **Resource Management** - Users, Products, Categories CRUD operations
- 🔐 **Ory Stack Integration** - Kratos (authentication) and Keto (authorization)

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Web Demo (Next.js - Port 3000)          │
│  ┌──────────────────────────────────────────┐  │
│  │  Use Case 1: Simple RBAC                 │  │
│  │  Use Case 2: Tenant-Centric RBAC         │  │
│  │  Use Case 3: Resource-Scoped RBAC        │  │
│  └──────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────┘
                   │ HTTP (Port 4455)
                   ▼
┌─────────────────────────────────────────────────┐
│      Oathkeeper (API Gateway - Port 4455)       │
│  ┌──────────────────────────────────────────┐  │
│  │  Auth → Authz → Proxy to Backend         │  │
│  └──────────────────────────────────────────┘  │
└─────┬──────────────┬────────────┬──────────────┘
      │              │            │
      ▼              ▼            ▼
  ┌────────┐    ┌────────┐   ┌──────────────────┐
  │ Kratos │    │  Keto  │   │ Multi-Tenancy    │
  │ (Auth) │    │(Authz) │   │ Backend (:9000)  │
  └────┬───┘    └────┬───┘   │ In-Memory Store  │
       │             │        └──────────────────┘
       └──────┬──────┘
              ▼
        ┌──────────┐
        │PostgreSQL│
        │ (Kratos  │
        │ & Keto)  │
        └──────────┘
```

**For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md)**

---

## Use Cases

The Web Demo demonstrates three distinct authorization models:

### Use Case 1: Simple RBAC

**Reference**: [`keto-zanziban-simple-rbac/README.md`](../keto-zanziban-simple-rbac/README.md)

**Authorization Pattern:**

```
user:alice → role:admin → product:items (delete permission)
```

**Features:**

- ✅ Global roles (admin, moderator, customer)
- ✅ Hierarchical role inheritance (admin → moderator → customer)
- ✅ Single namespace (`default`)
- ✅ No tenant isolation
- ✅ Simple permission model

**Components:**

- **Role Management CRUD** - Create, assign, and manage global roles
- **User Management CRUD** - User creation and role assignment
- **Product Management** - Products with role-based permissions
- **Category Management** - Categories with role-based permissions

**Example:**

- Alice (admin) can delete products and create categories
- Bob (moderator) can create products and update categories
- Charlie (customer) can only view products and categories

---

### Use Case 2: Keto Zanzibar Multi-Tenancy RBAC (Tenant-Centric)

**Reference**: [`keto-zanzibar-multi-tenancy-rbac/README.md`](../keto-zanzibar-multi-tenancy-rbac/README.md)

**Authorization Pattern:**

```
user:alice → tenant:a (as admin) → tenant:a#product:items (create permission)
user:alice → tenant:b (as customer) → tenant:b#product:items (view permission)
```

**Features:**

- ✅ Complete tenant isolation
- ✅ Multi-tenant users (same user, different roles per tenant)
- ✅ Tenant-scoped roles (one role per tenant)
- ✅ Flexible role hierarchies per tenant
- ✅ Single namespace with tenant prefixes

**Components:**

- **Tenant Management CRUD** - Create and manage tenant contexts
- **Role Management CRUD** - Assign roles per tenant
- **User Management CRUD** - Multi-tenant user onboarding
- **Product Management** - Tenant-isolated product catalog
- **Category Management** - Tenant-isolated categories

**Example:**

- Alice is **admin** in Tenant A (full access) and **customer** in Tenant B (read-only)
- Bob is **admin** in Tenant B only
- Complete isolation: Alice cannot access Bob's data in Tenant B unless assigned a role

---

### Use Case 3: Keto Multi-Tenant Resource-Scoped RBAC

**Reference**: [`keto-zanziban-multi-tenancy-rbac-per-resource/README.md`](../keto-zanziban-multi-tenancy-rbac-per-resource/README.md)

**Authorization Pattern:**

```
user:alice → tenant:a#product:items (as admin) → delete products allowed
user:alice → tenant:a#category:items (as moderator) → delete categories denied
```

**Features:**

- ✅ Resource-level roles (different roles per resource type)
- ✅ Maximum granularity (admin for products, moderator for categories)
- ✅ Tenant isolation per resource
- ✅ Fine-grained permission control
- ⚠️ Higher complexity (N users × M tenants × R resources)

**Components:**

- **Tenant Management CRUD** - Create tenant contexts
- **Role Management CRUD** - Assign roles per resource type
- **User Management CRUD** - Multi-resource user onboarding
- **Product Management** - Resource-scoped product permissions
- **Category Management** - Resource-scoped category permissions

**Example:**

- Alice in Tenant A: **admin** for products (can delete), **moderator** for categories (cannot delete)
- Bob in Tenant B: **admin** for both products and categories
- Charlie in Tenant B: **customer** for products only (read-only)

---

## Resource Management

### Backend API Resources

All resources are managed via the Multi-Tenancy Demo backend API (port 9000):

#### Users API (`/users/*`)

- **Endpoint**: `multi-tenancy-demo/routes/users.js`
- **Operations**: Create, List, Get, Update, Delete
- **Storage**: In-memory mock data store
- **Integration**: Optional Kratos identity creation (not implemented by default)

#### Products API (`/products/*`)

- **Endpoint**: `multi-tenancy-demo/routes/product.js`
- **Operations**: Create, List, Get, Update, Delete
- **Storage**: In-memory mock data store
- **Tenant Isolation**: Filtered by `x-tenant-id` header

#### Categories API (`/categories/*`)

- **Endpoint**: `multi-tenancy-demo/routes/category.js`
- **Operations**: Create, List, Get, Update, Delete
- **Storage**: In-memory mock data store
- **Tenant Isolation**: Filtered by `x-tenant-id` header

### Data Storage

All resources (users, products, categories) use **in-memory mock data stores**:

```javascript
// Example: mockProducts in routes/product.js
let mockProducts = [
  {
    id: 1,
    name: "Product A",
    category: "Electronics",
    price: 299.99,
    tenantId: "tenant-a",
  },
  {
    id: 2,
    name: "Product B",
    category: "Books",
    price: 19.99,
    tenantId: "tenant-a",
  },
];
```

**Why In-Memory?**

- ✅ **Zero Configuration** - No database setup required
- ✅ **Demo Focus** - Emphasizes authorization patterns, not data persistence
- ✅ **Easy Reset** - Restart server to reset to initial state
- ✅ **Clear Separation** - Ory services (Kratos/Keto) use PostgreSQL; demo app uses in-memory
- ✅ **Simplicity** - Reduces cognitive load for learning RBAC concepts

**Note**: Only Kratos and Keto use PostgreSQL for their internal data (identities, sessions, relation tuples). The demo application's resources remain in memory.

---

## API Integration

### API Gateway Endpoint

**Base URL** (all requests go through Oathkeeper):
```
http://localhost:4455
```

**Request Flow:**
```
Web Demo → Oathkeeper (:4455) → [Kratos Auth + Keto Authz] → Backend (:9000)
```

**Headers sent by Web Demo:**

```http
Cookie: ory_kratos_session=<session_cookie>  # Authentication
x-tenant-id: tenant-a                         # Tenant context
```

**Headers injected by Oathkeeper (automatic):**

```http
X-User-Id: user-001                          # From Kratos session
X-User-Email: alice@tenant-a.com             # From Kratos identity
X-User-Traits: {...}                         # Full identity traits
```

### Users API

```bash
# Create user
POST /users/create
Body: { "email": "alice@tenant-a.com", "name": "Alice Smith" }

# List users (filtered by tenant)
GET /users/list

# Get specific user
GET /users/get/:userId

# Update user
PUT /users/update/:userId
Body: { "email": "alice.new@tenant-a.com", "name": "Alice Johnson" }

# Delete user
DELETE /users/delete/:userId
```

### Products API

```bash
# Create product
POST /products/create
Body: { "name": "Product X", "category": "Electronics", "price": 99.99 }

# List products (filtered by tenant)
GET /products/list

# Get specific product
GET /products/get/:id

# Update product
PUT /products/update/:id
Body: { "name": "Updated Product", "price": 199.99 }

# Delete product
DELETE /products/delete/:id
```

### Categories API

```bash
# Create category
POST /categories/create
Body: { "name": "Electronics", "description": "Electronic devices" }

# List categories (filtered by tenant)
GET /categories/list

# Get specific category
GET /categories/get/:id

# Update category
PUT /categories/update/:id
Body: { "name": "Updated Category", "description": "New description" }

# Delete category
DELETE /categories/delete/:id
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (for Next.js)
- Docker and Docker Compose (for Ory services)
- Running Ory Stack (Kratos, Keto, PostgreSQL)

### Start the Backend API

```bash
# Start all Ory services
cd ..
make up

# Start Multi-Tenancy Demo backend
cd multi-tenancy-demo
npm install
npm start
# Server runs on http://localhost:9000
```

### Start the Web Demo

```bash
# Install dependencies
cd web-demo
npm install

# Start development server
npm run dev
# Web demo runs on http://localhost:3000
```

### Environment Variables

Create `.env.local` in `web-demo/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:9000
NEXT_PUBLIC_KRATOS_PUBLIC_URL=http://localhost:4433
NEXT_PUBLIC_KETO_READ_URL=http://localhost:4466
NEXT_PUBLIC_KETO_WRITE_URL=http://localhost:4467
```

---

## Usage Examples

### Example 1: Simple RBAC Flow

```bash
# 1. Create user Alice
curl -X POST http://localhost:9000/users/create \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-a" \
  -d '{"email": "alice@example.com", "name": "Alice Smith"}'

# 2. Assign Alice as admin (via Keto)
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "default",
    "object": "role:admin",
    "relation": "member",
    "subject_id": "user:alice"
  }'

# 3. Check if Alice can delete products
curl -G http://localhost:4466/relation-tuples/check \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=product:items" \
  --data-urlencode "relation=delete" \
  --data-urlencode "subject_id=user:alice"
# Response: {"allowed": true}
```

### Example 2: Tenant-Centric RBAC Flow

```bash
# 1. Create user Alice
curl -X POST http://localhost:9000/users/create \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-a" \
  -d '{"email": "alice@example.com", "name": "Alice Smith"}'

# 2. Assign Alice as admin in Tenant A
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "default",
    "object": "tenant:a",
    "relation": "admin",
    "subject_id": "user:alice"
  }'

# 3. Assign Alice as customer in Tenant B
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "default",
    "object": "tenant:b",
    "relation": "customer",
    "subject_id": "user:alice"
  }'

# 4. Check: Can Alice delete products in Tenant A?
curl -G http://localhost:4466/relation-tuples/check \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=delete" \
  --data-urlencode "subject_id=user:alice"
# Response: {"allowed": true} (admin role)

# 5. Check: Can Alice delete products in Tenant B?
curl -G http://localhost:4466/relation-tuples/check \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:b#product:items" \
  --data-urlencode "relation=delete" \
  --data-urlencode "subject_id=user:alice"
# Response: {"allowed": false} (customer role)
```

### Example 3: Resource-Scoped RBAC Flow

```bash
# 1. Assign Alice as admin for products in Tenant A
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "default",
    "object": "tenant:a#product:items",
    "relation": "admin",
    "subject_id": "user:alice"
  }'

# 2. Assign Alice as moderator for categories in Tenant A
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "default",
    "object": "tenant:a#category:items",
    "relation": "moderator",
    "subject_id": "user:alice"
  }'

# 3. Check: Can Alice delete products? (admin role)
curl -G http://localhost:4466/relation-tuples/check \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:a#product:items" \
  --data-urlencode "relation=delete" \
  --data-urlencode "subject_id=user:alice"
# Response: {"allowed": true}

# 4. Check: Can Alice delete categories? (moderator role - no delete)
curl -G http://localhost:4466/relation-tuples/check \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=tenant:a#category:items" \
  --data-urlencode "relation=delete" \
  --data-urlencode "subject_id=user:alice"
# Response: {"allowed": false}
```

---

## Testing

### Health Check

```bash
curl http://localhost:9000/health
```

**Response:**

```json
{
  "status": "ok",
  "service": "multi-tenancy-demo",
  "version": "2.0.0",
  "apis": ["users", "products", "categories"],
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### API Documentation

```bash
curl http://localhost:9000/api-docs
```

---

## Comparison of Use Cases

| Aspect                 | Simple RBAC              | Tenant-Centric                                  | Resource-Scoped                                      |
| ---------------------- | ------------------------ | ----------------------------------------------- | ---------------------------------------------------- |
| **Granularity**        | Global roles             | Per-tenant roles                                | Per-resource roles                                   |
| **Tenant Isolation**   | ❌ None                  | ✅ Complete                                     | ✅ Complete                                          |
| **Multi-Tenant Users** | ❌ No                    | ✅ Yes                                          | ✅ Yes                                               |
| **Role Assignment**    | One role globally        | One role per tenant                             | One role per resource × tenant                       |
| **Complexity**         | Low                      | Medium                                          | High                                                 |
| **Use Case**           | Simple apps              | Multi-tenant SaaS                               | Fine-grained control                                 |
| **Example**            | Alice = admin everywhere | Alice = admin in Tenant A, customer in Tenant B | Alice = admin for products, moderator for categories |

---

## Kratos Integration (Optional)

The demo **does not require Kratos integration** for user management by default. Users are stored in-memory as mock data.

### Optional Enhancement

To add Kratos authentication:

1. **Enable Kratos Identity Creation** in `multi-tenancy-demo/routes/users.js`:

```javascript
// Uncomment Kratos integration code
const kratosResponse = await axios.post(
  `${KRATOS_ADMIN_URL}/admin/identities`,
  {
    schema_id: "default",
    traits: { email, name, tenant_ids: [req.tenantId] },
  }
);
```

2. **Add Authentication Middleware**:

```javascript
// Validate Kratos session before allowing requests
app.use(requireKratosSession);
```

3. **Update Web Demo** to include login/logout flows using Kratos self-service UI.

**Note**: This is optional. The current demo works without Kratos integration.

---

## Troubleshooting

### Backend API Not Responding

```bash
# Check if backend is running
curl http://localhost:9000/health

# Restart backend
cd multi-tenancy-demo
npm start
```

### CORS Errors

Make sure the backend API has CORS enabled:

```javascript
// multi-tenancy-demo/app.js
const cors = require("cors");
app.use(cors());
```

### Web Demo Not Connecting to Backend

Check environment variables in `web-demo/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:9000
```

### Data Reset

Data resets on server restart (intentional):

```bash
# Restart backend to reset all data
cd multi-tenancy-demo
npm start
```

---

## Project Structure

```
web-demo/
├── pages/                  # Next.js pages
│   ├── index.js           # Use case selection page
│   ├── simple-rbac/       # Use Case 1 pages
│   ├── tenant-rbac/       # Use Case 2 pages
│   └── resource-rbac/     # Use Case 3 pages
├── components/            # React components
│   ├── UserManagement.jsx
│   ├── RoleManagement.jsx
│   ├── TenantManagement.jsx
│   ├── ProductCatalog.jsx
│   └── CategoryManager.jsx
├── lib/                   # Utility libraries
│   ├── userApi.js        # User API client
│   ├── productApi.js     # Product API client
│   ├── categoryApi.js    # Category API client
│   └── ketoApi.js        # Keto API client
├── public/               # Static assets
├── ARCHITECTURE.md       # Comprehensive architecture documentation
├── README.md            # This file
└── package.json
```

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete architecture documentation
- **[Simple RBAC](../keto-zanziban-simple-rbac/README.md)** - Use Case 1 details
- **[Tenant-Centric RBAC](../keto-zanzibar-multi-tenancy-rbac/README.md)** - Use Case 2 details
- **[Resource-Scoped RBAC](../keto-zanziban-multi-tenancy-rbac-per-resource/README.md)** - Use Case 3 details
- **[Multi-Tenancy Demo API](../multi-tenancy-demo/README.md)** - Backend API documentation

---

## Contributing

This is a demonstration project for the Ory Stack. Contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

Part of the ORY Keto self-hosted demonstration project.

---

**Version**: 1.0
**Last Updated**: 2025-01-15
**Maintained By**: Ory Self-Hosted Team
