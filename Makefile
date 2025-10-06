# Makefile for Ory Stack Self-Hosted Setup

# Define paths relative to ory-self-hosted root
POSTGRES_PATH = postgres
KRATOS_PATH = kratos
KETO_PATH = keto
OATHKEEPER_PATH = oathkeeper
DEMO_PATH = multi-tenancy-demo

.PHONY: help up down restart logs status clean postgres kratos keto oathkeeper demo migrate shell network

# Default target
help: ## Show this help message
	@echo "Ory Stack Self-Hosted Management"
	@echo "================================="
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Network Management
network: ## Create Docker network (ory-network)
	@docker network inspect ory-network >/dev/null 2>&1 || \
		(docker network create ory-network && echo "✓ Created ory-network") || \
		echo "✓ Network ory-network already exists"

# Service Management
up: network ## Start all services (postgres + kratos + keto)
	@echo "Starting PostgreSQL..."
	@cd $(POSTGRES_PATH) && docker-compose up -d
	@echo "Starting Kratos stack..."
	@cd $(KRATOS_PATH) && docker-compose up -d
	@echo "Starting Keto stack..."
	@cd $(KETO_PATH) && docker-compose up -d
	@echo "✓ Core services started"

up-all: network ## Start all services including Oathkeeper and demo
	@echo "Starting PostgreSQL..."
	@cd $(POSTGRES_PATH) && docker-compose up -d
	@echo "Starting Kratos stack..."
	@cd $(KRATOS_PATH) && docker-compose up -d
	@echo "Starting Keto stack..."
	@cd $(KETO_PATH) && docker-compose up -d
	@echo "Starting Oathkeeper..."
	@cd $(OATHKEEPER_PATH) && docker-compose up -d
	@echo "Starting Multi-Tenancy Demo..."
	@cd $(DEMO_PATH) && docker-compose up -d --build
	@echo "✓ All services started"

down: ## Stop all services
	@echo "Stopping Multi-Tenancy Demo..."
	@cd $(DEMO_PATH) && docker-compose down 2>/dev/null || true
	@echo "Stopping Oathkeeper..."
	@cd $(OATHKEEPER_PATH) && docker-compose down 2>/dev/null || true
	@echo "Stopping Keto stack..."
	@cd $(KETO_PATH) && docker-compose down 2>/dev/null || true
	@echo "Stopping Kratos stack..."
	@cd $(KRATOS_PATH) && docker-compose down
	@echo "Stopping PostgreSQL..."
	@cd $(POSTGRES_PATH) && docker-compose down
	@echo "✓ All services stopped"

restart: down up ## Restart all services

# Individual Services
postgres: network ## Start only PostgreSQL
	@cd $(POSTGRES_PATH) && docker-compose up -d
	@echo "✓ PostgreSQL started on port 5432"

kratos: network postgres ## Start only Kratos services (requires postgres)
	@cd $(KRATOS_PATH) && docker-compose up -d
	@echo "✓ Kratos services started"

keto: network postgres ## Start only Keto services (requires postgres)
	@cd $(KETO_PATH) && docker-compose up -d
	@echo "✓ Keto services started"

oathkeeper: network kratos keto ## Start Oathkeeper (requires kratos + keto)
	@cd $(OATHKEEPER_PATH) && docker-compose up -d
	@echo "✓ Oathkeeper started"

demo: network ## Start multi-tenancy demo as Docker container
	@echo "Starting multi-tenancy demo on port 9000..."
	@cd $(DEMO_PATH) && docker-compose up -d --build
	@echo "✓ Demo started at http://localhost:9000"

demo-logs: ## Show demo logs
	@cd $(DEMO_PATH) && docker-compose logs -f

demo-shell: ## Get shell access to demo container
	@cd $(DEMO_PATH) && docker-compose exec multi-tenancy-demo sh

demo-restart: ## Restart demo container
	@cd $(DEMO_PATH) && docker-compose restart multi-tenancy-demo

# Logs and Monitoring
logs: ## Show logs for all Kratos services
	@cd $(KRATOS_PATH) && docker-compose logs -f

logs-kratos: ## Show logs for Kratos service only
	@cd $(KRATOS_PATH) && docker-compose logs -f kratos

logs-keto: ## Show logs for Keto service only
	@cd $(KETO_PATH) && docker-compose logs -f keto

logs-oathkeeper: ## Show logs for Oathkeeper service only
	@cd $(OATHKEEPER_PATH) && docker-compose logs -f oathkeeper

logs-postgres: ## Show PostgreSQL logs
	@cd $(POSTGRES_PATH) && docker-compose logs -f postgres

# Status and Health
status: ## Show status of all services
	@echo "=== PostgreSQL Status ==="
	@cd $(POSTGRES_PATH) && docker-compose ps
	@echo ""
	@echo "=== Kratos Stack Status ==="
	@cd $(KRATOS_PATH) && docker-compose ps
	@echo ""
	@echo "=== Keto Stack Status ==="
	@cd $(KETO_PATH) && docker-compose ps 2>/dev/null || echo "Keto not running"
	@echo ""
	@echo "=== Oathkeeper Status ==="
	@cd $(OATHKEEPER_PATH) && docker-compose ps 2>/dev/null || echo "Oathkeeper not running"
	@echo ""
	@echo "=== Multi-Tenancy Demo Status ==="
	@cd $(DEMO_PATH) && docker-compose ps 2>/dev/null || echo "Demo not running"

