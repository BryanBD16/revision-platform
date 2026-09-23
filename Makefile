.DEFAULT_GOAL := help

.PHONY: help build test db-up db-down db-logs db-shell db-reset \
        backend-build backend-test backend-run \
        frontend-install frontend-build frontend-test frontend-run

help: ## List available commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-17s %s\n", $$1, $$2}'

build: backend-build frontend-build ## Build all components

test: backend-test frontend-test ## Run all tests

# --- Backend -----------------------------------------------------------------

BACKEND_DIR := backend
BACKEND_API := $(BACKEND_DIR)/src/RevisionPlatform.Api

backend-build: ## Build the backend
	dotnet build $(BACKEND_DIR)

backend-test: ## Run the backend tests
	dotnet test $(BACKEND_DIR)

backend-run: ## Run the backend API with hot reload (http://localhost:5044)
	dotnet watch --project $(BACKEND_API) run

# --- Frontend ----------------------------------------------------------------

FRONTEND_DIR := frontend

frontend-install: ## Install frontend dependencies from the lock file
	npm --prefix $(FRONTEND_DIR) ci

frontend-build: ## Build the frontend
	npm --prefix $(FRONTEND_DIR) run build

frontend-test: ## Run the frontend tests once
	npm --prefix $(FRONTEND_DIR) test -- --watch=false

frontend-run: ## Run the frontend dev server (http://localhost:4200, /api proxied)
	npm --prefix $(FRONTEND_DIR) start

# --- Database (Docker) -------------------------------------------------------

db-up: ## Start the MySQL container and wait until it is healthy
	docker compose up -d --wait db

db-down: ## Stop the MySQL container (data is kept)
	docker compose down

db-logs: ## Follow the MySQL container logs
	docker compose logs -f db

db-shell: ## Open a MySQL prompt as the application user
	docker compose exec db sh -c 'mysql -u"$$MYSQL_USER" -p"$$MYSQL_PASSWORD" "$$MYSQL_DATABASE"'

db-reset: ## Stop the MySQL container and DELETE all its data
	docker compose down --volumes
