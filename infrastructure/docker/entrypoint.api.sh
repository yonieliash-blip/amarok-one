#!/bin/sh
set -e

cd /app

echo "Running database migrations..."
prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting API server..."
exec node dist/index.js
