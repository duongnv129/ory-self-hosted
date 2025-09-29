# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Ory Kratos self-hosted identity management setup. Ory Kratos is a headless, cloud-native authentication and identity management system that provides self-service login/registration, multi-factor authentication, account recovery, and profile management.

## Architecture

The system consists of multiple Docker services working together:

- **kratos**: Main identity management service (ports 4433/4434)
- **kratos-selfservice-ui-node**: Web UI for authentication flows (port 4455)
- **postgres**: PostgreSQL database (port 5432)
- **mailslurper**: Email testing server for development (ports 4436/4437)

The setup spans multiple directories in the parent `ory-self-hosted` project:
- `kratos/` - Kratos service configuration and Docker Compose
- `postgres/` - PostgreSQL database Docker Compose
- `keto/` - Future Ory Keto authorization service

## Development Commands

### Using Makefile (Recommended)

The root directory contains a Makefile with convenient commands:

```bash
# Start development environment
make dev                    # Start all services and show URLs
make up                     # Start all services
make down                   # Stop all services
make restart               # Restart all services

# Individual services
make postgres              # Start only PostgreSQL
make kratos               # Start only Kratos stack

# Logs and monitoring
make logs                 # Show all Kratos service logs
make logs-kratos         # Show Kratos service logs only
make logs-ui             # Show UI service logs only
make logs-postgres       # Show PostgreSQL logs only
make status              # Show service status
make health              # Check service health

# Development workflows
make reload-kratos       # Reload Kratos after config changes
make migrate            # Run database migrations
make shell-kratos       # Shell access to Kratos container
make shell-postgres     # Shell access to PostgreSQL
make urls               # Show all service URLs

# Cleanup
make clean              # Remove all containers and volumes
make reset              # Full reset and restart
make help               # Show all available commands
```

### Direct Docker Compose Commands

```bash
# Start complete stack (from ory-self-hosted root)
docker-compose -f postgres/docker-compose.yaml -f kratos/docker-compose.yaml up -d

# Start Kratos services only (from kratos/ directory)
cd kratos && docker-compose up -d

# Start database only (from postgres/ directory)
cd postgres && docker-compose up -d

# View logs
cd kratos && docker-compose logs -f kratos
cd kratos && docker-compose logs -f kratos-selfservice-ui-node

# Stop services
docker-compose down

# Rebuild after config changes
cd kratos && docker-compose up -d --force-recreate kratos
```

## Key Configuration Files

- `config/kratos.yml` - Main Kratos configuration including database, auth methods, and self-service flows
- `config/identity.schema.json` - Identity schema defining user traits (email, name) and verification methods
- `docker-compose.yaml` - Service orchestration for Kratos, UI, and mail server

## Service Endpoints

- Kratos Public API: http://127.0.0.1:4433/
- Kratos Admin API: http://127.0.0.1:4434/
- Self-Service UI: http://127.0.0.1:4455/
- Mailslurper (email testing): http://127.0.0.1:4436/
- PostgreSQL: localhost:5432 (postgres/postgres)

## Configuration Changes

When modifying Kratos configuration:

1. Edit `config/kratos.yml` for service settings
2. Edit `config/identity.schema.json` for user schema changes
3. Restart Kratos service: `docker-compose up -d --force-recreate kratos`
4. For database schema changes, the kratos-migrate service will handle migrations automatically

## Development Environment

This setup runs in development mode with:
- Debug logging enabled (including sensitive values)
- Development-grade secrets (change for production)
- Email capture via Mailslurper
- Hot reloading with `--watch-courier` flag
- CORS enabled for local development

## Authentication Features Enabled

- Email/password authentication
- Multi-factor authentication (TOTP, lookup secrets)
- Account recovery via email codes
- Email verification
- Profile management
- Session management