#!/bin/sh
set -e

# Run database migrations
echo "Running database migrations..."
node dist/src/db/migrate.js

# Generate Admin User
echo "Generating Admin User..."
node dist/src/generateAdminToken.js

# Pass the command
exec "$@"
