# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A production-ready Ory Stack self-hosted implementation demonstrating three distinct authorization models. This is a **TypeScript/Node.js project** (Express.js backend, Next.js frontend) with Docker-based Ory services (Kratos, Keto, Oathkeeper).

### Core Components

- **Ory Kratos**: Headless authentication and identity management
- **Ory Keto**: Zanzibar-style fine-grained authorization
- **Ory Oathkeeper**: API gateway with authentication/authorization pipeline
- **PostgreSQL 18**: Shared database for Ory services
- **Multi-tenancy Demo**: Express.js + TypeScript backend API (port 9000) with in-memory/file-based storage
- **Web Demo**: Next.js 14 application demonstrating three RBAC models
- **Test Suites**: Comprehensive Postman collections for each RBAC model

## Architecture

### Three Authorization Models

This project demonstrates three distinct Keto namespace configurations via Oathkeeper routing:

1. **Simple RBAC** (`/api/simple-rbac/*` → namespace: `simple-rbac`)
   - Global role hierarchy: Admin > Moderator > Customer
   - No tenant isolation, direct user-to-role mapping
   - Test suite: `keto-zanziban-simple-rbac/`

2. **Tenant-Centric RBAC** (`/api/tenant-rbac/*` → namespace: `tenant-rbac`)
   - Multi-tenant roles with tenant context in headers (`x-tenant-id`)
   - User can have different roles per tenant
   - Test suite: `keto-zanzibar-multi-tenancy-rbac/`

3. **Resource-Scoped RBAC** (`/api/resource-rbac/*` → namespace: `resource-rbac`)
   - Fine-grained permissions per individual resource
   - Tenant + resource-level authorization
   - Test suite: `keto-zanziban-multi-tenancy-rbac-per-resource/`

### Service Stack

All services communicate via Docker network (`ory-network`):

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

### Key Architectural Patterns

**Request Flow**:
```
Client → Oathkeeper → Kratos (authenticate) → Keto (authorize) → Backend
```

**Oathkeeper Route Mapping** (`oathkeeper/config/access-rules.yml`):
- URL path determines Keto namespace (`/api/simple-rbac/*` → `simple-rbac`)
- Regex capture groups extract action from URL (`/products/create` → action: `create`)
- Dynamic permission mapping (e.g., `list` action → `view` permission)
- Header injection passes user context to backend

**Multi-Tenancy Demo** (`multi-tenancy-demo/src/`):
- TypeScript Express.js application
- Context middleware extracts `x-tenant-id`, `x-user-id`, `x-keto-namespace` headers
- In-memory storage with optional file persistence (`ENABLE_STORAGE_PERSISTENCE=true`)
- Four resource APIs: users, products, categories, roles
- All endpoints follow `/{resource}/{action}` pattern

## Development Commands

### Using Makefile (Recommended)

The root Makefile provides convenient commands for managing the entire stack:

```bash
# Quick start
make dev                    # Start all services and show URLs
make up                     # Start all services
make down                   # Stop all services
make restart               # Restart all services

# Individual services
make postgres              # Start only PostgreSQL
make kratos               # Start only Kratos stack
make keto                 # Start only Keto stack
make oathkeeper           # Start only Oathkeeper
make demo                 # Start multi-tenancy demo (Docker)

# Logs and monitoring
make logs                 # Show all Kratos service logs
make logs-kratos         # Show Kratos service logs only
make logs-keto           # Show Keto service logs only
make logs-oathkeeper     # Show Oathkeeper service logs only
make logs-ui             # Show UI service logs only
make logs-postgres       # Show PostgreSQL logs only
make demo-logs           # Show demo service logs only
make status              # Show service status
make health              # Check service health (curl all endpoints)

# Development workflows
make reload-kratos       # Reload Kratos after config changes
make reload-keto         # Reload Keto after config changes
make reload-oathkeeper   # Reload Oathkeeper after config changes
make migrate            # Run database migrations manually
make shell-kratos       # Shell access to Kratos container
make shell-keto         # Shell access to Keto container
make shell-postgres     # Shell access to PostgreSQL (psql)
make demo-shell         # Shell access to demo container
make urls               # Show all service URLs

# Cleanup
make clean              # Remove all containers and volumes
make reset              # Full reset and restart
```

