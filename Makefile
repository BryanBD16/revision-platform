.DEFAULT_GOAL := help

.PHONY: help db-up db-down db-logs db-shell db-reset

help: ## List available commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-12s %s\n", $$1, $$2}'

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
