-- NCTS Database Initialization Script
-- Creates roles and enables extensions

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create application roles
DO $$
BEGIN
  -- Application user (RLS enforced)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_user_password';
  END IF;

  -- Audit writer (INSERT only on audit tables)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'audit_writer') THEN
    CREATE ROLE audit_writer LOGIN PASSWORD 'audit_writer_password';
  END IF;

  -- Migration runner (schema changes only)
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin LOGIN PASSWORD 'app_admin_password';
  END IF;
END
$$;

-- Grant basic permissions
GRANT CONNECT ON DATABASE ncts_dev TO app_user, audit_writer, app_admin;
GRANT USAGE ON SCHEMA public TO app_user, audit_writer, app_admin;
GRANT ALL ON SCHEMA public TO app_admin;

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE '✅ NCTS database initialized with PostGIS %, uuid-ossp, pgcrypto', PostGIS_Version();
END
$$;