### Direct Docker Compose Commands

Each service has its own docker-compose.yaml in its subdirectory:

```bash
# Start complete stack (from root)
cd postgres && docker-compose up -d
cd kratos && docker-compose up -d
cd keto && docker-compose up -d
cd oathkeeper && docker-compose up -d

# Or start individual services
cd kratos && docker-compose up -d
cd keto && docker-compose up -d

# View logs
docker-compose -f kratos/docker-compose.yaml logs -f kratos
docker-compose -f keto/docker-compose.yaml logs -f keto

# Rebuild after config changes
cd kratos && docker-compose up -d --force-recreate kratos
cd keto && docker-compose up -d --force-recreate keto
```

### Multi-Tenancy Demo (TypeScript)

```bash
# Docker-based (recommended)
make demo                  # Start demo as Docker container on port 9000
make demo-logs             # View demo logs
make demo-shell            # Shell access to demo container
make demo-restart          # Restart demo container

# Local development (TypeScript)
cd multi-tenancy-demo
npm install                # Install dependencies
npm run build              # Compile TypeScript to dist/
npm start                  # Run compiled code (starts on port 9000)
npm run dev                # Development mode with ts-node
node simple-test.js        # Run test suite against running server

# Enable file persistence (default: in-memory)
ENABLE_STORAGE_PERSISTENCE=true npm start

# Storage files (when persistence enabled)
# - data/storage.json          # Main data file
# - data/backups/*.json        # Auto-backups
```

### Web Demo (Next.js)

```bash
# Development
cd web-demo
pnpm install               # Install dependencies
pnpm dev                   # Start dev server on port 3000
pnpm build                 # Build for production
pnpm start                 # Run production build
pnpm lint                  # Lint code
pnpm type-check            # TypeScript type checking

# Or use Makefile
make web-demo              # Start dev server
make web-demo-build        # Production build
make web-demo-lint         # Lint
make web-demo-type-check   # Type check
```

## Service Endpoints

- **Kratos Public API**: http://127.0.0.1:4433/
- **Kratos Admin API**: http://127.0.0.1:4434/
- **Kratos Self-Service UI**: http://127.0.0.1:4455/
- **Keto Read API**: http://localhost:4466
- **Keto Write API**: http://localhost:4467
- **Oathkeeper Proxy**: http://localhost:4455 (port conflict with Kratos UI in current setup)
- **Oathkeeper API**: http://localhost:4456
- **Mailslurper**: http://127.0.0.1:4436/
- **PostgreSQL**: localhost:5432 (postgres/postgres)
- **Multi-Tenancy Demo**: http://localhost:9000 (or 3001 if port mapping configured)

## Key Configuration Files

### Kratos Configuration

- `kratos/config/kratos.yml`:

  - Database DSN pointing to postgres:5432/kratos
  - Self-service flows: registration, login, recovery, verification, settings
  - Authentication methods: password, TOTP, lookup_secret, link, code
  - CORS enabled for local development
  - Email delivery via Mailslurper (SMTP on port 1025)

- `kratos/config/identity.schema.json`:
  - User traits: email (required, verified), name (first, last), tenant_ids (array)
  - Recovery via email code
  - Verification required for email
  - Multi-tenancy support via tenant_ids array field

### Keto Configuration

- `keto/config/keto.yml`:
  - Single namespace: `default` (id: 0) - Simplified RBAC model
  - Database DSN pointing to postgres:5432/keto
  - Read API on 4466 (query permissions), Write API on 4467 (manage relations)
  - Note: Previously used multi-namespace setup (permissions, tenant_roles, tenant_memberships) has been simplified

### Oathkeeper Configuration

- `oathkeeper/config/oathkeeper.yml`:

  - Authenticators: anonymous, cookie_session, bearer_token (all integrate with Kratos)
  - Authorizers: allow, deny, keto_engine_acp_ory, remote_json (for Keto checks)
  - Mutators: noop, header
  - Error handlers: redirect to login for HTML, JSON for API requests
  - CORS enabled with X-Tenant-Id support

- `oathkeeper/config/access-rules.yml`:
  - Routing rules connecting Oathkeeper proxy to backend services
  - Authentication and authorization pipeline per route

