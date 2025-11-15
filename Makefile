.PHONY: help setup start stop restart logs clean build test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Setup OSRM data (first time only)
	./docker/setup-osrm.sh

start: ## Start all services
	docker-compose up -d

stop: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## View logs (all services)
	docker-compose logs -f

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

logs-osrm: ## View OSRM logs
	docker-compose logs -f osrm

clean: ## Stop services and remove volumes
	docker-compose down -v

clean-all: clean ## Clean everything including OSRM data
	rm -rf osrm-data/

build: ## Build frontend image
	docker-compose build frontend

build-no-cache: ## Build frontend image without cache
	docker-compose build --no-cache frontend

ps: ## Show running containers
	docker-compose ps

stats: ## Show container resource usage
	docker stats

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend sh

shell-osrm: ## Open shell in OSRM container
	docker-compose exec osrm sh

test-osrm: ## Test OSRM routing
	@echo "Testing OSRM routing..."
	@curl -s "http://localhost:5000/route/v1/driving/85.3240,27.7172;85.4240,27.8172?overview=false" | jq .

test-frontend: ## Test frontend health
	@echo "Testing frontend health..."
	@curl -s http://localhost:8080/health

dev: ## Start development mode (local npm)
	npm run dev

install: ## Install npm dependencies
	npm install

typecheck: ## Run TypeScript type checking
	npm run typecheck

prod: ## Start with production configuration
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-build: ## Build for production
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