health: ## Check service health
	@echo "Checking service health..."
	@echo ""
	@curl -s http://127.0.0.1:4433/health/ready >/dev/null 2>&1 && echo "✓ Kratos Public API: Ready" || echo "✗ Kratos Public API: Not ready"
	@curl -s http://127.0.0.1:4434/health/ready >/dev/null 2>&1 && echo "✓ Kratos Admin API: Ready" || echo "✗ Kratos Admin API: Not ready"
	@curl -s http://127.0.0.1:4455 >/dev/null 2>&1 && echo "✓ Self-Service UI: Ready" || echo "✗ Self-Service UI: Not ready"
	@curl -s http://localhost:4466/health/ready >/dev/null 2>&1 && echo "✓ Keto Read API: Ready" || echo "✗ Keto Read API: Not ready"
	@curl -s http://localhost:4467/health/ready >/dev/null 2>&1 && echo "✓ Keto Write API: Ready" || echo "✗ Keto Write API: Not ready"
	@curl -s http://localhost:4456/health/ready >/dev/null 2>&1 && echo "✓ Oathkeeper API: Ready" || echo "✗ Oathkeeper API: Not ready"
	@curl -s http://localhost:9000/health >/dev/null 2>&1 && echo "✓ Multi-Tenancy Demo: Ready" || echo "✗ Multi-Tenancy Demo: Not ready"

# Development
reload-kratos: ## Reload Kratos after config changes
	@echo "Reloading Kratos with new configuration..."
	@cd $(KRATOS_PATH) && docker-compose up -d --force-recreate kratos

reload-keto: ## Reload Keto after config changes
	@echo "Reloading Keto with new configuration..."
	@cd $(KETO_PATH) && docker-compose up -d --force-recreate keto

reload-oathkeeper: ## Reload Oathkeeper after config changes
	@echo "Reloading Oathkeeper with new configuration..."
	@cd $(OATHKEEPER_PATH) && docker-compose up -d --force-recreate oathkeeper

migrate: ## Run database migrations manually
	@echo "Running Kratos migrations..."
	@cd $(KRATOS_PATH) && docker-compose up kratos-migrate
	@echo "Running Keto migrations..."
	@cd $(KETO_PATH) && docker-compose up keto-migrate

shell-kratos: ## Get shell access to Kratos container
	@cd $(KRATOS_PATH) && docker-compose exec kratos sh

shell-keto: ## Get shell access to Keto container
	@cd $(KETO_PATH) && docker-compose exec keto sh

shell-postgres: ## Get shell access to PostgreSQL
	@cd $(POSTGRES_PATH) && docker-compose exec postgres psql -U postgres -d kratos

# Cleanup
clean: ## Stop and remove all containers, networks, and volumes
	@echo "Cleaning up all services..."
	@cd $(DEMO_PATH) && docker-compose down -v --remove-orphans 2>/dev/null || true
	@cd $(OATHKEEPER_PATH) && docker-compose down -v --remove-orphans 2>/dev/null || true
	@cd $(KETO_PATH) && docker-compose down -v --remove-orphans 2>/dev/null || true
	@cd $(KRATOS_PATH) && docker-compose down -v --remove-orphans
	@cd $(POSTGRES_PATH) && docker-compose down -v --remove-orphans
	@echo "✓ Cleanup complete"

clean-identities: ## Clean up test Kratos identities
	@./clean-kratos-identities.sh

create-admin: ## Create Kratos admin user (username: admin, email: admin@example.com)
	@echo "Creating admin user..."
	@curl -X POST http://127.0.0.1:4434/admin/identities \
		-H "Content-Type: application/json" \
		-d '{ \
			"schema_id": "default", \
			"traits": { \
				"email": "admin@example.com", \
				"name": { \
					"first": "Admin", \
					"last": "User" \
				}, \
				"tenant_ids": ["tenant-a", "tenant-b", "tenant-c"] \
			}, \
			"credentials": { \
				"password": { \
					"config": { \
						"password": "admin" \
					} \
				} \
			} \
		}' | jq '.' 2>/dev/null || echo "Failed to create admin user. Is Kratos running?"
	@echo ""
	@echo "✓ Admin user created:"
	@echo "  Email:    admin@example.com"
	@echo "  Password: admin"
	@echo "  Tenants:  tenant-a, tenant-b, tenant-c"

reset: clean network up ## Full reset: clean everything and start fresh

# Development URLs
urls: ## Show all service URLs
	@echo ""
	@echo "=== Ory Stack Service URLs ==="
	@echo ""
	@echo "Kratos:"
	@echo "  Self-Service UI:    http://127.0.0.1:4455"
	@echo "  Public API:         http://127.0.0.1:4433"
	@echo "  Admin API:          http://127.0.0.1:4434"
	@echo ""
	@echo "Keto:"
	@echo "  Read API:           http://localhost:4466"
	@echo "  Write API:          http://localhost:4467"
	@echo ""
	@echo "Oathkeeper:"
	@echo "  Proxy:              http://localhost:4455 (port conflict with Kratos UI)"
	@echo "  API:                http://localhost:4456"
	@echo ""
	@echo "Supporting Services:"
	@echo "  Mailslurper:        http://127.0.0.1:4436"
	@echo "  PostgreSQL:         localhost:5432 (postgres/postgres)"
	@echo "  Multi-Tenancy Demo: http://localhost:9000"
	@echo ""

# Quick development workflows
dev: up urls health ## Start development environment and show URLs

quick-test: ## Quick test of all services
	@echo "Testing service health..."
	@echo ""
	@curl -s http://127.0.0.1:4433/health/ready | jq . 2>/dev/null || echo "✗ Kratos Public API not responding"
	@curl -s http://127.0.0.1:4434/health/ready | jq . 2>/dev/null || echo "✗ Kratos Admin API not responding"
	@curl -s http://localhost:4466/health/ready | jq . 2>/dev/null || echo "✗ Keto Read API not responding"
	@curl -s http://localhost:4467/health/ready | jq . 2>/dev/null || echo "✗ Keto Write API not responding"
