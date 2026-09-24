.DEFAULT_GOAL := help

# Database settings (MYSQL_*) shared with docker compose.
-include .env

db_connection = Server=127.0.0.1;Port=$(MYSQL_PORT);Database=$(1);User=$(MYSQL_USER);Password=$(MYSQL_PASSWORD)

.PHONY: help build test db-up db-down db-logs db-shell db-reset db-clear db-seed \
        backend-build backend-test backend-run db-migrate db-migration \
        user-list user-grant-role user-revoke-role user-reset-password \
        frontend-install frontend-build frontend-test frontend-run \
        prod-cert prod-build prod-up prod-down prod-logs prod-command prod-seed

help: ## List available commands
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

build: backend-build frontend-build ## Build all components

test: backend-test frontend-test ## Run all tests

# --- Backend -----------------------------------------------------------------

BACKEND_DIR := backend
BACKEND_API := $(BACKEND_DIR)/src/RevisionPlatform.Api

backend-build: ## Build the backend
	dotnet build $(BACKEND_DIR)

backend-test: export TEST_DATABASE_CONNECTION := $(call db_connection,$(MYSQL_DATABASE)_test)
backend-test: ## Run the backend tests (uses the test database)
	dotnet test $(BACKEND_DIR)

backend-run: export ConnectionStrings__Default := $(call db_connection,$(MYSQL_DATABASE))
backend-run: ## Run the backend API with hot reload (http://localhost:5044)
	dotnet watch --project $(BACKEND_API) run

db-migrate: export ConnectionStrings__Default := $(call db_connection,$(MYSQL_DATABASE))
db-migrate: ## Apply EF Core migrations to the development database
	cd $(BACKEND_DIR) && dotnet tool restore && dotnet ef database update --project src/RevisionPlatform.Api

db-migration: export ConnectionStrings__Default := $(call db_connection,$(MYSQL_DATABASE))
db-migration: ## Create an EF Core migration: make db-migration NAME=AddSomething
	@test -n "$(NAME)" || (echo "Usage: make db-migration NAME=AddSomething" && exit 1)
	cd $(BACKEND_DIR) && dotnet tool restore && dotnet ef migrations add $(NAME) --project src/RevisionPlatform.Api --output-dir Data/Migrations

# --- Users (commands run by the backend on the development database) ---------

# Without the launch profile: the command does not need its URLs or environment.
user_command = dotnet run --project $(BACKEND_API) --no-launch-profile -- users

user-list: export ConnectionStrings__Default := $(call db_connection,$(MYSQL_DATABASE))
user-list: ## List the users and their roles
	@$(user_command) list

user-grant-role: export ConnectionStrings__Default := $(call db_connection,$(MYSQL_DATABASE))
user-grant-role: ## Give a role to a user: make user-grant-role EMAIL=ada@example.com ROLE=admin
	@test -n "$(EMAIL)" -a -n "$(ROLE)" || (echo "Usage: make user-grant-role EMAIL=ada@example.com ROLE=admin" && exit 1)
	@$(user_command) grant-role "$(EMAIL)" "$(ROLE)"

user-revoke-role: export ConnectionStrings__Default := $(call db_connection,$(MYSQL_DATABASE))
user-revoke-role: ## Remove a role from a user: make user-revoke-role EMAIL=ada@example.com ROLE=admin
	@test -n "$(EMAIL)" -a -n "$(ROLE)" || (echo "Usage: make user-revoke-role EMAIL=ada@example.com ROLE=admin" && exit 1)
	@$(user_command) revoke-role "$(EMAIL)" "$(ROLE)"

user-reset-password: export ConnectionStrings__Default := $(call db_connection,$(MYSQL_DATABASE))
user-reset-password: ## Give a user a temporary password: make user-reset-password EMAIL=ada@example.com
	@test -n "$(EMAIL)" || (echo "Usage: make user-reset-password EMAIL=ada@example.com" && exit 1)
	@$(user_command) reset-password "$(EMAIL)"

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

db-clear: ## DELETE all activities, modules and themes (the tables and the users are kept)
	docker compose exec -T db sh -c 'mysql -u"$$MYSQL_USER" -p"$$MYSQL_PASSWORD" "$$MYSQL_DATABASE" -e "DELETE FROM revision_activities; DELETE FROM themes;"'

db-seed: export ConnectionStrings__Default := $(call db_connection,$(MYSQL_DATABASE))
db-seed: ## Create the seed activities, or some of them: make db-seed FILES='csharp-*.json'
	@dotnet run --project $(BACKEND_API) --no-launch-profile -- seed "$(CURDIR)/seed/activities" $(if $(FILES),"$(FILES)")

# --- Production (the whole application in Docker, see compose.prod.yaml) -------

PROD_ENV := .env.production
PROD_COMPOSE = docker compose --env-file $(PROD_ENV) -f compose.prod.yaml
prod_env_check = @test -f $(PROD_ENV) || (echo "Create $(PROD_ENV) from .env.production.example first." && exit 1)

prod-cert: ## Create a self-signed HTTPS certificate in certs/ (for trying production locally)
	@mkdir -p certs
	openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=localhost" \
		-addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
		-keyout certs/privkey.pem -out certs/fullchain.pem

prod-build: ## Build the production images of the backend and the frontend
	$(prod_env_check)
	$(PROD_COMPOSE) build

prod-up: ## Build and start production (migrates the database), https://localhost:8443 by default
	$(prod_env_check)
	$(PROD_COMPOSE) up -d --build --wait

prod-down: ## Stop production (data is kept)
	$(prod_env_check)
	$(PROD_COMPOSE) down

prod-logs: ## Follow the production logs
	$(prod_env_check)
	$(PROD_COMPOSE) logs -f

prod-command: ## Run a backend command in production: make prod-command CMD='users list'
	$(prod_env_check)
	@test -n "$(CMD)" || (echo "Usage: make prod-command CMD='users list'" && exit 1)
	$(PROD_COMPOSE) run --rm --no-deps backend $(CMD)

prod-seed: ## Create the seed activities in production, or some of them: make prod-seed FILES='csharp-*.json'
	$(prod_env_check)
	$(PROD_COMPOSE) run --rm --no-deps -v "$(CURDIR)/seed/activities:/seed:ro" backend seed /seed $(if $(FILES),"$(FILES)")