## Configuration Changes

### Kratos

1. Edit `kratos/config/kratos.yml` for service settings
2. Edit `kratos/config/identity.schema.json` for user schema
3. Restart: `cd kratos && docker-compose up -d --force-recreate kratos`
4. Database migrations run automatically via `kratos-migrate` service

### Keto

1. Edit `keto/config/keto.yml` for namespaces and settings
2. Restart: `cd keto && docker-compose up -d --force-recreate keto`
3. Database migrations run automatically via `keto-migrate` service

### Oathkeeper

1. Edit `oathkeeper/config/oathkeeper.yml` for authenticators/authorizers
2. Edit `oathkeeper/config/access-rules.yml` for routing rules
3. Restart: `cd oathkeeper && docker-compose up -d --force-recreate oathkeeper`

## Testing Authorization (Keto)

### Using Postman Collection

The `keto-zanziban-simple-rbac/` directory contains a comprehensive test suite:

1. Import the Postman collection
2. Set environment variables:
   - `keto_read_url`: http://localhost:4466
   - `keto_write_url`: http://localhost:4467
   - `namespace`: default
3. Run "Setup Relations" folder first (creates role hierarchy)
4. Run authorization tests for Alice (admin), Bob (moderator), Charlie (customer)

### Using cURL

```bash
# Create a relation
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "default",
    "object": "role:admin",
    "relation": "member",
    "subject_id": "user:alice"
  }'

# Check authorization
curl -G http://localhost:4466/relation-tuples/check \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice"

# List relations
curl http://localhost:4466/relation-tuples?namespace=default

# Delete relations
curl -X DELETE "http://localhost:4467/admin/relation-tuples?namespace=default"
```

## Multi-Tenancy Implementation

The `multi-tenancy-demo/` (port 9000 internal, 3001 external) demonstrates logical tenant isolation with three core APIs:

- **Tenant Context**: All requests require `x-tenant-id` header (extracted by `contextMiddleware`)
- **Data Isolation**: Users, products, and categories filtered by tenant_id
- **Resource APIs**: `/users`, `/products`, `/categories` with CRUD operations
- **Operation Pattern**: All endpoints use `/{resource}/{action}` format (e.g., `/users/list`, `/products/create`)

### API Endpoints

```bash
# Health check and docs
curl http://localhost:9000/health
curl http://localhost:9000/api-docs

# Users API (list, get, create, update, delete)
curl -H "x-tenant-id: tenant-a" http://localhost:9000/users/list
curl -H "x-tenant-id: tenant-a" http://localhost:9000/users/get/{id}
curl -X POST -H "x-tenant-id: tenant-a" -H "Content-Type: application/json" \
  -d '{"email": "alice@tenant-a.com", "name": {"first": "Alice"}}' \
  http://localhost:9000/users/create

# Products API (list, get, create, update, delete)
curl -H "x-tenant-id: tenant-a" http://localhost:9000/products/list
curl -X POST -H "x-tenant-id: tenant-a" -H "Content-Type: application/json" \
  -d '{"name": "Product X", "price": 99.99}' \
  http://localhost:9000/products/create

# Categories API (list, get, create, update, delete)
curl -H "x-tenant-id: tenant-a" http://localhost:9000/categories/list
curl -X POST -H "x-tenant-id: tenant-a" -H "Content-Type: application/json" \
  -d '{"name": "Category Y"}' \
  http://localhost:9000/categories/create
```

### Integration with Oathkeeper

The `oathkeeper/config/access-rules.yml` implements three distinct routing patterns:

**1. Simple RBAC Routes** (`/api/simple-rbac/*`)
```yaml
# URL: /api/simple-rbac/products/create
# Strips prefix → /products/create (proxied to multi-tenancy-demo:9000)
# Authenticator: cookie_session or bearer_token
# Authorizer: remote_json → Keto check (namespace: simple-rbac)
# Mutator: Injects X-User-Id, X-User-Email, X-Keto-Namespace headers
```

