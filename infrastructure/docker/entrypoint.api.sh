#!/bin/sh
set -e

cd /app/apps/api

echo "Running database migrations..."
node ../../node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

echo "Starting API server..."
exec node dist/index.js
