-- Interactive Learning Platform - Database Initialization
-- This script runs after PostgreSQL container startup

-- Create the main database if it doesn't exist
SELECT 'CREATE DATABASE interactive_learning'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'interactive_learning');

-- Connect to the main database
\c interactive_learning;

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create a development user with appropriate permissions
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'dev_user') THEN

      CREATE ROLE dev_user LOGIN PASSWORD 'dev_password';
   END IF;
END
$do$;

-- Grant permissions to dev_user
GRANT CONNECT ON DATABASE interactive_learning TO dev_user;
GRANT USAGE ON SCHEMA public TO dev_user;
GRANT CREATE ON SCHEMA public TO dev_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dev_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dev_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO dev_user;

-- Log successful initialization
SELECT 'Database initialized successfully' AS status;