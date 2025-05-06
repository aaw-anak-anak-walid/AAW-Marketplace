#!/bin/sh
set -e

# Run database migrations
echo "Running database migrations..."
node dist/src/db/migrate.js

# Pass the command
exec "$@"
