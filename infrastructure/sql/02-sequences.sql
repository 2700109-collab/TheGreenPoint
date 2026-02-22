-- =============================================================================
-- NCTS Section 0.3: Database Sequences for Atomic ID Generation (Neon-compatible)
-- =============================================================================
-- These sequences replace the non-atomic findFirst(orderBy: desc) + 1 pattern
-- that is vulnerable to duplicate IDs under concurrent requests.
-- Adapted for Neon: removed app_user role grants (not needed — app connects
-- as neondb_owner which owns all objects).
-- =============================================================================

-- Plant tracking IDs: NCTS-ZA-{YYYY}-{000001}
CREATE SEQUENCE IF NOT EXISTS ncts_plant_tracking_seq START WITH 1 INCREMENT BY 1;

-- Transfer numbers: TRF-{YYYY}-{000001}
CREATE SEQUENCE IF NOT EXISTS ncts_transfer_number_seq START WITH 1 INCREMENT BY 1;

-- Sale numbers: SALE-{YYYY}-{000001}
CREATE SEQUENCE IF NOT EXISTS ncts_sale_number_seq START WITH 1 INCREMENT BY 1;

-- Inspection numbers: INS-{YYYY}-{000001}
CREATE SEQUENCE IF NOT EXISTS ncts_inspection_number_seq START WITH 1 INCREMENT BY 1;

-- Batch numbers: BATCH-{YYYY}-{000001}
CREATE SEQUENCE IF NOT EXISTS ncts_batch_number_seq START WITH 1 INCREMENT BY 1;

-- =============================================================================
-- Helper functions for generating formatted tracking IDs
-- =============================================================================

-- Generate plant tracking ID: NCTS-ZA-{YYYY}-{000001}
CREATE OR REPLACE FUNCTION generate_plant_tracking_id()
RETURNS TEXT AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  SELECT nextval('ncts_plant_tracking_seq') INTO seq_val;
  RETURN 'NCTS-ZA-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate transfer number: TRF-{YYYY}-{000001}
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TEXT AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  SELECT nextval('ncts_transfer_number_seq') INTO seq_val;
  RETURN 'TRF-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate sale number: SALE-{YYYY}-{000001}
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TEXT AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  SELECT nextval('ncts_sale_number_seq') INTO seq_val;
  RETURN 'SALE-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate inspection number: INS-{YYYY}-{000001}
CREATE OR REPLACE FUNCTION generate_inspection_number()
RETURNS TEXT AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  SELECT nextval('ncts_inspection_number_seq') INTO seq_val;
  RETURN 'INS-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate batch number: BATCH-{YYYY}-{000001}
CREATE OR REPLACE FUNCTION generate_batch_number()
RETURNS TEXT AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  SELECT nextval('ncts_batch_number_seq') INTO seq_val;
  RETURN 'BATCH-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
