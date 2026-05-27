#!/bin/sh
set -e

echo "[database] Generating Prisma client..."
pnpm --filter database generate

echo "[database] Applying migrations..."
pnpm --filter database migrate:deploy

echo "[database] Running starter seed..."
pnpm --filter database seed

echo "[database] Init complete."
