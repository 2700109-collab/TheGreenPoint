-- NCTS Post-Migration: Row-Level Security + Audit Immutability
-- Run after Prisma migrations to enforce multi-tenant isolation and audit integrity
-- ===========================================================================

-- ============================================================================
-- 1. Enable Row-Level Security on all tenant-scoped tables
-- ============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. RLS Policies — Operator isolation (tenant sees own data only)
-- ============================================================================
-- The app sets: SET LOCAL app.current_tenant = '<tenant_uuid>' per transaction
-- The app sets: SET LOCAL app.current_role = '<role>' per transaction

-- Tenant table: operators see own row, regulators see all
CREATE POLICY tenant_isolation_select ON tenants
  FOR SELECT USING (
    id = current_setting('app.current_tenant', true)::uuid
    OR current_setting('app.current_role', true) IN ('regulator', 'inspector', 'admin')
  );

CREATE POLICY tenant_isolation_modify ON tenants
  FOR ALL USING (
    id = current_setting('app.current_tenant', true)::uuid
  );

-- Generic tenant isolation policy macro for standard tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'permits', 'facilities', 'zones', 'plants',
      'batches', 'harvests', 'lab_results', 'transfers', 'sales'
    ])
  LOOP
    -- Operators: SELECT own tenant's data only
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (
        tenant_id = current_setting(''app.current_tenant'', true)::uuid
        OR current_setting(''app.current_role'', true) IN (''regulator'', ''inspector'', ''admin'')
      )', tbl || '_isolation_select', tbl
    );

    -- Operators: INSERT/UPDATE/DELETE own tenant's data only
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (
        tenant_id = current_setting(''app.current_tenant'', true)::uuid
      )', tbl || '_isolation_modify', tbl
    );
  END LOOP;
END
$$;

-- Transfer items: join through transfer to check tenant
CREATE POLICY transfer_items_isolation_select ON transfer_items
  FOR SELECT USING (
    transfer_id IN (
      SELECT id FROM transfers
      WHERE tenant_id = current_setting('app.current_tenant', true)::uuid
    )
    OR current_setting('app.current_role', true) IN ('regulator', 'inspector', 'admin')
  );

CREATE POLICY transfer_items_isolation_modify ON transfer_items
  FOR ALL USING (
    transfer_id IN (
      SELECT id FROM transfers
      WHERE tenant_id = current_setting('app.current_tenant', true)::uuid
    )
  );

-- ============================================================================
-- 3. Audit table immutability — prevent UPDATE and DELETE
-- ============================================================================

-- Audit events: anyone can SELECT and INSERT, but no UPDATE or DELETE
CREATE POLICY audit_events_select ON audit_events
  FOR SELECT USING (true);

CREATE POLICY audit_events_insert ON audit_events
  FOR INSERT WITH CHECK (true);

-- Revoke UPDATE and DELETE from app_user on audit_events
REVOKE UPDATE, DELETE ON audit_events FROM app_user;

-- Grant only INSERT to audit_writer role
GRANT INSERT ON audit_events TO audit_writer;
GRANT SELECT ON audit_events TO audit_writer;
REVOKE UPDATE, DELETE ON audit_events FROM audit_writer;

-- ============================================================================
-- 4. Strains table — public read access (reference data)
-- ============================================================================

ALTER TABLE strains ENABLE ROW LEVEL SECURITY;

CREATE POLICY strains_public_read ON strains
  FOR SELECT USING (true);

CREATE POLICY strains_admin_modify ON strains
  FOR ALL USING (
    current_setting('app.current_role', true) IN ('regulator', 'admin')
  );

-- ============================================================================
-- 5. PostGIS spatial index on facility boundaries
-- ============================================================================
-- Add a geometry column for PostGIS spatial queries (Prisma stores as JSON)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facilities' AND column_name = 'boundary_geom'
  ) THEN
    ALTER TABLE facilities ADD COLUMN boundary_geom geometry(Polygon, 4326);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_facilities_boundary_geom
  ON facilities USING GIST (boundary_geom);

CREATE INDEX IF NOT EXISTS idx_facilities_location
  ON facilities USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
  );

-- ============================================================================
-- 6. Trigger: sync JSON boundary → PostGIS geometry on INSERT/UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_facility_boundary() RETURNS trigger AS $$
BEGIN
  IF NEW.boundary IS NOT NULL THEN
    NEW.boundary_geom := ST_SetSRID(
      ST_GeomFromGeoJSON(NEW.boundary::text),
      4326
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_facility_boundary ON facilities;
CREATE TRIGGER trg_sync_facility_boundary
  BEFORE INSERT OR UPDATE OF boundary ON facilities
  FOR EACH ROW
  EXECUTE FUNCTION sync_facility_boundary();

-- ============================================================================
-- 7. Trigger: prevent audit event hash tampering
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_audit_modification() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable — UPDATE and DELETE are prohibited';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_update ON audit_events;
CREATE TRIGGER trg_prevent_audit_update
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_modification();

-- ============================================================================
-- 8. Helper function: validate GPS within South Africa bounds
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_sa_coordinates(lat FLOAT, lng FLOAT)
RETURNS BOOLEAN AS $$
BEGIN
  -- South Africa approximate bounding box
  -- Latitude: -35.0 to -22.0
  -- Longitude: 16.0 to 33.0
  RETURN lat BETWEEN -35.0 AND -22.0
     AND lng BETWEEN 16.0 AND 33.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 9. Check constraint: facilities must be within South Africa
-- ============================================================================

ALTER TABLE facilities DROP CONSTRAINT IF EXISTS chk_facility_within_sa;
ALTER TABLE facilities ADD CONSTRAINT chk_facility_within_sa
  CHECK (validate_sa_coordinates(latitude, longitude));
