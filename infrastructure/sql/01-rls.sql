-- NCTS Post-Migration: Row-Level Security + Audit Immutability  (Neon-compatible)
-- Run after Prisma migrations to enforce multi-tenant isolation and audit integrity
-- ===========================================================================
-- Adapted for Neon: The app connects as neondb_owner (table owner).
-- PostgreSQL SKIPS RLS for table owners by default, so we must use
-- FORCE ROW LEVEL SECURITY on every table. The app uses set_config()
-- within transactions to set app.current_tenant / app.current_role.
-- ===========================================================================

-- ============================================================================
-- 1. Enable + FORCE Row-Level Security on all tenant-scoped tables
--    FORCE is required because neondb_owner is the table owner and would
--    otherwise bypass all RLS policies silently.
-- ============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits FORCE ROW LEVEL SECURITY;

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities FORCE ROW LEVEL SECURITY;

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones FORCE ROW LEVEL SECURITY;

ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants FORCE ROW LEVEL SECURITY;

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches FORCE ROW LEVEL SECURITY;

ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvests FORCE ROW LEVEL SECURITY;

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results FORCE ROW LEVEL SECURITY;

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers FORCE ROW LEVEL SECURITY;

ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items FORCE ROW LEVEL SECURITY;

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. RLS Policies — Operator isolation (tenant sees own data only)
-- ============================================================================
-- The app calls: SELECT set_config('app.current_tenant', $1, true) per tx
-- The app calls: SELECT set_config('app.current_role', $1, true) per tx

-- Tenant table: operators see own row, regulators see all
DROP POLICY IF EXISTS tenant_isolation_select ON tenants;
CREATE POLICY tenant_isolation_select ON tenants
  FOR SELECT USING (
    id = current_setting('app.current_tenant', true)::uuid
    OR current_setting('app.current_role', true) IN ('regulator', 'inspector', 'admin')
  );

DROP POLICY IF EXISTS tenant_isolation_modify ON tenants;
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
      'batches', 'harvests', 'lab_results', 'sales'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_isolation_select', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_isolation_modify', tbl);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (
        tenant_id = current_setting(''app.current_tenant'', true)::uuid
        OR current_setting(''app.current_role'', true) IN (''regulator'', ''inspector'', ''admin'')
      )', tbl || '_isolation_select', tbl
    );

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (
        tenant_id = current_setting(''app.current_tenant'', true)::uuid
      )', tbl || '_isolation_modify', tbl
    );
  END LOOP;
END
$$;

-- FIX (H4): Transfers — receiver tenant can also see inbound transfers
DROP POLICY IF EXISTS transfers_isolation_select ON transfers;
CREATE POLICY transfers_isolation_select ON transfers
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    OR receiver_tenant_id = current_setting('app.current_tenant', true)::uuid
    OR current_setting('app.current_role', true) IN ('regulator', 'inspector', 'admin')
  );

DROP POLICY IF EXISTS transfers_isolation_modify ON transfers;
CREATE POLICY transfers_isolation_modify ON transfers
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
  );

-- Transfer items: join through transfer to check tenant (includes receiver)
DROP POLICY IF EXISTS transfer_items_isolation_select ON transfer_items;
CREATE POLICY transfer_items_isolation_select ON transfer_items
  FOR SELECT USING (
    transfer_id IN (
      SELECT id FROM transfers
      WHERE tenant_id = current_setting('app.current_tenant', true)::uuid
         OR receiver_tenant_id = current_setting('app.current_tenant', true)::uuid
    )
    OR current_setting('app.current_role', true) IN ('regulator', 'inspector', 'admin')
  );

DROP POLICY IF EXISTS transfer_items_isolation_modify ON transfer_items;
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

DROP POLICY IF EXISTS audit_events_select ON audit_events;
CREATE POLICY audit_events_select ON audit_events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS audit_events_insert ON audit_events;
CREATE POLICY audit_events_insert ON audit_events
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 4. Strains table — public read access (reference data)
-- ============================================================================

ALTER TABLE strains ENABLE ROW LEVEL SECURITY;
ALTER TABLE strains FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS strains_public_read ON strains;
CREATE POLICY strains_public_read ON strains
  FOR SELECT USING (true);

