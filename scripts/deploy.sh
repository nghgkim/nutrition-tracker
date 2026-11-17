#!/usr/bin/env bash
# Deploy/redeploy with fixed named-tunnel URL: https://nutrition.nghgkim.id.vn
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
echo "Rebuilding app image..."
docker compose -f docker-compose.prod.yml build app
echo "Starting all services (named tunnel)..."
docker compose -f docker-compose.prod.yml -f docker-compose.named-tunnel.yml up -d
echo "Waiting for health..."
sleep 12
docker compose -f docker-compose.prod.yml -f docker-compose.named-tunnel.yml ps --format '{{.Name}} {{.Status}}'
echo "Verifying URL..."
curl -s -o /dev/null -w "https://nutrition.nghgkim.id.vn/login -> HTTP %{http_code}\n" https://nutrition.nghgkim.id.vn/login
