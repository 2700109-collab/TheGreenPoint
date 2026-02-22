-- =============================================================================
-- NCTS Section 0.6: Materialized Views for Dashboard Performance
-- =============================================================================
-- These views pre-compute expensive aggregations for regulatory dashboards.
-- Refresh strategy: every 5 minutes via NestJS cron + on-demand after key events.
-- Neon supports materialized views and REFRESH CONCURRENTLY.
-- =============================================================================

-- =============================================================================
-- View 1: Facility Compliance Summary
-- =============================================================================
-- Used by: Regulatory dashboard, compliance scoring, facility overview
-- Refresh: Every 5 minutes + after compliance alert changes
--
-- FIX (H3): Uses scalar subqueries per facility instead of JOINs at tenant level
-- to avoid inflating transfer/lab counts across facilities of the same tenant.

DROP MATERIALIZED VIEW IF EXISTS mv_facility_compliance_summary;
CREATE MATERIALIZED VIEW mv_facility_compliance_summary AS
SELECT
  f.id AS facility_id,
  f.tenant_id,
  f.name AS facility_name,
  f.facility_type,
  f.province,
  f.is_active,
  -- Plant counts (facility-scoped)
  (SELECT COUNT(*) FROM plants p WHERE p.facility_id = f.id AND p.state NOT IN ('harvested', 'destroyed')) AS active_plant_count,
  (SELECT COUNT(*) FROM plants p WHERE p.facility_id = f.id) AS total_plant_count,
  -- Batch counts (facility-scoped)
  (SELECT COUNT(*) FROM batches b WHERE b.facility_id = f.id) AS total_batch_count,
  -- Transfer counts (facility's tenant — transfers don't have facility_id)
  (SELECT COUNT(*) FROM transfers tr WHERE tr.tenant_id = f.tenant_id AND tr.status = 'in_transit') AS active_transfer_count,
  -- Permit status (facility-scoped)
  (SELECT COUNT(*) FROM permits per WHERE per.facility_id = f.id AND per.status = 'active') AS active_permit_count,
  (SELECT COUNT(*) FROM permits per WHERE per.facility_id = f.id AND per.status = 'active' AND per.expiry_date < NOW() + INTERVAL '30 days') AS expiring_permit_count,
  -- Lab results (facility's tenant — lab results don't have facility_id)
  (SELECT COUNT(*) FROM lab_results lr WHERE lr.tenant_id = f.tenant_id) AS total_lab_results,
  -- FIX (H1): Use 'fail' not 'failed' to match actual data
  (SELECT COUNT(*) FROM lab_results lr WHERE lr.tenant_id = f.tenant_id AND lr.status = 'fail') AS failed_lab_results,
  -- Sales (facility-scoped)
  (SELECT COALESCE(SUM(s.price_zar), 0)::NUMERIC(15,2) FROM sales s WHERE s.facility_id = f.id) AS total_sales_zar,
  -- Last activity
  GREATEST(
    (SELECT MAX(p.created_at) FROM plants p WHERE p.facility_id = f.id),
    (SELECT MAX(b.created_at) FROM batches b WHERE b.facility_id = f.id),
    (SELECT MAX(s.created_at) FROM sales s WHERE s.facility_id = f.id)
  ) AS last_activity_at,
  NOW() AS refreshed_at
FROM facilities f;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_facility_compliance_facility_id
  ON mv_facility_compliance_summary (facility_id);

CREATE INDEX IF NOT EXISTS idx_mv_facility_compliance_tenant
  ON mv_facility_compliance_summary (tenant_id);

CREATE INDEX IF NOT EXISTS idx_mv_facility_compliance_province
  ON mv_facility_compliance_summary (province);

-- =============================================================================
-- View 2: National Statistics
-- =============================================================================
-- Used by: National regulatory dashboard, public statistics API
-- Refresh: Every 5 minutes