DROP POLICY IF EXISTS strains_admin_modify ON strains;
CREATE POLICY strains_admin_modify ON strains
  FOR ALL USING (
    current_setting('app.current_role', true) IN ('regulator', 'admin')
  );

-- ============================================================================
-- 5. PostGIS spatial index on facility boundaries (graceful if no PostGIS)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'facilities' AND column_name = 'boundary_geom'
    ) THEN
      ALTER TABLE facilities ADD COLUMN boundary_geom geometry(Polygon, 4326);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_facilities_boundary_geom
      ON facilities USING GIST (boundary_geom);

    CREATE INDEX IF NOT EXISTS idx_facilities_location
      ON facilities USING GIST (
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
      );

    CREATE OR REPLACE FUNCTION sync_facility_boundary() RETURNS trigger AS $fn$
    BEGIN
      IF NEW.boundary IS NOT NULL THEN
        NEW.boundary_geom := ST_SetSRID(
          ST_GeomFromGeoJSON(NEW.boundary::text),
          4326
        );
      END IF;
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_sync_facility_boundary ON facilities;
    CREATE TRIGGER trg_sync_facility_boundary
      BEFORE INSERT OR UPDATE OF boundary ON facilities
      FOR EACH ROW
      EXECUTE FUNCTION sync_facility_boundary();

    RAISE NOTICE '✅ PostGIS spatial indexes and triggers created';
  ELSE
    RAISE NOTICE '⚠️  PostGIS not available — skipping spatial indexes';
  END IF;
END
$$;

-- ============================================================================
-- 6. Trigger: prevent audit event hash tampering
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
-- 7. Helper function: validate GPS within South Africa bounds
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_sa_coordinates(lat FLOAT, lng FLOAT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN lat BETWEEN -35.0 AND -22.0
     AND lng BETWEEN 16.0 AND 33.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 8. Check constraint: facilities must be within South Africa
-- ============================================================================

ALTER TABLE facilities DROP CONSTRAINT IF EXISTS chk_facility_within_sa;
ALTER TABLE facilities ADD CONSTRAINT chk_facility_within_sa
  CHECK (validate_sa_coordinates(latitude, longitude));

-- ============================================================================
-- 9. Enable + FORCE RLS on all Section 0.2 tables
-- ============================================================================

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections FORCE ROW LEVEL SECURITY;

ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules FORCE ROW LEVEL SECURITY;

ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts FORCE ROW LEVEL SECURITY;

ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_snapshots FORCE ROW LEVEL SECURITY;

ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;

ALTER TABLE destruction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE destruction_events FORCE ROW LEVEL SECURITY;

ALTER TABLE suspicious_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_reports FORCE ROW LEVEL SECURITY;

ALTER TABLE excise_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE excise_rates FORCE ROW LEVEL SECURITY;

ALTER TABLE excise_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE excise_ledger FORCE ROW LEVEL SECURITY;

ALTER TABLE import_export_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_export_records FORCE ROW LEVEL SECURITY;

ALTER TABLE planting_intentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE planting_intentions FORCE ROW LEVEL SECURITY;

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents FORCE ROW LEVEL SECURITY;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE patient_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_access FORCE ROW LEVEL SECURITY;

ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes FORCE ROW LEVEL SECURITY;

ALTER TABLE regulatory_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_reports FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. RLS Policies for new tenant-scoped tables
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'inspections', 'compliance_alerts', 'inventory_snapshots',
      'destruction_events', 'excise_ledger', 'import_export_records',
      'planting_intentions', 'regulatory_reports'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_isolation_select', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_isolation_modify', tbl);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (
        tenant_id = current_setting(''app.current_tenant'', true)::uuid
        OR current_setting(''app.current_role'', true) IN (''regulator'', ''inspector'', ''admin'')
      )', tbl || '_isolation_select', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (
        tenant_id = current_setting(''app.current_tenant'', true)::uuid
      )', tbl || '_isolation_modify', tbl
    );
  END LOOP;
END
$$;

-- Compliance rules: public read (reference data), admin-only modify
DROP POLICY IF EXISTS compliance_rules_public_read ON compliance_rules;
CREATE POLICY compliance_rules_public_read ON compliance_rules
  FOR SELECT USING (true);
DROP POLICY IF EXISTS compliance_rules_admin_modify ON compliance_rules;
CREATE POLICY compliance_rules_admin_modify ON compliance_rules
  FOR ALL USING (
    current_setting('app.current_role', true) IN ('regulator', 'admin')
  );

