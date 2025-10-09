# Ory Stack Self-Hosted - QWEN Context File

## Project Overview

This is a complete, production-ready implementation of the Ory Stack showcasing identity management, authentication, authorization, and API gateway capabilities with multi-tenancy support. The project demonstrates a comprehensive security stack using Ory Kratos (identity), Ory Keto (authorization), and Ory Oathkeeper (API gateway) with a multi-tenancy demo application.

### Core Components
- **Ory Kratos**: Headless authentication and identity management
- **Ory Keto**: Zanzibar-style fine-grained authorization 
- **Ory Oathkeeper**: Identity and access proxy (API gateway)
- **PostgreSQL 18**: Shared database for Ory services
- **Multi-tenancy Demo**: Express.js + TypeScript backend API with tenant isolation
- **Mailslurper**: Email testing server for development

### Architecture
```
┌──────────────────────────────────────────────────────────────┐
│ Next.js Web Demo (3000)                                      │
│ - Three RBAC model demos                                     │
│ - Kratos session integration                                 │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ Oathkeeper (API Gateway)                                     │
│ Proxy: 4455 | API: 4456                                      │
│ - Route-based namespace selection                            │
│ - Session extraction (cookie/bearer)                         │
│ - Keto authorization checks                                  │
│ - Header injection (X-User-Id, X-Tenant-Id, etc.)           │
└──────────────────────────────────────────────────────────────┘
       ↓                              ↓                    ↓
┌─────────────────┐     ┌──────────────────────┐  ┌────────────┐
│ Kratos          │     │ Keto                 │  │ Multi-     │
│ Public: 4433    │     │ Read: 4466           │  │ Tenancy    │
│ Admin: 4434     │     │ Write: 4467          │  │ Demo: 9000 │
│ UI: 4455        │     │                      │  │ (Express)  │
└─────────────────┘     └──────────────────────┘  └────────────┘
       ↓                              ↓
┌──────────────────────────────────────────────────────────────┐
│ PostgreSQL: 5432                                             │
│ Databases: kratos (identities), keto (relation-tuples)       │
└──────────────────────────────────────────────────────────────┘
```

### Three Authorization Models
1. **Simple RBAC** (`/api/simple-rbac/*` → namespace: `simple-rbac`)
   - Global role hierarchy: Admin > Moderator > Customer
   - No tenant isolation, direct user-to-role mapping

2. **Tenant-Centric RBAC** (`/api/tenant-rbac/*` → namespace: `tenant-rbac`)
   - Multi-tenant roles with tenant context in headers (`x-tenant-id`)
   - User can have different roles per tenant

3. **Resource-Scoped RBAC** (`/api/resource-rbac/*` → namespace: `resource-rbac`)
   - Fine-grained permissions per individual resource
   - Tenant + resource-level authorization

## Building and Running

### Prerequisites
- Docker & Docker Compose
- Make (optional, but recommended)
- pnpm (for web demo)

### Quick Start Commands
```bash
# Create Docker network
docker network create ory-network
# Or use: make network

# Start all services
make dev

# Verify installation
make health
```

Expected health check output:
```
✓ Kratos Public API: Ready
✓ Kratos Admin API: Ready
✓ Self-Service UI: Ready
✓ Keto Read API: Ready
✓ Keto Write API: Ready
```

### Common Management Commands
```bash
make up                    # Start all services
make down                  # Stop all services
make restart               # Restart all services
make status                # Show service status
make health                # Check service health
make logs                  # Show all Kratos service logs
make logs-kratos           # Show Kratos service logs only
make logs-keto             # Show Keto service logs only
make logs-oathkeeper       # Show Oathkeeper service logs only
make logs-postgres         # Show PostgreSQL logs only
make demo-logs             # Show demo service logs only

# Individual services
make postgres              # Start only PostgreSQL
make kratos                # Start only Kratos stack
make keto                  # Start only Keto stack
make oathkeeper            # Start only Oathkeeper
make demo                  # Start multi-tenancy demo (Docker)

# Development workflows
make reload-kratos         # Reload Kratos after config changes
make reload-keto           # Reload Keto after config changes
make reload-oathkeeper     # Reload Oathkeeper after config changes
make migrate               # Run database migrations manually
make shell-kratos          # Shell access to Kratos container
make shell-keto            # Shell access to Keto container
make shell-postgres        # Shell access to PostgreSQL (psql)
make demo-shell            # Shell access to demo container
make urls                  # Show all service URLs

# Cleanup
make clean                 # Remove all containers and volumes
make clean-identities      # Clean up test identities
make reset                 # Full reset and restart

# Create test users
make create-test-users     # Create alice, bob, charlie accounts
make create-admin          # Create admin user (admin@example.com / admin)
```