DROP MATERIALIZED VIEW IF EXISTS mv_national_statistics;
CREATE MATERIALIZED VIEW mv_national_statistics AS
WITH
  operator_stats AS (
    SELECT
      COUNT(*) AS total_operators,
      COUNT(*) FILTER (WHERE is_active) AS active_operators
    FROM tenants
  ),
  facility_stats AS (
    SELECT
      COUNT(*) AS total_facilities,
      COUNT(*) FILTER (WHERE is_active) AS active_facilities
    FROM facilities
  ),
  plant_stats AS (
    SELECT
      COUNT(*) AS total_plants,
      COUNT(*) FILTER (WHERE state NOT IN ('harvested', 'destroyed')) AS active_plants
    FROM plants
  ),
  permit_stats AS (
    SELECT
      COUNT(*) AS total_permits,
      COUNT(*) FILTER (WHERE status = 'active') AS active_permits,
      COUNT(*) FILTER (WHERE status = 'active' AND expiry_date < NOW() + INTERVAL '30 days') AS expiring_permits_30d
    FROM permits
  ),
  transfer_stats AS (
    SELECT
      COUNT(*) AS total_transfers,
      COUNT(*) FILTER (WHERE status = 'in_transit') AS active_transfers,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_transfers
    FROM transfers
  ),
  sale_stats AS (
    SELECT
      COALESCE(SUM(price_zar), 0)::NUMERIC(15,2) AS total_revenue_zar,
      COUNT(*) AS total_sales
    FROM sales
  ),
  lab_stats AS (
    SELECT
      COUNT(*) AS total_lab_tests,
      -- FIX (H1): Use 'pass'/'fail' to match actual seed data and application values
      COUNT(*) FILTER (WHERE status = 'pass') AS passed_lab_tests,
      COUNT(*) FILTER (WHERE status = 'fail') AS failed_lab_tests
    FROM lab_results
  ),
  province_stats AS (
    SELECT COALESCE(jsonb_object_agg(province, cnt), '{}'::jsonb) AS facilities_by_province
    FROM (
      SELECT province, COUNT(*) AS cnt
      FROM facilities
      WHERE is_active
      GROUP BY province
    ) sub
  )
SELECT
  1 AS id, -- Stable synthetic row ID for CONCURRENTLY refresh
  o.total_operators, o.active_operators,
  f.total_facilities, f.active_facilities,
  p.total_plants, p.active_plants,
  per.total_permits, per.active_permits, per.expiring_permits_30d,
  tr.total_transfers, tr.active_transfers, tr.completed_transfers,
  s.total_revenue_zar, s.total_sales,
  l.total_lab_tests, l.passed_lab_tests, l.failed_lab_tests,
  prov.facilities_by_province,
  NOW() AS refreshed_at
FROM operator_stats o
CROSS JOIN facility_stats f
CROSS JOIN plant_stats p
CROSS JOIN permit_stats per
CROSS JOIN transfer_stats tr
CROSS JOIN sale_stats s
CROSS JOIN lab_stats l
CROSS JOIN province_stats prov;

-- Stable unique index using synthetic ID for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_national_stats_unique
  ON mv_national_statistics (id);

-- =============================================================================
-- View 3: Compliance Alert Summary (per tenant)
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS mv_compliance_alert_summary;
CREATE MATERIALIZED VIEW mv_compliance_alert_summary AS
SELECT
  ca.tenant_id,
  COUNT(*) FILTER (WHERE ca.status = 'open') AS open_alerts,
  COUNT(*) FILTER (WHERE ca.status = 'acknowledged') AS acknowledged_alerts,
  COUNT(*) FILTER (WHERE ca.status = 'investigating') AS investigating_alerts,
  COUNT(*) FILTER (WHERE ca.status = 'resolved') AS resolved_alerts,
  COUNT(*) FILTER (WHERE ca.status = 'escalated') AS escalated_alerts,
  COUNT(*) FILTER (WHERE ca.severity = 'critical' AND ca.status NOT IN ('resolved')) AS critical_unresolved,
  COUNT(*) FILTER (WHERE ca.severity = 'warning' AND ca.status NOT IN ('resolved')) AS warning_unresolved,
  MAX(ca.created_at) AS last_alert_at,
  NOW() AS refreshed_at
FROM compliance_alerts ca
GROUP BY ca.tenant_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_compliance_alert_tenant
  ON mv_compliance_alert_summary (tenant_id);

-- =============================================================================
-- Refresh helper
-- =============================================================================
CREATE OR REPLACE FUNCTION refresh_all_dashboard_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_facility_compliance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_national_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_compliance_alert_summary;
END;
$$ LANGUAGE plpgsql;
