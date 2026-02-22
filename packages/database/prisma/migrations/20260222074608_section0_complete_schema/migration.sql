-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "trading_name" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "tax_number" TEXT,
    "bbbee_level" INTEGER,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "province" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "compliance_status" TEXT NOT NULL DEFAULT 'compliant',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "cognito_id" TEXT,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "tenant_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "password_hash" TEXT,
    "password_history" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "force_password_change" BOOLEAN NOT NULL DEFAULT false,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permits" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "permit_type" TEXT NOT NULL DEFAULT 'sahpra_22a',
    "permit_number" TEXT NOT NULL,
    "issuing_authority" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "conditions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "authorized_substances" JSONB,
    "authorized_activities" TEXT[],
    "max_annual_quantity_kg" DOUBLE PRECISION,
    "responsible_person_name" TEXT,
    "responsible_person_reg" TEXT,
    "renewal_date" TIMESTAMP(3),
    "application_reference" TEXT,
    "previous_permit_id" UUID,

    CONSTRAINT "permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "facility_type" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "boundary" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "municipal_license_number" TEXT,
    "municipal_license_expiry" TIMESTAMP(3),

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strains" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "thc_range" TEXT,
    "cbd_range" TEXT,
    "flowering_weeks" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plants" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tracking_id" TEXT NOT NULL,
    "strain_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'seed',
    "planted_date" TIMESTAMP(3) NOT NULL,
    "harvested_date" TIMESTAMP(3),
    "destroyed_date" TIMESTAMP(3),
    "destroyed_reason" TEXT,
    "mother_plant_id" UUID,
    "batch_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "batch_number" TEXT NOT NULL,
    "batch_type" TEXT NOT NULL,
    "strain_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "plant_count" INTEGER NOT NULL,
    "wet_weight_grams" DOUBLE PRECISION,
    "dry_weight_grams" DOUBLE PRECISION,
    "processed_weight_grams" DOUBLE PRECISION,
    "lab_result_id" UUID,
    "parent_batch_id" UUID,
    "product_category" TEXT DEFAULT 'dried_flower',
    "created_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "harvest_date" TIMESTAMP(3) NOT NULL,
    "wet_weight_grams" DOUBLE PRECISION NOT NULL,
    "dry_weight_grams" DOUBLE PRECISION,
    "plant_ids" UUID[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "harvests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lab_name" TEXT NOT NULL,
    "lab_accreditation_number" TEXT,
    "test_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "thc_percent" DOUBLE PRECISION NOT NULL,
    "cbd_percent" DOUBLE PRECISION NOT NULL,
    "cbn_percent" DOUBLE PRECISION,
    "cbg_percent" DOUBLE PRECISION,
    "total_cannabinoids_percent" DOUBLE PRECISION NOT NULL,
    "pesticides_pass" BOOLEAN NOT NULL,
    "heavy_metals_pass" BOOLEAN NOT NULL,
    "microbials_pass" BOOLEAN NOT NULL,
    "mycotoxins_pass" BOOLEAN NOT NULL,
    "terpene_profile" JSONB,
    "moisture_percent" DOUBLE PRECISION,
    "certificate_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "transfer_number" TEXT NOT NULL,
    "sender_tenant_id" UUID NOT NULL,
    "sender_facility_id" UUID NOT NULL,
    "receiver_tenant_id" UUID NOT NULL,
    "receiver_facility_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "initiated_at" TIMESTAMP(3) NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "vehicle_registration" TEXT,
    "driver_name" TEXT,
    "driver_id_number" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_items" (
    "id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "quantity_grams" DOUBLE PRECISION NOT NULL,
    "received_quantity_grams" DOUBLE PRECISION,

    CONSTRAINT "transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sale_number" TEXT NOT NULL,
    "batch_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "quantity_grams" DOUBLE PRECISION NOT NULL,
    "price_zar" DOUBLE PRECISION NOT NULL,
    "sale_date" TIMESTAMP(3) NOT NULL,
    "customer_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "sequence_number" SERIAL NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "tenant_id" UUID,
    "payload" JSONB NOT NULL,
    "previous_hash" TEXT NOT NULL,
    "event_hash" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "gps_latitude" DOUBLE PRECISION,
    "gps_longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "inspector_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "actual_start_date" TIMESTAMP(3),
    "completed_date" TIMESTAMP(3),
    "estimated_duration_hrs" DOUBLE PRECISION,
    "checklist" JSONB,
    "findings" TEXT,
    "overall_outcome" TEXT,
    "remediation_required" BOOLEAN NOT NULL DEFAULT false,
    "remediation_deadline" TIMESTAMP(3),
    "remediation_notes" TEXT,
    "follow_up_inspection_id" UUID,
    "photos" TEXT[],
    "report_url" TEXT,
    "reason" TEXT,
    "additional_inspectors" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "evaluation_type" TEXT NOT NULL,
    "rule_definition" JSONB NOT NULL,
    "thresholds" JSONB,
    "escalation_policy" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "facility_id" UUID,
    "severity" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'open',
    "assigned_to" UUID,
    "escalation_level" INTEGER NOT NULL DEFAULT 0,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" UUID,
    "resolution_notes" TEXT,
    "auto_actions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "snapshot_type" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "total_expected_grams" DOUBLE PRECISION NOT NULL,
    "total_declared_grams" DOUBLE PRECISION NOT NULL,
    "variance_percent" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'clean',
    "investigator_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destruction_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_ids" TEXT[],
    "quantity_kg" DOUBLE PRECISION NOT NULL,
    "destruction_method" TEXT NOT NULL,
    "destruction_date" TIMESTAMP(3) NOT NULL,
    "witness_names" TEXT[],
    "witness_organizations" TEXT[],
    "witness_signatures" TEXT[],
    "reason" TEXT NOT NULL,
    "photos" TEXT[],
    "video_url" TEXT,
    "regulatory_notified" BOOLEAN NOT NULL DEFAULT false,
    "regulatory_notified_at" TIMESTAMP(3),
    "approved_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destruction_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspicious_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tracking_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reporter_ip" TEXT,
    "reporter_contact" TEXT,
    "reporter_location" JSONB,
    "investigation_status" TEXT NOT NULL DEFAULT 'new',
    "investigator_id" UUID,
    "investigator_notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suspicious_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excise_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_category" TEXT NOT NULL,
    "rate_per_unit" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "excise_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excise_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "rate_id" UUID NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "rate_applied" DOUBLE PRECISION NOT NULL,
    "duty_amount_zar" DOUBLE PRECISION NOT NULL,
    "reporting_period" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "excise_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_export_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "partner_company" TEXT NOT NULL,
    "batch_id" UUID NOT NULL,
    "quantity_kg" DOUBLE PRECISION NOT NULL,
    "product_category" TEXT NOT NULL,
    "permit_id" UUID NOT NULL,
    "customs_declaration_number" TEXT,
    "shipping_date" TIMESTAMP(3),
    "arrival_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "documents" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_export_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planting_intentions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,
    "season" TEXT NOT NULL,
    "cultivars" JSONB NOT NULL,
    "total_area_ha" DOUBLE PRECISION NOT NULL,
    "total_est_yield_kg" DOUBLE PRECISION NOT NULL,
    "planting_start" TIMESTAMP(3) NOT NULL,
    "planting_end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planting_intentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "consent_type" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "policy_version" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "action_url" TEXT,
    "read_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_access" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pseudonymized_patient_id" TEXT NOT NULL,
    "prescribing_doctor_hpcsa" TEXT NOT NULL,
    "diagnosis_category" TEXT NOT NULL,
    "product_category" TEXT NOT NULL,
    "quantity_dispensed_grams" DOUBLE PRECISION NOT NULL,
    "dispensing_date" TIMESTAMP(3) NOT NULL,
    "dispensing_facility_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tracking_id" TEXT NOT NULL,
    "tenant_id" UUID,
    "scanner_ip" TEXT,
    "user_agent" TEXT,
    "location" JSONB,
    "result_status" TEXT NOT NULL,
    "response_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "tracking_id" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "hmac" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanned_count" INTEGER NOT NULL DEFAULT 0,
    "last_scanned_at" TIMESTAMP(3),

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "report_type" TEXT NOT NULL,
    "reporting_period" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "generated_by" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "file_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submitted_to" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulatory_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_registration_number_key" ON "tenants"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_cognito_id_key" ON "users"("cognito_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "permits_permit_number_key" ON "permits"("permit_number");

-- CreateIndex
CREATE INDEX "permits_tenant_id_idx" ON "permits"("tenant_id");

-- CreateIndex
CREATE INDEX "permits_status_idx" ON "permits"("status");

-- CreateIndex
CREATE INDEX "facilities_tenant_id_idx" ON "facilities"("tenant_id");

-- CreateIndex
CREATE INDEX "zones_tenant_id_idx" ON "zones"("tenant_id");

-- CreateIndex
CREATE INDEX "zones_facility_id_idx" ON "zones"("facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "strains_name_key" ON "strains"("name");

-- CreateIndex
CREATE UNIQUE INDEX "plants_tracking_id_key" ON "plants"("tracking_id");

-- CreateIndex
CREATE INDEX "plants_tenant_id_idx" ON "plants"("tenant_id");

-- CreateIndex
CREATE INDEX "plants_state_idx" ON "plants"("state");

-- CreateIndex
CREATE INDEX "plants_facility_id_idx" ON "plants"("facility_id");

-- CreateIndex
CREATE INDEX "plants_tracking_id_idx" ON "plants"("tracking_id");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batch_number_key" ON "batches"("batch_number");

-- CreateIndex
CREATE INDEX "batches_tenant_id_idx" ON "batches"("tenant_id");

-- CreateIndex
CREATE INDEX "batches_batch_number_idx" ON "batches"("batch_number");

-- CreateIndex
CREATE INDEX "harvests_tenant_id_idx" ON "harvests"("tenant_id");

-- CreateIndex
CREATE INDEX "harvests_tenant_id_created_at_idx" ON "harvests"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "lab_results_tenant_id_idx" ON "lab_results"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfers_transfer_number_key" ON "transfers"("transfer_number");

-- CreateIndex
CREATE INDEX "transfers_tenant_id_idx" ON "transfers"("tenant_id");

-- CreateIndex
CREATE INDEX "transfers_status_idx" ON "transfers"("status");

-- CreateIndex
CREATE INDEX "transfer_items_transfer_id_idx" ON "transfer_items"("transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_sale_number_key" ON "sales"("sale_number");

-- CreateIndex
CREATE INDEX "sales_tenant_id_idx" ON "sales"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_events_sequence_number_key" ON "audit_events"("sequence_number");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_events_actor_id_idx" ON "audit_events"("actor_id");

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_idx" ON "audit_events"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- CreateIndex
CREATE INDEX "inspections_tenant_id_idx" ON "inspections"("tenant_id");

-- CreateIndex
CREATE INDEX "inspections_facility_id_idx" ON "inspections"("facility_id");

-- CreateIndex
CREATE INDEX "inspections_inspector_id_idx" ON "inspections"("inspector_id");

-- CreateIndex
CREATE INDEX "inspections_status_idx" ON "inspections"("status");

-- CreateIndex
CREATE INDEX "inspections_scheduled_date_idx" ON "inspections"("scheduled_date");

-- CreateIndex
CREATE INDEX "compliance_rules_category_idx" ON "compliance_rules"("category");

-- CreateIndex
CREATE INDEX "compliance_rules_is_active_idx" ON "compliance_rules"("is_active");

-- CreateIndex
CREATE INDEX "compliance_alerts_rule_id_idx" ON "compliance_alerts"("rule_id");

-- CreateIndex
CREATE INDEX "compliance_alerts_tenant_id_idx" ON "compliance_alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "compliance_alerts_status_idx" ON "compliance_alerts"("status");

-- CreateIndex
CREATE INDEX "compliance_alerts_severity_idx" ON "compliance_alerts"("severity");

-- CreateIndex
CREATE INDEX "compliance_alerts_created_at_idx" ON "compliance_alerts"("created_at");

-- CreateIndex
CREATE INDEX "inventory_snapshots_tenant_id_idx" ON "inventory_snapshots"("tenant_id");

-- CreateIndex
CREATE INDEX "inventory_snapshots_facility_id_idx" ON "inventory_snapshots"("facility_id");

-- CreateIndex
CREATE INDEX "inventory_snapshots_snapshot_date_idx" ON "inventory_snapshots"("snapshot_date");

-- CreateIndex
CREATE INDEX "outbox_events_published_at_idx" ON "outbox_events"("published_at");

-- CreateIndex
CREATE INDEX "outbox_events_event_type_idx" ON "outbox_events"("event_type");

-- CreateIndex
CREATE INDEX "outbox_events_created_at_idx" ON "outbox_events"("created_at");

-- CreateIndex
CREATE INDEX "destruction_events_tenant_id_idx" ON "destruction_events"("tenant_id");

-- CreateIndex
CREATE INDEX "destruction_events_facility_id_idx" ON "destruction_events"("facility_id");

-- CreateIndex
CREATE INDEX "destruction_events_destruction_date_idx" ON "destruction_events"("destruction_date");

-- CreateIndex
CREATE INDEX "suspicious_reports_tracking_id_idx" ON "suspicious_reports"("tracking_id");

-- CreateIndex
CREATE INDEX "suspicious_reports_investigation_status_idx" ON "suspicious_reports"("investigation_status");

-- CreateIndex
CREATE INDEX "suspicious_reports_created_at_idx" ON "suspicious_reports"("created_at");

-- CreateIndex
CREATE INDEX "excise_rates_product_category_is_active_idx" ON "excise_rates"("product_category", "is_active");

-- CreateIndex
CREATE INDEX "excise_ledger_tenant_id_reporting_period_idx" ON "excise_ledger"("tenant_id", "reporting_period");

-- CreateIndex
CREATE INDEX "excise_ledger_reporting_period_idx" ON "excise_ledger"("reporting_period");

-- CreateIndex
CREATE INDEX "import_export_records_tenant_id_idx" ON "import_export_records"("tenant_id");

-- CreateIndex
CREATE INDEX "import_export_records_type_idx" ON "import_export_records"("type");

-- CreateIndex
CREATE INDEX "import_export_records_status_idx" ON "import_export_records"("status");

-- CreateIndex
CREATE INDEX "planting_intentions_tenant_id_season_idx" ON "planting_intentions"("tenant_id", "season");

-- CreateIndex
CREATE INDEX "consents_user_id_idx" ON "consents"("user_id");

-- CreateIndex
CREATE INDEX "consents_consent_type_idx" ON "consents"("consent_type");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "patient_access_pseudonymized_patient_id_idx" ON "patient_access"("pseudonymized_patient_id");

-- CreateIndex
CREATE INDEX "patient_access_dispensing_date_idx" ON "patient_access"("dispensing_date");

-- CreateIndex
CREATE INDEX "patient_access_dispensing_facility_id_idx" ON "patient_access"("dispensing_facility_id");

-- CreateIndex
CREATE INDEX "verification_logs_tracking_id_idx" ON "verification_logs"("tracking_id");

-- CreateIndex
CREATE INDEX "verification_logs_tenant_id_idx" ON "verification_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "verification_logs_created_at_idx" ON "verification_logs"("created_at");

-- CreateIndex
CREATE INDEX "qr_codes_tenant_id_idx" ON "qr_codes"("tenant_id");

-- CreateIndex
CREATE INDEX "qr_codes_tracking_id_idx" ON "qr_codes"("tracking_id");

-- CreateIndex
CREATE INDEX "qr_codes_entity_type_entity_id_idx" ON "qr_codes"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_entity_type_entity_id_key" ON "qr_codes"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "regulatory_reports_report_type_idx" ON "regulatory_reports"("report_type");

-- CreateIndex
CREATE INDEX "regulatory_reports_tenant_id_idx" ON "regulatory_reports"("tenant_id");

-- CreateIndex
CREATE INDEX "regulatory_reports_reporting_period_idx" ON "regulatory_reports"("reporting_period");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_strain_id_fkey" FOREIGN KEY ("strain_id") REFERENCES "strains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_mother_plant_id_fkey" FOREIGN KEY ("mother_plant_id") REFERENCES "plants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plants" ADD CONSTRAINT "plants_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_strain_id_fkey" FOREIGN KEY ("strain_id") REFERENCES "strains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_lab_result_id_fkey" FOREIGN KEY ("lab_result_id") REFERENCES "lab_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_parent_batch_id_fkey" FOREIGN KEY ("parent_batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_alerts" ADD CONSTRAINT "compliance_alerts_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "compliance_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_alerts" ADD CONSTRAINT "compliance_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_snapshots" ADD CONSTRAINT "inventory_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_snapshots" ADD CONSTRAINT "inventory_snapshots_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destruction_events" ADD CONSTRAINT "destruction_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destruction_events" ADD CONSTRAINT "destruction_events_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excise_ledger" ADD CONSTRAINT "excise_ledger_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excise_ledger" ADD CONSTRAINT "excise_ledger_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "excise_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_export_records" ADD CONSTRAINT "import_export_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planting_intentions" ADD CONSTRAINT "planting_intentions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planting_intentions" ADD CONSTRAINT "planting_intentions_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