-- Excise rates: public read (reference data), admin-only modify
DROP POLICY IF EXISTS excise_rates_public_read ON excise_rates;
CREATE POLICY excise_rates_public_read ON excise_rates
  FOR SELECT USING (true);
DROP POLICY IF EXISTS excise_rates_admin_modify ON excise_rates;
CREATE POLICY excise_rates_admin_modify ON excise_rates
  FOR ALL USING (
    current_setting('app.current_role', true) IN ('regulator', 'admin')
  );

-- Outbox events: system-level, no tenant scoping
DROP POLICY IF EXISTS outbox_events_all ON outbox_events;
CREATE POLICY outbox_events_all ON outbox_events
  FOR ALL USING (true);

-- Suspicious reports: regulators/inspectors see all, public can insert
DROP POLICY IF EXISTS suspicious_reports_select ON suspicious_reports;
CREATE POLICY suspicious_reports_select ON suspicious_reports
  FOR SELECT USING (
    current_setting('app.current_role', true) IN ('regulator', 'inspector', 'admin')
  );
DROP POLICY IF EXISTS suspicious_reports_insert ON suspicious_reports;
CREATE POLICY suspicious_reports_insert ON suspicious_reports
  FOR INSERT WITH CHECK (true);

-- Consents: user sees own, admin sees all
DROP POLICY IF EXISTS consents_select ON consents;
CREATE POLICY consents_select ON consents
  FOR SELECT USING (
    user_id = current_setting('app.current_user', true)::uuid
    OR current_setting('app.current_role', true) IN ('regulator', 'admin')
  );
DROP POLICY IF EXISTS consents_modify ON consents;
CREATE POLICY consents_modify ON consents
  FOR ALL USING (
    user_id = current_setting('app.current_user', true)::uuid
  );

-- FIX (H2): Notifications — system can INSERT for any user, but only owner can UPDATE/DELETE
DROP POLICY IF EXISTS notifications_select ON notifications;
CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (
    user_id = current_setting('app.current_user', true)::uuid
    OR current_setting('app.current_role', true) IN ('admin')
  );
DROP POLICY IF EXISTS notifications_insert ON notifications;
CREATE POLICY notifications_insert ON notifications
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS notifications_modify ON notifications;
CREATE POLICY notifications_modify ON notifications
  FOR UPDATE USING (
    user_id = current_setting('app.current_user', true)::uuid
    OR current_setting('app.current_role', true) IN ('admin')
  );
DROP POLICY IF EXISTS notifications_delete ON notifications;
CREATE POLICY notifications_delete ON notifications
  FOR DELETE USING (
    current_setting('app.current_role', true) IN ('admin')
  );

-- Patient access: restricted to regulators and dispensing facilities
DROP POLICY IF EXISTS patient_access_select ON patient_access;
CREATE POLICY patient_access_select ON patient_access
  FOR SELECT USING (
    current_setting('app.current_role', true) IN ('regulator', 'inspector', 'admin')
  );
DROP POLICY IF EXISTS patient_access_insert ON patient_access;
CREATE POLICY patient_access_insert ON patient_access
  FOR INSERT WITH CHECK (true);

-- Verification logs: public insert, regulators + tenant can read
DROP POLICY IF EXISTS verification_logs_select ON verification_logs;
CREATE POLICY verification_logs_select ON verification_logs
  FOR SELECT USING (
    current_setting('app.current_role', true) IN ('regulator', 'inspector', 'admin')
    OR tenant_id = current_setting('app.current_tenant', true)::uuid
  );
DROP POLICY IF EXISTS verification_logs_insert ON verification_logs;
CREATE POLICY verification_logs_insert ON verification_logs
  FOR INSERT WITH CHECK (true);

-- QR codes: tenant-scoped
DROP POLICY IF EXISTS qr_codes_isolation_select ON qr_codes;
CREATE POLICY qr_codes_isolation_select ON qr_codes
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    OR current_setting('app.current_role', true) IN ('regulator', 'inspector', 'admin')
  );
DROP POLICY IF EXISTS qr_codes_isolation_modify ON qr_codes;
CREATE POLICY qr_codes_isolation_modify ON qr_codes
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
  );