**2. Tenant RBAC Routes** (`/api/tenant-rbac/*`)
```yaml
# URL: /api/tenant-rbac/products/list
# Requires x-tenant-id header from client
# Authenticator: cookie_session or bearer_token
# Authorizer: remote_json → Keto check (namespace: tenant-rbac)
# Mutator: Injects X-User-Id, X-Tenant-Id, X-Keto-Namespace headers
```

**3. Resource RBAC Routes** (`/api/resource-rbac/*`)
```yaml
# URL: /api/resource-rbac/products/get/123
# Fine-grained per-resource authorization
# Authenticator: cookie_session or bearer_token
# Authorizer: remote_json → Keto check (namespace: resource-rbac)
# Mutator: Injects X-User-Id, X-Tenant-Id, X-Keto-Namespace headers
```

**Dynamic Permission Mapping**:
- Regex capture groups extract action from URL path
- Action mapping: `list` → `view`, `create` → `create`, etc.
- Template: `{{ if eq (index .MatchContext.RegexpCaptureGroups 2) "list" }}view{{ else }}...{{ end }}`

**Authorization Pipeline**:
```
1. Extract session from cookie/bearer token (Kratos)
2. Check permission via Keto (namespace + object + relation + subject)
3. Inject headers with user context
4. Proxy to backend (multi-tenancy-demo or web-demo)
```

## Keto Authorization Models

### 1. Simple RBAC (Hierarchical Roles)

**Namespace**: `simple-rbac`

**Role Hierarchy** (via subject sets):
```
Admin (all permissions)
  ├─ inherits → Moderator
  │             ├─ inherits → Customer (view only)
  │             └─ additional: create products, update categories
  └─ additional: delete products, create categories
```

**Permission Matrix**:
| User              | Role      | Product View | Create | Delete | Category View | Create | Update |
|-------------------|-----------|--------------|--------|--------|---------------|--------|--------|
| alice@example.com | Admin     | ✅           | ✅     | ✅     | ✅            | ✅     | ✅     |
| bob@example.com   | Moderator | ✅           | ✅     | ❌     | ✅            | ❌     | ✅     |
| charlie@...       | Customer  | ✅           | ❌     | ❌     | ✅            | ❌     | ❌     |

**Keto Relation Tuple Examples**:
```json
// Role hierarchy (subject sets)
{"namespace": "simple-rbac", "object": "role:customer", "relation": "member",
 "subject_set": {"namespace": "simple-rbac", "object": "role:moderator", "relation": "member"}}

// User assignment
{"namespace": "simple-rbac", "object": "role:admin", "relation": "member", "subject_id": "user:alice@example.com"}

// Permission grant
{"namespace": "simple-rbac", "object": "product:items", "relation": "delete",
 "subject_set": {"namespace": "simple-rbac", "object": "role:admin", "relation": "member"}}
```

### 2. Tenant-Centric RBAC

**Namespace**: `tenant-rbac`

- Same role hierarchy as Simple RBAC but **scoped per tenant**
- User can be Admin in `tenant-a` but Customer in `tenant-b`
- Authorization checks include tenant context from `x-tenant-id` header
- Kratos identity schema includes `tenant_ids` array field

### 3. Resource-Scoped RBAC

**Namespace**: `resource-rbac`

- Per-resource permission grants (e.g., `product:prod-123` instead of `product:items`)
- Most fine-grained authorization model
- Supports individual resource sharing/delegation
- Higher Keto query volume (check each resource individually)

## Development Environment Notes

- All services run in development mode with debug logging
- Secrets are development-grade (change for production)
- Email testing via Mailslurper (captures all outgoing emails)
- CORS enabled for local development
- PostgreSQL data persists in Docker volumes
- Network name is `ory-network` (must be created: `docker network create ory-network`)

## Troubleshooting

### Services won't start

```bash
# Check if ory-network exists
docker network ls | grep ory-network

# Create if missing
docker network create ory-network

# Check service status
make status
```

### Database connection errors

```bash
# Ensure PostgreSQL is running first
make postgres
make status

# Check PostgreSQL logs
make logs-postgres
```

### Port conflicts

- Kratos UI (4455) conflicts with Oathkeeper proxy (4455)
- To use Oathkeeper, stop Kratos UI or change ports in docker-compose.yaml

### Config changes not applied

