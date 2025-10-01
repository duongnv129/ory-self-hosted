# Ory Stack Self-Hosted

A complete, production-ready implementation of the Ory Stack showcasing identity management, authentication, authorization, and API gateway capabilities with multi-tenancy support.

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![Ory Kratos](https://img.shields.io/badge/Ory%20Kratos-Latest-green)](https://www.ory.sh/kratos/)
[![Ory Keto](https://img.shields.io/badge/Ory%20Keto-v0.14-green)](https://www.ory.sh/keto/)
[![Ory Oathkeeper](https://img.shields.io/badge/Ory%20Oathkeeper-v0.40-green)](https://www.ory.sh/oathkeeper/)

## 🎯 What's Included

### Core Services
- **Ory Kratos** - Headless authentication and identity management
- **Ory Keto** - Fine-grained authorization using Zanzibar-style permissions
- **Ory Oathkeeper** - Identity and access proxy (API gateway)
- **PostgreSQL 18** - Shared database for all Ory services
- **Mailslurper** - Email testing server for development

### Demo Applications
- **Multi-Tenancy Demo** - Express.js application demonstrating tenant isolation with CRUD APIs
- **RBAC Test Suite** - Comprehensive Postman collection for Keto authorization testing

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Make (optional, but recommended)
- curl or Postman (for testing)

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd ory-self-hosted
```

2. **Create Docker network**
```bash
docker network create ory-network
# Or use: make network
```

3. **Start all services**
```bash
make dev
```

This will:
- Start PostgreSQL
- Start Kratos with self-service UI
- Start Keto authorization service
- Run database migrations
- Display all service URLs
- Check service health

### Verify Installation

```bash
make health
```

Expected output:
```
✓ Kratos Public API: Ready
✓ Kratos Admin API: Ready
✓ Self-Service UI: Ready
✓ Keto Read API: Ready
✓ Keto Write API: Ready
```

## 📚 Architecture

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

### Request Flow

```
Client → Oathkeeper → Kratos (Auth) → Keto (Authz) → Backend Service
```

## 🔑 Service Endpoints

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
| PostgreSQL | localhost:5432 | Database |

## 💻 Common Commands

### Service Management

```bash
make up              # Start core services (postgres, kratos, keto)
make up-all          # Start all services including oathkeeper and demo
make down            # Stop all services
make restart         # Restart all services
make status          # Show service status
make health          # Check service health
```

### Individual Services

```bash
make postgres        # Start PostgreSQL only
make kratos          # Start Kratos stack
make keto            # Start Keto stack
make oathkeeper      # Start Oathkeeper
make demo            # Start multi-tenancy demo (Docker)
```

### Logs

```bash
make logs            # All Kratos logs
make logs-kratos     # Kratos service logs
make logs-keto       # Keto service logs
make logs-oathkeeper # Oathkeeper logs
make logs-postgres   # PostgreSQL logs
make demo-logs       # Demo application logs
```

### Development

```bash
make reload-kratos      # Reload Kratos after config changes
make reload-keto        # Reload Keto after config changes
make reload-oathkeeper  # Reload Oathkeeper after config changes
make migrate            # Run database migrations
make shell-kratos       # Shell access to Kratos container
make shell-keto         # Shell access to Keto container
make shell-postgres     # PostgreSQL shell (psql)
make demo-shell         # Shell access to demo container
```

### Cleanup

```bash
make clean              # Remove all containers and volumes
make clean-identities   # Clean up test identities
make reset              # Full reset and restart
```

## 🧪 Testing

### RBAC Authorization Testing

The repository includes a comprehensive Postman collection for testing Keto's RBAC model:

```bash
# See the test suite documentation
cat keto-zanziban-simple-rbac/README.md
```

**Test Users:**
- **Alice** (Admin): All permissions
- **Bob** (Moderator): Create products, update categories, view all
- **Charlie** (Customer): View only

### Multi-Tenancy Demo

```bash
# Start the demo
make demo

# Health check
curl http://localhost:9000/health

# API documentation
curl http://localhost:9000/api-docs

# Test APIs
curl -H "x-tenant-id: tenant-a" http://localhost:9000/users/list
curl -H "x-tenant-id: tenant-a" http://localhost:9000/products/list
curl -H "x-tenant-id: tenant-a" http://localhost:9000/categories/list
```

## 📖 Documentation

### Component Documentation
- [CLAUDE.md](./CLAUDE.md) - Complete developer guide for Claude Code
- [Oathkeeper Guide](./oathkeeper/README.md) - Detailed API gateway configuration guide
- [RBAC Test Suite](./keto-zanziban-simple-rbac/README.md) - Authorization testing guide
- [Testing Guide](./TESTING_README.md) - General testing documentation

### Key Configurations

#### Kratos (`kratos/config/`)
- `kratos.yml` - Authentication flows, methods, CORS
- `identity.schema.json` - User schema with multi-tenancy support (email, name, tenant_ids)

#### Keto (`keto/config/`)
- `keto.yml` - Single namespace RBAC model (`default`)

#### Oathkeeper (`oathkeeper/config/`)
- `oathkeeper.yml` - Authenticators, authorizers, mutators
- `access-rules.yml` - Routing rules with dynamic permission mapping

## 🏗️ Project Structure

```
ory-self-hosted/
├── kratos/                    # Identity management
│   ├── config/
│   │   ├── kratos.yml
│   │   └── identity.schema.json
│   └── docker-compose.yaml
├── keto/                      # Authorization
│   ├── config/
│   │   └── keto.yml
│   └── docker-compose.yaml
├── oathkeeper/                # API Gateway
│   ├── config/
│   │   ├── oathkeeper.yml
│   │   └── access-rules.yml
│   ├── docker-compose.yaml
│   └── README.md             # Comprehensive gateway guide
├── postgres/                  # Database
│   └── docker-compose.yaml
├── multi-tenancy-demo/        # Demo application
│   ├── routes/               # API routes (users, products, categories)
│   ├── middleware/           # Tenant context middleware
│   ├── Dockerfile
│   └── docker-compose.yaml
├── keto-zanziban-simple-rbac/ # RBAC test suite
│   ├── README.md
│   └── *.postman_collection.json
├── Makefile                   # Development commands
├── CLAUDE.md                  # Complete developer guide
└── README.md                  # This file
```

## 🔐 Authentication & Authorization

### Creating an Identity

```bash
curl -X POST http://localhost:4434/admin/identities \
  -H "Content-Type: application/json" \
  -d '{
    "schema_id": "default",
    "traits": {
      "email": "user@example.com",
      "name": {
        "first": "John",
        "last": "Doe"
      },
      "tenant_ids": ["tenant-a"]
    }
  }'
```

### Setting Up Permissions

```bash
# Assign user to role
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "default",
    "object": "role:admin",
    "relation": "member",
    "subject_id": "user:alice@example.com"
  }'

# Grant permission to role
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "default",
    "object": "product:items",
    "relation": "create",
    "subject_set": {
      "namespace": "default",
      "object": "role:admin",
      "relation": "member"
    }
  }'
```

### Checking Permissions

```bash
curl -G http://localhost:4466/relation-tuples/check \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=product:items" \
  --data-urlencode "relation=create" \
  --data-urlencode "subject_id=user:alice@example.com"
```

## 🎭 Multi-Tenancy

The demo application demonstrates tenant isolation:

### Features
- **Tenant Context**: All requests require `x-tenant-id` header
- **Data Isolation**: Resources filtered by tenant_id
- **Three APIs**: Users, Products, Categories with full CRUD
- **Kratos Integration**: Extended identity schema with tenant_ids

### Example Usage

```bash
# Create user for tenant-a
curl -X POST http://localhost:9000/users/create \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-a" \
  -d '{
    "email": "alice@tenant-a.com",
    "name": {"first": "Alice", "last": "Smith"}
  }'

# List products for tenant-b
curl -H "x-tenant-id: tenant-b" http://localhost:9000/products/list

# Create category for tenant-a
curl -X POST http://localhost:9000/categories/create \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-a" \
  -d '{"name": "Electronics"}'
```

## 🔧 Configuration

### Kratos Configuration

Edit `kratos/config/kratos.yml` for:
- Self-service flows (registration, login, recovery, verification)
- Authentication methods (password, TOTP, MFA, magic links)
- Email settings
- Session configuration

**Reload after changes:**
```bash
make reload-kratos
```

### Keto Configuration

Edit `keto/config/keto.yml` for:
- Namespace configuration
- Database settings

**Reload after changes:**
```bash
make reload-keto
```

### Oathkeeper Configuration

Edit `oathkeeper/config/oathkeeper.yml` and `access-rules.yml` for:
- Authenticators (how to verify identity)
- Authorizers (how to check permissions)
- Mutators (how to transform requests)
- Routing rules

**Reload after changes:**
```bash
make reload-oathkeeper
```

See [oathkeeper/README.md](./oathkeeper/README.md) for detailed configuration guide.

## 🐛 Troubleshooting

### Services won't start

```bash
# Check if network exists
docker network ls | grep ory-network

# Create network if missing
make network

# Check status
make status
```

### Database connection errors

```bash
# Ensure PostgreSQL is running
make postgres
make logs-postgres
```

### Port conflicts

- Kratos UI (4455) conflicts with Oathkeeper proxy (4455)
- To use Oathkeeper, stop Kratos UI or change ports in docker-compose.yaml

### Config changes not applied

```bash
# Force recreate services
make reload-kratos
make reload-keto
make reload-oathkeeper
```

### Permission denied errors

Check Keto relations:
```bash
# List all relations
curl http://localhost:4466/relation-tuples?namespace=default

# Check specific permission
curl -G http://localhost:4466/relation-tuples/check \
  --data-urlencode "namespace=default" \
  --data-urlencode "object=resource:id" \
  --data-urlencode "relation=action" \
  --data-urlencode "subject_id=user:email"
```

## 🌟 Features Demonstrated

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

## 📝 Development Notes

### Environment
- All services run in development mode
- Debug logging enabled
- Development-grade secrets (change for production)
- CORS enabled for local development
- Email capture via Mailslurper

### Database
- PostgreSQL data persists in Docker volumes
- Migrations run automatically
- Separate databases for Kratos and Keto

### Network
- All services communicate via `ory-network`
- Services use Docker DNS for service discovery

## 🚢 Production Considerations

Before deploying to production:

1. **Change all secrets** in configuration files
2. **Enable HTTPS** for all endpoints
3. **Configure proper SMTP** (replace Mailslurper)
4. **Set up monitoring** and logging
5. **Configure database backups**
6. **Review CORS settings**
7. **Enable rate limiting**
8. **Configure proper session timeouts**
9. **Set up proper certificate management**
10. **Review and harden security settings**

## 📚 Resources

### Official Documentation
- [Ory Kratos Docs](https://www.ory.sh/docs/kratos)
- [Ory Keto Docs](https://www.ory.sh/docs/keto)
- [Ory Oathkeeper Docs](https://www.ory.sh/docs/oathkeeper)
- [Zanzibar Paper](https://research.google/pubs/pub48190/)

### Community
- [Ory Community](https://www.ory.sh/chat)
- [GitHub Issues](https://github.com/ory)
- [Ory Blog](https://www.ory.sh/blog)

## 🔄 CI/CD

This project includes comprehensive GitHub Actions workflows:

- **CI/CD Pipeline** - Automated testing and deployment
- **Release Automation** - Automatic releases on version tags
- **Docker Compose Tests** - Validation of compose configurations
- **Security Scanning** - Vulnerability detection with Trivy
- **Dependabot** - Automatic dependency updates

See [.github/README.md](./.github/README.md) for detailed CI/CD documentation.

### Status Badges

![CI/CD](https://github.com/username/repo/workflows/CI/CD%20Pipeline/badge.svg)
![Release](https://github.com/username/repo/workflows/Release/badge.svg)

### Quick Setup

1. Configure GitHub Secrets:
   - `DOCKER_USERNAME` - Docker Hub username
   - `DOCKER_PASSWORD` - Docker Hub access token

2. Create environment in GitHub:
   - `production` - For main branch deployments with approval

## 🤝 Contributing

This is a demonstration project. Feel free to fork and adapt for your needs.

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes and test locally
3. Ensure all tests pass: `make health`
4. Create a pull request to `main`
5. Fill out the PR template
6. Request review from maintainers
7. Merge after approval and passing CI

## 📄 License

See individual Ory project licenses:
- [Kratos License](https://github.com/ory/kratos/blob/master/LICENSE)
- [Keto License](https://github.com/ory/keto/blob/master/LICENSE)
- [Oathkeeper License](https://github.com/ory/oathkeeper/blob/master/LICENSE)

## 🙏 Acknowledgments

Built with the excellent [Ory](https://www.ory.sh/) open-source security stack.

---

**Need help?** Check out the [CLAUDE.md](./CLAUDE.md) for comprehensive development guidance or the [Oathkeeper README](./oathkeeper/README.md) for API gateway configuration details.
