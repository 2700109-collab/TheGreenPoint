# NCTS Disaster Recovery Runbook

## Table of Contents
1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Backup Strategy](#backup-strategy)
4. [Scenario Playbooks](#scenario-playbooks)
5. [Contact & Escalation](#contact--escalation)

---

## Overview

This runbook covers disaster recovery procedures for the National Cannabis Tracking System (NCTS) deployed on AWS `af-south-1` (Cape Town). All data must remain within South African jurisdiction per POPIA and SAHPRA regulations.

**Infrastructure Summary:**
| Component | Service | Backup Method |
|-----------|---------|--------------|
| API Server | ECS Fargate | Stateless — redeploy from ECR |
| Database | RDS PostgreSQL 16 | Automated snapshots + PITR |
| Cache | ElastiCache Redis | No backup — rebuilt on start |
| Documents | S3 | Cross-region replication to `eu-west-1` |
| Audit Archive | S3 Glacier | Object lock, 10-year retention |
| Terraform State | S3 + DynamoDB | Versioned bucket |

---

## Recovery Objectives

| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|-----------|
| Single AZ failure | 0 min | 0 | Multi-AZ automatic failover (RDS + ECS) |
| Database corruption | < 1 hour | < 5 minutes | Point-in-time recovery (PITR) |
| Region failure (af-south-1) | < 4 hours | < 1 hour | Restore from S3 cross-region replica |
| Ransomware / data destruction | < 2 hours | < 24 hours | Restore from RDS snapshot |
| Accidental data deletion | < 30 min | < 5 minutes | PITR to specific timestamp |
| ECS service failure | < 5 min | 0 | Auto-replacement via ECS desired count |

---

## Backup Strategy

### RDS PostgreSQL
- **Automated snapshots**: Daily, 35-day retention
- **Point-in-time recovery**: Continuous (5-minute RPO), 35-day window
- **Manual snapshots**: Before each production migration, retained indefinitely
- **Parameter**: `backup_retention_period = 35`, Multi-AZ enabled

### S3 Documents
- **Versioning**: Enabled on all buckets
- **Cross-region replication**: `af-south-1` → `eu-west-1` (continuous)
- **Lifecycle**: Standard → IA (90 days) → Glacier (365 days)

### Audit Events (Compliance Archive)
- **S3 Glacier**: Monthly export from database
- **Object Lock**: COMPLIANCE mode, 10-year retention
- **No deletion possible** within retention period (SAHPRA compliance)

### Terraform State
- **S3 backend**: Versioned bucket with DynamoDB locking
- **Cross-region replication**: To `eu-west-1`

### Redis Cache
- **No backup required**: Cache is ephemeral, rebuilds from source data
- **ElastiCache snapshots**: 7-day retention for faster warm-up

---

## Scenario Playbooks

### Playbook 1: Single AZ Failure
**Detection**: CloudWatch alarm — ECS task count below desired
**Impact**: Minimal — automatic failover

```
1. RDS fails over to standby (automatic, ~60s)
2. ECS redistributes tasks across healthy AZs (automatic)
3. ElastiCache promotes replica (automatic)
4. Verify: curl https://api.ncts.gov.za/health
5. Monitor CloudWatch for 30 minutes
```

**No manual action required.**

---

### Playbook 2: Database Corruption (PITR)
**Detection**: Application errors, data integrity check failures
**Impact**: Database unavailable during recovery (~30-60 min)

```bash
# 1. Identify the last known good timestamp
#    Check CloudWatch logs for when corruption started
RESTORE_TIME="2026-02-22T14:30:00Z"

# 2. Create PITR restore
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier ncts-production-db \
  --target-db-instance-identifier ncts-production-db-restored \
  --restore-time "$RESTORE_TIME" \
  --db-subnet-group-name ncts-production-db-subnet \
  --vpc-security-group-ids sg-xxxxxxxxxxxx \
  --multi-az \
  --region af-south-1

# 3. Wait for restore to complete (~20-40 min)
aws rds wait db-instance-available \
  --db-instance-identifier ncts-production-db-restored \
  --region af-south-1

# 4. Get new endpoint
NEW_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier ncts-production-db-restored \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text --region af-south-1)

# 5. Update Secrets Manager with new endpoint
aws secretsmanager update-secret \
  --secret-id ncts/production/database-url \
  --secret-string "postgresql://ncts_admin:PASSWORD@${NEW_ENDPOINT}:5432/ncts_production" \
  --region af-south-1

# 6. Force ECS service redeployment (picks up new secret)
aws ecs update-service \
  --cluster ncts-cluster \
  --service ncts-api-prod \
  --force-new-deployment \
  --region af-south-1

# 7. Verify application health
curl -s https://api.ncts.gov.za/health | jq .

# 8. Delete old corrupted instance (after verification)
# aws rds delete-db-instance --db-instance-identifier ncts-production-db --skip-final-snapshot
```

---

### Playbook 3: Region Failure (af-south-1 down)
**Detection**: All services unreachable, AWS health dashboard confirms
**Impact**: Full outage until recovery (~2-4 hours)

```bash
# This is a catastrophic scenario. Follow these steps in order.

# 1. Switch DNS to maintenance page
#    Update Route 53 to point to static maintenance page in eu-west-1

# 2. Restore RDS from cross-region snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier ncts-dr-db \
  --db-snapshot-identifier <latest-cross-region-snapshot> \
  --db-instance-class db.r6g.large \
  --region eu-west-1

# 3. Restore S3 documents (already replicated to eu-west-1)
#    Documents bucket is already synced via CRR

# 4. Deploy ECS service in eu-west-1
#    Use Terraform with region override:
cd infrastructure/terraform
terraform workspace select dr
terraform apply -var="region=eu-west-1" -var="environment=production"

# 5. Update DNS to new ALB endpoint
#    Route 53 → new ALB in eu-west-1

# 6. Run smoke tests against DR environment
#    Verify critical paths: auth, plant lookup, verification

# 7. Notify stakeholders of DR activation
#    Email: ops@ncts.gov.za, sahpra-it@sahpra.gov.za

# 8. When af-south-1 recovers, plan failback:
#    - Sync data changes back to af-south-1 RDS
#    - Switch DNS back
#    - Decommission DR infrastructure
```

---

### Playbook 4: Ransomware / Data Destruction
**Detection**: Unexpected data changes, encrypted files, ransom demands
**Impact**: Data loss up to 24 hours

```bash
# 1. IMMEDIATELY isolate affected resources
#    Remove ECS service from ALB (prevent further damage)
aws ecs update-service \
  --cluster ncts-cluster \
  --service ncts-api-prod \
  --desired-count 0 \
  --region af-south-1

# 2. Identify the attack timeline
#    Review CloudWatch logs, CloudTrail events
#    Find the last known clean state

# 3. Restore RDS from pre-attack snapshot
SNAPSHOT_ID=$(aws rds describe-db-snapshots \
  --db-instance-identifier ncts-production-db \
  --query 'DBSnapshots | sort_by(@, &SnapshotCreateTime) | [-1].DBSnapshotIdentifier' \
  --output text --region af-south-1)

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier ncts-production-db-clean \
  --db-snapshot-identifier "$SNAPSHOT_ID" \
  --region af-south-1

# 4. Restore S3 documents from versioned objects
#    S3 versioning allows recovery of overwritten/deleted objects

# 5. Audit trail is in Glacier with Object Lock — CANNOT be modified
#    This provides forensic evidence

# 6. Rotate ALL secrets
aws secretsmanager rotate-secret --secret-id ncts/production/database-url
aws secretsmanager rotate-secret --secret-id ncts/production/jwt-secret
aws secretsmanager rotate-secret --secret-id ncts/production/encryption-key

# 7. Rebuild ECS tasks with fresh image
aws ecs update-service \
  --cluster ncts-cluster \
  --service ncts-api-prod \
  --desired-count 2 \
  --force-new-deployment \
  --region af-south-1

# 8. File incident report for SAHPRA and POPIA regulator
```

---

### Playbook 5: Accidental Table/Data Deletion
**Detection**: Application errors, missing data reports
**Impact**: Minimal with PITR (~15-30 min)

```bash
# 1. Identify exact deletion timestamp from audit logs
#    Check application audit_events table or CloudWatch logs

RESTORE_TIME="2026-02-22T15:45:00Z"  # Just before deletion

# 2. Create PITR clone (does NOT affect running database)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier ncts-production-db \
  --target-db-instance-identifier ncts-temp-restore \
  --restore-time "$RESTORE_TIME" \
  --no-multi-az \
  --region af-south-1

# 3. Wait for restore
aws rds wait db-instance-available \
  --db-instance-identifier ncts-temp-restore

# 4. Extract deleted data using pg_dump / psql
#    Connect to temp instance and export the needed tables
pg_dump -h <temp-endpoint> -U ncts_admin -t <table_name> ncts_production > deleted_data.sql

# 5. Import into production
psql -h <prod-endpoint> -U ncts_admin ncts_production < deleted_data.sql

# 6. Verify data integrity
# 7. Delete temporary instance
aws rds delete-db-instance \
  --db-instance-identifier ncts-temp-restore \
  --skip-final-snapshot
```

---

## Contact & Escalation

| Level | Contact | When |
|-------|---------|------|
| L1 | DevOps On-Call | Any alert triggered |
| L2 | Senior Developer | Service degraded > 15 min |
| L3 | Project Lead | Full outage > 30 min |
| L4 | SAHPRA IT Director | Data breach or > 4 hour outage |

**Communication Channels:**
- Slack: `#ncts-incidents`
- Email: `ops@ncts.gov.za`
- Phone tree: Documented in 1Password vault

---

## DR Drill Schedule

| Drill | Frequency | Last Run | Next Due |
|-------|-----------|----------|----------|
| RDS PITR restore test | Quarterly | — | TBD |
| S3 cross-region restore | Semi-annually | — | TBD |
| Full region failover | Annually | — | TBD |
| Secret rotation | Monthly | — | TBD |
| Backup integrity check | Weekly (automated) | — | TBD |

---

## Post-Incident Review Template

After every incident:
1. **Timeline**: What happened and when
2. **Impact**: Users affected, data loss, duration
3. **Root cause**: Why it happened
4. **Resolution**: What was done to fix it
5. **Prevention**: What changes prevent recurrence
6. **Action items**: Specific tasks with owners and deadlines

Store all PIR documents in `docs/incidents/PIR-YYYY-MM-DD.md`.
