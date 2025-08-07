#!/bin/bash
# Run database migrations after initialization

set -e

echo "Running database migrations..."

# Wait for PostgreSQL to be ready
until pg_isready -h localhost -p 5432 -U postgres; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done

# Run initial schema migration
if [ -f "/docker-entrypoint-initdb.d/migrations/001_initial_schema.sql" ]; then
    echo "Running initial schema migration..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" < /docker-entrypoint-initdb.d/migrations/001_initial_schema.sql
fi

# Run performance indexes migration
if [ -f "/docker-entrypoint-initdb.d/migrations/002_performance_indexes.sql" ]; then
    echo "Running performance indexes migration..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" < /docker-entrypoint-initdb.d/migrations/002_performance_indexes.sql
fi

echo "Database migrations completed successfully!"