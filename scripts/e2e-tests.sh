#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -p rentstar-e2e -f docker-compose.e2e.yml)

cleanup() {
  "${COMPOSE[@]}" down -v --remove-orphans 2>/dev/null || true
}

trap cleanup EXIT

echo "[e2e] Starting Postgres test container..."
"${COMPOSE[@]}" up -d --wait

export DATABASE_URL="postgresql://postgres:password@localhost:5434/appdb_e2e"
export E2E_DATABASE_URL="$DATABASE_URL"
export JWT_SECRET="e2e-jwt-secret"
export JWT_REFRESH_SECRET="e2e-refresh-secret"
export JWT_EXPIRES_IN="15m"
export JWT_REFRESH_EXPIRES_IN="7d"
export FRONTEND_URL="http://localhost:3000"
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="e2e-test-key"
export AWS_SECRET_ACCESS_KEY="e2e-test-secret"
export AWS_S3_PROPERTIES_BUCKET="e2e-test-bucket"
export AWS_S3_AVATARS_BUCKET="e2e-test-bucket"
export NODE_ENV="test"
export PORT="3001"

echo "[e2e] Generating Prisma client..."
pnpm --filter database generate

echo "[e2e] Applying migrations..."
pnpm --filter database migrate:deploy

echo "[e2e] Running API integration tests..."
pnpm --filter api test:e2e

echo "[e2e] All integration tests passed."