## Development Conventions

### Service Architecture
- All services communicate via Docker network (`ory-network`)
- Request Flow: Client → Oathkeeper → Kratos (authenticate) → Keto (authorize) → Backend
- Multi-tenancy implemented via `x-tenant-id` header
- Configuration stored in service-specific `config/` directories

### Configuration Files
- `kratos/config/kratos.yml` - Kratos configuration (authentication flows, methods, CORS)
- `kratos/config/identity.schema.json` - User schema with multi-tenancy support (email, name, tenant_ids)
- `keto/config/keto.yml` - Keto configuration (namespace settings)
- `oathkeeper/config/oathkeeper.yml` - Oathkeeper configuration (authenticators, authorizers, mutators)
- `oathkeeper/config/access-rules.yml` - Oathkeeper routing rules with dynamic permission mapping

### Multi-Tenancy Demo
- TypeScript Express.js application in `multi-tenancy-demo/`
- Context middleware extracts `x-tenant-id`, `x-user-id`, `x-keto-namespace` headers
- Four resource APIs: users, products, categories, roles
- All endpoints follow `/{resource}/{action}` pattern

### Oathkeeper Route Mapping
- URL path determines Keto namespace (`/api/simple-rbac/*` → `simple-rbac`)
- Regex capture groups extract action from URL (`/products/create` → action: `create`)
- Dynamic permission mapping (e.g., `list` action → `view` permission)
- Header injection passes user context to backend

### Testing Authorization
- Postman collections in `keto-zanziban-simple-rbac/` directory
- Use `newman` to run automated tests
- Manual testing with cURL against Keto endpoints

## Service Endpoints

| Service | Endpoint | Purpose |
|---------|----------|---------|
| Kratos Public API | http://127.0.0.1:4433 | Authentication flows |
| Kratos Admin API | http://127.0.0.1:4434 | Identity management |
| Kratos UI | http://127.0.0.1:4455 | Self-service UI |
| Keto Read API | http://localhost:4466 | Query permissions |
| Keto Write API | http://localhost:4467 | Manage relations |
| Oathkeeper Proxy | http://localhost:4455 | API gateway |
| Oathkeeper API | http://localhost:4456 | Gateway management |
| Multi-Tenancy Demo | http://localhost:9000 | Demo application |
| Mailslurper | http://127.0.0.1:4436 | Email testing |
| PostgreSQL | localhost:5432 | Database (postgres/postgres) |

## Key Features Demonstrated

### Authentication (Kratos)
- ✅ Email/password authentication
- ✅ Multi-factor authentication (TOTP, lookup secrets)
- ✅ Account recovery via email
- ✅ Email verification
- ✅ Profile management
- ✅ Session management
- ✅ Self-service UI

### Authorization (Keto)
- ✅ Zanzibar-style permissions
- ✅ Hierarchical RBAC (Admin > Moderator > Customer)
- ✅ Role inheritance via subject sets
- ✅ Fine-grained permissions (create, read, update, delete)
- ✅ Dynamic permission checks

### API Gateway (Oathkeeper)
- ✅ Request authentication
- ✅ Authorization enforcement
- ✅ Header injection (user context)
- ✅ Dynamic action-to-permission mapping
- ✅ Error handling (redirect/JSON)

### Multi-Tenancy
- ✅ Tenant context middleware
- ✅ Data isolation
- ✅ Tenant-aware identity schema
- ✅ Cross-tenant access prevention