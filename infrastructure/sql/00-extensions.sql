-- =============================================================================
-- NCTS: Enable PostgreSQL Extensions (Neon-compatible)
-- =============================================================================
-- Neon supports these extensions natively. No custom roles needed —
-- the app connects as the project owner (neondb_owner) and uses
-- SET LOCAL app.current_tenant / app.current_role for RLS enforcement.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PostGIS for spatial queries (facility boundaries, GPS validation)
-- Neon supports PostGIS on paid plans. If this fails on free tier, spatial
-- features (boundary_geom column, GPS constraint) will be skipped gracefully.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "postgis";
  RAISE NOTICE '✅ PostGIS enabled — version %', PostGIS_Version();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️  PostGIS not available on this Neon plan — spatial features disabled';
END
$$;
