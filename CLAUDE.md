# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive Ory Stack self-hosted setup demonstrating identity management, authentication, authorization, and API gateway capabilities. It includes:

- **Ory Kratos**: Headless authentication and identity management
- **Ory Keto**: Fine-grained authorization using Zanzibar-style permissions
- **Ory Oathkeeper**: Identity and access proxy (API gateway)
- **PostgreSQL**: Shared database for all Ory services
- **Multi-tenancy Demo**: Express.js application demonstrating tenant isolation
- **RBAC Test Suite**: Comprehensive Postman collection for Keto authorization testing

## Architecture

### Service Stack

All services communicate through a shared Docker network (`ory-network`):

```
┌─────────────────────────────────────────────────────────────┐
│ Oathkeeper (API Gateway)                                    │
│ Proxy: 4455 | API: 4456                                     │
├─────────────────────────────────────────────────────────────┤
│ Kratos (Identity)        │ Keto (Authorization)             │
│ Public: 4433             │ Read: 4466                       │
│ Admin: 4434              │ Write: 4467                      │
│ UI: 4455                 │                                  │
├──────────────────────────┴──────────────────────────────────┤
│ PostgreSQL: 5432                                            │
│ Databases: kratos, keto                                     │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

- `kratos/` - Kratos identity service with self-service UI
  - `config/kratos.yml` - Main Kratos configuration
  - `config/identity.schema.json` - Identity schema (email, name, traits)
- `keto/` - Keto authorization service
  - `config/keto.yml` - Namespace: default (single-namespace RBAC model)
- `oathkeeper/` - Oathkeeper API gateway
  - `config/oathkeeper.yml` - Authenticators, authorizers, mutators
  - `config/access-rules.yml` - Routing and access control rules
- `postgres/` - PostgreSQL database service
- `multi-tenancy-demo/` - Express.js demo (port 9000)
- `keto-zanziban-simple-rbac/` - Postman test collection for Keto RBAC

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

### Multi-Tenancy Demo

```bash
# Docker-based (recommended)
make demo                  # Start demo as Docker container on port 9000
make demo-logs             # View demo logs
make demo-shell            # Shell access to demo container
make demo-restart          # Restart demo container

# Or use docker-compose directly
cd multi-tenancy-demo
docker-compose up -d --build
docker-compose logs -f

# Local development (without Docker)
cd multi-tenancy-demo
npm install
npm start                  # Starts on port 9000
node simple-test.js        # Run test suite
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

The `access-rules.yml` demonstrates API gateway patterns:
- **Users API**: `GET|POST|PUT|DELETE /users/<action>/<path>` - Maps actions to Keto permissions via regex capture groups
- **Products API**: `GET|POST|DELETE /products/<action>` - Authorizes via Keto's `product:items` with dynamic relation mapping (list→view)
- **Categories API**: `GET|POST|PUT /categories/<action>` - Authorizes via Keto's `category:items` with similar mapping
- **Authenticators**: Uses Kratos session (cookie_session or bearer_token) to extract identity
- **Mutators**: Injects `X-User-Id`, `X-Tenant-Id`, `X-User-Email`, `X-User-Traits` headers from Kratos identity
- **Authorization Flow**: Oathkeeper → Kratos (authenticate) → Keto (authorize) → Backend (proxy)

## Keto RBAC Model

The test suite demonstrates hierarchical RBAC:

- **Role Hierarchy**: Admin > Moderator > Customer (inheritance via subject sets)
- **Resources**: product:items, category:items
- **Permissions**: view, create, update, delete
- **Users**: alice (admin), bob (moderator), charlie (customer)

Permission matrix:

- Admin: All permissions (inherited from moderator + customer)
- Moderator: create products, update categories, view all (inherited from customer)
- Customer: view only

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

## Testing Scripts

- `clean-kratos-identities.sh` - Remove all Kratos identities
- `comprehensive-oathkeeper-test.sh` - Test Oathkeeper integration
- `keto-zanziban-simple-rbac/auto-test-postman-collection.sh` - Automated Postman tests