```bash
# Force recreate the service
cd kratos && docker-compose up -d --force-recreate kratos
cd keto && docker-compose up -d --force-recreate keto

# Or use make command
make reload-kratos
```

## Testing and Development Workflows

### Quick Start (First Time Setup)

```bash
# 1. Create Docker network
docker network create ory-network

# 2. Start all services
make dev                          # Starts all services + shows URLs + health check

# 3. Create test users in Kratos
make create-test-users            # Creates alice, bob, charlie with passwords

# 4. Setup Keto permissions (Simple RBAC)
cd keto-zanziban-simple-rbac
./auto-test-postman-collection.sh # Requires newman (npm install -g newman)

# 5. Test the setup
curl -H "x-tenant-id: tenant-a" http://localhost:9000/health
curl -H "x-tenant-id: tenant-a" http://localhost:9000/products/list
```

### Testing RBAC Models

**Option 1: Postman Collections** (Recommended)
```bash
# Install newman (Postman CLI)
npm install -g newman

# Simple RBAC - Automated tests
cd keto-zanziban-simple-rbac
./auto-test-postman-collection.sh

# Tenant-Centric RBAC
cd keto-zanzibar-multi-tenancy-rbac
./test-multi-tenant-rbac.sh

# Resource-Scoped RBAC
cd keto-zanziban-multi-tenancy-rbac-per-resource
./Keto-Resource-Scoped-RBAC-Test.sh
```

**Option 2: Manual Testing with cURL**
```bash
# Create test user in Kratos
curl -X POST http://127.0.0.1:4434/admin/identities \
  -H "Content-Type: application/json" \
  -d '{
    "schema_id": "default",
    "traits": {"email": "test@example.com", "name": {"first": "Test"}, "tenant_ids": ["tenant-a"]},
    "credentials": {"password": {"config": {"password": "test123"}}}
  }'

# Assign role in Keto
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "simple-rbac",
    "object": "role:admin",
    "relation": "member",
    "subject_id": "user:test@example.com"
  }'

# Check permission
curl -G http://localhost:4466/relation-tuples/check \
  --data-urlencode "namespace=simple-rbac" \
  --data-urlencode "object=product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:test@example.com"
```

### Development Scripts

```bash
# Cleanup and utilities
./clean-kratos-identities.sh              # Delete all Kratos identities
./comprehensive-oathkeeper-test.sh        # Test Oathkeeper routes
make clean-identities                     # Clean test identities (uses script above)

# Service management
make status                               # Check all service status
make health                               # Health check all endpoints
make urls                                 # Display all service URLs

# Individual service commands
make create-admin                         # Create admin user (admin@example.com / admin)
make create-test-users                    # Create alice, bob, charlie
```

### Common Development Tasks

**Adding a New User**:
```bash
# 1. Create identity in Kratos
make create-admin  # or use curl with /admin/identities

# 2. Assign role in Keto
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{"namespace": "simple-rbac", "object": "role:customer", "relation": "member", "subject_id": "user:newuser@example.com"}'

# 3. Verify assignment
curl -G http://localhost:4466/relation-tuples/check \
  --data-urlencode "namespace=simple-rbac" \
  --data-urlencode "object=role:customer" \
  --data-urlencode "relation=member" \
  --data-urlencode "subject_id=user:newuser@example.com"
```

**Debugging Authorization Issues**:
```bash
# 1. List all relations in namespace
curl "http://localhost:4466/relation-tuples?namespace=simple-rbac" | jq

# 2. Expand role hierarchy
curl -G "http://localhost:4466/relation-tuples/expand" \
  --data-urlencode "namespace=simple-rbac" \
  --data-urlencode "object=role:admin" \
  --data-urlencode "relation=member" \
  --data-urlencode "max-depth=5" | jq

# 3. Check Keto logs
make logs-keto

# 4. Check Oathkeeper logs (for routing issues)
make logs-oathkeeper
```

**Modifying TypeScript Code**:
```bash
# Multi-tenancy demo
cd multi-tenancy-demo
# Edit files in src/
npm run build                             # Compile TypeScript
docker-compose restart multi-tenancy-demo # Restart container

# Web demo
cd web-demo
# Edit files in app/
pnpm dev                                  # Hot reload enabled
```
