-- =============================================================================
-- NCTS Section 0.5: Table Partitioning for Audit Events (Neon-compatible)
-- =============================================================================
-- Partition audit_events by year for performance at scale.
-- Run AFTER seeding (so seed data gets migrated into partitions).
--
-- IDEMPOTENT: Checks if already partitioned before proceeding.
-- PRISMA NOTE: After partitioning, the table has composite PK (id, created_at).
--   Prisma schema declares @id on id alone. This is intentional — Prisma
--   queries by id still work (PostgreSQL scans partitions). The Prisma schema
--   is for code generation; the partitioned table is the runtime truth.
-- =============================================================================

DO $$
BEGIN
  -- Guard: skip if already partitioned
  IF EXISTS (
    SELECT 1 FROM pg_partitioned_table
    WHERE partrelid = 'audit_events'::regclass
  ) THEN
    RAISE NOTICE '✅ audit_events is already partitioned — skipping';
    RETURN;
  END IF;

  -- Step 1: Rename existing (non-partitioned) table
  ALTER TABLE audit_events RENAME TO audit_events_old;

  -- Step 2: Recreate as partitioned table with composite PK
  -- PostgreSQL requires partition key in PRIMARY KEY for partitioned tables
  CREATE TABLE audit_events (
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    sequence_number SERIAL NOT NULL,
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    action          TEXT NOT NULL,
    actor_id        TEXT NOT NULL,
    actor_role      TEXT NOT NULL,
    tenant_id       UUID,
    payload         JSONB NOT NULL,
    previous_hash   TEXT NOT NULL,
    event_hash      TEXT NOT NULL,
    ip_address      TEXT,
    user_agent      TEXT,
    gps_latitude    DOUBLE PRECISION,
    gps_longitude   DOUBLE PRECISION,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
  ) PARTITION BY RANGE (created_at);

  -- Step 3: Create partitions for 2025-2030
  CREATE TABLE audit_events_2025 PARTITION OF audit_events
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

  CREATE TABLE audit_events_2026 PARTITION OF audit_events
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

  CREATE TABLE audit_events_2027 PARTITION OF audit_events
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

  CREATE TABLE audit_events_2028 PARTITION OF audit_events
    FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');

  CREATE TABLE audit_events_2029 PARTITION OF audit_events
    FOR VALUES FROM ('2029-01-01') TO ('2030-01-01');

  CREATE TABLE audit_events_2030 PARTITION OF audit_events
    FOR VALUES FROM ('2030-01-01') TO ('2031-01-01');

  -- Step 4: Recreate indexes
  CREATE UNIQUE INDEX idx_audit_sequence ON audit_events (sequence_number, created_at);
  CREATE INDEX idx_audit_entity ON audit_events (entity_type, entity_id);
  CREATE INDEX idx_audit_actor ON audit_events (actor_id);
  CREATE INDEX idx_audit_tenant ON audit_events (tenant_id);
  CREATE INDEX idx_audit_created ON audit_events (created_at);

  -- Step 5: Migrate existing data
  INSERT INTO audit_events SELECT * FROM audit_events_old;

  -- Step 6: Drop old table
  DROP TABLE audit_events_old;

  -- Step 7: Re-enable + FORCE RLS on partitioned table
  ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

  -- Re-create RLS policies for audit_events
  CREATE POLICY audit_select_own ON audit_events
    FOR SELECT USING (
      tenant_id::text = current_setting('app.current_tenant', true)
      OR current_setting('app.current_role', true) IN ('regulator', 'inspector', 'national_admin', 'admin')
    );

  CREATE POLICY audit_insert ON audit_events
    FOR INSERT WITH CHECK (true);

  -- Step 8: Prevent UPDATE/DELETE on audit (immutability)
  CREATE OR REPLACE FUNCTION prevent_audit_modification()
  RETURNS TRIGGER AS $fn$
  BEGIN
    RAISE EXCEPTION 'Audit events are immutable. UPDATE and DELETE operations are not permitted.';
    RETURN NULL;
  END;
  $fn$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_prevent_audit_update
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

  RAISE NOTICE '✅ audit_events partitioned successfully (2025-2030)';
END
$$;

-- Auto-partition creation function (for future years)
CREATE OR REPLACE FUNCTION create_audit_partition_if_needed()
RETURNS VOID AS $$
DECLARE
  next_year INT := EXTRACT(YEAR FROM NOW())::INT + 1;
  partition_name TEXT;
  start_date TEXT;
  end_date TEXT;
BEGIN
  partition_name := 'audit_events_' || next_year;
  start_date := next_year || '-01-01';
  end_date := (next_year + 1) || '-01-01';
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF audit_events FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    RAISE NOTICE 'Created partition: %', partition_name;
  END IF;
END;
$$ LANGUAGE plpgsql;
