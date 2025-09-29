# Makefile for Ory Kratos Self-Hosted Setup

# Define paths relative to ory-self-hosted root
POSTGRES_PATH = ../postgres
KRATOS_PATH = .

.PHONY: help up down restart logs status clean postgres kratos ui mail migrate shell

# Default target
help: ## Show this help message
	@echo "Ory Kratos Self-Hosted Management"
	@echo "================================="
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Service Management
up: ## Start all services (postgres + kratos stack)
	@echo "Starting PostgreSQL..."
	@cd $(POSTGRES_PATH) && docker-compose up -d
	@echo "Starting Kratos stack..."
	@docker-compose up -d
	@echo "Services started. Access UI at http://127.0.0.1:4455"

down: ## Stop all services
	@echo "Stopping Kratos stack..."
	@docker-compose down
	@echo "Stopping PostgreSQL..."
	@cd $(POSTGRES_PATH) && docker-compose down

restart: down up ## Restart all services

# Individual Services
postgres: ## Start only PostgreSQL
	@cd $(POSTGRES_PATH) && docker-compose up -d
	@echo "PostgreSQL started on port 5432"

kratos: ## Start only Kratos services (requires postgres)
	@docker-compose up -d
	@echo "Kratos services started"

# Logs and Monitoring
logs: ## Show logs for all Kratos services
	@docker-compose logs -f

logs-kratos: ## Show logs for Kratos service only
	@docker-compose logs -f kratos

logs-ui: ## Show logs for UI service only
	@docker-compose logs -f kratos-selfservice-ui-node

logs-postgres: ## Show PostgreSQL logs
	@cd $(POSTGRES_PATH) && docker-compose logs -f postgres

# Status and Health
status: ## Show status of all services
	@echo "=== Kratos Stack Status ==="
	@docker-compose ps
	@echo ""
	@echo "=== PostgreSQL Status ==="
	@cd $(POSTGRES_PATH) && docker-compose ps

health: ## Check service health
	@echo "Checking service health..."
	@curl -s http://127.0.0.1:4433/health/ready && echo "✓ Kratos Public API: Ready" || echo "✗ Kratos Public API: Not ready"
	@curl -s http://127.0.0.1:4434/health/ready && echo "✓ Kratos Admin API: Ready" || echo "✗ Kratos Admin API: Not ready"
	@curl -s http://127.0.0.1:4455 > /dev/null && echo "✓ Self-Service UI: Ready" || echo "✗ Self-Service UI: Not ready"

# Development
reload-kratos: ## Reload Kratos after config changes
	@echo "Reloading Kratos with new configuration..."
	@docker-compose up -d --force-recreate kratos

migrate: ## Run database migrations manually
	@echo "Running database migrations..."
	@docker-compose up kratos-migrate

shell-kratos: ## Get shell access to Kratos container
	@docker-compose exec kratos sh

shell-postgres: ## Get shell access to PostgreSQL
	@cd $(POSTGRES_PATH) && docker-compose exec postgres psql -U postgres -d kratos

# Cleanup
clean: ## Stop and remove all containers, networks, and volumes
	@echo "Cleaning up Kratos stack..."
	@docker-compose down -v --remove-orphans
	@echo "Cleaning up PostgreSQL..."
	@cd $(POSTGRES_PATH) && docker-compose down -v --remove-orphans
	@echo "Cleanup complete"

reset: clean up ## Full reset: clean everything and start fresh

# Development URLs
urls: ## Show all service URLs
	@echo "Service URLs:"
	@echo "  Self-Service UI:    http://127.0.0.1:4455"
	@echo "  Kratos Public API:  http://127.0.0.1:4433"
	@echo "  Kratos Admin API:   http://127.0.0.1:4434"
	@echo "  Mailslurper:        http://127.0.0.1:4436"
	@echo "  PostgreSQL:         localhost:5432 (postgres/postgres)"

# Quick development workflows
dev: up urls ## Start development environment and show URLs

quick-test: ## Quick test of authentication flow
	@echo "Testing Kratos APIs..."
	@curl -s http://127.0.0.1:4433/health/ready | jq . || echo "Public API not responding"
	@curl -s http://127.0.0.1:4434/health/ready | jq . || echo "Admin API not responding"